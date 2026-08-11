export interface SystemSettings {
  systemName?: string;
  organizationName?: string;
  logoUrl?: string;
  timezone?: string;
  showWelcomeBanner?: boolean;
  borrowDays?: string | number;
  maxBorrowDays?: string | number;
  maxItemsPerRequest?: string | number;
  allowExtension?: boolean;
  maxExtensionsPerRequest?: string | number;
  overdueWarningDays?: string | number;
  enableEmail?: boolean;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;
  emailCc?: string;
  enableTeams?: boolean;
  teamsWebhookUrl?: string;
  enabledEventKeys?: string;
  requireStrongPassword?: boolean;
  passwordExpiryDays?: string | number;
  sessionTimeoutHours?: string | number;
  enableLine?: boolean;
  lineChannelAccessToken?: string;
  lineWebhookUrl?: string;
  lineWebhookVerifyToken?: string;
  lineSendMode?: string;
  lineUserIds?: string;
  lineEnabledStatuses?: string;
}

export interface NotificationTemplate {
  id: number;
  key: string;
  channel: string;
  subjectTh: string;
  bodyTh: string;
  subjectEn?: string;
  bodyEn?: string;
}

export interface HealthCheckResult {
  server?: { status: string; timestamp?: string };
  database?: { status: string; message?: string; latency?: number };
  ldap?: { status: string; message?: string; latency?: number };
  smtp?: { status: string; message?: string; latency?: number };
}

export interface NotificationLog {
  id: number;
  channel: string;
  eventType: string;
  status: string;
  recipient?: string;
  lastError?: string;
  createdAt: string;
}
