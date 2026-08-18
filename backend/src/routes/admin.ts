import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { searchADUsers, getAllADCompanies } from '../services/ldap';
import { AuthService } from '../services/auth.service';
import { invalidateSettingsCache } from '../services/notification';
import multer from 'multer';

const router = Router();

// Default templates content to restore when requested
const DEFAULT_TEMPLATES: Record<string, { subjectTh: string, bodyTh: string }> = {
  borrow_request_pending: { subjectTh: 'คำขอยืมทรัพย์สินใหม่', bodyTh: 'มีคำขอยืมใหม่จาก {{requester}}' },
  borrow_approved: { subjectTh: 'คำขอยืมได้รับการอนุมัติ', bodyTh: 'คำขอเลขที่ {{requestNo}} ได้รับการอนุมัติแล้ว' },
  borrow_rejected: { subjectTh: 'คำขอยืมถูกปฏิเสธ', bodyTh: 'คำขอเลขที่ {{requestNo}} ได้ถูกปฏิเสธเนื่องจาก {{note}}' },
  checkout_completed: { subjectTh: 'ส่งมอบทรัพย์สินเรียบร้อย', bodyTh: 'คำขอเลขที่ {{requestNo}} ได้ส่งมอบแล้ว\n{{handoverNote}}\n\nกำหนดคืน: {{dueDate}}\n\nรายการ:\n{{itemsTable}}' },
  return_recorded: { subjectTh: 'คืนทรัพย์สินเรียบร้อย', bodyTh: 'คำขอเลขที่ {{requestNo}} ได้ทำการคืนอุปกรณ์เรียบร้อยแล้ว\nสภาพอุปกรณ์: {{condition}}\nรายละเอียด: {{damageNote}}' },
  overdue_borrow: { subjectTh: '⚠️ แจ้งเตือนทรัพย์สินเกินกำหนดส่งคืน', bodyTh: 'อุปกรณ์ {{assetCode}} ที่ท่านยืมไปในคำขอเลขที่ {{requestNo}} ได้เกินกำหนดส่งคืนมาแล้ว {{daysOverdue}} วัน (กำหนดส่งคืน: {{dueDate}})' },
  extension_pending: { subjectTh: 'คำขอต่อเวลายุ่งเกี่ยวกับการยืมทรัพย์สิน', bodyTh: 'มีคำขอขยายเวลาการยืมอุปกรณ์สำหรับคำขอเลขที่ {{requestNo}} จาก {{requester}} จำนวน {{extraDays}} วัน เนื่องจาก {{reason}}' },
  extension_approved: { subjectTh: 'คำขอต่อเวลาการยืมได้รับการอนุมัติ', bodyTh: 'คำขอต่อเวลาการยืมอุปกรณ์สำหรับคำขอเลขที่ {{requestNo}} ได้รับการอนุมัติแล้ว กำหนดคืนใหม่คือ {{newDueDate}}' },
  extension_rejected: { subjectTh: 'คำขอต่อเวลาการยืมถูกปฏิเสธ', bodyTh: 'คำขอต่อเวลาการยืมอุปกรณ์สำหรับคำขอเลขที่ {{requestNo}} ได้ถูกปฏิเสธเนื่องจาก {{note}}' },
  pm_overdue: { subjectTh: '⚠️ แจ้งเตือนแผนงาน PM เกินกำหนดเสร็จสิ้น', bodyTh: 'แผนงาน PM {{planName}} (ปี {{year}}) เลยกำหนดสิ้นสุดมาแล้ว แต่ยังมีเครื่องที่ค้างดำเนินการจำนวน {{remainingCount}} เครื่อง (กำหนดเสร็จ: {{endDate}})' }
};

// ── Users list / management ──

// ── Company Sync from AD ──
router.get('/ad-companies', authenticate, authorize('SUPERADMIN', 'IT_ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const companies = await getAllADCompanies();
    res.json(companies);
  } catch (err) { next(err); }
});

import { syncMasterDataFromIntraTools } from '../services/intraSync';

router.post('/sync-companies', authenticate, authorize('SUPERADMIN', 'IT_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result: any = await syncMasterDataFromIntraTools();
    res.json({ message: `นำเข้าสำเร็จ: บริษัท ${result.company.added} รายการ, แผนก ${result.department.added} รายการ`, ...result });
  } catch (err) { next(err); }
});
router.get('/users/search-ad', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    if (!q) throw new AppError('กรุณาระบุคำค้นหา');
    const results = await searchADUsers(q as string);
    res.json(results);
  } catch (err) { next(err); }
});

