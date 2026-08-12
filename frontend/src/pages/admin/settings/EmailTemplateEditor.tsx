import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, Chip, useTheme,
} from '@mui/material';
import { Save } from 'lucide-react';
import { adminAPI } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { NotificationTemplate } from './types';

const EVENT_LABELS: Record<string, string> = {
  borrow_request_pending: 'มีคำขอยืมใหม่', borrow_approved: 'อนุมัติคำขอยืม', borrow_rejected: 'ปฏิเสธคำขอยืม',
  checkout_completed: 'ส่งมอบอุปกรณ์', return_recorded: 'คืนอุปกรณ์', overdue_borrow: 'แจ้งเตือนเกินกำหนด',
  extension_pending: 'ขอขยายวันยืม', extension_approved: 'อนุมัติขยายวัน', extension_rejected: 'ปฏิเสธขยายวัน',
};

const EVENT_ICONS: Record<string, string> = {
  borrow_request_pending: '📋', borrow_approved: '✅', borrow_rejected: '❌',
  checkout_completed: '💻', return_recorded: '🔄', overdue_borrow: '⚠️',
  extension_pending: '⏰', extension_approved: '✅', extension_rejected: '❌',
};

const TEMPLATE_GROUPS = [
  { title: 'คำขอยืม', color: '#FF6B00', keys: ['borrow_request_pending', 'borrow_approved', 'borrow_rejected'] },
  { title: 'ส่งมอบ / คืน', color: '#2563eb', keys: ['checkout_completed', 'return_recorded'] },
  { title: 'ขยายวันยืม', color: '#7c3aed', keys: ['extension_pending', 'extension_approved', 'extension_rejected'] },
  { title: 'แจ้งเตือน', color: '#f59e0b', keys: ['overdue_borrow'] },
];

const PLACEHOLDER_GROUPS = [
  { label: 'ทั่วไป', items: ['{{requestNo}}', '{{requester}}', '{{purpose}}', '{{note}}'] },
  { label: 'ส่งมอบ', items: ['{{handoverNote}}', '{{dueDate}}', '{{itemsTable}}'] },
  { label: 'คืน', items: ['{{condition}}', '{{assetCode}}'] },
  { label: 'เกินกำหนด', items: ['{{daysOverdue}}', '{{dueDate}}', '{{assetCode}}'] },
  { label: 'ขยายวัน', items: ['{{extraDays}}', '{{reason}}', '{{newDueDate}}'] },
];

interface Props {
  templates: NotificationTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<NotificationTemplate[]>>;
  onSaveTemplate: (id: number, data: { subjectTh: string; bodyTh: string }) => Promise<void>;
}

