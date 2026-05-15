import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
  Menu,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PageviewIcon from '@mui/icons-material/Pageview';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import TableViewIcon from '@mui/icons-material/TableView';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReturnIcon from '@mui/icons-material/AssignmentReturn';
import ExtensionIcon from '@mui/icons-material/Extension';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { assetAPI, borrowAPI } from '../../services/api';
import ExportAssetsButton from '../../components/ExportAssetsButton';
import ImportAssetsButton from '../../components/ImportAssetsButton';
import { useAuth } from '../../contexts/AuthContext';

type ColumnConfig = {
  field: string;
  label: string;
  visible: boolean;
};

const COLUMN_PREF_KEY = 'assethub.assetList.columns.v2';

const defaultColumnConfig: ColumnConfig[] = [
  { field: 'id', label: 'ID', visible: false },
  { field: 'assetCode', label: 'รหัสทรัพย์สิน', visible: true },
  { field: 'serialNo', label: 'Serial No.', visible: true },
  { field: 'type', label: 'ประเภท', visible: true },
  { field: 'brand', label: 'ยี่ห้อ', visible: true },
  { field: 'model', label: 'รุ่น', visible: true },
  { field: 'company', label: 'Company', visible: true },
  { field: 'ownerName', label: 'ผู้ถือครอง', visible: true },
  { field: 'departmentId', label: 'แผนก', visible: true },
  { field: 'location', label: 'Location', visible: true },
  { field: 'floor', label: 'Floor', visible: true },
  { field: 'status', label: 'สถานะ', visible: true },
  { field: 'domainName', label: 'Domain Name', visible: false },
  { field: 'osType', label: 'OS', visible: false },
   { field: 'osVersion', label: 'Windows', visible: false },
   { field: 'windowsLicense', label: 'Windows License', visible: false },

  { field: 'officeLicense', label: 'MS Office', visible: false },
  { field: 'antivirusStatus', label: 'Antivirus', visible: false },
  { field: 'cpu', label: 'CPU', visible: true },
  { field: 'cpuGeneration', label: 'Generation', visible: true },
  { field: 'gpu', label: 'GPU', visible: true },
  { field: 'ram', label: 'RAM', visible: false },
  { field: 'ramDetail', label: 'RAM Detail', visible: false },
  { field: 'ramSlot1', label: 'RAM Slot1', visible: false },
  { field: 'ramSlot2', label: 'RAM Slot2', visible: false },
  { field: 'storage1', label: 'Storage 1', visible: false },
  { field: 'storage2', label: 'Storage 2', visible: false },
  { field: 'snComputer', label: 'S/N Computer', visible: false },
  { field: 'prNumber', label: 'PR No.', visible: false },
  { field: 'poDate', label: 'PO Date', visible: false },
  { field: 'poNumber', label: 'PO No.', visible: false },
  { field: 'vendor', label: 'Vendor', visible: false },
  { field: 'purchaseDate', label: 'วันที่ซื้อ', visible: false },
  { field: 'age', label: 'อายุ (ปี)', visible: false },
  { field: 'remark', label: 'หมายเหตุ', visible: false },
  { field: 'createdAt', label: 'วันที่สร้าง', visible: false },
  { field: 'updatedAt', label: 'วันที่แก้ไขล่าสุด', visible: false },
];

const statusLabels: Record<string, string> = {
  Available: 'พร้อมใช้งาน',
  Borrowed: 'กำลังยืม',
  InUse: 'ใช้งานประจำ',
  Maintenance: 'ซ่อมบำรุง',
  Retired: 'ปลดระวาง',
  Lost: 'สูญหาย',
};

const chipStyles = {
  Available: { bg: '#D1FAE5', dot: '#059669', text: '#059669' },
  Borrowed: { bg: '#FEF3C7', dot: '#D97706', text: '#D97706' },
  InUse: { bg: '#DBEAFE', dot: '#2563EB', text: '#2563EB' },
  Maintenance: { bg: '#FEE2E2', dot: '#DC2626', text: '#DC2626' },
  Retired: { bg: '#F3F4F6', dot: '#9CA3AF', text: '#6B7280' },
  Lost: { bg: '#FEE2E2', dot: '#991B1B', text: '#991B1B' },
};

