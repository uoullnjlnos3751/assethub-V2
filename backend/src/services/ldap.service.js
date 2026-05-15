// backend/src/services/ldap.service.js
'use strict';

const ldap   = require('ldapjs');
const logger = require('../utils/logger');
const db     = require('../config/db');

// ── helpers ─────────────────────────────────────────────────
function buildClient(host, port) {
  return ldap.createClient({
    url:            `ldap://${host}:${port}`,
    timeout:        10000,
    connectTimeout: 10000,
    reconnect:      false,
  });
}

function promiseBind(client, dn, password) {
  return new Promise((resolve, reject) => {
    client.bind(dn, password, (err) => (err ? reject(err) : resolve()));
  });
}

function promiseSearch(client, base, opts) {
  return new Promise((resolve, reject) => {
    const entries = [];
    client.search(base, opts, (err, res) => {
      if (err) return reject(err);
      res.on('searchEntry', (entry) => entries.push(entry.object));
      res.on('error',       (err)   => reject(err));
      res.on('end',         ()      => resolve(entries));
    });
  });
}

// ── LDAPService ─────────────────────────────────────────────
class LDAPService {

  constructor() {
    this.host          = process.env.LDAP_HOST          || '';
    this.port          = parseInt(process.env.LDAP_PORT || '389');
    this.baseDN        = process.env.LDAP_BASE_DN       || '';
    this.domain        = process.env.LDAP_DOMAIN        || '';
    this.searchUser    = process.env.LDAP_SEARCH_USER   || '';
    this.searchPass    = process.env.LDAP_SEARCH_PASSWORD || '';
    this.roleMapping   = {
      admin:   (process.env.LDAP_ROLE_MAPPING_ADMIN   || 'IT-Admins').toLowerCase(),
      manager: (process.env.LDAP_ROLE_MAPPING_MANAGER || 'IT-Managers').toLowerCase(),
      user:    (process.env.LDAP_ROLE_MAPPING_USER    || 'All-Employees').toLowerCase(),
    };
  }

  // ── Public: authenticate a user against AD ──────────────
  async authenticate(username, password) {
    if (!process.env.LDAP_ENABLED || process.env.LDAP_ENABLED !== 'true') {
      throw new Error('LDAP is not enabled');
    }

    const client = buildClient(this.host, this.port);

    try {
      // 1. Bind with service account
      const searchDN = `${this.domain}\\${this.searchUser}`;
      await promiseBind(client, searchDN, this.searchPass);

      // 2. Search user
      const filter = `(&(objectClass=user)(sAMAccountName=${ldap.escapeDN(username)}))`;
      const entries = await promiseSearch(client, this.baseDN, {
        filter,
        scope: 'sub',
        attributes: [
          'sAMAccountName','mail','displayName',
          'department','title','memberOf',
        ],
      });

      if (!entries.length) throw new Error('User not found in AD');
      const adUser = entries[0];

      // 3. Verify password by binding as user
      const userDN = `${this.domain}\\${username}`;
      await promiseBind(client, userDN, password);

      // 4. Map groups → role
      const role = this._mapRole(adUser.memberOf);

      logger.info(`LDAP auth success: ${username} → role: ${role}`);
      return { adUser, role };

    } finally {
      client.destroy();
    }
  }

  // ── Public: sync all AD users into local DB ──────────────
  async syncUsers(triggeredBy = null) {
    const logEntry = await db.query(
      `INSERT INTO ldap_sync_logs (sync_start_time, status, triggered_by)
       VALUES (NOW(), 'running', $1) RETURNING id`,
      [triggeredBy]
    );
    const syncId = logEntry.rows[0].id;

    const stats = { found: 0, created: 0, updated: 0, disabled: 0 };
    let errorMsg = null;

    const client = buildClient(this.host, this.port);
    try {
      await promiseBind(client, `${this.domain}\\${this.searchUser}`, this.searchPass);

      const entries = await promiseSearch(client, this.baseDN, {
        filter: '(&(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))',
        scope: 'sub',
        attributes: ['sAMAccountName','mail','displayName','department','title','memberOf'],
      });

      stats.found = entries.length;

      for (const adUser of entries) {
        await this._upsertUser(adUser, stats);
      }

      await db.query(
        `UPDATE ldap_sync_logs
         SET sync_end_time=NOW(), status='success',
             total_users_found=$1, total_users_created=$2,
             total_users_updated=$3, total_users_disabled=$4
         WHERE id=$5`,
        [stats.found, stats.created, stats.updated, stats.disabled, syncId]
      );
      logger.info(`LDAP sync done: ${JSON.stringify(stats)}`);

    } catch (err) {
      errorMsg = err.message;
      await db.query(
        `UPDATE ldap_sync_logs
         SET sync_end_time=NOW(), status='failed', error_message=$1
         WHERE id=$2`,
        [errorMsg, syncId]
      );
      logger.error('LDAP sync error:', err);
      throw err;

    } finally {
      client.destroy();
    }

    return stats;
  }

  // ── Public: test connectivity ────────────────────────────
  async testConnection() {
    const client = buildClient(this.host, this.port);
    try {
      await promiseBind(client, `${this.domain}\\${this.searchUser}`, this.searchPass);
      return { success: true, message: 'Connected to AD successfully' };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      client.destroy();
    }
  }

  // ── Private helpers ──────────────────────────────────────
  _mapRole(memberOf) {
    if (!memberOf) return 'user';
    const groups = Array.isArray(memberOf)
      ? memberOf.map((g) => g.toLowerCase())
      : [memberOf.toLowerCase()];

    for (const g of groups) {
      if (g.includes(this.roleMapping.admin))   return 'admin';
      if (g.includes(this.roleMapping.manager)) return 'manager';
    }
    return 'user';
  }

  async _upsertUser(adUser, stats) {
    const username = adUser.sAMAccountName;
    const email    = adUser.mail || `${username}@${this.domain}.com`;
    const name     = adUser.displayName || username;
    const dept     = adUser.department || '';
    const role     = this._mapRole(adUser.memberOf);
    const groups   = Array.isArray(adUser.memberOf)
      ? adUser.memberOf
      : adUser.memberOf ? [adUser.memberOf] : [];

    const existing = await db.query(
      'SELECT id FROM users WHERE ad_username=$1 OR email=$2',
      [username, email]
    );

    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO users
           (email, name, role, department, ad_username, ad_display_name,
            ad_department, ad_groups, synced_from_ldap, ldap_synced_at,
            can_approve, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,NOW(),$9,true)`,
        [email, name, role, dept, username, name, dept,
         groups, role === 'manager' || role === 'admin']
      );
      stats.created++;
    } else {
      await db.query(
        `UPDATE users
         SET name=$1, role=$2, department=$3, ad_username=$4,
             ad_display_name=$5, ad_department=$6, ad_groups=$7,
             ldap_synced_at=NOW(), can_approve=$8
         WHERE id=$9`,
        [name, role, dept, username, name, dept, groups,
         role === 'manager' || role === 'admin', existing.rows[0].id]
      );
      stats.updated++;
    }
  }
}

module.exports = new LDAPService();
