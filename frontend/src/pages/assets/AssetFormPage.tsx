import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CircularProgress,
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Switch,
  Paper,
  Alert,
  AlertTitle,
  Snackbar,
  Breadcrumbs,
  Link,
  Avatar,
  Chip,
  alpha,
  useTheme,
  Autocomplete,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { assetAPI } from '../../services/api';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { getTypeIcon, SectionCard, ToggleWrap, getBrandSuggestionsForType } from './components/AssetFormHelpers';

/* ─── Types / Defaults ─────────────────────────────────────────── */
const initialData = {
  assetCode: '', accountingCode: '', assetName: '', serialNo: '', type: '', brand: '', model: '',
  cpu: '', cpuGeneration: '', ram: '', ramSlot1: '', ramSlot2: '', gpu: '',
  memoryType: 'Slot', ramOnboard: '', ramType: '', ramSpeed: '',
  ramMaxSupported: '', ramAvailableSlots: '', ramUpgradeable: '',
  storage1: '', storage2: '', osType: 'Windows', osVersion: '',
  officeLicense: '', antivirusStatus: '', domainName: '',
  vendor: '', poNumber: '', poDate: '', prNumber: '', purchaseDate: '',
  purchasePrice: '', warrantyEndDate: '',
  ownerName: '', departmentId: '', location: '', floor: '',
  company: '', oldAssetCode: '', budget: '', status: 'Available', remark: '',
  snComputer: '', windowsLicense: '',
};

const fallbackStatusOptions = [
  { value: 'Available', label: '✅ Available - พร้อมใช้งาน', cls: 's-available' },
  { value: 'Borrowed',  label: '🔒 Borrowed - กำลังยืม',    cls: 's-reserved' },
  { value: 'InUse',     label: '💼 InUse - ใช้งานประจำ',  cls: 's-reserved' },
  { value: 'Maintenance', label: '🔧 Maintenance - ซ่อมบำรุง',  cls: 's-maintenance' },
  { value: 'Retired',   label: '🗑 Retired - ปลดระวาง',    cls: 's-retired' },
  { value: 'Lost',      label: '❌ Lost - สูญหาย',       cls: 's-maintenance' },
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
  computers: 'คอมพิวเตอร์', monitors: 'จอภาพ', devices: 'อุปกรณ์ต่อพ่วง',
  printers: 'เครื่องพิมพ์', phonesTablets: 'อุปกรณ์สื่อสาร', network: 'อุปกรณ์เครือข่าย',
  rack: 'Rack & Infrastructure',
};

