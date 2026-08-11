import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Chip,
  Card,
  Snackbar,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import NotesIcon from '@mui/icons-material/Notes';
import StarIcon from '@mui/icons-material/Star';
import ListIcon from '@mui/icons-material/List';
import MonitorIcon from '@mui/icons-material/Monitor';
import PrintIcon from '@mui/icons-material/Print';
import BuildIcon from '@mui/icons-material/Build';
import BoltIcon from '@mui/icons-material/Bolt';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import PersonIcon from '@mui/icons-material/Person';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import LockIcon from '@mui/icons-material/Lock';
import ExtensionIcon from '@mui/icons-material/Extension';
import ComputerIcon from '@mui/icons-material/Computer';
import PushPinIcon from '@mui/icons-material/PushPin';
import { alpha } from '@mui/material/styles';
import { pmAPI } from '../../services/api';
import { Modal } from './components/Modal';

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */
type ItemType = 'boolean' | 'text' | 'rating' | 'select' | 'monitor_array' | 'printer_array' | 'select_physical' | 'select_speed' | 'select_result';

interface TemplateItem {
  id?: number;
  key: string;
  label: string;
  type: ItemType;
  group: string;
  required: boolean;
  options?: string; // for select type
  order: number;
}

interface Template {
  id?: number;
  name: string;
  description: string;
  templateItems: TemplateItem[];
}

const TYPE_LABELS: Record<ItemType, { label: string; icon: React.ElementType; desc: string }> = {
  boolean: { label: 'ใช่ / ไม่ใช่ / N/A', icon: CheckBoxIcon, desc: 'ตอบ Yes / No / N/A' },
  text:    { label: 'ข้อความ', icon: NotesIcon, desc: 'กรอกข้อความอิสระ' },
  rating:  { label: 'คะแนนดาว', icon: StarIcon, desc: 'ให้คะแนน 1–5 ดาว' },
  select:  { label: 'เลือกรายการ (แบบกำหนดเอง)', icon: ListIcon, desc: 'Dropdown เลือกรายการ' },
  monitor_array: { label: 'บันทึกจอมอนิเตอร์', icon: MonitorIcon, desc: 'เพิ่มข้อมูลจอมอนิเตอร์ (หลายจอได้)' },
  printer_array: { label: 'บันทึกเครื่องพิมพ์', icon: PrintIcon, desc: 'เพิ่มข้อมูลเครื่องพิมพ์ (หลายเครื่องได้)' },
  select_physical: { label: 'Dropdown: สภาพอุปกรณ์ทางกายภาพ', icon: BuildIcon, desc: 'สภาพปกติ / ชำรุดเล็กน้อย / ชำรุดรอซ่อม / หมดสภาพ' },
  select_speed: { label: 'Dropdown: ประสิทธิภาพความเร็วเครื่อง', icon: BoltIcon, desc: 'เร็วปกติ / เริ่มหน่วงหนืด / ช้ามาก' },
  select_result: { label: 'Dropdown: สรุปผลการตรวจ PM', icon: GpsFixedIcon, desc: 'ผ่านเกณฑ์ / แก้ไขเรียบร้อย / ไม่ผ่านเกณฑ์' }
};

const DEFAULT_GROUPS = ['user', 'os', 'security', 'agent', 'hardware', 'result', 'other'];
const GROUP_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  user: { label: 'ข้อมูลผู้ใช้', icon: PersonIcon },
  os: { label: 'OS & Software', icon: DesktopWindowsIcon },
  security: { label: 'ความปลอดภัย', icon: LockIcon },
  agent: { label: 'Agent/Tools', icon: ExtensionIcon },
  hardware: { label: 'Hardware', icon: ComputerIcon },
  result: { label: 'ผลการประเมิน', icon: StarIcon },
  other: { label: 'อื่นๆ', icon: PushPinIcon },
};

