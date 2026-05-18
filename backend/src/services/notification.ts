import { prisma } from '../index';

let cachedSettings: any = null;
let settingsCacheTime = 0;

export function invalidateSettingsCache() {
  cachedSettings = null;
  settingsCacheTime = 0;
}

async function getSettings() {
  const now = Date.now();
  if (!cachedSettings || now - settingsCacheTime > 30000) {
    cachedSettings = await prisma.notificationSetting.findFirst();
    settingsCacheTime = now;
  }
  return cachedSettings;
}

export async function createNotification(
  eventType: string,
  channel: 'EMAIL' | 'TEAMS',
  recipient: string,
  payload: Record<string, any>
) {
  try {
    const settings = await getSettings();

    if (channel === 'EMAIL' && settings?.enableEmail === false) {
      console.log(`Email notifications disabled. Skipping: ${eventType} -> ${recipient}`);
      return;
    }

    if (channel === 'TEAMS' && settings?.enableTeams === false) {
      console.log(`Teams notifications disabled. Skipping: ${eventType} -> ${recipient}`);
      return;
    }

    const enabledKeys = settings?.enabledEventKeys
      ? settings.enabledEventKeys.split(',').map((k: string) => k.trim())
      : [];

    if (enabledKeys.length > 0 && !enabledKeys.includes(eventType)) {
      console.log(`Event ${eventType} is not in enabledEventKeys. Skipping.`);
      return;
    }

    await prisma.notificationOutbox.create({
      data: {
        eventType,
        channel,
        recipient,
        payloadJson: JSON.stringify(payload),
        status: 'PENDING',
      },
    });
    console.log(`Notification queued: ${eventType} -> ${recipient} via ${channel}`);
  } catch (err) {
    console.error('Failed to queue notification:', err);
  }
}

export async function processNotificationQueue() {
  const pending = await prisma.notificationOutbox.findMany({
    where: { status: 'PENDING' },
    take: 20,
  });

  for (const notif of pending) {
    try {
      if (notif.channel === 'EMAIL') {
        await sendEmail(notif.recipient, notif.eventType, JSON.parse(notif.payloadJson));
      } else if (notif.channel === 'TEAMS') {
        await sendTeams(notif.eventType, JSON.parse(notif.payloadJson));
      }
      await prisma.notificationOutbox.update({
        where: { id: notif.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (err: any) {
      await prisma.notificationOutbox.update({
        where: { id: notif.id },
        data: {
          status: 'FAILED',
          retryCount: notif.retryCount + 1,
          lastError: err.message,
        },
      });
    }
  }
}

async function sendEmail(to: string, eventType: string, payload: Record<string, any>) {
  const template = await prisma.notificationTemplate.findFirst({
    where: { key: eventType, channel: 'EMAIL' },
  });

  if (!template) {
    console.log(`No email template for ${eventType}, sending generic`);
    await sendSimpleEmail(to, `แจ้งเตือน: ${eventType}`, `มีการแจ้งเตือนเหตุการณ์: ${JSON.stringify(payload)}`);
    return;
  }

  let body = template.bodyTh;

  if (payload.items && Array.isArray(payload.items)) {
    const statusColors: Record<string, { bg: string; text: string }> = {
      'รอการอนุมัติ': { bg: '#fef3c7', text: '#92400e' },
      'อนุมัติ': { bg: '#d1fae5', text: '#065f46' },
      'ไม่อนุมัติ': { bg: '#fee2e2', text: '#991b1b' },
      'ส่งมอบแล้ว': { bg: '#dbeafe', text: '#1e40af' },
      'คืนแล้ว': { bg: '#dcfce7', text: '#166534' },
    };

    const itemsHtml = payload.items.map((item: any) => {
      let bgColor = '#f1f5f9';
      let textColor = '#475569';
      if (statusColors[item.status]) {
        bgColor = statusColors[item.status].bg;
        textColor = statusColors[item.status].text;
      } else if (item.status?.startsWith('เกิน')) {
        bgColor = '#fee2e2';
        textColor = '#991b1b';
      } else if (item.requester) {
        bgColor = '#fef3c7';
        textColor = '#92400e';
      }
      const requesterCell = item.requester
        ? `<td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;"><span style="font-weight: 600; color: #1e293b;">${item.requester}</span></td>`
        : '';
      return `
        <tr>
          ${requesterCell}
          <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">
            <div style="font-weight: 600; color: #1e293b;">${item.assetCode || 'N/A'}</div>
            <div style="color: #64748b; font-size: 12px;">${item.serialNo || ''} ${item.brand || ''} ${item.model || ''}</div>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: center;">
            <span style="background: ${bgColor}; color: ${textColor}; padding: 3px 10px; border-radius: 12px; font-weight: 600; font-size: 11px;">${item.status || '-'}</span>
          </td>
        </tr>
      `;
    }).join('');

    const hasRequester = payload.items.some((item: any) => item.requester);
    const requesterHeader = hasRequester ? '<th style="background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 12px; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0;">ผู้ยืม</th>' : '';
    const itemsTableHtml = `
      <table class="items-table" style="width: 100%; border-collapse: collapse; margin-top: 8px;">
        <thead>
          <tr>
            ${requesterHeader}
            <th style="background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 12px; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0;">ทรัพย์สิน</th>
            <th style="background: #f1f5f9; padding: 10px 12px; text-align: center; font-size: 12px; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0;">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    `;
    body = body.replace('{{itemsTable}}', itemsTableHtml);
  }

  if (payload.note && payload.note !== '-' && payload.note !== '') {
    const noteHtml = `<div class="note-box" style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px; margin-top: 16px;"><p style="margin: 0; color: #92400e; font-size: 13px;"><b>หมายเหตุ:</b> ${payload.note}</p></div>`;
    body = body.replace('{{note}}', noteHtml);
  } else {
    body = body.replace(/{{note}}/g, '');
  }

  for (const [key, val] of Object.entries(payload)) {
    if (key !== 'items' && key !== 'note') {
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
    }
  }

  body = body.replace(/{{\w+}}/g, '-');

  await sendSimpleEmail(to, template.subjectTh, body);
}

async function sendSimpleEmail(to: string, subject: string, body: string) {
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html: body,
    text: body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\n{3,}/g, '\n\n'),
  });
}

async function sendTeams(eventType: string, payload: Record<string, any>) {
  const settings = await getSettings();
  const webhookUrl = settings?.teamsWebhookUrl || process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const template = await prisma.notificationTemplate.findFirst({
    where: { key: eventType, channel: 'TEAMS' },
  });

  let message = template?.bodyTh || `**${eventType}**\n${JSON.stringify(payload, null, 2)}`;
  for (const [key, val] of Object.entries(payload)) {
    message = message.replace(`{{${key}}}`, String(val));
  }

  const https = await import('https');
  const payloadJson = JSON.stringify({ text: message });

  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payloadJson) },
    }, (res) => {
      if (res.statusCode === 200) resolve(undefined);
      else reject(new Error(`Teams webhook returned ${res.statusCode}`));
    });
    req.on('error', reject);
    req.write(payloadJson);
    req.end();
  });
}

// Run every 5 minutes in production via cron/scheduler
export function startNotificationWorker() {
  setInterval(processNotificationQueue, 5 * 60 * 1000);
  console.log('Notification worker started (interval: 5min)');
}
