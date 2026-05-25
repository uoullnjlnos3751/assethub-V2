import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { assetAPI } from '../../services/api';

/* ─── Types / Defaults ─────────────────────────────────────────── */
const initialData = {
  assetCode: '', assetName: '', serialNo: '', type: '', brand: '', model: '',
  cpu: '', cpuGeneration: '', ram: '', ramSlot1: '', ramSlot2: '', gpu: '',
  storage1: '', storage2: '', osType: 'Windows', osVersion: '',
  officeLicense: '', antivirusStatus: '', domainName: '',
  vendor: '', poNumber: '', poDate: '', prNumber: '', purchaseDate: '',
  purchasePrice: '', warrantyEndDate: '',
  ownerName: '', departmentId: '', location: '', floor: '',
  company: '', oldAssetCode: '', budget: '', status: 'Available', remark: '',
  snComputer: '', windowsLicense: '',
};

const fallbackStatusOptions = [
  { value: 'Available', label: '✅ พร้อมใช้งาน', cls: 's-available' },
  { value: 'Borrowed',  label: '🔒 กำลังยืม',    cls: 's-reserved' },
  { value: 'InUse',     label: '💼 ใช้งานประจำ',  cls: 's-reserved' },
  { value: 'Maintenance', label: '🔧 ซ่อมบำรุง',  cls: 's-maintenance' },
  { value: 'Retired',   label: '🗑 ปลดระวาง',    cls: 's-retired' },
  { value: 'Lost',      label: '❌ สูญหาย',       cls: 's-maintenance' },
];

const calculateAge = (purchaseDate: string) => {
  if (!purchaseDate) return '';
  const purchased = new Date(purchaseDate);
  if (Number.isNaN(purchased.getTime())) return '';
  const today = new Date();
  let years = today.getFullYear() - purchased.getFullYear();
  const monthDiff = today.getMonth() - purchased.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < purchased.getDate())) years -= 1;
  return Math.max(years, 0).toString();
};

const typeGroupCategoryMap: Record<string, string> = {
  computers: 'คอมพิวเตอร์', monitors: 'จอภาพ', devices: 'อุปกรณ์นำเสนอ/AV',
  printers: 'เครื่องพิมพ์', phonesTablets: 'อุปกรณ์สื่อสาร', network: 'อุปกรณ์เครือข่าย',
};

function getTypeIcon(type: string): string {
  const t = type?.toLowerCase() || '';
  if (['notebook', 'laptop', 'macbook'].some(k => t.includes(k))) return '💻';
  if (['desktop', 'pc', 'workstation', 'all-in-one'].some(k => t.includes(k))) return '🖥';
  if (t.includes('monitor')) return '🖥';
  if (t.includes('printer')) return '🖨';
  if (['phone', 'tablet', 'smartphone'].some(k => t.includes(k))) return '📱';
  if (['switch', 'router', 'firewall', 'access point', 'network'].some(k => t.includes(k))) return '🌐';
  if (t.includes('projector')) return '📽';
  return '🔧';
}

/* ─── Small UI helpers ─────────────────────────────────────────── */
function FG({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="fg">
      <label className={`lbl${required ? ' req' : ''}`}>{label}</label>
      {children}
    </div>
  );
}

function FInput({ value, onChange, disabled, placeholder, type = 'text', readOnly }: {
  value: string; onChange?: (v: string) => void; disabled?: boolean;
  placeholder?: string; type?: string; readOnly?: boolean;
}) {
  return (
    <input type={type} value={value}
      onChange={e => onChange?.(e.target.value)}
      disabled={disabled} placeholder={placeholder}
      readOnly={readOnly}
    />
  );
}

function FSelect({ value, onChange, children, disabled }: {
  value: string; onChange?: (v: string) => void; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <select value={value} onChange={e => onChange?.(e.target.value)} disabled={disabled}>
      {children}
    </select>
  );
}

function FTextarea({ value, onChange, placeholder }: {
  value: string; onChange?: (v: string) => void; placeholder?: string;
}) {
  return <textarea value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} />;
}

function ToggleWrap({ label, desc, checked, onChange }: {
  label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="toggle-wrap">
      <div className="toggle-info">
        <div className="tl">{label}</div>
        {desc && <div className="ts">{desc}</div>}
      </div>
      <label className="sw">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="knob"></span>
      </label>
    </div>
  );
}