const DEFAULT_ITEMS: TemplateItem[] = [
  { key: 'computer_name', label: 'ตรวจสอบ Computer Name', type: 'boolean', group: 'user', required: true, order: 1 },
  { key: 'change_name', label: 'เปลี่ยน Computer Name (ถ้าไม่ตรงมาตรฐาน)', type: 'boolean', group: 'user', required: false, order: 2 },
  { key: 'ip_phone', label: 'ตรวจสอบ IP Phone', type: 'boolean', group: 'user', required: false, order: 3 },
  { key: 'windows_version', label: 'ตรวจสอบ Windows Version & Activate', type: 'boolean', group: 'os', required: true, order: 4 },
  { key: 'windows_update', label: 'ตรวจสอบ Windows Update (winver)', type: 'boolean', group: 'os', required: true, order: 5 },
  { key: 'office_check', label: 'ตรวจสอบ Microsoft Office & Activate', type: 'boolean', group: 'os', required: true, order: 6 },
  { key: 'antivirus', label: 'อัปเดต Antivirus', type: 'boolean', group: 'os', required: true, order: 7 },
  { key: 'change_password', label: 'เปลี่ยน Password Local Admin', type: 'boolean', group: 'security', required: true, order: 8 },
  { key: 'usb_policy', label: 'ตรวจสอบ USB Policy', type: 'boolean', group: 'security', required: true, order: 9 },
  { key: 'glpi_agent', label: 'ติดตั้ง GLPI Agent v1.6/1.7', type: 'boolean', group: 'agent', required: true, order: 10 },
  { key: 'spiceworks', label: 'ติดตั้ง Spiceworks Agent', type: 'boolean', group: 'agent', required: false, order: 11 },
  { key: 'pc_audit', label: 'PC Audit (Hardware spec)', type: 'boolean', group: 'agent', required: true, order: 12 },
  { key: 'hw_info', label: 'HW Info (Serial, Service Tag)', type: 'boolean', group: 'agent', required: true, order: 13 },
  { key: 'cleaning', label: 'ทำความสะอาดอุปกรณ์', type: 'boolean', group: 'hardware', required: true, order: 14 },
  { key: 'printer', label: 'ตรวจสอบ Printer Local', type: 'printer_array', group: 'hardware', required: false, order: 15 },
  { key: 'ups', label: 'ตรวจสอบ UPS', type: 'boolean', group: 'hardware', required: false, order: 16 },
  { key: 'monitor', label: 'บันทึกข้อมูลจอมอนิเตอร์', type: 'monitor_array', group: 'hardware', required: false, order: 17 },
  { key: 'issue_note', label: 'ปัญหาที่พบ / ข้อเสนอแนะ', type: 'text', group: 'result', required: false, order: 18 },
  { key: 'satisfaction', label: 'ประเมินคุณภาพและประสิทธิภาพโดยรวมของเครื่อง (1-5 ดาว)', type: 'rating', group: 'result', required: false, order: 19 },
  { key: 'staff_name', label: 'เจ้าหน้าที่ผู้ทำ PM', type: 'text', group: 'result', required: true, order: 20 },
];