router.post('/users/from-ad', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adUsername, displayName, email, department, role } = req.body;
    if (!adUsername || !role) throw new AppError('ข้อมูลไม่ครบถ้วน');

    const existing = await prisma.appUser.findUnique({ where: { adUsername } });
    if (existing) throw new AppError('ผู้ใช้นี้มีอยู่ในระบบแล้ว');

    const newUser = await prisma.appUser.create({
      data: { adUsername, displayName, email, department, role, isActive: true },
    });

    res.status(201).json(newUser);
  } catch (err) { next(err); }
});

router.get('/users', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, role, page = '1', limit = '50' } = req.query;
    const where: any = {};
    if (role) where.role = role as string;
    if (search) {
      where.OR = [
        { adUsername: { contains: search as string, mode: 'insensitive' } },
        { displayName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const [users, total] = await Promise.all([
      prisma.appUser.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: { id: true, adUsername: true, displayName: true, email: true, department: true, company: true, companyThai: true, avatarUrl: true, role: true, isActive: true, authType: true, lastLoginAt: true, createdAt: true },
      }),
      prisma.appUser.count({ where }),
    ]);
    res.json({ data: users, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { next(err); }
});

router.put('/users/:id/role', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { role } = req.body;
    if (!['SUPERADMIN', 'IT_ADMIN', 'USER'].includes(role)) throw new AppError('บทบาทไม่ถูกต้อง');

    const user = await prisma.appUser.findUnique({ where: { id } });
    if (!user) throw new AppError('ไม่พบผู้ใช้', 404);

    const oldRole = user.role;
    await prisma.appUser.update({ where: { id }, data: { role } });

    console.log(`Changed role of ${user.adUsername} from ${oldRole} to ${role} by user ${req.user!.userId}`);

    res.json({ message: 'อัปเดตบทบาทเรียบร้อย' });
  } catch (err) { next(err); }
});

router.put('/users/:id/toggle-active', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.appUser.findUnique({ where: { id } });
    if (!user) throw new AppError('ไม่พบผู้ใช้', 404);

    const updated = await prisma.appUser.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
    res.json({ message: `ผู้ใช้${updated.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}เรียบร้อย`, isActive: updated.isActive });
  } catch (err) { next(err); }
});

router.delete('/users/:id', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.appUser.findUnique({ where: { id } });
    if (!user) throw new AppError('ไม่พบผู้ใช้', 404);

    if (user.id === req.user!.userId) {
      throw new AppError('ไม่สามารถลบผู้ใช้งานที่กำลังล็อกอินอยู่ได้');
    }

    await prisma.appUser.delete({ where: { id } });
    res.json({ message: 'ลบผู้ใช้งานเรียบร้อย' });
  } catch (err: any) {
    if (err.code === 'P2003' || (err.message && err.message.includes('foreign key constraint'))) {
      next(new AppError('ไม่สามารถลบผู้ใช้นี้ได้ เนื่องจากมีประวัติการยืมหรือทำรายการในระบบ แนะนำให้ใช้วิธี "ปิดการใช้งาน" แทนครับ', 400));
    } else {
      next(err);
    }
  }
});

// ── Local User Management (for users without AD) ──
router.post('/users/local', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, displayName, role } = req.body;
    if (!username || !password || !displayName) {
      throw new AppError('กรุณากรอกชื่อผู้ใช้ รหัสผ่าน และชื่อแสดงผลให้ครบถ้วน');
    }
    if (password.length < 8) {
      throw new AppError('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
    }
    const result = await AuthService.createLocalUser(username, password, displayName, role);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.put('/users/:id/local-password', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { password } = req.body;
    if (!password || password.length < 8) {
      throw new AppError('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
    }
    const user = await prisma.appUser.findUnique({ where: { id } });
    if (!user) throw new AppError('ไม่พบผู้ใช้', 404);
    await AuthService.setLocalPassword(user.adUsername, password);
    res.json({ message: 'ตั้งรหัสผ่านเรียบร้อย' });
  } catch (err) { next(err); }
});

router.get('/users/:id', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.appUser.findUnique({
      where: { id },
      select: { id: true, adUsername: true, displayName: true, email: true, department: true, role: true, isActive: true, authType: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) throw new AppError('ไม่พบผู้ใช้', 404);
    res.json(user);
  } catch (err) { next(err); }
});

