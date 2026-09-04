import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  Card,
  Paper,
  Chip,
  LinearProgress,
  Autocomplete,
  Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import imageCompression from 'browser-image-compression';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import { ImageLightbox } from '../../components/ImageLightbox';
import HubIcon from '@mui/icons-material/Hub';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import BoltIcon from '@mui/icons-material/Bolt';
import RouterIcon from '@mui/icons-material/Router';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import BusinessIcon from '@mui/icons-material/Business';
import CableIcon from '@mui/icons-material/Cable';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import StorageIcon from '@mui/icons-material/Storage';
import LockIcon from '@mui/icons-material/Lock';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import PushPinIcon from '@mui/icons-material/PushPin';
import { pmSwHubService, pmSwHubTemplateService, pmSwHubPlanService, PMSwHubTemplateItem } from '../../services/pmSwHub';
import { resolveMediaUrl } from '../../utils/mediaUrl';

/* ─────────────────────────────────────────────────────────────
   GROUP_INFO: Icon + Label per group key
───────────────────────────────────────────────────────────── */
const GROUP_INFO: Record<string, { label: string; icon: React.ElementType }> = {
  power:      { label: 'ระบบไฟฟ้าและ UPS', icon: BoltIcon },
  network:    { label: 'อุปกรณ์ Network (Switch / Hub)', icon: RouterIcon },
  env:        { label: 'สภาพแวดล้อมห้อง', icon: ThermostatIcon },
  physical:   { label: 'ความปลอดภัยและกายภาพ', icon: BusinessIcon },
  cable:      { label: 'การจัดการสายและ Documentation', icon: CableIcon },
  'LED สถานะ (LED Status)':                             { label: 'LED สถานะ (LED Status)', icon: NotificationsActiveIcon },
  'ทำความสะอาด (Cleaning)':                            { label: 'ทำความสะอาด (Cleaning)', icon: AutoAwesomeIcon },
  'สายและ Connection (Cables and Connection)':          { label: 'สายและ Connection (Cables and Connection)', icon: CableIcon },
  'F27 — Critical Systems':                             { label: 'F27 — Critical Systems', icon: WarningAmberIcon },
  'ระบบไฟฟ้าและ UPS (Power & UPS)':                    { label: 'ระบบไฟฟ้าและ UPS (Power & UPS)', icon: BoltIcon },
  'ระบบปรับอากาศ (Cooling & HVAC)':                    { label: 'ระบบปรับอากาศ (Cooling & HVAC)', icon: AcUnitIcon },
  'อุปกรณ์ Network (Switch / Router / Firewall)':       { label: 'อุปกรณ์ Network (Switch / Router / Firewall)', icon: RouterIcon },
  'เครื่องเซิร์ฟเวอร์ (Server & Storage)':             { label: 'เครื่องเซิร์ฟเวอร์ (Server & Storage)', icon: StorageIcon },
  'ตู้ Rack และการจัดการสาย (Rack & Cabling)':         { label: 'ตู้ Rack และการจัดการสาย (Rack & Cabling)', icon: CableIcon },
  'ระบบรักษาความปลอดภัย (Security & Access Control)':  { label: 'ระบบรักษาความปลอดภัย (Security & Access Control)', icon: LockIcon },
  'ระบบป้องกันอัคคีภัย (Fire Protection)':             { label: 'ระบบป้องกันอัคคีภัย (Fire Protection)', icon: LocalFireDepartmentIcon },
  'ความสะอาดและสภาพแวดล้อม (Environment)':             { label: 'ความสะอาดและสภาพแวดล้อม (Environment)', icon: AutoAwesomeIcon },
  'อุปกรณ์เพิ่มเติม (Custom)':                         { label: 'อุปกรณ์เพิ่มเติม (Custom)', icon: PushPinIcon },
  'อื่นๆ (Others)':                                    { label: 'อื่นๆ (Others)', icon: PushPinIcon },
};

