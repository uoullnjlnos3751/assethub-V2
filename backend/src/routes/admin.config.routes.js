// backend/src/routes/admin.config.routes.js
'use strict';

const express  = require('express');
const router   = express.Router();
const db       = require('../config/db');
const ldap     = require('../services/ldap.service');
const glpi     = require('../services/glpi.service');
const notif    = require('../services/notification.service');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const logger   = require('../utils/logger');

// All admin config routes require superadmin or admin + can_manage_config
router.use(authMiddleware);
router.use(requireRole(['admin', 'superadmin']));

// ── GET /api/admin/config ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT id, config_key, config_type, is_sensitive,
              CASE WHEN is_sensitive THEN '(hidden)' ELSE config_value END AS config_value,
              CASE WHEN is_sensitive THEN NULL ELSE config_json END AS config_json,
              description, last_modified_at
       FROM configurations ORDER BY config_type, config_key`
    );
    // Group by type
    const grouped = {};
    for (const r of rows.rows) {
      if (!grouped[r.config_type]) grouped[r.config_type] = [];
      grouped[r.config_type].push(r);
    }
    return res.json(grouped);
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: 'Error fetching config' });
  }
});

// ── GET /api/admin/config/:type ─────────────────────────────
router.get('/:type', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT id, config_key, config_type, is_sensitive,
              CASE WHEN is_sensitive THEN '(hidden)' ELSE config_value END AS config_value,
              CASE WHEN is_sensitive THEN NULL ELSE config_json END AS config_json,
              description, last_modified_at
       FROM configurations WHERE config_type=$1 ORDER BY config_key`,
      [req.params.type]
    );
    return res.json(rows.rows);
  } catch (err) {
    return res.status(500).json({ message: 'Error' });
  }
});

// ── PUT /api/admin/config ───────────────────────────────────
// Body: [ { config_key, config_value?, config_json? }, ... ]
router.put('/', async (req, res) => {
  const updates = req.body;
  if (!Array.isArray(updates)) return res.status(400).json({ message: 'Array expected' });

  try {
    for (const u of updates) {
      await db.query(
        `UPDATE configurations
         SET config_value=$1, config_json=$2,
             last_modified_by=$3, last_modified_at=NOW()
         WHERE config_key=$4`,
        [u.config_value || null,
         u.config_json ? JSON.stringify(u.config_json) : null,
         req.user.id,
         u.config_key]
      );
    }

    await db.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, description, ip_address)
       VALUES ($1,'config_update','configuration','Admin updated configuration',$2)`,
      [req.user.id, req.ip]
    );

    return res.json({ message: 'Configuration updated' });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: 'Error saving config' });
  }
});

// ── Integration status ──────────────────────────────────────
router.get('/integration/status', async (req, res) => {
  const status = {};

  // LDAP
  try {
    const r = await ldap.testConnection();
    status.ldap = r;
  } catch (e) {
    status.ldap = { success: false, message: e.message };
  }

  // GLPI
  try {
    const r = await glpi.testConnection();
    status.glpi = r;
  } catch (e) {
    status.glpi = { success: false, message: e.message };
  }

  // Email
  status.email = {
    success: process.env.SMTP_ENABLED === 'true',
    message: process.env.SMTP_ENABLED === 'true' ? 'SMTP configured' : 'Disabled',
  };

  // Telegram
  status.telegram = {
    success: process.env.TELEGRAM_ENABLED === 'true',
    message: process.env.TELEGRAM_ENABLED === 'true' ? 'Enabled' : 'Disabled',
  };

  // Teams
  status.teams = {
    success: process.env.MSTEAMS_ENABLED === 'true',
    message: process.env.MSTEAMS_ENABLED === 'true' ? 'Enabled' : 'Disabled',
  };

  return res.json(status);
});

// ── Test connections ────────────────────────────────────────
router.post('/test/ldap', async (req, res) => {
  const result = await ldap.testConnection();
  return res.json(result);
});

router.post('/test/glpi', async (req, res) => {
  const result = await glpi.testConnection();
  return res.json(result);
});

router.post('/test/email', async (req, res) => {
  try {
    await notif.testEmail(req.user.email);
    return res.json({ success: true, message: `Test email sent to ${req.user.email}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/test/telegram', async (req, res) => {
  const { chatId } = req.body;
  try {
    await notif.testTelegram(chatId);
    return res.json({ success: true, message: 'Telegram test sent' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/test/teams', async (req, res) => {
  try {
    await notif.testTeams();
    return res.json({ success: true, message: 'Teams test sent' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Manual sync triggers ────────────────────────────────────
router.post('/sync/ldap', async (req, res) => {
  try {
    const stats = await ldap.syncUsers(req.user.id);
    return res.json({ message: 'LDAP sync completed', stats });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/sync/glpi', async (req, res) => {
  try {
    const stats = await glpi.syncAssets(req.user.id);
    return res.json({ message: 'GLPI sync completed', stats });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ── Sync logs ────────────────────────────────────────────────
router.get('/sync/logs/ldap', async (req, res) => {
  const rows = await db.query(
    'SELECT * FROM ldap_sync_logs ORDER BY created_at DESC LIMIT 20'
  );
  return res.json(rows.rows);
});

router.get('/sync/logs/glpi', async (req, res) => {
  const rows = await db.query(
    'SELECT * FROM glpi_sync_logs ORDER BY created_at DESC LIMIT 20'
  );
  return res.json(rows.rows);
});

// ── Notification queue ───────────────────────────────────────
router.get('/notifications/queue', async (req, res) => {
  const rows = await db.query(
    `SELECT nq.*, u.name AS user_name, u.email
     FROM notification_queue nq
     JOIN users u ON nq.user_id=u.id
     ORDER BY nq.created_at DESC LIMIT 100`
  );
  return res.json(rows.rows);
});

module.exports = router;