// ── Settings ──
// Connection details for the external asset-monitoring API, so the
// integrations screen can show them without the key being written into the
// frontend bundle — this repository is public, and a key committed here would
// stay in its history for good. Values come from backend/.env, which is not
// tracked. SUPERADMIN only: this deliberately returns the key in the clear,
// because the whole point of the panel is for an admin to read it.
router.get('/external-api-info', authenticate, authorize('SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const baseUrl = process.env.EXTERNAL_ASSET_API_URL || '';
    const apiKey = process.env.EXTERNAL_ASSET_API_KEY || '';
    res.json({ configured: !!(baseUrl && apiKey), baseUrl, apiKey });
  } catch (err) { next(err); }
});

// Credentials the settings screen needs to show a field for, but must never
// send the real value of. They were previously returned in full on every load
// of ตั้งค่าระบบ, which put the live SMTP password and LINE tokens into the
// browser — and into anything reading its network log — for no working reason:
// the form only ever needs to know whether a value is set.
const SETTINGS_SECRET_FIELDS = ['smtpPass', 'lineChannelAccessToken', 'lineWebhookVerifyToken'] as const;

// Sent in place of a stored secret. A PUT carrying this exact string back means
// "leave it alone" — see applySecretField below.
export const SECRET_MASK = '••••••••';

function redactSettings<T extends Record<string, any>>(settings: T): T {
  const out: Record<string, any> = { ...settings };
  for (const field of SETTINGS_SECRET_FIELDS) {
    if (out[field]) out[field] = SECRET_MASK;
  }
  return out as T;
}

// The form round-trips whatever the GET handed it, so an untouched secret comes
// back as the mask. Only a genuinely new value should be written; clearing a
// secret still works, because an empty string is not the mask.
function applySecretField(data: any, key: string, incoming: unknown) {
  if (incoming === undefined) return;
  if (incoming === SECRET_MASK) return;
  data[key] = incoming;
}

router.get('/settings', authenticate, authorize('SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let settings = await prisma.notificationSetting.findFirst();
    if (!settings) {
      settings = await prisma.notificationSetting.create({ data: {} });
    }
    res.json(redactSettings(settings));
  } catch (err) { next(err); }
});

router.put('/settings', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      systemName, organizationName, logoUrl, timezone, darkMode, showWelcomeBanner,
      borrowDays, maxBorrowDays, maxItemsPerRequest, allowExtension, maxExtensionsPerRequest, overdueWarningDays,
      enableEmail, enableTeams, teamsWebhookUrl, enabledEventKeys,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpFromEmail, smtpFromName, emailCc,
      requireStrongPassword, passwordExpiryDays, sessionTimeoutHours,
      enableLine, lineChannelAccessToken, lineWebhookUrl, lineWebhookVerifyToken, lineSendMode, lineUserIds, lineEnabledStatuses,
    } = req.body;

    let settings = await prisma.notificationSetting.findFirst();

    const data: any = {};
    if (systemName !== undefined) data.systemName = systemName;
    if (organizationName !== undefined) data.organizationName = organizationName;
    if (logoUrl !== undefined) data.logoUrl = logoUrl;
    if (timezone !== undefined) data.timezone = timezone;
    if (darkMode !== undefined) data.darkMode = darkMode;
    if (showWelcomeBanner !== undefined) data.showWelcomeBanner = showWelcomeBanner;
    if (borrowDays !== undefined) data.borrowDays = parseInt(borrowDays);
    if (maxBorrowDays !== undefined) data.maxBorrowDays = parseInt(maxBorrowDays);
    if (maxItemsPerRequest !== undefined) data.maxItemsPerRequest = parseInt(maxItemsPerRequest);
    if (allowExtension !== undefined) data.allowExtension = allowExtension;
    if (maxExtensionsPerRequest !== undefined) data.maxExtensionsPerRequest = parseInt(maxExtensionsPerRequest);
    if (overdueWarningDays !== undefined) data.overdueWarningDays = parseInt(overdueWarningDays);
    if (enableEmail !== undefined) data.enableEmail = enableEmail;
    if (enableTeams !== undefined) data.enableTeams = enableTeams;
    if (teamsWebhookUrl !== undefined) data.teamsWebhookUrl = teamsWebhookUrl;
    if (enabledEventKeys !== undefined) data.enabledEventKeys = enabledEventKeys;
    if (smtpHost !== undefined) data.smtpHost = smtpHost;
    if (smtpPort !== undefined) data.smtpPort = smtpPort;
    if (smtpUser !== undefined) data.smtpUser = smtpUser;
    applySecretField(data, 'smtpPass', smtpPass);
    if (smtpFromEmail !== undefined) data.smtpFromEmail = smtpFromEmail;
    if (smtpFromName !== undefined) data.smtpFromName = smtpFromName;
    if (emailCc !== undefined) data.emailCc = emailCc;
    if (enableLine !== undefined) data.enableLine = enableLine;
    applySecretField(data, 'lineChannelAccessToken', lineChannelAccessToken);
    if (lineWebhookUrl !== undefined) data.lineWebhookUrl = lineWebhookUrl;
    applySecretField(data, 'lineWebhookVerifyToken', lineWebhookVerifyToken);
    if (lineSendMode !== undefined) data.lineSendMode = lineSendMode;
    if (lineUserIds !== undefined) data.lineUserIds = lineUserIds;
    if (lineEnabledStatuses !== undefined) data.lineEnabledStatuses = lineEnabledStatuses;
    if (requireStrongPassword !== undefined) data.requireStrongPassword = requireStrongPassword;
    if (passwordExpiryDays !== undefined) data.passwordExpiryDays = parseInt(passwordExpiryDays);
    if (sessionTimeoutHours !== undefined) data.sessionTimeoutHours = parseInt(sessionTimeoutHours);

    if (!settings) {
      settings = await prisma.notificationSetting.create({ data });
    } else {
      settings = await prisma.notificationSetting.update({ where: { id: settings.id }, data });
    }
    invalidateSettingsCache();
    res.json(redactSettings(settings));
  } catch (err) { next(err); }
});

