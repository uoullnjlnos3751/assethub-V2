import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  Chip,
  Paper,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import ChecklistIcon from '@mui/icons-material/Checklist';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import NotesIcon from '@mui/icons-material/Notes';
import StarIcon from '@mui/icons-material/Star';
import ListIcon from '@mui/icons-material/List';
import { pmSwHubTemplateService, PMSwHubTemplateItem } from '../../services/pmSwHub';

const GROUP_OPTIONS = [
  { value: 'led_status', label: 'LED สถานะ (LED Status)' },
  { value: 'cleaning', label: 'ทำความสะอาด (Cleaning)' },
  { value: 'cable_conn', label: 'สายและ Connection (Cables and Connection)' },
  { value: 'f27_critical', label: 'F27 — Critical Systems' },
  { value: 'power', label: 'ระบบไฟฟ้าและ UPS (Power & UPS)' },
  { value: 'cooling', label: 'ระบบปรับอากาศ (Cooling & HVAC)' },
  { value: 'network', label: 'อุปกรณ์ Network (Switch / Router / Firewall)' },
  { value: 'server', label: 'เครื่องเซิร์ฟเวอร์ (Server & Storage)' },
  { value: 'rack_cable', label: 'ตู้ Rack และการจัดการสาย (Rack & Cabling)' },
  { value: 'security', label: 'ระบบรักษาความปลอดภัย (Security & Access Control)' },
  { value: 'fire', label: 'ระบบป้องกันอัคคีภัย (Fire Protection)' },
  { value: 'env', label: 'ความสะอาดและสภาพแวดล้อม (Environment)' },
  { value: 'other', label: 'อื่นๆ (Others)' },
];

const PRESETS = {
  '7': [
    { group: 'LED สถานะ (LED Status)', label: '🔴 FAULT / ALARM LED ดับทุกตัว (CRS317, Aruba, FortiGate)', key: 'led_fault_alarm', type: 'boolean', order: 1 },
    { group: 'LED สถานะ (LED Status)', label: '🔴 POWER LED ติดครบทุกตัว', key: 'led_power', type: 'boolean', order: 2 },
    { group: 'LED สถานะ (LED Status)', label: 'Port LED ผิดปกติ (Amber / ดับถาวร)', key: 'led_ports', type: 'boolean', order: 3 },
    { group: 'ทำความสะอาด (Cleaning)', label: 'เป่าฝุ่นช่อง Vent ทุกอุปกรณ์ (ระนาบ 10-15 ซม.)', key: 'cleaning_vent', type: 'boolean', order: 4 },
    { group: 'ทำความสะอาด (Cleaning)', label: 'เช็ดฝุ่นพื้น Rack และรอบตู้', key: 'cleaning_floor', type: 'boolean', order: 5 },
    { group: 'สายและ Connection (Cables and Connection)', label: 'Patch / Fiber เสียบแน่น คลิปล็อก (ไม่หักงอ)', key: 'cable_physical', type: 'boolean', order: 6 },
    { group: 'สายและ Connection (Cables and Connection)', label: 'Port ว่างมี Dust Cap (โดยเฉพาะ SFP+)', key: 'cable_dust_cap', type: 'boolean', order: 7 },
  ],
  '9': [
    { group: 'LED สถานะ (LED Status)', label: '🔴 FAULT / ALARM LED ดับทุกตัว (CRS317, Aruba, FortiGate)', key: 'led_fault_alarm', type: 'boolean', order: 1 },
    { group: 'LED สถานะ (LED Status)', label: '🔴 POWER LED ติดครบทุกตัว', key: 'led_power', type: 'boolean', order: 2 },
    { group: 'LED สถานะ (LED Status)', label: 'Port LED ผิดปกติ (Amber / ดับถาวร)', key: 'led_ports', type: 'boolean', order: 3 },
    { group: 'ทำความสะอาด (Cleaning)', label: 'เป่าฝุ่นช่อง Vent ทุกอุปกรณ์ (ระนาบ 10-15 ซม.)', key: 'cleaning_vent', type: 'boolean', order: 4 },
    { group: 'ทำความสะอาด (Cleaning)', label: 'เช็ดฝุ่นพื้น Rack และรอบตู้', key: 'cleaning_floor', type: 'boolean', order: 5 },
    { group: 'สายและ Connection (Cables and Connection)', label: 'Patch / Fiber เสียบแน่น คลิปล็อก (ไม่หักงอ)', key: 'cable_physical', type: 'boolean', order: 6 },
    { group: 'สายและ Connection (Cables and Connection)', label: 'Port ว่างมี Dust Cap (โดยเฉพาะ SFP+)', key: 'cable_dust_cap', type: 'boolean', order: 7 },
    { group: 'F27 — Critical Systems', label: '🔴 [F27] UPS APC — Online + Battery OK', key: 'f27_ups', type: 'boolean', order: 8 },
    { group: 'F27 — Critical Systems', label: '🔴 [F27] อุณหภูมิห้อง ≤ 24°C / แอร์ทำงานปกติ', key: 'f27_temp', type: 'boolean', order: 9 },
  ]
};

