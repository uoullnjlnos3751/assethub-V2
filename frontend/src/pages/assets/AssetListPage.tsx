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
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Pagination,
  Popover,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PageviewIcon from '@mui/icons-material/Pageview';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import TableViewIcon from '@mui/icons-material/TableView';
import GridViewIcon from '@mui/icons-material/GridView';
import DensitySmallIcon from '@mui/icons-material/DensitySmall';
import DensityLargeIcon from '@mui/icons-material/DensityLarge';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ExtensionIcon from '@mui/icons-material/Extension';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
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
import { PresetView, isPresetActive, presetsFor } from './components/presetViews';
import AssetQuickViewDrawer from './components/AssetQuickViewDrawer';
import ColumnPickerDialog from './components/ColumnPickerDialog';
import ExtendBorrowDialog from './components/ExtendBorrowDialog';
import AssetRowActionsMenu from './components/AssetRowActionsMenu';
import AssetKpiStrip from './components/AssetKpiStrip';
import { AssetSummarySidebar } from './components/AssetSummarySidebar';
import { assetColumnMap } from './components/assetListColumns';
import {
  ColumnConfig,
  statusLabels,
  warrantyStatusLabels,
  typeGroupLabels,
  typeGroupIcons,
  typeGroupDescriptions,
  loadColumnConfig,
  COLUMN_PREF_KEY,
  VIEW_MODE_KEY,
  DENSITY_KEY,
} from './assetListConfig';
import { useConfirm } from '../../contexts/ConfirmContext';
import { PageHeader } from '../../components/PageHeader';

