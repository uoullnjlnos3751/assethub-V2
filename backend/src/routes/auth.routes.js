// backend/src/routes/auth.routes.js
'use strict';

const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const router  = express.Router();

const db           = require('../config/db');
const ldapService  = require('../services/ldap.service');
const { authMiddleware } = require('../middleware/auth.middleware');
const logger       = require('../utils/logger');

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    // Determine if this is an AD user
    // Accepts: watchara.kid  OR  watchara.kid@trrgroup.com
    const domain    = process.env.LDAP_DOMAIN || 'trrgroup';
    const isADUser  = !username.includes('@') || username.toLowerCase().endsWith(`@${domain}.com`);
    const samName   = username.split('@')[0];

    let user = null;

    // ── Try LDAP first if enabled and user looks like AD ──
    if (isADUser && process.env.LDAP_ENABLED === 'true') {
      try {
        const { adUser, role } = await ldapService.authenticate(samName, password);

        // Upsert into local DB
        const email = adUser.mail || `${samName}@${domain}.com`;
        const existing = await db.query(
          'SELECT * FROM users WHERE ad_username=$1 OR email=$2',
          [samName, email]
        );

        if (existing.rows.length === 0) {
          const inserted = await db.query(
            `INSERT INTO users
               (email, name, role, department, ad_username, ad_display_name,
                synced_from_ldap, ldap_synced_at, can_approve, is_active)
             VALUES ($1,$2,$3,$4,$5,$6,true,NOW(),$7,true) RETURNING *`,
            [email, adUser.displayName || samName, role,
             adUser.department || '', samName, adUser.displayName || samName,
             role === 'manager' || role === 'admin']
          );
          user = inserted.rows[0];
        } else {
          await db.query(
            `UPDATE users
             SET name=$1, role=$2, department=$3, ldap_synced_at=NOW()
             WHERE id=$4`,
            [adUser.displayName || samName, role,
             adUser.department || '', existing.rows[0].id]
          );
          user = existing.rows[0];
          user.role = role;
        }

        logger.info(`AD login success: ${samName}`);

      } catch (ldapErr) {
        logger.warn(`LDAP auth failed for ${samName}: ${ldapErr.message}`);
        // Fall through to local auth
      }
    }

    // ── Fallback: local DB auth ────────────────────────────
    if (!user) {
      const emailQuery = username.includes('@') ? username : `${username}@${domain}.com`;
      const row = await db.query(
        'SELECT * FROM users WHERE (email=$1 OR ad_username=$2) AND is_active=true',
        [emailQuery, samName]
      );

      if (!row.rows.length) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const dbUser = row.rows[0];

      if (!dbUser.password_hash) {
        return res.status(401).json({ message: 'AD account - please use your Windows password' });
      }

      const valid = await bcrypt.compare(password, dbUser.password_hash);
      if (!valid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      user = dbUser;
      logger.info(`Local login success: ${user.email}`);
    }

    // ── Update last login ──────────────────────────────────
    await db.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);

    // ── Audit log ──────────────────────────────────────────
    await db.query(
      `INSERT INTO audit_logs (user_id, action, description, ip_address)
       VALUES ($1, 'user_login', 'User logged in', $2)`,
      [user.id, req.ip]
    );

    // ── Issue JWT ──────────────────────────────────────────
    const token = jwt.sign(
      {
        id:               user.id,
        email:            user.email,
        role:             user.role,
        name:             user.name,
        can_approve:      user.can_approve,
        can_manage_assets: user.can_manage_assets,
        can_manage_users: user.can_manage_users,
        can_manage_config: user.can_manage_config,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.json({
      token,
      user: {
        id:               user.id,
        email:            user.email,
        name:             user.name,
        role:             user.role,
        department:       user.department,
        can_approve:      user.can_approve,
        can_manage_assets: user.can_manage_assets,
        can_manage_users: user.can_manage_users,
        can_manage_config: user.can_manage_config,
      },
    });

  } catch (err) {
    logger.error('Login error:', err);
    return res.status(500).json({ message: 'Authentication error' });
  }
});

// ── GET /api/auth/me ────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const row = await db.query(
      `SELECT id,email,name,role,department,company,
              can_approve,can_manage_assets,can_manage_users,can_manage_config,
              last_login,created_at
       FROM users WHERE id=$1`,
      [req.user.id]
    );
    if (!row.rows.length) return res.status(404).json({ message: 'User not found' });
    return res.json(row.rows[0]);
  } catch (err) {
    logger.error('Get me error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/auth/logout ───────────────────────────────────
router.post('/logout', authMiddleware, async (req, res) => {
  await db.query(
    `INSERT INTO audit_logs (user_id, action, description, ip_address)
     VALUES ($1, 'user_logout', 'User logged out', $2)`,
    [req.user.id, req.ip]
  );
  return res.json({ message: 'Logged out' });
});

module.exports = router;
