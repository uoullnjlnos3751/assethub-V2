import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Drawer,
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
  Popover,
  Select,
  Skeleton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
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
import GridViewIcon from '@mui/icons-material/GridView';
import CloseIcon from '@mui/icons-material/Close';
import DensitySmallIcon from '@mui/icons-material/DensitySmall';
import DensityLargeIcon from '@mui/icons-material/DensityLarge';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReturnIcon from '@mui/icons-material/AssignmentReturn';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ExtensionIcon from '@mui/icons-material/Extension';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ImageOffIcon from '@mui/icons-material/ImageNotSupported';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BuildIcon from '@mui/icons-material/Build';
import ComputerIcon from '@mui/icons-material/Computer';
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
import BulkUpdateDialog from './components/BulkUpdateDialog';
import AssetCard from './components/AssetCard';
import { loadSavedViews, saveFilterView, deleteFilterView, SavedFilterView } from './components/savedFilterViews';

type ColumnConfig = {
  field: string;
  label: string;
  visible: boolean;
};

const COLUMN_PREF_KEY = 'assethub.assetList.columns.v3';
const VIEW_MODE_KEY = 'assethub.assetList.viewMode';
const DENSITY_KEY = 'assethub.assetList.density';

const defaultColumnConfig: ColumnConfig[] = [
  { field: 'hasImage', label: 'รูป', visible: true },
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

// Grouping used only for the column-picker dialog (search/quick-toggle) — does NOT
// affect actual table column order, which stays driven by columnConfig's array order.
const COLUMN_CATEGORIES: Record<string, string> = {
  hasImage: 'พื้นฐาน', assetName: 'พื้นฐาน', serialNo: 'พื้นฐาน', type: 'พื้นฐาน', brand: 'พื้นฐาน', model: 'พื้นฐาน',
  status: 'พื้นฐาน', id: 'พื้นฐาน', assetCode: 'พื้นฐาน', company: 'พื้นฐาน', oldAssetCode: 'พื้นฐาน',
  ownerName: 'องค์กร/ตำแหน่ง', departmentId: 'องค์กร/ตำแหน่ง', location: 'องค์กร/ตำแหน่ง', floor: 'องค์กร/ตำแหน่ง',
  domainName: 'ซอฟต์แวร์', osType: 'ซอฟต์แวร์', osVersion: 'ซอฟต์แวร์', windowsLicense: 'ซอฟต์แวร์', officeLicense: 'ซอฟต์แวร์', antivirusStatus: 'ซอฟต์แวร์',
  cpu: 'ฮาร์ดแวร์', cpuGeneration: 'ฮาร์ดแวร์', gpu: 'ฮาร์ดแวร์', ram: 'ฮาร์ดแวร์', ramDetail: 'ฮาร์ดแวร์', ramSlot1: 'ฮาร์ดแวร์', ramSlot2: 'ฮาร์ดแวร์', storage1: 'ฮาร์ดแวร์', storage2: 'ฮาร์ดแวร์', snComputer: 'ฮาร์ดแวร์',
  budget: 'จัดซื้อ', prNumber: 'จัดซื้อ', poDate: 'จัดซื้อ', poNumber: 'จัดซื้อ', vendor: 'จัดซื้อ', purchaseDate: 'จัดซื้อ', age: 'จัดซื้อ',
  remark: 'อื่นๆ', createdAt: 'อื่นๆ', updatedAt: 'อื่นๆ',
};

const statusLabels: Record<string, string> = {
  Available: 'พร้อมใช้งาน',
  Borrowed: 'กำลังยืม',
  InUse: 'ใช้งานประจำ',
  Maintenance: 'ซ่อมบำรุง',
  Retired: 'ปลดระวาง',
  Lost: 'สูญหาย',
};

const warrantyStatusLabels: Record<string, string> = {
  active: 'ยังไม่หมดประกัน',
  expiringSoon: 'ใกล้หมดประกัน (30 วัน)',
  expired: 'หมดประกันแล้ว',
  none: 'ไม่มีประกัน',
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
  computers: <ComputerIcon fontSize="small" />,
  monitors: <DesktopWindowsIcon fontSize="small" />,
  devices: <DevicesIcon fontSize="small" />,
  printers: <PrintIcon fontSize="small" />,
  phonesTablets: <PhoneAndroidIcon fontSize="small" />,
  network: <RouterIcon fontSize="small" />,
  rack: <HandymanIcon fontSize="small" />,
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchParams] = useSearchParams();
  const [assets, setAssets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statuses, setStatuses] = useState<string[]>(searchParams.get('status') ? [searchParams.get('status') as string] : []);
  const [type, setType] = useState(searchParams.get('type') || '');
  const typeGroup = searchParams.get('typeGroup') || '';
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [company, setCompany] = useState(searchParams.get('company') || '');
  const [warrantyStatus, setWarrantyStatus] = useState('');
  const [purchaseDateFrom, setPurchaseDateFrom] = useState('');
  const [purchaseDateTo, setPurchaseDateTo] = useState('');
  const [advFilterAnchor, setAdvFilterAnchor] = useState<null | HTMLElement>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(loadColumnConfig);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<{ element: null | HTMLElement; row: any }>({ element: null, row: null });
  const [myBorrowedItems, setMyBorrowedItems] = useState<any[]>([]);
  const [extendDialog, setExtendDialog] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [extendDays, setExtendDays] = useState(3);
  const [extendReason, setExtendReason] = useState('');
  const [categoryStats, setCategoryStats] = useState<{ total: number; byStatus: { status: string; _count: number }[] } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // View preferences (admin desktop): table vs grid, and DataGrid density
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => (localStorage.getItem(VIEW_MODE_KEY) as 'table' | 'grid') || 'table');
  const [density, setDensity] = useState<'compact' | 'standard'>(() => (localStorage.getItem(DENSITY_KEY) as 'compact' | 'standard') || 'standard');

  // Quick-view drawer (single click on a table row, without leaving the list)
  const [quickView, setQuickView] = useState<{ open: boolean; asset: any }>({ open: false, asset: null });

  // Saved filter views (localStorage, personal — no backend model)
  const [savedViews, setSavedViews] = useState<SavedFilterView[]>(() => loadSavedViews());
  const [savedViewsAnchor, setSavedViewsAnchor] = useState<null | HTMLElement>(null);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');

  // Bulk update states
  const [rowSelectionModel, setRowSelectionModel] = useState<any[]>([]);
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);

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
      setStatsLoading(true);
      assetAPI.stats(typeGroup || '')
        .then((res) => setCategoryStats(res.data))
        .catch(() => {})
        .finally(() => setStatsLoading(false));
    }
  }, [typeGroup, isAvailableOnlyView]);

  useEffect(() => {
    localStorage.setItem(COLUMN_PREF_KEY, JSON.stringify(columnConfig));
  }, [columnConfig]);

  useEffect(() => { localStorage.setItem(VIEW_MODE_KEY, viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem(DENSITY_KEY, density); }, [density]);

  // Guards against out-of-order responses: rapid filter changes (e.g. debounced
  // search firing while a slower unfiltered request is still in flight) could
  // otherwise let an older response overwrite newer state.
  const fetchSeq = useRef(0);
  const fetchAssets = async (overrideSearch?: string) => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    try {
      const qSerialNo = searchParams.get('serialNo');
      const qLocation = searchParams.get('location');
      const qCompany = searchParams.has('company') ? searchParams.get('company') : null;
      const qType = searchParams.has('type') ? searchParams.get('type') : null;

      const res = await assetAPI.list({
        search: overrideSearch !== undefined ? overrideSearch : search,
        status: statuses.length > 0 ? statuses.join(',') : undefined,
        type: qType !== null ? (qType === '' ? '__EMPTY__' : qType) : (type || undefined),
        typeGroup: !type && typeGroup ? typeGroup : undefined,
        categoryId: selectedCategoryId || undefined,
        company: qCompany !== null ? (qCompany === '' ? '__EMPTY__' : qCompany) : (company || undefined),
        serialNo: qSerialNo !== null ? (qSerialNo === '' ? '__EMPTY__' : qSerialNo) : undefined,
        location: qLocation !== null ? (qLocation === '' ? '__EMPTY__' : qLocation) : undefined,
        warrantyStatus: warrantyStatus || undefined,
        purchaseDateFrom: purchaseDateFrom || undefined,
        purchaseDateTo: purchaseDateTo || undefined,
        page: page + 1,
        limit: pageSize,
      });
      if (seq !== fetchSeq.current) return; // a newer request already superseded this one
      setAssets(res.data.data);
      setTotal(res.data.total);
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
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

  useEffect(() => {
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, statuses, type, typeGroup, selectedCategoryId, company, warrantyStatus, purchaseDateFrom, purchaseDateTo]);

  const urlSearch = searchParams.get('search');
  useEffect(() => {
    if (urlSearch !== null) {
      setSearch(urlSearch);
      setPage(0);
      fetchAssets(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch]);

  const handleSearch = () => { setPage(0); fetchAssets(); };

  // Debounced "search as you type" — the Enter key / button above still work instantly too.
  const isFirstSearchEffect = useRef(true);
  useEffect(() => {
    if (isFirstSearchEffect.current) { isFirstSearchEffect.current = false; return; }
    const t = setTimeout(() => { setPage(0); fetchAssets(); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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

  const clearAllFilters = () => {
    setSearch('');
    setStatuses([]);
    setType('');
    setCompany('');
    setWarrantyStatus('');
    setPurchaseDateFrom('');
    setPurchaseDateTo('');
    setPage(0);
  };

  const applySavedView = (v: SavedFilterView) => {
    setSearch(v.filters.search);
    setStatuses(v.filters.statuses);
    setType(v.filters.type);
    setCompany(v.filters.company);
    setWarrantyStatus(v.filters.warrantyStatus);
    setPurchaseDateFrom(v.filters.purchaseDateFrom);
    setPurchaseDateTo(v.filters.purchaseDateTo);
    setPage(0);
    setSavedViewsAnchor(null);
  };

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onDelete: () => void }[] = [];
    if (search) chips.push({ key: 'search', label: `ค้นหา: "${search}"`, onDelete: () => setSearch('') });
    statuses.forEach((s) => chips.push({ key: `status-${s}`, label: statusLabels[s] || s, onDelete: () => setStatuses((prev) => prev.filter((x) => x !== s)) }));
    if (type) chips.push({ key: 'type', label: `ประเภท: ${type}`, onDelete: () => setType('') });
    if (company) chips.push({ key: 'company', label: `บริษัท: ${company}`, onDelete: () => setCompany('') });
    if (warrantyStatus) chips.push({ key: 'warranty', label: `ประกัน: ${warrantyStatusLabels[warrantyStatus] || warrantyStatus}`, onDelete: () => setWarrantyStatus('') });
    if (purchaseDateFrom || purchaseDateTo) {
      chips.push({
        key: 'purchaseDate',
        label: `วันที่ซื้อ: ${purchaseDateFrom || '…'} – ${purchaseDateTo || '…'}`,
        onDelete: () => { setPurchaseDateFrom(''); setPurchaseDateTo(''); },
      });
    }
    return chips;
  }, [search, statuses, type, company, warrantyStatus, purchaseDateFrom, purchaseDateTo]);

  const advancedFilterCount = (warrantyStatus ? 1 : 0) + (purchaseDateFrom || purchaseDateTo ? 1 : 0);

  const textColumn = (field: string, headerName: string, width = 140): GridColDef => ({
    field,
    headerName,
    width,
  });

  const columnMap = useMemo<Record<string, GridColDef>>(() => ({
    id: textColumn('id', 'ID', 90),
    hasImage: {
      field: 'hasImage',
      headerName: 'รูป',
      width: 50,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          {row.image ? (
            <Box
              component="img"
              src={row.image}
              alt=""
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.5,
                objectFit: 'cover',
                boxShadow: (theme) => `0 0 0 1px ${alpha(theme.palette.success.main, 0.3)}`,
              }}
            />
          ) : (
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.5,
                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: (theme) => theme.palette.grey[400],
              }}
            >
              <ImageOffIcon fontSize="small" sx={{ fontSize: 16 }} />
            </Box>
          )}
        </Box>
      ),
    },
    assetCode: textColumn('assetCode', 'เลขครุภัณฑ์', 140),
    assetName: {
      ...textColumn('assetName', 'ชื่อทรัพย์สิน', 180),
      renderCell: ({ row }) => {
        const isConsumable = ['toner', 'ink', 'cartridge', 'battery', 'adapter', 'charger', 'consumable'].some(t => row.type?.toLowerCase().includes(t));
        const lowStock = isConsumable && row.consumableDetail && row.consumableDetail.stockQuantity <= row.consumableDetail.minimumStock;

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: lowStock ? 700 : 400 }}>
              {row.assetName}
            </Typography>
            {lowStock && (
              <Tooltip title={`สต็อกใกล้หมด: ${row.consumableDetail.stockQuantity} (Min: ${row.consumableDetail.minimumStock})`}>
                <Box component="span" sx={{ color: 'error.main', fontSize: 14, lineHeight: 1 }}>⚠</Box>
              </Tooltip>
            )}
          </Box>
        );
      }
    },
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
              <Tooltip title="จัดการเพิ่มเติม">
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, row)}
                  sx={{
                    color: 'text.secondary',
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }
                  }}
                >
                  <MoreVertIcon fontSize="small" color="primary" />
                </IconButton>
              </Tooltip>
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

  const columnCategoryNames = useMemo(() => Array.from(new Set(Object.values(COLUMN_CATEGORIES))), []);
  const filteredColumnConfig = useMemo(() => {
    const q = columnSearch.trim().toLowerCase();
    if (!q) return columnConfig;
    return columnConfig.filter((c) =>
      c.label.toLowerCase().includes(q) || (COLUMN_CATEGORIES[c.field] || '').toLowerCase().includes(q)
    );
  }, [columnConfig, columnSearch]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, row: any) => {
    setMenuAnchor({ element: event.currentTarget, row });
  };

  const handleMenuClose = () => {
    setMenuAnchor({ element: null, row: null });
  };

  const kpiItems = !isAvailableOnlyView && categoryStats ? [
    { label: 'ทรัพย์สินทั้งหมด', value: categoryStats.total, color: theme.palette.primary.main, status: '', Icon: Inventory2Icon },
    { label: 'พร้อมใช้งาน', value: categoryStats.byStatus.find((b) => b.status === 'Available')?._count ?? 0, color: theme.palette.success.main, status: 'Available', Icon: CheckCircleIcon },
    { label: 'ใช้งานประจำ', value: categoryStats.byStatus.find((b) => b.status === 'InUse')?._count ?? 0, color: (theme.palette as any).info?.main || '#0288d1', status: 'InUse', Icon: PersonIcon },
    { label: 'กำลังยืม', value: categoryStats.byStatus.find((b) => b.status === 'Borrowed')?._count ?? 0, color: theme.palette.warning.main, status: 'Borrowed', Icon: ScheduleIcon },
    { label: 'ซ่อมบำรุง', value: categoryStats.byStatus.find((b) => b.status === 'Maintenance')?._count ?? 0, color: theme.palette.error.main, status: 'Maintenance', Icon: BuildIcon },
  ] : [];

  const showGridView = !isAvailableOnlyView && isAdmin && !isMobile && viewMode === 'grid';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
            {isAvailableOnlyView ? 'รายการอุปกรณ์พร้อมยืม' : typeGroupLabels[typeGroup] || 'ทะเบียนทรัพย์สิน'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {isAvailableOnlyView ? 'เลือกอุปกรณ์ที่ต้องการยืมเพื่อส่งคำขอ' : `จัดการและติดตามทรัพย์สินทั้งหมดในระบบ`}
            </Typography>
            {!isAvailableOnlyView && (
              <Chip
                label={`${total} รายการ`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main
                }}
              />
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: isMobile ? 1 : 0, width: isMobile ? '100%' : 'auto' }}>
          {isAdmin && (
            <IconButton
              onClick={(e) => handleMenuOpen(e, { isHeaderMenu: true })}
              sx={{
                display: { xs: 'flex', sm: 'none' },
                ml: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '8px'
              }}
            >
              <SettingsIcon />
            </IconButton>
          )}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
            {isAdmin && <ImportAssetsButton />}
            {isAdmin && <ExportAssetsButton />}
            {isAdmin && (
              <Button
                variant="outlined"
                startIcon={<TableViewIcon />}
                onClick={() => setColumnDialogOpen(true)}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
              >
                ตั้งค่าคอลัมน์
              </Button>
            )}
          </Box>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                flex: isMobile ? 1 : 'none',
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: theme.shadows[2]
              }}
              onClick={() => navigate('/assets/new' + (typeGroup ? `?typeGroup=${typeGroup}` : ''))}
            >
              เพิ่มทรัพย์สินใหม่
            </Button>
          )}
        </Box>
      </Box>

      {/* ── KPI stat strip (5 interactive cards above filter, admin only, non-user) ── */}
      {!isAvailableOnlyView && (
        statsLoading ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' }, gap: 1.5, mb: 2 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={64} sx={{ borderRadius: 2 }} />
            ))}
          </Box>
        ) : categoryStats && (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' },
            gap: 1.5,
            mb: 2,
          }}>
            {kpiItems.map((kpi) => {
              const isActive = kpi.status === '' ? statuses.length === 0 : statuses.length === 1 && statuses[0] === kpi.status;
              const activate = () => { setStatuses(kpi.status ? [kpi.status] : []); setPage(0); };
              return (
                <Box
                  key={kpi.label}
                  onClick={activate}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } }}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.75,
                    p: 1.5,
                    bgcolor: isActive ? alpha(kpi.color, 0.05) : theme.palette.background.paper,
                    border: `1px solid ${isActive ? kpi.color : theme.palette.divider}`,
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all .2s ease',
                    boxShadow: isActive ? `0 4px 14px ${alpha(kpi.color, 0.15)}` : 'none',
                    '&:hover': {
                      borderColor: kpi.color,
                      boxShadow: `0 4px 14px ${alpha(kpi.color, 0.12)}`,
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${kpi.color}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                      width: 28, height: 28, borderRadius: 1.5,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: alpha(kpi.color, 0.12), color: kpi.color, flexShrink: 0,
                    }}>
                      <kpi.Icon sx={{ fontSize: 16 }} />
                    </Box>
                    <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: isActive ? 700 : 500, color: isActive ? kpi.color : theme.palette.text.secondary, lineHeight: 1.2 }}>{kpi.label}</Typography>
                </Box>
              );
            })}
          </Box>
        )
      )}

      <Card sx={{
        p: 2,
        mb: 1.5,
        bgcolor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        boxShadow: theme.shadows[1],
      }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="ค้นหาเลขครุภัณฑ์ ชื่อ S/N ยี่ห้อ..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ minWidth: 240, width: isMobile ? '100%' : 'auto', flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 140, width: isMobile ? '100%' : 'auto' }}>
            <InputLabel id="asset-filter-type-label">ประเภท</InputLabel>
            <Select labelId="asset-filter-type-label" value={type} label="ประเภท" onChange={(e) => { setType(e.target.value); setPage(0); }}>
              <MenuItem value="">ทั้งหมด</MenuItem>
              {typeOptions.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140, width: isMobile ? '100%' : 'auto' }}>
            <InputLabel id="asset-filter-company-label">บริษัท (Company)</InputLabel>
            <Select labelId="asset-filter-company-label" value={company} label="บริษัท (Company)" onChange={(e) => { setCompany(e.target.value); setPage(0); }}>
              <MenuItem value="">ทั้งหมด</MenuItem>
              {companyOptions.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 170, width: isMobile ? '100%' : 'auto' }}>
            <InputLabel id="asset-filter-status-label">สถานะ</InputLabel>
            <Select
              labelId="asset-filter-status-label"
              multiple
              value={statuses}
              label="สถานะ"
              onChange={(e) => { const v = e.target.value; setStatuses(typeof v === 'string' ? v.split(',') : v as string[]); setPage(0); }}
              renderValue={(selected) => (selected as string[]).length === 0 ? 'ทั้งหมด' : (selected as string[]).map((s) => statusLabels[s] || s).join(', ')}
            >
              {Object.entries(statusLabels).map(([val, lbl]) => (
                <MenuItem key={val} value={val}>
                  <Checkbox size="small" checked={statuses.indexOf(val) > -1} />
                  <ListItemText primary={lbl} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<SearchIcon />} sx={{ width: isMobile ? '100%' : 'auto', borderRadius: '8px', textTransform: 'none' }} onClick={handleSearch}>ค้นหา</Button>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={(e) => setAdvFilterAnchor(e.currentTarget)}
            sx={{ width: isMobile ? '100%' : 'auto', borderRadius: '8px', textTransform: 'none' }}
          >
            ตัวกรองเพิ่มเติม{advancedFilterCount > 0 ? ` (${advancedFilterCount})` : ''}
          </Button>
          <Button
            variant="outlined"
            startIcon={<BookmarksIcon />}
            onClick={(e) => setSavedViewsAnchor(e.currentTarget)}
            sx={{ width: isMobile ? '100%' : 'auto', borderRadius: '8px', textTransform: 'none' }}
          >
            มุมมองของฉัน{savedViews.length > 0 ? ` (${savedViews.length})` : ''}
          </Button>
          <Button variant="outlined" startIcon={<RestartAltIcon />} sx={{ width: isMobile ? '100%' : 'auto', borderRadius: '8px', textTransform: 'none' }} onClick={() => { clearAllFilters(); fetchAssets(); }}>ล้าง</Button>
          {isAdmin && rowSelectionModel.length > 0 && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<EditIcon />}
              sx={{ width: isMobile ? '100%' : 'auto', borderRadius: '8px', textTransform: 'none' }}
              onClick={() => setBulkUpdateOpen(true)}
            >
              แก้ไขที่เลือก ({rowSelectionModel.length})
            </Button>
          )}
        </Box>
      </Card>

      {/* Active filter chips — quick per-filter clear, replaces having to remember which control set what */}
      {activeFilterChips.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', mb: 2 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>ตัวกรองที่ใช้อยู่:</Typography>
          {activeFilterChips.map((chip) => (
            <Chip key={chip.key} label={chip.label} size="small" onDelete={chip.onDelete} sx={{ fontWeight: 600 }} />
          ))}
          <Chip label="ล้างทั้งหมด" size="small" variant="outlined" onClick={() => { clearAllFilters(); fetchAssets(); }} sx={{ fontWeight: 600, cursor: 'pointer' }} />
        </Box>
      )}

      <Popover
        open={Boolean(advFilterAnchor)}
        anchorEl={advFilterAnchor}
        onClose={() => setAdvFilterAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2.5, width: 300, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle2">ตัวกรองเพิ่มเติม</Typography>
          <FormControl size="small" fullWidth>
            <InputLabel id="asset-filter-warranty-label">สถานะประกัน</InputLabel>
            <Select labelId="asset-filter-warranty-label" value={warrantyStatus} label="สถานะประกัน" onChange={(e) => { setWarrantyStatus(e.target.value); setPage(0); }}>
              <MenuItem value="">ทั้งหมด</MenuItem>
              {Object.entries(warrantyStatusLabels).map(([val, lbl]) => (
                <MenuItem key={val} value={val}>{lbl}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.75 }}>ช่วงวันที่จัดซื้อ</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" type="date" label="จาก" InputLabelProps={{ shrink: true }} value={purchaseDateFrom} onChange={(e) => { setPurchaseDateFrom(e.target.value); setPage(0); }} fullWidth />
              <TextField size="small" type="date" label="ถึง" InputLabelProps={{ shrink: true }} value={purchaseDateTo} onChange={(e) => { setPurchaseDateTo(e.target.value); setPage(0); }} fullWidth />
            </Box>
          </Box>
          <Button size="small" onClick={() => { setWarrantyStatus(''); setPurchaseDateFrom(''); setPurchaseDateTo(''); setPage(0); }}>ล้างตัวกรองเพิ่มเติม</Button>
        </Box>
      </Popover>

      <Menu anchorEl={savedViewsAnchor} open={Boolean(savedViewsAnchor)} onClose={() => setSavedViewsAnchor(null)}>
        <MenuItem onClick={() => { setSavedViewsAnchor(null); setSaveViewDialogOpen(true); }}>
          <BookmarkAddIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} /> บันทึกตัวกรองปัจจุบัน...
        </MenuItem>
        {savedViews.length > 0 && <Divider />}
        {savedViews.map((v) => (
          <MenuItem key={v.id} onClick={() => applySavedView(v)} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <span>{v.name}</span>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); setSavedViews(deleteFilterView(v.id)); }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={saveViewDialogOpen} onClose={() => setSaveViewDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>บันทึกมุมมองตัวกรอง</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            fullWidth
            label="ชื่อมุมมอง"
            value={saveViewName}
            onChange={(e) => setSaveViewName(e.target.value)}
            placeholder="เช่น คอมพิวเตอร์ที่ประกันใกล้หมด"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveViewDialogOpen(false)}>ยกเลิก</Button>
          <Button
            variant="contained"
            disabled={!saveViewName.trim()}
            onClick={() => {
              const updated = saveFilterView(saveViewName.trim(), { search, statuses, type, company, warrantyStatus, purchaseDateFrom, purchaseDateTo });
              setSavedViews(updated);
              setSaveViewDialogOpen(false);
              setSaveViewName('');
              toast.success('บันทึกมุมมองเรียบร้อย');
            }}
          >
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Category context bar — shown when typeGroup is active (slim, not a full hero card) */}
      {typeGroup && typeGroupLabels[typeGroup] && (
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
          mb: 2, px: 2, py: 1.25, borderRadius: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.04),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 1.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', flexShrink: 0,
            }}>
              {typeGroupIcons[typeGroup]}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>{typeGroupLabels[typeGroup]}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: { xs: 'none', sm: 'block' } }}>{typeGroupDescriptions[typeGroup]}</Typography>
            </Box>
          </Box>
          {isAdmin && (
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => navigate(`/assets/new?typeGroup=${typeGroup}`)} sx={{ borderRadius: 2, flexShrink: 0 }}>
              เพิ่ม{typeGroupLabels[typeGroup]}
            </Button>
          )}
        </Box>
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
                    borderLeft: `2px solid ${isOverdue ? theme.palette.error.main : theme.palette.success.main}`,
                    bgcolor: isOverdue ? alpha(theme.palette.error.main, 0.015) : alpha(theme.palette.success.main, 0.015),
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

      {/* Table/Grid + density toggle — admin desktop only */}
      {!isAvailableOnlyView && isAdmin && !isMobile && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mb: 1.5 }}>
          {viewMode === 'table' && (
            <ToggleButtonGroup size="small" value={density} exclusive onChange={(_e, v) => v && setDensity(v)}>
              <ToggleButton value="standard" sx={{ textTransform: 'none', px: 1.25 }}>
                <Tooltip title="สบายตา"><DensityLargeIcon fontSize="small" /></Tooltip>
              </ToggleButton>
              <ToggleButton value="compact" sx={{ textTransform: 'none', px: 1.25 }}>
                <Tooltip title="กระชับ"><DensitySmallIcon fontSize="small" /></Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          )}
          <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(_e, v) => v && setViewMode(v)}>
            <ToggleButton value="table" sx={{ textTransform: 'none', px: 1.25 }}>
              <Tooltip title="มุมมองตาราง"><TableViewIcon fontSize="small" /></Tooltip>
            </ToggleButton>
            <ToggleButton value="grid" sx={{ textTransform: 'none', px: 1.25 }}>
              <Tooltip title="มุมมองการ์ด"><GridViewIcon fontSize="small" /></Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
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
                      <AssetCard
                        asset={asset}
                        variant="borrow"
                        onView={(id) => navigate(`/assets/${id}`)}
                        onBorrow={(id) => navigate(`/borrow/new?assetId=${id}`)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            ))}
          </Grid>
        )
      ) : (
        assets.length === 0 ? (
          <EmptyState title="ไม่พบข้อมูลทรัพย์สิน" description="ลองปรับเงื่อนไขการค้นหาหรือตัวกรอง" secondaryActionLabel="รีเซ็ตตัวกรอง" onSecondaryAction={() => clearAllFilters()} />
        ) : isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: -1 }}>แสดงผลแบบการ์ด ({total} รายการ)</Typography>
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                variant="manage"
                onView={(id) => navigate(`/assets/${id}`)}
                onMenu={handleMenuOpen}
              />
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 4 }}>
              <Pagination count={Math.ceil(total / pageSize) || 1} page={page + 1} onChange={(_e, p) => setPage(p - 1)} color="primary" shape="rounded" />
            </Box>
          </Box>
        ) : showGridView ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2.5}>
              {assets.map((asset) => (
                <Grid item xs={12} sm={6} lg={4} key={asset.id}>
                  <AssetCard
                    asset={asset}
                    variant="manage"
                    onView={(id) => navigate(`/assets/${id}`)}
                    onMenu={handleMenuOpen}
                  />
                </Grid>
              ))}
            </Grid>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 2 }}>
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
            density={density}
            disableRowSelectionOnClick
            disableColumnFilter
            checkboxSelection={isAdmin}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={(newSelection) => {
              setRowSelectionModel([...newSelection]);
            }}
            onCellClick={(params) => {
              if (params.field === 'actions' || params.field === '__check__') return;
              setQuickView({ open: true, asset: params.row });
            }}
            onRowDoubleClick={(params) => navigate(`/assets/${params.id}`)}
            sx={{
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
              }
            }}
          />
        )
      )}

      {/* Quick-view drawer — preview an asset without leaving the list (single click on a table row) */}
      <Drawer anchor="right" open={quickView.open} onClose={() => setQuickView({ open: false, asset: null })} PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}>
        {quickView.asset && (
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" fontWeight={800} noWrap>{quickView.asset.assetCode}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>{quickView.asset.assetName}</Typography>
              </Box>
              <IconButton onClick={() => setQuickView({ open: false, asset: null })}><CloseIcon /></IconButton>
            </Box>
            <StatusChip status={quickView.asset.status} sx={{ alignSelf: 'flex-start', mb: 2 }} />
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1, overflowY: 'auto' }}>
              {([
                ['ประเภท', quickView.asset.type],
                ['ยี่ห้อ/รุ่น', [quickView.asset.brand, quickView.asset.model].filter(Boolean).join(' ')],
                ['Serial No.', quickView.asset.serialNo],
                ['ผู้ถือครอง', quickView.asset.ownerName],
                ['แผนก', quickView.asset.departmentId],
                ['สถานที่', [quickView.asset.location, quickView.asset.floor && `ชั้น ${quickView.asset.floor}`].filter(Boolean).join(' ')],
                ['บริษัท', quickView.asset.company],
                ['CPU', quickView.asset.cpu],
                ['RAM', quickView.asset.ram],
                ['Storage', quickView.asset.storage1],
                ['OS', quickView.asset.osType],
                ['Vendor', quickView.asset.vendor],
                ['วันที่ซื้อ', formatDate(quickView.asset.purchaseDate)],
              ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>{label}</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>{value}</Typography>
                </Box>
              ))}
            </Box>
            <Button variant="contained" fullWidth sx={{ mt: 2, borderRadius: '10px' }} onClick={() => navigate(`/assets/${quickView.asset.id}`)}>
              ดูรายละเอียดเต็ม
            </Button>
          </Box>
        )}
      </Drawer>

      <Dialog open={columnDialogOpen} onClose={() => { setColumnDialogOpen(false); setColumnSearch(''); }} fullWidth maxWidth="sm">
        <DialogTitle>จัดคอลัมน์ที่แสดง</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            เลือกหัวข้อจากข้อมูล Asset ทั้งหมดในฐานข้อมูล และใช้ปุ่มลูกศรเพื่อสลับตำแหน่งคอลัมน์
          </Typography>
          <TextField
            size="small"
            fullWidth
            placeholder="ค้นหาคอลัมน์..."
            value={columnSearch}
            onChange={(e) => setColumnSearch(e.target.value)}
            sx={{ mb: 1.5 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment>,
            }}
          />
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
            {columnCategoryNames.map((cat) => {
              const fieldsInCat = columnConfig.filter((c) => COLUMN_CATEGORIES[c.field] === cat).map((c) => c.field);
              const allVisible = fieldsInCat.length > 0 && fieldsInCat.every((f) => columnConfig.find((c) => c.field === f)?.visible);
              return (
                <Chip
                  key={cat}
                  label={cat}
                  size="small"
                  variant={allVisible ? 'filled' : 'outlined'}
                  color={allVisible ? 'primary' : 'default'}
                  onClick={() => setColumnConfig((current) => current.map((c) => fieldsInCat.includes(c.field) ? { ...c, visible: !allVisible } : c))}
                  sx={{ cursor: 'pointer', fontWeight: 600 }}
                />
              );
            })}
          </Box>
          <List dense disablePadding>
            {filteredColumnConfig.map((config) => {
              const index = columnConfig.findIndex((c) => c.field === config.field);
              return (
                <ListItem key={config.field} divider>
                  <Checkbox
                    edge="start"
                    checked={config.visible}
                    onChange={() => toggleColumn(config.field)}
                    disabled={config.visible && visibleCount <= 1}
                  />
                  <ListItemText
                    primary={config.label}
                    secondary={
                      <Box component="span" sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Box component="span" sx={{
                          fontSize: '0.62rem', fontWeight: 700, px: 0.75, py: 0.1, borderRadius: 0.75,
                          bgcolor: alpha(theme.palette.text.secondary, 0.1), color: 'text.secondary',
                        }}>
                          {COLUMN_CATEGORIES[config.field] || 'อื่นๆ'}
                        </Box>
                        <span>{config.visible ? 'แสดงในตาราง' : 'ซ่อนจากตาราง'}</span>
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => moveColumn(config.field, 'up')} disabled={index === 0}>
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => moveColumn(config.field, 'down')} disabled={index === columnConfig.length - 1}>
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
          <Button startIcon={<RestartAltIcon />} onClick={resetColumns}>คืนค่าเริ่มต้น</Button>
          <Button variant="contained" onClick={() => { setColumnDialogOpen(false); setColumnSearch(''); }}>เสร็จสิ้น</Button>
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
                <MenuItem onClick={() => { handleMenuClose(); navigate(`/assets/${menuAnchor.row.id}/print-qr`); }}>
                  <PrintIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> พิมพ์ QR Code
                </MenuItem>
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

      <BulkUpdateDialog
        open={bulkUpdateOpen}
        onClose={() => setBulkUpdateOpen(false)}
        assetIds={rowSelectionModel}
        onSuccess={() => {
          setBulkUpdateOpen(false);
          setRowSelectionModel([]);
          fetchAssets();
          toast.success('อัปเดตข้อมูลสำเร็จ');
        }}
      />
    </Box>
  );
}