export default function AssetListPage() {
  const { user } = useAuth();
  const toast = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchParams, setSearchParams] = useSearchParams();
  const [assets, setAssets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statuses, setStatuses] = useState<string[]>(searchParams.get('status') ? [searchParams.get('status') as string] : []);
  const [type, setType] = useState(searchParams.get('type') || '');
  const typeGroup = searchParams.get('typeGroup') || '';
  // Read at component level, not inside fetchAssets, so it can sit in the
  // effect's dep array — otherwise clicking the link from /assets would change
  // the URL without refetching.
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
  // The nine sidebar entries that were only ever /assets with one query
  // parameter now live here instead. See components/presetViews.ts.
  const presets = presetsFor(user?.role);
  const applyPreset = (v: PresetView) => {
    clearAllFilters();
    setSearchParams(new URLSearchParams(v.params));
    setSavedViewsAnchor(null);
  };
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
    assetAPI.typeOptions(true).then((res) => setTypeOptions(res.data)).catch(() => setTypeOptions([]));
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

  // Shared by fetchAssets and fetchSummary so the results-summary sidebar can
  // never disagree with what the table is actually showing — same filters,
  // same resolved __EMPTY__/typeGroup fallbacks, just without paging.
  const buildFilterParams = (overrideSearch?: string) => {
    const qSerialNo = searchParams.get('serialNo');
    const qLocation = searchParams.get('location');
    const qCompany = searchParams.has('company') ? searchParams.get('company') : null;
    const qType = searchParams.has('type') ? searchParams.get('type') : null;
    return {
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
    };
  };

  // Guards against out-of-order responses: rapid filter changes (e.g. debounced
  // search firing while a slower unfiltered request is still in flight) could
  // otherwise let an older response overwrite newer state.
  const fetchSeq = useRef(0);
  const fetchAssets = async (overrideSearch?: string) => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    try {
      const res = await assetAPI.list({
        ...buildFilterParams(overrideSearch),
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

  // Results-summary sidebar (count / total value / breakdown by dimension) —
  // admin/viewer only, same spirit as the InvGate-style Explorer sidebar in
  // docs/ITAM-V3's reference material.
  const [summary, setSummary] = useState<{ total: number; totalValue: number; dimension: string; breakdown: { label: string; count: number }[] } | null>(null);
  const [summaryDimension, setSummaryDimension] = useState('location');
  const [summaryLoading, setSummaryLoading] = useState(true);
  const showSummarySidebar = !isMobile && !isAvailableOnlyView;
  const summarySeq = useRef(0);
  const fetchSummary = async (overrideSearch?: string) => {
    if (!showSummarySidebar) return;
    const seq = ++summarySeq.current;
    setSummaryLoading(true);
    try {
      const res = await assetAPI.summary({ ...buildFilterParams(overrideSearch), dimension: summaryDimension });
      if (seq !== summarySeq.current) return;
      setSummary(res.data);
    } catch {
      if (seq === summarySeq.current) setSummary(null);
    } finally {
      if (seq === summarySeq.current) setSummaryLoading(false);
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

  // Summary sidebar reacts to every filter EXCEPT paging (the total/breakdown
  // describe the whole filtered set, not one page of it) plus its own
  // dimension picker.
  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses, type, typeGroup, selectedCategoryId, company, warrantyStatus, purchaseDateFrom, purchaseDateTo, summaryDimension, showSummarySidebar]);

  const urlSearch = searchParams.get('search');
  useEffect(() => {
    if (urlSearch !== null) {
      setSearch(urlSearch);
      setPage(0);
      fetchAssets(urlSearch);
      fetchSummary(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch]);

  const handleSearch = () => { setPage(0); fetchAssets(); fetchSummary(); };

  // Debounced "search as you type" — the Enter key / button above still work instantly too.
  const isFirstSearchEffect = useRef(true);
  useEffect(() => {
    if (isFirstSearchEffect.current) { isFirstSearchEffect.current = false; return; }
    const t = setTimeout(() => { setPage(0); fetchAssets(); fetchSummary(); }, 400);
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

  const confirm = useConfirm();
  const handleDelete = async (id: number) => {
    if (await confirm({
      title: 'ลบทรัพย์สิน',
      target: assets.find(a => a.id === id)?.assetCode || `#${id}`,
      detail: 'ประวัติการยืม ประวัติ PM และเอกสารแนบของเครื่องนี้จะถูกลบไปด้วย',
    })) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statuses, type, company, warrantyStatus, purchaseDateFrom, purchaseDateTo]);

  const advancedFilterCount = (warrantyStatus ? 1 : 0) + (purchaseDateFrom || purchaseDateTo ? 1 : 0);

  const columns = useMemo<GridColDef[]>(() => {
    const selectedColumns = columnConfig
      .filter((config) => config.visible)
      .map((config) => assetColumnMap[config.field])
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
                  <IconButton aria-label="ดูรายละเอียด" size="small" onClick={() => navigate(`/assets/${row.id}`)} color="primary">
                    <PageviewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              {/* Secondary Actions (More Menu) */}
              <Tooltip title="จัดการเพิ่มเติม">
                <IconButton aria-label="จัดการเพิ่มเติม"
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
  }, [columnConfig, navigate, isAdmin]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, row: any) => {
    setMenuAnchor({ element: event.currentTarget, row });
  };

  const handleMenuClose = () => {
    setMenuAnchor({ element: null, row: null });
  };

  const showGridView = !isAvailableOnlyView && isAdmin && !isMobile && viewMode === 'grid';

  return (
    <Box>
      <PageHeader
        title={isAvailableOnlyView ? 'รายการอุปกรณ์พร้อมยืม' : typeGroupLabels[typeGroup] || 'ทะเบียนทรัพย์สิน'}
        subtitle={isAvailableOnlyView ? 'เลือกอุปกรณ์ที่ต้องการยืมเพื่อส่งคำขอ' : 'จัดการและติดตามทรัพย์สินทั้งหมดในระบบ'}
        count={isAvailableOnlyView ? undefined : total}
        actions={<Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: isMobile ? 1 : 0, width: isMobile ? '100%' : 'auto' }}>
          {isAdmin && (
            <IconButton aria-label="ตั้งค่า"
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
        </Box>}
      />

      <AssetKpiStrip
        isAvailableOnlyView={isAvailableOnlyView}
        statsLoading={statsLoading}
        categoryStats={categoryStats}
        statuses={statuses}
        setStatuses={setStatuses}
        setPage={setPage}
      />

      {/* Table + results-summary sidebar side by side on desktop — the
          sidebar hides itself below `lg` (AssetSummarySidebar's own
          `display: { xs: 'none', lg: 'flex' }`), so this row collapses to a
          single column on tablet/mobile without any extra logic here. */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
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
            มุมมอง{savedViews.length > 0 ? ` (${savedViews.length})` : ''}
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

      <Menu anchorEl={savedViewsAnchor} open={Boolean(savedViewsAnchor)} onClose={() => setSavedViewsAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 240 } } }}>
        <ListSubheader sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em', lineHeight: 2.4 }}>
          มุมมองมาตรฐาน
        </ListSubheader>
        {presets.map((v) => (
          <MenuItem key={v.key} selected={isPresetActive(v, searchParams)} onClick={() => applyPreset(v)}
            sx={{ fontSize: 13 }}>
            {v.label}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => { setSavedViewsAnchor(null); setSaveViewDialogOpen(true); }} sx={{ fontSize: 13 }}>
          <BookmarkAddIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} /> บันทึกตัวกรองปัจจุบัน...
        </MenuItem>
        {savedViews.length > 0 && <Divider />}
        {savedViews.map((v) => (
          <MenuItem key={v.id} onClick={() => applySavedView(v)} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <span>{v.name}</span>
            <IconButton aria-label="ลบ"
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
                      <Button size="small" variant="outlined" color="warning" startIcon={<ExtensionIcon />} onClick={() => setExtendDialog({ open: true, item })} sx={{ flex: 1 }}>ขยายวัน</Button>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      <ExtendBorrowDialog
        open={extendDialog.open}
        item={extendDialog.item}
        onClose={() => setExtendDialog({ open: false, item: null })}
        onSuccess={() => setExtendDialog({ open: false, item: null })}
      />

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

      <AssetQuickViewDrawer
        open={quickView.open}
        asset={quickView.asset}
        onClose={() => setQuickView({ open: false, asset: null })}
        onViewFull={(id) => navigate(`/assets/${id}`)}
      />

      <ColumnPickerDialog
        open={columnDialogOpen}
        onClose={() => setColumnDialogOpen(false)}
        columnConfig={columnConfig}
        setColumnConfig={setColumnConfig}
        columnSearch={columnSearch}
        setColumnSearch={setColumnSearch}
      />

      <AssetRowActionsMenu
        anchorEl={menuAnchor.element}
        row={menuAnchor.row}
        onClose={handleMenuClose}
        user={user}
        isAvailableOnlyView={isAvailableOnlyView}
        navigate={navigate}
        onDelete={handleDelete}
        onOpenColumnDialog={() => setColumnDialogOpen(true)}
      />

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

      {showSummarySidebar && (
        <AssetSummarySidebar
          loading={summaryLoading}
          summary={summary}
          dimension={summaryDimension}
          onDimensionChange={setSummaryDimension}
        />
      )}
      </Box>
    </Box>
  );
}
