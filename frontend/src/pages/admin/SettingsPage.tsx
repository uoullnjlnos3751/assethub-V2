import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Switch, FormControlLabel,
  Button, Alert, CircularProgress, Divider, Stack, Chip, Paper, Tabs, Tab, Fade,
  Select, MenuItem, InputLabel, FormControl, IconButton, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  List, ListItemButton, ListSubheader, ListItemIcon, ListItemText, InputAdornment, useMediaQuery, useTheme
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
  Smartphone as SmartphoneIcon,
  Send as SendIcon,
  RefreshCw as RefreshIcon,
  MessageCircle as MessageCircleIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Trash2 as TrashIcon,
  Search as SearchIcon,
} from 'lucide-react';
import { adminAPI, assetAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

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
  const toast = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [localSubject, setLocalSubject] = useState('');
  const [localBody, setLocalBody] = useState('');
  const [resetting, setResetting] = useState(false);

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

  const handleReset = async () => {
    if (!editingTemplate) return;
    if (window.confirm('คุณต้องการรีเซ็ตเทมเพลตนี้กลับเป็นค่าเริ่มต้นใช่หรือไม่?')) {
      setResetting(true);
      try {
        const res = await adminAPI.resetNotificationTemplate(editingTemplate.id);
        setLocalSubject(res.data.subjectTh);
        setLocalBody(res.data.bodyTh);
        toast.success('รีเซ็ตกลับเป็นค่าเริ่มต้นเรียบร้อย (กรุณากด บันทึก เพื่อยืนยันการบันทึก)');
      } catch (err: any) {
        toast.error(err.response?.data?.message || err.message || 'คืนค่าเริ่มต้นไม่สำเร็จ');
      } finally {
        setResetting(false);
      }
    }
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
            <Button variant="outlined" size="small" color="error" onClick={handleReset} disabled={resetting}>
              {resetting ? 'กำลังรีเซ็ต...' : 'คืนค่าเริ่มต้น'}
            </Button>
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
        <Typography variant="body2" color="text.secondary">เลือก Template ที่ต้องการแก้ไข หรือคืนค่าเริ่มต้น</Typography>
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
  const { refreshSettings } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  const [originalSettings, setOriginalSettings] = useState<any>(null); // For tracking unsaved modifications
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logLoading, setLogLoading] = useState(false);

  // Connection Check States
  const [pingResult, setPingResult] = useState<any>(null);
  const [pingLoading, setPingLoading] = useState(false);

  // SMTP Test Email States
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);

  // Force Logout States
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  // Data Management States
  const [backingUp, setBackingUp] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  // Selective delete states
  const [assetList, setAssetList] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [assetListLoading, setAssetListLoading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [advancedClearDialogOpen, setAdvancedClearDialogOpen] = useState(false);
  const [clearOptions, setClearOptions] = useState({
    clearAssets: true,
    clearBorrow: false,
    clearDonations: false,
    clearMasterData: false,
    clearUsers: false,
  });
  const [confirmText, setConfirmText] = useState('');

  // Delete by type states
  const [deviceTypes, setDeviceTypes] = useState<any[]>([]);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [typeToDelete, setTypeToDelete] = useState<string>('');
  const [typeDeleteDialogOpen, setTypeDeleteDialogOpen] = useState(false);
  const [typeDeleting, setTypeDeleting] = useState(false);

  const borrowDays = parseInt(settings?.borrowDays || '3');
  const maxItems = parseInt(settings?.maxItemsPerRequest || '5');

  const fetchLogs = () => {
    setLogLoading(true);
    adminAPI.notificationLogs({ page: 1, limit: 30 })
      .then((res) => { setLogs(res.data.data || []); setLogTotal(res.data.total || 0); })
      .catch(() => {})
      .finally(() => setLogLoading(false));
  };

  const fetchPingStatus = () => {
    setPingLoading(true);
    adminAPI.ping()
      .then((res) => { setPingResult(res.data); })
      .catch(() => { toast.error('ไม่สามารถเรียกข้อมูลสถานะเชื่อมต่อได้'); })
      .finally(() => setPingLoading(false));
  };

  useEffect(() => {
    Promise.all([adminAPI.settings(), adminAPI.notificationTemplates()])
      .then(([s, t]) => {
        setSettings(s.data || {});
        setOriginalSettings(s.data || {});
        setTemplates(t.data || []);
      })
      .catch(() => toast.error('ไม่สามารถโหลดการตั้งค่าได้'))
      .finally(() => setLoading(false));
    fetchLogs();
  }, []);

  useEffect(() => {
    if (tabValue === 5) {
      fetchPingStatus();
    }
    if (tabValue === 6) {
      fetchAssetList();
      fetchTypeCounts();
    }
  }, [tabValue]);

  const isDirty = () => {
    if (!settings || !originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        systemName: settings?.systemName ?? 'AssetHub',
        organizationName: settings?.organizationName ?? 'TRR Group',
        logoUrl: settings?.logoUrl || '',
        timezone: settings?.timezone || 'Asia/Bangkok',
        darkMode: settings?.darkMode || false,
        showWelcomeBanner: settings?.showWelcomeBanner ?? true,
        borrowDays: parseInt(settings?.borrowDays || '3'),
        maxBorrowDays: parseInt(settings?.maxBorrowDays || '30'),
        maxItemsPerRequest: parseInt(settings?.maxItemsPerRequest || '5'),
        allowExtension: settings?.allowExtension ?? true,
        maxExtensionsPerRequest: parseInt(settings?.maxExtensionsPerRequest || '2'),
        overdueWarningDays: parseInt(settings?.overdueWarningDays || '3'),
        enableEmail: settings?.enableEmail ?? true,
        smtpHost: settings?.smtpHost || '',
        smtpPort: settings?.smtpPort || '587',
        smtpUser: settings?.smtpUser || '',
        smtpPass: settings?.smtpPass || '',
        smtpFromEmail: settings?.smtpFromEmail || '',
        smtpFromName: settings?.smtpFromName || '',
        enableTeams: settings?.enableTeams ?? false,
        teamsWebhookUrl: settings?.teamsWebhookUrl || '',
        enabledEventKeys: settings?.enabledEventKeys || '',
        requireStrongPassword: settings?.requireStrongPassword ?? true,
        passwordExpiryDays: parseInt(settings?.passwordExpiryDays || '90'),
        sessionTimeoutHours: parseInt(settings?.sessionTimeoutHours || '8'),
        enableLine: settings?.enableLine ?? false,
        lineChannelAccessToken: settings?.lineChannelAccessToken || '',
        lineWebhookUrl: settings?.lineWebhookUrl || '',
        lineWebhookVerifyToken: settings?.lineWebhookVerifyToken || '',
        lineSendMode: settings?.lineSendMode || 'broadcast',
        lineUserIds: settings?.lineUserIds || '',
        lineEnabledStatuses: settings?.lineEnabledStatuses || '',
      };

      const res = await adminAPI.updateSettings(dataToSave);
      setSettings(res.data || dataToSave);
      setOriginalSettings(res.data || dataToSave);
      await refreshSettings();
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
      // refresh templates list
      const t = await adminAPI.notificationTemplates();
      setTemplates(t.data || []);
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailRecipient) {
      toast.error('กรุณากรอกอีเมลปลายทางสำหรับการทดสอบ');
      return;
    }
    if (!settings?.smtpHost) {
      toast.error('กรุณาระบุ Host ของ SMTP Server ก่อนทำการทดสอบ');
      return;
    }
    setTestingEmail(true);
    try {
      const res = await adminAPI.testEmail({
        to: testEmailRecipient,
        smtpHost: settings?.smtpHost,
        smtpPort: settings?.smtpPort,
        smtpUser: settings?.smtpUser,
        smtpPass: settings?.smtpPass,
        smtpFromEmail: settings?.smtpFromEmail,
        smtpFromName: settings?.smtpFromName,
      });
      if (res.data.success) {
        toast.success(res.data.message || 'ส่งอีเมลทดสอบเรียบร้อยแล้ว');
      } else {
        toast.error(res.data.message || 'ส่งอีเมลทดสอบล้มเหลว');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการทดสอบ');
    } finally {
      setTestingEmail(false);
    }
  };

  const fetchAssetList = async (search?: string) => {
    setAssetListLoading(true);
    try {
      const params: any = { limit: 500 };
      if (search) params.search = search;
      const res = await assetAPI.list(params);
      setAssetList(res.data.data || []);
    } catch {
      toast.error('ไม่สามารถโหลดรายการทรัพย์สินได้');
    } finally {
      setAssetListLoading(false);
    }
  };

  const fetchTypeCounts = async () => {
    try {
      const typesRes = await assetAPI.deviceTypes();
      const types = typesRes.data || [];
      setDeviceTypes(types);
      const counts: Record<string, number> = {};
      await Promise.all(types.map(async (t: any) => {
        try {
          const res = await assetAPI.list({ type: t.name, limit: 1 });
          counts[t.name] = res.data.total || 0;
        } catch { counts[t.name] = 0; }
      }));
      setTypeCounts(counts);
    } catch {
      // silently fail
    }
  };

  const handleDeleteByType = async () => {
    setTypeDeleteDialogOpen(false);
    setTypeDeleting(true);
    try {
      const res = await assetAPI.bulkDeleteByType(typeToDelete);
      toast.success(res.data.message || `ลบ ${typeToDelete} เรียบร้อย`);
      setTypeToDelete('');
      fetchAssetList(assetSearch);
      fetchTypeCounts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setTypeDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleteDialogOpen(false);
    setBulkDeleting(true);
    try {
      const res = await assetAPI.bulkDelete(selectedIds);
      toast.success(res.data.message || `ลบ ${selectedIds.length} รายการเรียบร้อย`);
      setSelectedIds([]);
      fetchAssetList(assetSearch);
      fetchTypeCounts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleForceLogoutAll = async () => {
    if (window.confirm('คำเตือน: คุณต้องการบังคับให้เซสชันของทุกอุปกรณ์สิ้นสุดลงทันที (รวมถึงตัวคุณด้วย) ใช่หรือไม่?')) {
      setLoggingOutAll(true);
      try {
        const res = await adminAPI.forceLogoutAll();
        toast.success(res.data.message || 'สั่งการล้างเซสชันทั้งหมดสำเร็จ');
      } catch (err: any) {
        toast.error(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาด');
      } finally {
        setLoggingOutAll(false);
      }
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuGroups = [
    {
      title: 'ระบบและทั่วไป',
      items: [
        { index: 0, label: 'ทั่วไป', icon: <GlobeIcon size={18} /> },
        { index: 4, label: 'ความปลอดภัย', icon: <ShieldIcon size={18} /> },
        { index: 5, label: 'ระบบ', icon: <ServerIcon size={18} /> },
      ]
    },
    {
      title: 'การดำเนินงาน',
      items: [
        { index: 1, label: 'กฎการยืม', icon: <ClockIcon size={18} /> },
        { index: 6, label: 'จัดการข้อมูล', icon: <DatabaseIcon size={18} /> },
      ]
    },
    {
      title: 'การติดต่อสื่อสาร',
      items: [
        { index: 2, label: 'การแจ้งเตือน', icon: <NotificationsIcon size={18} /> },
        { index: 3, label: 'Templates', icon: <MailIcon size={18} /> },
      ]
    }
  ];

  const filteredMenuGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => item.label.toLowerCase().includes(searchTerm.toLowerCase()))
  })).filter(group => group.items.length > 0);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 10, position: 'relative' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SettingsIcon /> ตั้งค่าระบบ
        </Typography>
        <Typography variant="body1" color="text.secondary">จัดการการตั้งค่าทั้งหมดของระบบ AssetHub</Typography>
      </Box>

      {/* ── Top Grouped Navigation Bar ── */}
      {(() => {
        const groups = [
          {
            id: 'general',
            label: 'ระบบและทั่วไป',
            icon: <GlobeIcon size={20} />,
            subItems: [
              { index: 0, label: 'ทั่วไป', icon: <GlobeIcon size={16} /> },
              { index: 4, label: 'ความปลอดภัย', icon: <ShieldIcon size={16} /> },
              { index: 5, label: 'ระบบ', icon: <ServerIcon size={16} /> },
            ]
          },
          {
            id: 'operation',
            label: 'การดำเนินงาน',
            icon: <ClockIcon size={20} />,
            subItems: [
              { index: 1, label: 'กฎการยืม', icon: <ClockIcon size={16} /> },
              { index: 6, label: 'จัดการข้อมูล', icon: <DatabaseIcon size={16} /> },
            ]
          },
          {
            id: 'communication',
            label: 'การติดต่อสื่อสาร',
            icon: <NotificationsIcon size={20} />,
            subItems: [
              { index: 2, label: 'การแจ้งเตือน LINE', icon: <SmartphoneIcon size={16} /> },
              { index: 3, label: 'Templates อีเมล', icon: <MailIcon size={16} /> },
            ]
          }
        ];

        const currentGroupIndex = groups.findIndex(g => g.subItems.some(item => item.index === tabValue));
        const activeGroup = groups[currentGroupIndex >= 0 ? currentGroupIndex : 0];

        return (
          <Card 
            sx={{ 
              borderRadius: 3, 
              mb: 4, 
              p: 2, 
              bgcolor: '#fff', 
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
            }}
          >
            <Grid container spacing={2}>
              {groups.map((group) => {
                const isActive = activeGroup.id === group.id;
                return (
                  <Grid item xs={12} md={4} key={group.id}>
                    <Paper
                      elevation={0}
                      onClick={() => {
                        setTabValue(group.subItems[0].index);
                      }}
                      sx={{
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        cursor: 'pointer',
                        borderRadius: 2.5,
                        border: '2px solid',
                        borderColor: isActive ? 'primary.main' : '#f1f5f9',
                        bgcolor: isActive ? '#f8fafc' : '#fff',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: isActive ? 'primary.main' : 'primary.light',
                          bgcolor: isActive ? '#f8fafc' : '#fafafa',
                          transform: 'translateY(-1px)',
                        }
                      }}
                    >
                      <Box sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: isActive ? 'primary.main' : '#f1f5f9',
                        color: isActive ? '#fff' : 'text.secondary',
                        transition: 'all 0.2s ease',
                      }}>
                        {group.icon}
                      </Box>
                      <Box>
                        <Typography 
                          variant="subtitle2" 
                          fontWeight={700} 
                          color={isActive ? 'primary.main' : 'text.primary'}
                        >
                          {group.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {group.subItems.map(s => s.label).join(' • ')}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
              {activeGroup.subItems.map((subItem) => {
                const isSubActive = tabValue === subItem.index;
                return (
                  <Button
                    key={subItem.index}
                    variant={isSubActive ? 'contained' : 'outlined'}
                    color={isSubActive ? 'primary' : 'inherit'}
                    onClick={() => setTabValue(subItem.index)}
                    startIcon={subItem.icon}
                    sx={{
                      borderRadius: 5,
                      px: 3,
                      py: 0.75,
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: isSubActive ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: isSubActive ? 'primary.main' : 'rgba(99, 102, 241, 0.04)',
                        color: isSubActive ? 'primary.contrastText' : 'primary.main',
                      }
                    }}
                  >
                    {subItem.label}
                  </Button>
                );
              })}
            </Box>
          </Card>
        );
      })()}

      {/* Content Area */}
      <Box sx={{ width: '100%' }}>

      {/* ── Tab 0: General ── */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>ข้อมูลระบบ</Typography>
                <TextField label="ชื่อระบบ" fullWidth size="small" value={settings?.systemName || 'AssetHub'} onChange={(e) => setSettings({ ...settings, systemName: e.target.value })} sx={{ mb: 2 }} />
                <TextField label="ชื่อองค์กร" fullWidth size="small" value={settings?.organizationName || 'TRR Group'} onChange={(e) => setSettings({ ...settings, organizationName: e.target.value })} sx={{ mb: 2 }} />
                <TextField
                  label="Logo URL"
                  fullWidth
                  size="small"
                  value={settings?.logoUrl || ''}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                  placeholder="https://your-domain.com/path-to-logo.png"
                  sx={{ mb: 2 }}
                />
                {settings?.logoUrl && (
                  <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, p: 1.5, border: '1px dashed #cbd5e1', borderRadius: 2, bgcolor: '#f8fafc' }}>
                    <img
                      src={settings.logoUrl}
                      alt="Logo preview"
                      style={{ maxHeight: 40, maxWidth: 120, objectFit: 'contain' }}
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                    <Typography variant="caption" color="text.secondary">ตัวอย่างการแสดงโลโก้บนระบบ</Typography>
                  </Box>
                )}
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
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>การแสดงผล</Typography>
                <Box sx={{ display: 'block' }}>
                  <FormControlLabel control={<Switch checked={settings?.showWelcomeBanner ?? true} onChange={(e) => setSettings({ ...settings, showWelcomeBanner: e.target.checked })} />} label="แสดงแบนเนอร์ต้อนรับ" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── Tab 1: Borrow Rules ── */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>ระยะเวลาการยืม</Typography>
                <TextField label="วันยืมมาตรฐาน (วัน)" type="number" fullWidth size="small" value={borrowDays} onChange={(e) => setSettings({ ...settings, borrowDays: e.target.value })} InputProps={{ inputProps: { min: 1 } }} sx={{ mb: 2 }} />
                <TextField label="จำนวนวันยืมสูงสุดต่อคำขอ (วัน)" type="number" fullWidth size="small" value={settings?.maxBorrowDays || 30} onChange={(e) => setSettings({ ...settings, maxBorrowDays: e.target.value })} InputProps={{ inputProps: { min: 1 } }} sx={{ mb: 2 }} />
                <TextField label="ระยะเวลาเตือนก่อนเกินกำหนด (วัน)" type="number" fullWidth size="small" value={settings?.overdueWarningDays || 3} onChange={(e) => setSettings({ ...settings, overdueWarningDays: e.target.value })} InputProps={{ inputProps: { min: 1 } }} sx={{ mb: 2 }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>กำหนดระยะเวลาสำหรับการส่งแจ้งเตือนก่อนทรัพย์สินหมดอายุสัญญาการยืม</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>ข้อจำกัด</Typography>
                <TextField label="จำนวนรายการสูงสุดต่อคำขอ" type="number" fullWidth size="small" value={maxItems} onChange={(e) => setSettings({ ...settings, maxItemsPerRequest: e.target.value })} InputProps={{ inputProps: { min: 1, max: 20 } }} sx={{ mb: 2 }} />
                <Box sx={{ mb: 2 }}>
                  <FormControlLabel control={<Switch checked={settings?.allowExtension ?? true} onChange={(e) => setSettings({ ...settings, allowExtension: e.target.checked })} />} label="อนุญาตให้ขอต่ออายุ (Extension)" />
                </Box>
                {settings?.allowExtension && (
                  <TextField label="จำนวนครั้งในการขอต่ออายุสูงสุดต่อคำขอ" type="number" fullWidth size="small" value={settings?.maxExtensionsPerRequest || 2} onChange={(e) => setSettings({ ...settings, maxExtensionsPerRequest: e.target.value })} InputProps={{ inputProps: { min: 1, max: 10 } }} sx={{ mb: 2 }} />
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── Tab 2: Notifications ── */}
      <TabPanel value={tabValue} index={2}>
        <Box>
          {/* ── Header Banner ── */}
          <Paper sx={{
            background: 'linear-gradient(135deg, #00B900 0%, #009900 100%)',
            borderRadius: 3, p: 3, mb: 3, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2,
          }}>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <SmartphoneIcon size={28} /> การแจ้งเตือน LINE
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>จัดการการแจ้งเตือนผ่าน LINE Messaging API</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>{new Date().toLocaleDateString('th-TH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</Typography>
                <Typography variant="body2" fontWeight={600}>{new Date().toLocaleTimeString('th-TH')}</Typography>
              </Box>
              <Chip label={settings?.enableLine ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} size="small" sx={{ bgcolor: settings?.enableLine ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, backdropFilter: 'blur(4px)' }} />
            </Box>
          </Paper>

          {/* ── Stats ── */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'การแจ้งเตือนทั้งหมด', value: logTotal, color: '#6366f1', icon: '📊' },
              { label: 'ส่งสำเร็จ', value: logs.filter(l => l.status === 'SENT').length, color: '#10b981', icon: '✅' },
              { label: 'ส่งไม่สำเร็จ', value: logs.filter(l => l.status === 'FAILED').length, color: '#ef4444', icon: '❌' },
              { label: 'วันนี้', value: logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length, color: '#f59e0b', icon: '📅' },
            ].map(stat => (
              <Grid item xs={6} sm={3} key={stat.label}>
                <Card sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>{stat.label}</Typography>
                        <Typography variant="h4" fontWeight={800} sx={{ color: stat.color, lineHeight: 1.2, mt: 0.5 }}>{stat.value}</Typography>
                      </Box>
                      <Box sx={{ fontSize: '1.8rem' }}>{stat.icon}</Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* ── Channel Configuration ── */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* LINE Config */}
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 2.5 }}>
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SmartphoneIcon size={18} color="#00B900" />
                  <Typography variant="subtitle2" fontWeight={700}>ตั้งค่าช่องทาง LINE</Typography>
                </Box>
                <CardContent sx={{ p: 2.5 }}>
                  <Grid container spacing={2} sx={{ mb: 0 }}>
                    <Grid item xs={12}>
                      <TextField
                        label="LINE Channel Access Token"
                        fullWidth size="small"
                        type={settings?.lineChannelAccessToken ? 'password' : 'text'}
                        value={settings?.lineChannelAccessToken || ''}
                        onChange={(e) => setSettings({ ...settings, lineChannelAccessToken: e.target.value })}
                        InputProps={{
                          startAdornment: settings?.lineChannelAccessToken
                            ? <Box component="span" sx={{ mr: 1, color: '#10b981', fontSize: '1rem' }}>✓</Box>
                            : null,
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={8}>
                      <TextField
                        label="LINE Webhook URL"
                        fullWidth size="small"
                        value={settings?.lineWebhookUrl || ''}
                        onChange={(e) => setSettings({ ...settings, lineWebhookUrl: e.target.value })}
                        placeholder="https://your-domain.com/api/line/webhook"
                        helperText="ใส่ URL สำหรับรับ webhook จาก LINE Platform"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Verify Token"
                        fullWidth size="small"
                        value={settings?.lineWebhookVerifyToken || ''}
                        onChange={(e) => setSettings({ ...settings, lineWebhookVerifyToken: e.target.value })}
                        placeholder="your-verify-token"
                        helperText="สำหรับ verify request"
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2.5 }} />
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>รูปแบบการส่ง</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      label="📢 Broadcast (ทุกคนที่ Add บอท)"
                      variant={settings?.lineSendMode === 'broadcast' ? 'filled' : 'outlined'}
                      color={settings?.lineSendMode === 'broadcast' ? 'success' : 'default'}
                      onClick={() => setSettings({ ...settings, lineSendMode: 'broadcast' })}
                      sx={{ cursor: 'pointer', fontWeight: 600 }}
                    />
                    <Chip
                      label="📨 Push (ระบุ User ID)"
                      variant={settings?.lineSendMode === 'push' ? 'filled' : 'outlined'}
                      color={settings?.lineSendMode === 'push' ? 'primary' : 'default'}
                      onClick={() => setSettings({ ...settings, lineSendMode: 'push' })}
                      sx={{ cursor: 'pointer', fontWeight: 600 }}
                    />
                  </Box>

                  {settings?.lineSendMode === 'push' && (
                    <TextField
                      label="LINE User/Group IDs (สำหรับ Push)"
                      fullWidth size="small" multiline rows={2} sx={{ mb: 1 }}
                      value={settings?.lineUserIds || ''}
                      onChange={(e) => setSettings({ ...settings, lineUserIds: e.target.value })}
                      placeholder="U123..., U456..."
                    />
                  )}

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    💡 Broadcast: ผู้ใช้ต้อง Add บอทเป็นเพื่อนก่อน | Push: ต้องมี User ID จากการ webhook ของ LINE
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* EMAIL Config */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2.5, height: '100%' }}>
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MailIcon size={18} color="#e74c3c" />
                  <Typography variant="subtitle2" fontWeight={700}>ช่องทางอีเมล & SMTP Server</Typography>
                </Box>
                <CardContent sx={{ p: 2.5 }}>
                  <FormControlLabel
                    control={<Switch checked={settings?.enableEmail ?? true} onChange={(e) => setSettings({ ...settings, enableEmail: e.target.checked })} color="success" />}
                    label={<Typography variant="body2" fontWeight={600}>เปิดการแจ้งเตือนอีเมล</Typography>}
                    sx={{ mb: 1.5 }}
                  />
                  <Divider sx={{ mb: 1.5 }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 1, display: 'block' }}>ตั้งค่า SMTP Server</Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={8}>
                      <TextField label="Host" fullWidth size="small" value={settings?.smtpHost || ''} onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })} placeholder="smtp.office365.com" />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField label="Port" fullWidth size="small" value={settings?.smtpPort || '587'} onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })} placeholder="587" />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="Username" fullWidth size="small" value={settings?.smtpUser || ''} onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })} placeholder="user@company.com" />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="Password" fullWidth size="small" type="password" value={settings?.smtpPass || ''} onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })} placeholder="••••••••" />
                    </Grid>
                    <Grid item xs={7}>
                      <TextField label="From Email" fullWidth size="small" value={settings?.smtpFromEmail || ''} onChange={(e) => setSettings({ ...settings, smtpFromEmail: e.target.value })} placeholder="noreply@company.com" />
                    </Grid>
                    <Grid item xs={5}>
                      <TextField label="From Name" fullWidth size="small" value={settings?.smtpFromName || ''} onChange={(e) => setSettings({ ...settings, smtpFromName: e.target.value })} placeholder="AssetHub" />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2.5 }} />
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>ทดสอบระบบส่งอีเมล</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      label="อีเมลปลายทาง"
                      size="small"
                      placeholder="target@company.com"
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      startIcon={testingEmail ? <CircularProgress size={16} /> : <SendIcon size={16} />}
                      onClick={handleTestEmail}
                      disabled={testingEmail}
                      sx={{ height: 40 }}
                    >
                      ทดสอบส่ง
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* TEAMS Config */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2.5, height: '100%' }}>
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TeamsIcon size={18} color="#6366f1" />
                  <Typography variant="subtitle2" fontWeight={700}>ช่องทาง Microsoft Teams</Typography>
                </Box>
                <CardContent sx={{ p: 2.5 }}>
                  <FormControlLabel
                    control={<Switch checked={settings?.enableTeams ?? false} onChange={(e) => setSettings({ ...settings, enableTeams: e.target.checked })} color="primary" />}
                    label={<Typography variant="body2" fontWeight={600}>เปิดการแจ้งเตือน Teams</Typography>}
                    sx={{ mb: 1.5 }}
                  />
                  {settings?.enableTeams && (
                    <TextField
                      label="Teams Webhook URL"
                      fullWidth size="small"
                      value={settings?.teamsWebhookUrl || ''}
                      onChange={(e) => setSettings({ ...settings, teamsWebhookUrl: e.target.value })}
                      placeholder="https://outlook.office.com/webhook/..."
                    />
                  )}
                  {!settings?.enableTeams && (
                    <Typography variant="caption" color="text.secondary">เปิดใช้งานเพื่อตั้งค่า Webhook URL</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* ── Notification Conditions ── */}
          <Card sx={{ borderRadius: 2.5, mb: 3 }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component="span" sx={{ fontSize: '1rem' }}>🔔</Box>
              <Typography variant="subtitle2" fontWeight={700}>เงื่อนไขการแจ้งเตือน</Typography>
            </Box>
            <CardContent sx={{ p: 2.5 }}>
              {/* Master LINE toggle */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: settings?.enableLine ? 'rgba(0, 185, 0, 0.05)' : 'grey.50', mb: 2.5 }}>
                <FormControlLabel
                  control={<Switch checked={settings?.enableLine ?? false} onChange={(e) => setSettings({ ...settings, enableLine: e.target.checked })} color="success" />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={700}>เปิดการแจ้งเตือน LINE</Typography>
                      <Typography variant="caption" color="text.secondary">เปิด/ปิดการส่งแจ้งเตือนผ่าน LINE ทั้งหมด</Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%', '& .MuiFormControlLabel-label': { flex: 1 } }}
                />
              </Paper>

              {/* Per-event toggles */}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="span" sx={{ fontSize: '1.1rem' }}>📋</Box> เหตุการณ์ที่ต้องการแจ้งเตือน
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {Object.entries(EVENT_LABELS).map(([key, label]) => {
                  const keys = settings?.enabledEventKeys ? settings.enabledEventKeys.split(',').map((s: string) => s.trim()) : [];
                  const enabled = keys.includes(key);
                  return (
                    <Chip
                      key={key}
                      icon={<Box component="span" sx={{ fontSize: '0.9rem', ml: 0.5 }}>{EVENT_ICONS[key]}</Box>}
                      label={label}
                      variant={enabled ? 'filled' : 'outlined'}
                      color={enabled ? 'success' : 'default'}
                      onClick={() => {
                        const newKeys = enabled ? keys.filter((x: string) => x !== key) : [...keys, key];
                        setSettings({ ...settings, enabledEventKeys: newKeys.join(', ') });
                      }}
                      sx={{ cursor: 'pointer', fontWeight: 600, borderRadius: 2, height: 32 }}
                    />
                  );
                })}
              </Box>

              {/* Status notification preferences */}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="span" sx={{ fontSize: '1.1rem' }}>📋</Box> สถานะที่ต้องการแจ้งเตือน (เมื่อเปลี่ยนสถานะ)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                {[
                  { icon: '🆕', label: 'รอรับเรื่อง', key: 'รอรับเรื่อง', color: '#f97316' },
                  { icon: '🤝', label: 'รับเรื่องแล้ว', key: 'รับเรื่องแล้ว', color: '#6366f1' },
                  { icon: '🔧', label: 'กำลังดำเนินการ', key: 'กำลังดำเนินการ', color: '#3b82f6' },
                  { icon: '📦', label: 'รอชิ้นส่วน', key: 'รอชิ้นส่วน', color: '#f59e0b' },
                  { icon: '✅', label: 'เสร็จสิ้น', key: 'เสร็จสิ้น', color: '#10b981' },
                  { icon: '❌', label: 'ยกเลิก', key: 'ยกเลิก', color: '#ef4444' },
                ].map(status => {
                  const statuses = settings?.lineEnabledStatuses ? settings.lineEnabledStatuses.split(',').map((s: string) => s.trim()) : [];
                  const enabled = statuses.includes(status.key);
                  return (
                    <Chip
                      key={status.key}
                      icon={<Box component="span" sx={{ fontSize: '0.9rem' }}>{status.icon}</Box>}
                      label={status.label}
                      variant={enabled ? 'filled' : 'outlined'}
                      color={enabled ? 'success' : 'default'}
                      onClick={() => {
                        const newStatuses = enabled ? statuses.filter((s: string) => s !== status.key) : [...statuses, status.key];
                        setSettings({ ...settings, lineEnabledStatuses: newStatuses.join(',') });
                      }}
                      sx={{ cursor: 'pointer', fontWeight: 600, borderRadius: 2, height: 32 }}
                    />
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {/* ── History Log ── */}
          <Card sx={{ borderRadius: 2.5 }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotificationsIcon size={18} color="#6366f1" />
                <Typography variant="subtitle2" fontWeight={700}>ประวัติการแจ้งเตือนล่าสุด (30)</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={`ทั้งหมด ${logTotal}`} size="small" variant="outlined" />
                <IconButton size="small" onClick={fetchLogs} disabled={logLoading}>
                  <RefreshIcon size={16} />
                </IconButton>
              </Box>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>เวลา</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>Channel</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>ผู้รับ</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>หัวข้อ</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>RequestID</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>สถานะ</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>ข้อผิดพลาด</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logLoading ? (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>ไม่มีประวัติการแจ้งเตือน</TableCell></TableRow>
                  ) : logs.map((log: any) => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell>
                        <Chip label={log.channel === 'EMAIL' ? 'email' : log.channel === 'TEAMS' ? 'teams' : log.channel} size="small" variant="outlined"
                          sx={{ fontSize: '0.65rem', height: 20, bgcolor: log.channel === 'EMAIL' ? '#fef3c7' : log.channel === 'TEAMS' ? '#eef2ff' : '#f0fdf4', border: 'none' }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.recipient || '-'}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.eventType || '-'}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{log.requestNo || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={log.status === 'PENDING' ? 'รอส่ง' : log.status === 'SENT' ? 'sent' : 'failed'}
                          size="small"
                          color={log.status === 'SENT' ? 'success' : log.status === 'FAILED' ? 'error' : 'warning' as any}
                          sx={{ fontSize: '0.65rem', height: 20, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.lastError || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      </TabPanel>

      {/* ── Tab 3: Templates ── */}
      <TabPanel value={tabValue} index={3}>
        <EmailTemplateEditor templates={templates} setTemplates={setTemplates} onSaveTemplate={handleSaveTemplate} />
      </TabPanel>

      {/* ── Tab 4: Security ── */}
      <TabPanel value={tabValue} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>นโยบายรหัสผ่าน</Typography>
                <FormControlLabel control={<Switch checked={settings?.requireStrongPassword ?? true} onChange={(e) => setSettings({ ...settings, requireStrongPassword: e.target.checked })} />} label="บังคับใช้รหัสผ่านที่ซับซ้อน (Strong Password)" />
                <TextField label="อายุรหัสผ่าน (วัน)" type="number" fullWidth size="small" value={settings?.passwordExpiryDays || '90'} onChange={(e) => setSettings({ ...settings, passwordExpiryDays: e.target.value })} sx={{ mt: 2 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>การจัดการเซสชัน</Typography>
                <TextField label="หมดอายุเซสชัน (ชั่วโมง)" type="number" fullWidth size="small" value={settings?.sessionTimeoutHours || '8'} onChange={(e) => setSettings({ ...settings, sessionTimeoutHours: e.target.value })} sx={{ mb: 3 }} />
                
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} color="error" sx={{ mb: 1 }}>ควบคุมเซสชันขั้นสูง</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  บังคับยกเลิกความถูกต้องของ Token สำหรับทุกเซสชันในระบบทันที ทุกคนบนระบบ (รวมถึงผู้ดูแลระบบและคุณ) จะต้องทำการลงชื่อเข้าใช้งานใหม่อีกครั้ง
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={handleForceLogoutAll}
                  disabled={loggingOutAll}
                  startIcon={loggingOutAll ? <CircularProgress size={16} color="inherit" /> : <LockIcon size={16} />}
                  sx={{ fontWeight: 700 }}
                >
                  {loggingOutAll ? 'กำลังดำเนินการ...' : 'บังคับยกเลิกเซสชันทั้งหมด'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── Tab 5: System Health ── */}
      <TabPanel value={tabValue} index={5}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" fontWeight={700}>สถานะการเชื่อมต่อระบบ</Typography>
                  <IconButton size="small" onClick={fetchPingStatus} disabled={pingLoading}>
                    <RefreshIcon size={16} />
                  </IconButton>
                </Box>
                {pingLoading && !pingResult ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
                ) : (
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, border: '1px solid #f1f5f9', borderRadius: 2 }}>
                      {pingResult?.database?.status === 'ok' ? (
                        <CheckCircleIcon color="success" size={24} />
                      ) : (
                        <AlertTriangleIcon color="error" size={24} />
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700}>ฐานข้อมูล Database</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {pingResult?.database?.message || 'กำลังตรวจสอบ...'}
                          {pingResult?.database?.latency !== undefined && ` (${pingResult.database.latency} ms)`}
                        </Typography>
                      </Box>
                      <Chip label={pingResult?.database?.status === 'ok' ? 'ONLINE' : 'OFFLINE'} size="small" color={pingResult?.database?.status === 'ok' ? 'success' : 'error'} />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, border: '1px solid #f1f5f9', borderRadius: 2 }}>
                      {pingResult?.ldap?.status === 'ok' ? (
                        <CheckCircleIcon color="success" size={24} />
                      ) : (
                        <AlertTriangleIcon color="error" size={24} />
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700}>Active Directory / LDAP</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {pingResult?.ldap?.message || 'กำลังตรวจสอบ...'}
                          {pingResult?.ldap?.latency !== undefined && ` (${pingResult.ldap.latency} ms)`}
                        </Typography>
                      </Box>
                      <Chip label={pingResult?.ldap?.status === 'ok' ? 'ONLINE' : 'OFFLINE'} size="small" color={pingResult?.ldap?.status === 'ok' ? 'success' : 'error'} />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, border: '1px solid #f1f5f9', borderRadius: 2 }}>
                      {pingResult?.smtp?.status === 'ok' ? (
                        <CheckCircleIcon color="success" size={24} />
                      ) : (
                        <AlertTriangleIcon color="error" size={24} />
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700}>SMTP Mail Server</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {pingResult?.smtp?.message || 'กำลังตรวจสอบ...'}
                          {pingResult?.smtp?.latency !== undefined && ` (${pingResult.smtp.latency} ms)`}
                        </Typography>
                      </Box>
                      <Chip label={pingResult?.smtp?.status === 'ok' ? 'ONLINE' : 'OFFLINE'} size="small" color={pingResult?.smtp?.status === 'ok' ? 'success' : 'error'} />
                    </Box>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>ข้อมูลเซิร์ฟเวอร์</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>เวอร์ชันระบบ: <strong>2.0.0</strong></Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>โหมดการรัน: <strong>{process.env.NODE_ENV || 'development'}</strong></Typography>
                <Typography variant="body2">สถานะระบบ: <strong>กำลังทำงาน (Running)</strong></Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── Tab 6: Data Management ── */}
      <TabPanel value={tabValue} index={6}>
        <Grid container spacing={3}>
          {/* Backup Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <DownloadIcon size={24} color="#0ea5e9" />
                  <Typography variant="h6" fontWeight={700}>ดาวน์โหลดข้อมูลสำรอง (Backup)</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  ดาวน์โหลดข้อมูลทรัพย์สินทั้งหมด รวมถึงหมวดหมู่, บริษัท, ผู้ขาย, สถานที่ และประเภทอุปกรณ์ ในรูปแบบไฟล์ JSON
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={backingUp ? <CircularProgress size={18} /> : <DownloadIcon size={18} />}
                  onClick={async () => {
                    setBackingUp(true);
                    try {
                      const response = await adminAPI.backup();
                      const blob = new Blob([response.data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', `assethub-backup-${new Date().toISOString().split('T')[0]}.json`);
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      URL.revokeObjectURL(url);
                      toast.success('ดาวน์โหลดข้อมูลสำรองสำเร็จ');
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาด');
                    } finally {
                      setBackingUp(false);
                    }
                  }}
                  disabled={backingUp}
                >
                  {backingUp ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลด Backup'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Restore Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <UploadIcon size={24} color="#f59e0b" />
                  <Typography variant="h6" fontWeight={700}>กู้คืนข้อมูล (Restore)</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  อัปโหลดไฟล์ JSON Backup เพื่อกู้คืนข้อมูลทรัพย์สิน
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button variant="outlined" component="label" sx={{ flexShrink: 0 }}>
                    เลือกไฟล์
                    <input type="file" hidden accept=".json" onChange={(e) => setRestoreFile(e.target.files?.[0] || null)} />
                  </Button>
                  {restoreFile && (
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
                      {restoreFile.name}
                    </Typography>
                  )}
                </Box>
                <Button
                  variant="contained"
                  color="warning"
                  sx={{ mt: 2 }}
                  startIcon={restoring ? <CircularProgress size={18} /> : <UploadIcon size={18} />}
                  onClick={async () => {
                    if (!restoreFile) { toast.error('กรุณาเลือกไฟล์ Backup ก่อน'); return; }
                    setRestoring(true);
                    try {
                      const res = await adminAPI.restore(restoreFile);
                      toast.success(res.data.message || 'กู้คืนข้อมูลสำเร็จ');
                      setRestoreFile(null);
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาด');
                    } finally {
                      setRestoring(false);
                    }
                  }}
                  disabled={restoring || !restoreFile}
                >
                  {restoring ? 'กำลังกู้คืน...' : 'กู้คืนข้อมูล'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Clear Data Card */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2.5, border: '2px solid #fecaca' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <TrashIcon size={24} color="#dc2626" />
                  <Typography variant="h6" fontWeight={700} color="error">ล้างข้อมูลทะเบียนทรัพย์สิน</Typography>
                </Box>
                <Alert severity="error" sx={{ mb: 2 }}>
                  <strong>คำเตือน:</strong> ฟีเจอร์นี้อนุญาตให้เลือกลบข้อมูลต่างๆ ในระบบได้อย่างอิสระ <strong>การดำเนินการนี้ไม่สามารถย้อนกลับได้</strong>
                </Alert>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  แนะนำให้ดาวน์โหลด Backup ก่อนดำเนินการทุกครั้ง
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={clearing ? <CircularProgress size={18} /> : <TrashIcon size={18} />}
                  onClick={() => {
                    setAdvancedClearDialogOpen(true);
                    setConfirmText('');
                    setClearOptions({ clearAssets: true, clearBorrow: false, clearDonations: false, clearMasterData: false, clearUsers: false });
                  }}
                  disabled={clearing}
                >
                  {clearing ? 'กำลังลบข้อมูล...' : 'ลบข้อมูลขั้นสูง (Advanced Clear)'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Selective Delete Card */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <TrashIcon size={24} color="#dc2626" />
                  <Typography variant="h6" fontWeight={700} color="error">เลือกลบทรัพย์สินทีละรายการ</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  ค้นหาและเลือกทรัพย์สินที่ต้องการลบ (แสดงสูงสุด 500 รายการ)
                </Typography>

                {/* Delete by type section */}
                {deviceTypes.length > 0 && (
                  <Box sx={{ mb: 3, p: 2, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrashIcon size={16} color="#dc2626" /> ลบตามประเภท
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                      {deviceTypes.map((t: any) => (
                        <Paper
                          key={t.name}
                          variant="outlined"
                          sx={{
                            px: 1.5, py: 1, borderRadius: 2,
                            display: 'flex', alignItems: 'center', gap: 1.5,
                            bgcolor: '#fff', minWidth: 180,
                          }}
                        >
                          <Typography variant="body2" fontWeight={600} sx={{ flex: 1, fontSize: '0.8rem' }}>
                            {t.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                            {typeCounts[t.name] ?? '...'} รายการ
                          </Typography>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ minWidth: 0, px: 1, fontSize: '0.7rem' }}
                            disabled={!typeCounts[t.name] || typeCounts[t.name] === 0 || typeDeleting}
                            onClick={() => { setTypeToDelete(t.name); setTypeDeleteDialogOpen(true); }}
                          >
                            ลบ
                          </Button>
                        </Paper>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Search + Actions */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    placeholder="ค้นหาทรัพย์สิน..."
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') fetchAssetList(assetSearch); }}
                    slotProps={{ input: { startAdornment: <SearchIcon size={16} style={{ marginRight: 8, color: '#94a3b8' }} /> } }}
                    sx={{ minWidth: 280 }}
                  />
                  <Button size="small" variant="outlined" onClick={() => fetchAssetList(assetSearch)} disabled={assetListLoading}>
                    ค้นหา
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => { setAssetSearch(''); fetchAssetList(); }} disabled={assetListLoading}>
                    ล้าง
                  </Button>
                  <Box sx={{ flex: 1 }} />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      if (selectedIds.length === assetList.length) {
                        setSelectedIds([]);
                      } else {
                        setSelectedIds(assetList.map((a: any) => a.id));
                      }
                    }}
                    disabled={assetList.length === 0}
                  >
                    {selectedIds.length === assetList.length && assetList.length > 0 ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    startIcon={bulkDeleting ? <CircularProgress size={16} color="inherit" /> : <TrashIcon size={16} />}
                    onClick={() => setBulkDeleteDialogOpen(true)}
                    disabled={selectedIds.length === 0 || bulkDeleting}
                  >
                    {bulkDeleting ? 'กำลังลบ...' : `ลบ ${selectedIds.length} รายการ`}
                  </Button>
                </Box>

                {/* Asset Table */}
                <TableContainer sx={{ maxHeight: 420, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" sx={{ bgcolor: '#f8fafc' }}>
                          <Checkbox
                            checked={assetList.length > 0 && selectedIds.length === assetList.length}
                            indeterminate={selectedIds.length > 0 && selectedIds.length < assetList.length}
                            onChange={() => {
                              if (selectedIds.length === assetList.length) {
                                setSelectedIds([]);
                              } else {
                                setSelectedIds(assetList.map((a: any) => a.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: '#f8fafc' }}>ID</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: '#f8fafc' }}>เลขครุภัณฑ์</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: '#f8fafc' }}>ชื่อทรัพย์สิน</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: '#f8fafc' }}>Serial No.</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: '#f8fafc' }}>ประเภท</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: '#f8fafc' }}>สถานะ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {assetListLoading ? (
                        <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
                      ) : assetList.length === 0 ? (
                        <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>ไม่พบรายการทรัพย์สิน</TableCell></TableRow>
                      ) : assetList.map((asset: any) => (
                        <TableRow
                          key={asset.id}
                          hover
                          selected={selectedIds.includes(asset.id)}
                          sx={{ cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedIds(prev =>
                              prev.includes(asset.id)
                                ? prev.filter((id) => id !== asset.id)
                                : [...prev, asset.id]
                            );
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox checked={selectedIds.includes(asset.id)} />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{asset.id}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{asset.assetCode || '-'}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.assetName}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{asset.serialNo || '-'}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{asset.type || '-'}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{asset.status || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {assetList.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {assetList.length} รายการ · เลือก {selectedIds.length} รายการ
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── Confirmation Dialog for Advanced Clear Data ── */}
      <Dialog open={advancedClearDialogOpen} onClose={() => setAdvancedClearDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AlertTriangleIcon size={24} /> ลบข้อมูลขั้นสูง (Advanced Clear Data)
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ mb: 2, fontWeight: 500 }}>
            ฟีเจอร์นี้อนุญาตให้เลือกลบข้อมูลต่างๆ ในระบบได้อย่างอิสระ โปรดเลือกส่วนที่ต้องการลบ:
          </DialogContentText>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
            <FormControlLabel 
              control={<Checkbox checked={clearOptions.clearAssets} onChange={(e) => setClearOptions({ ...clearOptions, clearAssets: e.target.checked })} />} 
              label="1. ลบข้อมูลทรัพย์สิน และประวัติการซ่อมบำรุง / PM" 
            />
            <FormControlLabel 
              control={<Checkbox checked={clearOptions.clearBorrow} onChange={(e) => setClearOptions({ ...clearOptions, clearBorrow: e.target.checked })} />} 
              label="2. ลบประวัติการยืม-คืนทั้งหมด" 
            />
            <FormControlLabel 
              control={<Checkbox checked={clearOptions.clearDonations} onChange={(e) => setClearOptions({ ...clearOptions, clearDonations: e.target.checked })} />} 
              label="3. ลบประวัติและใบงานการบริจาคทั้งหมด" 
            />
            <FormControlLabel 
              control={<Checkbox checked={clearOptions.clearMasterData} onChange={(e) => setClearOptions({ ...clearOptions, clearMasterData: e.target.checked })} />} 
              label="4. ลบข้อมูลพื้นฐานของบริษัท (Master Data เช่น สาขา แผนก ผู้จำหน่าย หมวดหมู่)" 
            />
            <FormControlLabel 
              control={<Checkbox checked={clearOptions.clearUsers} onChange={(e) => setClearOptions({ ...clearOptions, clearUsers: e.target.checked })} color="error" />} 
              label="5. ลบผู้ใช้งานทั้งหมด (ยกเว้นบัญชีที่คุณใช้อยู่)" 
              sx={{ color: 'error.main' }}
            />
          </Box>

          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>การแจ้งเตือน:</strong> ข้อมูลที่ถูกลบไปแล้วจะไม่สามารถกู้คืนได้ หากไม่มีไฟล์ Backup
          </Alert>

          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
            หากท่านแน่ใจ กรุณาพิมพ์คำว่า <strong>CONFIRM</strong> ในช่องด้านล่างเพื่อยืนยัน:
          </Typography>
          <TextField 
            fullWidth 
            size="small" 
            placeholder="พิมพ์ CONFIRM" 
            value={confirmText} 
            onChange={(e) => setConfirmText(e.target.value)} 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdvancedClearDialogOpen(false)} color="inherit">ยกเลิก</Button>
          <Button
            onClick={async () => {
              if (confirmText !== 'CONFIRM') {
                toast.error('กรุณาพิมพ์ CONFIRM ให้ถูกต้อง');
                return;
              }
              setAdvancedClearDialogOpen(false);
              setClearing(true);
              try {
                const res = await adminAPI.advancedClearData(clearOptions);
                toast.success(res.data.message || 'ล้างข้อมูลเรียบร้อย');
              } catch (err: any) {
                toast.error(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาด');
              } finally {
                setClearing(false);
              }
            }}
            color="error"
            variant="contained"
            disabled={clearing || confirmText !== 'CONFIRM' || (!clearOptions.clearAssets && !clearOptions.clearBorrow && !clearOptions.clearDonations && !clearOptions.clearMasterData && !clearOptions.clearUsers)}
          >
            ยืนยัน ลบข้อมูลที่เลือก
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirmation Dialog for Bulk Delete ── */}
      <Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)}>
        <DialogTitle>ยืนยันการลบทรัพย์สิน</DialogTitle>
        <DialogContent>
          <DialogContentText>
            คุณแน่ใจหรือไม่ที่จะลบทรัพย์สินที่เลือก {selectedIds.length} รายการ?
          </DialogContentText>
          <Alert severity="error" sx={{ mt: 2 }}>
            <strong>การดำเนินการนี้ไม่สามารถย้อนกลับได้</strong>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialogOpen(false)} color="inherit">ยกเลิก</Button>
          <Button onClick={handleBulkDelete} color="error" variant="contained" disabled={bulkDeleting}>
            {bulkDeleting ? 'กำลังลบ...' : 'ยืนยัน ลบข้อมูล'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirmation Dialog for Delete by Type ── */}
      <Dialog open={typeDeleteDialogOpen} onClose={() => setTypeDeleteDialogOpen(false)}>
        <DialogTitle>ยืนยันการลบทรัพย์สินตามประเภท</DialogTitle>
        <DialogContent>
          <DialogContentText>
            คุณแน่ใจหรือไม่ที่จะลบทรัพย์สินประเภท <strong>{typeToDelete}</strong> ทั้งหมด <strong>{typeCounts[typeToDelete] ?? 0}</strong> รายการ?
          </DialogContentText>
          <Alert severity="error" sx={{ mt: 2 }}>
            <strong>การดำเนินการนี้ไม่สามารถย้อนกลับได้</strong>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTypeDeleteDialogOpen(false)} color="inherit">ยกเลิก</Button>
          <Button onClick={handleDeleteByType} color="error" variant="contained" disabled={typeDeleting}>
            {typeDeleting ? 'กำลังลบ...' : 'ยืนยัน ลบทั้งหมด'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Bottom Save bar (Standard) ── */}
      {!isDirty() && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="contained" size="large" startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />} onClick={handleSave} disabled={saving}>
            บันทึกการตั้งค่าทั้งหมด
          </Button>
        </Box>
      )}

      </Box>

      {/* ── Modern Premium Floating Sticky Save Bar (Triggered when dirty) ── */}
      {isDirty() && (
        <Paper
          elevation={10}
          sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1100,
            width: 'calc(100% - 48px)',
            maxWidth: 800,
            p: 2,
            borderRadius: 4,
            bgcolor: 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AlertTriangleIcon color="#f59e0b" size={20} />
            <Typography variant="body2" fontWeight={600}>คุณมีการเปลี่ยนแปลงการตั้งค่าที่ยังไม่ได้บันทึก</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="text"
              sx={{ color: '#cbd5e1', '&:hover': { color: '#fff' } }}
              onClick={() => setSettings(JSON.parse(JSON.stringify(originalSettings)))}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon size={16} />}
              onClick={handleSave}
              disabled={saving}
              sx={{ px: 3, fontWeight: 700, borderRadius: 2 }}
            >
              บันทึกการเปลี่ยนแปลง
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