function StatusChip({ status }: { status: string }) {
  const style = chipStyles[status as keyof typeof chipStyles] || chipStyles.Retired;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: style.dot, flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: style.text }}>
        {statusLabels[status] || status}
      </Typography>
    </Box>
  );
}

const columnDefaultsByField = new Map(defaultColumnConfig.map((config) => [config.field, config]));

const formatDate = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('th-TH');
};

const formatDateTime = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('th-TH');
};

const loadColumnConfig = () => {
  try {
    const saved = localStorage.getItem(COLUMN_PREF_KEY);
    if (!saved) return defaultColumnConfig;
    const parsed = JSON.parse(saved) as ColumnConfig[];
    const known = new Set(defaultColumnConfig.map((c) => c.field));
    const savedFields = new Set(parsed.map((c) => c.field));
    const orderedSaved = parsed
      .filter((c) => known.has(c.field))
      .map((c) => ({ ...columnDefaultsByField.get(c.field)!, visible: c.visible }));
    const missing = defaultColumnConfig.filter((c) => !savedFields.has(c.field));
    return [...orderedSaved, ...missing];
  } catch {
    return defaultColumnConfig;
  }
};

export default function AssetListPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [assets, setAssets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [type, setType] = useState('');
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(loadColumnConfig);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ element: null | HTMLElement; row: any }>({ element: null, row: null });
  const [myBorrowedItems, setMyBorrowedItems] = useState<any[]>([]);
  const [extendDialog, setExtendDialog] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [extendDays, setExtendDays] = useState(3);
  const navigate = useNavigate();

  const isAdmin = user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN';
  const isAvailableOnlyView = searchParams.get('status') === 'Available';

  useEffect(() => {
    const s = searchParams.get('status');
    if (s !== null) setStatus(s);
    else setStatus('');
  }, [searchParams]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await assetAPI.list({
        search,
        status: status || undefined,
        type: type || undefined,
        page: page + 1,
        limit: pageSize,
      });
      setAssets(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssets(); }, [page, pageSize, status, type]);

  useEffect(() => {
    assetAPI.typeOptions()
      .then((res) => setTypeOptions(res.data || []))
      .catch(() => setTypeOptions([]));
  }, []);

  useEffect(() => {
    localStorage.setItem(COLUMN_PREF_KEY, JSON.stringify(columnConfig));
  }, [columnConfig]);

  const handleSearch = () => { setPage(0); fetchAssets(); };

  useEffect(() => {
    if (isAvailableOnlyView && user?.role === 'USER') {
      borrowAPI.myItems()
        .then((res) => setMyBorrowedItems(res.data.data || res.data || []))
        .catch(() => {});
    }
  }, [isAvailableOnlyView, user]);

  const handleExtendSubmit = async () => {
    if (!extendDialog.item) return;
    try {
      await borrowAPI.createExtension({
        requestId: extendDialog.item.requestId,
        itemIds: [extendDialog.item.id],
        extraDays: extendDays,
      });
      setExtendDialog({ open: false, item: null });
    } catch (err: any) {
      alert(err.response?.data?.error || 'ไม่สามารถขยายวันได้');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('ต้องการลบทรัพย์สินนี้ใช่หรือไม่?')) {
      try {
        await assetAPI.delete(id);
        fetchAssets();
      } catch (err) {
        alert('ไม่สามารถลบทรัพย์สินได้');
      }
    }
  };

  const textColumn = (field: string, headerName: string, width = 140): GridColDef => ({
    field,
    headerName,
    width,
  });

  const columnMap = useMemo<Record<string, GridColDef>>(() => ({
    id: textColumn('id', 'ID', 90),
    assetCode: textColumn('assetCode', 'รหัสทรัพย์สิน', 140),
    serialNo: textColumn('serialNo', 'Serial No.', 140),
    type: textColumn('type', 'ประเภท', 120),
    brand: textColumn('brand', 'ยี่ห้อ', 120),
    model: textColumn('model', 'รุ่น', 150),
    cpu: textColumn('cpu', 'CPU', 130),
    cpuGeneration: textColumn('cpuGeneration', 'Generation', 120),
    ram: textColumn('ram', 'RAM', 110),
    ramDetail: textColumn('ramDetail', 'RAM Detail', 150),
    ramSlot1: textColumn('ramSlot1', 'RAM Slot1', 130),
    ramSlot2: textColumn('ramSlot2', 'RAM Slot2', 130),
    storage1: textColumn('storage1', 'Storage 1', 130),
    storage2: textColumn('storage2', 'Storage 2', 130),
    osType: textColumn('osType', 'OS', 110),
    snComputer: textColumn('snComputer', 'S/N Computer', 150),
    osVersion: textColumn('osVersion', 'Windows', 160),
    windowsLicense: textColumn('windowsLicense', 'Windows License', 160),
    officeLicense: textColumn('officeLicense', 'MS Office', 150),
    antivirusStatus: textColumn('antivirusStatus', 'Antivirus', 140),
    domainName: textColumn('domainName', 'Domain Name', 150),
    vendor: textColumn('vendor', 'Vendor', 150),
    poNumber: textColumn('poNumber', 'PO No.', 130),
    poDate: {
      ...textColumn('poDate', 'PO Date', 130),
      renderCell: ({ value }) => formatDate(value),
    },
    prNumber: textColumn('prNumber', 'PR No.', 130),
    purchaseDate: {
      ...textColumn('purchaseDate', 'วันที่ซื้อ', 130),
      renderCell: ({ value }) => formatDate(value),
    },
    age: textColumn('age', 'อายุ (ปี)', 110),
    ownerName: textColumn('ownerName', 'ผู้ถือครอง', 170),
    departmentId: textColumn('departmentId', 'แผนก', 130),
    location: textColumn('location', 'Location', 120),
    floor: textColumn('floor', 'Floor', 90),
    company: textColumn('company', 'Company', 130),
    status: {
      field: 'status',
      headerName: 'สถานะ',
      width: 140,
      renderCell: ({ value }) => <StatusChip status={value} />,
    },
    remark: textColumn('remark', 'หมายเหตุ', 220),
    createdAt: {
      ...textColumn('createdAt', 'วันที่สร้าง', 170),
      renderCell: ({ value }) => formatDateTime(value),
    },
    updatedAt: {
      ...textColumn('updatedAt', 'วันที่แก้ไขล่าสุด', 170),
      renderCell: ({ value }) => formatDateTime(value),
    },
  }), []);

  const columns = useMemo<GridColDef[]>(() => {
    const selectedColumns = columnConfig
      .filter((config) => config.visible)
      .map((config) => columnMap[config.field])
      .filter(Boolean);

    return [
      ...selectedColumns,
      {
        field: 'actions',
        headerName: 'จัดการ',
        width: 200,
        sortable: false,
        renderCell: ({ row }) => {
          const role = user?.role;
          
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Primary Action based on Role */}
              {role === 'USER' ? (
                row.status === 'Available' ? (
                  <Button 
                    variant="contained" 
                    size="small" 
                    color="primary" 
                    onClick={() => navigate(`/borrow/new?assetId=${row.id}`)}
                    sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                  >
                    ยืมอุปกรณ์
                  </Button>
                ) : (
                  <Chip label={row.status === 'Borrowed' ? 'กำลังถูกยืม' : 'ไม่พร้อมให้ยืม'} size="small" variant="outlined" />
                )
              ) : (
                <Tooltip title="ดูรายละเอียด">
                  <IconButton size="small" onClick={() => navigate(`/assets/${row.id}`)} color="primary">
                    <PageviewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              {/* Secondary Actions (More Menu) */}
              <IconButton 
                size="small" 
                onClick={(e) => handleMenuOpen(e, row)}
                sx={{ color: 'text.secondary' }}
              >
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>More</Typography>
              </IconButton>
            </Box>
          );
        },
      },
    ];
  }, [columnConfig, columnMap, navigate, isAdmin]);

  const visibleCount = columnConfig.filter((config) => config.visible).length;

  const toggleColumn = (field: string) => {
    setColumnConfig((current) => current.map((config) => {
      if (config.field !== field) return config;
      if (config.visible && visibleCount <= 1) return config;
      return { ...config, visible: !config.visible };
    }));
  };

  const moveColumn = (field: string, direction: 'up' | 'down') => {
    setColumnConfig((current) => {
      const index = current.findIndex((config) => config.field === field);
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const resetColumns = () => setColumnConfig(defaultColumnConfig);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, row: any) => {
    setMenuAnchor({ element: event.currentTarget, row });
  };

  const handleMenuClose = () => {
    setMenuAnchor({ element: null, row: null });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4" fontWeight={600}>
          {isAvailableOnlyView ? 'รายการอุปกรณ์พร้อมยืม' : 'ทะเบียนทรัพย์สิน'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {isAdmin && <ImportAssetsButton />}
          {isAdmin && <ExportAssetsButton />}
          {isAdmin && <Button variant="outlined" startIcon={<TableViewIcon />} onClick={() => setColumnDialogOpen(true)}>จัดคอลัมน์</Button>}
          {isAdmin && <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/assets/new')}>เพิ่มทรัพย์สิน</Button>}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField label="ค้นหา" size="small" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} sx={{ minWidth: 300 }} />
        {!isAvailableOnlyView && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>สถานะ</InputLabel>
            <Select value={status} label="สถานะ" onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
              <MenuItem value="">ทั้งหมด</MenuItem>
              <MenuItem value="Available">พร้อมใช้งาน</MenuItem>
              <MenuItem value="Borrowed">กำลังยืม</MenuItem>
              <MenuItem value="InUse">ใช้งานประจำ</MenuItem>
              <MenuItem value="Maintenance">ซ่อมบำรุง</MenuItem>
              <MenuItem value="Retired">ปลดระวาง</MenuItem>
              <MenuItem value="Lost">สูญหาย</MenuItem>
            </Select>
          </FormControl>
        )}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>ประเภท</InputLabel>
          <Select value={type} label="ประเภท" onChange={(e) => { setType(e.target.value); setPage(0); }}>
            <MenuItem value="">ทั้งหมด</MenuItem>
            {typeOptions.map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={handleSearch}>ค้นหา</Button>
      </Box>

      {/* Borrowed Items Section — for user available-view */}
      {isAvailableOnlyView && myBorrowedItems.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>รายการที่กำลังยืม</Typography>
            <Chip label={`${myBorrowedItems.length} รายการ`} size="small" color="warning" />
          </Box>
          <Grid container spacing={2}>
            {myBorrowedItems.map((item: any) => {
              const isOverdue = new Date(item.dueDate) < new Date();
              return (
                <Grid item xs={12} sm={6} lg={4} key={item.id}>
                  <Card sx={{
                    height: '100%', display: 'flex', flexDirection: 'column',
                    borderLeft: `4px solid ${isOverdue ? '#ef4444' : '#10b981'}`,
                  }}>
                    <CardContent sx={{ flex: 1, pb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                        <Box>
                          <Typography fontWeight={700}>{item.assetCode}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.brand} {item.model}</Typography>
                        </Box>
                        <Chip label={isOverdue ? 'เกินกำหนด' : 'กำลังยืม'} size="small" color={isOverdue ? 'error' : 'success'} />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Box><Typography variant="caption" color="text.secondary">วันที่ยืม</Typography><Typography variant="body2" fontWeight={600}>{new Date(item.borrowDate).toLocaleDateString('th-TH')}</Typography></Box>
                        <Box><Typography variant="caption" color="text.secondary">กำหนดคืน</Typography><Typography variant="body2" fontWeight={600} color={isOverdue ? 'error' : 'inherit'}>{new Date(item.dueDate).toLocaleDateString('th-TH')}</Typography></Box>
                      </Box>
                    </CardContent>
                    <Divider />
                    <Box sx={{ display: 'flex', gap: 0.5, p: 1 }}>
                      <Button size="small" variant="outlined" startIcon={<PageviewIcon />} onClick={() => navigate(`/assets/${item.assetId}`)} sx={{ flex: 1, fontSize: '0.7rem' }}>ดูรายละเอียด</Button>
                      <Button size="small" variant="outlined" color="warning" startIcon={<ExtensionIcon />} onClick={() => { setExtendDialog({ open: true, item }); setExtendDays(3); }} sx={{ flex: 1, fontSize: '0.7rem' }}>ขยายวัน</Button>
                      <Button size="small" variant="contained" color="error" startIcon={<ReturnIcon />} onClick={() => navigate(`/borrow/return?itemId=${item.id}`)} sx={{ flex: 1, fontSize: '0.7rem' }}>รับคืน</Button>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Extend Dialog */}
      <Dialog open={extendDialog.open} onClose={() => setExtendDialog({ open: false, item: null })} maxWidth="xs" fullWidth>
        <DialogTitle>ขยายวันยืม</DialogTitle>
        <DialogContent dividers>
          {extendDialog.item && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>{extendDialog.item.assetCode}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>กำหนดคืนปัจจุบัน: {new Date(extendDialog.item.dueDate).toLocaleDateString('th-TH')}</Typography>
              <TextField type="number" label="จำนวนวันที่ต้องการขยาย" fullWidth value={extendDays} onChange={(e) => setExtendDays(parseInt(e.target.value) || 1)} inputProps={{ min: 1, max: 30 }} sx={{ mt: 2 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                วันสิ้นสุดใหม่: {new Date(new Date(extendDialog.item.dueDate).getTime() + extendDays * 86400000).toLocaleDateString('th-TH')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExtendDialog({ open: false, item: null })}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleExtendSubmit}>ยืนยัน</Button>
        </DialogActions>
      </Dialog>

      {isAvailableOnlyView && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>อุปกรณ์พร้อมให้ยืม</Typography>
          <Chip label={`${total} รายการ`} size="small" color="success" />
        </Box>
      )}

      {isAvailableOnlyView && user?.role === 'USER' ? (
        <Grid container spacing={2}>
          {assets.map((asset) => (
            <Grid item xs={12} sm={6} lg={4} key={asset.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'visible' }}>
                {/* Top accent bar */}
                <Box sx={{ height: 4, bgcolor: '#FF6B00', borderRadius: '8px 8px 0 0' }} />
                <CardContent sx={{ flex: 1, p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1.5 }}>
                    <Box>
                      <Typography fontWeight={800} fontSize="1.05rem" color="#111827">{asset.assetCode}</Typography>
                      <Typography variant="caption" color="#6B7280">{asset.brand} {asset.model}</Typography>
                    </Box>
                    <StatusChip status={asset.status} />
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                    <Box sx={{ flex: '1 0 45%' }}>
                      <Typography variant="caption" color="#9CA3AF" fontWeight={600}>Serial</Typography>
                      <Typography variant="body2" fontWeight={600} color="#374151">{asset.serialNo}</Typography>
                    </Box>
                    {asset.cpu && <Box sx={{ flex: '1 0 45%' }}>
                      <Typography variant="caption" color="#9CA3AF" fontWeight={600}>CPU</Typography>
                      <Typography variant="body2" fontWeight={600} color="#374151">{asset.cpu}</Typography>
                    </Box>}
                    {asset.ram && <Box sx={{ flex: '1 0 45%' }}>
                      <Typography variant="caption" color="#9CA3AF" fontWeight={600}>RAM</Typography>
                      <Typography variant="body2" fontWeight={600} color="#374151">{asset.ram}</Typography>
                    </Box>}
                    {asset.storage1 && <Box sx={{ flex: '1 0 45%' }}>
                      <Typography variant="caption" color="#9CA3AF" fontWeight={600}>Storage</Typography>
                      <Typography variant="body2" fontWeight={600} color="#374151">{asset.storage1}</Typography>
                    </Box>}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 0.5, borderTop: '1px solid #F0E6DE' }}>
                    <Typography variant="caption" color="#6B7280">ผู้ถือครอง:</Typography>
                    <Typography variant="caption" fontWeight={600} color="#374151">{asset.ownerName || '-'}</Typography>
                  </Box>
                </CardContent>
                <Box sx={{ p: 1.5, pt: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={() => navigate(`/borrow/new?assetId=${asset.id}`)}
                    sx={{ borderRadius: 1, py: 1.2, fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(255,107,0,0.25)' }}
                  >
                    ขอยืม
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <DataGrid
        rows={assets}
        columns={columns}
        loading={loading}
        rowCount={total}
        pageSizeOptions={[25, 50, 100]}
        paginationMode="server"
        paginationModel={{ page, pageSize }}
        onPaginationModelChange={(m) => { setPage(m.page); setPageSize(m.pageSize); }}
        getRowId={(r) => r.id}
        autoHeight
        disableRowSelectionOnClick
      />
      )}

      <Dialog open={columnDialogOpen} onClose={() => setColumnDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>จัดคอลัมน์ที่แสดง</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            เลือกหัวข้อจากข้อมูล Asset ทั้งหมดในฐานข้อมูล และใช้ปุ่มลูกศรเพื่อสลับตำแหน่งคอลัมน์
          </Typography>
          <List dense disablePadding>
            {columnConfig.map((config, index) => (
              <ListItem
                key={config.field}
                divider
                secondaryAction={(
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="เลื่อนขึ้น">
                      <span>
                        <IconButton size="small" onClick={() => moveColumn(config.field, 'up')} disabled={index === 0}>
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="เลื่อนลง">
                      <span>
                        <IconButton size="small" onClick={() => moveColumn(config.field, 'down')} disabled={index === columnConfig.length - 1}>
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                )}
              >
                <Checkbox
                  edge="start"
                  checked={config.visible}
                  onChange={() => toggleColumn(config.field)}
                  disabled={config.visible && visibleCount <= 1}
                />
                <ListItemText primary={config.label} secondary={config.visible ? 'แสดงในตาราง' : 'ซ่อนจากตาราง'} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
          <Button startIcon={<RestartAltIcon />} onClick={resetColumns}>คืนค่าเริ่มต้น</Button>
          <Button variant="contained" onClick={() => setColumnDialogOpen(false)}>เสร็จสิ้น</Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={menuAnchor.element}
        open={Boolean(menuAnchor.element)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 160, mt: 1, boxShadow: 3 }
        }}
      >
        {menuAnchor.row && (
          <>
            {/* USER view on Available page — friendly actions */}
            {user?.role === 'USER' && isAvailableOnlyView && (
              <>
                <MenuItem onClick={() => { handleMenuClose(); navigate(`/assets/${menuAnchor.row.id}`); }}>
                  <PageviewIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} /> ดูรายละเอียด
                </MenuItem>
                {menuAnchor.row.status === 'Available' && (
                  <MenuItem onClick={() => { handleMenuClose(); navigate(`/borrow/new?assetId=${menuAnchor.row.id}`); }}>
                    <ShoppingCartIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} /> ยืมอุปกรณ์
                  </MenuItem>
                )}
              </>
            )}
            {/* Admin Actions — only on non-user pages */}
            {(user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN') && !isAvailableOnlyView && (
              <>
                <MenuItem onClick={() => { handleMenuClose(); navigate(`/assets/${menuAnchor.row.id}`); }}>
                  <PageviewIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} /> ดูรายละเอียด
                </MenuItem>
                <MenuItem onClick={() => { handleMenuClose(); navigate(`/assets/${menuAnchor.row.id}/edit`); }}>
                  <EditIcon fontSize="small" sx={{ mr: 1, color: 'info.main' }} /> แก้ไขข้อมูล
                </MenuItem>
                <MenuItem onClick={() => { handleMenuClose(); navigate(`/pm/run?assetId=${menuAnchor.row.id}`); }}>
                  <SettingsIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} /> จัดการ PM
                </MenuItem>
                {user?.role === 'IT_ADMIN' && (
                  <MenuItem onClick={() => { handleMenuClose(); navigate(`/borrow/checkout?assetId=${menuAnchor.row.id}`); }}>
                    <ShoppingCartIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} /> ส่งมอบ/Check-out
                  </MenuItem>
                )}
                {user?.role === 'SUPERADMIN' && (
                  <MenuItem onClick={() => { handleMenuClose(); handleDelete(menuAnchor.row.id); }} sx={{ color: 'error.main' }}>
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> ลบทรัพย์สิน
                  </MenuItem>
                )}
              </>
            )}
          </>
        )}
      </Menu>
    </Box>
  );
}
