// backend/src/services/glpi.service.js
'use strict';

const axios  = require('axios');
const logger = require('../utils/logger');
const db     = require('../config/db');

class GLPIService {

  constructor() {
    this.apiUrl   = process.env.GLPI_API_URL   || '';
    this.userToken = process.env.GLPI_USER_TOKEN || '';
    this.appToken  = process.env.GLPI_APP_TOKEN  || '';
    this._sessionToken = null;
  }

  // ── Session management ───────────────────────────────────
  async _initSession() {
    const res = await axios.get(`${this.apiUrl}/initSession`, {
      headers: {
        'Authorization': `user_token ${this.userToken}`,
        'App-Token':     this.appToken,
        'Content-Type':  'application/json',
      },
    });
    this._sessionToken = res.data.session_token;
    return this._sessionToken;
  }

  async _killSession() {
    if (!this._sessionToken) return;
    try {
      await axios.get(`${this.apiUrl}/killSession`, {
        headers: this._headers(),
      });
    } catch (_) { /* ignore */ }
    this._sessionToken = null;
  }

  _headers() {
    return {
      'Session-Token': this._sessionToken,
      'App-Token':     this.appToken,
      'Content-Type':  'application/json',
    };
  }

  // ── Fetch assets from GLPI by type ───────────────────────
  async _fetchItemType(itemType, page = 1, perPage = 100) {
    const res = await axios.get(`${this.apiUrl}/${itemType}`, {
      headers: this._headers(),
      params: {
        range:       `${(page - 1) * perPage}-${page * perPage - 1}`,
        expand_dropdowns: true,
        get_hateoas: false,
      },
    });
    return res.data || [];
  }

  async _fetchAllItemType(itemType) {
    let all = [], page = 1;
    while (true) {
      const batch = await this._fetchItemType(itemType, page);
      if (!Array.isArray(batch) || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < 100) break;
      page++;
    }
    return all;
  }

  // ── Load status mapping from configurations table ───────
  async _loadStatusMapping() {
    const row = await db.query(
      `SELECT config_json FROM configurations WHERE config_key='glpi_status_mapping'`
    );
    return row.rows[0]?.config_json || {
      '1': 'available',
      '2': 'borrowed',
      '3': 'pending',
      '4': 'maintenance',
    };
  }

  async _loadCategoryMapping() {
    const row = await db.query(
      `SELECT config_json FROM configurations WHERE config_key='glpi_category_mapping'`
    );
    return row.rows[0]?.config_json || {
      'Computer':   'Notebook',
      'Monitor':    'Monitor',
      'Peripheral': 'Other',
      'Network':    'Cable',
    };
  }

  // ── Main sync function ────────────────────────────────────
  async syncAssets(triggeredBy = null) {
    const logEntry = await db.query(
      `INSERT INTO glpi_sync_logs (sync_start_time, status, triggered_by)
       VALUES (NOW(), 'running', $1) RETURNING id`,
      [triggeredBy]
    );
    const syncId = logEntry.rows[0].id;

    const stats = { found: 0, created: 0, updated: 0, retired: 0 };
    let errorMsg = null;

    try {
      await this._initSession();

      const [statusMap, categoryMap] = await Promise.all([
        this._loadStatusMapping(),
        this._loadCategoryMapping(),
      ]);

      // Fetch Computers, Monitors, Phones, Peripherals
      const itemTypes = ['Computer', 'Monitor', 'Phone', 'Peripheral'];
      let allAssets = [];
      for (const type of itemTypes) {
        const items = await this._fetchAllItemType(type);
        allAssets = allAssets.concat(items.map((i) => ({ ...i, _glpiType: type })));
      }

      stats.found = allAssets.length;

      const glpiIds = allAssets.map((a) => a.id);

      for (const item of allAssets) {
        await this._upsertAsset(item, statusMap, categoryMap, stats);
      }

      // Mark assets no longer in GLPI as retired
      if (glpiIds.length > 0) {
        const retired = await db.query(
          `UPDATE assets SET status='retired', is_active=false
           WHERE synced_from_glpi=true
             AND glpi_id != ALL($1)
             AND is_active=true
           RETURNING id`,
          [glpiIds]
        );
        stats.retired = retired.rowCount;
      }

      await db.query(
        `UPDATE glpi_sync_logs
         SET sync_end_time=NOW(), status='success',
             total_assets_found=$1, total_assets_created=$2,
             total_assets_updated=$3, total_assets_retired=$4
         WHERE id=$5`,
        [stats.found, stats.created, stats.updated, stats.retired, syncId]
      );
      logger.info(`GLPI sync done: ${JSON.stringify(stats)}`);

    } catch (err) {
      errorMsg = err.message;
      await db.query(
        `UPDATE glpi_sync_logs
         SET sync_end_time=NOW(), status='failed', error_message=$1
         WHERE id=$2`,
        [errorMsg, syncId]
      );
      logger.error('GLPI sync error:', err.message);
      throw err;

    } finally {
      await this._killSession();
    }

    return stats;
  }

  async _upsertAsset(item, statusMap, categoryMap, stats) {
    const glpiId     = item.id;
    const name       = item.name || `Asset-${glpiId}`;
    const serial     = item.serial || null;
    const glpiStatus = item.states_id || item.status || 1;
    const status     = statusMap[String(glpiStatus)] || 'available';
    const glpiCat    = item._glpiType || 'Other';
    const category   = categoryMap[glpiCat] || 'Other';
    const location   = item.locations_id?.name || item.location || '';
    const assetCode  = `GLPI-${glpiId}`;

    const existing = await db.query(
      'SELECT id FROM assets WHERE glpi_id=$1', [glpiId]
    );

    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO assets
           (asset_code, asset_name, category, serial_number, location,
            status, glpi_id, glpi_status, glpi_category,
            synced_from_glpi, glpi_synced_at, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,NOW(),true)`,
        [assetCode, name, category, serial, location,
         status, glpiId, glpiStatus, glpiCat]
      );
      stats.created++;
    } else {
      await db.query(
        `UPDATE assets
         SET asset_name=$1, category=$2, serial_number=$3, location=$4,
             status=$5, glpi_status=$6, glpi_category=$7, glpi_synced_at=NOW()
         WHERE glpi_id=$8`,
        [name, category, serial, location, status, glpiStatus, glpiCat, glpiId]
      );
      stats.updated++;
    }
  }

  // ── Test connectivity ─────────────────────────────────────
  async testConnection() {
    try {
      await this._initSession();
      await this._killSession();
      return { success: true, message: 'GLPI API connection successful' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

module.exports = new GLPIService();