function SecCard({ title, sub, barColor, children }: {
  title: string; sub?: string; barColor?: string; children: React.ReactNode;
}) {
  return (
    <div className="glass sec-card">
      <div className="sec-hd">
        <div className="sec-bar" style={{ background: barColor || 'linear-gradient(180deg,#4f46e5,#7c3aed)' }}></div>
        <div className="sec-title">{title}</div>
        {sub && <span className="sec-sub">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────── */
export default function AssetFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeGroupFromUrl = searchParams.get('typeGroup') || '';
  const [form, setForm] = useState<any>(initialData);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<Record<string, any>>({});

  // Dropdown options
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [availableTypes, setAvailableTypes] = useState<any[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [vendorOptions, setVendorOptions] = useState<string[]>([]);
  const [osTypeOptions, setOsTypeOptions] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [domainOptions, setDomainOptions] = useState<string[]>([]);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [antivirusOptions, setAntivirusOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState(fallbackStatusOptions);
  const [initialCategoryId, setInitialCategoryId] = useState<number | null>(null);

  // Image
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Change tracking (for unsaved banner / changelog)
  const [originalSnapshot, setOriginalSnapshot] = useState<Record<string, string>>({});
  const [changes, setChanges] = useState<Record<string, { label: string; from: string; to: string }>>({});

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastColor, setToastColor] = useState('#1e1b4b');
  const toastTimer = useRef<any>(null);

  // Duplicate check
  const [duplicates, setDuplicates] = useState<Record<string, boolean>>({});
  const checkTimer = useRef<any>(null);

  const checkDuplicate = useCallback(async (assetCode?: string, serialNo?: string, assetName?: string) => {
    if (!assetCode && !serialNo && !assetName) { setDuplicates({}); return; }
    try {
      const res = await assetAPI.checkDuplicate({ assetCode, serialNo, assetName, excludeId: id ? parseInt(id) : undefined });
      setDuplicates(res.data.duplicates || {});
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const code = form.assetCode?.trim();
    const serial = form.serialNo?.trim();
    const name = form.assetName?.trim();
    checkTimer.current = setTimeout(() => checkDuplicate(code || undefined, serial || undefined, name || undefined), 600);
    return () => { if (checkTimer.current) clearTimeout(checkTimer.current); };
  }, [form.assetCode, form.serialNo, form.assetName, checkDuplicate]);

  const assetAge = useMemo(() => calculateAge(form.purchaseDate), [form.purchaseDate]);

  const typeLower = form.type?.toLowerCase() || '';
  const catName = categories.find(c => c.id === selectedCategory)?.name || '';

  const isComputer = useMemo(() => {
    if (catName) return catName === 'คอมพิวเตอร์';
    const t = typeLower.trim();
    if (t === 'pc') return true;
    return ['notebook', 'pc desktop', 'macbook', 'mini pc', 'all-in-one', 'thin client', 'computer'].some(k => t.includes(k));
  }, [catName, typeLower]);

  const isMonitor = useMemo(() => catName === 'จอภาพ' || typeLower.includes('monitor'), [catName, typeLower]);
  const isPhone = useMemo(() => catName === 'อุปกรณ์สื่อสาร' || ['smartphone', 'tablet', 'mobile hotspot', 'ipad'].some(k => typeLower.includes(k)), [catName, typeLower]);
  const isDevice = useMemo(() => catName === 'อุปกรณ์นำเสนอ/AV' || ['projector', 'conference speaker', 'webcam', 'docking station', 'presentation clicker'].some(k => typeLower.includes(k)), [catName, typeLower]);
  const isNetwork = useMemo(() => catName === 'อุปกรณ์เครือข่าย' || ['switch', 'router', 'access point', 'firewall', 'modem'].some(k => typeLower.includes(k)), [catName, typeLower]);
  const isRack = useMemo(() => catName === 'Rack & Infrastructure' || ['server rack', 'pdu', 'ups', 'enclosure'].some(k => typeLower.includes(k)), [catName, typeLower]);
  const isPrinter = useMemo(() => catName === 'เครื่องพิมพ์' || typeLower.includes('printer'), [catName, typeLower]);
  const isCable = useMemo(() => catName === 'สายสัญญาณ' || ['hdmi cable', 'lan cable', 'power cable'].some(k => typeLower.includes(k)), [catName, typeLower]);
  const isConsumable = useMemo(() => catName === 'วัสดุสิ้นเปลือง' || ['cartridge', 'toner', 'adapter/charger'].some(k => typeLower.includes(k)), [catName, typeLower]);

  /* ─── Load asset ─── */
  useEffect(() => {
    if (!id) return;
    assetAPI.get(parseInt(id)).then((res) => {
      const a = res.data;
      const loaded: any = {
        assetCode: a.assetCode || '', assetName: a.assetName || '',
        serialNo: a.serialNo || '', type: a.type || '',
        brand: a.brand || '', model: a.model || '',
        cpu: a.cpu || '', cpuGeneration: a.cpuGeneration || '',
        ram: a.ram || '', ramSlot1: a.ramSlot1 || '', ramSlot2: a.ramSlot2 || '',
        gpu: a.gpu || '', storage1: a.storage1 || '', storage2: a.storage2 || '',
        osType: a.osType || 'Windows', osVersion: a.osVersion || '',
        officeLicense: a.officeLicense || '', antivirusStatus: a.antivirusStatus || '',
        domainName: a.domainName || '', snComputer: a.snComputer || '',
        windowsLicense: a.windowsLicense || '',
        vendor: a.vendor || '', poNumber: a.poNumber || '',
        poDate: a.poDate ? a.poDate.split('T')[0] : '',
        prNumber: a.prNumber || '',
        purchaseDate: a.purchaseDate ? a.purchaseDate.split('T')[0] : '',
        purchasePrice: a.purchasePrice != null ? String(a.purchasePrice) : '',
        warrantyEndDate: a.warrantyEndDate ? a.warrantyEndDate.split('T')[0] : '',
        ownerName: a.ownerName || '', departmentId: a.departmentId || '',
        location: a.location || '', floor: a.floor || '',
        company: a.company || '', oldAssetCode: a.oldAssetCode || '',
        budget: a.budget || '', status: a.status || 'Available', remark: a.remark || '',
      };
      setForm(loaded);
      setOriginalSnapshot({ ...loaded });
      if (a.image) setImagePreview(a.image);
      if (a.detail) setDetail(a.detail);
      if (a.categoryId) setInitialCategoryId(a.categoryId);
    }).finally(() => setFetching(false));
  }, [id]);

  /* ─── Load options ─── */
  useEffect(() => {
    assetAPI.typeOptions().then((res) => setTypeOptions(res.data || [])).catch(() => {});
    import('../../services/api').then(({ categoryAPI }) => {
      categoryAPI.list().then((res) => setCategories(res.data || [])).catch(() => {});
    });
    assetAPI.locationOptions().then((res) => setLocationOptions(res.data || [])).catch(() => {});
    assetAPI.vendorOptions().then((res) => setVendorOptions(res.data || [])).catch(() => {});
    assetAPI.osTypeOptions().then((res) => setOsTypeOptions(res.data || [])).catch(() => {});
    assetAPI.departmentOptions().then((res) => setDepartmentOptions(res.data || [])).catch(() => {});
    assetAPI.domainOptions().then((res) => setDomainOptions(res.data || [])).catch(() => {});
    assetAPI.companyOptions().then((res) => setCompanyOptions(res.data || [])).catch(() => {});
    assetAPI.antivirusOptions().then((res) => setAntivirusOptions(res.data || [])).catch(() => {});
    assetAPI.statusOptions()
      .then((res) => {
        const opts = (res.data || []).map((item: any) => ({
          value: item.code, label: item.name,
          cls: item.code === 'Available' ? 's-available' : item.code === 'Maintenance' ? 's-maintenance' : item.code === 'Retired' ? 's-retired' : 's-reserved',
        }));
        setStatusOptions(opts.length ? opts : fallbackStatusOptions);
      })
      .catch(() => setStatusOptions(fallbackStatusOptions));
  }, []);

  useEffect(() => {
    if (!id && typeGroupFromUrl && categories.length > 0) {
      const targetName = typeGroupCategoryMap[typeGroupFromUrl];
      if (targetName) {
        const cat = categories.find(c => c.name === targetName);
        if (cat) { setSelectedCategory(cat.id); setAvailableTypes(cat.types || []); }
      }
    }
  }, [categories, typeGroupFromUrl, id]);

  useEffect(() => {
    if (initialCategoryId && categories.length > 0) {
      const cat = categories.find(c => c.id === initialCategoryId);
      if (cat) { setSelectedCategory(cat.id); setAvailableTypes(cat.types || []); }
    }
  }, [categories, initialCategoryId]);

  /* ─── Field change tracking ─── */
  function trackChange(field: string, label: string, newVal: string) {
    const orig = originalSnapshot[field] ?? '';
    setChanges(prev => {
      const next = { ...prev };
      if (newVal !== orig) {
        next[field] = { label, from: orig, to: newVal };
      } else {
        delete next[field];
      }
      return next;
    });
  }

  function setFormField(field: string, label: string, value: string) {
    setForm((prev: any) => ({ ...prev, [field]: value }));
    if (id) trackChange(field, label, value);
  }

  function setDetailField(field: string, value: any) {
    setDetail(prev => ({ ...prev, [field]: value }));
  }

  /* ─── Toast ─── */
  function showToast(msg: string, color = '#1e1b4b') {
    setToastMsg(msg);
    setToastColor(color);
    setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 3000);
  }

  /* ─── Submit ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.serialNo.trim()) {
      setError('กรุณากรอก Serial Number');
      showToast('⚠️ กรุณากรอก Serial Number', '#b45309');
      return;
    }
    setLoading(true); setError('');
    const payload = { ...form, detail, categoryId: selectedCategory || undefined };
    try {
      if (id) { await assetAPI.update(parseInt(id), payload); }
      else { await assetAPI.create(payload); }
      showToast('✅ บันทึกข้อมูลสำเร็จ!', '#059669');
      setTimeout(() => navigate(id ? `/assets/${id}` : '/assets'), 800);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'ไม่สามารถบันทึกข้อมูลได้';
      setError(msg);
      showToast('❌ ' + msg, '#dc2626');
    } finally { setLoading(false); }
  };

  /* ─── Image handlers ─── */
  const handleImageUpload = async (file: File) => {
    if (!id) { setImageError('กรุณาบันทึกทรัพย์สินก่อนอัพโหลดรูปภาพ'); return; }
    if (!file.type.startsWith('image/')) { setImageError('กรุณาเลือกไฟล์รูปภาพเท่านั้น'); return; }
    if (file.size > 5 * 1024 * 1024) { setImageError('ขนาดไฟล์ต้องไม่เกิน 5MB'); return; }
    setImageUploading(true); setImageError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await assetAPI.uploadImage(parseInt(id), formData);
      setImagePreview(res.data.image);
    } catch (err: any) {
      setImageError(err.response?.data?.error || 'ไม่สามารถอัพโหลดรูปภาพได้');
    } finally { setImageUploading(false); }
  };

  const handleImageDelete = async () => {
    if (!id) return;
    try { await assetAPI.deleteImage(parseInt(id)); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }
    catch (err: any) { setImageError(err.response?.data?.error || 'ไม่สามารถลบรูปภาพได้'); }
  };

  const changeCount = Object.keys(changes).length;
  const hasChanges = changeCount > 0;

  /* ─── Loading state ─── */
  if (fetching) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress size={32} />
    </div>
  );

  const icon = getTypeIcon(form.type);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        .ef-root{font-family:'Sarabun',sans-serif;position:relative}
        .ef-orb{position:fixed;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0}
        .ef-o1{width:420px;height:420px;background:rgba(99,102,241,.08);top:-140px;left:-100px}
        .ef-o2{width:300px;height:300px;background:rgba(139,92,246,.07);bottom:-80px;right:-60px}
        .ef-grid-bg{position:fixed;inset:0;background-image:radial-gradient(circle,rgba(99,102,241,.08) 1px,transparent 1px);background-size:28px 28px;pointer-events:none;z-index:0}
        .ef-page{position:relative;z-index:1;max-width:860px;margin:0 auto;padding:16px 20px 120px}

        .glass{background:rgba(255,255,255,.68);border:1px solid rgba(255,255,255,.88);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border-radius:14px;box-shadow:0 4px 24px rgba(99,102,241,.07),0 1px 3px rgba(0,0,0,.04)}

        /* breadcrumb */
        .bc{display:flex;align-items:center;gap:6px;font-size:12px;color:#9ca3af;margin-bottom:14px}
        .bc a{color:#6366f1;font-weight:600;cursor:pointer;text-decoration:none}
        .bc a:hover{text-decoration:underline}
        .bc-sep{color:#d1d5db}

        /* page header */
        .page-hdr{padding:18px 22px;margin-bottom:16px;display:flex;align-items:center;gap:14px}
        .asset-icon{width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;box-shadow:0 4px 14px rgba(99,102,241,.3)}
        .page-title{font-size:17px;font-weight:700;color:#1e1b4b}
        .page-sub{font-size:11.5px;color:#9ca3af;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .asset-code-badge{font-family:monospace;font-size:11px;font-weight:700;color:#4338ca;background:rgba(99,102,241,.09);padding:2px 9px;border-radius:6px}

        /* unsaved banner */
        .unsaved-bar{display:flex;align-items:center;gap:8px;padding:10px 16px;background:rgba(245,158,11,.09);border:1px solid rgba(245,158,11,.28);border-radius:10px;margin-bottom:14px;font-size:12px;color:#b45309}

        /* changelog */
        .changelog{background:rgba(254,252,232,.5);border:1px solid rgba(245,158,11,.2);border-radius:10px;padding:12px 14px;margin-bottom:14px}
        .changelog-hd{font-size:11px;font-weight:700;color:#b45309;margin-bottom:8px}
        .cl-item{display:flex;align-items:baseline;gap:8px;font-size:11.5px;padding:3px 0;border-bottom:1px solid rgba(245,158,11,.1)}
        .cl-item:last-child{border:none}
        .cl-field{color:#6b7280;min-width:120px;flex-shrink:0;font-weight:500}
        .cl-from{color:#dc2626;text-decoration:line-through;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .cl-to{color:#059669;font-weight:600;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .cl-arr{color:#9ca3af}

        /* error banner */
        .err-bar{padding:10px 16px;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:10px;margin-bottom:14px;font-size:12px;color:#dc2626;display:flex;align-items:center;gap:8px}

        /* section card */
        .sec-card{padding:16px 20px;margin-bottom:14px}
        .sec-hd{display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(99,102,241,.07)}
        .sec-bar{width:3px;height:15px;border-radius:2px;flex-shrink:0}
        .sec-title{font-size:13px;font-weight:700;color:#1e1b4b}
        .sec-sub{font-size:11px;color:#9ca3af;margin-left:auto}

        /* form grid */
        .row{display:grid;gap:12px;margin-bottom:12px}
        .r2{grid-template-columns:1fr 1fr}
        .r3{grid-template-columns:1fr 1fr 1fr}
        .r4{grid-template-columns:1fr 1fr 1fr 1fr}
        @media(max-width:600px){.r2,.r3,.r4{grid-template-columns:1fr 1fr}}
        .fg{display:flex;flex-direction:column;gap:5px}
        .lbl{font-size:11.5px;color:#6b7280;font-weight:500}
        .lbl.req::after{content:'*';color:#ef4444;margin-left:2px}
        input[type=text],input[type=number],input[type=date],select,textarea{
          width:100%;padding:8px 11px;border:1px solid rgba(99,102,241,.18);border-radius:9px;
          background:rgba(255,255,255,.7);font-family:'Sarabun',sans-serif;font-size:12.5px;color:#374151;
          outline:none;transition:border-color .15s,box-shadow .15s;box-sizing:border-box
        }
        input:focus,select:focus,textarea:focus{border-color:rgba(99,102,241,.45);box-shadow:0 0 0 3px rgba(99,102,241,.09)}
        input:disabled,select:disabled{background:rgba(248,247,255,.6);color:#9ca3af;cursor:not-allowed}
        input[readonly]{background:rgba(248,247,255,.7);color:#6b7280}
        textarea{resize:vertical;min-height:68px}
        .hint{font-size:10.5px;color:#c4b5fd;margin-top:3px}
        .hint.err{color:#ef4444;font-weight:600}

        /* status pills */
        .status-row{display:flex;gap:6px;flex-wrap:wrap}
        .status-opt{padding:7px 14px;border-radius:20px;border:1.5px solid;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:'Sarabun',sans-serif;background:rgba(255,255,255,.5)}
        .s-available{border-color:rgba(16,185,129,.3);color:#059669}
        .s-available.sel{background:rgba(16,185,129,.12);border-color:rgba(16,185,129,.5)}
        .s-reserved{border-color:rgba(99,102,241,.25);color:#4338ca}
        .s-reserved.sel{background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.45)}
        .s-maintenance{border-color:rgba(239,68,68,.25);color:#dc2626}
        .s-maintenance.sel{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.45)}
        .s-retired{border-color:rgba(107,114,128,.2);color:#6b7280}
        .s-retired.sel{background:rgba(107,114,128,.08);border-color:rgba(107,114,128,.4)}

        /* toggle */
        .toggle-wrap{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:rgba(248,247,255,.65);border:1px solid rgba(99,102,241,.09);border-radius:9px;transition:background .15s}
        .toggle-wrap:hover{background:rgba(99,102,241,.04)}
        .toggle-info .tl{font-size:12.5px;color:#374151;font-weight:500}
        .toggle-info .ts{font-size:10.5px;color:#9ca3af;margin-top:1px}
        .sw{position:relative;width:38px;height:21px;flex-shrink:0;cursor:pointer}
        .sw input{opacity:0;width:0;height:0;position:absolute}
        .knob{position:absolute;inset:0;border-radius:21px;background:#e5e7eb;cursor:pointer;transition:background .2s}
        .knob::before{content:'';position:absolute;width:17px;height:17px;border-radius:50%;background:#fff;top:2px;left:2px;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.15)}
        .sw input:checked+.knob{background:linear-gradient(135deg,#4f46e5,#7c3aed)}
        .sw input:checked+.knob::before{transform:translateX(17px)}

        /* sticky footer */
        .sticky-footer{position:fixed;bottom:0;left:0;right:0;z-index:100;background:rgba(255,255,255,.9);backdrop-filter:blur(20px);border-top:1px solid rgba(99,102,241,.1);padding:12px 24px;display:flex;align-items:center;justify-content:space-between}
        .footer-right{display:flex;align-items:center;gap:10px}
        .footer-count{font-size:12px;color:#9ca3af}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;font-size:12.5px;font-family:'Sarabun',sans-serif;cursor:pointer;font-weight:600;border:1px solid;transition:all .15s}
        .btn-primary{background:linear-gradient(135deg,#4f46e5,#7c3aed);border-color:rgba(124,58,237,.35);color:#fff;box-shadow:0 3px 12px rgba(99,102,241,.28)}
        .btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .btn-ghost{background:rgba(255,255,255,.7);border-color:rgba(99,102,241,.2);color:#4338ca}
        .btn-ghost:hover{background:rgba(99,102,241,.05)}
        .btn-danger{background:rgba(239,68,68,.06);border-color:rgba(239,68,68,.22);color:#dc2626}
        .spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:ef-spin .6s linear infinite}
        @keyframes ef-spin{to{transform:rotate(360deg)}}

        /* toast */
        .ef-toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);opacity:0;transition:all .3s;z-index:200;pointer-events:none}
        .ef-toast.show{transform:translateX(-50%) translateY(0);opacity:1}
        .ef-toast-inner{color:#fff;padding:10px 20px;border-radius:12px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.2)}

        /* image upload */
        .img-drop{width:100%;aspect-ratio:4/3;border-radius:12px;border:2px dashed rgba(99,102,241,.2);background:rgba(248,247,255,.5);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:border-color .15s;position:relative;overflow:hidden}
        .img-drop:hover{border-color:rgba(99,102,241,.4);background:rgba(99,102,241,.03)}
        .img-drop img{width:100%;height:100%;object-fit:contain}
        .img-actions{position:absolute;top:8px;right:8px;display:flex;gap:4px}
        .img-btn{width:28px;height:28px;border-radius:8px;border:1px solid rgba(99,102,241,.2);background:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;transition:all .15s}
        .img-btn:hover{background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.1)}
        .img-btn.del{border-color:rgba(239,68,68,.2);color:#dc2626}
        .img-hint{text-align:center;padding:24px;color:#9ca3af;font-size:12px;line-height:1.8}
      `}</style>

      <div className="ef-root">
        <div className="ef-orb ef-o1"></div>
        <div className="ef-orb ef-o2"></div>
        <div className="ef-grid-bg"></div>

        <div className="ef-page">
          {/* Breadcrumb */}
          <div className="bc">
            <a onClick={() => navigate('/assets')}>ทรัพย์สิน IT</a>
            {id && form.assetCode && <><span className="bc-sep">›</span><a onClick={() => navigate(`/assets/${id}`)}>{form.assetCode}</a></>}
            <span className="bc-sep">›</span>
            <span style={{ color: '#9ca3af' }}>{id ? 'แก้ไขข้อมูล' : 'เพิ่มทรัพย์สินใหม่'}</span>
          </div>

          {/* Page header */}
          <div className="glass page-hdr">
            <div className="asset-icon">{icon}</div>
            <div style={{ flex: 1 }}>
              <div className="page-title">{id ? 'แก้ไขข้อมูลทรัพย์สิน' : 'เพิ่มทรัพย์สินใหม่'}</div>
              <div className="page-sub">
                {form.assetCode && <span className="asset-code-badge">{form.assetCode}</span>}
                {(form.brand || form.model) && <span>{form.brand} {form.model}{form.type ? ` · ${form.type}` : ''}</span>}
              </div>
            </div>
            {id && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '10px', color: '#9ca3af' }}>กำลังแก้ไข</div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>{form.assetCode}</div>
              </div>
            )}
          </div>

          {/* Unsaved banner */}
          {hasChanges && (
            <div className="unsaved-bar">
              ⚠️ มีการเปลี่ยนแปลง {changeCount} รายการที่ยังไม่ได้บันทึก
            </div>
          )}

          {/* Changelog */}
          {hasChanges && (
            <div className="changelog">
              <div className="changelog-hd">✏️ รายการที่เปลี่ยนแปลง ({changeCount} รายการ)</div>
              {Object.values(changes).map((c, i) => (
                <div className="cl-item" key={i}>
                  <span className="cl-field">{c.label}</span>
                  <span className="cl-from">{c.from || '(ว่าง)'}</span>
                  <span className="cl-arr">→</span>
                  <span className="cl-to">{c.to}</span>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && <div className="err-bar">❌ {error}</div>}

          <form id="asset-form" onSubmit={handleSubmit}>

              {/* ① ข้อมูลพื้นฐานทรัพย์สิน */}
            <SecCard title="ข้อมูลพื้นฐานทรัพย์สิน" sub="Core Asset Identification">
              <div className="row r2">
                <FG label="เลขครุภัณฑ์ (Asset Code)">
                  <FInput value={form.assetCode} onChange={v => setFormField('assetCode', 'เลขครุภัณฑ์ (Asset Code)', v)} placeholder="เช่น HQ-PS-N001" />
                  {duplicates.assetCode && <div className="hint err">⚠️ เลขครุภัณฑ์นี้มีอยู่ในระบบแล้ว</div>}
                </FG>
                <FG label="ชื่อทรัพย์สิน / รหัสทรัพย์สิน">
                  <FInput value={form.assetName} onChange={v => setFormField('assetName', 'ชื่อทรัพย์สิน / รหัสทรัพย์สิน', v)} placeholder="ชื่อสำหรับเรียกทรัพย์สิน หรือ รหัสพัสดุภายในองค์กร" />
                  {duplicates.assetName && <div className="hint err">⚠️ ชื่อทรัพย์สินนี้มีอยู่ในระบบแล้ว</div>}
                </FG>
              </div>
              <div className="row r3">
                <FG label="ยี่ห้อ (Brand)" required>
                  <FInput value={form.brand} onChange={v => setFormField('brand', 'ยี่ห้อ', v)} placeholder="เช่น Dell, HP, Lenovo" />
                </FG>
                <FG label="รุ่น (Model)">
                  <FInput value={form.model} onChange={v => setFormField('model', 'รุ่น', v)} placeholder="เช่น Latitude 5530" />
                </FG>
                <FG label="หมายเลขซีเรียล (S/N)">
                  <FInput value={form.serialNo} onChange={v => setFormField('serialNo', 'Serial No.', v)} placeholder="Serial No." />
                  {duplicates.serialNo && <div className="hint err">⚠️ Serial number นี้มีอยู่ในระบบแล้ว</div>}
                </FG>
              </div>
              <div className="row r3">
                <FG label="หมวดหมู่">
                  <FSelect value={selectedCategory ? String(selectedCategory) : ''} onChange={v => {
                    const catId = v ? parseInt(v) : null;
                    setSelectedCategory(catId);
                    setForm((prev: any) => ({ ...prev, type: '' }));
                    if (catId) { const cat = categories.find(c => c.id === catId); setAvailableTypes(cat?.types || []); }
                    else setAvailableTypes([]);
                  }}>
                    <option value="">ไม่ระบุ</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </FSelect>
                </FG>
                <FG label="ประเภทอุปกรณ์">
                  <FSelect value={form.type} onChange={v => setFormField('type', 'ประเภท', v)}>
                    <option value="">ไม่ระบุ</option>
                    {(selectedCategory ? availableTypes : typeOptions.map(t => ({ name: t }))).map((opt: any) => <option key={opt.name || opt} value={opt.name || opt}>{opt.name || opt}</option>)}
                  </FSelect>
                </FG>
              </div>
            </SecCard>

            {/* ② ข้อมูลการครอบครองและตำแหน่งพิกัด */}
            <SecCard title="ข้อมูลการครอบครองและตำแหน่งพิกัด" sub="Ownership & Location" barColor="linear-gradient(180deg,#8b5cf6,#a855f7)">
              <div className="row r3">
                <FG label="ผู้ใช้งานหลัก (End User)">
                  <FInput value={form.ownerName} onChange={v => setFormField('ownerName', 'ผู้รับผิดชอบหลัก', v)} placeholder="ชื่อ-นามสกุล ผู้ใช้งานหลัก" />
                </FG>
                <FG label="แผนกที่ใช้งาน">
                  <FSelect value={form.departmentId} onChange={v => setFormField('departmentId', 'แผนก', v)}>
                    <option value="">ไม่ระบุ</option>
                    {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </FSelect>
                </FG>
                <FG label="บริษัท (Company)">
                  <FSelect value={form.company} onChange={v => setFormField('company', 'Company', v)}>
                    <option value="">ไม่ระบุ</option>
                    {companyOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </FSelect>
                </FG>
              </div>
              <div className="row r2">
                <FG label="สถานที่ติดตั้ง / อาคาร">
                  <FSelect value={form.location} onChange={v => setFormField('location', 'Location', v)}>
                    <option value="">ไม่ระบุ</option>
                    {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
                  </FSelect>
                </FG>
                <FG label="ชั้น / บริเวณห้อง">
                  <FInput value={form.floor} onChange={v => setFormField('floor', 'ชั้น', v)} placeholder="เช่น ชั้น 4 ห้องประชุมใหญ่, B1 คลังพัสดุ" />
                </FG>
              </div>
            </SecCard>

            {/* ② Hardware (Computer only) */}
            {isComputer && !isMonitor && (
              <SecCard title="สเปก Hardware" barColor="linear-gradient(180deg,#2563eb,#60a5fa)">
                <div className="row r3">
                  <FG label="CPU">
                    <FInput value={form.cpu} onChange={v => setFormField('cpu', 'CPU', v)} placeholder="เช่น Intel Core i7-1260P" />
                  </FG>
                  <FG label="CPU Generation">
                    <FInput value={form.cpuGeneration} onChange={v => setFormField('cpuGeneration', 'CPU Gen', v)} placeholder="เช่น Gen 12" />
                  </FG>
                  <FG label="RAM">
                    <FInput value={form.ram} onChange={v => setFormField('ram', 'RAM', v)} placeholder="เช่น 16 GB DDR5" />
                  </FG>
                </div>
                <div className="row r3">
                  <FG label="RAM Slot 1">
                    <FInput value={form.ramSlot1} onChange={v => setFormField('ramSlot1', 'RAM Slot 1', v)} placeholder="เช่น 8 GB" />
                  </FG>
                  <FG label="RAM Slot 2">
                    <FInput value={form.ramSlot2} onChange={v => setFormField('ramSlot2', 'RAM Slot 2', v)} placeholder="เช่น 8 GB" />
                  </FG>
                  <FG label="GPU">
                    <FInput value={form.gpu} onChange={v => setFormField('gpu', 'GPU', v)} placeholder="เช่น NVIDIA RTX 3060" />
                  </FG>
                </div>
                <div className="row r3">
                  <FG label="Storage 1">
                    <FInput value={form.storage1} onChange={v => setFormField('storage1', 'Storage 1', v)} placeholder="เช่น 512 GB NVMe SSD" />
                  </FG>
                  <FG label="Storage 2">
                    <FInput value={form.storage2} onChange={v => setFormField('storage2', 'Storage 2', v)} placeholder="เช่น 1 TB HDD" />
                  </FG>
                  <FG label="อายุอุปกรณ์ (ปี)">
                    <FInput value={assetAge} readOnly placeholder="คำนวณอัตโนมัติ" />
                    <div className="hint">คำนวณจากวันที่ซื้อ</div>
                  </FG>
                </div>
              </SecCard>
            )}

            {/* ③ OS & Software (Computer only) */}
            {isComputer && !isMonitor && (
              <SecCard title="ระบบปฏิบัติการ & Software" barColor="linear-gradient(180deg,#0284c7,#38bdf8)">
                <div className="row r3">
                  <FG label="OS Type">
                    <FSelect value={form.osType} onChange={v => setFormField('osType', 'OS Type', v)}>
                      <option value="">ไม่ระบุ</option>
                      {(osTypeOptions.length ? osTypeOptions : ['Windows', 'macOS', 'Linux']).map(o => <option key={o} value={o}>{o}</option>)}
                    </FSelect>
                  </FG>
                  <FG label="OS Version">
                    <FInput value={form.osVersion} onChange={v => setFormField('osVersion', 'OS Version', v)} placeholder="เช่น Windows 11, 24H2" />
                  </FG>
                  <FG label="Windows License">
                    <FInput value={form.windowsLicense} onChange={v => setFormField('windowsLicense', 'Windows License', v)} placeholder="Product Key / License" />
                  </FG>
                </div>
                <div className="row r3">
                  <FG label="MS Office / Office License">
                    <FInput value={form.officeLicense} onChange={v => setFormField('officeLicense', 'MS Office', v)} placeholder="เช่น MS 365, Office 2021" />
                  </FG>
                  <FG label="Antivirus">
                    <FSelect value={form.antivirusStatus} onChange={v => setFormField('antivirusStatus', 'Antivirus', v)}>
                      <option value="">ไม่ระบุ</option>
                      {(antivirusOptions.length ? antivirusOptions : ['Trend Micro Apex One', 'Kaspersky', 'ESET', 'Windows Defender', 'ไม่มี']).map(a => <option key={a} value={a}>{a}</option>)}
                    </FSelect>
                  </FG>
                  <FG label="S/N Computer (Computer Name)">
                    <FInput value={form.snComputer} onChange={v => setFormField('snComputer', 'S/N Computer', v)} placeholder="เช่น HQ-PS-N039" />
                  </FG>
                </div>
              </SecCard>
            )}

            {/* Monitor detail */}
            {isMonitor && (
              <SecCard title="ข้อมูลจอภาพ" barColor="linear-gradient(180deg,#7c3aed,#a855f7)">
                <div className="row r3">
                  <FG label="ขนาดจอ (นิ้ว)">
                    <FInput value={detail.screenSize || ''} onChange={v => setDetailField('screenSize', v)} placeholder="เช่น 24, 27, 34" />
                  </FG>
                  <FG label="ความละเอียด">
                    <FSelect value={detail.resolution || ''} onChange={v => setDetailField('resolution', v)}>
                      <option value="">ไม่ระบุ</option>
                      {['1920x1080','2560x1080','2560x1440','3440x1440','3840x2160','Others'].map(r => <option key={r} value={r}>{r}</option>)}
                    </FSelect>
                  </FG>
                  <FG label="Panel Type">
                    <FSelect value={detail.panelType || ''} onChange={v => setDetailField('panelType', v)}>
                      <option value="">ไม่ระบุ</option>
                      {['IPS','VA','TN','OLED','QLED','Others'].map(p => <option key={p} value={p}>{p}</option>)}
                    </FSelect>
                  </FG>
                </div>
                <div className="row r3">
                  <FG label="Refresh Rate">
                    <FInput value={detail.refreshRate || ''} onChange={v => setDetailField('refreshRate', v)} placeholder="เช่น 60Hz, 144Hz" />
                  </FG>
                  <FG label="พอร์ตเชื่อมต่อ">
                    <FInput value={detail.ports || ''} onChange={v => setDetailField('ports', v)} placeholder="เช่น HDMI x2, DP" />
                  </FG>
                </div>
              </SecCard>
            )}

            {/* Phone detail */}
            {isPhone && (
              <SecCard title="ข้อมูลอุปกรณ์สื่อสาร" barColor="linear-gradient(180deg,#7c3aed,#a855f7)">
                <div className="row r3">
                  <FG label="IMEI 1"><FInput value={detail.imei1 || ''} onChange={v => setDetailField('imei1', v)} placeholder="15 หลัก" /></FG>
                  <FG label="IMEI 2"><FInput value={detail.imei2 || ''} onChange={v => setDetailField('imei2', v)} placeholder="15 หลัก (ถ้ามี)" /></FG>
                  <FG label="เบอร์โทรศัพท์"><FInput value={detail.phoneNumber || ''} onChange={v => setDetailField('phoneNumber', v)} /></FG>
                </div>
                <div className="row r3">
                  <FG label="OS"><FSelect value={detail.osType || ''} onChange={v => setDetailField('osType', v)}>
                    <option value="">ไม่ระบุ</option>
                    {['iOS','iPadOS','Android','Others'].map(o => <option key={o} value={o}>{o}</option>)}
                  </FSelect></FG>
                  <FG label="OS Version"><FInput value={detail.osVersion || ''} onChange={v => setDetailField('osVersion', v)} /></FG>
                  <FG label="Storage"><FInput value={detail.storageCapacity || ''} onChange={v => setDetailField('storageCapacity', v)} placeholder="เช่น 128GB" /></FG>
                </div>
                <div className="row r3">
                  <FG label="RAM"><FInput value={detail.ram || ''} onChange={v => setDetailField('ram', v)} /></FG>
                  <FG label="สี"><FInput value={detail.color || ''} onChange={v => setDetailField('color', v)} /></FG>
                  <FG label="SIM Provider"><FInput value={detail.simProvider || ''} onChange={v => setDetailField('simProvider', v)} /></FG>
                </div>
              </SecCard>
            )}

            {/* Network detail */}
            {isNetwork && (
              <SecCard title="ข้อมูลอุปกรณ์เครือข่าย" barColor="linear-gradient(180deg,#0891b2,#38bdf8)">
                <div className="row r3">
                  <FG label="IP Address"><FInput value={detail.ipAddress || ''} onChange={v => setDetailField('ipAddress', v)} /></FG>
                  <FG label="MAC Address"><FInput value={detail.macAddress || ''} onChange={v => setDetailField('macAddress', v)} /></FG>
                  <FG label="จำนวน Port"><FInput type="number" value={detail.portCount ?? ''} onChange={v => setDetailField('portCount', v)} /></FG>
                </div>
                <div className="row r3">
                  <FG label="Port Speed">
                    <FSelect value={detail.portSpeed || ''} onChange={v => setDetailField('portSpeed', v)}>
                      <option value="">ไม่ระบุ</option>
                      {['100Mbps','1Gbps','10Gbps','25Gbps','40Gbps'].map(s => <option key={s} value={s}>{s}</option>)}
                    </FSelect>
                  </FG>
                  <FG label="Firmware Version"><FInput value={detail.firmwareVersion || ''} onChange={v => setDetailField('firmwareVersion', v)} /></FG>
                  <FG label="Managed">
                    <FSelect value={detail.isManaged == null ? '' : String(detail.isManaged)} onChange={v => setDetailField('isManaged', v === '' ? null : v === 'true')}>
                      <option value="">ไม่ระบุ</option>
                      <option value="true">Managed</option>
                      <option value="false">Unmanaged</option>
                    </FSelect>
                  </FG>
                </div>
              </SecCard>
            )}

            {/* Printer detail */}
            {isPrinter && (
              <SecCard title="ข้อมูลเครื่องพิมพ์" barColor="linear-gradient(180deg,#dc2626,#f87171)">
                <div className="row r3">
                  <FG label="ประเภทเครื่องพิมพ์">
                    <FSelect value={detail.printerType || ''} onChange={v => setDetailField('printerType', v)}>
                      <option value="">ไม่ระบุ</option>
                      {['Laser','Inkjet','Thermal','Dot Matrix','Others'].map(p => <option key={p} value={p}>{p}</option>)}
                    </FSelect>
                  </FG>
                  <FG label="ขนาดกระดาษ"><FInput value={detail.paperSizes || ''} onChange={v => setDetailField('paperSizes', v)} placeholder="เช่น A4, A3" /></FG>
                  <FG label="รุ่นหมึก / Cartridge"><FInput value={detail.cartridgeModel || ''} onChange={v => setDetailField('cartridgeModel', v)} /></FG>
                </div>
                <div className="row r3">
                  <FG label="IP Address"><FInput value={detail.ipAddress || ''} onChange={v => setDetailField('ipAddress', v)} /></FG>
                  <FG label="MAC Address"><FInput value={detail.macAddress || ''} onChange={v => setDetailField('macAddress', v)} /></FG>
                  <FG label="จำนวนหน้าที่พิมพ์"><FInput type="number" value={detail.pageCount ?? ''} onChange={v => setDetailField('pageCount', v)} /></FG>
                </div>
              </SecCard>
            )}

            {/* AV Device */}
            {isDevice && (
              <SecCard title="ข้อมูลอุปกรณ์ AV/นำเสนอ" barColor="linear-gradient(180deg,#059669,#34d399)">
                <div className="row r3">
                  {typeLower.includes('projector') && <>
                    <FG label="ความสว่าง (Lumens)"><FInput type="number" value={detail.lumens ?? ''} onChange={v => setDetailField('lumens', v)} /></FG>
                    <FG label="ความละเอียด"><FInput value={detail.resolution || ''} onChange={v => setDetailField('resolution', v)} /></FG>
                    <FG label="Lamp Hours"><FInput type="number" value={detail.lampHours ?? ''} onChange={v => setDetailField('lampHours', v)} /></FG>
                  </>}
                  {typeLower.includes('webcam') && <>
                    <FG label="ความละเอียด"><FInput value={detail.resolution || ''} onChange={v => setDetailField('resolution', v)} /></FG>
                    <FG label="FPS"><FInput value={detail.fps || ''} onChange={v => setDetailField('fps', v)} /></FG>
                  </>}
                  <FG label="การเชื่อมต่อ"><FInput value={detail.connectionType || ''} onChange={v => setDetailField('connectionType', v)} /></FG>
                </div>
              </SecCard>
            )}

            {/* Rack/UPS */}
            {isRack && (
              <SecCard title="ข้อมูล Rack / UPS" barColor="linear-gradient(180deg,#374151,#6b7280)">
                <div className="row r3">
                  <FG label="ประเภท">
                    <FSelect value={detail.subType || ''} onChange={v => setDetailField('subType', v)}>
                      <option value="">ไม่ระบุ</option>
                      {['Rack','Enclosure','PDU','UPS'].map(s => <option key={s} value={s}>{s}</option>)}
                    </FSelect>
                  </FG>
                  {typeLower.includes('ups') ? <>
                    <FG label="ความจุ (VA)"><FInput type="number" value={detail.vaCapacity ?? ''} onChange={v => setDetailField('vaCapacity', v)} /></FG>
                    <FG label="Watt"><FInput type="number" value={detail.wattCapacity ?? ''} onChange={v => setDetailField('wattCapacity', v)} /></FG>
                  </> : <>
                    <FG label="Rack Units"><FInput value={detail.rackUnits || ''} onChange={v => setDetailField('rackUnits', v)} placeholder="เช่น 42U" /></FG>
                    <FG label="ตำแหน่ง"><FInput value={detail.rackLocation || ''} onChange={v => setDetailField('rackLocation', v)} /></FG>
                  </>}
                </div>
              </SecCard>
            )}

            {/* Cable */}
            {isCable && (
              <SecCard title="ข้อมูลสายสัญญาณ" barColor="linear-gradient(180deg,#6b7280,#9ca3af)">
                <div className="row r4">
                  <FG label="ประเภทสาย">
                    <FSelect value={detail.cableType || ''} onChange={v => setDetailField('cableType', v)}>
                      <option value="">ไม่ระบุ</option>
                      {['HDMI','DisplayPort','USB-C','LAN CAT5e','LAN CAT6','Power Cable','Audio 3.5mm','Others'].map(c => <option key={c} value={c}>{c}</option>)}
                    </FSelect>
                  </FG>
                  <FG label="ความยาว"><FInput value={detail.length || ''} onChange={v => setDetailField('length', v)} placeholder="เช่น 1.5m" /></FG>
                  <FG label="จำนวนคงเหลือ"><FInput type="number" value={detail.stockQuantity ?? ''} onChange={v => setDetailField('stockQuantity', v)} /></FG>
                  <FG label="Min Stock"><FInput type="number" value={detail.minimumStock ?? ''} onChange={v => setDetailField('minimumStock', v)} /></FG>
                </div>
              </SecCard>
            )}

            {/* Consumable */}
            {isConsumable && (
              <SecCard title="ข้อมูลวัสดุสิ้นเปลือง" barColor="linear-gradient(180deg,#d97706,#fbbf24)">
                <div className="row r3">
                  <FG label="ประเภทวัสดุ">
                    <FSelect value={detail.consumableType || ''} onChange={v => setDetailField('consumableType', v)}>
                      <option value="">ไม่ระบุ</option>
                      {['Toner Cartridge','Ink Cartridge','Drum Unit','Ribbon','Battery AA','Battery AAA','Adapter/Charger','Others'].map(c => <option key={c} value={c}>{c}</option>)}
                    </FSelect>
                  </FG>
                  <FG label="ใช้กับ (Compatible)"><FInput value={detail.compatibleWith || ''} onChange={v => setDetailField('compatibleWith', v)} /></FG>
                  <FG label="วันหมดอายุ"><FInput type="date" value={detail.expiryDate ? String(detail.expiryDate).split('T')[0] : ''} onChange={v => setDetailField('expiryDate', v)} /></FG>
                </div>
                <div className="row r2">
                  <FG label="จำนวนคงเหลือ"><FInput type="number" value={detail.stockQuantity ?? ''} onChange={v => setDetailField('stockQuantity', v)} /></FG>
                  <FG label="Min Stock"><FInput type="number" value={detail.minimumStock ?? ''} onChange={v => setDetailField('minimumStock', v)} /></FG>
                </div>
              </SecCard>
            )}

             {/* ④ ข้อมูลการจัดซื้อและการเงิน */}
            <SecCard title="ข้อมูลการจัดซื้อและการเงิน" sub="Procurement & Finance" barColor="linear-gradient(180deg,#059669,#34d399)">
              <div className="row r3">
                <FG label="วันที่จัดซื้อ / วันรับมอบ">
                  <FInput type="date" value={form.purchaseDate} onChange={v => setFormField('purchaseDate', 'วันที่จัดซื้อ / วันรับมอบ', v)} />
                </FG>
                <FG label="มูลค่าจัดซื้อ (ไม่รวม VAT)">
                  <FInput type="number" value={form.purchasePrice} onChange={v => setFormField('purchasePrice', 'มูลค่าจัดซื้อ', v)} placeholder="ราคาประเมินหรือราคาจัดซื้อจริง" />
                </FG>
                <FG label="อายุการใช้งาน (ปี)">
                  <FInput value={assetAge} readOnly placeholder="คำนวณอัตโนมัติ" />
                  <div className="hint">คำนวณจากวันที่ซื้อ</div>
                </FG>
              </div>
              <div className="row r3">
                <FG label="เลขที่ใบขอซื้อ (PR No.)">
                  <FInput value={form.prNumber} onChange={v => setFormField('prNumber', 'PR Number', v)} placeholder="เช่น PR-2568-0031" />
                </FG>
                <FG label="เลขที่ใบสั่งซื้อ (PO No.)">
                  <FInput value={form.poNumber} onChange={v => setFormField('poNumber', 'PO Number', v)} placeholder="เช่น PO-2568-0042" />
                </FG>
                <FG label="วันที่ออกใบสั่งซื้อ (PO Date)">
                  <FInput type="date" value={form.poDate} onChange={v => setFormField('poDate', 'PO Date', v)} />
                </FG>
              </div>
              <div className="row r2">
                <FG label="แหล่งงบประมาณ / โครงการ">
                  <FInput value={form.budget} onChange={v => setFormField('budget', 'งบประมาณ', v)} placeholder="เช่น งบประมาณปี 2569 / โครงการพัฒนาระบบ" />
                </FG>
                <FG label="คู่ค้า / ผู้จัดจำหน่าย (Vendor)">
                  <FSelect value={form.vendor} onChange={v => setFormField('vendor', 'Vendor', v)}>
                    <option value="">ไม่ระบุ</option>
                    {vendorOptions.map(v => <option key={v} value={v}>{v}</option>)}
                  </FSelect>
                </FG>
              </div>
            </SecCard>

            {/* ⑤ การรับประกันและประวัติ */}
            <SecCard title="การรับประกันและประวัติ" sub="Warranty & Lifecycle" barColor="linear-gradient(180deg,#e11d48,#f43f5e)">
              <div className="row r2">
                <FG label="วันสิ้นสุดระยะรับประกัน">
                  <FInput type="date" value={form.warrantyEndDate} onChange={v => setFormField('warrantyEndDate', 'วันสิ้นสุดระยะรับประกัน', v)} />
                </FG>
                <FG label="โดเมนคอมพิวเตอร์ (Domain Name)">
                  <FSelect value={form.domainName} onChange={v => setFormField('domainName', 'Domain Name', v)}>
                    <option value="">ไม่ระบุ</option>
                    {domainOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </FSelect>
                </FG>
              </div>

              {/* Status pills */}
              <div className="fg" style={{ marginBottom: 12 }}>
                <label className="lbl">สถานะการใช้งาน <span style={{ fontSize: '10px', color: '#f43f5e', background: 'rgba(225,29,72,.08)', padding: '1px 6px', borderRadius: '20px' }}>คลิกเพื่อเปลี่ยน</span></label>
                <div className="status-row">
                  {statusOptions.map(opt => (
                    <button type="button" key={opt.value}
                      className={`status-opt ${opt.cls}${form.status === opt.value ? ' sel' : ''}`}
                      onClick={() => setFormField('status', 'สถานะการใช้งาน', opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="row r1">
                <FG label="รหัสทรัพย์สินเดิม (ถ้ามี)">
                  <FInput value={form.oldAssetCode} onChange={v => setFormField('oldAssetCode', 'รหัสทรัพย์สินเดิม', v)} placeholder="กรณีต้องการอ้างอิงรหัสเดิมของโครงการหรือแท็กเกรดเดิม" />
                </FG>
              </div>

              <FG label="บันทึกเพิ่มเติม / หมายเหตุ">
                <FTextarea value={form.remark} onChange={v => setFormField('remark', 'หมายเหตุ', v)} placeholder="รายละเอียดข้อบกพร่อง, หมายเหตุอุปกรณ์เสริม หรืออื่นๆ..." />
              </FG>
            </SecCard>

            {/* ⑤ รูปภาพ */}
            <SecCard title="รูปภาพทะเบียนทรัพย์สิน" barColor="linear-gradient(180deg,#6366f1,#8b5cf6)">
              {imageError && <div className="err-bar" style={{ marginBottom: 12 }}>❌ {imageError}</div>}
              <div className="row r2">
                <div className="img-drop"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleImageUpload(f); }}
                  onDragOver={e => e.preventDefault()}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Asset" />
                      <div className="img-actions" onClick={e => e.stopPropagation()}>
                        <div className="img-btn" onClick={() => fileInputRef.current?.click()}>📷</div>
                        <div className="img-btn del" onClick={handleImageDelete}>🗑</div>
                      </div>
                    </>
                  ) : (
                    <div className="img-hint">
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🖼</div>
                      <div>ลากรูปภาพมาวางที่นี่</div>
                      <div style={{ fontSize: '10.5px', color: '#c4b5fd', marginTop: '4px' }}>หรือคลิกเพื่อเลือกไฟล์ · JPG, PNG สูงสุด 5MB</div>
                    </div>
                  )}
                </div>
                <div>
                  <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                  <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginBottom: '10px' }}
                    onClick={() => fileInputRef.current?.click()} disabled={imageUploading || !id}>
                    {imageUploading ? '⏳ กำลังอัพโหลด...' : id ? '📤 อัพโหลดรูปภาพ' : '💾 บันทึกก่อนอัพโหลด'}
                  </button>
                  <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(248,247,255,.6)', border: '1px solid rgba(99,102,241,.09)', fontSize: '11px', color: '#9ca3af', lineHeight: 1.8 }}>
                    💡 <strong style={{ color: '#6b7280' }}>คำแนะนำ</strong><br />
                    • ถ่ายรูปทะเบียนทรัพย์สินให้ชัดเจน อ่านข้อความได้<br />
                    • รองรับไฟล์ JPG, PNG, GIF<br />
                    • ขนาดไฟล์สูงสุด 5MB
                  </div>
                </div>
              </div>
            </SecCard>

          </form>
        </div>

        {/* Sticky Footer */}
        <div className="sticky-footer">
          <div>
            <button type="button" className="btn btn-danger" onClick={() => {
              if (hasChanges) { if (window.confirm('ยืนยันยกเลิกการแก้ไข? การเปลี่ยนแปลงทั้งหมดจะหายไป')) navigate(-1); }
              else navigate(-1);
            }}>↩ ยกเลิก</button>
          </div>
          <div className="footer-right">
            {hasChanges && <span className="footer-count">เปลี่ยนแปลง <strong style={{ color: '#b45309' }}>{changeCount}</strong> รายการ</span>}
            <button type="submit" form="asset-form" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner"></span>กำลังบันทึก...</> : `💾 ${id ? 'บันทึกการแก้ไข' : 'สร้างทรัพย์สิน'}`}
            </button>
          </div>
        </div>

        {/* Toast */}
        <div className={`ef-toast${toastVisible ? ' show' : ''}`}>
          <div className="ef-toast-inner" style={{ background: toastColor }}>{toastMsg}</div>
        </div>
      </div>
    </>
  );
}
