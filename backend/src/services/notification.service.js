// backend/src/services/notification.service.js
'use strict';

const nodemailer = require('nodemailer');
const axios      = require('axios');
const db         = require('../config/db');
const logger     = require('../utils/logger');

// ── Email templates ──────────────────────────────────────────
const emailTemplates = {
  borrow_approved: (v) => ({
    subject: `✅ [AssetHub] คำขอยืม ${v.assetName} ได้รับการอนุมัติ`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <div style="background:#0ea5e9;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">✅ คำขอยืมสินทรัพย์ได้รับการอนุมัติ</h2>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
          <p>สวัสดีคุณ <strong>${v.userName}</strong>,</p>
          <p>คำขอยืมสินทรัพย์ของคุณได้รับการอนุมัติแล้ว</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;background:#e0f2fe;font-weight:bold">สินทรัพย์</td><td style="padding:8px">${v.assetName}</td></tr>
            <tr><td style="padding:8px;background:#f0f9ff;font-weight:bold">รหัสคำขอ</td><td style="padding:8px">${v.loanCode}</td></tr>
            <tr><td style="padding:8px;background:#e0f2fe;font-weight:bold">วันที่ยืม</td><td style="padding:8px">${v.borrowDate}</td></tr>
            <tr><td style="padding:8px;background:#f0f9ff;font-weight:bold">วันครบกำหนดคืน</td><td style="padding:8px"><strong>${v.dueDate}</strong></td></tr>
          </table>
          <p style="color:#64748b;font-size:14px">กรุณาคืนสินทรัพย์ภายในวันที่กำหนด</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
          <p style="color:#94a3b8;font-size:12px">AssetITSM TRRT | ${new Date().getFullYear()}</p>
        </div>
      </div>`,
  }),

  borrow_rejected: (v) => ({
    subject: `❌ [AssetHub] คำขอยืม ${v.assetName} ถูกปฏิเสธ`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <div style="background:#ef4444;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">❌ คำขอยืมสินทรัพย์ถูกปฏิเสธ</h2>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
          <p>สวัสดีคุณ <strong>${v.userName}</strong>,</p>
          <p>คำขอยืมสินทรัพย์ของคุณ <strong>${v.assetName}</strong> ถูกปฏิเสธ</p>
          <p><strong>เหตุผล:</strong> ${v.reason || 'ไม่ระบุ'}</p>
          <p style="color:#64748b;font-size:14px">กรุณาติดต่อ IT Support หากมีข้อสงสัย</p>
        </div>
      </div>`,
  }),

  due_reminder: (v) => ({
    subject: `⏰ [AssetHub] แจ้งเตือน: ${v.assetName} ครบกำหนดใน ${v.daysLeft} วัน`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <div style="background:#f97316;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">⏰ แจ้งเตือนวันครบกำหนดคืน</h2>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
          <p>สวัสดีคุณ <strong>${v.userName}</strong>,</p>
          <p>สินทรัพย์ <strong>${v.assetName}</strong> ของคุณจะครบกำหนดคืนใน <strong>${v.daysLeft} วัน</strong></p>
          <p>วันครบกำหนด: <strong>${v.dueDate}</strong></p>
          <p style="color:#64748b;font-size:14px">กรุณาคืนหรือขอต่ออายุก่อนวันครบกำหนด</p>
        </div>
      </div>`,
  }),

  overdue: (v) => ({
    subject: `🔴 [AssetHub] เกินกำหนด: ${v.assetName} ค้างคืน ${v.overdueDays} วัน`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <div style="background:#dc2626;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">🔴 สินทรัพย์เกินกำหนดคืน!</h2>
        </div>
        <div style="background:#fff5f5;padding:24px;border:1px solid #fecaca;border-radius:0 0 8px 8px">
          <p>สวัสดีคุณ <strong>${v.userName}</strong>,</p>
          <p>สินทรัพย์ <strong>${v.assetName}</strong> เกินกำหนดคืนแล้ว <strong style="color:#dc2626">${v.overdueDays} วัน</strong></p>
          <p>กรุณาคืนสินทรัพย์โดยด่วน หรือติดต่อ IT Support ทันที</p>
        </div>
      </div>`,
  }),

  extension_approved: (v) => ({
    subject: `✅ [AssetHub] ต่ออายุการยืม ${v.assetName} ได้รับการอนุมัติ`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <div style="background:#22c55e;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">✅ การต่ออายุได้รับการอนุมัติ</h2>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
          <p>สวัสดีคุณ <strong>${v.userName}</strong>,</p>
          <p>การต่ออายุการยืม <strong>${v.assetName}</strong> ได้รับการอนุมัติ</p>
          <p>วันครบกำหนดใหม่: <strong>${v.newDueDate}</strong></p>
        </div>
      </div>`,
  }),
};

// ── Telegram message templates ───────────────────────────────
const telegramTemplates = {
  borrow_approved:    (v) => `✅ *คำขอยืมอนุมัติแล้ว*\n📦 ${v.assetName}\n🗓 ครบกำหนด: ${v.dueDate}`,
  borrow_rejected:    (v) => `❌ *คำขอยืมถูกปฏิเสธ*\n📦 ${v.assetName}\n❗ เหตุผล: ${v.reason || '-'}`,
  due_reminder:       (v) => `⏰ *แจ้งเตือน!* ${v.assetName} ครบกำหนดใน *${v.daysLeft} วัน* (${v.dueDate})`,
  overdue:            (v) => `🔴 *เกินกำหนด!* ${v.assetName} ค้างคืน *${v.overdueDays} วัน* กรุณาคืนโดยด่วน`,
  extension_approved: (v) => `✅ ต่ออายุ ${v.assetName} อนุมัติ\n📅 วันใหม่: ${v.newDueDate}`,
};

// ── Teams adaptive card templates ───────────────────────────
function teamsCard(title, color, facts, summary) {
  return {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          { type: 'TextBlock', text: title, weight: 'Bolder', size: 'Medium', color },
          { type: 'FactSet', facts },
          { type: 'TextBlock', text: summary, wrap: true, size: 'Small', color: 'Default' },
        ],
      },
    }],
  };
}

// ── NotificationService ──────────────────────────────────────
class NotificationService {

  // ── Enqueue a notification for processing ────────────────
  async enqueue(userId, eventType, variables, loanId = null) {
    // Get user preferences
    const prefRow = await db.query(
      'SELECT * FROM user_notification_preferences WHERE user_id=$1', [userId]
    );
    const pref = prefRow.rows[0] || { email_enabled: true };

    const channels = [];
    if (pref.email_enabled   !== false) channels.push('email');
    if (pref.telegram_enabled)          channels.push('telegram');
    if (pref.teams_enabled)             channels.push('teams');

    for (const channel of channels) {
      await db.query(
        `INSERT INTO notification_queue
           (user_id, loan_id, channel, event_type, variables, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        [userId, loanId, channel, eventType, JSON.stringify(variables)]
      );
    }
  }

  // ── Process pending notifications (called by cron) ───────
  async processQueue() {
    const rows = await db.query(
      `SELECT * FROM notification_queue
       WHERE status='pending'
         AND scheduled_for <= NOW()
         AND retry_count < max_retries
       ORDER BY created_at ASC
       LIMIT 50`
    );

    for (const job of rows.rows) {
      await this._dispatch(job);
    }
  }

  async _dispatch(job) {
    const vars = typeof job.variables === 'string'
      ? JSON.parse(job.variables)
      : job.variables || {};

    // Get user info
    const uRow = await db.query(
      'SELECT name, email, telegram_user_id FROM users WHERE id=$1', [job.user_id]
    );
    const user = uRow.rows[0];
    if (!user) return this._markFailed(job.id, 'User not found');

    vars.userName = vars.userName || user.name;

    try {
      if (job.channel === 'email')    await this._sendEmail(user.email, job.event_type, vars);
      if (job.channel === 'telegram') await this._sendTelegram(user.telegram_user_id, job.event_type, vars);
      if (job.channel === 'teams')    await this._sendTeams(job.event_type, vars);

      await db.query(
        `UPDATE notification_queue SET status='sent', sent_at=NOW() WHERE id=$1`,
        [job.id]
      );
    } catch (err) {
      logger.warn(`Notification dispatch failed [${job.channel}/${job.event_type}]: ${err.message}`);
      await db.query(
        `UPDATE notification_queue
         SET retry_count=retry_count+1, last_error=$1,
             status=CASE WHEN retry_count+1 >= max_retries THEN 'failed' ELSE 'pending' END
         WHERE id=$2`,
        [err.message, job.id]
      );
    }
  }

  async _markFailed(id, reason) {
    await db.query(
      `UPDATE notification_queue SET status='failed', last_error=$1 WHERE id=$2`,
      [reason, id]
    );
  }

  // ── Email ────────────────────────────────────────────────
  async _sendEmail(to, eventType, vars) {
    if (process.env.SMTP_ENABLED !== 'true') return;
    const template = emailTemplates[eventType];
    if (!template) throw new Error(`Unknown email template: ${eventType}`);
    const { subject, html } = template(vars);

    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: { ciphers: 'SSLv3' },
    });

    await transporter.sendMail({
      from:    process.env.SMTP_FROM,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${eventType}`);
  }

  // ── Telegram ─────────────────────────────────────────────
  async _sendTelegram(chatId, eventType, vars) {
    if (process.env.TELEGRAM_ENABLED !== 'true') return;
    if (!chatId) throw new Error('No Telegram chat ID for user');
    const template = telegramTemplates[eventType];
    if (!template) throw new Error(`Unknown Telegram template: ${eventType}`);
    const text = template(vars);

    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      { chat_id: chatId, text, parse_mode: 'Markdown' }
    );
    logger.info(`Telegram sent to ${chatId}: ${eventType}`);
  }

  // ── MS Teams ─────────────────────────────────────────────
  async _sendTeams(eventType, vars) {
    if (process.env.MSTEAMS_ENABLED !== 'true') return;
    const webhookUrl = this._getTeamsWebhook(eventType);
    if (!webhookUrl) throw new Error('No Teams webhook configured');

    let card;
    if (eventType === 'borrow_approved') {
      card = teamsCard('✅ Asset Borrow Approved', 'Good',
        [{ title: 'Asset',    value: vars.assetName },
         { title: 'Borrower', value: vars.userName  },
         { title: 'Due Date', value: vars.dueDate   }],
        `${vars.userName} has been approved to borrow ${vars.assetName}`);
    } else if (eventType === 'overdue') {
      card = teamsCard('🔴 Asset Overdue', 'Attention',
        [{ title: 'Asset',        value: vars.assetName     },
         { title: 'User',         value: vars.userName      },
         { title: 'Overdue Days', value: String(vars.overdueDays) }],
        'Please return or follow up immediately.');
    } else {
      card = { text: `[AssetHub] ${eventType}: ${JSON.stringify(vars)}` };
    }

    await axios.post(webhookUrl, card);
    logger.info(`Teams notification sent: ${eventType}`);
  }

  _getTeamsWebhook(eventType) {
    if (['overdue', 'due_reminder'].includes(eventType))
      return process.env.MSTEAMS_WEBHOOK_ALERTS;
    if (['borrow_approved', 'borrow_rejected'].includes(eventType))
      return process.env.MSTEAMS_WEBHOOK_APPROVALS;
    return process.env.MSTEAMS_WEBHOOK_GENERAL;
  }

  // ── Direct test methods ───────────────────────────────────
  async testEmail(to) {
    return this._sendEmail(to, 'due_reminder', {
      userName:  'Test User',
      assetName: 'Test Asset',
      daysLeft:  3,
      dueDate:   new Date().toLocaleDateString('th-TH'),
    });
  }

  async testTelegram(chatId) {
    return this._sendTelegram(chatId, 'due_reminder', {
      userName:  'Test User',
      assetName: 'Test Asset',
      daysLeft:  3,
      dueDate:   new Date().toLocaleDateString('th-TH'),
    });
  }

  async testTeams() {
    return this._sendTeams('borrow_approved', {
      userName:  'Test User',
      assetName: 'Test Asset',
      dueDate:   new Date().toLocaleDateString('th-TH'),
    });
  }
}

module.exports = new NotificationService();
