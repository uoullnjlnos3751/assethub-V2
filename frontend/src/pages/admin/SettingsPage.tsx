import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Switch, FormControlLabel,
  Button, Alert, CircularProgress, Divider, Stack, Chip, Paper, Tabs, Tab, Fade,
  Select, MenuItem, InputLabel, FormControl,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Bell as NotificationsIcon,
  Mail as MailIcon,
  MessageSquare as TeamsIcon,
  Save as SaveIcon,
  Shield as ShieldIcon,
  Clock as ClockIcon,
  Database as DatabaseIcon,
  Globe as GlobeIcon,
  CheckCircle as CheckCircleIcon,
  AlertTriangle as AlertTriangleIcon,
  Server as ServerIcon,
  Lock as LockIcon,
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && (
        <Fade in timeout={300}>
          <Box sx={{ py: 3 }}>{children}</Box>
        </Fade>
      )}
    </div>
  );
}

const EVENT_LABELS: Record<string, string> = {
  borrow_request_pending: 'มีคำขอยืมใหม่',
  borrow_approved: 'อนุมัติคำขอยืม',
  borrow_rejected: 'ปฏิเสธคำขอยืม',
  checkout_completed: 'ส่งมอบอุปกรณ์',
  return_recorded: 'คืนอุปกรณ์',
  overdue_borrow: 'แจ้งเตือนเกินกำหนด',
  extension_pending: 'ขอขยายวันยืม',
  extension_approved: 'อนุมัติขยายวัน',
  extension_rejected: 'ปฏิเสธขยายวัน',
};

const EVENT_ICONS: Record<string, string> = {
  borrow_request_pending: '📋',
  borrow_approved: '✅',
  borrow_rejected: '❌',
  checkout_completed: '💻',
  return_recorded: '🔄',
  overdue_borrow: '⚠️',
  extension_pending: '⏰',
  extension_approved: '✅',
  extension_rejected: '❌',
};

const TEMPLATE_GROUPS = [
  {
    title: 'คำขอยืม',
    color: '#FF6B00',
    keys: ['borrow_request_pending', 'borrow_approved', 'borrow_rejected'],
  },
  {
    title: 'ส่งมอบ / คืน',
    color: '#6366f1',
    keys: ['checkout_completed', 'return_recorded'],
  },
  {
    title: 'ขยายวันยืม',
    color: '#8b5cf6',
    keys: ['extension_pending', 'extension_approved', 'extension_rejected'],
  },
  {
    title: 'แจ้งเตือน',
    color: '#f59e0b',
    keys: ['overdue_borrow'],
  },
];

const PLACEHOLDER_GROUPS = [
  { label: 'ทั่วไป', items: ['{{requestNo}}', '{{requester}}', '{{purpose}}', '{{note}}'] },
  { label: 'ส่งมอบ', items: ['{{handoverNote}}', '{{dueDate}}', '{{itemsTable}}'] },
  { label: 'คืน', items: ['{{condition}}', '{{assetCode}}'] },
  { label: 'เกินกำหนด', items: ['{{daysOverdue}}', '{{dueDate}}', '{{assetCode}}'] },
  { label: 'ขยายวัน', items: ['{{extraDays}}', '{{reason}}', '{{newDueDate}}'] },
];

