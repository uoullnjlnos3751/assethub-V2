import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Switch, FormControlLabel,
  Button, Alert, CircularProgress, Divider, Stack, Chip, Paper, Tabs, Tab,
  Select, MenuItem, InputLabel, FormControl, useTheme, alpha,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import {
  Settings, Globe, Clock, Database, Shield, Server, Smartphone, Mail, Save,
  Bell, Download, Upload, Trash2, Search, RefreshCw, Building2, Image,
  MessageSquare, AlertTriangle
} from 'lucide-react';
import { adminAPI, assetAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { StatBox, StatusRow } from './settings/SharedComponents';
import SystemSettingsTab from './SystemSettingsTab';
import EmailTemplateEditor from './settings/EmailTemplateEditor';
import type { SystemSettings, NotificationTemplate, HealthCheckResult, NotificationLog } from './settings/types';

const TAB_GROUPS = [
  {
    label: 'ระบบและทั่วไป', icon: <Globe size={20} />,
    items: [
      { index: 0, label: 'ทั่วไป', icon: <Globe size={16} /> },
      { index: 1, label: 'กฎการยืม', icon: <Clock size={16} /> },
    ]
  },
  {
    label: 'การติดต่อสื่อสาร', icon: <Bell size={20} />,
    items: [
      { index: 2, label: 'LINE แจ้งเตือน', icon: <Smartphone size={16} /> },
      { index: 3, label: 'Templates อีเมล', icon: <Mail size={16} /> },
    ]
  },
  {
    label: 'ความปลอดภัยและระบบ', icon: <Shield size={20} />,
    items: [
      { index: 4, label: 'ความปลอดภัย', icon: <Shield size={16} /> },
      { index: 5, label: 'ระบบ / Health', icon: <Server size={16} /> },
      { index: 6, label: 'จัดการข้อมูล', icon: <Database size={16} /> },
    ]
  },
  {
    label: 'ตั้งค่าการทำงาน (PM)', icon: <Settings size={20} />,
    items: [
      { index: 7, label: 'การสร้างรหัสทรัพย์สิน', icon: <Building2 size={16} /> },
    ]
  }
];

export default function SettingsPage() {
  const toast = useToast();
  const { refreshSettings } = useAuth();
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [orig, setOrig] = useState<SystemSettings | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [pingResult, setPingResult] = useState<HealthCheckResult | null>(null);
  const [pingLoading, setPingLoading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [clearing, setClearing] = useState(false);
  const [assetList, setAssetList] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [assetListLoading, setAssetListLoading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [deviceTypes, setDeviceTypes] = useState<any[]>([]);

  const borrowDays = parseInt(String(settings?.borrowDays || '3'), 10);

  const fetchLogs = () => {
    setLogLoading(true);
    adminAPI.notificationLogs({ page: 1, limit: 30 })
      .then(r => { setLogs(r.data.data || []); })
      .catch(() => {})
      .finally(() => setLogLoading(false));
  };

  const fetchPing = () => {
    setPingLoading(true);
    adminAPI.ping()
      .then(r => setPingResult(r.data))
      .catch(() => toast.error('ไม่สามารถตรวจสอบสถานะระบบได้'))
      .finally(() => setPingLoading(false));
  };

  const fetchAssetList = (search?: string) => {
    setAssetListLoading(true);
    assetAPI.list({ limit: 500, ...(search && { search }) })
      .then(r => setAssetList(r.data.data || []))
      .catch(() => toast.error('ไม่สามารถโหลดรายการทรัพย์สินได้'))
      .finally(() => setAssetListLoading(false));
  };

  useEffect(() => {
    Promise.all([adminAPI.settings(), adminAPI.notificationTemplates()])
      .then(([s, t]) => { setSettings(s.data || {}); setOrig(s.data || {}); setTemplates(t.data || []); })
      .catch(() => toast.error('ไม่สามารถโหลดการตั้งค่าได้'))
      .finally(() => setLoading(false));
    fetchLogs();
  }, []);

  useEffect(() => {
    if (tab === 5) fetchPing();
    if (tab === 6) { fetchAssetList(); assetAPI.deviceTypes().then(r => setDeviceTypes(r.data || [])).catch(() => {}); }
  }, [tab]);

  const isDirty = () => settings && orig && JSON.stringify(settings) !== JSON.stringify(orig);

  const handleSave = async () => {
    setSaving(true);
    try {
      const d = {
        systemName: settings?.systemName || 'IT Asset Management (ITAM)',
        organizationName: settings?.organizationName || 'TRR Group',
        logoUrl: settings?.logoUrl || '',
        timezone: settings?.timezone || 'Asia/Bangkok',
        showWelcomeBanner: settings?.showWelcomeBanner ?? true,
        borrowDays: parseInt(String(settings?.borrowDays || '3'), 10),
        maxBorrowDays: parseInt(String(settings?.maxBorrowDays || '30'), 10),
        maxItemsPerRequest: parseInt(String(settings?.maxItemsPerRequest || '5'), 10),
        allowExtension: settings?.allowExtension ?? true,
        maxExtensionsPerRequest: parseInt(String(settings?.maxExtensionsPerRequest || '2'), 10),
        overdueWarningDays: parseInt(String(settings?.overdueWarningDays || '3'), 10),
        enableEmail: settings?.enableEmail ?? true,
        smtpHost: settings?.smtpHost || '',
        smtpPort: settings?.smtpPort || '587',
        smtpUser: settings?.smtpUser || '',
        smtpPass: settings?.smtpPass || '',
        smtpFromEmail: settings?.smtpFromEmail || '',
        smtpFromName: settings?.smtpFromName || '',
        emailCc: settings?.emailCc || '',
        enableTeams: settings?.enableTeams ?? false,
        teamsWebhookUrl: settings?.teamsWebhookUrl || '',
        enabledEventKeys: settings?.enabledEventKeys || '',
        requireStrongPassword: settings?.requireStrongPassword ?? true,
        passwordExpiryDays: parseInt(String(settings?.passwordExpiryDays || '90'), 10),
        sessionTimeoutHours: parseInt(String(settings?.sessionTimeoutHours || '8'), 10),
        enableLine: settings?.enableLine ?? false,
        lineChannelAccessToken: settings?.lineChannelAccessToken || '',
        lineWebhookUrl: settings?.lineWebhookUrl || '',
        lineWebhookVerifyToken: settings?.lineWebhookVerifyToken || '',
        lineSendMode: settings?.lineSendMode || 'broadcast',
        lineUserIds: settings?.lineUserIds || '',
        lineEnabledStatuses: settings?.lineEnabledStatuses || '',
      };
      const res = await adminAPI.updateSettings(d);
      setSettings(res.data || d);
      setOrig(res.data || d);
      await refreshSettings();
      toast.success('บันทึกการตั้งค่าเรียบร้อย');
    } catch { toast.error('เกิดข้อผิดพลาดในการบันทึก'); }
    finally { setSaving(false); }
  };

  const handleSaveTemplate = async (id: number, data: { subjectTh: string; bodyTh: string }) => {
    try {
      await adminAPI.updateNotificationTemplate(id, data);
      toast.success('อัปเดต Template เรียบร้อย');
      const t = await adminAPI.notificationTemplates();
      setTemplates(t.data || []);
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Settings size={28} />
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>ตั้งค่าระบบ (System Settings)</Typography>
          <Typography variant="body2" color="text.secondary">จัดการการตั้งค่าทั้งหมดของระบบ ITAM</Typography>
        </Box>
      </Box>

      {/* Tab Navigation */}
      <Paper elevation={0} sx={{ borderRadius: 2.5, border: `0.5px solid ${theme.palette.divider}`, mb: 3, p: 1 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' } }}
        >
          {TAB_GROUPS.flatMap(g => g.items).map(item => (
            <Tab key={item.index} icon={item.icon} label={item.label} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      {/* ── Tab Content ── */}
      {tab === 0 && (
        <Box sx={{ maxWidth: 720 }}>
          {/* Identity Card */}
          <Card sx={{ borderRadius: 3, mb: 3, overflow: 'visible' }}>
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                <Building2 size={20} color={theme.palette.primary.main} />
                <Typography variant="subtitle1" fontWeight={700}>ข้อมูลระบบ</Typography>
              </Box>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <TextField label="ชื่อระบบ" fullWidth size="small" value={settings?.systemName || ''} onChange={e => setSettings({ ...settings, systemName: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="ชื่อองค์กร" fullWidth size="small" value={settings?.organizationName || ''} onChange={e => setSettings({ ...settings, organizationName: e.target.value })} />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="URL รูปโลโก้" fullWidth size="small" value={settings?.logoUrl || ''} onChange={e => setSettings({ ...settings, logoUrl: e.target.value })} placeholder="https://example.com/logo.png" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>เขตเวลา</InputLabel>
                    <Select value={settings?.timezone || 'Asia/Bangkok'} label="เขตเวลา" onChange={e => setSettings({ ...settings, timezone: e.target.value })}>
                      <MenuItem value="Asia/Bangkok">Asia/Bangkok (GMT+7)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, height: '100%', pl: 0.5 }}>
                    <Switch checked={settings?.showWelcomeBanner ?? true} onChange={e => setSettings({ ...settings, showWelcomeBanner: e.target.checked })} />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>แบนเนอร์ต้อนรับ</Typography>
                      <Typography variant="caption" color="text.secondary">แสดงข้อความต้อนรับที่หน้าแรก</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, borderBottom: '0.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Image size={18} color={theme.palette.primary.main} />
              <Typography variant="subtitle2" fontWeight={700}>ตัวอย่างหน้าตาระบบ</Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              {/* Mock Browser Frame */}
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', bgcolor: '#fafafa' }}>
                {/* Mock Title Bar */}
                <Box sx={{ px: 2, py: 1, bgcolor: '#f0f0f0', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#eab308' }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#22c55e' }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>IT Asset Management (ITAM)</Typography>
                </Box>
                {/* Mock Navbar */}
                <Box sx={{ px: 3, py: 2, bgcolor: '#fff', borderBottom: '0.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {settings?.logoUrl ? (
                      <img src={settings.logoUrl} alt="logo" style={{ height: 32, maxWidth: 100, objectFit: 'contain' }} onError={e => (e.target as HTMLElement).style.display = 'none'} />
                    ) : (
                      <Box sx={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', color: '#fff', letterSpacing: 1 }}>
                        {(settings?.systemName || 'IT').substring(0, 2).toUpperCase()}
                      </Box>
                    )}
                    <Box>
                      <Typography noWrap sx={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.2 }}>{settings?.systemName || 'IT Asset Management (ITAM)'}</Typography>
                      <Typography noWrap sx={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.2 }}>{settings?.organizationName || 'ระบบจัดการทรัพย์สิน IT'}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22c55e' }} />
                    <Typography variant="caption" color="text.secondary">ออนไลน์</Typography>
                  </Box>
                </Box>
                {/* Welcome Banner */}
                {settings?.showWelcomeBanner && (
                  <Box sx={{ px: 3, py: 2.5, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff' }}>
                    <Typography variant="body2" fontWeight={700}>ยินดีต้อนรับสู่ {settings?.systemName || 'IT Asset Management (ITAM)'}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.85 }}>ระบบจัดการทรัพย์สินและครุภัณฑ์ IT</Typography>
                  </Box>
                )}
                {/* Mock Content */}
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    {[80, 60, 90].map((w, i) => (
                      <Box key={i} sx={{ flex: 1, h: 60, p: 1.5, bgcolor: '#fff', border: '0.5px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                        <Box sx={{ width: '60%', height: 8, bgcolor: '#e5e7eb', borderRadius: 1, mb: 1 }} />
                        <Box sx={{ width: '80%', height: 16, bgcolor: '#e5e7eb', borderRadius: 1 }} />
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ width: '100%', height: 8, bgcolor: '#e5e7eb', borderRadius: 1, mb: 1 }} />
                  <Box sx={{ width: '70%', height: 8, bgcolor: '#e5e7eb', borderRadius: 1 }} />
                </Box>
              </Box>
            </Box>
          </Card>
        </Box>
      )}

      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>ระยะเวลาการยืม</Typography>
                <TextField label="วันยืมมาตรฐาน (วัน)" type="number" fullWidth size="small" value={borrowDays} onChange={e => setSettings({ ...settings, borrowDays: e.target.value })} inputProps={{ min: 1 }} sx={{ mb: 2 }} />
                <TextField label="จำนวนวันยืมสูงสุด (วัน)" type="number" fullWidth size="small" value={settings?.maxBorrowDays || 30} onChange={e => setSettings({ ...settings, maxBorrowDays: e.target.value })} inputProps={{ min: 1 }} sx={{ mb: 2 }} />
                <TextField label="ระยะเวลาเตือนก่อนเกินกำหนด (วัน)" type="number" fullWidth size="small" value={settings?.overdueWarningDays || 3} onChange={e => setSettings({ ...settings, overdueWarningDays: e.target.value })} inputProps={{ min: 1 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>ข้อจำกัด</Typography>
                <TextField label="จำนวนรายการสูงสุดต่อคำขอ" type="number" fullWidth size="small" value={settings?.maxItemsPerRequest || 5} onChange={e => setSettings({ ...settings, maxItemsPerRequest: e.target.value })} inputProps={{ min: 1, max: 20 }} sx={{ mb: 2 }} />
                <FormControlLabel control={<Switch checked={settings?.allowExtension ?? true} onChange={e => setSettings({ ...settings, allowExtension: e.target.checked })} />} label="อนุญาตให้ขอต่ออายุ (Extension)" sx={{ mb: 1 }} />
                {settings?.allowExtension && (
                  <TextField label="จำนวนครั้งขอต่ออายุสูงสุด" type="number" fullWidth size="small" value={settings?.maxExtensionsPerRequest || 2} onChange={e => setSettings({ ...settings, maxExtensionsPerRequest: e.target.value })} inputProps={{ min: 1, max: 10 }} />
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 2 && (
        <Box>
          <Paper sx={{ background: 'linear-gradient(135deg, #00B900 0%, #009900 100%)', borderRadius: 3, p: 3, mb: 3, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <Smartphone size={28} /> LINE Notification
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>จัดการ LINE Messaging API</Typography>
            </Box>
            <Chip label={settings?.enableLine ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 600, backdropFilter: 'blur(4px)' }} />
          </Paper>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}><StatBox label="ทั้งหมด" value={logs.length} color={theme.palette.primary.main} icon="📊" /></Grid>
            <Grid item xs={6} sm={3}><StatBox label="ส่งสำเร็จ" value={logs.filter((l: any) => l.status === 'SENT').length} color={theme.palette.success.main} icon="✅" /></Grid>
            <Grid item xs={6} sm={3}><StatBox label="ล้มเหลว" value={logs.filter((l: any) => l.status === 'FAILED').length} color={theme.palette.error.main} icon="❌" /></Grid>
            <Grid item xs={6} sm={3}><StatBox label="วันนี้" value={logs.filter((l: any) => new Date(l.createdAt).toDateString() === new Date().toDateString()).length} color={theme.palette.warning.main} icon="📅" /></Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: '0.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Smartphone size={18} color="#00B900" />
                  <Typography variant="subtitle2" fontWeight={700}>ตั้งค่า LINE</Typography>
                </Box>
                <CardContent sx={{ p: 2.5 }}>
                  <FormControlLabel control={<Switch checked={settings?.enableLine ?? false} onChange={e => setSettings({ ...settings, enableLine: e.target.checked })} color="success" />} label="เปิด LINE Notification" sx={{ mb: 2 }} />
                  <TextField label="Channel Access Token" fullWidth size="small" type={settings?.lineChannelAccessToken ? 'password' : 'text'} value={settings?.lineChannelAccessToken || ''} onChange={e => setSettings({ ...settings, lineChannelAccessToken: e.target.value })} sx={{ mb: 2 }} />
                  <TextField label="Webhook URL" fullWidth size="small" value={settings?.lineWebhookUrl || ''} onChange={e => setSettings({ ...settings, lineWebhookUrl: e.target.value })} sx={{ mb: 2 }} />
                  <TextField label="Verify Token" fullWidth size="small" value={settings?.lineWebhookVerifyToken || ''} onChange={e => setSettings({ ...settings, lineWebhookVerifyToken: e.target.value })} sx={{ mb: 2 }} />
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>รูปแบบการส่ง</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip label="📢 Broadcast" variant={settings?.lineSendMode === 'broadcast' ? 'filled' : 'outlined'} color={settings?.lineSendMode === 'broadcast' ? 'success' : 'default'} onClick={() => setSettings({ ...settings, lineSendMode: 'broadcast' })} sx={{ cursor: 'pointer', fontWeight: 600 }} />
                    <Chip label="📨 Push (ระบุ ID)" variant={settings?.lineSendMode === 'push' ? 'filled' : 'outlined'} color={settings?.lineSendMode === 'push' ? 'primary' : 'default'} onClick={() => setSettings({ ...settings, lineSendMode: 'push' })} sx={{ cursor: 'pointer', fontWeight: 600 }} />
                  </Box>
                  {settings?.lineSendMode === 'push' && (
                    <TextField label="User/Group IDs" fullWidth size="small" multiline rows={2} value={settings?.lineUserIds || ''} onChange={e => setSettings({ ...settings, lineUserIds: e.target.value })} />
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: '0.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Mail size={18} color="#e74c3c" />
                  <Typography variant="subtitle2" fontWeight={700}>SMTP Email</Typography>
                </Box>
                <CardContent sx={{ p: 2.5 }}>
                  <FormControlLabel control={<Switch checked={settings?.enableEmail ?? true} onChange={e => setSettings({ ...settings, enableEmail: e.target.checked })} color="success" />} label="เปิดอีเมลแจ้งเตือน" sx={{ mb: 2 }} />
                  <Grid container spacing={1.5}>
                    <Grid item xs={8}><TextField label="Host" fullWidth size="small" value={settings?.smtpHost || ''} onChange={e => setSettings({ ...settings, smtpHost: e.target.value })} /></Grid>
                    <Grid item xs={4}><TextField label="Port" fullWidth size="small" value={settings?.smtpPort || '587'} onChange={e => setSettings({ ...settings, smtpPort: e.target.value })} /></Grid>
                    <Grid item xs={12}><TextField label="Username" fullWidth size="small" value={settings?.smtpUser || ''} onChange={e => setSettings({ ...settings, smtpUser: e.target.value })} /></Grid>
                    <Grid item xs={12}><TextField label="Password" fullWidth size="small" type="password" value={settings?.smtpPass || ''} onChange={e => setSettings({ ...settings, smtpPass: e.target.value })} /></Grid>
                    <Grid item xs={7}><TextField label="From Email" fullWidth size="small" value={settings?.smtpFromEmail || ''} onChange={e => setSettings({ ...settings, smtpFromEmail: e.target.value })} /></Grid>
                    <Grid item xs={5}><TextField label="From Name" fullWidth size="small" value={settings?.smtpFromName || ''} onChange={e => setSettings({ ...settings, smtpFromName: e.target.value })} /></Grid>
                    <Grid item xs={12}><TextField label="CC Emails (คั่นด้วยลูกน้ำ)" fullWidth size="small" value={settings?.emailCc || ''} onChange={e => setSettings({ ...settings, emailCc: e.target.value })} placeholder="admin@trrgroup.com, support@trrgroup.com" /></Grid>
                  </Grid>
                </CardContent>
              </Card>
              <Card sx={{ mt: 2 }}>
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: '0.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MessageSquare size={18} color="#6366f1" />
                  <Typography variant="subtitle2" fontWeight={700}>Microsoft Teams</Typography>
                </Box>
                <CardContent sx={{ p: 2.5 }}>
                  <FormControlLabel control={<Switch checked={settings?.enableTeams ?? false} onChange={e => setSettings({ ...settings, enableTeams: e.target.checked })} />} label="เปิด Teams Notification" sx={{ mb: 2 }} />
                  {settings?.enableTeams && (
                    <TextField label="Webhook URL" fullWidth size="small" value={settings?.teamsWebhookUrl || ''} onChange={e => setSettings({ ...settings, teamsWebhookUrl: e.target.value })} />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Event Toggles */}
          <Card sx={{ mt: 3 }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '0.5px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={700}>เหตุการณ์ที่ต้องการแจ้งเตือน</Typography>
            </Box>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {[
                  { key: 'borrow_request_pending', icon: '📋', label: 'คำขอยืมใหม่' },
                  { key: 'borrow_approved', icon: '✅', label: 'อนุมัติ' },
                  { key: 'borrow_rejected', icon: '❌', label: 'ปฏิเสธ' },
                  { key: 'checkout_completed', icon: '💻', label: 'ส่งมอบ' },
                  { key: 'return_recorded', icon: '🔄', label: 'คืนอุปกรณ์' },
                  { key: 'overdue_borrow', icon: '⚠️', label: 'เกินกำหนด' },
                  { key: 'extension_pending', icon: '⏰', label: 'ขอขยายวัน' },
                  { key: 'extension_approved', icon: '✅', label: 'อนุมัติขยาย' },
                  { key: 'extension_rejected', icon: '❌', label: 'ปฏิเสธขยาย' },
                ].map(ev => {
                  const keys = settings?.enabledEventKeys ? settings.enabledEventKeys.split(',').map((s: string) => s.trim()) : [];
                  const en = keys.includes(ev.key);
                  return (
                    <Chip key={ev.key} icon={<Box component="span" sx={{ fontSize: '0.9rem' }}>{ev.icon}</Box>} label={ev.label}
                      variant={en ? 'filled' : 'outlined'} color={en ? 'success' : 'default'}
                      onClick={() => setSettings({ ...settings, enabledEventKeys: (en ? keys.filter((x: string) => x !== ev.key) : [...keys, ev.key]).join(', ') })}
                      sx={{ cursor: 'pointer', fontWeight: 600, borderRadius: 2 }} />
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {/* Log Table */}
          <Card sx={{ mt: 3 }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '0.5px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2" fontWeight={700}>ประวัติการแจ้งเตือนล่าสุด</Typography>
              <Button size="small" startIcon={<RefreshCw size={14} />} onClick={fetchLogs} disabled={logLoading}>รีเฟรช</Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>เวลา</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>ช่องทาง</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>หัวข้อ</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>สถานะ</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>ข้อผิดพลาด</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logLoading ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>ไม่มีประวัติ</TableCell></TableRow>
                  ) : logs.map((log: any) => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell><Chip label={log.channel} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} /></TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.eventType || '-'}</TableCell>
                      <TableCell>
                        <Chip label={log.status === 'SENT' ? 'สำเร็จ' : log.status === 'FAILED' ? 'ล้มเหลว' : 'รอส่ง'} size="small"
                          color={log.status === 'SENT' ? 'success' : log.status === 'FAILED' ? 'error' : 'warning'} sx={{ fontSize: '0.65rem', height: 20, fontWeight: 600 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', maxWidth: 120 }}>{log.lastError || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {tab === 3 && (
        <EmailTemplateEditor templates={templates} setTemplates={setTemplates} onSaveTemplate={handleSaveTemplate} />
      )}

      {tab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>นโยบายรหัสผ่าน</Typography>
                <FormControlLabel control={<Switch checked={settings?.requireStrongPassword ?? true} onChange={e => setSettings({ ...settings, requireStrongPassword: e.target.checked })} />} label="บังคับใช้รหัสผ่านที่ซับซ้อน" sx={{ mb: 2 }} />
                <TextField label="อายุรหัสผ่าน (วัน)" type="number" fullWidth size="small" value={settings?.passwordExpiryDays || '90'} onChange={e => setSettings({ ...settings, passwordExpiryDays: e.target.value })} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>การจัดการเซสชัน</Typography>
                <TextField label="หมดอายุเซสชัน (ชั่วโมง)" type="number" fullWidth size="small" value={settings?.sessionTimeoutHours || '8'} onChange={e => setSettings({ ...settings, sessionTimeoutHours: e.target.value })} sx={{ mb: 3 }} />
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} color="error" sx={{ mb: 1 }}>ยกเลิกเซสชันทั้งหมด</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>ทุกคนในระบบจะต้องล็อกอินใหม่ทันที</Typography>
                <Button variant="contained" color="error" size="small" onClick={async () => { if (window.confirm('ยืนยัน? ทุกคนจะต้องล็อกอินใหม่')) { try { await adminAPI.forceLogoutAll(); toast.success('ยกเลิกเซสชันทั้งหมดแล้ว'); } catch { toast.error('เกิดข้อผิดพลาด'); } } }}>
                  บังคับยกเลิกเซสชัน
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 5 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" fontWeight={700}>สถานะระบบ (Health Check)</Typography>
                  <Button size="small" startIcon={<RefreshCw size={14} />} onClick={fetchPing} disabled={pingLoading}>รีเฟรช</Button>
                </Box>
                <Stack spacing={2}>
                  <StatusRow icon={<Database />} label="ฐานข้อมูล (PostgreSQL)" {...pingResult?.database} />
                  <StatusRow icon={<Server />} label="Active Directory / LDAP" {...pingResult?.ldap} />
                  <StatusRow icon={<Mail />} label="SMTP Mail Server" {...pingResult?.smtp} />
                </Stack>
                {pingResult?.ldap?.status !== 'ok' && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <strong>LDAP แสดง OFFLINE</strong> — เนื่องจากไม่ได้กำหนด <code>LDAP_SEARCH_USER</code> และ <code>LDAP_SEARCH_PASSWORD</code> ใน <code>backend/.env</code> ถ้าไม่ได้ใช้ AD Direct ก็ไม่ต้องตั้งค่า
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>ข้อมูลเซิร์ฟเวอร์</Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">เวอร์ชัน</Typography>
                    <Typography variant="body2" fontWeight={600}>2.0.0</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">API Status</Typography>
                    <Chip label={pingResult?.server?.status === 'ok' ? 'Running' : 'ตรวจสอบ...'} size="small" color={pingResult?.server?.status === 'ok' ? 'success' : 'default'} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">Timestamp</Typography>
                    <Typography variant="body2" fontWeight={600}>{pingResult?.server?.timestamp ? new Date(pingResult.server.timestamp).toLocaleString('th-TH') : '-'}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 6 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Download size={24} color={theme.palette.primary.main} />
                  <Typography variant="h6" fontWeight={700}>Backup</Typography>
                </Box>
                <Button variant="outlined" startIcon={backingUp ? <CircularProgress size={18} /> : <Download size={18} />} disabled={backingUp}
                  onClick={async () => {
                    setBackingUp(true);
                    try {
                      const res = await adminAPI.backup();
                      const blob = new Blob([res.data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = `assethub-backup-${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                      toast.success('ดาวน์โหลด Backup สำเร็จ');
                    } catch { toast.error('เกิดข้อผิดพลาด'); }
                    finally { setBackingUp(false); }
                  }}>
                  {backingUp ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลด Backup'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Upload size={24} color={theme.palette.warning.main} />
                  <Typography variant="h6" fontWeight={700}>Restore</Typography>
                </Box>
                <Button variant="outlined" component="label" sx={{ mb: 1 }}>
                  เลือกไฟล์ <input type="file" hidden accept=".json" onChange={e => setRestoreFile(e.target.files?.[0] || null)} />
                </Button>
                {restoreFile && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{restoreFile.name}</Typography>}
                <Button variant="contained" color="warning" disabled={!restoreFile} onClick={async () => {
                  if (!restoreFile) return;
                  try { const res = await adminAPI.restore(restoreFile); toast.success(res.data.message || 'Restore สำเร็จ'); setRestoreFile(null); } catch { toast.error('เกิดข้อผิดพลาด'); }
                }}>กู้คืนข้อมูล</Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card sx={{ border: '2px solid', borderColor: alpha(theme.palette.error.main, 0.3) }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Trash2 size={24} color={theme.palette.error.main} />
                  <Typography variant="h6" fontWeight={700} color="error">ล้างข้อมูล</Typography>
                </Box>
                <Alert severity="error" sx={{ mb: 2 }}>
                  <strong>คำเตือน:</strong> การลบข้อมูลไม่สามารถย้อนกลับได้
                </Alert>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                  <TextField size="small" placeholder="ค้นหาทรัพย์สิน..." value={assetSearch} onChange={e => setAssetSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchAssetList(assetSearch)}
                    InputProps={{ startAdornment: <Search size={16} style={{ marginRight: 8, color: theme.palette.text.secondary }} /> }} sx={{ minWidth: 280 }} />
                  <Button size="small" variant="outlined" onClick={() => fetchAssetList(assetSearch)} disabled={assetListLoading}>ค้นหา</Button>
                  <Button size="small" variant="outlined" onClick={() => { setAssetSearch(''); fetchAssetList(); }}>ล้าง</Button>
                  <Button size="small" variant="contained" color="error" disabled={selectedIds.length === 0} onClick={() => setBulkDialog(true)}>
                    ลบ {selectedIds.length} รายการ
                  </Button>
                </Box>
                <TableContainer sx={{ maxHeight: 350, border: `0.5px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" sx={{ bgcolor: 'action.hover' }}>
                          <Checkbox checked={assetList.length > 0 && selectedIds.length === assetList.length}
                            indeterminate={selectedIds.length > 0 && selectedIds.length < assetList.length}
                            onChange={() => setSelectedIds(selectedIds.length === assetList.length ? [] : assetList.map((a: any) => a.id))} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: 'action.hover' }}>เลขครุภัณฑ์</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: 'action.hover' }}>ชื่อ</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: 'action.hover' }}>Serial</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: 'action.hover' }}>ประเภท</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {assetListLoading ? (
                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
                      ) : assetList.length === 0 ? (
                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>ไม่พบรายการ</TableCell></TableRow>
                      ) : assetList.map((a: any) => (
                        <TableRow key={a.id} hover selected={selectedIds.includes(a.id)} sx={{ cursor: 'pointer' }}
                          onClick={() => setSelectedIds(prev => prev.includes(a.id) ? prev.filter(id => id !== a.id) : [...prev, a.id])}>
                          <TableCell padding="checkbox"><Checkbox checked={selectedIds.includes(a.id)} /></TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{a.assetCode || '-'}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', maxWidth: 200 }}>{a.assetName}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{a.serialNo || '-'}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{a.type || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 7 && (
        <SystemSettingsTab />
      )}

      {/* Dialogs */}
      <Dialog open={bulkDialog} onClose={() => setBulkDialog(false)}>
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          <DialogContentText>คุณแน่ใจที่จะลบ {selectedIds.length} รายการ?</DialogContentText>
          <Alert severity="error" sx={{ mt: 2 }}>ไม่สามารถย้อนกลับได้</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialog(false)}>ยกเลิก</Button>
          <Button color="error" variant="contained" disabled={bulkDeleting} onClick={async () => {
            setBulkDialog(false); setBulkDeleting(true);
            try { const res = await assetAPI.bulkDelete(selectedIds); toast.success(res.data.message); setSelectedIds([]); fetchAssetList(assetSearch); }
            catch { toast.error('เกิดข้อผิดพลาด'); } finally { setBulkDeleting(false); }
          }}>{bulkDeleting ? 'กำลังลบ...' : 'ยืนยัน ลบ'}</Button>
        </DialogActions>
      </Dialog>

      {/* Save Bar */}
      {isDirty() && (
        <Paper elevation={10} sx={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1100, width: 'calc(100% - 48px)', maxWidth: 700, p: 2, borderRadius: 4, bgcolor: 'rgba(30,41,59,0.95)', backdropFilter: 'blur(10px)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AlertTriangle color="#f59e0b" size={20} />
            <Typography variant="body2" fontWeight={600}>คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="text" sx={{ color: '#cbd5e1', '&:hover': { color: '#fff' } }} onClick={() => setSettings(JSON.parse(JSON.stringify(orig)))}>ยกเลิก</Button>
            <Button variant="contained" color="success" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />} onClick={handleSave} disabled={saving} sx={{ fontWeight: 700, borderRadius: 2 }}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

