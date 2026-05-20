import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useTheme,
  alpha,
  IconButton,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  CameraAlt as CameraAltIcon,
} from '@mui/icons-material';
import { assetAPI } from '../../services/api';

const initialData = {
  assetCode: '', assetName: '', serialNo: '', type: '', brand: '', model: '',
  cpu: '', cpuGeneration: '', ram: '', ramSlot1: '', ramSlot2: '', gpu: '',
  storage1: '', storage2: '', osType: 'Windows', osVersion: '',
  officeLicense: '', antivirusStatus: '', domainName: '',
  vendor: '', poNumber: '', poDate: '', prNumber: '', purchaseDate: '',
  purchasePrice: '', warrantyEndDate: '',
  ownerName: '', departmentId: '', location: '', floor: '',
  company: '', oldAssetCode: '', budget: '', status: 'Available', remark: '',
};

const fallbackStatusOptions = [
  { value: 'Available', label: 'พร้อมใช้งาน' },
  { value: 'Borrowed', label: 'กำลังยืม' },
  { value: 'InUse', label: 'ใช้งานประจำ' },
  { value: 'Maintenance', label: 'ซ่อมบำรุง' },
  { value: 'Retired', label: 'ปลดระวาง' },
  { value: 'Lost', label: 'สูญหาย' },
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

const fieldSx = {
  '& .MuiInputBase-root': {
    borderRadius: 1,
    fontSize: '0.875rem',
    backgroundColor: 'transparent',
    transition: 'all 0.15s ease',
  },
  '& .MuiInputLabel-root': {
    fontWeight: 400,
    fontSize: '0.8rem',
    color: 'text.secondary',
    '&.Mui-focused': {
      color: 'primary.main',
    },
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: (theme: any) => alpha(theme.palette.divider, 0.6),
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: (theme: any) => alpha(theme.palette.text.primary, 0.3),
  },
  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderWidth: 1,
  },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="subtitle2"
      sx={{
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: 'text.secondary',
        mb: 2,
        pb: 1,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      {children}
    </Typography>
  );
}

const typeGroupCategoryMap: Record<string, string> = {
  computers:    'คอมพิวเตอร์',
  monitors:     'จอภาพ',
  devices:      'อุปกรณ์นำเสนอ/AV',
  printers:     'เครื่องพิมพ์',
  phonesTablets: 'อุปกรณ์สื่อสาร',
  network:      'อุปกรณ์เครือข่าย',
};

export default function AssetFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeGroupFromUrl = searchParams.get('typeGroup') || '';
  const theme = useTheme();
  const [form, setForm] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [error, setError] = useState('');
  const [ownerOptions, setOwnerOptions] = useState<any[]>([]);
  const [ownerLoading, setOwnerLoading] = useState(false);
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [detail, setDetail] = useState<Record<string, any>>({});
  const [initialCategoryId, setInitialCategoryId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assetAge = useMemo(() => calculateAge(form.purchaseDate), [form.purchaseDate]);

  const isComputer = useMemo(() => {
    if (!selectedCategory || categories.length === 0) {
      const t = form.type?.toLowerCase().trim() || '';
      if (t === 'pc') return true;
      return ['notebook', 'pc desktop', 'macbook', 'mini pc', 'all-in-one', 'thin client', 'computer'].some(k => t.includes(k));
    }
    const cat = categories.find((c) => c.id === selectedCategory);
    if (!cat) return false;
    return cat.name === 'คอมพิวเตอร์';
  }, [selectedCategory, categories, form.type]);

  const isMonitor = useMemo(() => {
    if (!selectedCategory || categories.length === 0) {
      const t = form.type?.toLowerCase().trim() || '';
      return t.includes('monitor');
    }
    const cat = categories.find((c) => c.id === selectedCategory);
    if (!cat) return false;
    return cat.name === 'จอภาพ';
  }, [selectedCategory, categories, form.type]);

  const isPhone = useMemo(() => {
    if (!selectedCategory || categories.length === 0) {
      const t = form.type?.toLowerCase().trim() || '';
      return ['smartphone', 'tablet', 'mobile hotspot', 'ipad'].some(k => t.includes(k));
    }
    const cat = categories.find((c) => c.id === selectedCategory);
    return cat?.name === 'อุปกรณ์สื่อสาร';
  }, [selectedCategory, categories, form.type]);

  const isDevice = useMemo(() => {
    if (!selectedCategory || categories.length === 0) {
      const t = form.type?.toLowerCase().trim() || '';
      return ['projector', 'conference speaker', 'webcam', 'docking station', 'presentation clicker'].some(k => t.includes(k));
    }
    const cat = categories.find((c) => c.id === selectedCategory);
    return cat?.name === 'อุปกรณ์นำเสนอ/AV';
  }, [selectedCategory, categories, form.type]);

  const isNetwork = useMemo(() => {
    if (!selectedCategory || categories.length === 0) {
      const t = form.type?.toLowerCase().trim() || '';
      return ['switch', 'router', 'access point', 'firewall', 'modem'].some(k => t.includes(k));
    }
    const cat = categories.find((c) => c.id === selectedCategory);
    return cat?.name === 'อุปกรณ์เครือข่าย';
  }, [selectedCategory, categories, form.type]);

  const isRack = useMemo(() => {
    if (!selectedCategory || categories.length === 0) {
      const t = form.type?.toLowerCase().trim() || '';
      return ['server rack', 'pdu', 'ups', 'enclosure'].some(k => t.includes(k));
    }
    const cat = categories.find((c) => c.id === selectedCategory);
    return cat?.name === 'Rack & Infrastructure';
  }, [selectedCategory, categories, form.type]);

  const isPrinter = useMemo(() => {
    if (!selectedCategory || categories.length === 0) {
      const t = form.type?.toLowerCase().trim() || '';
      return t.includes('printer');
    }
    const cat = categories.find((c) => c.id === selectedCategory);
    return cat?.name === 'เครื่องพิมพ์';
  }, [selectedCategory, categories, form.type]);

  const isCable = useMemo(() => {
    if (!selectedCategory || categories.length === 0) {
      const t = form.type?.toLowerCase().trim() || '';
      return ['hdmi cable', 'displayport cable', 'usb-c cable', 'lan cable', 'power cable', 'audio cable'].some(k => t.includes(k));
    }
    const cat = categories.find((c) => c.id === selectedCategory);
    return cat?.name === 'สายสัญญาณ';
  }, [selectedCategory, categories, form.type]);

  const isConsumable = useMemo(() => {
    if (!selectedCategory || categories.length === 0) {
      const t = form.type?.toLowerCase().trim() || '';
      return ['cartridge', 'toner', 'ถ่าน', 'adapter/charger'].some(k => t.includes(k));
    }
    const cat = categories.find((c) => c.id === selectedCategory);
    return cat?.name === 'วัสดุสิ้นเปลือง';
  }, [selectedCategory, categories, form.type]);

  useEffect(() => {
    if (!id) return;
    assetAPI.get(parseInt(id)).then((res) => {
      const a = res.data;
      setForm({
        assetCode: a.assetCode || '',
        assetName: a.assetName || '',
        serialNo: a.serialNo || '',
        type: a.type || '',
        brand: a.brand || '',
        model: a.model || '',
        cpu: a.cpu || '',
        cpuGeneration: a.cpuGeneration || '',
        ram: a.ram || '',
        ramSlot1: a.ramSlot1 || '',
        ramSlot2: a.ramSlot2 || '',
        gpu: a.gpu || '',
        storage1: a.storage1 || '',
        storage2: a.storage2 || '',
        osType: a.osType || 'Windows',
        osVersion: a.osVersion || '',
        officeLicense: a.officeLicense || '',
        antivirusStatus: a.antivirusStatus || '',
        domainName: a.domainName || '',
        vendor: a.vendor || '',
        poNumber: a.poNumber || '',
        poDate: a.poDate ? a.poDate.split('T')[0] : '',
        prNumber: a.prNumber || '',
        purchaseDate: a.purchaseDate ? a.purchaseDate.split('T')[0] : '',
        purchasePrice: a.purchasePrice !== undefined && a.purchasePrice !== null ? String(a.purchasePrice) : '',
        warrantyEndDate: a.warrantyEndDate ? a.warrantyEndDate.split('T')[0] : '',
        ownerName: a.ownerName || '',
        departmentId: a.departmentId || '',
        location: a.location || '',
        floor: a.floor || '',
        company: a.company || '',
        oldAssetCode: a.oldAssetCode || '',
        budget: a.budget || '',
        status: a.status || 'Available',
        remark: a.remark || '',
      });
      if (a.image) {
        setImagePreview(a.image);
      }
      if (a.detail) {
        setDetail(a.detail);
      }
      if (a.categoryId) {
        setInitialCategoryId(a.categoryId);
      }
    }).finally(() => setFetching(false));
  }, [id]);

  useEffect(() => {
    assetAPI.typeOptions().then((res) => setTypeOptions(res.data || [])).catch(() => setTypeOptions([]));
    assetAPI.list({ limit: 1 }).then(() => {}).catch(() => {});
    import('../../services/api').then(({ categoryAPI }) => {
      categoryAPI.list().then((res) => {
        setCategories(res.data || []);
      }).catch(() => setCategories([]));
    });
    assetAPI.locationOptions().then((res) => setLocationOptions(res.data || [])).catch(() => setLocationOptions([]));
  }, []);



  // Auto-select category from ?typeGroup=... URL param (for new assets)
  useEffect(() => {
    if (!id && typeGroupFromUrl && categories.length > 0) {
      const targetName = typeGroupCategoryMap[typeGroupFromUrl];
      if (targetName) {
        const cat = categories.find(c => c.name === targetName);
        if (cat) {
          setSelectedCategory(cat.id);
          setAvailableTypes(cat.types || []);
        }
      }
    }
  }, [categories, typeGroupFromUrl, id]);

  useEffect(() => {
    if (initialCategoryId && categories.length > 0) {
      const cat = categories.find(c => c.id === initialCategoryId);
      if (cat) {
        setSelectedCategory(cat.id);
        setAvailableTypes(cat.types || []);
      }
    }
  }, [categories, initialCategoryId]);

  useEffect(() => {
    assetAPI.vendorOptions().then((res) => setVendorOptions(res.data || [])).catch(() => setVendorOptions([]));
    assetAPI.osTypeOptions().then((res) => setOsTypeOptions(res.data || [])).catch(() => {});
    assetAPI.departmentOptions().then((res) => setDepartmentOptions(res.data || [])).catch(() => {});
    assetAPI.domainOptions().then((res) => setDomainOptions(res.data || [])).catch(() => {});
    assetAPI.companyOptions().then((res) => setCompanyOptions(res.data || [])).catch(() => {});
    assetAPI.antivirusOptions().then((res) => setAntivirusOptions(res.data || [])).catch(() => {});
    assetAPI.statusOptions()
      .then((res) => {
        const options = (res.data || []).map((item: any) => ({ value: item.code, label: item.name }));
        setStatusOptions(options.length ? options : fallbackStatusOptions);
      })
      .catch(() => setStatusOptions(fallbackStatusOptions));
  }, []);

  useEffect(() => {
    const query = form.ownerName.trim();
    if (query.length < 2) {
      setOwnerOptions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setOwnerLoading(true);
      assetAPI.searchOwners(query)
        .then((res) => setOwnerOptions(res.data || []))
        .catch(() => setOwnerOptions([]))
        .finally(() => setOwnerLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [form.ownerName]);

  // Reset detail when asset type changes (only in create mode or when not initial load)
  useEffect(() => {
    if (!form.type) { setDetail({}); return; }
    const templates: Record<string, Record<string, any>> = {
      Smartphone: { osType: 'iOS' },
      Tablet: { osType: 'Android' },
      'Monitor มาตรฐาน': { resolution: '1920x1080' },
      'Monitor Ultrawide': { resolution: '2560x1440' },
      'Monitor Curved': { resolution: '1920x1080' },
      'Monitor 4K': { resolution: '3840x2160' },
      Projector: { subType: 'Projector' },
      Switch: { isManaged: true, portCount: 24 },
      Router: { isManaged: true },
      'Server Rack': { subType: 'Rack' },
      Enclosure: { subType: 'Enclosure' },
      PDU: { subType: 'PDU' },
      'Laser Printer': { printerType: 'Laser' },
      'Inkjet Printer': { printerType: 'Inkjet' },
      Notebook: {},
      'PC Desktop': {},
      Macbook: {},
      'Mini PC': {},
      'All-in-One': {},
      'Thin Client': {},
      'Mobile Hotspot': {},
      'Conference Speaker': {},
      Webcam: {},
      'Docking Station': {},
      'Presentation Clicker': {},
      'Thermal Printer': { printerType: 'Thermal' },
      'Dot Matrix Printer': { printerType: 'Dot Matrix' },
      'Access Point': {},
      Firewall: {},
      Modem: {},
      UPS: {},
    };
    const match = Object.keys(templates).find(k => k.toLowerCase() === form.type.toLowerCase());
    if (match) {
      setDetail((prev) => ({ ...templates[match], ...prev }));
    }
  }, [form.type]);

  const handleDetailChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : (e?.target?.value ?? e ?? '');
    setDetail((prev) => ({ ...prev, [field]: value }));
  };

  const handleChange = (field: keyof typeof initialData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetCode.trim() || !form.serialNo.trim() || !form.ownerName.trim()) {
      setError('กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน');
      return;
    }
    setLoading(true);
    setError('');
    const payload = { ...form, detail, categoryId: selectedCategory || undefined };
    try {
      if (id) {
        await assetAPI.update(parseInt(id), payload);
      } else {
        await assetAPI.create(payload);
      }
      navigate('/assets');
    } catch (err: any) {
      setError(err.response?.data?.error || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!id) {
      setImageError('กรุณาบันทึกทรัพย์สินก่อนอัพโหลดรูปภาพ');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setImageError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    setImageUploading(true);
    setImageError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      console.log('Uploading image for asset ID:', id);
      const res = await assetAPI.uploadImage(parseInt(id), formData);
      console.log('Upload response:', res.data);
      setImagePreview(res.data.image);
    } catch (err: any) {
      console.error('Upload error:', err);
      console.error('Error response:', err.response);
      setImageError(err.response?.data?.error || err.message || 'ไม่สามารถอัพโหลดรูปภาพได้');
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageDelete = async () => {
    if (!id) return;
    try {
      await assetAPI.deleteImage(parseInt(id));
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setImageError(err.response?.data?.error || 'ไม่สามารถลบรูปภาพได้');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const typeLower = form.type?.toLowerCase() || '';

  function renderDetailFields() {
    if (!form.type && !selectedCategory) return null;

    // อุปกรณ์สื่อสาร (Phone / Tablet / IPAD)
    if (isPhone) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลอุปกรณ์สื่อสาร</SectionTitle>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="IMEI 1" fullWidth value={detail.imei1 || ''} onChange={handleDetailChange('imei1')} sx={fieldSx} placeholder="ตัวเลข 15 หลัก" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="IMEI 2" fullWidth value={detail.imei2 || ''} onChange={handleDetailChange('imei2')} sx={fieldSx} placeholder="ตัวเลข 15 หลัก (ถ้ามี)" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="เบอร์โทรศัพท์" fullWidth value={detail.phoneNumber || ''} onChange={handleDetailChange('phoneNumber')} sx={fieldSx} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="OS" select fullWidth value={detail.osType || ''} onChange={handleDetailChange('osType')} sx={fieldSx}>
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  <MenuItem value="iOS">iOS</MenuItem>
                  <MenuItem value="iPadOS">iPadOS</MenuItem>
                  <MenuItem value="Android">Android</MenuItem>
                  <MenuItem value="Others">อื่นๆ</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="OS Version" fullWidth value={detail.osVersion || ''} onChange={handleDetailChange('osVersion')} sx={fieldSx} placeholder="เช่น iOS 17.4, Android 14" />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="ความจุ (Storage)" fullWidth value={detail.storageCapacity || ''} onChange={handleDetailChange('storageCapacity')} sx={fieldSx} placeholder="เช่น 128GB, 256GB" />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="RAM" fullWidth value={detail.ram || ''} onChange={handleDetailChange('ram')} sx={fieldSx} placeholder="เช่น 6GB, 8GB" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="สี (Color)" fullWidth value={detail.color || ''} onChange={handleDetailChange('color')} sx={fieldSx} placeholder="เช่น Space Gray, Silver, Blue" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="ผู้ให้บริการ (SIM/Carrier)" fullWidth value={detail.simProvider || ''} onChange={handleDetailChange('simProvider')} sx={fieldSx} placeholder="เช่น AIS, TrueMove, DTAC" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="MDM Enrolled" select fullWidth value={detail.mdmEnrolled === null || detail.mdmEnrolled === undefined ? '' : String(detail.mdmEnrolled)} onChange={(e) => setDetail((prev) => ({ ...prev, mdmEnrolled: e.target.value === '' ? null : e.target.value === 'true' }))} sx={fieldSx}>
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  <MenuItem value="true">ลงทะเบียนแล้ว</MenuItem>
                  <MenuItem value="false">ยังไม่ได้ลงทะเบียน</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      );
    }

    // จอภาพ (Monitor)
    if (isMonitor) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลจอภาพ</SectionTitle>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="ขนาดจอ (นิ้ว)" fullWidth value={detail.screenSize || ''} onChange={handleDetailChange('screenSize')} sx={fieldSx} placeholder="เช่น 24, 27, 34" />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="ความละเอียด" select fullWidth value={detail.resolution || ''} onChange={handleDetailChange('resolution')} sx={fieldSx}>
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  <MenuItem value="1920x1080">1920x1080 (Full HD)</MenuItem>
                  <MenuItem value="2560x1080">2560x1080 (UW FHD)</MenuItem>
                  <MenuItem value="2560x1440">2560x1440 (QHD)</MenuItem>
                  <MenuItem value="3440x1440">3440x1440 (UW QHD)</MenuItem>
                  <MenuItem value="3840x2160">3840x2160 (4K)</MenuItem>
                  <MenuItem value="Others">อื่นๆ</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="ประเภทแผง (Panel Type)" select fullWidth value={detail.panelType || ''} onChange={handleDetailChange('panelType')} sx={fieldSx}>
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  <MenuItem value="IPS">IPS</MenuItem>
                  <MenuItem value="VA">VA</MenuItem>
                  <MenuItem value="TN">TN</MenuItem>
                  <MenuItem value="OLED">OLED</MenuItem>
                  <MenuItem value="QLED">QLED</MenuItem>
                  <MenuItem value="Others">อื่นๆ</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="อัตรารีเฟรช (Hz)" fullWidth value={detail.refreshRate || ''} onChange={handleDetailChange('refreshRate')} sx={fieldSx} placeholder="เช่น 60Hz, 144Hz, 240Hz" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="พอร์ตเชื่อมต่อ" fullWidth value={detail.ports || ''} onChange={handleDetailChange('ports')} sx={fieldSx} placeholder="เช่น HDMI x2, DisplayPort, USB-C" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="มีลำโพงในตัว" select fullWidth value={detail.hasSpeaker === null || detail.hasSpeaker === undefined ? '' : String(detail.hasSpeaker)} onChange={(e) => setDetail((prev) => ({ ...prev, hasSpeaker: e.target.value === '' ? null : e.target.value === 'true' }))} sx={fieldSx}>
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  <MenuItem value="true">มี</MenuItem>
                  <MenuItem value="false">ไม่มี</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="จอโค้ง (Curved)" select fullWidth value={detail.curved === null || detail.curved === undefined ? '' : String(detail.curved)} onChange={(e) => setDetail((prev) => ({ ...prev, curved: e.target.value === '' ? null : e.target.value === 'true' }))} sx={fieldSx}>
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  <MenuItem value="true">จอโค้ง</MenuItem>
                  <MenuItem value="false">จอแบน</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      );
    }

    // อุปกรณ์นำเสนอ/AV
    if (isDevice) {
      if (typeLower.includes('projector')) {
        return (
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>ข้อมูล Projector</SectionTitle>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={4}>
                  <TextField size="small" label="ความสว่าง (Lumens)" type="number" fullWidth value={detail.lumens ?? ''} onChange={handleDetailChange('lumens')} sx={fieldSx} placeholder="เช่น 3000, 4000" />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField size="small" label="ความละเอียด" select fullWidth value={detail.resolution || ''} onChange={handleDetailChange('resolution')} sx={fieldSx}>
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    <MenuItem value="SVGA 800x600">SVGA 800x600</MenuItem>
                    <MenuItem value="XGA 1024x768">XGA 1024x768</MenuItem>
                    <MenuItem value="WXGA 1280x800">WXGA 1280x800</MenuItem>
                    <MenuItem value="Full HD 1920x1080">Full HD 1920x1080</MenuItem>
                    <MenuItem value="4K 3840x2160">4K 3840x2160</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField size="small" label="Throw Ratio" fullWidth value={detail.throwRatio || ''} onChange={handleDetailChange('throwRatio')} sx={fieldSx} placeholder="เช่น 1.5:1" />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField size="small" label="ชั่วโมงหลอดที่ใช้แล้ว (Lamp Hours)" type="number" fullWidth value={detail.lampHours ?? ''} onChange={handleDetailChange('lampHours')} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField size="small" label="ช่องสัญญาณเข้า (Input)" fullWidth value={detail.connectionType || ''} onChange={handleDetailChange('connectionType')} sx={fieldSx} placeholder="เช่น HDMI, VGA, USB-C" />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );
      }
      if (typeLower.includes('webcam')) {
        return (
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>ข้อมูล Webcam</SectionTitle>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={4}>
                  <TextField size="small" label="ความละเอียด" select fullWidth value={detail.resolution || ''} onChange={handleDetailChange('resolution')} sx={fieldSx}>
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    <MenuItem value="720p HD">720p (HD)</MenuItem>
                    <MenuItem value="1080p Full HD">1080p (Full HD)</MenuItem>
                    <MenuItem value="1440p QHD">1440p (QHD)</MenuItem>
                    <MenuItem value="4K UHD">4K (UHD)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField size="small" label="FPS" select fullWidth value={detail.fps || ''} onChange={handleDetailChange('fps')} sx={fieldSx}>
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    <MenuItem value="30fps">30fps</MenuItem>
                    <MenuItem value="60fps">60fps</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField size="small" label="การเชื่อมต่อ" select fullWidth value={detail.connectionType || ''} onChange={handleDetailChange('connectionType')} sx={fieldSx}>
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    <MenuItem value="USB-A">USB-A</MenuItem>
                    <MenuItem value="USB-C">USB-C</MenuItem>
                    <MenuItem value="Wireless">Wireless</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );
      }
      if (typeLower.includes('docking')) {
        return (
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>ข้อมูล Docking Station</SectionTitle>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={4}>
                  <TextField size="small" label="มาตรฐานเชื่อมต่อ" select fullWidth value={detail.usbStandard || ''} onChange={handleDetailChange('usbStandard')} sx={fieldSx}>
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    <MenuItem value="USB-C 3.1">USB-C 3.1</MenuItem>
                    <MenuItem value="USB-C 3.2">USB-C 3.2</MenuItem>
                    <MenuItem value="Thunderbolt 3">Thunderbolt 3</MenuItem>
                    <MenuItem value="Thunderbolt 4">Thunderbolt 4</MenuItem>
                    <MenuItem value="USB-A 3.0">USB-A 3.0</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField size="small" label="จำนวนพอร์ต" type="number" fullWidth value={detail.portCount ?? ''} onChange={handleDetailChange('portCount')} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField size="small" label="Power Delivery (W)" type="number" fullWidth value={detail.powerDelivery ?? ''} onChange={handleDetailChange('powerDelivery')} sx={fieldSx} placeholder="เช่น 65, 90, 100" />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );
      }
      if (typeLower.includes('conference speaker') || typeLower.includes('speaker')) {
        return (
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>ข้อมูล Conference Speaker</SectionTitle>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <TextField size="small" label="การเชื่อมต่อ" select fullWidth value={detail.connectionType || ''} onChange={handleDetailChange('connectionType')} sx={fieldSx}>
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    <MenuItem value="USB">USB</MenuItem>
                    <MenuItem value="Bluetooth">Bluetooth</MenuItem>
                    <MenuItem value="3.5mm Audio">3.5mm Audio</MenuItem>
                    <MenuItem value="USB + Bluetooth">USB + Bluetooth</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField size="small" label="กำลังไฟ (W)" fullWidth value={detail.powerRating || ''} onChange={handleDetailChange('powerRating')} sx={fieldSx} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );
      }
      if (typeLower.includes('clicker') || typeLower.includes('presentation clicker')) {
        return (
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>ข้อมูล Presentation Clicker</SectionTitle>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={4}>
                  <TextField size="small" label="ช่วงระยะ (Range)" fullWidth value={detail.range || ''} onChange={handleDetailChange('range')} sx={fieldSx} placeholder="เช่น 30m, 50m" />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField size="small" label="ประเภท Receiver" select fullWidth value={detail.receiverType || ''} onChange={handleDetailChange('receiverType')} sx={fieldSx}>
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    <MenuItem value="USB-A dongle">USB-A dongle</MenuItem>
                    <MenuItem value="USB-C dongle">USB-C dongle</MenuItem>
                    <MenuItem value="Bluetooth">Bluetooth</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField size="small" label="แบตเตอรี่" fullWidth value={detail.batteryType || ''} onChange={handleDetailChange('batteryType')} sx={fieldSx} placeholder="เช่น AAA x1, Built-in" />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );
      }
      // Generic AV
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลอุปกรณ์ AV</SectionTitle>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField size="small" label="ประเภทการเชื่อมต่อ" fullWidth value={detail.connectionType || ''} onChange={handleDetailChange('connectionType')} sx={fieldSx} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" label="กำลังไฟ (W)" fullWidth value={detail.powerRating || ''} onChange={handleDetailChange('powerRating')} sx={fieldSx} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      );
    }

    // อุปกรณ์เครือข่าย (Network)
    if (isNetwork) {
      const isAccessPoint = typeLower.includes('access point');
      const isSwitch = typeLower.includes('switch');
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลอุปกรณ์เครือข่าย</SectionTitle>
            <Grid container spacing={2.5}>
              {isAccessPoint ? (
                <>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" label="WiFi Standard" select fullWidth value={detail.wifiStandard || ''} onChange={handleDetailChange('wifiStandard')} sx={fieldSx}>
                      <MenuItem value="">ไม่ระบุ</MenuItem>
                      <MenuItem value="WiFi 4 (802.11n)">WiFi 4 (802.11n)</MenuItem>
                      <MenuItem value="WiFi 5 (802.11ac)">WiFi 5 (802.11ac)</MenuItem>
                      <MenuItem value="WiFi 6 (802.11ax)">WiFi 6 (802.11ax)</MenuItem>
                      <MenuItem value="WiFi 6E">WiFi 6E</MenuItem>
                      <MenuItem value="WiFi 7 (802.11be)">WiFi 7 (802.11be)</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" label="ย่านความถี่ (Band)" select fullWidth value={detail.band || ''} onChange={handleDetailChange('band')} sx={fieldSx}>
                      <MenuItem value="">ไม่ระบุ</MenuItem>
                      <MenuItem value="2.4GHz only">2.4GHz เท่านั้น</MenuItem>
                      <MenuItem value="5GHz only">5GHz เท่านั้น</MenuItem>
                      <MenuItem value="Dual Band (2.4+5GHz)">Dual Band (2.4+5GHz)</MenuItem>
                      <MenuItem value="Tri Band">Tri Band</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" label="จำนวนพอร์ต LAN" type="number" fullWidth value={detail.portCount ?? ''} onChange={handleDetailChange('portCount')} sx={fieldSx} />
                  </Grid>
                </>
              ) : (
                <>
                  <Grid item xs={12} sm={3}>
                    <TextField size="small" label="จำนวน Port" type="number" fullWidth value={detail.portCount ?? ''} onChange={handleDetailChange('portCount')} sx={fieldSx} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField size="small" label="ความเร็ว Port" select fullWidth value={detail.portSpeed || ''} onChange={handleDetailChange('portSpeed')} sx={fieldSx}>
                      <MenuItem value="">ไม่ระบุ</MenuItem>
                      <MenuItem value="100Mbps">100Mbps</MenuItem>
                      <MenuItem value="1Gbps">1Gbps</MenuItem>
                      <MenuItem value="10Gbps">10Gbps</MenuItem>
                      <MenuItem value="25Gbps">25Gbps</MenuItem>
                      <MenuItem value="40Gbps">40Gbps</MenuItem>
                    </TextField>
                  </Grid>
                  {isSwitch && (
                    <>
                      <Grid item xs={12} sm={3}>
                        <TextField size="small" label="PoE" select fullWidth value={detail.hasPoE === null || detail.hasPoE === undefined ? '' : String(detail.hasPoE)} onChange={(e) => setDetail((prev) => ({ ...prev, hasPoE: e.target.value === '' ? null : e.target.value === 'true' }))} sx={fieldSx}>
                          <MenuItem value="">ไม่ระบุ</MenuItem>
                          <MenuItem value="true">มี PoE</MenuItem>
                          <MenuItem value="false">ไม่มี PoE</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField size="small" label="VLAN Support" select fullWidth value={detail.vlanSupport === null || detail.vlanSupport === undefined ? '' : String(detail.vlanSupport)} onChange={(e) => setDetail((prev) => ({ ...prev, vlanSupport: e.target.value === '' ? null : e.target.value === 'true' }))} sx={fieldSx}>
                          <MenuItem value="">ไม่ระบุ</MenuItem>
                          <MenuItem value="true">รองรับ VLAN</MenuItem>
                          <MenuItem value="false">ไม่รองรับ</MenuItem>
                        </TextField>
                      </Grid>
                    </>
                  )}
                </>
              )}
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="IP Address" fullWidth value={detail.ipAddress || ''} onChange={handleDetailChange('ipAddress')} sx={fieldSx} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="MAC Address" fullWidth value={detail.macAddress || ''} onChange={handleDetailChange('macAddress')} sx={fieldSx} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="Firmware Version" fullWidth value={detail.firmwareVersion || ''} onChange={handleDetailChange('firmwareVersion')} sx={fieldSx} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="จัดการได้ (Managed)" select fullWidth value={detail.isManaged === null || detail.isManaged === undefined ? '' : String(detail.isManaged)} onChange={(e) => setDetail((prev) => ({ ...prev, isManaged: e.target.value === '' ? null : e.target.value === 'true' }))} sx={fieldSx}>
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  <MenuItem value="true">Managed</MenuItem>
                  <MenuItem value="false">Unmanaged</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      );
    }

    // Rack & Infrastructure
    if (isRack) {
      const isUPS = typeLower.includes('ups');
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูล {isUPS ? 'UPS' : 'Rack / Infrastructure'}</SectionTitle>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="ประเภท" select fullWidth value={detail.subType || ''} onChange={handleDetailChange('subType')} sx={fieldSx}>
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  <MenuItem value="Rack">Rack</MenuItem>
                  <MenuItem value="Enclosure">Enclosure</MenuItem>
                  <MenuItem value="PDU">PDU</MenuItem>
                  <MenuItem value="UPS">UPS</MenuItem>
                </TextField>
              </Grid>
              {isUPS ? (
                <>
                  <Grid item xs={12} sm={3}>
                    <TextField size="small" label="ความจุ (VA)" type="number" fullWidth value={detail.vaCapacity ?? ''} onChange={handleDetailChange('vaCapacity')} sx={fieldSx} placeholder="เช่น 1000, 2000" />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField size="small" label="Watt ที่รองรับ" type="number" fullWidth value={detail.wattCapacity ?? ''} onChange={handleDetailChange('wattCapacity')} sx={fieldSx} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField size="small" label="Runtime (นาที)" type="number" fullWidth value={detail.batteryRuntime ?? ''} onChange={handleDetailChange('batteryRuntime')} sx={fieldSx} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" label="ประเภทแบตเตอรี่" fullWidth value={detail.batteryType || ''} onChange={handleDetailChange('batteryType')} sx={fieldSx} placeholder="เช่น Lead Acid, Lithium" />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" label="จำนวน Outlet" type="number" fullWidth value={detail.outletCount ?? ''} onChange={handleDetailChange('outletCount')} sx={fieldSx} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" label="ตำแหน่งติดตั้ง" fullWidth value={detail.rackLocation || ''} onChange={handleDetailChange('rackLocation')} sx={fieldSx} />
                  </Grid>
                </>
              ) : (
                <>
                  <Grid item xs={12} sm={3}>
                    <TextField size="small" label="ขนาด (Rack Units)" fullWidth value={detail.rackUnits || ''} onChange={handleDetailChange('rackUnits')} sx={fieldSx} placeholder="เช่น 42U" />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField size="small" label="กำลังไฟ (Power Capacity)" fullWidth value={detail.powerCapacity || ''} onChange={handleDetailChange('powerCapacity')} sx={fieldSx} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField size="small" label="ตำแหน่งในห้อง Server" fullWidth value={detail.rackLocation || ''} onChange={handleDetailChange('rackLocation')} sx={fieldSx} />
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>
      );
    }

    // เครื่องพิมพ์ (Printer)
    if (isPrinter) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลเครื่องพิมพ์</SectionTitle>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="ประเภทเครื่องพิมพ์" select fullWidth value={detail.printerType || ''} onChange={handleDetailChange('printerType')} sx={fieldSx}>
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  <MenuItem value="Laser">Laser</MenuItem>
                  <MenuItem value="Inkjet">Inkjet</MenuItem>
                  <MenuItem value="Thermal">Thermal</MenuItem>
                  <MenuItem value="Dot Matrix">Dot Matrix</MenuItem>
                  <MenuItem value="Others">อื่นๆ</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="พิมพ์สี" select fullWidth value={detail.isColor === null || detail.isColor === undefined ? '' : String(detail.isColor)} onChange={(e) => setDetail((prev) => ({ ...prev, isColor: e.target.value === '' ? null : e.target.value === 'true' }))} sx={fieldSx}>
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  <MenuItem value="true">สี (Color)</MenuItem>
                  <MenuItem value="false">ขาวดำ (Mono)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="ขนาดกระดาษ" fullWidth value={detail.paperSizes || ''} onChange={handleDetailChange('paperSizes')} sx={fieldSx} placeholder="เช่น A4, A3, Letter" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="พิมพ์สองหน้า (Duplex)" select fullWidth value={detail.duplexSupport === null || detail.duplexSupport === undefined ? '' : String(detail.duplexSupport)} onChange={(e) => setDetail((prev) => ({ ...prev, duplexSupport: e.target.value === '' ? null : e.target.value === 'true' }))} sx={fieldSx}>
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  <MenuItem value="true">รองรับ Duplex</MenuItem>
                  <MenuItem value="false">ไม่รองรับ</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="เชื่อมต่อเครือข่าย" select fullWidth value={detail.isNetworkEnabled === null || detail.isNetworkEnabled === undefined ? '' : String(detail.isNetworkEnabled)} onChange={(e) => setDetail((prev) => ({ ...prev, isNetworkEnabled: e.target.value === '' ? null : e.target.value === 'true' }))} sx={fieldSx}>
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  <MenuItem value="true">มี Network</MenuItem>
                  <MenuItem value="false">ไม่มี Network</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="รุ่นหมึก/Cartridge" fullWidth value={detail.cartridgeModel || ''} onChange={handleDetailChange('cartridgeModel')} sx={fieldSx} placeholder="เช่น TN-2380, CE285A" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="IP Address" fullWidth value={detail.ipAddress || ''} onChange={handleDetailChange('ipAddress')} sx={fieldSx} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="MAC Address" fullWidth value={detail.macAddress || ''} onChange={handleDetailChange('macAddress')} sx={fieldSx} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="จำนวนหน้าพิมพ์แล้ว" type="number" fullWidth value={detail.pageCount ?? ''} onChange={handleDetailChange('pageCount')} sx={fieldSx} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      );
    }

    // สายสัญญาณ (Cable)
    if (isCable) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลสายสัญญาณ</SectionTitle>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="ประเภทสาย" select fullWidth value={detail.cableType || ''} onChange={handleDetailChange('cableType')} sx={fieldSx}>
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  <MenuItem value="HDMI">HDMI</MenuItem>
                  <MenuItem value="DisplayPort">DisplayPort</MenuItem>
                  <MenuItem value="USB-C">USB-C</MenuItem>
                  <MenuItem value="LAN CAT5e">LAN CAT5e</MenuItem>
                  <MenuItem value="LAN CAT6">LAN CAT6</MenuItem>
                  <MenuItem value="LAN CAT6a">LAN CAT6a</MenuItem>
                  <MenuItem value="Power Cable">Power Cable</MenuItem>
                  <MenuItem value="Audio 3.5mm">Audio 3.5mm</MenuItem>
                  <MenuItem value="Others">อื่นๆ</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="ความยาว" fullWidth value={detail.length || ''} onChange={handleDetailChange('length')} sx={fieldSx} placeholder="เช่น 1.5m, 3m, 5m" />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="จำนวนคงเหลือ (ชิ้น)" type="number" fullWidth value={detail.stockQuantity ?? ''} onChange={handleDetailChange('stockQuantity')} sx={fieldSx} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField size="small" label="จำนวนขั้นต่ำ (Min Stock)" type="number" fullWidth value={detail.minimumStock ?? ''} onChange={handleDetailChange('minimumStock')} sx={fieldSx} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      );
    }

    // วัสดุสิ้นเปลือง (Consumable)
    if (isConsumable) {
      return (
        <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>ข้อมูลวัสดุสิ้นเปลือง</SectionTitle>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="ประเภทวัสดุ" select fullWidth value={detail.consumableType || ''} onChange={handleDetailChange('consumableType')} sx={fieldSx}>
                  <MenuItem value="">ไม่ระบุ</MenuItem>
                  <MenuItem value="Toner Cartridge">Toner Cartridge</MenuItem>
                  <MenuItem value="Ink Cartridge">Ink Cartridge</MenuItem>
                  <MenuItem value="Drum Unit">Drum Unit</MenuItem>
                  <MenuItem value="Ribbon">Ribbon</MenuItem>
                  <MenuItem value="Battery AA">Battery AA</MenuItem>
                  <MenuItem value="Battery AAA">Battery AAA</MenuItem>
                  <MenuItem value="Adapter/Charger">Adapter/Charger</MenuItem>
                  <MenuItem value="Others">อื่นๆ</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="ใช้งานกับ (Compatible With)" fullWidth value={detail.compatibleWith || ''} onChange={handleDetailChange('compatibleWith')} sx={fieldSx} placeholder="เช่น Brother HL-L2320D" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="วันหมดอายุ" type="date" fullWidth InputLabelProps={{ shrink: true }} value={detail.expiryDate ? String(detail.expiryDate).split('T')[0] : ''} onChange={handleDetailChange('expiryDate')} sx={fieldSx} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="จำนวนคงเหลือ" type="number" fullWidth value={detail.stockQuantity ?? ''} onChange={handleDetailChange('stockQuantity')} sx={fieldSx} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField size="small" label="จำนวนขั้นต่ำ (Min Stock)" type="number" fullWidth value={detail.minimumStock ?? ''} onChange={handleDetailChange('minimumStock')} sx={fieldSx} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      );
    }

    return null;
  }

  if (fetching) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress size={32} />
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
            onClick={() => navigate('/assets')}
            sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
          >
            กลับ
          </Button>
          <Typography variant="h5" fontWeight={500} sx={{ letterSpacing: -0.3 }}>
            {id ? 'แก้ไขข้อมูลทรัพย์สิน' : 'เพิ่มทรัพย์สินใหม่'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          type="submit"
          form="asset-form"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon sx={{ fontSize: 18 }} />}
          sx={{
            borderRadius: 1,
            fontWeight: 500,
            textTransform: 'none',
            px: 2.5,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          }}
        >
          {loading ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 1 }}>{error}</Alert>}

      <Box id="asset-form" component="form" onSubmit={handleSubmit}>
        <Stack spacing={4}>
          {/* ผู้ถือครองและสถานที่ */}
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>ผู้ถือครองและสถานที่</SectionTitle>
              <Grid container spacing={2.5}>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    freeSolo
                    options={ownerOptions}
                    loading={ownerLoading}
                    inputValue={form.ownerName}
                    getOptionLabel={(option) => typeof option === 'string' ? option : option.displayName || option.adUsername || ''}
                    onInputChange={(_, value) => setForm((prev) => ({ ...prev, ownerName: value }))}
                    onChange={(_, value) => {
                      if (value && typeof value !== 'string') {
                        setForm((prev) => ({
                          ...prev,
                          ownerName: value.displayName || value.adUsername || prev.ownerName,
                          departmentId: value.department || prev.departmentId,
                        }));
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="ผู้ถือครอง *"
                        required
                        helperText="ค้นหาจาก AD/LDAP หรือกรอกเองได้"
                        sx={fieldSx}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {ownerLoading ? <CircularProgress color="inherit" size={16} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField size="small" label="แผนก" select fullWidth value={form.departmentId} onChange={handleChange('departmentId')} sx={fieldSx}>
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {departmentOptions.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField size="small" label="Location" select fullWidth value={form.location} onChange={handleChange('location')} sx={fieldSx}>
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {locationOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField size="small" label="Floor" fullWidth value={form.floor} onChange={handleChange('floor')} sx={fieldSx} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* ข้อมูลทรัพย์สิน */}
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>ข้อมูลทรัพย์สิน</SectionTitle>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField size="small" label="รหัสทรัพย์สิน *" fullWidth required value={form.assetCode} onChange={handleChange('assetCode')} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField size="small" label="ชื่อทรัพย์สิน" fullWidth value={form.assetName} onChange={handleChange('assetName')} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField size="small" label="Serial Number *" fullWidth required value={form.serialNo} onChange={handleChange('serialNo')} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField size="small" label="หมวดหมู่" select fullWidth value={selectedCategory || ''} onChange={(e) => {
                    const catId = e.target.value ? parseInt(e.target.value) : null;
                    setSelectedCategory(catId);
                    setForm((prev) => ({ ...prev, type: '' }));
                    if (catId) {
                      const cat = categories.find(c => c.id === catId);
                      setAvailableTypes(cat?.types || []);
                    } else {
                      setAvailableTypes([]);
                    }
                  }} sx={fieldSx}>
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {categories.map((cat) => <MenuItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField size="small" label="ประเภทอุปกรณ์" select fullWidth value={form.type} onChange={handleChange('type')} sx={fieldSx} disabled={!selectedCategory && availableTypes.length === 0}>
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {(selectedCategory ? availableTypes : typeOptions.map(t => ({ name: t }))).map((option: any) => <MenuItem key={option.name || option} value={option.name || option}>{option.name || option}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField size="small" label="สถานะ" select fullWidth value={form.status} onChange={handleChange('status')} sx={fieldSx}>
                    {statusOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField size="small" label="ยี่ห้อ (Brand)" fullWidth value={form.brand} onChange={handleChange('brand')} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField size="small" label="รุ่น (Model)" fullWidth value={form.model} onChange={handleChange('model')} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Autocomplete
                    freeSolo
                    options={companyOptions}
                    inputValue={form.company}
                    onInputChange={(_, v) => setForm((prev) => ({ ...prev, company: v }))}
                    onChange={(_, v) => setForm((prev) => ({ ...prev, company: v || '' }))}
                    renderInput={(params) => (
                      <TextField {...params} size="small" label="Company" fullWidth sx={fieldSx} />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField size="small" label="Computer Name เดิม" fullWidth value={form.oldAssetCode} onChange={handleChange('oldAssetCode')} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField size="small" label="Domain Name" select fullWidth value={form.domainName} onChange={handleChange('domainName')} sx={fieldSx}>
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {domainOptions.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                  </TextField>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* OS/Software และ Hardware */}
          {isComputer && !isMonitor && (
            <Grid container spacing={3}>
              <Grid item xs={12} lg={5}>
                <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider', height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <SectionTitle>OS และ Software</SectionTitle>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Autocomplete
                          freeSolo
                          options={osTypeOptions}
                          inputValue={form.osType}
                          onInputChange={(_, v) => setForm((prev) => ({ ...prev, osType: v }))}
                          onChange={(_, v) => setForm((prev) => ({ ...prev, osType: v || '' }))}
                          renderInput={(params) => (
                            <TextField {...params} size="small" label="OS" fullWidth sx={fieldSx} />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField size="small" label="Windows" fullWidth value={form.osVersion} onChange={handleChange('osVersion')} sx={fieldSx} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField size="small" label="MS Office" fullWidth value={form.officeLicense} onChange={handleChange('officeLicense')} sx={fieldSx} />
                      </Grid>
                      <Grid item xs={12}>
                        <Autocomplete
                          freeSolo
                          options={antivirusOptions}
                          inputValue={form.antivirusStatus}
                          onInputChange={(_, v) => setForm((prev) => ({ ...prev, antivirusStatus: v }))}
                          onChange={(_, v) => setForm((prev) => ({ ...prev, antivirusStatus: v || '' }))}
                          renderInput={(params) => (
                            <TextField {...params} size="small" label="Antivirus" fullWidth sx={fieldSx} />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} lg={7}>
                <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider', height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <SectionTitle>Hardware</SectionTitle>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField size="small" label="CPU" fullWidth value={form.cpu} onChange={handleChange('cpu')} sx={fieldSx} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField size="small" label="Generation" fullWidth value={form.cpuGeneration} onChange={handleChange('cpuGeneration')} sx={fieldSx} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField size="small" label="GPU" fullWidth value={form.gpu} onChange={handleChange('gpu')} sx={fieldSx} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField size="small" label="RAM" fullWidth value={form.ram} onChange={handleChange('ram')} sx={fieldSx} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField size="small" label="RAM Slot1" fullWidth value={form.ramSlot1} onChange={handleChange('ramSlot1')} sx={fieldSx} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField size="small" label="RAM Slot2" fullWidth value={form.ramSlot2} onChange={handleChange('ramSlot2')} sx={fieldSx} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField size="small" label="Storage 1" fullWidth value={form.storage1} onChange={handleChange('storage1')} sx={fieldSx} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField size="small" label="Storage 2" fullWidth value={form.storage2} onChange={handleChange('storage2')} sx={fieldSx} />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Type-specific detail fields */}
          {renderDetailFields()}

          {/* ข้อมูลจัดซื้อ */}
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>ข้อมูลจัดซื้อ</SectionTitle>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField size="small" label="PR No." fullWidth value={form.prNumber} onChange={handleChange('prNumber')} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField size="small" label="งบประมาณ" fullWidth value={form.budget} onChange={handleChange('budget')} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField size="small" label="PO Date" type="date" fullWidth InputLabelProps={{ shrink: true }} value={form.poDate} onChange={handleChange('poDate')} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField size="small" label="PO No." fullWidth value={form.poNumber} onChange={handleChange('poNumber')} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField size="small" label="Vendor" select fullWidth value={form.vendor} onChange={handleChange('vendor')} sx={fieldSx}>
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {vendorOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField size="small" label="วันที่ซื้อ" type="date" fullWidth InputLabelProps={{ shrink: true }} value={form.purchaseDate} onChange={handleChange('purchaseDate')} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField size="small" label="อายุ (ปี)" fullWidth value={assetAge} InputProps={{ readOnly: true }} helperText="คำนวณอัตโนมัติ" sx={fieldSx} />
                </Grid>
                <Grid item xs={12}>
                  <TextField size="small" label="หมายเหตุ" fullWidth multiline minRows={2} value={form.remark} onChange={handleChange('remark')} sx={fieldSx} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* รูปภาพทะเบียนทรัพย์สิน */}
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>รูปภาพทะเบียนทรัพย์สิน</SectionTitle>
              
              {imageError && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>{imageError}</Alert>
              )}

              <Grid container spacing={3}>
                <Grid item xs={12} md={5}>
                  {/* Image Preview */}
                  <Box
                    sx={{
                      width: '100%',
                      aspectRatio: '4/3',
                      borderRadius: 2,
                      border: '1px dashed',
                      borderColor: imagePreview ? 'transparent' : 'divider',
                      bgcolor: imagePreview ? 'transparent' : alpha(theme.palette.primary.main, 0.02),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {imagePreview ? (
                      <>
                        <img
                          src={imagePreview}
                          alt="Asset registration"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            display: 'flex',
                            gap: 0.5,
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => fileInputRef.current?.click()}
                            sx={{
                              bgcolor: 'background.paper',
                              boxShadow: 1,
                              '&:hover': { bgcolor: 'background.paper' },
                            }}
                          >
                            <CameraAltIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={handleImageDelete}
                            sx={{
                              bgcolor: 'background.paper',
                              boxShadow: 1,
                              color: 'error.main',
                              '&:hover': { bgcolor: 'background.paper' },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </>
                    ) : (
                      <Box
                        sx={{
                          textAlign: 'center',
                          p: 3,
                          cursor: 'pointer',
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                      >
                        <ImageIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          ลากรูปภาพมาวางที่นี่
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          หรือคลิกเพื่อเลือกไฟล์ (JPG, PNG, GIF สูงสุด 5MB)
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12} md={7}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />

                    <Button
                      variant="outlined"
                      startIcon={imageUploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploading || !id}
                      fullWidth
                      sx={{
                        borderRadius: 1,
                        py: 1.5,
                        textTransform: 'none',
                        fontWeight: 500,
                      }}
                    >
                      {imageUploading ? 'กำลังอัพโหลด...' : id ? 'อัพโหลดรูปภาพ' : 'บันทึกทรัพย์สินก่อนอัพโหลด'}
                    </Button>

                    <Box sx={{ p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        💡 คำแนะนำ
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        • ถ่ายรูปทะเบียนทรัพย์สินให้ชัดเจน อ่านข้อความได้
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        • รองรับไฟล์ JPG, PNG, GIF
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        • ขนาดไฟล์สูงสุด 5MB
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Sticky Footer */}
          <Box
            sx={{
              position: 'sticky',
              bottom: 0,
              zIndex: 10,
              bgcolor: 'background.default',
              py: 2,
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/assets')}
                sx={{ borderRadius: 1, textTransform: 'none', px: 2.5 }}
              >
                ยกเลิก
              </Button>
              <Button
                variant="contained"
                size="small"
                type="submit"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon sx={{ fontSize: 18 }} />}
                sx={{
                  borderRadius: 1,
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 3,
                  boxShadow: 'none',
                  '&:hover': { boxShadow: 'none' },
                }}
              >
                {loading ? 'กำลังบันทึก...' : id ? 'บันทึกการแก้ไข' : 'สร้างทรัพย์สิน'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