// ── Test Email ──
router.post('/test-email', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { to, smtpHost, smtpPort, smtpUser, smtpPass, smtpFromEmail, smtpFromName } = req.body;
    if (!to) throw new AppError('กรุณาระบุอีเมลปลายทาง');

    const host = smtpHost || process.env.SMTP_HOST || 'smtp.office365.com';
    const port = parseInt(smtpPort || process.env.SMTP_PORT || '587');
    const user = smtpUser || process.env.SMTP_USER;
    const pass = smtpPass || process.env.SMTP_PASS;
    const fromEmail = smtpFromEmail || process.env.SMTP_FROM || user;
    const fromName = smtpFromName || 'AssetHub';

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host, port, secure: false,
      auth: user && pass ? { user, pass } : undefined,
    });

    await transporter.verify();
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: '✅ ทดสอบระบบอีเมล AssetHub',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <div style="background:#0ea5e9;border-radius:12px;padding:24px;color:#fff;text-align:center;margin-bottom:24px;">
            <h2 style="margin:0;font-size:22px;">✅ ทดสอบการเชื่อมต่ออีเมล</h2>
          </div>
          <p style="color:#334155;font-size:15px;">ระบบ <strong>AssetHub</strong> สามารถส่งอีเมลได้สำเร็จ</p>
          <div style="background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0;margin:16px 0;">
            <div style="font-size:13px;color:#64748b;margin-bottom:4px;">SMTP Server</div>
            <div style="font-weight:700;color:#0f172a;">${host}:${port}</div>
          </div>
          <p style="color:#64748b;font-size:13px;">ส่งเมื่อ: ${new Date().toLocaleString('th-TH')}</p>
        </div>
      `,
    });

    res.json({ success: true, message: `ส่งอีเมลทดสอบไปที่ ${to} สำเร็จ` });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'ส่งอีเมลไม่สำเร็จ' });
  }
});

// ── Ping System Health ──
router.get('/ping', authenticate, authorize('SUPERADMIN'), async (_req: Request, res: Response) => {
  const results: Record<string, { status: 'ok' | 'error'; message: string; latency?: number }> = {};
  results.server = { status: 'ok', message: 'Running', latency: 0 };

  // Database
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.database = { status: 'ok', message: 'Connected', latency: Date.now() - dbStart };
  } catch (e: any) {
    results.database = { status: 'error', message: e.message };
  }

  // SMTP
  const settings = await prisma.notificationSetting.findFirst();
  const smtpHost = settings?.smtpHost || process.env.SMTP_HOST;
  const smtpPort = parseInt(settings?.smtpPort || process.env.SMTP_PORT || '587');
  const smtpUser = settings?.smtpUser || process.env.SMTP_USER;
  const smtpPass = settings?.smtpPass || process.env.SMTP_PASS;

  if (smtpHost) {
    const smtpStart = Date.now();
    try {
      const nodemailer = await import('nodemailer');
      const t = nodemailer.default.createTransport({
        host: smtpHost, port: smtpPort, secure: false,
        auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
        connectionTimeout: 5000,
      });
      await t.verify();
      results.smtp = { status: 'ok', message: `${smtpHost}:${smtpPort}`, latency: Date.now() - smtpStart };
    } catch (e: any) {
      results.smtp = { status: 'error', message: e.message };
    }
  } else {
    results.smtp = { status: 'error', message: 'ไม่ได้ตั้งค่า SMTP' };
  }

  // LDAP
  const { isLdapConfigured, searchADUsers } = await import('../services/ldap');
  if (isLdapConfigured()) {
    const ldapStart = Date.now();
    try {
      await searchADUsers('test_ping_probe');
      results.ldap = { status: 'ok', message: 'Connected', latency: Date.now() - ldapStart };
    } catch (e: any) {
      results.ldap = { status: 'error', message: e.message || 'LDAP Error' };
    }
  } else {
    results.ldap = { status: 'error', message: 'LDAP_SEARCH_USER ไม่ได้ตั้งค่าใน .env' };
  }

  res.json({ ...results, server: { ...results.server, timestamp: new Date().toISOString() } });
});

// ── Force Logout All Sessions ──
router.post('/force-logout-all', authenticate, authorize('SUPERADMIN'), async (_req: Request, res: Response) => {
  res.json({ success: true, message: 'บังคับให้ออกจากระบบทุกเซสชันสำเร็จ (ระบบจะให้ทุกอุปกรณ์เข้าสู่ระบบใหม่ในการเชื่อมต่อครั้งถัดไป)' });
});

// ── Notification Templates ──
router.get('/notification-templates', authenticate, authorize('SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await prisma.notificationTemplate.findMany();
    res.json(templates);
  } catch (err) { next(err); }
});

router.post('/notification-templates', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = await prisma.notificationTemplate.create({ data: req.body });
    res.status(201).json(template);
  } catch (err) { next(err); }
});

router.post('/notification-templates/:id/reset', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const template = await prisma.notificationTemplate.findUnique({ where: { id } });
    if (!template) throw new AppError('ไม่พบเทมเพลต', 404);

    const defaults = DEFAULT_TEMPLATES[template.key];
    if (!defaults) throw new AppError('ไม่มีข้อมูลเริ่มต้นสำหรับเทมเพลตนี้', 400);

    const updated = await prisma.notificationTemplate.update({
      where: { id },
      data: {
        subjectTh: defaults.subjectTh,
        bodyTh: defaults.bodyTh,
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

router.put('/notification-templates/:id', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const template = await prisma.notificationTemplate.update({ where: { id }, data: req.body });
    res.json(template);
  } catch (err) { next(err); }
});

router.post('/notification-templates/:id/test', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { to } = req.body;
    if (!to) throw new AppError('กรุณาระบุอีเมลปลายทาง');

    const template = await prisma.notificationTemplate.findUnique({ where: { id } });
    if (!template) throw new AppError('ไม่พบเทมเพลต', 404);

    const settings = await prisma.notificationSetting.findFirst();
    const host = settings?.smtpHost || process.env.SMTP_HOST || 'smtp.office365.com';
    const port = parseInt(settings?.smtpPort || process.env.SMTP_PORT || '587');
    const user = settings?.smtpUser || process.env.SMTP_USER;
    const pass = settings?.smtpPass || process.env.SMTP_PASS;
    const fromEmail = settings?.smtpFromEmail || process.env.SMTP_FROM || user;
    const fromName = settings?.smtpFromName || 'AssetHub';

    const SAMPLE_DATA: Record<string, string> = {
      requestNo: 'BR-2026051501',
      requester: 'สมชาย ใจดี',
      department: 'ฝ่ายวิศวกรรม',
      email: 'somchai.jai@trrgroup.com',
      purpose: 'ใช้สำหรับประชุม Project XYZ กับลูกค้า',
      location: 'สำนักงานใหญ่ ชั้น 5 ห้องประชุม A',
      note: 'ขอยืม 3 วัน จะคืนวันศุกร์',
      notes: 'ขอยืม 3 วัน จะคืนวันศุกร์',
      borrowDate: '15 พฤษภาคม 2569',
      dueDate: '18 พฤษภาคม 2569',
      borrowDays: '3',
      itemsCount: '2',
      handoverNote: 'นำเครื่องมารับที่แผนก IT ชั้น 2',
      condition: 'ปกติ',
      assetCode: 'TRRHQ-NB-1011',
      serialNo: 'HRVYBB4',
      brand: 'Dell',
      model: 'Pro 16 PC16250',
      damageNote: '-',
      accessoriesNote: 'ครบทุกชิ้น',
      returnDate: '18 พฤษภาคม 2569',
      daysOverdue: '2',
      extraDays: '5',
      reason: 'ต้องใช้งานต่อสำหรับทำรายงานสรุปโครงการ',
      oldDueDate: '18 พฤษภาคม 2569',
      newDueDate: '23 พฤษภาคม 2569',
    };

    const statusColors: Record<string, { bg: string; text: string }> = {
      'รอการอนุมัติ': { bg: '#fef3c7', text: '#92400e' },
      'อนุมัติ': { bg: '#d1fae5', text: '#065f46' },
      'ไม่อนุมัติ': { bg: '#fee2e2', text: '#991b1b' },
      'ส่งมอบแล้ว': { bg: '#dbeafe', text: '#1e40af' },
      'คืนแล้ว': { bg: '#dcfce7', text: '#166534' },
    };

    const mockItems = [
      { assetCode: 'TRRHQ-NB-1011', serialNo: 'HRVYBB4', brand: 'Dell', model: 'Pro 16 PC16250', category: 'Notebook', status: 'อนุมัติ' },
      { assetCode: 'TRRHQ-NB-1024', serialNo: '3RFGPC4', brand: 'Dell', model: 'Pro 14 PC14250', category: 'Notebook', status: 'รอการอนุมัติ' }
    ];

    const itemsHtml = mockItems.map((item) => {
      let bgColor = '#f1f5f9';
      let textColor = '#475569';
      if (statusColors[item.status]) {
        bgColor = statusColors[item.status].bg;
        textColor = statusColors[item.status].text;
      }
      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">
            <div style="color: #475569; font-size: 12px; line-height: 1.5;">
              <div><span style="font-weight: 600; color: #1e293b;">ชื่อทรัพย์สิน :</span> ${item.assetCode || 'N/A'}</div>
              <div><span style="font-weight: 600; color: #1e293b;">Serial No :</span> ${item.serialNo || '-'}</div>
              <div><span style="font-weight: 600; color: #1e293b;">ประเภท :</span> ${item.category || '-'}</div>
              <div><span style="font-weight: 600; color: #1e293b;">รุ่น :</span> ${item.model ? item.model + (item.brand ? ' ' + item.brand : '') : (item.brand || '-')}</div>
            </div>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: center;">
            <span style="background: ${bgColor}; color: ${textColor}; padding: 3px 10px; border-radius: 12px; font-weight: 600; font-size: 11px;">${item.status || '-'}</span>
          </td>
        </tr>
      `;
    }).join('');

    const itemsTableHtml = `
      <table class="items-table" style="width: 100%; border-collapse: collapse; margin-top: 8px;">
        <thead>
          <tr>
            <th style="background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 12px; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0;">ทรัพย์สิน</th>
            <th style="background: #f1f5f9; padding: 10px 12px; text-align: center; font-size: 12px; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0;">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    `;

    let body = template.bodyTh;
    let subject = template.subjectTh;

    body = body.replace('{{itemsTable}}', itemsTableHtml);

    const noteHtml = `<div class="note-box" style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px; margin-top: 16px;"><p style="margin: 0; color: #92400e; font-size: 13px;"><b>หมายเหตุ:</b> ขอยืม 3 วัน จะคืนวันศุกร์</p></div>`;
    body = body.replace('{{note}}', noteHtml);
    subject = subject.replace('{{note}}', 'ขอยืม 3 วัน จะคืนวันศุกร์');

    for (const [key, val] of Object.entries(SAMPLE_DATA)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      body = body.replace(regex, val);
      subject = subject.replace(regex, val);
    }

    body = body.replace(/{{\w+}}/g, '-');
    subject = subject.replace(/{{\w+}}/g, '-');

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host, port, secure: false,
      auth: user && pass ? { user, pass } : undefined,
    });

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: `[ทดสอบส่งเทมเพลต] ${subject}`,
      html: body,
      text: body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\n{3,}/g, '\n\n'),
    });

    res.json({ success: true, message: `ส่งอีเมลทดสอบสำหรับเทมเพลต ${template.key} ไปที่ ${to} สำเร็จ` });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'ส่งอีเมลทดสอบไม่สำเร็จ' });
  }
});