/* ─── Main Component ───────────────────────────────────────────── */
export default function AssetFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const typeGroupFromUrl = searchParams.get('typeGroup') || '';
  const [form, setForm] = useState<Record<string, any>>(initialData);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [error, setError] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [detail, setDetail] = useState<Record<string, any>>({});

  // Dropdown options
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [categories, setCategories] = useState<Record<string, any>[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [availableTypes, setAvailableTypes] = useState<Record<string, any>[]>([]);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
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
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Duplicate check
  const [duplicates, setDuplicates] = useState<Record<string, boolean>>({});
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // GLPI Spec
  const [glpiSpec, setGlpiSpec] = useState<Record<string, any> | null>(null);
  const [fetchingGLPI, setFetchingGLPI] = useState(false);
  const [glpiError, setGlpiError] = useState('');

  // Owner Search AD
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  const [ownerOptions, setOwnerOptions] = useState<Record<string, any>[]>([]);
  const [ownerLoading, setOwnerLoading] = useState(false);

  useEffect(() => {
    if (ownerSearchQuery.trim().length < 2) {
      setOwnerOptions([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setOwnerLoading(true);
      try {
        const res = await assetAPI.searchOwners(ownerSearchQuery);
        setOwnerOptions(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to search owners', err);
      } finally {
        setOwnerLoading(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [ownerSearchQuery]);

  // Brand suggestions
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);

  const handleFetchGLPISpec = async () => {
    const serial = form.serialNo?.trim();
    if (!serial) {
      showToast('กรุณากรอก Serial Number ก่อนดึงสเปค', '#e11d48');
      return;
    }
    setFetchingGLPI(true);
    setGlpiError('');
    setGlpiSpec(null);
    try {
      const res = await assetAPI.queryGLPISpec(serial);
      setGlpiSpec(res.data);
      showToast('ดึงข้อมูลสเปคจาก GLPI สำเร็จ', '#10b981');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'ไม่พบข้อมูลในระบบ GLPI';
      setGlpiError(errMsg);
      showToast(errMsg, '#e11d48');
    } finally {
      setFetchingGLPI(false);
    }
  };

  const handleAutoFillGLPI = () => {
    if (!glpiSpec) return;
    
    // Auto-fill form fields
    if (glpiSpec.cpu) setFormField('cpu', 'CPU', glpiSpec.cpu);
    if (glpiSpec.ram) setFormField('ram', 'RAM', glpiSpec.ram);
    if (glpiSpec.os) setFormField('osVersion', 'OS Version', glpiSpec.os);
    if (glpiSpec.license) setFormField('windowsLicense', 'Windows License', glpiSpec.license);
    if (glpiSpec.name) setFormField('assetName', 'ชื่อทรัพย์สิน / รหัสทรัพย์สิน', glpiSpec.name);
    if (glpiSpec.serial) setFormField('snComputer', 'S/N Computer', glpiSpec.serial);
    if (glpiSpec.user) setFormField('ownerName', 'ผู้ใช้งานหลัก (End User)', glpiSpec.user);
    if (glpiSpec.msOffice) setFormField('officeLicense', 'MS Office', glpiSpec.msOffice);
    if (glpiSpec.antivirus) setFormField('antivirusStatus', 'Antivirus', glpiSpec.antivirus);
    if (glpiSpec.brand) setFormField('brand', 'ยี่ห้อ', glpiSpec.brand);
    if (glpiSpec.model) setFormField('model', 'รุ่น', glpiSpec.model);

    // New fields from expanded GLPI fetch
    if (glpiSpec.storage1) setFormField('storage1', 'Storage 1', glpiSpec.storage1);
    if (glpiSpec.storage2) setFormField('storage2', 'Storage 2', glpiSpec.storage2);
    if (glpiSpec.gpu) setFormField('gpu', 'GPU', glpiSpec.gpu);
    if (glpiSpec.osType) setFormField('osType', 'OS Type', glpiSpec.osType);
    if (glpiSpec.ramSlot1) setFormField('ramSlot1', 'RAM Slot 1', glpiSpec.ramSlot1);
    if (glpiSpec.ramSlot2) setFormField('ramSlot2', 'RAM Slot 2', glpiSpec.ramSlot2);
    if (glpiSpec.domainName) setFormField('domainName', 'Domain Name', glpiSpec.domainName);
    if (glpiSpec.location) setFormField('location', 'Location', glpiSpec.location);
    
    showToast('กรอกข้อมูลสเปคลงฟอร์มเรียบร้อยแล้ว', '#10b981');
  };

  const checkDuplicate = useCallback(async (assetCode?: string, serialNo?: string, assetName?: string, accountingCode?: string) => {
    if (!assetCode && !serialNo && !assetName && !accountingCode) {
      setDuplicates({});
      return {};
    }
    try {
      const res = await assetAPI.checkDuplicate({ assetCode, accountingCode, serialNo, assetName, excludeId: id ? parseInt(id) : undefined });
      const next = res.data.duplicates || {};
      setDuplicates(next);
      return next;
    } catch {
      return {};
    }
  }, [id]);

  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const code = form.assetCode?.trim();
    const serial = form.serialNo?.trim();
    const name = form.assetName?.trim();
    const accountingCode = form.accountingCode?.trim();
    checkTimer.current = setTimeout(() => checkDuplicate(code || undefined, serial || undefined, name || undefined, accountingCode || undefined), 600);
    return () => { if (checkTimer.current) clearTimeout(checkTimer.current); };
  }, [form.assetCode, form.serialNo, form.assetName, form.accountingCode, checkDuplicate]);

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
  const isDevice = useMemo(() => catName === 'อุปกรณ์ต่อพ่วง' || ['projector', 'conference speaker', 'webcam', 'docking station', 'presentation clicker', 'mouse', 'keyboard', 'microphone', 'voice recorder'].some(k => typeLower.includes(k)), [catName, typeLower]);
  const isNetwork = useMemo(() => catName === 'อุปกรณ์เครือข่าย' || ['switch', 'router', 'access point', 'firewall', 'modem'].some(k => typeLower.includes(k)), [catName, typeLower]);
  const isRack = useMemo(() => catName === 'Rack & Infrastructure' || ['server rack', 'pdu', 'ups', 'enclosure'].some(k => typeLower.includes(k)), [catName, typeLower]);
  const isPrinter = useMemo(() => catName === 'เครื่องพิมพ์' || typeLower.includes('printer'), [catName, typeLower]);
  const isCable = useMemo(() => catName === 'สายสัญญาณ' || ['hdmi cable', 'lan cable', 'power cable'].some(k => typeLower.includes(k)), [catName, typeLower]);
  const isConsumable = useMemo(() => catName === 'วัสดุสิ้นเปลือง' || ['cartridge', 'toner', 'adapter/charger'].some(k => typeLower.includes(k)), [catName, typeLower]);

  /* ─── Load asset ─── */
  useEffect(() => {
    if (!id) return;
    setFetching(true);
    setError('');
    setSubmitAttempted(false);
    assetAPI.get(parseInt(id))
      .then((res) => {
        const a = res.data;
        const loaded: Record<string, any> = {
          assetCode: a.assetCode || '', accountingCode: a.accountingCode || '', assetName: a.assetName || '',
          serialNo: a.serialNo || '', type: a.type || '',
          brand: a.brand || '', model: a.model || '',
          cpu: a.cpu || '', cpuGeneration: a.cpuGeneration || '',
          ram: a.ram || '', ramSlot1: a.ramSlot1 || '', ramSlot2: a.ramSlot2 || '',
          memoryType: a.memoryType || 'Slot', ramOnboard: a.ramOnboard || '',
          ramType: a.ramType || '', ramSpeed: a.ramSpeed || '',
          ramMaxSupported: a.ramMaxSupported || '', ramAvailableSlots: a.ramAvailableSlots || '',
          ramUpgradeable: a.ramUpgradeable || '',
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
      })
      .catch((err: any) => {
        const msg = err.response?.data?.error || 'ไม่สามารถโหลดข้อมูลทรัพย์สินได้';
        setError(msg);
        showToast('❌ ' + msg, '#dc2626');
      })
      .finally(() => setFetching(false));
  }, [id]);

  /* ─── Load options ─── */
  useEffect(() => {
    assetAPI.typeOptions().then((res) => setTypeOptions(res.data || [])).catch(() => {});
    import('../../services/api').then(({ categoryAPI }) => {
      categoryAPI.list().then((res) => setCategories(res.data || [])).catch(() => {});
    });
    assetAPI.brandOptions().then((res) => setBrandOptions(res.data || [])).catch(() => {});
    assetAPI.locationOptions().then((res) => setLocationOptions(res.data || [])).catch(() => {});
    assetAPI.vendorOptions().then((res) => setVendorOptions(res.data || [])).catch(() => {});
    assetAPI.osTypeOptions().then((res) => setOsTypeOptions(res.data || [])).catch(() => {});
    assetAPI.departmentOptions().then((res) => setDepartmentOptions(res.data || [])).catch(() => {});
    assetAPI.domainOptions().then((res) => setDomainOptions(res.data || [])).catch(() => {});
    assetAPI.companyOptions().then((res) => setCompanyOptions(res.data || [])).catch(() => {});
    assetAPI.antivirusOptions().then((res) => setAntivirusOptions(res.data || [])).catch(() => {});
    assetAPI.statusOptions()
      .then((res) => {
        const opts = (res.data || []).map((item: Record<string, any>) => {
          let icon = '';
          if (item.code === 'Available') icon = '✅ ';
          else if (item.code === 'Borrowed') icon = '🔒 ';
          else if (item.code === 'InUse') icon = '💼 ';
          else if (item.code === 'Maintenance') icon = '🔧 ';
          else if (item.code === 'Retired') icon = '🗑 ';
          else if (item.code === 'Lost') icon = '❌ ';

          const thaiNames: Record<string, string> = {
            Available: 'พร้อมใช้งาน',
            Borrowed: 'กำลังยืม',
            InUse: 'ใช้งานประจำ',
            Maintenance: 'ซ่อมบำรุง',
            Retired: 'ปลดระวาง/เตรียมบริจาค',
            Lost: 'สูญหาย'
          };
          const thaiName = thaiNames[item.code] || item.name;

          return {
            value: item.code, 
            label: `${icon}${item.code} - ${thaiName}`,
            cls: item.code === 'Available' ? 's-available' : item.code === 'Maintenance' ? 's-maintenance' : item.code === 'Retired' ? 's-retired' : 's-reserved',
          };
        });
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

  // Update brand suggestions when type changes
  useEffect(() => {
    if (form.type) {
      const suggestions = getBrandSuggestionsForType(form.type);
      setBrandSuggestions(suggestions);
    } else {
      setBrandSuggestions([]);
    }
  }, [form.type]);

  /* ─── Field change tracking ─── */
  const trackChange = useCallback((field: string, label: string, newVal: string) => {
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
  }, [originalSnapshot]);

  const setFormField = useCallback((field: string, label: string, value: string) => {
    setForm((prev: Record<string, any>) => ({ ...prev, [field]: value }));
    if (id) trackChange(field, label, value);
  }, [id, trackChange]);

  const setDetailField = useCallback((field: string, value: any) => {
    setDetail(prev => ({ ...prev, [field]: value }));
  }, []);

  /* ─── Toast ─── */
  function showToast(msg: string, color = '#1e1b4b') {
    setToastMsg(msg);
    setToastColor(color);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 3000);
  }

  /* ─── Submit ─── */
  const validateForm = (): string => {
    // Required fields validation
    if (!id && !form.assetCode?.trim()) {
      return 'เลขครุภัณฑ์ ต้องไม่ว่างเปล่า (สำหรับการสร้างใหม่)';
    }
    if (!form.serialNo?.trim()) {
      return 'Serial Number ต้องไม่ว่างเปล่า';
    }
    if (!/^[A-Z0-9\-_\.]+$/i.test(form.serialNo)) {
      return 'Serial Number ต้องเป็นตัวอักษร ตัวเลข หรือ ขีดกลาง';
    }
    if (!form.assetName?.trim()) {
      return 'ชื่อทรัพย์สิน ต้องไม่ว่างเปล่า';
    }
    if (!form.type?.trim()) {
      return 'ประเภท ต้องไม่ว่างเปล่า';
    }
    if (!form.brand?.trim()) {
      return 'ยี่ห้อ ต้องไม่ว่างเปล่า';
    }
    if (!form.departmentId?.trim()) {
      return 'แผนก ต้องไม่ว่างเปล่า';
    }

    // Warranty date validation
    if (form.purchaseDate && form.warrantyEndDate) {
      const purchaseDate = new Date(form.purchaseDate);
      const warrantyDate = new Date(form.warrantyEndDate);
      if (!isNaN(purchaseDate.getTime()) && !isNaN(warrantyDate.getTime())) {
        if (warrantyDate < purchaseDate) {
          return 'วันหมดประกัน ต้องหลังจาก วันที่จัดซื้อ';
        }
      }
    }

    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    const latestDuplicates = await checkDuplicate(
      form.assetCode?.trim() || undefined,
      form.serialNo?.trim() || undefined,
      form.assetName?.trim() || undefined,
      form.accountingCode?.trim() || undefined
    );
    if ((!id && latestDuplicates.assetCode) || latestDuplicates.serialNo || latestDuplicates.assetName || latestDuplicates.accountingCode) {
      const msg = latestDuplicates.assetCode
        ? 'เลขครุภัณฑ์นี้มีอยู่ในระบบแล้ว'
        : latestDuplicates.accountingCode
          ? 'เลขครุภัณฑ์ (ฝ่ายบัญชี) นี้มีอยู่ในระบบแล้ว'
          : latestDuplicates.serialNo
            ? 'Serial number นี้มีอยู่ในระบบแล้ว'
            : 'ชื่อทรัพย์สินนี้มีอยู่ในระบบแล้ว';
      setError(msg);
      showToast('⚠️ ' + msg, '#b45309');
      return;
    }
    
    // Validate all required fields
    const validError = validateForm();
    if (validError) {
      setError(validError);
      showToast('⚠️ ' + validError, '#b45309');
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
    if (file.size > 10 * 1024 * 1024) { setImageError('ขนาดไฟล์ต้องไม่เกิน 10MB'); return; }
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
  if (fetching) return <LoadingSkeleton type="form" count={6} />;

  const icon = getTypeIcon(form.type);

  return (
    <Box sx={{ position: 'relative', minHeight: '80vh', pb: 10 }}>
      {/* Background Orbs */}
      <Box sx={{ position: 'fixed', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0, width: 420, height: 420, bgcolor: alpha(theme.palette.primary.main, .08), top: -140, left: -100 }} />
      <Box sx={{ position: 'fixed', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0, width: 300, height: 300, bgcolor: alpha(theme.palette.info.main, .07), bottom: -80, right: -60 }} />
      <Box sx={{ position: 'fixed', inset: 0, backgroundImage: `radial-gradient(circle,${alpha(theme.palette.primary.main, .08)} 1px,transparent 1px)`, backgroundSize: '28px 28px', pointerEvents: 'none', zIndex: 0 }} />

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, pt: 1 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
            {id ? 'แก้ไขข้อมูลทรัพย์สิน' : 'ลงทะเบียนทรัพย์สินใหม่'}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {id ? `เลขครุภัณฑ์: ${form.assetCode || form.serialNo}` : 'กรอกข้อมูลพื้นฐานและรายละเอียดเพื่อนำอุปกรณ์เข้าสู่ระบบ'}
          </Typography>
        </Box>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.disabled' }} />} aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component="button" onClick={() => navigate('/assets')} sx={{ textDecoration: 'none', color: 'primary.main', fontWeight: 600, border: 'none', bg: 'none', p: 0, cursor: 'pointer', outline: 'none' }}>
            ทรัพย์สิน IT
          </Link>
          {id && form.assetCode && (
            <Link component="button" onClick={() => navigate(`/assets/${id}`)} sx={{ textDecoration: 'none', color: 'primary.main', fontWeight: 600, border: 'none', bg: 'none', p: 0, cursor: 'pointer', outline: 'none' }}>
              {form.assetCode}
            </Link>
          )}
          <Typography variant="body2" color="text.disabled">
            {id ? 'แก้ไขข้อมูล' : 'เพิ่มทรัพย์สินใหม่'}
          </Typography>
        </Breadcrumbs>

        {/* Page header */}
        <Card sx={{
          background: alpha(theme.palette.background.paper, 0.72),
          border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.14)}`,
          backdropFilter: 'blur(20px)',
          borderRadius: '14px',
          boxShadow: `0 4px 24px ${alpha(theme.palette.primary.main, 0.08)}, 0 1px 3px rgba(0, 0, 0, 0.04)`,
          p: 1,
          mb: 2.5
        }}>
          <CardContent sx={{ p: '18px 22px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{
              width: 46,
              height: 46,
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.primary.dark})`,
              fontSize: '22px',
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
              flexShrink: 0
            }}>
              {icon}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                {id ? 'แก้ไขข้อมูลทรัพย์สิน' : 'เพิ่มทรัพย์สินใหม่'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                {form.assetCode && (
                  <Chip label={form.assetCode} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700, height: 20, bgcolor: alpha(theme.palette.primary.main, .09), color: 'primary.dark' }} />
                )}
                {(form.brand || form.model) && (
                  <Typography variant="caption" color="text.secondary">
                    {form.brand} {form.model}{form.type ? ` · ${form.type}` : ''}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              {id && (
                <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                  <Typography variant="caption" color="text.disabled" display="block">กำลังแก้ไข</Typography>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">{form.assetCode}</Typography>
                </Box>
              )}
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={() => {
                  if (hasChanges) { if (window.confirm('ยืนยันยกเลิกการแก้ไข? การเปลี่ยนแปลงทั้งหมดจะหายไป')) navigate(-1); }
                  else navigate(-1);
                }}
                sx={{ borderRadius: '10px', color: 'text.secondary', borderColor: 'divider', fontWeight: 600 }}
              >
                ย้อนกลับ
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Unsaved banner */}
        {hasChanges && (
          <Alert severity="warning" variant="outlined" sx={{ mb: 2, borderRadius: '10px' }}>
            <AlertTitle sx={{ fontWeight: 700, fontSize: '13px' }}>ข้อมูลยังไม่ได้บันทึก</AlertTitle>
            มีการเปลี่ยนแปลง {changeCount} รายการที่ยังไม่ได้บันทึก
          </Alert>
        )}

        {/* Changelog panel */}
        {hasChanges && (
          <Card sx={{
            mb: 2.5,
            border: '1px solid',
            borderColor: alpha('#f59e0b', 0.3),
            bgcolor: 'rgba(254, 252, 232, 0.5)',
            borderRadius: '10px',
            boxShadow: 'none'
          }}>
            <CardContent sx={{ p: '12px 16px !important' }}>
              <Typography variant="caption" fontWeight={700} color="warning.dark" sx={{ display: 'block', mb: 1 }}>
                ✏️ รายการที่เปลี่ยนแปลง ({changeCount} รายการ)
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {Object.entries(changes).map(([field, c], i) => (
                  <Box key={field} sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, py: 0.5, borderBottom: i < changeCount - 1 ? '1px dashed rgba(245,158,11,.1)' : 'none' }}>
                    <Typography variant="caption" sx={{ minWidth: 120, fontWeight: 600, color: 'text.secondary' }}>
                      {c.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'error.main', textDecoration: 'line-through', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.from || '(ว่าง)'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      →
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.to}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>
            {error}
          </Alert>
        )}

        <form id="asset-form" onSubmit={handleSubmit}>
          
          {/* ① ข้อมูลพื้นฐานทรัพย์สิน */}
          <SectionCard title="ข้อมูลพื้นฐานทรัพย์สิน" sub="Core Asset Identification">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="เลขครุภัณฑ์ (Asset Code) *"
                  value={form.assetCode}
                  onChange={e => setFormField('assetCode', 'เลขครุภัณฑ์ (Asset Code)', e.target.value)}
                  placeholder="เช่น HQ-PS-N001"
                  fullWidth
                  size="small"
                  required={!id}
                  error={!!duplicates.assetCode || (submitAttempted && !id && !form.assetCode?.trim())}
                  helperText={duplicates.assetCode ? '⚠️ เลขครุภัณฑ์นี้มีอยู่ในระบบแล้ว' : (submitAttempted && !id && !form.assetCode?.trim() ? 'กรุณาระบุเลขครุภัณฑ์' : '')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="เลขครุภัณฑ์ (ฝ่ายบัญชี) — ถ้ามี"
                  value={form.accountingCode}
                  onChange={e => setFormField('accountingCode', 'เลขครุภัณฑ์ (ฝ่ายบัญชี)', e.target.value)}
                  placeholder="กรอกเมื่อทราบเลขครุภัณฑ์จริงจากฝ่ายบัญชี ไม่ทราบเว้นว่างไว้ได้"
                  fullWidth
                  size="small"
                  error={!!duplicates.accountingCode}
                  helperText={duplicates.accountingCode ? '⚠️ เลขครุภัณฑ์นี้มีอยู่ในระบบแล้ว' : ''}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="ชื่อทรัพย์สิน / รหัสทรัพย์สิน"
                  value={form.assetName}
                  onChange={e => setFormField('assetName', 'ชื่อทรัพย์สิน / รหัสทรัพย์สิน', e.target.value)}
                  placeholder="ชื่อสำหรับเรียกทรัพย์สิน หรือ รหัสพัสดุภายในองค์กร"
                  fullWidth
                  size="small"
                  required
                  error={!!duplicates.assetName || (submitAttempted && !form.assetName?.trim())}
                  helperText={duplicates.assetName ? '⚠️ ชื่อทรัพย์สินนี้มีอยู่ในระบบแล้ว' : (submitAttempted && !form.assetName?.trim() ? 'กรุณาระบุชื่อทรัพย์สิน' : '')}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Autocomplete
                  freeSolo
                  options={brandSuggestions.length > 0 ? brandSuggestions : brandOptions}
                  value={form.brand}
                  onInputChange={(_, newInputValue) => setFormField('brand', 'ยี่ห้อ', newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="ยี่ห้อ (Brand) *"
                      placeholder="เช่น Dell, HP, Lenovo"
                      fullWidth
                      size="small"
                      required
                      error={submitAttempted && !form.brand?.trim()}
                      helperText={submitAttempted && !form.brand?.trim() ? 'กรุณาระบุยี่ห้อ' : (brandSuggestions.length > 0 && !form.brand ? `💡 แนะนำ: ${brandSuggestions.join(', ')}` : '')}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="รุ่น (Model)"
                  value={form.model}
                  onChange={e => setFormField('model', 'รุ่น', e.target.value)}
                  placeholder="เช่น Latitude 5530"
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField
                    label="หมายเลขซีเรียล (S/N) *"
                    value={form.serialNo}
                    onChange={e => setFormField('serialNo', 'Serial No.', e.target.value)}
                    placeholder="Serial No."
                    fullWidth
                    size="small"
                    required
                    error={!!duplicates.serialNo || (submitAttempted && (!form.serialNo?.trim() || !/^[A-Z0-9\-_\.]+$/i.test(form.serialNo)))}
                    helperText={
                      duplicates.serialNo
                        ? '⚠️ Serial number นี้มีอยู่ในระบบแล้ว'
                        : (submitAttempted && !form.serialNo?.trim()
                          ? 'กรุณาระบุ Serial Number'
                          : (submitAttempted && form.serialNo?.trim() && !/^[A-Z0-9\-_\.]+$/i.test(form.serialNo)
                            ? 'Serial Number ต้องเป็นตัวอักษร ตัวเลข หรือ ขีดกลาง'
                            : ''))
                    }
                  />
                  {isComputer && (
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={fetchingGLPI}
                      onClick={handleFetchGLPISpec}
                      startIcon={fetchingGLPI ? <CircularProgress size={12} /> : <span>🔌</span>}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        py: 0.5,
                        borderRadius: '8px',
                        borderColor: theme.palette.primary.main,
                        color: theme.palette.primary.main,
                        '&:hover': {
                          borderColor: theme.palette.primary.dark,
                          bgcolor: alpha(theme.palette.primary.main, 0.04)
                        }
                      }}
                    >
                      {fetchingGLPI ? 'กำลังดึงสเปค...' : 'ดึงสเปคจาก GLPI'}
                    </Button>
                  )}
                  {glpiSpec && (
                    <Accordion
                      defaultExpanded={true}
                      sx={{
                        mt: 1,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                        borderRadius: '10px !important',
                        bgcolor: alpha(theme.palette.primary.main, 0.02),
                        boxShadow: 'none',
                        overflow: 'hidden',
                        '&:before': { display: 'none' }
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon sx={{ fontSize: 18, color: 'primary.main' }} />}
                        sx={{
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                          p: '0 8px',
                          minHeight: '36px !important',
                          '& .MuiAccordionSummary-content': { 
                            m: '0 !important',
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            mr: 1
                          } 
                        }}
                      >
                        <Typography variant="caption" fontWeight={700} color="primary.main">
                          พบข้อมูลสเปคใน GLPI
                        </Typography>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAutoFillGLPI();
                          }}
                          sx={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            py: 0.25,
                            px: 1,
                            borderRadius: '5px',
                            bgcolor: theme.palette.primary.main,
                            '&:hover': { bgcolor: theme.palette.primary.dark },
                            textTransform: 'none',
                            ml: 'auto',
                            mr: 1
                          }}
                        >
                          กรอกอัตโนมัติ
                        </Button>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', justifyContent: 'space-between' }}>
                            <strong>ชื่อ:</strong> <span>{glpiSpec.name || '—'}</span>
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', justifyContent: 'space-between' }}>
                            <strong>CPU:</strong> <span style={{ textAlign: 'right', maxWidth: '70%', wordBreak: 'break-all' }}>{glpiSpec.cpu || '—'}</span>
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', justifyContent: 'space-between' }}>
                            <strong>RAM:</strong> <span>{glpiSpec.ram || '—'}</span>
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', justifyContent: 'space-between' }}>
                            <strong>OS:</strong> <span style={{ textAlign: 'right', maxWidth: '70%', wordBreak: 'break-all' }}>{glpiSpec.os || '—'}</span>
                          </Typography>
                          {glpiSpec.license && (
                            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', justifyContent: 'space-between' }}>
                              <strong>License:</strong> <span style={{ textAlign: 'right', maxWidth: '70%', wordBreak: 'break-all' }}>{glpiSpec.license || '—'}</span>
                            </Typography>
                          )}
                          {glpiSpec.storage1 && (
                            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', justifyContent: 'space-between' }}>
                              <strong>Storage:</strong> <span>{glpiSpec.storage1}{glpiSpec.storage2 ? ` / ${glpiSpec.storage2}` : ''}</span>
                            </Typography>
                          )}
                          {glpiSpec.gpu && (
                            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', justifyContent: 'space-between' }}>
                              <strong>GPU:</strong> <span style={{ textAlign: 'right', maxWidth: '70%', wordBreak: 'break-all' }}>{glpiSpec.gpu}</span>
                            </Typography>
                          )}
                          {glpiSpec.location && (
                            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', justifyContent: 'space-between' }}>
                              <strong>Location:</strong> <span>{glpiSpec.location}</span>
                            </Typography>
                          )}
                          {glpiSpec.domainName && (
                            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', justifyContent: 'space-between' }}>
                              <strong>Domain:</strong> <span>{glpiSpec.domainName}</span>
                            </Typography>
                          )}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="หมวดหมู่"
                  value={selectedCategory ? String(selectedCategory) : ''}
                  onChange={e => {
                    const val = e.target.value;
                    const catId = val ? parseInt(val) : null;
                    setSelectedCategory(catId);
                    setForm((prev: any) => ({ ...prev, type: '' }));
                    if (catId) { const cat = categories.find(c => c.id === catId); setAvailableTypes(cat?.types || []); }
                    else setAvailableTypes([]);
                  }}
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  {categories.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.icon} {c.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="ประเภทอุปกรณ์ *"
                  value={form.type}
                  onChange={e => setFormField('type', 'ประเภท', e.target.value)}
                  fullWidth
                  size="small"
                  required
                  error={submitAttempted && !form.type?.trim()}
                  helperText={submitAttempted && !form.type?.trim() ? 'กรุณาเลือกประเภทอุปกรณ์' : ''}
                >
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  {(selectedCategory ? availableTypes : typeOptions.map(t => ({ name: t }))).map((opt: Record<string, any>) => (
                    <MenuItem key={opt.name || opt} value={opt.name || opt}>{opt.name || opt}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </SectionCard>

          {/* ② ข้อมูลการครอบครองและตำแหน่งพิกัด */}
          <SectionCard title="ข้อมูลการครอบครองและตำแหน่งพิกัด" sub="Ownership & Location" barColor="linear-gradient(180deg,#8b5cf6,#a855f7)">
            <Grid container spacing={2}>

              {/* — Sub-group: ผู้ใช้งาน / บริษัท / แผนก — */}
              <Grid item xs={12}>
                <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>
                  👤 ผู้ครอบครองและองค์กร
                </Typography>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Autocomplete
                  freeSolo
                  options={ownerOptions}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    if (option.displayName) return option.displayName;
                    if (option.adUsername) return option.adUsername;
                    return '';
                  }}
                  filterOptions={(x) => x}
                  loading={ownerLoading}
                  value={form.ownerName || ''}
                  onInputChange={(_, newInputValue) => {
                    setOwnerSearchQuery(newInputValue);
                    setFormField('ownerName', 'ผู้ใช้งานหลัก (End User)', newInputValue);
                  }}
                  onChange={(_, newValue) => {
                    if (typeof newValue === 'object' && newValue !== null) {
                      setFormField('ownerName', 'ผู้ใช้งานหลัก (End User)', newValue.displayName || '');
                      if (newValue.department && !form.departmentId) {
                        setFormField('departmentId', 'แผนก', newValue.department);
                        setDepartmentOptions(prev => prev.includes(newValue.department) ? prev : [...prev, newValue.department].sort());
                      }
                      if (newValue.company && !form.company) {
                        setFormField('company', 'บริษัท', newValue.company);
                        setCompanyOptions(prev => prev.includes(newValue.company) ? prev : [...prev, newValue.company].sort());
                      }
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="ผู้ใช้งานหลัก (ถ้ามี)"
                      placeholder="พิมพ์ค้นหา..."
                      fullWidth
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <React.Fragment>
                            {ownerLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </React.Fragment>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props as Record<string, any>;
                    return (
                      <li key={option.adUsername || option.displayName || Math.random()} {...otherProps}>
                        <Box>
                          <Typography variant="body2">{option.displayName || option.adUsername}</Typography>
                          {(option.department || option.company) && (
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                              {[option.department, option.company].filter(Boolean).join(' · ')}
                            </Typography>
                          )}
                        </Box>
                      </li>
                    );
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <Autocomplete
                  freeSolo
                  options={companyOptions}
                  value={form.company}
                  onInputChange={(_, newInputValue) => setFormField('company', 'Company', newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="บริษัท (Company)"
                      fullWidth
                      size="small"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <Autocomplete
                  freeSolo
                  options={departmentOptions}
                  value={form.departmentId}
                  onInputChange={(_, newInputValue) => setFormField('departmentId', 'แผนก', newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="แผนกที่ใช้งาน *"
                      fullWidth
                      size="small"
                      required
                      error={submitAttempted && !form.departmentId?.trim()}
                      helperText={submitAttempted && !form.departmentId?.trim() ? 'กรุณาระบุแผนก' : ''}
                    />
                  )}
                />
              </Grid>

              {/* — Divider — */}
              <Grid item xs={12}>
                <Box sx={{ borderTop: '1px dashed rgba(139,92,246,0.15)', pt: 1.5, mt: 0.5 }}>
                  <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>
                    📍 ตำแหน่งที่ตั้ง
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Autocomplete
                  freeSolo
                  options={locationOptions}
                  value={form.location}
                  onInputChange={(_, newInputValue) => setFormField('location', 'Location', newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="สถานที่ติดตั้ง / อาคาร"
                      fullWidth
                      size="small"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="ชั้น / บริเวณห้อง"
                  value={form.floor}
                  onChange={e => setFormField('floor', 'ชั้น', e.target.value)}
                  placeholder="เช่น ชั้น 4, ห้องประชุมใหญ่, B1"
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="รหัสทรัพย์สินเดิม (Old Code)"
                  value={form.oldAssetCode}
                  onChange={e => setFormField('oldAssetCode', 'รหัสเดิม', e.target.value)}
                  placeholder="เช่น IT-2022-001"
                  fullWidth
                  size="small"
                  helperText="รหัสจากระบบเดิม (ถ้ามี)"
                />
              </Grid>

            </Grid>
          </SectionCard>

          {/* ③ Hardware (Computer only) */}
          {isComputer && !isMonitor && (
            <SectionCard title="สเปก Hardware" barColor="linear-gradient(180deg,#2563eb,#60a5fa)">
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="CPU"
                    value={form.cpu}
                    onChange={e => setFormField('cpu', 'CPU', e.target.value)}
                    placeholder="เช่น Intel Core i7-1260P"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="CPU Generation"
                    value={form.cpuGeneration}
                    onChange={e => setFormField('cpuGeneration', 'CPU Gen', e.target.value)}
                    placeholder="เช่น Gen 12"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="RAM"
                    value={form.ram}
                    onChange={e => setFormField('ram', 'RAM', e.target.value)}
                    placeholder="เช่น 16 GB DDR5"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="RAM"
                    value={form.ram}
                    onChange={e => setFormField('ram', 'RAM', e.target.value)}
                    placeholder="เช่น 16 GB DDR5"
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>
            </SectionCard>
          )}

          {/* ③-B Memory Specification (Computer only) */}
          {isComputer && !isMonitor && (
            <SectionCard title="Memory Specification" barColor="linear-gradient(180deg,#7c3aed,#a78bfa)">
              <Grid container spacing={2}>
                {/* Memory Type Selector */}
                <Grid item xs={12}>
                  <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
                    p: 1.5, borderRadius: 2,
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(167,139,250,0.04) 100%)',
                    border: '1px solid rgba(124,58,237,0.15)',
                  }}>
                    <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ minWidth: 'max-content' }}>
                      Memory Type:
                    </Typography>
                    {[
                      { value: 'Soldered', label: '🔩 Soldered (On-board)', desc: 'RAM บัดกรีติดเมนบอร์ด ถอดไม่ได้' },
                      { value: 'Slot', label: '🧩 RAM Slot Only', desc: 'ติดตั้งผ่านสล็อตทั้งหมด' },
                      { value: 'Hybrid', label: '⚡ Hybrid', desc: 'มีทั้ง On-board + Slot' },
                    ].map(opt => (
                      <Box
                        key={opt.value}
                        onClick={() => setFormField('memoryType', 'Memory Type', opt.value)}
                        sx={{
                          flex: '1 1 140px', cursor: 'pointer', borderRadius: 2,
                          border: form.memoryType === opt.value
                            ? '2px solid #7c3aed'
                            : '2px solid transparent',
                          background: form.memoryType === opt.value
                            ? 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(167,139,250,0.08))'
                            : 'rgba(0,0,0,0.03)',
                          p: 1.2, textAlign: 'center', transition: 'all .2s',
                          '&:hover': { borderColor: '#a78bfa', background: 'rgba(124,58,237,0.06)' },
                          boxShadow: form.memoryType === opt.value ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none',
                        }}
                      >
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.3, color: form.memoryType === opt.value ? '#7c3aed' : 'text.primary' }}>
                          {opt.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3, display: 'block' }}>
                          {opt.desc}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>

                {/* On-board RAM: shown for Soldered and Hybrid */}
                {(form.memoryType === 'Soldered' || form.memoryType === 'Hybrid') && (
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      label="On-board RAM (Soldered)"
                      value={form.ramOnboard}
                      onChange={e => setFormField('ramOnboard', 'On-board RAM', e.target.value)}
                      placeholder="เช่น 8 GB"
                      fullWidth size="small"
                      InputProps={{
                        startAdornment: <Box sx={{ mr: 1, fontSize: '1rem', lineHeight: 1 }}>🔩</Box>
                      }}
                      helperText="แรมฝังบัดกรี ถอดเปลี่ยนไม่ได้"
                    />
                  </Grid>
                )}

                {/* RAM Slot 1: shown for Slot and Hybrid */}
                {(form.memoryType === 'Slot' || form.memoryType === 'Hybrid') && (
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      label="RAM Slot 1"
                      value={form.ramSlot1}
                      onChange={e => setFormField('ramSlot1', 'RAM Slot 1', e.target.value)}
                      placeholder="เช่น 16 GB"
                      fullWidth size="small"
                      InputProps={{
                        startAdornment: <Box sx={{ mr: 1, fontSize: '1rem', lineHeight: 1 }}>🧩</Box>
                      }}
                    />
                  </Grid>
                )}

                {/* RAM Slot 2: shown for Slot and Hybrid */}
                {(form.memoryType === 'Slot' || form.memoryType === 'Hybrid') && (
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      label="RAM Slot 2"
                      value={form.ramSlot2}
                      onChange={e => setFormField('ramSlot2', 'RAM Slot 2', e.target.value)}
                      placeholder="เช่น 16 GB (ว่าง = ไม่มี)"
                      fullWidth size="small"
                      InputProps={{
                        startAdornment: <Box sx={{ mr: 1, fontSize: '1rem', lineHeight: 1 }}>🧩</Box>
                      }}
                    />
                  </Grid>
                )}

                {/* Total Installed RAM – Auto Calculated */}
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    label="Total Installed RAM"
                    value={(() => {
                      const parseGB = (s: string) => {
                        if (!s) return 0;
                        const upper = s.toUpperCase();
                        const matchGB = upper.match(/(\d+(?:\.\d+)?)\s*G/);
                        if (matchGB) return parseFloat(matchGB[1]);
                        const matchMB = upper.match(/(\d+(?:\.\d+)?)\s*M/);
                        if (matchMB) return parseFloat(matchMB[1]) / 1024;
                        
                        const cleaned = upper.replace(/DDR\d/g, '').replace(/PC\d?-?\d+/g, '').replace(/\d+\s*MHZ/g, '');
                        const m = cleaned.match(/(\d+(?:\.\d+)?)/);
                        return m ? parseFloat(m[1]) : 0;
                      };
                      let total = 0;
                      if (form.memoryType === 'Soldered') total = parseGB(form.ramOnboard);
                      else if (form.memoryType === 'Slot') total = parseGB(form.ramSlot1) + parseGB(form.ramSlot2);
                      else total = parseGB(form.ramOnboard) + parseGB(form.ramSlot1) + parseGB(form.ramSlot2);
                      return total > 0 ? `${total} GB` : '';
                    })()}
                    placeholder="คำนวณอัตโนมัติ"
                    fullWidth size="small"
                    InputProps={{
                      readOnly: true,
                      startAdornment: <Box sx={{ mr: 1, fontSize: '1rem', lineHeight: 1 }}>💾</Box>,
                      sx: {
                        bgcolor: 'rgba(124,58,237,0.06)',
                        '& .MuiInputBase-input': { fontWeight: 600, color: '#7c3aed' }
                      }
                    }}
                    helperText="คำนวณจากฟิลด์ด้านบนอัตโนมัติ"
                  />
                </Grid>

                {/* RAM Type */}
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    select
                    label="RAM Type"
                    value={form.ramType}
                    onChange={e => setFormField('ramType', 'RAM Type', e.target.value)}
                    fullWidth size="small"
                  >
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {['DDR3', 'DDR4', 'DDR5', 'LPDDR3', 'LPDDR4', 'LPDDR4X', 'LPDDR5', 'LPDDR5X'].map(t => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* RAM Speed */}
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    label="RAM Speed"
                    value={form.ramSpeed}
                    onChange={e => setFormField('ramSpeed', 'RAM Speed', e.target.value)}
                    placeholder="เช่น 4800 MHz, 6400 MT/s"
                    fullWidth size="small"
                  />
                </Grid>

                {/* Max Supported RAM */}
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    label="Maximum Supported RAM"
                    value={form.ramMaxSupported}
                    onChange={e => setFormField('ramMaxSupported', 'RAM Max Supported', e.target.value)}
                    placeholder="เช่น 64 GB"
                    fullWidth size="small"
                    helperText="RAM สูงสุดที่เครื่องรองรับ"
                  />
                </Grid>

                {/* Available Slots */}
                {(form.memoryType === 'Slot' || form.memoryType === 'Hybrid') && (
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      select
                      label="Available Slots"
                      value={form.ramAvailableSlots}
                      onChange={e => setFormField('ramAvailableSlots', 'Available Slots', e.target.value)}
                      fullWidth size="small"
                      helperText="จำนวนสล็อตที่ว่างอยู่"
                    >
                      <MenuItem value="">ไม่ระบุ</MenuItem>
                      {['0', '1', '2', '3', '4'].map(n => (
                        <MenuItem key={n} value={n}>{n} slot{Number(n) > 1 ? 's' : ''} ว่าง</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}

                {/* Upgradeable */}
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    select
                    label="Upgradeable"
                    value={form.ramUpgradeable}
                    onChange={e => setFormField('ramUpgradeable', 'Upgradeable', e.target.value)}
                    fullWidth size="small"
                  >
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    <MenuItem value="Yes">✅ Yes – อัพเกรดได้</MenuItem>
                    <MenuItem value="No">❌ No – อัพเกรดไม่ได้</MenuItem>
                    <MenuItem value="Limited">⚠️ Limited – มีข้อจำกัด</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </SectionCard>
          )}

          {/* ③-C GPU & Storage (Computer only) */}
          {isComputer && !isMonitor && (
            <SectionCard title="GPU & Storage" barColor="linear-gradient(180deg,#2563eb,#60a5fa)">
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="GPU"
                    value={form.gpu}
                    onChange={e => setFormField('gpu', 'GPU', e.target.value)}
                    placeholder="เช่น NVIDIA RTX 3060"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Storage 1"
                    value={form.storage1}
                    onChange={e => setFormField('storage1', 'Storage 1', e.target.value)}
                    placeholder="เช่น 512 GB NVMe SSD"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Storage 2"
                    value={form.storage2}
                    onChange={e => setFormField('storage2', 'Storage 2', e.target.value)}
                    placeholder="เช่น 1 TB HDD"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="อายุอุปกรณ์ (ปี)"
                    value={assetAge}
                    placeholder="คำนวณอัตโนมัติ"
                    fullWidth
                    size="small"
                    InputProps={{ readOnly: true }}
                    helperText="คำนวณจากวันที่ซื้อ"
                  />
                </Grid>
              </Grid>
            </SectionCard>
          )}

          {/* ④ OS & Software (Computer only) */}
          {isComputer && !isMonitor && (
            <SectionCard title="ระบบปฏิบัติการ & Software" barColor="linear-gradient(180deg,#0284c7,#38bdf8)">
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="OS Type"
                    value={form.osType}
                    onChange={e => setFormField('osType', 'OS Type', e.target.value)}
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {(osTypeOptions.length ? osTypeOptions : ['Windows', 'macOS', 'Linux']).map(o => (
                      <MenuItem key={o} value={o}>{o}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="OS Version"
                    value={form.osVersion}
                    onChange={e => setFormField('osVersion', 'OS Version', e.target.value)}
                    placeholder="เช่น Windows 11, 24H2"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Windows License"
                    value={form.windowsLicense}
                    onChange={e => setFormField('windowsLicense', 'Windows License', e.target.value)}
                    placeholder="Product Key / License"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="MS Office / Office License"
                    value={form.officeLicense}
                    onChange={e => setFormField('officeLicense', 'MS Office', e.target.value)}
                    placeholder="เช่น MS 365, Office 2021"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="Antivirus"
                    value={form.antivirusStatus}
                    onChange={e => setFormField('antivirusStatus', 'Antivirus', e.target.value)}
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {(antivirusOptions.length ? antivirusOptions : ['Trend Micro Apex One', 'Kaspersky', 'ESET', 'Windows Defender', 'ไม่มี']).map(a => (
                      <MenuItem key={a} value={a}>{a}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="S/N Computer (Computer Name)"
                    value={form.snComputer}
                    onChange={e => setFormField('snComputer', 'S/N Computer', e.target.value)}
                    placeholder="เช่น HQ-PS-N039"
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>
            </SectionCard>
          )}

          {/* Monitor detail */}
          {isMonitor && (
            <SectionCard title="ข้อมูลจอภาพ" barColor="linear-gradient(180deg,#7c3aed,#a855f7)">
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="ขนาดจอ (นิ้ว)"
                    value={detail.screenSize || ''}
                    onChange={e => setDetailField('screenSize', e.target.value)}
                    placeholder="เช่น 24, 27, 34"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="ความละเอียด"
                    value={detail.resolution || ''}
                    onChange={e => setDetailField('resolution', e.target.value)}
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {['1920x1080','2560x1080','2560x1440','3440x1440','3840x2160','Others'].map(r => (
                      <MenuItem key={r} value={r}>{r}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="Panel Type"
                    value={detail.panelType || ''}
                    onChange={e => setDetailField('panelType', e.target.value)}
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {['IPS','VA','TN','OLED','QLED','Others'].map(p => (
                      <MenuItem key={p} value={p}>{p}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Refresh Rate"
                    value={detail.refreshRate || ''}
                    onChange={e => setDetailField('refreshRate', e.target.value)}
                    placeholder="เช่น 60Hz, 144Hz"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="พอร์ตเชื่อมต่อ"
                    value={detail.ports || ''}
                    onChange={e => setDetailField('ports', e.target.value)}
                    placeholder="เช่น HDMI x2, DP"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ToggleWrap
                    label="ลำโพงในตัว"
                    checked={!!detail.hasSpeaker}
                    onChange={v => setDetailField('hasSpeaker', v)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ToggleWrap
                    label="จอโค้ง (Curved)"
                    desc="เปิดหากหน้าจอเป็นจอโค้ง"
                    checked={!!detail.curved}
                    onChange={v => setDetailField('curved', v)}
                  />
                </Grid>
              </Grid>
            </SectionCard>
          )}

          {/* Phone detail */}
          {isPhone && (
            <SectionCard title="ข้อมูลอุปกรณ์สื่อสาร" barColor="linear-gradient(180deg,#7c3aed,#a855f7)">
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="IMEI 1"
                    value={detail.imei1 || ''}
                    onChange={e => setDetailField('imei1', e.target.value)}
                    placeholder="15 หลัก"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="IMEI 2"
                    value={detail.imei2 || ''}
                    onChange={e => setDetailField('imei2', e.target.value)}
                    placeholder="15 หลัก (ถ้ามี)"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="เบอร์โทรศัพท์"
                    value={detail.phoneNumber || ''}
                    onChange={e => setDetailField('phoneNumber', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="OS"
                    value={detail.osType || ''}
                    onChange={e => setDetailField('osType', e.target.value)}
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {['iOS','iPadOS','Android','Others'].map(o => (
                      <MenuItem key={o} value={o}>{o}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="OS Version"
                    value={detail.osVersion || ''}
                    onChange={e => setDetailField('osVersion', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Storage"
                    value={detail.storageCapacity || ''}
                    onChange={e => setDetailField('storageCapacity', e.target.value)}
                    placeholder="เช่น 128GB"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="RAM"
                    value={detail.ram || ''}
                    onChange={e => setDetailField('ram', e.target.value)}
                    placeholder="เช่น 6GB, 8GB"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="สี"
                    value={detail.color || ''}
                    onChange={e => setDetailField('color', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="SIM Provider"
                    value={detail.simProvider || ''}
                    onChange={e => setDetailField('simProvider', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>
            </SectionCard>
          )}

          {/* Network detail */}
          {isNetwork && (
            <SectionCard title="ข้อมูลอุปกรณ์เครือข่าย" barColor="linear-gradient(180deg,#0891b2,#38bdf8)">
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="IP Address"
                    value={detail.ipAddress || ''}
                    onChange={e => setDetailField('ipAddress', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="MAC Address"
                    value={detail.macAddress || ''}
                    onChange={e => setDetailField('macAddress', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    type="number"
                    label="จำนวน Port"
                    value={detail.portCount ?? ''}
                    onChange={e => setDetailField('portCount', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="Port Speed"
                    value={detail.portSpeed || ''}
                    onChange={e => setDetailField('portSpeed', e.target.value)}
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {['100Mbps','1Gbps','10Gbps','25Gbps','40Gbps'].map(s => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Firmware Version"
                    value={detail.firmwareVersion || ''}
                    onChange={e => setDetailField('firmwareVersion', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="Managed"
                    value={detail.isManaged == null ? '' : String(detail.isManaged)}
                    onChange={e => setDetailField('isManaged', e.target.value === '' ? null : e.target.value === 'true')}
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    <MenuItem value="true">Managed</MenuItem>
                    <MenuItem value="false">Unmanaged</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </SectionCard>
          )}

          {/* Printer detail */}
          {isPrinter && (
            <SectionCard title="ข้อมูลเครื่องพิมพ์" barColor="linear-gradient(180deg,#dc2626,#f87171)">
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="ประเภทเครื่องพิมพ์"
                    value={detail.printerType || ''}
                    onChange={e => setDetailField('printerType', e.target.value)}
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {['Laser','Inkjet','Thermal','Dot Matrix','Others'].map(p => (
                      <MenuItem key={p} value={p}>{p}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="ขนาดกระดาษ"
                    value={detail.paperSizes || ''}
                    onChange={e => setDetailField('paperSizes', e.target.value)}
                    placeholder="เช่น A4, A3"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="รุ่นหมึก / Cartridge"
                    value={detail.cartridgeModel || ''}
                    onChange={e => setDetailField('cartridgeModel', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="IP Address"
                    value={detail.ipAddress || ''}
                    onChange={e => setDetailField('ipAddress', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="MAC Address"
                    value={detail.macAddress || ''}
                    onChange={e => setDetailField('macAddress', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    type="number"
                    label="จำนวนหน้าที่พิมพ์"
                    value={detail.pageCount ?? ''}
                    onChange={e => setDetailField('pageCount', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>
            </SectionCard>
          )}

          {/* AV Device */}
          {isDevice && (
            <SectionCard title="ข้อมูลอุปกรณ์ AV/นำเสนอ" barColor="linear-gradient(180deg,#059669,#34d399)">
              <Grid container spacing={2}>
                {typeLower.includes('projector') && (
                  <>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        type="number"
                        label="ความสว่าง (Lumens)"
                        value={detail.lumens ?? ''}
                        onChange={e => setDetailField('lumens', e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="ความละเอียด"
                        value={detail.resolution || ''}
                        onChange={e => setDetailField('resolution', e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        type="number"
                        label="Lamp Hours"
                        value={detail.lampHours ?? ''}
                        onChange={e => setDetailField('lampHours', e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                  </>
                )}
                {typeLower.includes('webcam') && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="ความละเอียด"
                        value={detail.resolution || ''}
                        onChange={e => setDetailField('resolution', e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="FPS"
                        value={detail.fps || ''}
                        onChange={e => setDetailField('fps', e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                  </>
                )}
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="การเชื่อมต่อ"
                    value={detail.connectionType || ''}
                    onChange={e => setDetailField('connectionType', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>
            </SectionCard>
          )}

          {/* Rack/UPS */}
          {isRack && (
            <SectionCard title="ข้อมูล Rack / UPS" barColor="linear-gradient(180deg,#374151,#6b7280)">
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="ประเภท"
                    value={detail.subType || ''}
                    onChange={e => setDetailField('subType', e.target.value)}
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {['Rack','Enclosure','PDU','UPS'].map(s => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                {typeLower.includes('ups') ? (
                  <>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        type="number"
                        label="ความจุ (VA)"
                        value={detail.vaCapacity ?? ''}
                        onChange={e => setDetailField('vaCapacity', e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        type="number"
                        label="Watt"
                        value={detail.wattCapacity ?? ''}
                        onChange={e => setDetailField('wattCapacity', e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                  </>
                ) : (
                  <>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Rack Units"
                        value={detail.rackUnits || ''}
                        onChange={e => setDetailField('rackUnits', e.target.value)}
                        placeholder="เช่น 42U"
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="ตำแหน่ง"
                        value={detail.rackLocation || ''}
                        onChange={e => setDetailField('rackLocation', e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </SectionCard>
          )}

          {/* Cable */}
          {isCable && (
            <SectionCard title="ข้อมูลสายสัญญาณ" barColor="linear-gradient(180deg,#6b7280,#9ca3af)">
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <TextField
                    select
                    label="ประเภทสาย"
                    value={detail.cableType || ''}
                    onChange={e => setDetailField('cableType', e.target.value)}
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {['HDMI','DisplayPort','USB-C','LAN CAT5e','LAN CAT6','Power Cable','Audio 3.5mm','Others'].map(c => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="ความยาว"
                    value={detail.length || ''}
                    onChange={e => setDetailField('length', e.target.value)}
                    placeholder="เช่น 1.5m"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    type="number"
                    label="จำนวนคงเหลือ"
                    value={detail.stockQuantity ?? ''}
                    onChange={e => setDetailField('stockQuantity', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    type="number"
                    label="Min Stock"
                    value={detail.minimumStock ?? ''}
                    onChange={e => setDetailField('minimumStock', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>
            </SectionCard>
          )}

          {/* Consumable */}
          {isConsumable && (
            <SectionCard title="ข้อมูลวัสดุสิ้นเปลือง" barColor="linear-gradient(180deg,#d97706,#fbbf24)">
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="ประเภทวัสดุ"
                    value={detail.consumableType || ''}
                    onChange={e => setDetailField('consumableType', e.target.value)}
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {['Toner Cartridge','Ink Cartridge','Drum Unit','Ribbon','Battery AA','Battery AAA','Adapter/Charger','Others'].map(c => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="ใช้กับ (Compatible)"
                    value={detail.compatibleWith || ''}
                    onChange={e => setDetailField('compatibleWith', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="วันหมดอายุ"
                    format="DD/MM/YYYY"
                    value={detail.expiryDate ? dayjs(detail.expiryDate) : null}
                    onChange={(newVal) => setDetailField('expiryDate', newVal ? newVal.format('YYYY-MM-DD') : '')}
                    slotProps={{ textField: { size: 'small', fullWidth: true, InputLabelProps: { shrink: true } } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    type="number"
                    label="จำนวนคงเหลือ"
                    value={detail.stockQuantity ?? ''}
                    onChange={e => setDetailField('stockQuantity', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    type="number"
                    label="Min Stock"
                    value={detail.minimumStock ?? ''}
                    onChange={e => setDetailField('minimumStock', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>
            </SectionCard>
          )}

          {/* ④ ข้อมูลการจัดซื้อและการเงิน */}
          <SectionCard title="ข้อมูลการจัดซื้อและการเงิน" sub="Procurement & Finance" barColor="linear-gradient(180deg,#059669,#34d399)">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="วันที่จัดซื้อ / วันรับมอบ"
                  format="DD/MM/YYYY"
                  value={form.purchaseDate ? dayjs(form.purchaseDate) : null}
                  onChange={(newVal) => setFormField('purchaseDate', 'วันที่จัดซื้อ / วันรับมอบ', newVal ? newVal.format('YYYY-MM-DD') : '')}
                  slotProps={{ textField: { size: 'small', fullWidth: true, InputLabelProps: { shrink: true } } }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  type="number"
                  label="มูลค่าจัดซื้อ (ไม่รวม VAT)"
                  value={form.purchasePrice}
                  onChange={e => setFormField('purchasePrice', 'มูลค่าจัดซื้อ', e.target.value)}
                  placeholder="ราคาประเมินหรือราคาจัดซื้อจริง"
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="อายุการใช้งาน (ปี)"
                  value={assetAge}
                  placeholder="คำนวณอัตโนมัติ"
                  fullWidth
                  size="small"
                  InputProps={{ readOnly: true }}
                  helperText="คำนวณจากวันที่ซื้อ"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="เลขที่ใบขอซื้อ (PR No.)"
                  value={form.prNumber}
                  onChange={e => setFormField('prNumber', 'PR Number', e.target.value)}
                  placeholder="เช่น PR-2568-0031"
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="เลขที่ใบสั่งซื้อ (PO No.)"
                  value={form.poNumber}
                  onChange={e => setFormField('poNumber', 'PO Number', e.target.value)}
                  placeholder="เช่น PO-2568-0042"
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="วันที่ออกใบสั่งซื้อ (PO Date)"
                  format="DD/MM/YYYY"
                  value={form.poDate ? dayjs(form.poDate) : null}
                  onChange={(newVal) => setFormField('poDate', 'PO Date', newVal ? newVal.format('YYYY-MM-DD') : '')}
                  slotProps={{ textField: { size: 'small', fullWidth: true, InputLabelProps: { shrink: true } } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="แหล่งงบประมาณ / โครงการ"
                  value={form.budget}
                  onChange={e => setFormField('budget', 'งบประมาณ', e.target.value)}
                  placeholder="เช่น งบประมาณปี 2569 / โครงการพัฒนาระบบ"
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="คู่ค้า / ผู้จัดจำหน่าย (Vendor)"
                  value={form.vendor}
                  onChange={e => setFormField('vendor', 'Vendor', e.target.value)}
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  {vendorOptions.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
          </SectionCard>

          {/* ⑤ การรับประกันและประวัติ */}
          <SectionCard title="การรับประกันและประวัติ" sub="Warranty & Lifecycle" barColor="linear-gradient(180deg,#e11d48,#f43f5e)">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="วันสิ้นสุดระยะรับประกัน"
                  format="DD/MM/YYYY"
                  value={form.warrantyEndDate ? dayjs(form.warrantyEndDate) : null}
                  onChange={(newVal) => setFormField('warrantyEndDate', 'วันสิ้นสุดระยะรับประกัน', newVal ? newVal.format('YYYY-MM-DD') : '')}
                  slotProps={{ textField: { size: 'small', fullWidth: true, InputLabelProps: { shrink: true }, helperText: (() => {
                    if (!form.warrantyEndDate) return '';
                    const today = new Date();
                    const warrantyDate = new Date(form.warrantyEndDate);
                    const daysLeft = Math.ceil((warrantyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    if (daysLeft < 0) return `⚠️ หมดประกันแล้ว ${Math.abs(daysLeft)} วัน`;
                    if (daysLeft < 30) return `⚠️ เตือน: ประกันจะหมดใน ${daysLeft} วัน`;
                    return `✅ ประกันคงเหลือ ${daysLeft} วัน`;
                  })() } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="โดเมนคอมพิวเตอร์ (Domain Name)"
                  value={form.domainName}
                  onChange={e => setFormField('domainName', 'Domain Name', e.target.value)}
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  {domainOptions.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </TextField>
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    สถานะการใช้งาน <Box component="span" sx={{ fontSize: '10px', color: 'error.main', bgcolor: alpha('#e11d48', 0.08), px: 1, py: 0.2, borderRadius: 3, ml: 1 }}>คลิกเพื่อเปลี่ยน</Box>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {statusOptions.map(opt => {
                    const isSelected = form.status === opt.value;
                    let activeColor = 'primary.main';
                    let activeBg = 'primary.light';
                    let borderColor = 'divider';
                    
                    if (opt.cls === 's-available') {
                      activeColor = 'success.main';
                      borderColor = isSelected ? 'success.main' : 'rgba(16, 185, 129, 0.3)';
                      activeBg = alpha('#10b981', 0.12);
                    } else if (opt.cls === 's-reserved') {
                      activeColor = 'secondary.main';
                      borderColor = isSelected ? 'secondary.main' : 'rgba(99, 102, 241, 0.25)';
                      activeBg = alpha('#6366f1', 0.1);
                    } else if (opt.cls === 's-maintenance') {
                      activeColor = 'error.main';
                      borderColor = isSelected ? 'error.main' : 'rgba(239, 68, 68, 0.25)';
                      activeBg = alpha('#ef4444', 0.08);
                    } else if (opt.cls === 's-retired') {
                      activeColor = 'text.secondary';
                      borderColor = isSelected ? 'text.secondary' : 'rgba(107, 114, 128, 0.2)';
                      activeBg = alpha('#6b7280', 0.08);
                    }

                    return (
                      <Button
                        type="button"
                        key={opt.value}
                        onClick={() => setFormField('status', 'สถานะการใช้งาน', opt.value)}
                        variant={isSelected ? 'contained' : 'outlined'}
                        size="small"
                        sx={{
                          borderRadius: '20px',
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '11px',
                          py: 0.5,
                          px: 2,
                          borderWidth: '1.5px',
                          '&:hover': { borderWidth: '1.5px' },
                          ...(isSelected ? {
                            bgcolor: activeColor,
                            color: '#fff',
                            borderColor: activeColor,
                          } : {
                            color: activeColor,
                            borderColor: borderColor,
                            bgcolor: 'transparent',
                            '&:hover': {
                              bgcolor: activeBg,
                              borderColor: activeColor,
                            }
                          })
                        }}
                      >
                        {opt.label}
                      </Button>
                    );
                  })}
                </Box>
              </Grid>


              <Grid item xs={12}>
                <TextField
                  multiline
                  rows={3}
                  label="บันทึกเพิ่มเติม / หมายเหตุ"
                  value={form.remark}
                  onChange={e => setFormField('remark', 'หมายเหตุ', e.target.value)}
                  placeholder="รายละเอียดข้อบกพร่อง, หมายเหตุอุปกรณ์เสริม หรืออื่นๆ..."
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>
          </SectionCard>

          {/* ⑥ รูปภาพ */}
          <SectionCard title="รูปภาพทะเบียนทรัพย์สิน" barColor="linear-gradient(180deg,#6366f1,#8b5cf6)">
            {imageError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
                {imageError}
              </Alert>
            )}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleImageUpload(f); }}
                  onDragOver={e => e.preventDefault()}
                  sx={{
                    width: '100%',
                    aspectRatio: '4/3',
                    borderRadius: '12px',
                    border: '2px dashed',
                    borderColor: alpha('#6366f1', 0.2),
                    bgcolor: 'rgba(248, 247, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.15s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'rgba(99, 102, 241, 0.03)'
                    }
                  }}
                >
                  {imagePreview ? (
                    <>
                      <Box component="img" src={imagePreview} alt="Asset" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }} onClick={e => e.stopPropagation()}>
                        <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: '#fff' } }}>
                          <PhotoCameraIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" onClick={handleImageDelete} sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'error.main', '&:hover': { bgcolor: '#fff' } }}>
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', p: 3 }}>
                      <Typography sx={{ fontSize: 32, mb: 1 }}>🖼</Typography>
                      <Typography variant="body2" color="text.secondary">ลากรูปภาพมาวางที่นี่</Typography>
                      <Typography variant="caption" color="primary.light" display="block" sx={{ mt: 0.5 }}>
                        หรือคลิกเพื่อเลือกไฟล์ · JPG, PNG สูงสุด 5MB
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading || !id}
                    sx={{ mb: 2, borderRadius: '10px', fontWeight: 600 }}
                  >
                    {imageUploading ? '⏳ กำลังอัพโหลด...' : id ? '📤 อัพโหลดรูปภาพ' : '💾 บันทึกก่อนอัพโหลด'}
                  </Button>
                  <Box sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: 'rgba(248, 247, 255, 0.6)',
                    border: '1px solid rgba(99, 102, 241, 0.09)',
                  }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      💡 คำแนะนำ
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.6 }}>
                      • ถ่ายรูปทะเบียนทรัพย์สินให้ชัดเจน อ่านข้อความได้<br />
                      • รองรับไฟล์ JPG, PNG, GIF<br />
                      • ขนาดไฟล์สูงสุด 5MB
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </SectionCard>

        </form>
      </Container>

      {/* Sticky Footer */}
      <Paper
        elevation={4}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(99, 102, 241, 0.1)',
          py: 1.5,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Button
          variant="outlined"
          color="error"
          onClick={() => {
            if (hasChanges) { if (window.confirm('ยืนยันยกเลิกการแก้ไข? การเปลี่ยนแปลงทั้งหมดจะหายไป')) navigate(-1); }
            else navigate(-1);
          }}
          sx={{ borderRadius: '10px', fontWeight: 600 }}
        >
          ↩ ยกเลิก
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {hasChanges && (
            <Typography variant="caption" color="text.secondary">
              เปลี่ยนแปลง <strong style={{ color: '#b45309' }}>{changeCount}</strong> รายการ
            </Typography>
          )}
          <Button
            type="submit"
            form="asset-form"
            variant="contained"
            disabled={loading}
            sx={{
              borderRadius: '10px',
              fontWeight: 600,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              boxShadow: `0 3px 12px ${alpha(theme.palette.primary.main, 0.28)}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.dark})`,
              }
            }}
          >
            {loading ? <CircularProgress size={16} sx={{ color: '#fff', mr: 1 }} /> : '💾 '}
            {id ? 'บันทึกการแก้ไข' : 'สร้างทรัพย์สิน'}
          </Button>
        </Box>
      </Paper>

      {/* Toast Alert Snackbar */}
      <Snackbar
        open={toastVisible}
        autoHideDuration={3000}
        onClose={() => setToastVisible(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 90, sm: 80 } }}
      >
        <Alert
          severity={toastMsg.startsWith('✅') ? 'success' : toastMsg.startsWith('⚠️') ? 'warning' : 'error'}
          variant="filled"
          onClose={() => setToastVisible(false)}
          sx={{ fontWeight: 600 }}
        >
          {toastMsg.replace(/^[✅⚠️❌]\s*/, '')}
        </Alert>
      </Snackbar>
    </Box>
  );
}
