// backend/src/jobs/scheduler.js
'use strict';

const cron   = require('node-cron');
const logger = require('../utils/logger');
const db     = require('../config/db');

let ldapService, glpiService, notifService;

function init() {
  ldapService  = require('../services/ldap.service');
  glpiService  = require('../services/glpi.service');
  notifService = require('../services/notification.service');

  // ── LDAP Sync: every 60 minutes ──────────────────────────
  if (process.env.CRON_LDAP_SYNC_ENABLED !== 'false' &&
      process.env.LDAP_ENABLED === 'true') {
    cron.schedule('0 * * * *', async () => {
      logger.info('[CRON] LDAP sync started');
      try {
        const stats = await ldapService.syncUsers();
        logger.info(`[CRON] LDAP sync done: ${JSON.stringify(stats)}`);
      } catch (err) {
        logger.error('[CRON] LDAP sync error:', err.message);
      }
    });
    logger.info('CRON: LDAP sync scheduled (every 60 min)');
  }

  // ── GLPI Sync: every 30 minutes ──────────────────────────
  if (process.env.CRON_GLPI_SYNC_ENABLED !== 'false' &&
      process.env.GLPI_ENABLED === 'true') {
    cron.schedule('*/30 * * * *', async () => {
      logger.info('[CRON] GLPI sync started');
      try {
        const stats = await glpiService.syncAssets();
        logger.info(`[CRON] GLPI sync done: ${JSON.stringify(stats)}`);
      } catch (err) {
        logger.error('[CRON] GLPI sync error:', err.message);
      }
    });
    logger.info('CRON: GLPI sync scheduled (every 30 min)');
  }

  // ── Notification queue processor: every 5 minutes ────────
  if (process.env.CRON_NOTIFICATION_ENABLED !== 'false') {
    cron.schedule('*/5 * * * *', async () => {
      try {
        await notifService.processQueue();
      } catch (err) {
        logger.error('[CRON] Notification error:', err.message);
      }
    });
    logger.info('CRON: Notification queue scheduled (every 5 min)');
  }

  // ── Overdue detection: every hour ───────────────────────
  if (process.env.CRON_OVERDUE_DETECTION_ENABLED !== 'false') {
    cron.schedule('0 * * * *', async () => {
      logger.info('[CRON] Overdue detection started');
      try {
        await detectOverdue();
      } catch (err) {
        logger.error('[CRON] Overdue error:', err.message);
      }
    });
    logger.info('CRON: Overdue detection scheduled (every 60 min)');
  }

  // ── Due reminders: every day at 08:00 ───────────────────
  cron.schedule('0 8 * * *', async () => {
    logger.info('[CRON] Due reminder check started');
    try {
      await sendDueReminders();
    } catch (err) {
      logger.error('[CRON] Due reminder error:', err.message);
    }
  });
  logger.info('CRON: Due reminders scheduled (daily 08:00)');
}

// ── Detect and mark overdue loans ──────────────────────────
async function detectOverdue() {
  const result = await db.query(
    `UPDATE loans SET is_overdue=true
     WHERE status='borrowed'
       AND due_date < CURRENT_DATE
       AND is_overdue=false
     RETURNING id, user_id, asset_id, due_date`
  );

  for (const loan of result.rows) {
    const assetRow = await db.query('SELECT asset_name FROM assets WHERE id=$1', [loan.asset_id]);
    const days     = Math.floor((new Date() - new Date(loan.due_date)) / 86400000);

    await notifService.enqueue(loan.user_id, 'overdue', {
      assetName:   assetRow.rows[0]?.asset_name || 'Unknown',
      overdueDays: days,
      dueDate:     new Date(loan.due_date).toLocaleDateString('th-TH'),
    }, loan.id);

    await db.query(
      'UPDATE loans SET overdue_notified_at=NOW() WHERE id=$1', [loan.id]
    );
  }

  if (result.rows.length) {
    logger.info(`[CRON] Marked ${result.rows.length} loans as overdue`);
  }
}

// ── Send reminders for loans due in N days ──────────────────
async function sendDueReminders() {
  const reminderDays = parseInt(process.env.DUE_REMINDER_DAYS || '3');

  const rows = await db.query(
    `SELECT l.id, l.user_id, l.due_date, a.asset_name
     FROM loans l
     JOIN assets a ON l.asset_id=a.id
     WHERE l.status='borrowed'
       AND l.is_overdue=false
       AND l.due_date = CURRENT_DATE + $1::int`,
    [reminderDays]
  );

  for (const loan of rows.rows) {
    await notifService.enqueue(loan.user_id, 'due_reminder', {
      assetName: loan.asset_name,
      daysLeft:  reminderDays,
      dueDate:   new Date(loan.due_date).toLocaleDateString('th-TH'),
    }, loan.id);
  }

  if (rows.rows.length) {
    logger.info(`[CRON] Queued ${rows.rows.length} due-reminder notifications`);
  }
}

module.exports = { init };