function EmailTemplateEditor({ templates, setTemplates, onSaveTemplate }: {
  templates: any[];
  setTemplates: React.Dispatch<React.SetStateAction<any[]>>;
  onSaveTemplate: (id: number, data: any) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [localSubject, setLocalSubject] = useState('');
  const [localBody, setLocalBody] = useState('');

  const editingTemplate = templates.find(t => t.id === editingId);

  const SAMPLE_DATA: Record<string, string> = {
    requestNo: 'BR-2026051501',
    requester: 'สมชาย ใจดี',
    department: 'ฝ่ายวิศวกรรม',
    email: 'somchai.jai@trrgroup.com',
    purpose: 'ใช้สำหรับประชุม Project XYZ กับลูกค้า',
    location: 'สำนักงานใหญ่ ชั้น 5 ห้องประชุม A',
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

  const generatePreviewHtml = (html: string) => {
    let result = html;

    const sampleNoteHtml = '<div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px; margin-top: 16px;"><p style="margin: 0; color: #92400e; font-size: 13px;"><b>หมายเหตุ:</b> ใช้งานเสร็จแล้วจะคืนทันที</p></div>';
    const sampleItemsTable = '<table style="width:100%;border-collapse:collapse;margin-top:8px;"><thead><tr><th style="background:#f1f5f9;padding:10px 12px;text-align:left;font-size:12px;color:#475569;font-weight:600;border-bottom:2px solid #e2e8f0;">ทรัพย์สิน</th><th style="background:#f1f5f9;padding:10px 12px;text-align:center;font-size:12px;color:#475569;font-weight:600;border-bottom:2px solid #e2e8f0;">สถานะ</th></tr></thead><tbody><tr><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;"><div style="font-weight:600;color:#1e293b;">TRRHQ-NB-1011</div><div style="color:#64748b;font-size:12px;">HRVYBB4 Dell Pro 16 PC16250</div></td><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;"><span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">ส่งมอบแล้ว</span></td></tr><tr><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;"><div style="font-weight:600;color:#1e293b;">TRRHQ-NB-1024</div><div style="color:#64748b;font-size:12px;">3RFGPC4 Dell Pro 14 PC14250</div></td><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;"><span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">อนุมัติ</span></td></tr></tbody></table>';

    result = result.replace(/\{\{note\}\}/g, sampleNoteHtml);
    result = result.replace(/\{\{itemsTable\}\}/g, sampleItemsTable);

    for (const [key, val] of Object.entries(SAMPLE_DATA)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g');
      result = result.replace(regex, val);
    }

    result = result.replace(/\{\{\w+\}\}/g, '');
    return result;
  };

  const startEdit = (t: any) => {
    setEditingId(t.id);
    setLocalSubject(t.subjectTh);
    setLocalBody(t.bodyTh);
  };

  const handleSave = () => {
    if (editingTemplate) {
      onSaveTemplate(editingTemplate.id, { subjectTh: localSubject, bodyTh: localBody });
      setEditingId(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const insertPlaceholder = (placeholder: string) => {
    setLocalBody(prev => prev + placeholder);
  };

  const emailTemplates = templates.filter(t => t.channel === 'EMAIL');

  if (editingId !== null && editingTemplate) {
    const previewHtml = generatePreviewHtml(localBody);

    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" onClick={handleCancel}>← กลับ</Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2,
              bgcolor: `${TEMPLATE_GROUPS.find(g => g.keys.includes(editingTemplate.key))?.color || '#6366f1'}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
            }}>
              {EVENT_ICONS[editingTemplate.key]}
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                {EVENT_LABELS[editingTemplate.key] || editingTemplate.key}
              </Typography>
              <Typography variant="caption" color="text.secondary">{editingTemplate.key} • EMAIL</Typography>
            </Box>
          </Box>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" onClick={handleCancel}>ยกเลิก</Button>
            <Button variant="contained" size="small" startIcon={<SaveIcon size={16} />} onClick={handleSave}>บันทึก</Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={6}>
            <Card>
              <Box sx={{ px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.8rem' }}>HTML Template</Typography>
              </Box>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>หัวข้ออีเมล</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={localSubject}
                  onChange={(e) => setLocalSubject(e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{ sx: { fontSize: '0.85rem' } }}
                />

                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>เนื้อหา HTML</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={16}
                  value={localBody}
                  onChange={(e) => setLocalBody(e.target.value)}
                  sx={{
                    mb: 2,
                    '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 1.5 },
                  }}
                />

                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>แทรกตัวแปร</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {PLACEHOLDER_GROUPS.map(group => (
                    <Box key={group.label}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>{group.label}</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {group.items.map(p => (
                          <Chip
                            key={p}
                            label={p}
                            size="small"
                            variant="outlined"
                            onClick={() => insertPlaceholder(p)}
                            sx={{ cursor: 'pointer', fontSize: '0.65rem', height: 22, borderRadius: 1 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Card>
              <Box sx={{ px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#6366f1' }} />
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.8rem' }}>ตัวอย่างอีเมล (Preview)</Typography>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>ข้อมูลตัวอย่าง</Typography>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: '#f1f5f9' }}>
                <Box sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', bgcolor: '#fff' }}>
                  <iframe
                    key={localBody.substring(0, 50) + localSubject}
                    srcDoc={previewHtml}
                    title="Email Preview"
                    style={{ width: '100%', height: '600px', border: 'none', display: 'block' }}
                    sandbox="allow-same-origin"
                  />
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Templates อีเมลแจ้งเตือน</Typography>
        <Typography variant="body2" color="text.secondary">เลือก Template ที่ต้องการแก้ไข หรือดูตัวอย่าง</Typography>
      </Box>

      {TEMPLATE_GROUPS.map(group => {
        const groupTemplates = group.keys
          .map(key => emailTemplates.find(t => t.key === key))
          .filter(Boolean);
        if (groupTemplates.length === 0) return null;

        return (
          <Box key={group.title} sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ width: 4, height: 24, borderRadius: 2, bgcolor: group.color }} />
              <Typography variant="subtitle1" fontWeight={700}>{group.title}</Typography>
              <Typography variant="caption" color="text.secondary">({groupTemplates.length} templates)</Typography>
            </Box>

            <Grid container spacing={2}>
              {groupTemplates.map(t => (
                <Grid item xs={12} sm={6} md={4} key={t.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': {
                        borderColor: group.color,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                    onClick={() => startEdit(t)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                        <Box sx={{
                          width: 40, height: 40, borderRadius: 2,
                          bgcolor: `${group.color}15`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.25rem',
                        }}>
                          {EVENT_ICONS[t.key]}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {EVENT_LABELS[t.key]}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                            {t.key}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ bgcolor: '#f9fafb', borderRadius: 1.5, p: 1.5, mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontSize: '0.65rem' }}>หัวข้อ:</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{
                          fontSize: '0.8rem',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {t.subjectTh}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Chip label="แก้ไข" size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 24 }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      })}
    </Box>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const borrowDays = parseInt(settings?.borrowDays || '3');
  const maxItems = parseInt(settings?.maxItemsPerRequest || '5');

  useEffect(() => {
    Promise.all([adminAPI.settings(), adminAPI.notificationTemplates()])
      .then(([s, t]) => {
        setSettings(s.data || {});
        setTemplates(t.data || []);
      })
      .catch(() => toast.error('ไม่สามารถโหลดการตั้งค่าได้'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings({
        systemName: settings?.systemName || 'AssetHub',
        organizationName: settings?.organizationName || 'TRR Group',
        timezone: settings?.timezone || 'Asia/Bangkok',
        darkMode: settings?.darkMode || false,
        showWelcomeBanner: settings?.showWelcomeBanner ?? true,
        borrowDays: parseInt(settings?.borrowDays || '3'),
        maxItemsPerRequest: parseInt(settings?.maxItemsPerRequest || '5'),
        allowExtension: settings?.allowExtension ?? true,
        enableEmail: settings?.enableEmail ?? true,
        enableTeams: settings?.enableTeams ?? false,
        teamsWebhookUrl: settings?.teamsWebhookUrl || '',
        enabledEventKeys: settings?.enabledEventKeys || '',
        requireStrongPassword: settings?.requireStrongPassword ?? true,
        passwordExpiryDays: parseInt(settings?.passwordExpiryDays || '90'),
        sessionTimeoutHours: parseInt(settings?.sessionTimeoutHours || '8'),
      });
      toast.success('บันทึกการตั้งค่าเรียบร้อยแล้ว');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async (id: number, data: any) => {
    try {
      await adminAPI.updateNotificationTemplate(id, data);
      toast.success('อัปเดต Template เรียบร้อย');
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SettingsIcon /> ตั้งค่าระบบ
        </Typography>
        <Typography variant="body1" color="text.secondary">จัดการการตั้งค่าทั้งหมดของระบบ AssetHub</Typography>
      </Box>

      <Paper sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<GlobeIcon size={18} />} iconPosition="start" label="ทั่วไป" />
          <Tab icon={<ClockIcon size={18} />} iconPosition="start" label="กฎการยืม" />
          <Tab icon={<NotificationsIcon size={18} />} iconPosition="start" label="การแจ้งเตือน" />
          <Tab icon={<MailIcon size={18} />} iconPosition="start" label="Templates" />
          <Tab icon={<ShieldIcon size={18} />} iconPosition="start" label="ความปลอดภัย" />
          <Tab icon={<ServerIcon size={18} />} iconPosition="start" label="ระบบ" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>ข้อมูลระบบ</Typography>
                <TextField label="ชื่อระบบ" fullWidth size="small" value={settings?.systemName || 'AssetHub'} onChange={(e) => setSettings({ ...settings, systemName: e.target.value })} sx={{ mb: 2 }} />
                <TextField label="ชื่อองค์กร" fullWidth size="small" value={settings?.organizationName || 'TRR Group'} onChange={(e) => setSettings({ ...settings, organizationName: e.target.value })} sx={{ mb: 2 }} />
                <FormControl fullWidth size="small">
                  <InputLabel>เขตเวลา</InputLabel>
                  <Select value={settings?.timezone || 'Asia/Bangkok'} label="เขตเวลา" onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}>
                    <MenuItem value="Asia/Bangkok">Asia/Bangkok (GMT+7)</MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>การแสดงผล</Typography>
                <FormControlLabel control={<Switch checked={settings?.darkMode || false} onChange={(e) => setSettings({ ...settings, darkMode: e.target.checked })} />} label="โหมดมืด (Coming Soon)" disabled />
                <FormControlLabel control={<Switch checked={settings?.showWelcomeBanner || true} onChange={(e) => setSettings({ ...settings, showWelcomeBanner: e.target.checked })} />} label="แสดงแบนเนอร์ต้อนรับ" />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>ระยะเวลาการยืม</Typography>
                <TextField label="วันยืมมาตรฐาน (วัน)" type="number" fullWidth size="small" value={borrowDays} onChange={(e) => setSettings({ ...settings, borrowDays: e.target.value })} InputProps={{ inputProps: { min: 1, max: 30 } }} sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">กำหนดวันคืนอัตโนมัติเมื่อสร้างคำขอยืมใหม่</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>ข้อจำกัด</Typography>
                <TextField label="จำนวนรายการสูงสุดต่อคำขอ" type="number" fullWidth size="small" value={maxItems} onChange={(e) => setSettings({ ...settings, maxItemsPerRequest: e.target.value })} InputProps={{ inputProps: { min: 1, max: 20 } }} sx={{ mb: 2 }} />
                <FormControlLabel control={<Switch checked={settings?.allowExtension || true} onChange={(e) => setSettings({ ...settings, allowExtension: e.target.checked })} />} label="อนุญาตให้ขยายวันยืม" />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>ช่องทางการส่ง</Typography>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: settings?.enableEmail ? 'rgba(16, 185, 129, 0.1)' : 'grey.100', mb: 2 }}>
                  <FormControlLabel control={<Switch checked={settings?.enableEmail} onChange={(e) => setSettings({ ...settings, enableEmail: e.target.checked })} color="success" />} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><MailIcon size={18} /> เปิดใช้งาน Email</Box>} />
                </Box>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: settings?.enableTeams ? 'rgba(99, 102, 241, 0.1)' : 'grey.100' }}>
                  <FormControlLabel control={<Switch checked={settings?.enableTeams} onChange={(e) => setSettings({ ...settings, enableTeams: e.target.checked })} color="primary" />} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TeamsIcon size={18} /> เปิดใช้งาน MS Teams</Box>} />
                </Box>
                {settings?.enableTeams && <TextField label="Teams Webhook URL" fullWidth size="small" value={settings?.teamsWebhookUrl || ''} onChange={(e) => setSettings({ ...settings, teamsWebhookUrl: e.target.value })} sx={{ mt: 2 }} />}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>เหตุการณ์ที่แจ้งเตือน</Typography>
                <TextField fullWidth multiline rows={8} value={settings?.enabledEventKeys || ''} onChange={(e) => setSettings({ ...settings, enabledEventKeys: e.target.value })} placeholder="คั่นด้วยเครื่องหมาย ," sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {['borrow_request_pending', 'borrow_approved', 'borrow_rejected', 'checkout_completed', 'return_recorded', 'overdue_borrow', 'extension_pending', 'pm_overdue'].map(k => (
                    <Chip key={k} label={k} size="small" variant="outlined" onClick={() => {
                      const keys = settings?.enabledEventKeys ? settings.enabledEventKeys.split(',').map((s: string) => s.trim()) : [];
                      const newKeys = keys.includes(k) ? keys.filter((x: string) => x !== k) : [...keys, k];
                      setSettings({ ...settings, enabledEventKeys: newKeys.join(', ') });
                    }} sx={{ cursor: 'pointer' }} />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <EmailTemplateEditor templates={templates} setTemplates={setTemplates} onSaveTemplate={handleSaveTemplate} />
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>นโยบายรหัสผ่าน</Typography>
                <FormControlLabel control={<Switch checked={settings?.requireStrongPassword || true} onChange={(e) => setSettings({ ...settings, requireStrongPassword: e.target.checked })} />} label="บังคับใช้รหัสผ่านที่ซับซ้อน" />
                <TextField label="อายุรหัสผ่าน (วัน)" type="number" fullWidth size="small" value={settings?.passwordExpiryDays || '90'} onChange={(e) => setSettings({ ...settings, passwordExpiryDays: e.target.value })} sx={{ mt: 2 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>เซสชัน</Typography>
                <TextField label="หมดอายุเซสชัน (ชั่วโมง)" type="number" fullWidth size="small" value={settings?.sessionTimeoutHours || '8'} onChange={(e) => setSettings({ ...settings, sessionTimeoutHours: e.target.value })} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={5}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>สถานะการเชื่อมต่อ</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <CheckCircleIcon color="success" size={20} />
                  <Typography>Database: <strong>Connected</strong></Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <CheckCircleIcon color="success" size={20} />
                  <Typography>LDAP: <strong>Active</strong></Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <AlertTriangleIcon color="warning" size={20} />
                  <Typography>SMTP: <strong>Configured</strong></Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>ข้อมูลระบบ</Typography>
                <Typography variant="body2">Version: <strong>2.0.0</strong></Typography>
                <Typography variant="body2">Environment: <strong>Production</strong></Typography>
                <Typography variant="body2">Uptime: <strong>Running</strong></Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button variant="contained" size="large" startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />} onClick={handleSave} disabled={saving}>
          บันทึกการเปลี่ยนแปลงทั้งหมด
        </Button>
      </Box>
    </Box>
  );
}
