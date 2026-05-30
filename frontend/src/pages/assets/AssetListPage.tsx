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
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Menu,
  alpha,
  useTheme,
  useMediaQuery,
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
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ImageIcon from '@mui/icons-material/Image';
import ImageOffIcon from '@mui/icons-material/ImageNotSupported';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { WarningAmber as WarningAmberIcon, Verified as VerifiedIcon } from '@mui/icons-material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ComputerIcon from '@mui/icons-material/Computer';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import DevicesIcon from '@mui/icons-material/Devices';
import PrintIcon from '@mui/icons-material/Print';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import RouterIcon from '@mui/icons-material/Router';
import HandymanIcon from '@mui/icons-material/Handyman';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { assetAPI, borrowAPI, categoryAPI } from '../../services/api';
import ExportAssetsButton from '../../components/ExportAssetsButton';
import ImportAssetsButton from '../../components/ImportAssetsButton';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import StatusChip from '../../components/StatusChip';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import EmptyState from '../../components/EmptyState';

type ColumnConfig = {
  field: string;
  label: string;
  visible: boolean;
};

const COLUMN_PREF_KEY = 'assethub.assetList.columns.v3';

const defaultColumnConfig: ColumnConfig[] = [
  { field: 'hasImage', label: '📷', visible: true },
  { field: 'assetName', label: 'ชื่อทรัพย์สิน', visible: true },
  { field: 'serialNo', label: 'Serial No.', visible: true },
  { field: 'type', label: 'ประเภท', visible: true },
  { field: 'brand', label: 'ยี่ห้อ', visible: true },
  { field: 'model', label: 'รุ่น', visible: true },
  { field: 'status', label: 'สถานะ', visible: true },
  { field: 'ownerName', label: 'ผู้ถือครอง', visible: true },
  { field: 'departmentId', label: 'แผนก', visible: true },
  { field: 'location', label: 'สถานที่ติดตั้ง/อาคาร', visible: true },
  { field: 'floor', label: 'ชั้น', visible: true },
  { field: 'id', label: 'ID', visible: false },
  { field: 'assetCode', label: 'เลขครุภัณฑ์', visible: false },
  { field: 'company', label: 'Company', visible: false },
  { field: 'oldAssetCode', label: 'รหัสทรัพย์สินเดิม', visible: false },
  { field: 'domainName', label: 'Domain Name', visible: false },
  { field: 'osType', label: 'OS', visible: false },
  { field: 'osVersion', label: 'Windows Version', visible: false },
  { field: 'windowsLicense', label: 'Windows License', visible: false },
  { field: 'officeLicense', label: 'MS Office', visible: false },
  { field: 'antivirusStatus', label: 'Antivirus', visible: false },
  { field: 'cpu', label: 'CPU', visible: false },
  { field: 'cpuGeneration', label: 'Generation', visible: false },
  { field: 'gpu', label: 'GPU', visible: false },
  { field: 'ram', label: 'RAM', visible: false },
  { field: 'ramDetail', label: 'RAM Detail', visible: false },
  { field: 'ramSlot1', label: 'RAM Slot1', visible: false },
  { field: 'ramSlot2', label: 'RAM Slot2', visible: false },
  { field: 'storage1', label: 'Storage 1', visible: false },
  { field: 'storage2', label: 'Storage 2', visible: false },
  { field: 'snComputer', label: 'S/N Computer', visible: false },
  { field: 'budget', label: 'งบประมาณ', visible: false },
  { field: 'prNumber', label: 'PR No.', visible: false },
  { field: 'poDate', label: 'PO Date', visible: false },
  { field: 'poNumber', label: 'PO No.', visible: false },
  { field: 'vendor', label: 'Vendor', visible: false },
  { field: 'purchaseDate', label: 'วันที่จัดซื้อ', visible: false },
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

const columnDefaultsByField = new Map(defaultColumnConfig.map((config) => [config.field, config]));

const typeGroupLabels: Record<string, string> = {
  computers: 'คอมพิวเตอร์',
  monitors: 'จอภาพ',
  devices: 'อุปกรณ์ต่อพ่วง',
  printers: 'เครื่องพิมพ์',
  phonesTablets: 'อุปกรณ์สื่อสาร',
  network: 'อุปกรณ์เครือข่าย',
  rack: 'Rack & Infrastructure',
};

const typeGroupIcons: Record<string, React.ReactNode> = {
  computers: <ComputerIcon />,
  monitors: <DesktopWindowsIcon />,
  devices: <DevicesIcon />,
  printers: <PrintIcon />,
  phonesTablets: <PhoneAndroidIcon />,
  network: <RouterIcon />,
  rack: <HandymanIcon />,
};

const typeGroupDescriptions: Record<string, string> = {
  computers: 'คอมพิวเตอร์ตั้งโต๊ะ โน๊ตบุ๊ค และอุปกรณ์ประมวลผล',
  monitors: 'จอภาพทุกประเภทสำหรับการทำงาน',
  devices: 'อุปกรณ์ต่อพ่วง เมาส์ คีย์บอร์ด เว็บแคม ไมค์ ลำโพง',
  printers: 'เครื่องพิมพ์ทุกประเภท',
  phonesTablets: 'สมาร์ทโฟน แท็บเล็ต และอุปกรณ์สื่อสาร',
  network: 'อุปกรณ์เครือข่าย สวิตช์ เราเตอร์ ไฟร์วอลล์',
  rack: 'แร็คเซิร์ฟเวอร์ PDU UPS และโครงสร้างพื้นฐาน',
};

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
  const toast = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchParams] = useSearchParams();
  const [assets, setAssets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const typeGroup = searchParams.get('typeGroup') || '';
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [company, setCompany] = useState(searchParams.get('company') || '');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(loadColumnConfig);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ element: null | HTMLElement; row: any }>({ element: null, row: null });
  const [myBorrowedItems, setMyBorrowedItems] = useState<any[]>([]);
  const [extendDialog, setExtendDialog] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [extendDays, setExtendDays] = useState(3);
  const [extendReason, setExtendReason] = useState('');
  const [categoryStats, setCategoryStats] = useState<{ total: number; byStatus: { status: string; _count: number }[] } | null>(null);
  const navigate = useNavigate();
  const isAdmin = user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN';
  const isAvailableOnlyView = !typeGroup && user?.role === 'USER';

  useEffect(() => {
    categoryAPI.all().then((res) => setCategories(res.data)).catch(() => setCategories([]));
    assetAPI.typeOptions().then((res) => setTypeOptions(res.data)).catch(() => setTypeOptions([]));
    assetAPI.companyOptions().then((res) => setCompanyOptions(res.data)).catch(() => setCompanyOptions([]));
  }, []);

  // Fetch overall status stats for the stat cards
  useEffect(() => {
    if (!isAvailableOnlyView) {
      assetAPI.stats(typeGroup || '').then((res) => setCategoryStats(res.data)).catch(() => {});
    }
  }, [typeGroup, isAvailableOnlyView]);


  useEffect(() => {
    localStorage.setItem(COLUMN_PREF_KEY, JSON.stringify(columnConfig));
  }, [columnConfig]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await assetAPI.list({
        search,
        status: status || undefined,
        type: type || undefined,
        typeGroup: !type && typeGroup ? typeGroup : undefined,
        categoryId: selectedCategoryId || undefined,
        company: company || undefined,
        page: page + 1,
        limit: pageSize,
      });
      setAssets(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  const groupedAssets = useMemo(() => {
    const groups: Record<string, { name: string; icon?: React.ReactNode; assets: any[] }> = {};
    const filteredAssets = selectedCategoryId 
      ? assets.filter(a => a.categoryId === selectedCategoryId)
      : assets;

    filteredAssets.forEach(asset => {
      const cat = asset.category;
      const catName = cat?.name || 'อื่นๆ';
      if (!groups[catName]) {
        groups[catName] = { name: catName, icon: cat?.icon, assets: [] };
      }
      groups[catName].assets.push(asset);
    });
    return groups;
  }, [assets, selectedCategoryId]);

  useEffect(() => { fetchAssets(); }, [page, pageSize, status, type, typeGroup, selectedCategoryId, company]);

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
        reason: extendReason || 'ต้องการขยายวันยืม',
      });
      toast.success('ส่งคำขอขยายวันเรียบร้อย รอ IT Admin อนุมัติ');
      setExtendDialog({ open: false, item: null });
      setExtendReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'ไม่สามารถขยายวันได้');
    }
  };


  const handleDelete = async (id: number) => {
    if (window.confirm('ต้องการลบทรัพย์สินนี้ใช่หรือไม่?')) {
      try {
        await assetAPI.delete(id);
        toast.success('ลบทรัพย์สินเรียบร้อย');
        fetchAssets();
      } catch (err) {
        toast.error('ไม่สามารถลบทรัพย์สินได้');
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
    hasImage: {
      field: 'hasImage',
      headerName: '📷',
      width: 50,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          {row.image ? (
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.success.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.palette.success.main,
              }}
            >
              <ImageIcon fontSize="small" sx={{ fontSize: 16 }} />
            </Box>
          ) : (
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.grey[500], 0.08),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.palette.grey[400],
              }}
            >
              <ImageOffIcon fontSize="small" sx={{ fontSize: 16 }} />
            </Box>
          )}
        </Box>
      ),
    },
    assetCode: textColumn('assetCode', 'เลขครุภัณฑ์', 140),
    assetName: textColumn('assetName', 'ชื่อทรัพย์สิน', 180),
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
    location: textColumn('location', 'สถานที่ติดตั้ง/อาคาร', 160),
    floor: textColumn('floor', 'ชั้น', 90),
    company: textColumn('company', 'บริษัท', 130),
    oldAssetCode: textColumn('oldAssetCode', 'Computer Name เดิม', 150),
    gpu: textColumn('gpu', 'GPU', 120),
    budget: textColumn('budget', 'งบประมาณ', 130),
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {isAvailableOnlyView ? 'รายการอุปกรณ์พร้อมยืม' : typeGroupLabels[typeGroup] || 'ทะเบียนทรัพย์สิน'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {isAvailableOnlyView ? 'เลือกอุปกรณ์ที่ต้องการยืม' : `ทั้งหมด ${total} รายการ`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: isMobile ? 2 : 0, width: isMobile ? '100%' : 'auto' }}>
          {isAdmin && (
            <IconButton onClick={(e) => handleMenuOpen(e, { isHeaderMenu: true })} sx={{ display: { xs: 'flex', sm: 'none' }, ml: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <SettingsIcon />
            </IconButton>
          )}
          {isAdmin && <Box sx={{ display: { xs: 'none', sm: 'block' } }}><ImportAssetsButton /></Box>}
          {isAdmin && <Box sx={{ display: { xs: 'none', sm: 'block' } }}><ExportAssetsButton /></Box>}
          {isAdmin && <Button variant="outlined" startIcon={<TableViewIcon />} sx={{ display: { xs: 'none', sm: 'flex' } }} onClick={() => setColumnDialogOpen(true)}>จัดคอลัมน์</Button>}
          {isAdmin && <Button variant="contained" startIcon={<AddIcon />} sx={{ flex: isMobile ? 1 : 'none' }} onClick={() => navigate('/assets/new' + (typeGroup ? `?typeGroup=${typeGroup}` : ''))}>เพิ่มทรัพย์สิน</Button>}
        </Box>
      </Box>

      {/* ── Stat Cards — shown for admin views only ── */}
      {!isAvailableOnlyView && (
        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
          {[
            { label: 'ทั้งหมด',      value: total,  color: '#6366F1', bg: alpha('#6366F1', 0.1), dot: '#6366F1', statusKey: '' },
            { label: 'พร้อมใช้งาน', value: null,   color: '#059669', bg: alpha('#10B981', 0.1), dot: '#10B981', statusKey: 'Available' },
            { label: 'ใช้งานประจำ', value: null,   color: '#2563EB', bg: alpha('#3B82F6', 0.1), dot: '#3B82F6', statusKey: 'InUse' },
            { label: 'ซ่อมบำรุง',   value: null,   color: '#d97706', bg: alpha('#f59e0b', 0.1), dot: '#f59e0b', statusKey: 'Maintenance' },
            { label: 'ปลดระวาง',    value: null,   color: '#6b7280', bg: alpha('#9ca3af', 0.1), dot: '#9ca3af', statusKey: 'Retired' },
          ].map((s) => {
            const count =
              s.statusKey === ''
                ? total
                : (categoryStats?.byStatus.find((b) => b.status === s.statusKey)?._count ?? '—');
            const isActive = s.statusKey === '' ? status === '' : status === s.statusKey;
            return (
              <Card
                key={s.label}
                onClick={() => { setStatus(s.statusKey); setPage(0); }}
                sx={{
                  flex: '1 1 auto', minWidth: 110, cursor: 'pointer',
                  border: '1px solid',
                  borderColor: isActive ? s.dot : 'divider',
                  bgcolor: isActive ? s.bg : 'background.paper',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: s.dot, bgcolor: s.bg },
                }}
              >
                <CardContent sx={{ py: '12px !important', px: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.dot, flexShrink: 0 }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={500} noWrap>{s.label}</Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={700} sx={{ color: s.color, lineHeight: 1.2 }}>
                    {typeof count === 'number' ? count.toLocaleString() : count}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      <Card sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="ค้นหาเลขครุภัณฑ์ ชื่อ S/N ยี่ห้อ..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ minWidth: 280, width: isMobile ? '100%' : 'auto', flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 180, width: isMobile ? '100%' : 'auto' }}>
            <InputLabel>ประเภท</InputLabel>
            <Select value={type} label="ประเภท" onChange={(e) => { setType(e.target.value); setPage(0); }}>
              <MenuItem value="">ทั้งหมด</MenuItem>
              {typeOptions.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180, width: isMobile ? '100%' : 'auto' }}>
            <InputLabel>บริษัท (Company)</InputLabel>
            <Select value={company} label="บริษัท (Company)" onChange={(e) => { setCompany(e.target.value); setPage(0); }}>
              <MenuItem value="">ทั้งหมด</MenuItem>
              {companyOptions.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<SearchIcon />} sx={{ width: isMobile ? '100%' : 'auto' }} onClick={handleSearch}>ค้นหา</Button>
        </Box>

        {/* Status filter chips — only for admin view */}
        {!isAvailableOnlyView && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5, pt: 1.5, borderTop: '0.5px solid', borderColor: 'divider', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mr: 0.5 }}>สถานะ:</Typography>
            {[
              { value: '',            label: 'ทั้งหมด' },
              { value: 'Available',   label: 'พร้อมใช้งาน' },
              { value: 'InUse',       label: 'ใช้งานประจำ' },
              { value: 'Borrowed',    label: 'กำลังยืม' },
              { value: 'Maintenance', label: 'ซ่อมบำรุง' },
              { value: 'Retired',     label: 'ปลดระวาง' },
              { value: 'Lost',        label: 'สูญหาย' },
            ].map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                size="small"
                onClick={() => { setStatus(opt.value); setPage(0); }}
                variant={status === opt.value ? 'filled' : 'outlined'}
                color={
                  status === opt.value
                    ? (opt.value === 'Available' ? 'success'
                      : opt.value === 'Maintenance' ? 'warning'
                      : opt.value === 'Lost' ? 'error'
                      : 'primary')
                    : 'default'
                }
                sx={{ cursor: 'pointer', fontWeight: status === opt.value ? 600 : 400 }}
              />
            ))}
          </Box>
        )}
      </Card>
      
      {/* Category Filter Chips — for user available-view */}
      {isAvailableOnlyView && (
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" fontWeight={600} color="text.secondary">หมวดหมู่:</Typography>
          <Chip
            label="ทั้งหมด"
            onClick={() => setSelectedCategoryId(null)}
            color={selectedCategoryId === null ? 'primary' : 'default'}
            sx={{ fontWeight: 600 }}
          />
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.name}
              onClick={() => setSelectedCategoryId(cat.id)}
              color={selectedCategoryId === cat.id ? 'primary' : 'default'}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Box>
      )}
 
      {/* Category Header — shown when typeGroup is active */}

      {typeGroup && typeGroupLabels[typeGroup] && (
        <Card sx={{ mb: 3, overflow: 'visible' }}>
          <Box sx={{ height: 4, borderRadius: '16px 16px 0 0', background: 'linear-gradient(90deg, #FF6B00, #FF8C00)' }} />
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Box sx={{
                  width: 56, height: 56, borderRadius: 3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main',
                  fontSize: 28,
                }}>
                  {typeGroupIcons[typeGroup]}
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{typeGroupLabels[typeGroup]}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>{typeGroupDescriptions[typeGroup]}</Typography>
                </Box>
              </Box>
              {isAdmin && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(`/assets/new?typeGroup=${typeGroup}`)} sx={{ borderRadius: 2, flexShrink: 0 }}>
                  เพิ่ม{typeGroupLabels[typeGroup]}
                </Button>
              )}
            </Box>

            {/* Stats row */}
            {categoryStats && (
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 2.5, pt: 2.5, borderTop: `1px solid ${theme.palette.divider}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: alpha(theme.palette.success.main, 0.08), borderRadius: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>พร้อมใช้</Typography>
                    <Typography variant="body2" fontWeight={700}>{categoryStats.byStatus.find(s => s.status === 'Available')?._count || 0}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: alpha(theme.palette.warning.main, 0.08), borderRadius: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>กำลังยืม</Typography>
                    <Typography variant="body2" fontWeight={700}>{categoryStats.byStatus.find(s => s.status === 'Borrowed')?._count || 0}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: alpha(theme.palette.info.main, 0.08), borderRadius: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'info.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>ใช้งานประจำ</Typography>
                    <Typography variant="body2" fontWeight={700}>{categoryStats.byStatus.find(s => s.status === 'InUse')?._count || 0}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: alpha(theme.palette.warning.dark, 0.08), borderRadius: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>ซ่อมบำรุง</Typography>
                    <Typography variant="body2" fontWeight={700}>{categoryStats.byStatus.find(s => s.status === 'Maintenance')?._count || 0}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: alpha(theme.palette.grey[500], 0.08), borderRadius: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'grey.400' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>ปลดระวาง</Typography>
                    <Typography variant="body2" fontWeight={700}>{categoryStats.byStatus.find(s => s.status === 'Retired')?._count || 0}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: alpha(theme.palette.error.main, 0.08), borderRadius: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>สูญหาย</Typography>
                    <Typography variant="body2" fontWeight={700}>{categoryStats.byStatus.find(s => s.status === 'Lost')?._count || 0}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: alpha(theme.palette.primary.main, 0.08), borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>รวม</Typography>
                  <Typography variant="body2" fontWeight={700} color="primary.main">{categoryStats.total}</Typography>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
  
      {/* Borrowed Items Section — for user available-view */}
      {isAvailableOnlyView && myBorrowedItems.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <Typography variant="h6" fontWeight={700}>รายการที่กำลังยืม</Typography>
            <Chip label={`${myBorrowedItems.length} รายการ`} size="small" sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.dark, fontWeight: 700 }} />
          </Box>
          <Grid container spacing={2.5}>
            {myBorrowedItems.map((item: any) => {
              const isOverdue = new Date(item.dueDate) < new Date();
              return (
                <Grid item xs={12} sm={6} lg={4} key={item.id}>
                  <Card sx={{
                    height: '100%', display: 'flex', flexDirection: 'column',
                    borderLeft: `4px solid ${isOverdue ? theme.palette.error.main : theme.palette.success.main}`,
                    '&:hover': { boxShadow: isOverdue ? `0 8px 24px ${alpha(theme.palette.error.main, 0.15)}` : `0 8px 24px ${alpha(theme.palette.success.main, 0.15)}` },
                  }}>
                    <CardContent sx={{ flex: 1, pb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1.5 }}>
                        <Box>
                          <Typography fontWeight={700} fontSize="1rem">{item.asset?.assetCode || item.assetCode}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.asset?.brand || item.brand} {item.asset?.model || item.model}</Typography>
                        </Box>
                        <Chip label={isOverdue ? 'เกินกำหนด' : 'กำลังยืม'} size="small" color={isOverdue ? 'error' : 'success'} sx={{ fontWeight: 700 }} />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 3, mt: 1.5 }}>
                        <Box><Typography variant="caption" color="text.secondary" fontWeight={600}>วันที่ยืม</Typography><Typography variant="body2" fontWeight={600}>{new Date(item.borrowDate).toLocaleDateString('th-TH')}</Typography></Box>
                        <Box><Typography variant="caption" color="text.secondary" fontWeight={600}>กำหนดคืน</Typography><Typography variant="body2" fontWeight={600} color={isOverdue ? 'error.main' : 'inherit'}>{new Date(item.dueDate).toLocaleDateString('th-TH')}</Typography></Box>
                      </Box>
                    </CardContent>
                    <Divider />
                    <Box sx={{ display: 'flex', gap: 0.5, p: 1.5 }}>
                      <Button size="small" variant="outlined" startIcon={<PageviewIcon />} onClick={() => navigate(`/assets/${item.assetId}`)} sx={{ flex: 1 }}>รายละเอียด</Button>
                      <Button size="small" variant="outlined" color="warning" startIcon={<ExtensionIcon />} onClick={() => { setExtendDialog({ open: true, item }); setExtendDays(3); }} sx={{ flex: 1 }}>ขยายวัน</Button>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Extend Dialog */}
      <Dialog open={extendDialog.open} onClose={() => { setExtendDialog({ open: false, item: null }); setExtendReason(''); }} maxWidth="xs" fullWidth>
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
              <TextField
                label="เหตุผลในการขยายวัน"
                fullWidth
                multiline
                rows={2}
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                placeholder="เช่น ยังใช้งานไม่เสร็จ, ต้องการทำงานต่อ"
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setExtendDialog({ open: false, item: null }); setExtendReason(''); }}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleExtendSubmit}>ส่งคำขอ</Button>
        </DialogActions>
      </Dialog>

      {isAvailableOnlyView && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
          <Typography variant="h6" fontWeight={700}>อุปกรณ์พร้อมให้ยืม</Typography>
          <Chip label={`${total} รายการ`} size="small" sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.dark, fontWeight: 700 }} />
        </Box>
      )}

      {loading ? (
        isAvailableOnlyView && user?.role === 'USER' ? (
          <LoadingSkeleton type="cards" count={6} />
        ) : (
          <LoadingSkeleton type="table" count={10} />
        )
      ) : isAvailableOnlyView && user?.role === 'USER' ? (
        assets.length === 0 ? (
          <EmptyState title="ไม่มีอุปกรณ์พร้อมยืม" description="ขณะนี้ไม่มีอุปกรณ์ว่างในระบบ" />
        ) : (
          <Grid container spacing={2.5}>
            {Object.entries(groupedAssets).map(([categoryName, group]) => (
              <Grid item xs={12} key={categoryName}>
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="h6" fontWeight={700}>{categoryName}</Typography>
                  <Divider sx={{ flex: 1 }} />
                </Box>
                <Grid container spacing={2.5}>
                  {group.assets.map((asset) => (
                    <Grid item xs={12} sm={6} lg={4} key={asset.id}>
                      <Card
                        sx={{
                          height: '100%', display: 'flex', flexDirection: 'column',
                          position: 'relative', overflow: 'visible',
                          '&:hover': { boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}` },
                        }}
                      >
                        <Box sx={{ display: 'flex', gap: 2, p: 3, pb: 1.5 }}>
                          <Box
                            sx={{
                              width: 80, height: 80, borderRadius: 2, overflow: 'hidden',
                              flexShrink: 0, bgcolor: alpha(theme.palette.grey[500], 0.08),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            {asset.image ? (
                              <Box component="img" src={asset.image} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <ImageIcon sx={{ fontSize: 32, color: theme.palette.grey[400] }} />
                            )}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                              <Typography fontWeight={800} fontSize="1.1rem" color="#0F172A" noWrap>{asset.assetCode}</Typography>
                              <StatusChip status={asset.status} />
                            </Box>
                            {asset.assetName && (
                              <Typography variant="body2" fontWeight={600} color="text.primary" noWrap sx={{ mt: 0.25 }}>
                                {asset.assetName}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                              {[asset.type, asset.brand, asset.model].filter(Boolean).join(' · ')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                              SN: {asset.serialNo}
                            </Typography>
                          </Box>
                        </Box>

                        {(asset.cpu || asset.ram || asset.storage1 || asset.osType) && (
                          <Box sx={{ px: 3, pb: 2 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', bgcolor: alpha(theme.palette.grey[500], 0.04), borderRadius: 2, p: 1.5 }}>
                              {asset.cpu && (
                                <Box><Typography variant="caption" fontWeight={600} color="text.secondary">CPU</Typography><Typography variant="body2" fontWeight={600}>{asset.cpu}</Typography></Box>
                              )}
                              {asset.ram && (
                                <Box><Typography variant="caption" fontWeight={600} color="text.secondary">RAM</Typography><Typography variant="body2" fontWeight={600}>{asset.ram}</Typography></Box>
                              )}
                              {asset.storage1 && (
                                <Box><Typography variant="caption" fontWeight={600} color="text.secondary">Storage</Typography><Typography variant="body2" fontWeight={600}>{asset.storage1}</Typography></Box>
                              )}
                              {asset.osType && (
                                <Box><Typography variant="caption" fontWeight={600} color="text.secondary">OS</Typography><Typography variant="body2" fontWeight={600}>{asset.osType}</Typography></Box>
                              )}
                            </Box>
                          </Box>
                        )}

                        <Box sx={{ px: 3, pb: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                          {(asset.location || asset.floor) && (
                            <Chip
                              icon={<LocationOnIcon sx={{ fontSize: 14 }} />}
                              label={[asset.location, asset.floor && `ชั้น ${asset.floor}`].filter(Boolean).join(' ')}
                              size="small" variant="outlined"
                              sx={{ height: 24, '& .MuiChip-icon': { fontSize: 14, ml: 0.5 } }}
                            />
                          )}
                          {asset.company && (
                            <Chip label={asset.company} size="small" variant="outlined" sx={{ height: 24 }} />
                          )}
                          {asset.warrantyDaysLeft !== null && asset.warrantyDaysLeft !== undefined && (
                            <Chip
                              icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
                              label={asset.warrantyDaysLeft > 0 ? `รับประกัน ${asset.warrantyDaysLeft} วัน` : 'หมดประกัน'}
                              size="small"
                              variant="outlined"
                              color={asset.warrantyDaysLeft > 90 ? 'success' : asset.warrantyDaysLeft > 0 ? 'warning' : 'error'}
                              sx={{ height: 24, '& .MuiChip-icon': { fontSize: 14, ml: 0.5 } }}
                            />
                          )}
                          {asset.ownerName && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                              {asset.ownerName}
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ mt: 'auto', p: 2, pt: 0 }}>
                          <Button
                            variant="contained"
                            fullWidth
                            size="large"
                            onClick={() => navigate(`/borrow/new?assetId=${asset.id}`)}
                            sx={{ borderRadius: 2, py: 1.5, fontWeight: 700, fontSize: '0.95rem', boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}` }}
                          >
                            ขอยืมอุปกรณ์
                          </Button>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            ))}
          </Grid>
        )
      ) : (
        assets.length === 0 ? (
          <EmptyState title="ไม่พบข้อมูลทรัพย์สิน" description="ลองปรับเงื่อนไขการค้นหาหรือตัวกรอง" secondaryActionLabel="รีเซ็ตตัวกรอง" onSecondaryAction={() => { setSearch(''); setStatus(''); setType(''); setCompany(''); setPage(0); }} />
        ) : isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: -1 }}>แสดงผลแบบการ์ด ({total} รายการ)</Typography>
            {assets.map((asset) => (
              <Card key={asset.id} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, position: 'relative', overflow: 'visible' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                     {asset.image ? (
                        <Box component="img" src={asset.image} alt="" sx={{ width: 56, height: 56, borderRadius: 1.5, objectFit: 'cover' }} />
                     ) : (
                        <Box sx={{ width: 56, height: 56, borderRadius: 1.5, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon sx={{ color: 'grey.400' }} />
                        </Box>
                     )}
                     <Box sx={{ flex: 1, minWidth: 0 }}>
                       <Typography fontWeight={700} noWrap sx={{ color: 'text.primary', fontSize: '1rem' }}>{asset.assetName || asset.assetCode || 'ไม่ระบุชื่อ'}</Typography>
                       <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{asset.assetCode} • {asset.serialNo}</Typography>
                     </Box>
                  </Box>
                  <StatusChip status={asset.status} />
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <Grid container spacing={1}>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary" display="block">ประเภท</Typography><Typography variant="body2" fontWeight={500}>{asset.type || '-'}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary" display="block">ยี่ห้อ/รุ่น</Typography><Typography variant="body2" fontWeight={500} noWrap>{[asset.brand, asset.model].filter(Boolean).join(' ') || '-'}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary" display="block">ผู้ถือครอง</Typography><Typography variant="body2" fontWeight={500} noWrap>{asset.ownerName || '-'}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary" display="block">สถานที่/อาคาร</Typography><Typography variant="body2" fontWeight={500} noWrap>{asset.location || '-'}</Typography></Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>

                  <Button size="small" variant="outlined" startIcon={<PageviewIcon />} onClick={() => navigate(`/assets/${asset.id}`)}>เปิดดู</Button>
                  <Button size="small" variant="contained" onClick={(e) => handleMenuOpen(e, asset)}>จัดการ</Button>
                </Box>
              </Card>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 4 }}>
              <Pagination count={Math.ceil(total / pageSize) || 1} page={page + 1} onChange={(_e, p) => setPage(p - 1)} color="primary" shape="rounded" />
            </Box>
          </Box>
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
            disableColumnFilter
          />
        )
      )}

      <Dialog open={columnDialogOpen} onClose={() => setColumnDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>จัดคอลัมน์ที่แสดง</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            เลือกหัวข้อจากข้อมูล Asset ทั้งหมดในฐานข้อมูล และใช้ปุ่มลูกศรเพื่อสลับตำแหน่งคอลัมน์
          </Typography>
          <List dense disablePadding>
            {columnConfig.map((config, index) => (
              <ListItem key={config.field} divider>
                <Checkbox
                  edge="start"
                  checked={config.visible}
                  onChange={() => toggleColumn(config.field)}
                  disabled={config.visible && visibleCount <= 1}
                />
                <ListItemText primary={config.label} secondary={config.visible ? 'แสดงในตาราง' : 'ซ่อนจากตาราง'} />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => moveColumn(config.field, 'up')} disabled={index === 0}>
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => moveColumn(config.field, 'down')} disabled={index === columnConfig.length - 1}>
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                </Box>
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
          menuAnchor.row.isHeaderMenu ? (
            <Box>
              <MenuItem key="import" sx={{ p: 0 }}><Box sx={{ width: '100%', px: 2, py: 1 }}><ImportAssetsButton /></Box></MenuItem>
              <MenuItem key="export" sx={{ p: 0 }}><Box sx={{ width: '100%', px: 2, py: 1 }}><ExportAssetsButton /></Box></MenuItem>
              <MenuItem key="columns" onClick={() => { handleMenuClose(); setColumnDialogOpen(true); }}>
                <TableViewIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} /> จัดคอลัมน์ตาราง
              </MenuItem>
            </Box>
          ) : (
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
          )
        )}
      </Menu>
    </Box>
  );
}