/* ─────────────────────────────────────────────────────────────
   BUILT-IN PRESET TEMPLATES
───────────────────────────────────────────────────────────── */
const PRESET_F22_26: PMSwHubTemplateItem[] = [
  { group: 'LED สถานะ (LED Status)', label: '🔴 FAULT / ALARM LED ดับทุกตัว (Switch, Aruba, FortiGate)', key: 'led_fault_alarm', type: 'boolean', order: 1 },
  { group: 'LED สถานะ (LED Status)', label: '🟢 POWER LED ติดครบทุกตัว', key: 'led_power', type: 'boolean', order: 2 },
  { group: 'LED สถานะ (LED Status)', label: 'Port LED ผิดปกติ (Amber / ดับถาวร)', key: 'led_ports', type: 'boolean', order: 3 },
  { group: 'ทำความสะอาด (Cleaning)', label: 'เป่าฝุ่นช่อง Vent ทุกอุปกรณ์ (ระนาบ 10-15 ซม.)', key: 'cleaning_vent', type: 'boolean', order: 4 },
  { group: 'ทำความสะอาด (Cleaning)', label: 'เช็ดฝุ่นพื้น Rack และรอบตู้', key: 'cleaning_floor', type: 'boolean', order: 5 },
  { group: 'สายและ Connection (Cables and Connection)', label: 'Patch / Fiber เสียบแน่น คลิปล็อก (ไม่หักงอ)', key: 'cable_physical', type: 'boolean', order: 6 },
  { group: 'สายและ Connection (Cables and Connection)', label: 'Port ว่างมี Dust Cap (โดยเฉพาะ SFP+)', key: 'cable_dust_cap', type: 'boolean', order: 7 },
];

const PRESET_F27: PMSwHubTemplateItem[] = [
  ...PRESET_F22_26,
  { group: 'F27 — Critical Systems', label: '🔴 [F27] UPS APC — Online + Battery OK', key: 'f27_ups', type: 'boolean', order: 8 },
  { group: 'F27 — Critical Systems', label: '🌡️ [F27] อุณหภูมิห้อง ≤ 24°C / แอร์ทำงานปกติ', key: 'f27_temp', type: 'boolean', order: 9 },
];

/* Template option type */
interface TemplateOption {
  id: string;
  name: string;
  description: string;
  badge: string;
  color: 'info' | 'warning' | 'secondary';
  icon: React.ElementType;
  items: PMSwHubTemplateItem[];
  isBuiltIn: boolean;
}

const BUILT_IN_TEMPLATES: TemplateOption[] = [
  {
    id: 'f22_26',
    name: 'มาตรฐาน — ชั้น 22–26',
    description: '7 รายการ: LED Status · Cleaning · Cables & Connection',
    badge: '7 ข้อ',
    color: 'info',
    icon: BusinessIcon,
    items: PRESET_F22_26,
    isBuiltIn: true,
  },
  {
    id: 'f27',
    name: 'Critical — ชั้น 27',
    description: '9 รายการ: ทุกข้อใน ชั้น 22–26 + UPS System + Room Temperature',
    badge: '9 ข้อ',
    color: 'warning',
    icon: WarningAmberIcon,
    items: PRESET_F27,
    isBuiltIn: true,
  },
];