const TYPE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  boolean: { label: 'ใช่ / ไม่ใช่ / N/A', icon: CheckBoxIcon },
  text:    { label: 'ข้อความ', icon: NotesIcon },
  rating:  { label: 'คะแนนดาว', icon: StarIcon },
  select:  { label: 'เลือกรายการ', icon: ListIcon },
};

export default function PMSwHubTemplatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preset = searchParams.get('preset');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<PMSwHubTemplateItem[]>([]);

  useEffect(() => {
    loadTemplate();
  }, [id, preset]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      if (id && id !== 'new') {
        const data = await pmSwHubTemplateService.getById(Number(id));
        if (data) {
          setName(data.name);
          setDescription(data.description || '');
          setIsActive(data.isActive);
          setItems(data.items || []);
        }
      } else if (preset && (preset === '7' || preset === '9')) {
        setName(preset === '7' ? 'แบบมาตรฐาน (7 ข้อ)' : 'แบบเต็มรูปแบบ (9 ข้อ)');
        setItems(PRESETS[preset as keyof typeof PRESETS]);
      } else {
        setName('New Template');
        setItems([]);
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถโหลด Template ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    const newItem: PMSwHubTemplateItem = {
      group: '',
      key: `custom_${Date.now()}`,
      label: '',
      type: 'boolean',
      required: true,
      order: items.length + 1
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleChangeItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSave = async () => {
    if (!name.trim()) { alert('กรุณาระบุชื่อ Template'); return; }
    const invalid = items.find(i => !i.label.trim());
    if (invalid) { alert('กรุณาระบุชื่อรายการตรวจให้ครบทุกข้อ'); return; }

    try {
      setSaving(true);
      await pmSwHubTemplateService.save({
        id: id && id !== 'new' ? Number(id) : undefined,
        name,
        description,
        isActive,
        items
      });
      alert('บันทึก Template สำเร็จ');
      navigate('/pm/sw-hub/template');
    } catch (err) {
      console.error(err);
      alert('บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const location = useLocation();
  const isEdit = location.pathname.endsWith('/edit') || id === 'new';

  const moveItem = (idx: number, dir: number) => {
    if (!isEdit) return;
    if (idx + dir < 0 || idx + dir >= items.length) return;
    const newItems = [...items];
    const temp = newItems[idx];
    newItems[idx] = newItems[idx + dir];
    newItems[idx + dir] = temp;
    newItems.forEach((item, i) => { item.order = i + 1; });
    setItems(newItems);
  };

  if (loading) {
    return <Box sx={{ textAlign: 'center', p: 5, color: 'primary.main' }}>กำลังโหลด...</Box>;
  }

  return (
    <Box sx={{ bgcolor: 'action.hover', minHeight: '100vh', p: 3 }}>
      <Paper variant="outlined" sx={{ maxWidth: 950, mx: 'auto', overflow: 'hidden' }}>
        <Box sx={{ height: 4, bgcolor: isEdit ? 'primary.main' : 'success.main' }} />

        <Box sx={{ p: '20px 24px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton aria-label="ย้อนกลับ" size="small" onClick={() => navigate('/pm/sw-hub/template')}><ArrowBackIcon fontSize="small" /></IconButton>
              {isEdit ? (id && id !== 'new' ? 'แก้ไข Template' : 'สร้าง Template ใหม่') : 'Preview Template'}
            </Typography>
            <Box>
              {isEdit ? (
                <FormControlLabel
                  control={<Checkbox size="small" checked={isActive} onChange={e => setIsActive(e.target.checked)} />}
                  label={<Typography sx={{ fontSize: 13, color: 'text.secondary' }}>เปิดใช้งานเป็นหลัก</Typography>}
                />
              ) : (
                <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => navigate(`/pm/sw-hub/template/${id}/edit`)}>
                  เข้าสู่โหมดแก้ไข
                </Button>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>ชื่อ Template</Typography>
              {isEdit ? (
                <TextField fullWidth size="small" value={name} onChange={e => setName(e.target.value)} placeholder="เช่น PM รายเดือน..." />
              ) : (
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{name}</Typography>
              )}
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>คำอธิบาย</Typography>
              {isEdit ? (
                <TextField fullWidth size="small" value={description} onChange={e => setDescription(e.target.value)} placeholder="รายละเอียดเพิ่มเติม..." />
              ) : (
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{description || '-'}</Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
            <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <ChecklistIcon sx={{ fontSize: 16 }} /> รายการ Checklist ({items.length})
              </Typography>
              {isEdit && <Button size="small" variant="contained" color="success" startIcon={<AddCircleIcon />} onClick={handleAddItem}>เพิ่มรายการ</Button>}
            </Box>

            <Box sx={{ bgcolor: 'action.hover', p: 1.25, borderRadius: 2 }}>
              {items.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary', fontSize: 13 }}>ไม่มีรายการตรวจสอบ</Box>
              ) : (
                items.map((item, index) => (
                  <Box
                    key={index}
                    sx={{ display: 'flex', gap: 0.75, alignItems: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', mb: 0.75 }}
                  >
                    {isEdit && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <IconButton aria-label="ย้ายขึ้น" size="small" sx={{ p: 0.25 }} onClick={() => moveItem(index, -1)}><ArrowUpwardIcon sx={{ fontSize: 12 }} /></IconButton>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{index + 1}</Typography>
                        <IconButton aria-label="ย้ายลง" size="small" sx={{ p: 0.25 }} onClick={() => moveItem(index, 1)}><ArrowDownwardIcon sx={{ fontSize: 12 }} /></IconButton>
                      </Box>
                    )}

                    {isEdit ? (
                      <>
                        <TextField
                          size="small"
                          sx={{ width: 180, flexShrink: 0 }}
                          value={item.group}
                          onChange={(e) => handleChangeItem(index, 'group', e.target.value)}
                          placeholder="หมวดหมู่..."
                        />
                        <TextField
                          size="small"
                          sx={{ flex: 1, minWidth: 150 }}
                          value={item.label}
                          onChange={(e) => handleChangeItem(index, 'label', e.target.value)}
                          placeholder="รายการตรวจสอบ..."
                        />
                        <Select size="small" sx={{ width: 150, flexShrink: 0 }} value={item.type || 'boolean'} onChange={e => handleChangeItem(index, 'type', e.target.value)}>
                          {Object.entries(TYPE_LABELS).map(([k, v]) => (
                            <MenuItem key={k} value={k}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><v.icon sx={{ fontSize: 14 }} /> {v.label}</Box>
                            </MenuItem>
                          ))}
                        </Select>
                        <FormControlLabel
                          sx={{ flexShrink: 0, mr: 0 }}
                          control={<Checkbox size="small" checked={item.required || false} onChange={e => handleChangeItem(index, 'required', e.target.checked)} />}
                          label={<Typography sx={{ fontSize: 11, color: 'text.secondary' }}>จำเป็น</Typography>}
                        />
                        <IconButton aria-label="ลบ" size="small" color="error" onClick={() => handleRemoveItem(index)}><DeleteIcon fontSize="small" /></IconButton>
                      </>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', py: 0.5 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', minWidth: 20 }}>{index + 1}.</Typography>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase' }}>{item.group}</Typography>
                          <Typography sx={{ fontSize: 13 }}>{item.label}</Typography>
                        </Box>
                        <Chip size="small" label={TYPE_LABELS[item.type]?.label || item.type} sx={{ fontSize: 10, height: 20 }} />
                        {item.required && <Box component="span" sx={{ color: 'error.main', fontSize: 12 }}>*</Box>}
                      </Box>
                    )}
                  </Box>
                ))
              )}
            </Box>
          </Box>

          <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button variant="outlined" onClick={() => navigate('/pm/sw-hub/template')}>ย้อนกลับ</Button>
            {isEdit && (
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก Template'}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
