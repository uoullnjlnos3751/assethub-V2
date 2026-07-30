import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { pmSwHubService, pmSwHubTemplateService, pmSwHubPlanService, PMSwHubTemplateItem } from '../../services/pmSwHub';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import imageCompression from 'browser-image-compression';

/* ─────────────────────────────────────────────────────────────
   GROUP_INFO: Icon + Label per group key
───────────────────────────────────────────────────────────── */
const GROUP_INFO: Record<string, { label: string, icon: string }> = {
  power:      { label: 'ระบบไฟฟ้าและ UPS', icon: '⚡' },
  network:    { label: 'อุปกรณ์ Network (Switch / Hub)', icon: '🖥' },
  env:        { label: 'สภาพแวดล้อมห้อง', icon: '🌡' },
  physical:   { label: 'ความปลอดภัยและกายภาพ', icon: '🏢' },
  cable:      { label: 'การจัดการสายและ Documentation', icon: '🔌' },
  'LED สถานะ (LED Status)':                             { label: 'LED สถานะ (LED Status)', icon: '🚨' },
  'ทำความสะอาด (Cleaning)':                            { label: 'ทำความสะอาด (Cleaning)', icon: '✨' },
  'สายและ Connection (Cables and Connection)':          { label: 'สายและ Connection (Cables and Connection)', icon: '🔌' },
  'F27 — Critical Systems':                             { label: 'F27 — Critical Systems', icon: '⚠️' },
  'ระบบไฟฟ้าและ UPS (Power & UPS)':                    { label: 'ระบบไฟฟ้าและ UPS (Power & UPS)', icon: '⚡' },
  'ระบบปรับอากาศ (Cooling & HVAC)':                    { label: 'ระบบปรับอากาศ (Cooling & HVAC)', icon: '❄️' },
  'อุปกรณ์ Network (Switch / Router / Firewall)':       { label: 'อุปกรณ์ Network (Switch / Router / Firewall)', icon: '🖥️' },
  'เครื่องเซิร์ฟเวอร์ (Server & Storage)':             { label: 'เครื่องเซิร์ฟเวอร์ (Server & Storage)', icon: '🗄️' },
  'ตู้ Rack และการจัดการสาย (Rack & Cabling)':         { label: 'ตู้ Rack และการจัดการสาย (Rack & Cabling)', icon: '🔌' },
  'ระบบรักษาความปลอดภัย (Security & Access Control)':  { label: 'ระบบรักษาความปลอดภัย (Security & Access Control)', icon: '🔒' },
  'ระบบป้องกันอัคคีภัย (Fire Protection)':             { label: 'ระบบป้องกันอัคคีภัย (Fire Protection)', icon: '🧯' },
  'ความสะอาดและสภาพแวดล้อม (Environment)':             { label: 'ความสะอาดและสภาพแวดล้อม (Environment)', icon: '✨' },
  'อุปกรณ์เพิ่มเติม (Custom)':                         { label: 'อุปกรณ์เพิ่มเติม (Custom)', icon: '📌' },
  'อื่นๆ (Others)':                                    { label: 'อื่นๆ (Others)', icon: '📌' },
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
  badgeColor: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  items: PMSwHubTemplateItem[];
  isBuiltIn: boolean;
}