/* ─────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────── */
export default function PMSwHubFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planIdParam = searchParams.get('planId');
  const recordIdParam = searchParams.get('recordId');
  const floorParam = searchParams.get('floor') || '';

  /* Step: 'select' | 'form' */
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);
  const [dbTemplates, setDbTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  /* Form state */
  const [floor, setFloor] = useState(floorParam.replace(/^F/i, ''));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [technician, setTechnician] = useState('');
  const [period, setPeriod] = useState(searchParams.get('period') || 'Monthly');
  const [remark, setRemark] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  /** key ของรายการตรวจที่กำลังเปิดดูรูปเต็มอยู่ — null คือไม่ได้เปิด */
  const [photoZoom, setPhotoZoom] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRecordId, setExistingRecordId] = useState<number | null>(null);
  const [dbFormId, setDbFormId] = useState<string | null>(null);
  const [checks, setChecks] = useState<PMSwHubTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);

  /* Photos */
  const [photoBeforeUrl, setPhotoBeforeUrl] = useState<string | null>(null);
  const [photoAfterUrl, setPhotoAfterUrl] = useState<string | null>(null);
  const [photoBeforeFile, setPhotoBeforeFile] = useState<File | null>(null);
  const [photoAfterFile, setPhotoAfterFile] = useState<File | null>(null);

  /* Custom item addition */
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemGroup, setNewItemGroup] = useState('อุปกรณ์เพิ่มเติม (Custom)');
  const [newItemLabel, setNewItemLabel] = useState('');

  /* Load DB templates on mount */
  useEffect(() => {
    loadDbTemplates();
  }, []);

  const loadExistingRecord = useCallback(async () => {
    try {
      setLoading(true);

      const recordSrc = recordIdParam
        ? await pmSwHubService.getById(Number(recordIdParam))
        : await pmSwHubService.getByPlanId(Number(planIdParam)).catch((e: any) => {
            if (e?.response?.status !== 404) console.error(e);
            return null;
          });

      let templateItems: PMSwHubTemplateItem[] = [];
      if (recordSrc?.plan?.template) {
        templateItems = recordSrc.plan.template.items || [];
      } else if (planIdParam) {
        const plans = await pmSwHubPlanService.getAll();
        const currentPlan = plans.find(p => p.id === Number(planIdParam));
        if (currentPlan?.template) {
          templateItems = currentPlan.template.items || [];
        }
      }

      if (templateItems.length === 0) {
        // Load active template as fallback
        const template = await pmSwHubTemplateService.getActive();
        templateItems = template?.items || [];
      }

      setChecks(templateItems);

      if (recordSrc) {
        setExistingRecordId(recordSrc.id);
        setDbFormId(recordSrc.formId);
        setFloor(recordSrc.floor.replace(/^F/i, ''));
        setDate(new Date(recordSrc.date).toISOString().split('T')[0]);
        setTechnician(recordSrc.technician);
        setPeriod(recordSrc.period);
        setRemark(recordSrc.remark || '');
        setPhotoBeforeUrl(recordSrc.photoBeforeUrl);
        setPhotoAfterUrl(recordSrc.photoAfterUrl);
        const loadedAnswers: Record<string, string> = {};
        recordSrc.items?.forEach((item: any) => {
          const check = templateItems.find(c => c.label === item.checkItem && (GROUP_INFO[c.group]?.label || c.group) === item.category);
          if (check) {
            if (item.status === 'pass') loadedAnswers[check.key] = 'yes';
            else if (item.status === 'fail') loadedAnswers[check.key] = 'no';
            else if (item.status === 'na') loadedAnswers[check.key] = 'na';
            if (item.note) loadedAnswers[`${check.key}_note`] = item.note;
            if (item.photoUrl) loadedAnswers[`${check.key}_photo`] = item.photoUrl;
          }
        });
        setAnswers(loadedAnswers);
      }
    } catch (err) {
      console.error(err);
      alert('โหลดข้อมูลผิดพลาด');
    } finally {
      setLoading(false);
    }
  }, [recordIdParam, planIdParam]);

  /* If editing (recordId/planId), skip template selection */
  useEffect(() => {
    if (recordIdParam || planIdParam) {
      setStep('form');
      loadExistingRecord();
    }
  }, [recordIdParam, planIdParam, loadExistingRecord]);

  const loadDbTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const data = await pmSwHubTemplateService.getAll();
      const opts: TemplateOption[] = data.map((t: any) => ({
        id: `db_${t.id}`,
        name: t.name,
        description: t.description || `${t.items?.length || 0} รายการตรวจสอบ`,
        badge: `${t.items?.length || 0} ข้อ`,
        color: 'secondary',
        icon: DescriptionIcon,
        items: t.items || [],
        isBuiltIn: false,
      }));
      setDbTemplates(opts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSelectTemplate = (tmpl: TemplateOption) => {
    setSelectedTemplate(tmpl);
    setChecks(tmpl.items.map((item, i) => ({ ...item, key: item.key || `item_${i}` })));
    setAnswers({});
    setStep('form');
  };

  const handleAddCustomItem = () => {
    if (!newItemLabel.trim()) return;
    const newItem: PMSwHubTemplateItem = {
      group: newItemGroup || 'อุปกรณ์เพิ่มเติม (Custom)',
      key: `custom_${Date.now()}`,
      label: newItemLabel.trim(),
      type: 'boolean',
      order: checks.length + 1,
    };
    setChecks(prev => [...prev, newItem]);
    setNewItemLabel('');
    setNewItemGroup('อุปกรณ์เพิ่มเติม (Custom)');
    setShowAddItem(false);
  };

  const handleRemoveCustomItem = (key: string) => {
    setChecks(prev => prev.filter(c => c.key !== key));
    setAnswers(prev => {
      const next = { ...prev };
      delete next[key];
      delete next[`${key}_note`];
      delete next[`${key}_photo`];
      return next;
    });
  };

  const groups = useMemo(() => {
    const allGroups = Array.from(new Set(checks.map(i => i.group)));
    if (floor !== '27') return allGroups.filter(g => g !== 'F27 — Critical Systems');
    return allGroups;
  }, [checks, floor]);

  const formId = useMemo(() => {
    const seq = date ? date.replace(/-/g, '').slice(2) : '000000';
    const f = floor || '??';
    return `PM-SW-F${f}-${seq}`;
  }, [floor, date]);

  const answeredCount = checks.filter(item => answers[item.key] !== undefined).length;
  const checkPct = checks.length > 0 ? Math.round((answeredCount / checks.length) * 100) : 0;

  const setAll = (val: string) => {
    const newAns = { ...answers };
    checks.forEach(i => { newAns[i.key] = val; });
    setAnswers(newAns);
  };

  const handleClear = () => {
    if (window.confirm('ยืนยันการล้างข้อมูลทั้งหมด?')) {
      setAnswers({});
      setRemark('');
      setPhotoBeforeFile(null);
      setPhotoAfterFile(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'BEFORE' | 'AFTER') => {
    if (e.target.files && e.target.files.length > 0) {
      if (type === 'BEFORE') setPhotoBeforeFile(e.target.files[0]);
      else setPhotoAfterFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!floor || !date || !technician) {
      alert('กรุณาระบุชั้น (Floor), วันที่ (Date), และผู้ตรวจ (Technician)');
      return;
    }
    if (checks.length === 0) {
      alert('⚠️ ไม่พบข้อมูลรายการตรวจสอบ (Checklist items) กรุณาเลือก Template ก่อนทำการบันทึก');
      return;
    }
    setIsSubmitting(true);
    try {
      let failCount = 0;
      const flatItems = checks.map(item => {
        const ans = answers[item.key] || 'pending';
        let status = 'pending';
        if (ans === 'yes') status = 'pass';
        if (ans === 'no') { status = 'fail'; failCount++; }
        if (ans === 'na') status = 'na';
        return {
          category: GROUP_INFO[item.group]?.label || item.group,
          checkItem: item.label,
          status,
          note: answers[`${item.key}_note`] || '',
          photoUrl: answers[`${item.key}_photo`] || null,
          resolveStatus: status === 'fail' ? 'open' : null,
        };
      });

      const payload = {
        planId: planIdParam ? Number(planIdParam) : undefined,
        formId: dbFormId || formId,
        floor: `F${floor}`,
        date,
        technician,
        period,
        remark,
        status: failCount > 0 ? 'Fail' : 'Pass',
        items: flatItems,
      };

      let recordId = existingRecordId;
      if (recordId) {
        await pmSwHubService.update(recordId, payload);
      } else {
        const newRecord = await pmSwHubService.create(payload);
        recordId = newRecord.id;
      }

      if (photoBeforeFile && recordId) await pmSwHubService.uploadImage(recordId, photoBeforeFile, 'BEFORE');
      if (photoAfterFile && recordId) await pmSwHubService.uploadImage(recordId, photoAfterFile, 'AFTER');

      alert('บันทึกรายงานสำเร็จ');
      navigate('/pm/sw-hub');
    } catch (error) {
      alert('บันทึกข้อมูลล้มเหลว');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ─── STEP 1: Template Selection ─── */
  if (step === 'select') {
    return (
      <Box sx={{ p: 3, maxWidth: 760, mx: 'auto', pb: 7.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 3, bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.08), border: '1px solid', borderColor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HubIcon color="primary" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>ตรวจ PM SW/Hub Room</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>เลือกรูปแบบรายการตรวจเช็คก่อนเริ่มกรอกแบบฟอร์ม</Typography>
          </Box>
        </Box>

        {/* Step Indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3.5, bgcolor: 'action.hover', borderRadius: 3, p: '12px 20px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>1</Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'primary.main' }}>เลือก Template</Typography>
          </Box>
          <Box sx={{ flex: 1, height: 2, bgcolor: 'divider', mx: 1.5 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'action.disabledBackground', color: 'text.disabled', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>2</Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.disabled' }}>กรอกแบบฟอร์มตรวจ</Typography>
          </Box>
        </Box>

        {/* Section: Built-in */}
        <Typography sx={{ mb: 1, fontSize: 11, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <LibraryBooksIcon sx={{ fontSize: 14 }} /> รายการมาตรฐาน (Built-in Templates)
        </Typography>
        {BUILT_IN_TEMPLATES.map(tmpl => (
          <Card
            key={tmpl.id}
            variant="outlined"
            onClick={() => handleSelectTemplate(tmpl)}
            sx={{ p: 2.5, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5, borderColor: `${tmpl.color}.main`, transition: 'all .2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}
          >
            <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: (t) => alpha(t.palette[tmpl.color].main, t.palette.mode === 'dark' ? 0.16 : 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <tmpl.icon sx={{ fontSize: 26, color: `${tmpl.color}.main` }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.75, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{tmpl.name}</Typography>
                <Chip size="small" label={tmpl.badge} color={tmpl.color} variant="outlined" sx={{ fontWeight: 700 }} />
                {tmpl.id === 'f22_26' && <Chip size="small" icon={<CheckCircleIcon sx={{ fontSize: 12 }} />} label="Standard" color="success" sx={{ fontSize: 10, fontWeight: 700 }} />}
                {tmpl.id === 'f27' && <Chip size="small" icon={<WarningAmberIcon sx={{ fontSize: 12 }} />} label="Critical" color="warning" sx={{ fontSize: 10, fontWeight: 700 }} />}
              </Box>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.25 }}>{tmpl.description}</Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {Array.from(new Set(tmpl.items.map(i => i.group))).map(g => {
                  const gi = GROUP_INFO[g] || { label: g, icon: PushPinIcon };
                  return <Chip key={g} size="small" variant="outlined" icon={<gi.icon sx={{ fontSize: 12 }} />} label={gi.label} sx={{ fontSize: 10, height: 22 }} />;
                })}
              </Box>
            </Box>
            <ChevronRightIcon sx={{ color: 'text.disabled' }} />
          </Card>
        ))}

        {/* Section: DB Templates */}
        {(loadingTemplates || dbTemplates.length > 0) && (
          <>
            <Typography sx={{ mt: 2.5, mb: 1, fontSize: 11, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <DescriptionIcon sx={{ fontSize: 14 }} /> Templates ที่กำหนดเอง (Custom Templates)
            </Typography>
            {loadingTemplates ? (
              <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary', fontSize: 13 }}>กำลังโหลด...</Box>
            ) : (
              dbTemplates.map(tmpl => (
                <Card
                  key={tmpl.id}
                  variant="outlined"
                  onClick={() => handleSelectTemplate(tmpl)}
                  sx={{ p: 2.5, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5, borderColor: `${tmpl.color}.main`, transition: 'all .2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}
                >
                  <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: (t) => alpha(t.palette[tmpl.color].main, t.palette.mode === 'dark' ? 0.16 : 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <tmpl.icon sx={{ fontSize: 26, color: `${tmpl.color}.main` }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{tmpl.name}</Typography>
                      <Chip size="small" label={tmpl.badge} color={tmpl.color} variant="outlined" sx={{ fontWeight: 700 }} />
                    </Box>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{tmpl.description}</Typography>
                  </Box>
                  <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                </Card>
              ))
            )}
          </>
        )}

        {/* Manage Template */}
        <Box sx={{ mt: 2.5, textAlign: 'center', display: 'flex', gap: 1, justifyContent: 'center' }}>
          <Button variant="outlined" size="small" startIcon={<SettingsIcon />} onClick={() => navigate('/pm/sw-hub/template')}>จัดการ Templates</Button>
          <Button variant="outlined" size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/pm/sw-hub')}>ยกเลิก</Button>
        </Box>
      </Box>
    );
  }

  /* ─── STEP 2: Checklist Form ─── */
  if (loading) {
    return <Box sx={{ p: 2.5 }}>กำลังโหลด...</Box>;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto', pb: 12.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.08), border: '1px solid', borderColor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HubIcon color="primary" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 18, fontWeight: 800 }}>ตรวจ PM SW/Hub Room</Typography>
              {selectedTemplate && (
                <Chip size="small" icon={<selectedTemplate.icon sx={{ fontSize: 12 }} />} label={selectedTemplate.name} color={selectedTemplate.color} sx={{ fontWeight: 700 }} />
              )}
            </Box>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
              {selectedTemplate
                ? `Template: ${selectedTemplate.name} · ${checks.length} รายการ`
                : 'ตรวจเช็คไฟฟ้า เครือข่าย สภาพแวดล้อม และหลักฐานหน้างาน'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {!recordIdParam && !planIdParam && (
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => setStep('select')}>เปลี่ยน Template</Button>
          )}
          <Button variant="outlined" startIcon={<AssignmentIcon />} onClick={() => navigate('/pm/sw-hub/plans')}>แผน SW/Hub</Button>
          <Button variant="contained" startIcon={<SaveIcon />} disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกรายงาน'}
          </Button>
        </Box>
      </Box>

      {/* Step Indicator */}
      {!recordIdParam && !planIdParam && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, bgcolor: 'action.hover', borderRadius: 3, p: '12px 20px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'success.main', color: 'success.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckIcon sx={{ fontSize: 15 }} /></Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'success.main' }}>เลือก Template แล้ว</Typography>
          </Box>
          <Box sx={{ flex: 1, height: 2, bgcolor: 'success.main', mx: 1.5 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>2</Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'primary.main' }}>กรอกแบบฟอร์มตรวจ</Typography>
          </Box>
        </Box>
      )}

      {/* Form Metadata */}
      <Paper variant="outlined" sx={{ p: '20px 24px', mb: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1.75 }}>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{formId}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>เอกสารบันทึกผลตรวจ SW/Hub Room</Typography>
          </Box>
          {planIdParam && <Chip size="small" label={`Linked Plan #${planIdParam}`} color="info" variant="outlined" sx={{ fontWeight: 700 }} />}
        </Box>
        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 200px' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>ชั้น (FLOOR)</Typography>
            <Select fullWidth size="small" displayEmpty value={floor} onChange={e => setFloor(e.target.value)}>
              <MenuItem value=""><em>-- เลือกชั้น --</em></MenuItem>
              {[22,23,24,25,26,27].map(f => <MenuItem key={f} value={String(f)}>Floor {f}</MenuItem>)}
            </Select>
          </Box>
          <Box sx={{ flex: '1 1 200px' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>วันที่ตรวจสอบ</Typography>
            <DatePicker
              format="DD/MM/YYYY"
              value={date ? dayjs(date) : null}
              onChange={(newVal) => setDate(newVal ? newVal.format('YYYY-MM-DD') : '')}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Box>
          <Box sx={{ flex: '1 1 200px' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>รอบการ PM</Typography>
            <Select fullWidth size="small" value={period} onChange={e => setPeriod(e.target.value)}>
              <MenuItem value="Monthly">รายเดือน</MenuItem>
              <MenuItem value="Quarterly">รายไตรมาส</MenuItem>
              <MenuItem value="Annual">รายปี</MenuItem>
            </Select>
          </Box>
          <Box sx={{ flex: '1 1 200px' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>ผู้ตรวจสอบ</Typography>
            <TextField fullWidth size="small" placeholder="ระบุชื่อผู้ตรวจ" value={technician} onChange={e => setTechnician(e.target.value)} />
          </Box>
        </Box>
      </Paper>

      {/* Quick Actions + Progress */}
      <Box sx={{ pb: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 220 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>ความคืบหน้า</Typography>
          <LinearProgress variant="determinate" value={checkPct} color="success" sx={{ flex: 1, height: 8, borderRadius: 99 }} />
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'success.main', minWidth: 40 }}>{checkPct}%</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{answeredCount}/{checks.length}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<CheckIcon />} onClick={() => setAll('yes')}>ทำทั้งหมด (Yes)</Button>
          <Button size="small" variant="outlined" startIcon={<RestartAltIcon />} onClick={handleClear}>ล้างข้อมูล</Button>
        </Box>
      </Box>

      {/* Checklist */}
      {checks.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>ยังไม่มีรายการตรวจ</Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 2.5 }}>
          {groups.map((group) => {
            const groupItems = checks.filter(i => i.group === group);
            const gi = GROUP_INFO[group] || { label: group, icon: PushPinIcon };
            return (
              <Box key={group}>
                <Box sx={{ px: 2.5, py: 1.25, bgcolor: 'action.hover', fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <gi.icon sx={{ fontSize: 14 }} /> {gi.label}
                </Box>
                {groupItems.map((item) => {
                  const showNote = answers[item.key] === 'no' || answers[item.key] === 'na';
                  return (
                    <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.75, flexWrap: 'wrap', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 'none' } }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'text.secondary', flexShrink: 0 }}>
                        {checks.indexOf(item) + 1}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 220 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{item.label}</Typography>
                          {item.key.startsWith('custom_') && <Chip size="small" label="+ เพิ่มเติม" color="info" variant="outlined" sx={{ fontSize: 9, height: 18 }} />}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0, alignItems: 'center' }}>
                        {[
                          { val: 'yes', lbl: 'ใช่', icon: <CheckIcon sx={{ fontSize: 14 }} />, color: 'success' as const },
                          { val: 'no', lbl: 'ไม่', icon: <CloseIcon sx={{ fontSize: 14 }} />, color: 'error' as const },
                          { val: 'na', lbl: 'N/A', icon: <RemoveIcon sx={{ fontSize: 14 }} />, color: 'inherit' as const },
                        ].map(opt => {
                          const selected = answers[item.key] === opt.val;
                          return (
                            <Button
                              key={opt.val}
                              size="small"
                              startIcon={opt.icon}
                              variant={selected ? 'contained' : 'outlined'}
                              color={selected ? opt.color : 'inherit'}
                              sx={{ borderRadius: 5, px: 1.5, fontSize: 12 }}
                              onClick={() => setAnswers(p => {
                                const newAns = { ...p };
                                if (newAns[item.key] === opt.val) {
                                  delete newAns[item.key];
                                  delete newAns[`${item.key}_note`];
                                } else {
                                  newAns[item.key] = opt.val;
                                  if (opt.val === 'yes') delete newAns[`${item.key}_note`];
                                }
                                return newAns;
                              })}
                            >
                              {opt.lbl}
                            </Button>
                          );
                        })}
                        <IconButton
                          size="small"
                          component="label"
                          title="แนบรูปถ่าย"
                        >
                          <PhotoCameraIcon fontSize="small" />
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                try {
                                  const file = e.target.files[0];
                                  const options = {
                                    maxSizeMB: 0.5,
                                    maxWidthOrHeight: 1280,
                                    useWebWorker: true,
                                  };
                                  const compressedFile = await imageCompression(file, options);
                                  const res = await pmSwHubService.uploadTempImage(compressedFile);
                                  setAnswers(p => ({ ...p, [`${item.key}_photo`]: res.imageUrl }));
                                } catch (err) {
                                  console.error(err);
                                  alert('อัปโหลดรูปภาพไม่สำเร็จ');
                                }
                              }
                            }}
                          />
                        </IconButton>
                        {item.key.startsWith('custom_') && (
                          <IconButton size="small" color="error" title="ลบรายการนี้" onClick={() => handleRemoveCustomItem(item.key)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                      <Box sx={{ width: '100%', pl: '38px', mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {showNote && (
                          <TextField
                            size="small"
                            fullWidth
                            placeholder="ระบุสาเหตุประกอบการเลือกไม่ใช่หรือไม่ระบุ..."
                            value={answers[`${item.key}_note`] || ''}
                            onChange={e => setAnswers(p => ({ ...p, [`${item.key}_note`]: e.target.value }))}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                bgcolor: (t) => alpha(t.palette.warning.main, 0.08),
                                '& fieldset': { borderColor: 'warning.main' },
                              },
                            }}
                          />
                        )}
                        {answers[`${item.key}_photo`] && (
                          /* รูปย่อ 100px ถูกครอบไว้ (objectFit: cover) จึงดูไม่ออกว่าถ่าย
                             ติดครบหรือชัดพอ — คลิกเพื่อกางเต็มจอ */
                          <Tooltip title="คลิกเพื่อดูรูปขนาดเต็ม">
                            <Box
                              onClick={() => setPhotoZoom(item.key)}
                              sx={{
                                position: 'relative', width: 100, height: 100, borderRadius: 1.5,
                                overflow: 'hidden', border: '1px solid', borderColor: 'divider',
                                cursor: 'zoom-in', '&:hover .zoom-hint': { opacity: 1 },
                              }}
                            >
                              <Box component="img" src={resolveMediaUrl(answers[`${item.key}_photo`])} alt="Preview" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <Box className="zoom-hint" sx={{
                                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                bgcolor: 'rgba(0,0,0,0.45)', color: '#fff', opacity: 0, transition: 'opacity .15s',
                              }}>
                                <ZoomOutMapIcon sx={{ fontSize: 24 }} />
                              </Box>
                              <IconButton
                                size="small"
                                onClick={e => { e.stopPropagation(); const n = { ...answers }; delete n[`${item.key}_photo`]; setAnswers(n); }}
                                sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'error.main', color: '#fff', width: 20, height: 20, zIndex: 1, '&:hover': { bgcolor: 'error.dark' } }}
                              >
                                <CloseIcon sx={{ fontSize: 12 }} />
                              </IconButton>
                            </Box>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            );
          })}

          {/* Add Custom Item */}
          {!showAddItem ? (
            <Box sx={{ p: '12px 20px', borderTop: '1px solid', borderColor: 'divider' }}>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} sx={{ borderStyle: 'dashed' }} onClick={() => setShowAddItem(true)}>
                เพิ่มรายการตรวจสอบ
              </Button>
              <Typography component="span" sx={{ ml: 1.25, fontSize: 11, color: 'text.secondary' }}>สำหรับอุปกรณ์เพิ่มเติมที่ไม่มีในรายการ</Typography>
            </Box>
          ) : (
            <Box sx={{ p: '16px 20px', bgcolor: 'action.hover', borderTop: '2px dashed', borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}><AddCircleIcon sx={{ fontSize: 16 }} /> เพิ่มรายการตรวจสอบใหม่</Typography>
              <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', mb: 1.25 }}>
                <Box sx={{ flex: '1 1 200px' }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>หมวดหมู่</Typography>
                  <Autocomplete
                    freeSolo
                    options={Object.values(GROUP_INFO).map(g => g.label)}
                    inputValue={newItemGroup}
                    onInputChange={(_, val) => setNewItemGroup(val)}
                    renderInput={(params) => <TextField {...params} size="small" placeholder="เช่น อุปกรณ์เพิ่มเติม, UPS Room..." />}
                  />
                </Box>
                <Box sx={{ flex: '2 1 300px' }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>รายการตรวจสอบ <Box component="span" sx={{ color: 'error.main' }}>*</Box></Typography>
                  <TextField
                    fullWidth
                    size="small"
                    autoFocus
                    placeholder="เช่น ตรวจสอบ Battery UPS ของ Floor 22..."
                    value={newItemLabel}
                    onChange={e => setNewItemLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCustomItem(); }}
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" color="success" startIcon={<CheckIcon />} onClick={handleAddCustomItem} disabled={!newItemLabel.trim()}>เพิ่มรายการ</Button>
                <Button variant="outlined" onClick={() => { setShowAddItem(false); setNewItemLabel(''); }}>ยกเลิก</Button>
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* Remarks & Photos */}
      <Paper variant="outlined" sx={{ p: '20px 24px' }}>
        <Box sx={{ mb: 2.5 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.25 }}>ภาพถ่ายก่อนและหลังเข้าดำเนินการ (หลักฐานหน้างาน)</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2.5 }}>
            {([
              { label: 'ก่อนทำ (Before)', url: photoBeforeUrl, file: photoBeforeFile, type: 'BEFORE' as const, onRemove: () => { setPhotoBeforeFile(null); setPhotoBeforeUrl(null); } },
              { label: 'หลังทำ (After)', url: photoAfterUrl, file: photoAfterFile, type: 'AFTER' as const, onRemove: () => { setPhotoAfterFile(null); setPhotoAfterUrl(null); } },
            ]).map((slot) => (
              <Box key={slot.type}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>{slot.label}</Typography>
                {(slot.url || slot.file) ? (
                  <Box sx={{ position: 'relative', borderRadius: 1.5, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    <Box component="img" src={slot.file ? URL.createObjectURL(slot.file) : resolveMediaUrl(slot.url)!} alt={slot.type} sx={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                    <IconButton size="small" onClick={slot.onRemove} sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'error.main', color: '#fff', '&:hover': { bgcolor: 'error.dark' } }}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Box
                    component="label"
                    sx={{ display: 'block', border: '2px dashed', borderColor: 'divider', borderRadius: 1.5, p: 2.5, textAlign: 'center', cursor: 'pointer', bgcolor: 'action.hover', '&:hover': { borderColor: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.04) } }}
                  >
                    <PhotoCameraIcon sx={{ fontSize: 24, mb: 1, color: 'text.disabled' }} />
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>คลิกเพื่อเลือกไฟล์รูปภาพ</Typography>
                    <input type="file" accept="image/*" hidden onChange={(e) => handleFileChange(e, slot.type)} />
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>หมายเหตุรวม / ปัญหาที่พบ</Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            placeholder="ระบุปัญหาที่พบ อุปกรณ์ที่ต้องซ่อม หรือการดำเนินการที่ทำไปแล้ว..."
            value={remark}
            onChange={e => setRemark(e.target.value)}
          />
        </Box>
      </Paper>

      {/* หน้าดูรูปเต็มตัวเดียวใช้ร่วมกันทุกรายการตรวจ อ่านรูปจาก key ที่เปิดอยู่
          ไม่มีปุ่มเปลี่ยนรูป เพราะปุ่มถ่าย/อัปโหลดของแต่ละข้ออยู่ติดกับรูปอยู่แล้ว */}
      <ImageLightbox
        open={photoZoom !== null}
        onClose={() => setPhotoZoom(null)}
        src={photoZoom ? resolveMediaUrl(answers[`${photoZoom}_photo`]) : null}
        title="รูปถ่ายประกอบการตรวจ"
        onDelete={photoZoom ? () => {
          const n = { ...answers };
          delete n[`${photoZoom}_photo`];
          setAnswers(n);
          setPhotoZoom(null);
        } : undefined}
      />
    </Box>
  );
}
