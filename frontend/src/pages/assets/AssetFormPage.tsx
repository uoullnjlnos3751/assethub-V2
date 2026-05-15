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
} from '@mui/material';
import { assetAPI } from '../../services/api';

const initialData = {
  assetCode: '', serialNo: '', type: '', brand: '', model: '',
  cpu: '', cpuGeneration: '', ram: '', ramSlot1: '', ramSlot2: '', gpu: '',
  storage1: '', storage2: '', osType: 'Windows', osVersion: '',
  officeLicense: '', antivirusStatus: '', domainName: '',
  vendor: '', poNumber: '', poDate: '', prNumber: '', purchaseDate: '',
  ownerName: '', departmentId: '', location: '', floor: '',
  company: '', status: 'Available', remark: '',
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
  '& .MuiInputBase-root': { borderRadius: 1.5 },
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
          {title}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {children}
      </CardContent>
    </Card>
  );
}

export default function AssetFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [error, setError] = useState('');
  const [ownerOptions, setOwnerOptions] = useState<any[]>([]);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [vendorOptions, setVendorOptions] = useState<string[]>([]);
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
        status: a.status || 'Available',
        remark: a.remark || '',
      });
    }).finally(() => setFetching(false));
  }, [id]);

  useEffect(() => {
    assetAPI.typeOptions().then((res) => setTypeOptions(res.data || [])).catch(() => setTypeOptions([]));
    assetAPI.locationOptions().then((res) => setLocationOptions(res.data || [])).catch(() => setLocationOptions([]));
    assetAPI.vendorOptions().then((res) => setVendorOptions(res.data || [])).catch(() => setVendorOptions([]));
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
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight={700}>
          {id ? 'แก้ไขข้อมูลทรัพย์สิน' : 'เพิ่มทรัพย์สินใหม่'}
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={() => navigate('/assets')}>กลับ</Button>
          <Button variant="contained" type="submit" form="asset-form" disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'บันทึกข้อมูล'}
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box id="asset-form" component="form" onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          <SectionCard title="ข้อมูลทรัพย์สิน">
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField size="small" label="รหัสทรัพย์สิน *" fullWidth required value={form.assetCode} onChange={handleChange('assetCode')} sx={fieldSx} />
              </Grid>
              <Grid item xs={12} md={3}>
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
                <TextField size="small" label="Company" fullWidth value={form.company} onChange={handleChange('company')} sx={fieldSx} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField size="small" label="Domain Name" fullWidth value={form.domainName} onChange={handleChange('domainName')} sx={fieldSx} />
              </Grid>
            </Grid>
          </SectionCard>

          <SectionCard title="ผู้ถือครองและสถานที่">
            <Grid container spacing={2}>
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
                            {ownerLoading ? <CircularProgress color="inherit" size={18} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField size="small" label="แผนก" fullWidth value={form.departmentId} onChange={handleChange('departmentId')} sx={fieldSx} />
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
          </SectionCard>

          <Grid container spacing={2.5}>
            <Grid item xs={12} lg={5}>
              <SectionCard title="OS และ Software">
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField size="small" label="OS" select fullWidth value={form.osType} onChange={handleChange('osType')} sx={fieldSx}>
                      <MenuItem value="Windows">Windows</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField size="small" label="Windows" fullWidth value={form.osVersion} onChange={handleChange('osVersion')} sx={fieldSx} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField size="small" label="MS Office" fullWidth value={form.officeLicense} onChange={handleChange('officeLicense')} sx={fieldSx} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField size="small" label="Antivirus" fullWidth value={form.antivirusStatus} onChange={handleChange('antivirusStatus')} sx={fieldSx} />
                  </Grid>
                </Grid>
              </SectionCard>
            </Grid>

            <Grid item xs={12} lg={7}>
              <SectionCard title="Hardware">
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
              </SectionCard>
            </Grid>
          </Grid>

          <SectionCard title="ข้อมูลจัดซื้อ">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={2.4}>
                <TextField size="small" label="PR No." fullWidth value={form.prNumber} onChange={handleChange('prNumber')} sx={fieldSx} />
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
          </SectionCard>

          <Box sx={{ position: 'sticky', bottom: 0, zIndex: 1, bgcolor: 'background.default', py: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack direction="row" justifyContent="flex-end" spacing={1.25}>
              <Button variant="outlined" onClick={() => navigate('/assets')}>ยกเลิก</Button>
              <Button variant="contained" type="submit" disabled={loading}>
                {loading ? <CircularProgress size={22} color="inherit" /> : id ? 'บันทึก' : 'สร้าง'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
