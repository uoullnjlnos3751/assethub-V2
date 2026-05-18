import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { assetAPI } from '../../services/api';

const initialData = {
  assetCode: '', serialNo: '', type: '', brand: '', model: '',
  cpu: '', cpuGeneration: '', ram: '', ramSlot1: '', ramSlot2: '', gpu: '',
  storage1: '', storage2: '', osType: 'Windows', osVersion: '',
  officeLicense: '', antivirusStatus: '', domainName: '',
  vendor: '', poNumber: '', poDate: '', prNumber: '', purchaseDate: '',
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

export default function AssetFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [form, setForm] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [error, setError] = useState('');
  const [ownerOptions, setOwnerOptions] = useState<any[]>([]);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [vendorOptions, setVendorOptions] = useState<string[]>([]);
  const [osTypeOptions, setOsTypeOptions] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [domainOptions, setDomainOptions] = useState<string[]>([]);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [antivirusOptions, setAntivirusOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState(fallbackStatusOptions);

  const assetAge = useMemo(() => calculateAge(form.purchaseDate), [form.purchaseDate]);

  useEffect(() => {
    if (!id) return;
    assetAPI.get(parseInt(id)).then((res) => {
      const a = res.data;
      setForm({
        assetCode: a.assetCode || '',
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
    }).finally(() => setFetching(false));
  }, [id]);

  useEffect(() => {
    assetAPI.typeOptions().then((res) => setTypeOptions(res.data || [])).catch(() => setTypeOptions([]));
    assetAPI.locationOptions().then((res) => setLocationOptions(res.data || [])).catch(() => setLocationOptions([]));
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
    try {
      if (id) {
        await assetAPI.update(parseInt(id), form);
      } else {
        await assetAPI.create(form);
      }
      navigate('/assets');
    } catch (err: any) {
      setError(err.response?.data?.error || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

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
          {/* ข้อมูลทรัพย์สิน */}
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <SectionTitle>ข้อมูลทรัพย์สิน</SectionTitle>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField size="small" label="รหัสทรัพย์สิน *" fullWidth required value={form.assetCode} onChange={handleChange('assetCode')} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField size="small" label="Serial Number *" fullWidth required value={form.serialNo} onChange={handleChange('serialNo')} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField size="small" label="ประเภทอุปกรณ์" select fullWidth value={form.type} onChange={handleChange('type')} sx={fieldSx}>
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {typeOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
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

          {/* OS/Software และ Hardware */}
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