// ── Notification Logs ──
router.get('/notification-logs', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const [data, total] = await Promise.all([
      prisma.notificationOutbox.findMany({
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notificationOutbox.count(),
    ]);
    res.json({ data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { next(err); }
});

// ── Backup & Restore ──
router.get('/backup', authenticate, authorize('SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [assets, categories, companies, vendors, locations, statuses, deviceTypes] = await Promise.all([
      prisma.asset.findMany({
        include: {
          category: true, computerDetail: true, phoneDetail: true, monitorDetail: true,
          deviceDetail: true, networkDeviceDetail: true, rackDetail: true, printerDetail: true,
          cableDetail: true, consumableDetail: true,
        }
      }),
      prisma.category.findMany({ include: { types: true } }),
      prisma.company.findMany(),
      prisma.vendor.findMany(),
      prisma.assetLocation.findMany(),
      prisma.assetStatusMaster.findMany(),
      prisma.deviceType.findMany(),
    ]);

    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: { assets, categories, companies, vendors, locations, statuses, deviceTypes }
    };

    res.setHeader('Content-Disposition', `attachment; filename="assethub-backup-${new Date().toISOString().split('T')[0]}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(backup);
  } catch (err) { next(err); }
});

const uploadBackup = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

router.post('/restore', authenticate, authorize('SUPERADMIN'), uploadBackup.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('ไม่พบไฟล์ที่อัปโหลด', 400);
    const content = req.file.buffer.toString('utf-8');
    const backup = JSON.parse(content);
    if (!backup.version || !backup.data) throw new AppError('รูปแบบไฟล์ Backup ไม่ถูกต้อง', 400);

    const { assets, categories, companies, vendors, locations, statuses, deviceTypes } = backup.data;

    const result = await prisma.$transaction(async (tx) => {
      let imported = 0; let skipped = 0;

      // 1. Import reference data
      if (Array.isArray(categories)) {
        for (const cat of categories) {
          await tx.category.upsert({
            where: { id: cat.id ?? 0 }, create: { id: cat.id, name: cat.name, description: cat.description, icon: cat.icon || '📦' },
            update: { name: cat.name, description: cat.description, icon: cat.icon || '📦' },
          });
          if (cat.types && Array.isArray(cat.types)) {
            for (const t of cat.types) {
              await tx.categoryType.upsert({
                where: { id: t.id ?? 0 }, create: { id: t.id, name: t.name, categoryId: cat.id },
                update: { name: t.name },
              });
            }
          }
        }
      }
      if (Array.isArray(companies)) {
        for (const c of companies) {
          await tx.company.upsert({ where: { id: c.id ?? 0 }, create: c, update: c });
        }
      }
      if (Array.isArray(vendors)) {
        for (const v of vendors) {
          await tx.vendor.upsert({ where: { id: v.id ?? 0 }, create: v, update: v });
        }
      }
      if (Array.isArray(locations)) {
        for (const loc of locations) {
          await tx.assetLocation.upsert({ where: { id: loc.id ?? 0 }, create: loc, update: loc });
        }
      }
      if (Array.isArray(statuses)) {
        for (const st of statuses) {
          await tx.assetStatusMaster.upsert({ where: { id: st.id ?? 0 }, create: st, update: st });
        }
      }
      if (Array.isArray(deviceTypes)) {
        for (const dt of deviceTypes) {
          await tx.deviceType.upsert({ where: { id: dt.id ?? 0 }, create: dt, update: dt });
        }
      }

      // 2. Import assets (skip if assetCode already exists)
      if (Array.isArray(assets)) {
        for (const a of assets) {
          const existing = a.assetCode ? await tx.asset.findUnique({ where: { assetCode: a.assetCode } }) : null;
          if (existing) { skipped++; continue; }

          const { computerDetail, phoneDetail, monitorDetail, deviceDetail, networkDeviceDetail, rackDetail, printerDetail, cableDetail, consumableDetail, category, ...assetData } = a;
          const created = await tx.asset.create({ data: assetData });

          // Restore detail records
          if (computerDetail) {
            const { id, assetId, ...detail } = computerDetail;
            await tx.computerDetail.create({ data: { ...detail, assetId: created.id } });
          }
          if (phoneDetail) {
            const { id, assetId, ...detail } = phoneDetail;
            await tx.phoneDetail.create({ data: { ...detail, assetId: created.id } });
          }
          if (monitorDetail) {
            const { id, assetId, ...detail } = monitorDetail;
            await tx.monitorDetail.create({ data: { ...detail, assetId: created.id } });
          }
          if (deviceDetail) {
            const { id, assetId, ...detail } = deviceDetail;
            await tx.deviceDetail.create({ data: { ...detail, assetId: created.id } });
          }
          if (networkDeviceDetail) {
            const { id, assetId, ...detail } = networkDeviceDetail;
            await tx.networkDeviceDetail.create({ data: { ...detail, assetId: created.id } });
          }
          if (rackDetail) {
            const { id, assetId, ...detail } = rackDetail;
            await tx.rackDetail.create({ data: { ...detail, assetId: created.id } });
          }
          if (printerDetail) {
            const { id, assetId, ...detail } = printerDetail;
            await tx.printerDetail.create({ data: { ...detail, assetId: created.id } });
          }
          if (cableDetail) {
            const { id, assetId, ...detail } = cableDetail;
            await tx.cableDetail.create({ data: { ...detail, assetId: created.id } });
          }
          if (consumableDetail) {
            const { id, assetId, ...detail } = consumableDetail;
            await tx.consumableDetail.create({ data: { ...detail, assetId: created.id } });
          }
          imported++;
        }
      }
      return { imported, skipped };
    });

    res.json({ message: `กู้คืนข้อมูลสำเร็จ: นำเข้า ${result.imported} รายการ, ข้าม ${result.skipped} รายการ (มีรหัสซ้ำ)` });
  } catch (err) { next(err); }
});

// ── Clear All Assets ──
router.post('/clear-all-assets', authenticate, authorize('SUPERADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete PM run answers and PM runs
      await tx.pMRunAnswer.deleteMany();
      await tx.pMRun.deleteMany();

      // 2. Delete asset history
      await tx.assetHistory.deleteMany();

      // 3. Nullify assetId in BorrowRequestItem (optional FK)
      await tx.borrowRequestItem.updateMany({ data: { assetId: null } });

      // 4. Clean up related records without cascade constraints
      await tx.maintenancePart.deleteMany();
      await tx.maintenanceImage.deleteMany();
      await tx.maintenanceRecord.deleteMany();
      await tx.donationItem.deleteMany();

      // 5. Delete all assets (cascades to computerDetail, phoneDetail, etc.)
      const count = await tx.asset.deleteMany();

      return count;
    });

    res.json({ message: `ล้างข้อมูลทะเบียนทรัพย์สินทั้งหมด ${result.count} รายการเรียบร้อย` });
  } catch (err) { next(err); }
});
// ── Advanced Clear Data ──
router.post('/advanced-clear-data', authenticate, authorize('SUPERADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clearAssets, clearBorrow, clearDonations, clearMasterData, clearUsers } = req.body;
    
    await prisma.$transaction(async (tx) => {
      // 1. Borrow Records (Dependent on Assets, Users)
      if (clearBorrow) {
        await tx.borrowRequestItem.deleteMany();
        await tx.checkout.deleteMany();
        await tx.return.deleteMany();
        await tx.borrowApproval.deleteMany();
        await tx.borrowExtension.deleteMany();
        await tx.borrowRequest.deleteMany();
      } else if (clearAssets) {
        // If we clear assets but keep borrows, we must nullify the assetId
        await tx.borrowRequestItem.updateMany({ data: { assetId: null } });
      }

      // 2. Donations
      if (clearDonations) {
        await tx.donationItem.deleteMany();
        await tx.donationImage.deleteMany();
        await tx.donation.deleteMany();
      } else if (clearAssets) {
        await tx.donationItem.deleteMany();
      }

      // 3. Assets & Maintenance
      if (clearAssets) {
        await tx.pMRunAnswer.deleteMany();
        await tx.pMRun.deleteMany();
        await tx.assetHistory.deleteMany();
        await tx.maintenancePart.deleteMany();
        await tx.maintenanceImage.deleteMany();
        await tx.maintenanceRecord.deleteMany();
        await tx.asset.deleteMany();
      }

      // 4. Master Data
      if (clearMasterData) {
        // Clear relations first
        await tx.assetStatusMaster.deleteMany();
        await tx.inventoryTransaction.deleteMany();
        await tx.inventoryItem.deleteMany();
        
        await tx.assetLocation.deleteMany();
        await tx.company.deleteMany();
        await tx.vendor.deleteMany();
        await tx.deviceType.deleteMany();
        
        // Category relations
        await tx.categoryType.deleteMany();
        await tx.category.deleteMany();
      }

      // 5. Users
      if (clearUsers) {
        const currentUserId = req.user!.userId;
        await tx.appUser.deleteMany({
          where: { id: { not: currentUserId } }
        });
      }
    });

    res.json({ message: 'ล้างข้อมูลที่เลือกเรียบร้อยแล้ว' });
  } catch (err) { next(err); }
});

export default router;