export default function EmailTemplateEditor({ templates, setTemplates, onSaveTemplate }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [localSubject, setLocalSubject] = useState('');
  const [localBody, setLocalBody] = useState('');
  const [resetting, setResetting] = useState(false);

  const editingTemplate = templates.find(t => t.id === editingId);

  const SAMPLE_DATA: Record<string, string> = {
    requestNo: 'BR-2026051501', requester: 'สมชาย ใจดี', department: 'ฝ่ายวิศวกรรม',
    purpose: 'ใช้สำหรับประชุม Project XYZ กับลูกค้า',
    notes: 'ขอยืม 3 วัน จะคืนวันศุกร์', borrowDate: '15 พฤษภาคม 2569', dueDate: '18 พฤษภาคม 2569',
    borrowDays: '3', itemsCount: '2', handoverNote: 'นำเครื่องมารับที่แผนก IT ชั้น 2',
    condition: 'ปกติ', assetCode: 'TRRHQ-NB-1011', serialNo: 'HRVYBB4', brand: 'Dell', model: 'Pro 16 PC16250',
    damageNote: '-', accessoriesNote: 'ครบทุกชิ้น', returnDate: '18 พฤษภาคม 2569',
    daysOverdue: '2', extraDays: '5', reason: 'ต้องใช้งานต่อสำหรับทำรายงานสรุปโครงการ',
    oldDueDate: '18 พฤษภาคม 2569', newDueDate: '23 พฤษภาคม 2569',
  };

  const generatePreviewHtml = (html: string) => {
    let result = html;
    const sampleNoteHtml = '<div style="background:#fef3c7;border-radius:8px;padding:14px;margin-top:16px"><p style="margin:0;color:#92400e;font-size:13px"><b>หมายเหตุ:</b> ใช้งานเสร็จแล้วจะคืนทันที</p></div>';
    const sampleItemsTable = '<table style="width:100%;border-collapse:collapse;margin-top:8px"><thead><tr><th style="background:#f1f5f9;padding:10px 12px;text-align:left;font-size:12px;color:#475569;font-weight:600;border-bottom:2px solid #e2e8f0">ทรัพย์สิน</th><th style="background:#f1f5f9;padding:10px 12px;text-align:center;font-size:12px;color:#475569;font-weight:600;border-bottom:2px solid #e2e8f0">สถานะ</th></tr></thead><tbody><tr><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px"><div style="font-weight:600;color:#1e293b">TRRHQ-NB-1011</div><div style="color:#64748b;font-size:12px">HRVYBB4 Dell Pro 16 PC16250</div></td><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center"><span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600">ส่งมอบแล้ว</span></td></tr><tr><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px"><div style="font-weight:600;color:#1e293b">TRRHQ-NB-1024</div><div style="color:#64748b;font-size:12px">3RFGPC4 Dell Pro 14 PC14250</div></td><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center"><span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600">อนุมัติ</span></td></tr></tbody></table>';
    result = result.replace(/\{\{note\}\}/g, sampleNoteHtml).replace(/\{\{itemsTable\}\}/g, sampleItemsTable);
    for (const [key, val] of Object.entries(SAMPLE_DATA)) {
      result = result.replace(new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g'), val);
    }
    return result.replace(/\{\{\w+\}\}/g, '');
  };

  const startEdit = (t: NotificationTemplate) => { setEditingId(t.id); setLocalSubject(t.subjectTh); setLocalBody(t.bodyTh); };

  const handleSaveLocal = () => {
    if (editingTemplate) { onSaveTemplate(editingTemplate.id, { subjectTh: localSubject, bodyTh: localBody }); setEditingId(null); }
  };

  const handleReset = async () => {
    if (!editingTemplate || !window.confirm('คุณต้องการรีเซ็ตเทมเพลตนี้กลับเป็นค่าเริ่มต้นใช่หรือไม่?')) return;
    setResetting(true);
    try {
      const res = await adminAPI.resetNotificationTemplate(editingTemplate.id);
      setLocalSubject(res.data.subjectTh); setLocalBody(res.data.bodyTh);
      toast.success('รีเซ็ตกลับเป็นค่าเริ่มต้นเรียบร้อย (กรุณากด บันทึก เพื่อยืนยันการบันทึก)');
    } catch { toast.error('คืนค่าเริ่มต้นไม่สำเร็จ'); }
    finally { setResetting(false); }
  };

  const insertPlaceholder = (p: string) => setLocalBody(prev => prev + p);

  const emailTemplates = templates.filter(t => t.channel === 'EMAIL');

  if (editingId !== null && editingTemplate) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" onClick={() => setEditingId(null)}>← กลับ</Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: `${TEMPLATE_GROUPS.find(g => g.keys.includes(editingTemplate.key))?.color || '#2563eb'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              {EVENT_ICONS[editingTemplate.key]}
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>{EVENT_LABELS[editingTemplate.key]}</Typography>
              <Typography variant="caption" color="text.secondary">{editingTemplate.key} • EMAIL</Typography>
            </Box>
          </Box>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" color="error" onClick={handleReset} disabled={resetting}>{resetting ? 'กำลังรีเซ็ต...' : 'คืนค่าเริ่มต้น'}</Button>
            <Button variant="outlined" size="small" onClick={() => setEditingId(null)}>ยกเลิก</Button>
            <Button variant="contained" size="small" startIcon={<Save size={16} />} onClick={handleSaveLocal}>บันทึก</Button>
          </Box>
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={6}>
            <Card>
              <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.8rem' }}>HTML Template</Typography>
              </Box>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>หัวข้ออีเมล</Typography>
                <TextField fullWidth size="small" value={localSubject} onChange={e => setLocalSubject(e.target.value)} sx={{ mb: 2 }} InputProps={{ sx: { fontSize: '0.85rem' } }} />
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>เนื้อหา HTML</Typography>
                <TextField fullWidth multiline rows={16} value={localBody} onChange={e => setLocalBody(e.target.value)} sx={{ mb: 2, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 1.5 } }} />
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>แทรกตัวแปร</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {PLACEHOLDER_GROUPS.map(group => (
                    <Box key={group.label}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>{group.label}</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {group.items.map(p => (
                          <Chip key={p} label={p} size="small" variant="outlined" onClick={() => insertPlaceholder(p)} sx={{ cursor: 'pointer', fontSize: '0.65rem', height: 22, borderRadius: 1 }} />
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
              <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'secondary.main' }} />
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.8rem' }}>ตัวอย่างอีเมล (Preview)</Typography>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>ข้อมูลตัวอย่าง</Typography>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Box sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', bgcolor: '#fff' }}>
                  <iframe key={localBody.substring(0, 50) + localSubject} srcDoc={generatePreviewHtml(localBody)} title="Email Preview" style={{ width: '100%', height: '600px', border: 'none', display: 'block' }} sandbox="allow-same-origin" />
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
        const groupTemplates = group.keys.map(key => emailTemplates.find(t => t.key === key)).filter((t): t is NotificationTemplate => t !== undefined);
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
                  <Card sx={{ cursor: 'pointer', transition: 'all 0.2s', border: '1px solid', borderColor: 'divider', '&:hover': { borderColor: group.color, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' } }} onClick={() => startEdit(t)}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: `${group.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>{EVENT_ICONS[t.key]}</Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{EVENT_LABELS[t.key]}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>{t.key}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ bgcolor: 'action.hover', borderRadius: 1.5, p: 1.5, mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontSize: '0.65rem' }}>หัวข้อ:</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subjectTh}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}><Chip label="แก้ไข" size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 24 }} /></Box>
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