/* ─────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────── */
export default function PMTemplatePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [templateModal, setTemplateModal] = useState<{ open: boolean; template: Template | null }>({ open: false, template: null });
  const [editingTemplate, setEditingTemplate] = useState<Template>({ name: '', description: '', templateItems: [] });
  const [previewModal, setPreviewModal] = useState<{ open: boolean; template: Template | null }>({ open: false, template: null });
  const [deleteConfirm, setDeleteConfirm] = useState<Template | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const fetchTemplates = () => {
    setLoading(true);
    pmAPI.templates().then(res => setTemplates(res.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchTemplates(); }, []);

  /* ── Open create ── */
  const openCreate = () => {
    setEditingTemplate({ name: '', description: '', templateItems: DEFAULT_ITEMS.map((i, idx) => ({ ...i, order: idx + 1 })) });
    setTemplateModal({ open: true, template: null });
  };

  /* ── Open edit ── */
  const openEdit = (t: Template) => {
    setEditingTemplate({ ...t, templateItems: [...(t.templateItems || [])] });
    setTemplateModal({ open: true, template: t });
  };

  const handleSave = async () => {
    if (!editingTemplate.name.trim()) { showToast('⚠️ กรุณาระบุชื่อ Template'); return; }
    if (editingTemplate.templateItems.length === 0) { showToast('⚠️ ต้องมีรายการ Checklist อย่างน้อย 1 ข้อ'); return; }
    setSaving(true);
    try {
      const payload = {
        name: editingTemplate.name.trim(),
        description: editingTemplate.description?.trim() || '',
        items: editingTemplate.templateItems.map((item, idx) => ({
          ...item,
          order: idx + 1,
        })),
      };

      const isEdit = Boolean(templateModal.template?.id);
      if (isEdit) {
        // PUT — update existing template
        await pmAPI.updateTemplate(templateModal.template!.id!, payload);
        showToast(`✅ อัปเดต Template "${editingTemplate.name}" สำเร็จ`);
      } else {
        // POST — create new template
        await pmAPI.createTemplate(payload);
        showToast(`✅ สร้าง Template "${editingTemplate.name}" สำเร็จ`);
      }

      setTemplateModal({ open: false, template: null });
      fetchTemplates();
    } catch (err: any) {
      showToast(`❌ ${err.response?.data?.error || err.message || 'บันทึกไม่สำเร็จ'}`);
    } finally { setSaving(false); }
  };

  /* ── Item management ── */
  const addItem = () => {
    const newItem: TemplateItem = {
      key: `item_${Date.now()}`, label: '', type: 'boolean', group: 'other', required: false,
      order: editingTemplate.templateItems.length + 1,
    };
    setEditingTemplate(p => ({ ...p, templateItems: [...p.templateItems, newItem] }));
  };

  const updateItem = (idx: number, field: keyof TemplateItem, val: any) => {
    setEditingTemplate(p => {
      const items = [...p.templateItems];
      items[idx] = { ...items[idx], [field]: val };
      return { ...p, templateItems: items };
    });
  };

  const removeItem = (idx: number) => {
    setEditingTemplate(p => ({ ...p, templateItems: p.templateItems.filter((_, i) => i !== idx) }));
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= editingTemplate.templateItems.length) return;
    setEditingTemplate(p => {
      const items = [...p.templateItems];
      [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
      return { ...p, templateItems: items };
    });
  };

  /* ── Load default ── */
  const loadDefaults = () => {
    setEditingTemplate(p => ({ ...p, templateItems: DEFAULT_ITEMS.map((i, idx) => ({ ...i, order: idx + 1 })) }));
    showToast('📋 โหลด Template มาตรฐาน IT PM 20 ข้อสำเร็จ');
  };

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: (t) => alpha(t.palette.warning.main, t.palette.mode === 'dark' ? 0.16 : 0.12), border: '1px solid', borderColor: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DescriptionIcon color="warning" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>PM Template (Checklist)</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>สร้างและจัดการรายการตรวจสอบ PM แบบ Customize</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>สร้าง Template ใหม่</Button>
      </Box>

      {/* ── Template list ── */}
      {loading ? (
        <Box sx={{ textAlign: 'center', p: 5, color: 'primary.main' }}>กำลังโหลด...</Box>
      ) : templates.length === 0 ? (
        <Card variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <DescriptionIcon sx={{ fontSize: 40, mb: 1.5, color: 'text.disabled' }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>ยังไม่มี PM Template</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5, mb: 2.5 }}>สร้าง Template แรกพร้อม Checklist 20 ข้อมาตรฐาน IT PM</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>สร้าง Template ใหม่</Button>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 1.75 }}>
          {templates.map((t: any) => {
            const itemCount = t.templateItems?.length || 0;
            return (
              <Card variant="outlined" key={t.id} sx={{ overflow: 'hidden' }}>
                <Box sx={{ height: 4, bgcolor: 'primary.main' }} />
                <Box sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.25 }}>
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{t.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>{t.description || 'ไม่มีคำอธิบาย'}</Typography>
                    </Box>
                    <Chip size="small" label={`${itemCount} ข้อ`} color="info" variant="outlined" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }} />
                  </Box>

                  {/* Item type summary */}
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
                    {Object.entries(TYPE_LABELS).map(([type, info]) => {
                      const count = t.templateItems?.filter((i: any) => i.type === type).length || 0;
                      if (count === 0) return null;
                      return (
                        <Chip key={type} size="small" variant="outlined" icon={<info.icon sx={{ fontSize: 12 }} />} label={`${count} ${info.label}`} sx={{ fontSize: 10, height: 22 }} />
                      );
                    })}
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 0.75 }}>
                    <Button size="small" variant="outlined" fullWidth startIcon={<VisibilityIcon />} onClick={() => setPreviewModal({ open: true, template: t })}>
                      Preview
                    </Button>
                    <Button size="small" variant="contained" fullWidth startIcon={<EditIcon />} onClick={() => openEdit(t)}>
                      แก้ไข
                    </Button>
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {/* ── Create / Edit Template Modal ── */}
      <Modal
        open={templateModal.open}
        onClose={() => setTemplateModal({ open: false, template: null })}
        maxWidth={780}
        title={templateModal.template ? `แก้ไข Template: ${templateModal.template.name}` : 'สร้าง PM Template ใหม่'}
      >
        <Box sx={{ p: '16px 20px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Name & Description */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
            <TextField
              fullWidth
              size="small"
              label="ชื่อ Template *"
              placeholder="เช่น IT PM Standard 2568"
              value={editingTemplate.name}
              onChange={e => setEditingTemplate(p => ({ ...p, name: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="คำอธิบาย"
              placeholder="คำอธิบายสั้นๆ"
              value={editingTemplate.description}
              onChange={e => setEditingTemplate(p => ({ ...p, description: e.target.value }))}
            />
          </Box>

          {/* Toolbar */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>รายการ Checklist</Typography>
              <Chip size="small" label={`${editingTemplate.templateItems.length} ข้อ`} color="info" variant="outlined" sx={{ fontWeight: 700 }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={loadDefaults}>โหลด Template มาตรฐาน</Button>
              <Button size="small" variant="contained" color="success" startIcon={<AddCircleIcon />} onClick={addItem}>เพิ่มรายการ</Button>
            </Box>
          </Box>

          {/* Items list */}
          <Box sx={{ maxHeight: 400, overflowY: 'auto', pr: 0.25 }}>
            {editingTemplate.templateItems.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary', fontSize: 12 }}>
                กด "เพิ่มรายการ" หรือ "โหลด Template มาตรฐาน" เพื่อเริ่มต้น
              </Box>
            ) : (
              editingTemplate.templateItems.map((item, idx) => (
                <Box
                  key={idx}
                  sx={{ display: 'flex', gap: 0.75, alignItems: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', mb: 0.75 }}
                >
                  {/* Order controls */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <IconButton size="small" sx={{ p: 0.25 }} onClick={() => moveItem(idx, -1)}><ArrowUpwardIcon sx={{ fontSize: 12 }} /></IconButton>
                    <Typography sx={{ fontSize: 10, color: 'text.disabled', width: 20, textAlign: 'center' }}>{idx + 1}</Typography>
                    <IconButton size="small" sx={{ p: 0.25 }} onClick={() => moveItem(idx, 1)}><ArrowDownwardIcon sx={{ fontSize: 12 }} /></IconButton>
                  </Box>

                  {/* Label */}
                  <TextField
                    size="small"
                    sx={{ flex: 1, minWidth: 120 }}
                    placeholder="รายการตรวจสอบ..."
                    value={item.label}
                    onChange={e => updateItem(idx, 'label', e.target.value)}
                  />

                  {/* Type */}
                  <Select size="small" sx={{ width: 150 }} value={item.type} onChange={e => updateItem(idx, 'type', e.target.value as ItemType)}>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <MenuItem key={k} value={k}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><v.icon sx={{ fontSize: 14 }} /> {v.label}</Box>
                      </MenuItem>
                    ))}
                  </Select>

                  {/* Group */}
                  <Select size="small" sx={{ width: 140 }} value={item.group} onChange={e => updateItem(idx, 'group', e.target.value)}>
                    {DEFAULT_GROUPS.map(g => (
                      <MenuItem key={g} value={g}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          {React.createElement(GROUP_LABELS[g]?.icon || PushPinIcon, { sx: { fontSize: 14 } })} {GROUP_LABELS[g]?.label || g}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>

                  {/* Required */}
                  <FormControlLabel
                    sx={{ flexShrink: 0, mr: 0 }}
                    control={<Checkbox size="small" checked={item.required} onChange={e => updateItem(idx, 'required', e.target.checked)} />}
                    label={<Typography sx={{ fontSize: 11, color: 'text.secondary' }}>จำเป็น</Typography>}
                  />

                  {/* Delete */}
                  <IconButton size="small" color="error" onClick={() => removeItem(idx)}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              ))
            )}
          </Box>

          {/* Summary */}
          {editingTemplate.templateItems.length > 0 && (
            <Box sx={{ bgcolor: 'action.hover', borderRadius: 1.5, p: '10px 14px', display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {Object.entries(TYPE_LABELS).map(([type, info]) => {
                const count = editingTemplate.templateItems.filter(i => i.type === type).length;
                if (count === 0) return null;
                return (
                  <Typography key={type} sx={{ fontSize: 11, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <info.icon sx={{ fontSize: 12 }} /> {info.label}: <strong>{count}</strong>
                  </Typography>
                );
              })}
              <Typography sx={{ fontSize: 11, color: 'error.main' }}>
                จำเป็น: <strong>{editingTemplate.templateItems.filter(i => i.required).length}</strong>
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ p: '12px 20px', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="outlined" onClick={() => setTemplateModal({ open: false, template: null })}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : templateModal.template?.id ? 'อัปเดต Template' : 'บันทึก Template'}
          </Button>
        </Box>
      </Modal>

      {/* ── Preview Modal ── */}
      <Modal open={previewModal.open} onClose={() => setPreviewModal({ open: false, template: null })} maxWidth={580} title={`Preview: ${previewModal.template?.name || ''}`}>
        <Box sx={{ p: '12px 20px' }}>
          {previewModal.template?.templateItems?.map((item: any, idx: number) => {
            const gi = GROUP_LABELS[item.group] || { label: item.group, icon: PushPinIcon };
            const showGroupHeader = idx === 0 || previewModal.template!.templateItems![idx - 1]?.group !== item.group;
            const TypeIcon = TYPE_LABELS[item.type as ItemType]?.icon;
            return (
              <Box key={idx}>
                {showGroupHeader && (
                  <Box sx={{ pt: idx > 0 ? 1 : 0, pb: 0.5, fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '.06em', borderTop: idx > 0 ? '1px solid' : 'none', borderColor: 'divider', mt: idx > 0 ? 1 : 0, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <gi.icon sx={{ fontSize: 12 }} /> {gi.label}
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ fontSize: 10, color: 'text.disabled', width: 22, flexShrink: 0, textAlign: 'center', fontWeight: 700 }}>{idx + 1}</Typography>
                  <Typography sx={{ flex: 1, fontSize: 12 }}>{item.label} {item.required && <Box component="span" sx={{ color: 'error.main' }}>*</Box>}</Typography>
                  <Chip size="small" variant="outlined" icon={TypeIcon ? <TypeIcon sx={{ fontSize: 12 }} /> : undefined} label={TYPE_LABELS[item.type as ItemType]?.label || item.type || '—'} sx={{ fontSize: 10, height: 22, flexShrink: 0 }} />
                </Box>
              </Box>
            );
          })}
        </Box>
        <Box sx={{ p: '12px 20px', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={() => setPreviewModal({ open: false, template: null })}>ปิด</Button>
        </Box>
      </Modal>

      <Snackbar open={!!toast} autoHideDuration={2800} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.startsWith('❌') ? 'error' : toast.startsWith('⚠️') ? 'warning' : 'success'} variant="filled" sx={{ whiteSpace: 'nowrap' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
