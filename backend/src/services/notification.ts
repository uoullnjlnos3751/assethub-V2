import { prisma } from '../index';

export async function createNotification(
  eventType: string,
  channel: 'EMAIL' | 'TEAMS',
  recipient: string,
  payload: Record<string, any>
) {
  try {
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
  for (const [key, val] of Object.entries(payload)) {
    body = body.replace(`{{${key}}}`, String(val));
  }
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
    text: body,
  });
}

async function sendTeams(eventType: string, payload: Record<string, any>) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
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
