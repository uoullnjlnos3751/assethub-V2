-- ============================================================
-- IT ASSET MANAGEMENT SYSTEM - DATABASE SCHEMA
-- AssetHub v2.0 - Enhanced with AD, GLPI, Multi-Notifications
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: users
-- Synced from LDAP/AD or created locally
-- ============================================================
CREATE TABLE users (
  id                  SERIAL PRIMARY KEY,
  email               VARCHAR(255) UNIQUE NOT NULL,
  password_hash       VARCHAR(255),               -- NULL if AD-only user
  name                VARCHAR(255) NOT NULL,
  role                VARCHAR(50) NOT NULL DEFAULT 'user'
                        CHECK (role IN ('user','manager','admin','superadmin')),
  department          VARCHAR(255),
  company             VARCHAR(255) DEFAULT 'TRRT',
  phone               VARCHAR(50),

  -- Permissions (granular)
  can_approve         BOOLEAN DEFAULT false,
  can_manage_assets   BOOLEAN DEFAULT false,
  can_manage_users    BOOLEAN DEFAULT false,
  can_manage_config   BOOLEAN DEFAULT false,

  -- LDAP / AD info
  ad_username         VARCHAR(255) UNIQUE,        -- sAMAccountName
  ad_display_name     VARCHAR(255),
  ad_department       VARCHAR(255),
  ad_title            VARCHAR(255),
  ad_groups           TEXT[],                     -- AD group memberships
  synced_from_ldap    BOOLEAN DEFAULT false,
  ldap_synced_at      TIMESTAMP,

  -- Notification
  telegram_user_id    VARCHAR(255),
  teams_email         VARCHAR(255),

  -- Status
  is_active           BOOLEAN DEFAULT true,
  last_login          TIMESTAMP,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: assets
-- Synced from GLPI or created manually
-- ============================================================
CREATE TABLE assets (
  id                  SERIAL PRIMARY KEY,
  asset_code          VARCHAR(100) UNIQUE NOT NULL,
  asset_name          VARCHAR(255) NOT NULL,
  category            VARCHAR(100),
  brand               VARCHAR(100),
  model               VARCHAR(100),
  serial_number       VARCHAR(255),
  location            VARCHAR(255),
  status              VARCHAR(50) NOT NULL DEFAULT 'available'
                        CHECK (status IN ('available','borrowed','pending','maintenance','retired')),
  condition           VARCHAR(50) DEFAULT 'good'
                        CHECK (condition IN ('excellent','good','fair','poor')),
  price               DECIMAL(10,2),
  purchase_date       DATE,
  warranty_date       DATE,
  notes               TEXT,
  image_url           VARCHAR(500),

  -- Stats
  borrow_count        INT DEFAULT 0,
  average_rating      DECIMAL(3,2) DEFAULT 0,
  current_owner_id    INT REFERENCES users(id),

  -- GLPI sync info
  glpi_id             INT UNIQUE,
  glpi_status         INT,                        -- raw GLPI status number
  glpi_category       VARCHAR(100),               -- raw GLPI category
  synced_from_glpi    BOOLEAN DEFAULT false,
  glpi_synced_at      TIMESTAMP,

  -- Status
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: loans
-- Core borrow/return tracking
-- ============================================================
CREATE TABLE loans (
  id                  SERIAL PRIMARY KEY,
  loan_code           VARCHAR(50) UNIQUE NOT NULL,
  asset_id            INT NOT NULL REFERENCES assets(id),
  user_id             INT NOT NULL REFERENCES users(id),

  borrow_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date            DATE NOT NULL,
  return_date         DATE,

  purpose             TEXT,
  condition_rating    INT CHECK (condition_rating BETWEEN 1 AND 5),
  return_notes        TEXT,

  status              VARCHAR(50) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','borrowed','returned','rejected','cancelled')),

  -- Extension tracking
  extend_count        INT DEFAULT 0,
  max_extends         INT DEFAULT 2,
  extend_days         INT DEFAULT 7,
  extend_reason       TEXT,

  -- Approval
  approved_by         INT REFERENCES users(id),
  approved_at         TIMESTAMP,
  rejected_reason     TEXT,

  -- Overdue
  is_overdue          BOOLEAN DEFAULT false,
  overdue_notified_at TIMESTAMP,

  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: approvals
-- Tracks approval actions on loans
-- ============================================================
CREATE TABLE approvals (
  id          SERIAL PRIMARY KEY,
  loan_id     INT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  approver_id INT NOT NULL REFERENCES users(id),
  action      VARCHAR(50) NOT NULL
                CHECK (action IN ('approve_borrow','reject_borrow',
                                  'approve_extend','reject_extend',
                                  'approve_return','reject_return')),
  status      VARCHAR(50) NOT NULL
                CHECK (status IN ('approved','rejected')),
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: configurations
-- Admin-managed settings for all integrations
-- ============================================================
CREATE TABLE configurations (
  id                SERIAL PRIMARY KEY,
  config_key        VARCHAR(255) UNIQUE NOT NULL,
  config_type       VARCHAR(50) NOT NULL
                      CHECK (config_type IN ('system','ldap','glpi',
                                             'email','telegram','msteams')),
  config_value      TEXT,                         -- encrypted if sensitive
  config_json       JSONB,                        -- for complex configs
  is_encrypted      BOOLEAN DEFAULT false,
  is_sensitive      BOOLEAN DEFAULT false,
  description       TEXT,
  last_modified_by  INT REFERENCES users(id),
  last_modified_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: user_notification_preferences
-- Per-user notification channel preferences
-- ============================================================
CREATE TABLE user_notification_preferences (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_enabled   BOOLEAN DEFAULT true,
  telegram_enabled BOOLEAN DEFAULT false,
  teams_enabled   BOOLEAN DEFAULT false,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: notification_queue
-- Queue for async multi-channel notifications
-- ============================================================
CREATE TABLE notification_queue (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id),
  loan_id         INT REFERENCES loans(id),
  channel         VARCHAR(50) NOT NULL
                    CHECK (channel IN ('email','telegram','teams')),
  event_type      VARCHAR(100) NOT NULL,
  subject         VARCHAR(500),
  body            TEXT,
  variables       JSONB,
  status          VARCHAR(50) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','sent','failed','skipped')),
  retry_count     INT DEFAULT 0,
  max_retries     INT DEFAULT 3,
  last_error      TEXT,
  scheduled_for   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at         TIMESTAMP,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: ldap_sync_logs
-- Tracks every LDAP sync run
-- ============================================================
CREATE TABLE ldap_sync_logs (
  id                    SERIAL PRIMARY KEY,
  sync_start_time       TIMESTAMP NOT NULL,
  sync_end_time         TIMESTAMP,
  status                VARCHAR(50) CHECK (status IN ('running','success','partial','failed')),
  total_users_found     INT DEFAULT 0,
  total_users_created   INT DEFAULT 0,
  total_users_updated   INT DEFAULT 0,
  total_users_disabled  INT DEFAULT 0,
  error_message         TEXT,
  triggered_by          INT REFERENCES users(id),  -- NULL = cron
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: glpi_sync_logs
-- Tracks every GLPI sync run
-- ============================================================
CREATE TABLE glpi_sync_logs (
  id                      SERIAL PRIMARY KEY,
  sync_start_time         TIMESTAMP NOT NULL,
  sync_end_time           TIMESTAMP,
  status                  VARCHAR(50) CHECK (status IN ('running','success','partial','failed')),
  total_assets_found      INT DEFAULT 0,
  total_assets_created    INT DEFAULT 0,
  total_assets_updated    INT DEFAULT 0,
  total_assets_retired    INT DEFAULT 0,
  error_message           TEXT,
  triggered_by            INT REFERENCES users(id),  -- NULL = cron
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: audit_logs
-- Complete audit trail of every action
-- ============================================================
CREATE TABLE audit_logs (
  id              SERIAL PRIMARY KEY,
  user_id         INT REFERENCES users(id),
  action          VARCHAR(100) NOT NULL,
  resource_type   VARCHAR(100),
  resource_id     INT,
  old_values      JSONB,
  new_values      JSONB,
  description     TEXT,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_email           ON users(email);
CREATE INDEX idx_users_ad_username     ON users(ad_username);
CREATE INDEX idx_users_role            ON users(role);
CREATE INDEX idx_users_is_active       ON users(is_active);

CREATE INDEX idx_assets_status         ON assets(status);
CREATE INDEX idx_assets_category       ON assets(category);
CREATE INDEX idx_assets_glpi_id        ON assets(glpi_id);
CREATE INDEX idx_assets_is_active      ON assets(is_active);

CREATE INDEX idx_loans_user_id         ON loans(user_id);
CREATE INDEX idx_loans_asset_id        ON loans(asset_id);
CREATE INDEX idx_loans_status          ON loans(status);
CREATE INDEX idx_loans_due_date        ON loans(due_date);
CREATE INDEX idx_loans_is_overdue      ON loans(is_overdue);

CREATE INDEX idx_notif_queue_status    ON notification_queue(status);
CREATE INDEX idx_notif_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX idx_notif_queue_user      ON notification_queue(user_id);

CREATE INDEX idx_audit_user_id         ON audit_logs(user_id);
CREATE INDEX idx_audit_action          ON audit_logs(action);
CREATE INDEX idx_audit_created_at      ON audit_logs(created_at);

CREATE INDEX idx_config_type           ON configurations(config_type);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_loans_updated_at
  BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER: auto-update asset status on loan changes
-- ============================================================
CREATE OR REPLACE FUNCTION sync_asset_status_from_loan()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    UPDATE assets SET status = 'borrowed', current_owner_id = NEW.user_id
    WHERE id = NEW.asset_id;

  ELSIF NEW.status = 'pending' AND OLD.status IS DISTINCT FROM 'pending' THEN
    UPDATE assets SET status = 'pending'
    WHERE id = NEW.asset_id;

  ELSIF NEW.status IN ('returned','rejected','cancelled') THEN
    UPDATE assets
    SET status = 'available',
        current_owner_id = NULL,
        borrow_count = CASE WHEN NEW.status = 'returned'
                            THEN borrow_count + 1 ELSE borrow_count END
    WHERE id = NEW.asset_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_loan_sync_asset_status
  AFTER UPDATE OF status ON loans
  FOR EACH ROW EXECUTE FUNCTION sync_asset_status_from_loan();

-- ============================================================
-- VIEWS
-- ============================================================

-- Active loans with full detail
CREATE VIEW v_active_loans AS
SELECT
  l.id,
  l.loan_code,
  l.status,
  l.borrow_date,
  l.due_date,
  l.return_date,
  l.is_overdue,
  l.extend_count,
  (l.due_date - CURRENT_DATE) AS days_remaining,
  u.id   AS user_id,
  u.name AS user_name,
  u.email AS user_email,
  u.department,
  u.telegram_user_id,
  a.id   AS asset_id,
  a.asset_code,
  a.asset_name,
  a.category,
  a.location
FROM loans l
JOIN users u ON l.user_id = u.id
JOIN assets a ON l.asset_id = a.id
WHERE l.status IN ('pending','approved','borrowed');

-- Asset availability summary
CREATE VIEW v_asset_summary AS
SELECT
  COUNT(*) FILTER (WHERE is_active = true)               AS total_active,
  COUNT(*) FILTER (WHERE status = 'available')           AS available,
  COUNT(*) FILTER (WHERE status = 'borrowed')            AS borrowed,
  COUNT(*) FILTER (WHERE status = 'pending')             AS pending,
  COUNT(*) FILTER (WHERE status = 'maintenance')         AS maintenance
FROM assets;

-- Dashboard summary per user
CREATE VIEW v_user_loan_summary AS
SELECT
  u.id,
  u.name,
  COUNT(*) FILTER (WHERE l.status = 'borrowed')  AS active_loans,
  COUNT(*) FILTER (WHERE l.is_overdue = true)    AS overdue_loans,
  COUNT(*) FILTER (WHERE l.status = 'pending')   AS pending_requests
FROM users u
LEFT JOIN loans l ON l.user_id = u.id
GROUP BY u.id, u.name;

-- Integration status check
CREATE VIEW v_integration_status AS
SELECT config_type, config_key,
  CASE WHEN is_sensitive THEN '(hidden)' ELSE config_value END AS config_display,
  last_modified_at
FROM configurations
ORDER BY config_type, config_key;

-- ============================================================
-- SEED DATA: Default System Configurations
-- ============================================================
INSERT INTO configurations (config_key, config_type, config_value, config_json, is_encrypted, is_sensitive, description) VALUES

-- System
('system_company_name',      'system', 'TRRT',         NULL, false, false, 'Company display name'),
('system_app_name',          'system', 'AssetHub',     NULL, false, false, 'Application name'),
('system_loan_days',         'system', '14',           NULL, false, false, 'Default loan duration (days)'),
('system_max_extends',       'system', '2',            NULL, false, false, 'Max loan extensions'),
('system_extend_days',       'system', '7',            NULL, false, false, 'Days per extension'),
('system_due_reminder_days', 'system', '3',            NULL, false, false, 'Days before due to send reminder'),
('system_timezone',          'system', 'Asia/Bangkok', NULL, false, false, 'System timezone'),

-- LDAP defaults (values will be updated from .env on boot)
('ldap_enabled',        'ldap', 'true',                         NULL, false, false, 'Enable LDAP authentication'),
('ldap_host',           'ldap', 'SRV-ADDS-02.trrgroup.com',    NULL, false, false, 'LDAP server host'),
('ldap_port',           'ldap', '389',                          NULL, false, false, 'LDAP server port'),
('ldap_base_dn',        'ldap', 'dc=trrgroup,dc=com',          NULL, false, false, 'LDAP base DN'),
('ldap_domain',         'ldap', 'trrgroup',                    NULL, false, false, 'LDAP domain'),
('ldap_search_user',    'ldap', 'watchara.kid',                NULL, false, false, 'LDAP search user'),
('ldap_search_password','ldap', '',                             NULL, true,  true,  'LDAP search password (encrypted)'),
('ldap_sync_interval',  'ldap', '60',                          NULL, false, false, 'Sync interval in minutes'),
('ldap_role_mapping',   'ldap', NULL, '{"admin":"IT-Admins","manager":"IT-Managers","user":"All-Employees"}',
                                                                      false, false, 'AD group to role mapping'),

-- GLPI defaults
('glpi_enabled',         'glpi', 'true',                                      NULL, false, false, 'Enable GLPI integration'),
('glpi_api_url',         'glpi', 'http://10.100.77.229/glpi/apirest.php',    NULL, false, false, 'GLPI API URL'),
('glpi_user_token',      'glpi', '',                                          NULL, true,  true,  'GLPI user token (encrypted)'),
('glpi_app_token',       'glpi', '',                                          NULL, true,  true,  'GLPI app token (encrypted)'),
('glpi_sync_interval',   'glpi', '30',                                        NULL, false, false, 'Sync interval in minutes'),
('glpi_status_mapping',  'glpi', NULL,
  '{"1":"available","2":"borrowed","3":"pending","4":"maintenance"}',
                                                                                     false, false, 'GLPI status to local status mapping'),
('glpi_category_mapping','glpi', NULL,
  '{"Computer":"Notebook","Monitor":"Monitor","Peripheral":"Other","Network":"Cable","Phone":"Other"}',
                                                                                     false, false, 'GLPI category mapping'),

-- Email defaults
('email_enabled',   'email', 'true',                               NULL, false, false, 'Enable email notifications'),
('smtp_host',       'email', 'smtp.office365.com',                 NULL, false, false, 'SMTP host'),
('smtp_port',       'email', '587',                                NULL, false, false, 'SMTP port'),
('smtp_secure',     'email', 'false',                              NULL, false, false, 'SMTP TLS (false=STARTTLS)'),
('smtp_user',       'email', 'automail.trrt@trrgroup.com',         NULL, false, false, 'SMTP username'),
('smtp_password',   'email', '',                                    NULL, true,  true,  'SMTP password (encrypted)'),
('smtp_from',       'email', '"AssetITSM TRRT" <automail.trrt@trrgroup.com>', NULL, false, false, 'From address'),

-- Telegram defaults
('telegram_enabled',   'telegram', 'false', NULL, false, false, 'Enable Telegram notifications'),
('telegram_bot_token', 'telegram', '',       NULL, true,  true,  'Telegram bot token (encrypted)'),

-- MS Teams defaults
('teams_enabled',              'msteams', 'false', NULL, false, false, 'Enable MS Teams notifications'),
('teams_webhook_general',      'msteams', '',       NULL, true,  true,  'General webhook URL'),
('teams_webhook_alerts',       'msteams', '',       NULL, true,  true,  'Alerts webhook URL'),
('teams_webhook_approvals',    'msteams', '',       NULL, true,  true,  'Approvals webhook URL');

-- ============================================================
-- SEED DATA: Default SuperAdmin (local fallback)
-- password: Admin@TRRT2024  (bcrypt hash)
-- ============================================================
INSERT INTO users (
  email, password_hash, name, role,
  department, company,
  can_approve, can_manage_assets, can_manage_users, can_manage_config,
  is_active
) VALUES (
  'admin@trrgroup.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAEzEqEFKl/A0BHa',
  'System Administrator',
  'superadmin',
  'IT Department',
  'TRRT',
  true, true, true, true,
  true
);

-- ============================================================
-- SEED DATA: Sample Assets (for dev/testing)
-- ============================================================
INSERT INTO assets (asset_code, asset_name, category, brand, model, location, status, price)
VALUES
  ('NB-0001', 'Dell Latitude 3540',     'Notebook', 'Dell',    'Latitude 3540', 'IT Room',      'available', 28500),
  ('NB-0002', 'Dell Latitude 3540',     'Notebook', 'Dell',    'Latitude 3540', 'IT Room',      'available', 28500),
  ('MN-0001', 'Dell Monitor 24"',       'Monitor',  'Dell',    'P2422H',        'IT Room',      'available', 7800),
  ('PJ-0001', 'Epson EB-X41 Projector', 'Projector','Epson',   'EB-X41',        'Meeting Room', 'available', 22000),
  ('CB-0001', 'HDMI Cable 5M',          'Cable',    'Generic', 'HDMI-5M',       'IT Room',      'available', 350),
  ('CB-0002', 'LAN Cable Cat6 10M',     'Cable',    'Generic', 'CAT6-10M',      'IT Room',      'available', 220);

-- ============================================================
-- Function: generate loan code
-- ============================================================
CREATE OR REPLACE FUNCTION generate_loan_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  seq_val  INT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_val FROM loans;
  new_code := 'LN-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(seq_val::TEXT, 4, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;