const BUILT_IN_TEMPLATES: TemplateOption[] = [
  {
    id: 'f22_26',
    name: 'มาตรฐาน — ชั้น 22–26',
    description: '7 รายการ: LED Status · Cleaning · Cables & Connection',
    badge: '7 ข้อ',
    badgeColor: '#0369a1',
    bgColor: '#f0f9ff',
    borderColor: '#bae6fd',
    icon: '🏢',
    items: PRESET_F22_26,
    isBuiltIn: true,
  },
  {
    id: 'f27',
    name: 'Critical — ชั้น 27',
    description: '9 รายการ: ทุกข้อใน ชั้น 22–26 + UPS System + Room Temperature',
    badge: '9 ข้อ',
    badgeColor: '#92400e',
    bgColor: '#fffbeb',
    borderColor: '#fcd34d',
    icon: '⚠️',
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
        badgeColor: '#4f46e5',
        bgColor: '#f5f3ff',
        borderColor: '#c4b5fd',
        icon: '📋',
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

  /* ─── CSS ─── */
  const css = `
    .pmr-root { font-family: 'Sarabun', sans-serif; color: #0f172a; }
    .pmr-btn { display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .2s;border:1px solid transparent;white-space:nowrap; }
    .pmr-btn-primary { background:#0ea5e9;border-color:#0284c7;color:#fff; }
    .pmr-btn-primary:hover { background:#0284c7; }
    .pmr-btn-success { background:#10b981;border-color:#059669;color:#fff; }
    .pmr-btn-success:hover { background:#059669; }
    .pmr-btn-outline { background:#fff;border-color:#e2e8f0;color:#475569; }
    .pmr-btn-outline:hover { border-color:#0ea5e9;color:#0ea5e9; }
    .pmr-btn-danger { background:#fff;border-color:#fecaca;color:#ef4444;padding:4px 8px;font-size:11px; }
    .pmr-btn-danger:hover { background:#fef2f2; }
    .pmr-btn:disabled { opacity:.4;cursor:not-allowed; }
    .pmr-input { border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit;outline:none;color:#334155;background:#fff;transition:all .2s;width:100%;box-sizing:border-box; }
    .pmr-input:focus { border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.12); }
    .pmr-select { appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px;cursor:pointer; }
    .pmr-radio { padding:6px 14px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid #d2d2d7;background:#fff;color:#515154;transition:all .15s;font-family:inherit; }
    .pmr-radio:hover:not(:disabled) { border-color:#0ea5e9;color:#0ea5e9;background:rgba(14,165,233,.04); }
    .pmr-radio.sel-yes { background:#f0fdf4;border-color:#10b981;color:#047857; }
    .pmr-radio.sel-no  { background:#fff5f5;border-color:#ef4444;color:#dc2626; }
    .pmr-radio.sel-na  { background:#f8fafc;border-color:#cbd5e1;color:#475569; }
    .checklist-card { background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:none;margin-bottom:20px; }
    .check-group-title { padding:10px 20px;background:#f8fafc;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:8px; }
    .check-item { display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:12px 20px;border-bottom:1px solid #f1f5f9;transition:background .1s; }
    .check-item:last-child { border-bottom:none; }
    .check-item:hover { background:rgba(14,165,233,.03); }
    .check-no { width:24px;height:24px;border-radius:50%;background:#f8fafc;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#64748b;flex-shrink:0; }
    .photo-upload-box { border:2px dashed #cbd5e1;border-radius:8px;padding:20px;text-align:center;cursor:pointer;transition:all .2s;background:#f8fafc; }
    .photo-upload-box:hover { border-color:#3b82f6;background:#eff6ff; }
    .item-photo-btn { font-size:16px;background:transparent;border:none;cursor:pointer;padding:4px;opacity:.5;transition:all .2s;border-radius:4px; }
    .item-photo-btn:hover { opacity:1;background:#f1f5f9; }

    /* Template Selection */
    .tmpl-card { border:2px solid #e2e8f0;border-radius:16px;padding:20px;cursor:pointer;transition:all .2s;display:flex;align-items:flex-start;gap:16px;background:#fff;margin-bottom:12px; }
    .tmpl-card:hover { transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.1); }
    .tmpl-card.selected { box-shadow:0 8px 24px rgba(14,165,233,.2); }
    .tmpl-icon-box { width:52px;height:52px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0; }
    .tmpl-badge { display:inline-flex;align-items:center;padding:2px 10px;border-radius:99px;font-size:10px;font-weight:700; }
    .custom-item-tag { background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:2px 8px;font-size:10px;color:#0369a1;font-weight:700; }
    .add-item-form { padding:16px 20px;background:#f8fafc;border-top:2px dashed #e2e8f0;animation:fadeUp .15s ease; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
  `;

  /* ─── STEP 1: Template Selection ─── */
  if (step === 'select') {
    const allTemplateOptions: TemplateOption[] = [
      ...BUILT_IN_TEMPLATES,
      ...dbTemplates,
    ];

    return (
      <div className="pmr-root" style={{ padding: '24px', maxWidth: '760px', margin: '0 auto', paddingBottom: 60 }}>
        <style>{css}</style>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0f9ff', border: '1.5px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🖧</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>ตรวจ PM SW/Hub Room</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>เลือกรูปแบบรายการตรวจเช็คก่อนเริ่มกรอกแบบฟอร์ม</div>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28, background: '#f8fafc', borderRadius: 12, padding: '12px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0ea5e9', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>1</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0ea5e9' }}>เลือก Template</span>
          </div>
          <div style={{ flex: 1, height: 2, background: '#e2e8f0', margin: '0 12px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>2</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>กรอกแบบฟอร์มตรวจ</span>
          </div>
        </div>

        {/* Section: Built-in */}
        <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          📐 รายการมาตรฐาน (Built-in Templates)
        </div>
        {BUILT_IN_TEMPLATES.map(tmpl => (
          <div
            key={tmpl.id}
            className="tmpl-card"
            style={{ borderColor: tmpl.borderColor }}
            onClick={() => handleSelectTemplate(tmpl)}
          >
            <div className="tmpl-icon-box" style={{ background: tmpl.bgColor }}>
              {tmpl.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{tmpl.name}</div>
                <span className="tmpl-badge" style={{ background: tmpl.bgColor, color: tmpl.badgeColor, border: `1px solid ${tmpl.borderColor}` }}>
                  {tmpl.badge}
                </span>
                {tmpl.id === 'f22_26' && (
                  <span style={{ fontSize: 10, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 99, padding: '2px 8px', fontWeight: 700 }}>
                    ✓ Standard
                  </span>
                )}
                {tmpl.id === 'f27' && (
                  <span style={{ fontSize: 10, background: '#fefce8', color: '#a16207', border: '1px solid #fef08a', borderRadius: 99, padding: '2px 8px', fontWeight: 700 }}>
                    ⚠️ Critical
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>{tmpl.description}</div>
              {/* Preview checklist groups */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Array.from(new Set(tmpl.items.map(i => i.group))).map(g => {
                  const gi = GROUP_INFO[g] || { label: g, icon: '📌' };
                  return (
                    <span key={g} style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
                      {gi.icon} {gi.label}
                    </span>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: '#cbd5e1', fontSize: 20 }}>›</div>
          </div>
        ))}

        {/* Section: DB Templates */}
        {(loadingTemplates || dbTemplates.length > 0) && (
          <>
            <div style={{ margin: '20px 0 8px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              📋 Templates ที่กำหนดเอง (Custom Templates)
            </div>
            {loadingTemplates ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 13 }}>⏳ กำลังโหลด...</div>
            ) : (
              dbTemplates.map(tmpl => (
                <div
                  key={tmpl.id}
                  className="tmpl-card"
                  style={{ borderColor: tmpl.borderColor }}
                  onClick={() => handleSelectTemplate(tmpl)}
                >
                  <div className="tmpl-icon-box" style={{ background: tmpl.bgColor }}>{tmpl.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{tmpl.name}</div>
                      <span className="tmpl-badge" style={{ background: tmpl.bgColor, color: tmpl.badgeColor, border: `1px solid ${tmpl.borderColor}` }}>
                        {tmpl.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{tmpl.description}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', color: '#cbd5e1', fontSize: 20 }}>›</div>
                </div>
              ))
            )}
          </>
        )}

        {/* Manage Template */}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button className="pmr-btn pmr-btn-outline" style={{ fontSize: 12 }} onClick={() => navigate('/pm/sw-hub/template')}>
            ⚙️ จัดการ Templates
          </button>
          <button className="pmr-btn pmr-btn-outline" style={{ fontSize: 12, marginLeft: 8 }} onClick={() => navigate('/pm/sw-hub')}>
            ← ยกเลิก
          </button>
        </div>
      </div>
    );
  }

  /* ─── STEP 2: Checklist Form ─── */
  if (loading) {
    return <div style={{ padding: 20 }}>กำลังโหลด...</div>;
  }

  return (
    <div className="pmr-root" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px' }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f9ff', border: '1.5px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🖧</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>ตรวจ PM SW/Hub Room</div>
              {selectedTemplate && (
                <span style={{
                  fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '3px 10px',
                  background: selectedTemplate.bgColor, color: selectedTemplate.badgeColor,
                  border: `1px solid ${selectedTemplate.borderColor}`
                }}>
                  {selectedTemplate.icon} {selectedTemplate.name}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              {selectedTemplate
                ? `Template: ${selectedTemplate.name} · ${checks.length} รายการ`
                : 'ตรวจเช็คไฟฟ้า เครือข่าย สภาพแวดล้อม และหลักฐานหน้างาน'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!recordIdParam && !planIdParam && (
            <button type="button" className="pmr-btn pmr-btn-outline" onClick={() => setStep('select')}>
              ← เปลี่ยน Template
            </button>
          )}
          <button type="button" className="pmr-btn pmr-btn-outline" onClick={() => navigate('/pm/sw-hub/plans')}>📋 แผน SW/Hub</button>
          <button type="button" className="pmr-btn pmr-btn-primary" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? '⏳ กำลังบันทึก...' : '✅ บันทึกรายงาน'}
          </button>
        </div>
      </div>

      {/* Step Indicator */}
      {!recordIdParam && !planIdParam && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, background: '#f8fafc', borderRadius: 12, padding: '12px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>✓</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>เลือก Template แล้ว</span>
          </div>
          <div style={{ flex: 1, height: 2, background: '#10b981', margin: '0 12px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0ea5e9', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>2</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0ea5e9' }}>กรอกแบบฟอร์มตรวจ</span>
          </div>
        </div>
      )}

      {/* Form Metadata */}
      <div className="checklist-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{formId}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>เอกสารบันทึกผลตรวจ SW/Hub Room</div>
          </div>
          {planIdParam && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 99, padding: '3px 9px' }}>
              Linked Plan #{planIdParam}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#86868b', marginBottom: 6 }}>ชั้น (FLOOR)</label>
            <select className="pmr-input pmr-select" value={floor} onChange={e => setFloor(e.target.value)}>
              <option value="">-- เลือกชั้น --</option>
              {[22,23,24,25,26,27].map(f => <option key={f} value={f}>Floor {f}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#86868b', marginBottom: 6 }}>วันที่ตรวจสอบ</label>
            <DatePicker
              format="DD/MM/YYYY"
              value={date ? dayjs(date) : null}
              onChange={(newVal) => setDate(newVal ? newVal.format('YYYY-MM-DD') : '')}
              slotProps={{ textField: { size: 'small', className: 'pmr-input', sx: { bgcolor: '#fff', borderRadius: '6px' } } }}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#86868b', marginBottom: 6 }}>รอบการ PM</label>
            <select className="pmr-input pmr-select" value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="Monthly">รายเดือน</option>
              <option value="Quarterly">รายไตรมาส</option>
              <option value="Annual">รายปี</option>
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#86868b', marginBottom: 6 }}>ผู้ตรวจสอบ</label>
            <input type="text" className="pmr-input" placeholder="ระบุชื่อผู้ตรวจ" value={technician} onChange={e => setTechnician(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Quick Actions + Progress */}
      <div style={{ padding: '0 0 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 }}>
          <span style={{ fontSize: 12, color: '#475569', fontWeight: 700 }}>ความคืบหน้า</span>
          <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 99, height: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: '#10b981', width: `${checkPct}%` }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#10b981', minWidth: 40 }}>{checkPct}%</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{answeredCount}/{checks.length}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="pmr-btn pmr-btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setAll('yes')}>✓ ทำทั้งหมด (Yes)</button>
          <button type="button" className="pmr-btn pmr-btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={handleClear}>↺ ล้างข้อมูล</button>
        </div>
      </div>

      {/* Checklist */}
      {checks.length === 0 ? (
        <div className="checklist-card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          ยังไม่มีรายการตรวจ
        </div>
      ) : (
        <div className="checklist-card">
          {groups.map((group) => {
            const groupItems = checks.filter(i => i.group === group);
            const gi = GROUP_INFO[group] || { label: group, icon: '📌' };
            return (
              <div key={group}>
                <div className="check-group-title">{gi.icon} {gi.label}</div>
                {groupItems.map((item) => (
                  <div key={item.key} className="check-item">
                    <div className="check-no">{checks.indexOf(item) + 1}</div>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 13, color: '#1d1d1f', fontWeight: 500 }}>{item.label}</div>
                        {item.key.startsWith('custom_') && <span className="custom-item-tag">+ เพิ่มเติม</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                      {[{ val: 'yes', lbl: '✓ ใช่' }, { val: 'no', lbl: '✗ ไม่' }, { val: 'na', lbl: '— N/A' }].map(opt => (
                        <button key={opt.val} type="button"
                          className={`pmr-radio ${answers[item.key] === opt.val ? `sel-${opt.val}` : ''}`}
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
                        >{opt.lbl}</button>
                      ))}
                      <label title="แนบรูปถ่าย" className="item-photo-btn" style={{ marginLeft: 4 }}>
                        📷
                        <input type="file" accept="image/*" style={{ display: 'none' }}
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
                      </label>
                      {/* Remove custom item */}
                      {item.key.startsWith('custom_') && (
                        <button type="button" className="pmr-btn pmr-btn-danger" style={{ marginLeft: 4 }}
                          title="ลบรายการนี้"
                          onClick={() => handleRemoveCustomItem(item.key)}>🗑</button>
                      )}
                    </div>
                    <div style={{ width: '100%', paddingLeft: 38, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(answers[item.key] === 'no' || answers[item.key] === 'na') && (
                        <input type="text"
                          style={{ width: '100%', border: '1px solid #ff9500', borderRadius: 6, padding: '8px 12px', fontSize: 12, background: '#fffbeb', outline: 'none', fontFamily: 'inherit' }}
                          placeholder="ระบุสาเหตุประกอบการเลือกไม่ใช่หรือไม่ระบุ..."
                          value={answers[`${item.key}_note`] || ''}
                          onChange={e => setAnswers(p => ({ ...p, [`${item.key}_note`]: e.target.value }))}
                        />
                      )}
                      {answers[`${item.key}_photo`] && (
                        <div style={{ position: 'relative', width: 100, height: 100, borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          <img src={resolveMediaUrl(answers[`${item.key}_photo`])} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => { const n = { ...answers }; delete n[`${item.key}_photo`]; setAnswers(n); }}
                            style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Add Custom Item */}
          {!showAddItem ? (
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
              <button type="button" className="pmr-btn pmr-btn-outline" style={{ fontSize: 12, borderStyle: 'dashed' }}
                onClick={() => setShowAddItem(true)}>
                ＋ เพิ่มรายการตรวจสอบ
              </button>
              <span style={{ marginLeft: 10, fontSize: 11, color: '#94a3b8' }}>สำหรับอุปกรณ์เพิ่มเติมที่ไม่มีในรายการ</span>
            </div>
          ) : (
            <div className="add-item-form">
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>➕ เพิ่มรายการตรวจสอบใหม่</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>หมวดหมู่</label>
                  <input
                    className="pmr-input"
                    placeholder="เช่น อุปกรณ์เพิ่มเติม, UPS Room..."
                    value={newItemGroup}
                    onChange={e => setNewItemGroup(e.target.value)}
                    list="group-datalist"
                  />
                  <datalist id="group-datalist">
                    {Object.values(GROUP_INFO).map(g => <option key={g.label} value={g.label} />)}
                  </datalist>
                </div>
                <div style={{ flex: '2 1 300px' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>รายการตรวจสอบ <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    className="pmr-input"
                    placeholder="เช่น ตรวจสอบ Battery UPS ของ Floor 22..."
                    value={newItemLabel}
                    onChange={e => setNewItemLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCustomItem(); }}
                    autoFocus
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="pmr-btn pmr-btn-success" onClick={handleAddCustomItem} disabled={!newItemLabel.trim()}>
                  ✓ เพิ่มรายการ
                </button>
                <button type="button" className="pmr-btn pmr-btn-outline" onClick={() => { setShowAddItem(false); setNewItemLabel(''); }}>
                  ยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Remarks & Photos */}
      <div className="checklist-card" style={{ padding: '20px 24px' }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 10 }}>ภาพถ่ายก่อนและหลังเข้าดำเนินการ (หลักฐานหน้างาน)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#86868b', marginBottom: 6 }}>ก่อนทำ (Before)</label>
              {(photoBeforeUrl || photoBeforeFile) ? (
                <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <img src={photoBeforeFile ? URL.createObjectURL(photoBeforeFile) : resolveMediaUrl(photoBeforeUrl)!} alt="Before" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                  <button onClick={() => { setPhotoBeforeFile(null); setPhotoBeforeUrl(null); }} style={{ position: 'absolute', top: 8, right: 8, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 12 }}>✕</button>
                </div>
              ) : (
                <label className="photo-upload-box" style={{ display: 'block' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📷</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>คลิกเพื่อเลือกไฟล์รูปภาพ</div>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, 'BEFORE')} />
                </label>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#86868b', marginBottom: 6 }}>หลังทำ (After)</label>
              {(photoAfterUrl || photoAfterFile) ? (
                <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <img src={photoAfterFile ? URL.createObjectURL(photoAfterFile) : resolveMediaUrl(photoAfterUrl)!} alt="After" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                  <button onClick={() => { setPhotoAfterFile(null); setPhotoAfterUrl(null); }} style={{ position: 'absolute', top: 8, right: 8, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 12 }}>✕</button>
                </div>
              ) : (
                <label className="photo-upload-box" style={{ display: 'block' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📷</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>คลิกเพื่อเลือกไฟล์รูปภาพ</div>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, 'AFTER')} />
                </label>
              )}
            </div>
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#86868b', marginBottom: 6 }}>หมายเหตุรวม / ปัญหาที่พบ</label>
          <textarea
            className="pmr-input"
            style={{ minHeight: 80, resize: 'vertical' }}
            placeholder="ระบุปัญหาที่พบ อุปกรณ์ที่ต้องซ่อม หรือการดำเนินการที่ทำไปแล้ว..."
            value={remark}
            onChange={e => setRemark(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
