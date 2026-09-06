import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Chip, CircularProgress, Alert,
  Card, CardContent, Grid, Divider, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, InputAdornment, Checkbox, Paper, alpha, useTheme, IconButton, Collapse, Tabs, Tab,
  Autocomplete, Badge,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FilterListIcon from '@mui/icons-material/FilterList';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { borrowAPI } from '../../services/api';
import StatusChip from '../../components/StatusChip';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../utils/dateUtils';
import QRScannerModal from '../../components/QRScannerModal';
import { SignaturePad } from '../../components/SignaturePad';
import { EvidencePhotoPicker, type PendingPhoto } from '../../components/EvidencePhotoPicker';

const conditions = [
  { value: 'Normal', label: 'ปกติ' },
  { value: 'Damaged', label: 'เสียหาย' },
  { value: 'Repairing', label: 'ส่งซ่อม' },
  { value: 'AccessoryIncomplete', label: 'อุปกรณ์เสริมไม่ครบ' },
  { value: 'Lost', label: 'สูญหาย' },
];

interface BorrowItem {
  id: number;
  assetId?: number;
  assetCode: string;
  serialNo?: string;
  brand: string;
  model: string;
  borrowDate: string;
  dueDate?: string;
  itemStatus: string;
  isQuantityBased?: boolean;
  inventoryItemName?: string;
  inventoryQty?: number;
  inventoryUnit?: string;
  receiverName?: string;
}

interface RequestGroup {
  id: number;
  requestNo: string;
  requesterName: string;
  requesterDept: string;
  purpose: string;
  status: string;
  createdAt: string;
  items: BorrowItem[];
  returnedCount: number;
  pendingCount: number;
  receiverNames: string[];
}

interface FlatItem {
  id: number;
  assetId?: number;
  assetCode: string;
  serialNo?: string;
  brand: string;
  model: string;
  borrowDate: string;
  dueDate?: string;
  itemStatus: string;
  requestNo: string;
  requesterName: string;
  requesterDept: string;
  isQuantityBased?: boolean;
  inventoryItemName?: string;
  inventoryQty?: number;
  inventoryUnit?: string;
}

function RequestRow({ group, onReturn, defaultOpen = false }: { group: RequestGroup; onReturn: (items: BorrowItem[]) => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [selected, setSelected] = useState<number[]>([]);
  const theme = useTheme();
  const isOverdue = group.items.some(i => i.dueDate && new Date(i.dueDate) < new Date() && i.itemStatus === 'CheckedOut');
  const earliestDueDate = group.items
    .filter(i => i.itemStatus === 'CheckedOut' && i.dueDate)
    .map(i => new Date(i.dueDate as string).getTime())
    .sort((a, b) => a - b)[0];

  const toggleSelect = (itemId: number) => {
    setSelected(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  };

  const selectAllPending = () => {
    const pendingIds = group.items.filter(i => i.itemStatus === 'CheckedOut').map(i => i.id);
    setSelected(prev => prev.length === pendingIds.length ? [] : pendingIds);
  };

  const selectedItems = group.items.filter(i => selected.includes(i.id));

  return (
    <>
      <TableRow
        sx={{
          '& > *': { borderBottom: 'unset' },
          bgcolor: isOverdue ? alpha(theme.palette.error.main, 0.04) : 'inherit',
          borderLeft: isOverdue ? `2px solid ${theme.palette.error.main}` : '2px solid transparent',
        }}
      >
        <TableCell>
          <IconButton aria-label="ย่อ/ขยาย" size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{group.requestNo}</TableCell>
        <TableCell>
          <Typography fontWeight={600} sx={{ fontSize: '0.9rem' }}>{group.requesterName}</Typography>
          <Typography variant="caption" color="text.secondary">{group.requesterDept}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {group.purpose || '-'}
          </Typography>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={`${group.returnedCount}/${group.items.length} คืนแล้ว`}
              size="small"
              sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.dark, fontWeight: 700, fontSize: '0.75rem' }}
            />
            {group.pendingCount > 0 && (
              <Chip
                label={`${group.pendingCount} รอคืน`}
                size="small"
                sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.dark, fontWeight: 700, fontSize: '0.75rem' }}
              />
            )}
          </Box>
        </TableCell>
        <TableCell>
          {earliestDueDate ? (
            <Typography variant="body2" sx={{ fontWeight: isOverdue ? 700 : 'inherit', color: isOverdue ? 'error.main' : 'inherit' }}>
              {formatDate(earliestDueDate)}
              {isOverdue && ' ⚠️'}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">-</Typography>
          )}
        </TableCell>
        <TableCell>
          <StatusChip status={group.status} />
        </TableCell>
        <TableCell>
          {group.receiverNames.length > 0 ? (
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{group.receiverNames.join(', ')}</Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">-</Typography>
          )}
        </TableCell>
        <TableCell align="right">
          {group.pendingCount > 0 && (
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<AssignmentReturnIcon />}
              onClick={() => onReturn(group.items.filter(i => i.itemStatus === 'CheckedOut'))}
              sx={{ fontSize: '0.8rem' }}
            >
              คืนทั้งหมด ({group.pendingCount})
            </Button>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderRadius: '0 0 12px 12px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>รายการทรัพย์สินในคำขอนี้</Typography>
                {group.pendingCount > 0 && (
                  <Button size="small" onClick={selectAllPending} sx={{ fontSize: '0.8rem' }}>
                    {selected.length === group.pendingCount ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                  </Button>
                )}
              </Box>
              <TableContainer component={Paper} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell padding="checkbox" />
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>รหัสทรัพย์สิน</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Serial No.</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>ยี่ห้อ / รุ่น</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>วันที่ยืม</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>กำหนดคืน</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>สถานะ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.items.map((item) => {
                      const isItemOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.itemStatus === 'CheckedOut';
                      return (
                        <TableRow key={item.id} sx={{ bgcolor: isItemOverdue ? alpha(theme.palette.error.main, 0.05) : 'inherit' }}>
                          <TableCell padding="checkbox">
                            {item.itemStatus === 'CheckedOut' && (
                              <Checkbox
                                checked={selected.includes(item.id)}
                                onChange={() => toggleSelect(item.id)}
                                size="small"
                              />
                            )}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.assetCode}</TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>{item.isQuantityBased ? '-' : (item.serialNo || '-')}</TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>{item.brand} {item.model}</TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>{formatDate(item.borrowDate)}</TableCell>
                          <TableCell sx={{ color: isItemOverdue ? 'error.main' : 'inherit', fontWeight: isItemOverdue ? 700 : 'inherit', fontSize: '0.85rem' }}>
                            {item.dueDate ? (
                              <>{formatDate(item.dueDate)}
                              {isItemOverdue && ' ⚠️'}</>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusChip status={item.itemStatus === 'Returned' ? 'Returned' : 'CheckedOut'} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              {selected.length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Typography variant="body2" sx={{ alignSelf: 'center', color: 'text.secondary' }}>
                    เลือก {selected.length} รายการ
                  </Typography>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<AssignmentReturnIcon />}
                    onClick={() => onReturn(selectedItems)}
                  >
                    คืนรายการที่เลือก
                  </Button>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function ReturnPage() {
  const theme = useTheme();
  const toast = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const [groups, setGroups] = useState<RequestGroup[]>([]);
  const [flatItems, setFlatItems] = useState<FlatItem[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<RequestGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; items: BorrowItem[] }>({ open: false, items: [] });
  const [condition, setCondition] = useState('Normal');
  const [damageNote, setDamageNote] = useState('');
  const [accessoriesNote, setAccessoriesNote] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState(0);
  const [quickReturnMode, setQuickReturnMode] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [quickResults, setQuickResults] = useState<FlatItem[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await borrowAPI.allRequests({ limit: 200 });
      const requests = res.data.data || [];

      const flat: FlatItem[] = [];
      const grouped: RequestGroup[] = requests
        .filter((r: any) => r.items?.some((i: any) => ['CheckedOut', 'PartiallyReturned', 'Returned'].includes(i.itemStatus)))
        .map((r: any) => {
          const items: BorrowItem[] = (r.items || []).map((i: any): BorrowItem => {
            const isInv = i.isQuantityBased && i.inventoryItem;
            const returns = i.returns || [];
            const receiverName = returns.length > 0
              ? (returns[0].receiverName || returns[0].returner?.displayName || returns[0].returner?.adUsername || '')
              : '';
            const flatItem: FlatItem = {
              id: i.id,
              assetId: i.assetId || undefined,
              assetCode: isInv ? i.inventoryItem.name : (i.asset?.assetCode || ''),
              serialNo: isInv ? undefined : (i.asset?.serialNo || ''),
              brand: isInv ? i.inventoryItem.name : (i.asset?.brand || ''),
              model: isInv ? `จำนวน ${i.quantity} ${i.inventoryItem.unit}` : (i.asset?.model || ''),
              borrowDate: i.borrowDate || r.createdAt,
              dueDate: isInv ? undefined : (i.dueDate || ''),
              itemStatus: i.itemStatus,
              requestNo: r.requestNo,
              requesterName: r.requester?.displayName || 'N/A',
              requesterDept: r.requester?.department || '',
              isQuantityBased: !!isInv,
              inventoryItemName: isInv ? i.inventoryItem.name : undefined,
              inventoryQty: isInv ? i.quantity : undefined,
              inventoryUnit: isInv ? i.inventoryItem.unit : undefined,
            };
            flat.push(flatItem);
            return {
              id: i.id,
              assetId: i.assetId || undefined,
              assetCode: isInv ? i.inventoryItem.name : (i.asset?.assetCode || ''),
              serialNo: isInv ? undefined : (i.asset?.serialNo || ''),
              brand: isInv ? i.inventoryItem.name : (i.asset?.brand || ''),
              model: isInv ? `จำนวน ${i.quantity} ${i.inventoryItem.unit}` : (i.asset?.model || ''),
              borrowDate: i.borrowDate || r.createdAt,
              dueDate: isInv ? undefined : (i.dueDate || ''),
              itemStatus: i.itemStatus,
              isQuantityBased: !!isInv,
              inventoryItemName: isInv ? i.inventoryItem.name : undefined,
              inventoryQty: isInv ? i.quantity : undefined,
              inventoryUnit: isInv ? i.inventoryItem.unit : undefined,
              receiverName,
            };
          });
          const returnedCount = items.filter((i: BorrowItem) => i.itemStatus === 'Returned').length;
          const pendingCount = items.filter((i: BorrowItem) => i.itemStatus === 'CheckedOut').length;
          const receiverNames = [...new Set(items.map(i => i.receiverName).filter(Boolean))];

          return {
            id: r.id,
            requestNo: r.requestNo,
            requesterName: r.requester?.displayName || 'N/A',
            requesterDept: r.requester?.department || '',
            purpose: r.purpose || '',
            status: r.status,
            createdAt: r.createdAt,
            items,
            returnedCount,
            pendingCount,
            receiverNames,
          };
        })
        .filter((g: RequestGroup) => g.pendingCount > 0 || g.returnedCount > 0)
        .sort((a: RequestGroup, b: RequestGroup) => {
          const aOverdue = a.items.some((i: BorrowItem) => i.dueDate && new Date(i.dueDate) < new Date() && i.itemStatus === 'CheckedOut');
          const bOverdue = b.items.some((i: BorrowItem) => i.dueDate && new Date(i.dueDate) < new Date() && i.itemStatus === 'CheckedOut');
          if (aOverdue && !bOverdue) return -1;
          if (!aOverdue && bOverdue) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

      setGroups(grouped);
      setFlatItems(flat.filter(i => i.itemStatus === 'CheckedOut'));
      setFilteredGroups(grouped);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let filtered = groups;

    if (filterTab === 1) {
      filtered = filtered.filter(g => g.items.some(i => !i.isQuantityBased && i.dueDate && new Date(i.dueDate) < new Date() && i.itemStatus === 'CheckedOut'));
    } else if (filterTab === 2) {
      filtered = filtered.filter(g => g.pendingCount > 0);
    } else if (filterTab === 3) {
      filtered = filtered.filter(g => g.returnedCount > 0 && g.pendingCount === 0);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(g => {
        return (
          g.requestNo.toLowerCase().includes(search) ||
          g.requesterName.toLowerCase().includes(search) ||
          g.requesterDept.toLowerCase().includes(search) ||
          g.items.some(i => i.assetCode.toLowerCase().includes(search) || (i.serialNo || '').toLowerCase().includes(search))
        );
      });
    }

    setFilteredGroups(filtered);
  }, [searchTerm, filterTab, groups]);

  useEffect(() => {
    if (quickSearch.length >= 2) {
      const search = quickSearch.toLowerCase();
      const results = flatItems.filter(i =>
        i.assetCode.toLowerCase().includes(search) ||
        (i.serialNo || '').toLowerCase().includes(search) ||
        i.brand.toLowerCase().includes(search) ||
        i.model.toLowerCase().includes(search) ||
        (i.inventoryItemName || '').toLowerCase().includes(search)
      );
      setQuickResults(results);
    } else {
      setQuickResults([]);
    }
  }, [quickSearch, flatItems]);

  const handleReturnInit = (items: BorrowItem[]) => {
    setDialog({ open: true, items });
    setCondition('Normal');
    setDamageNote('');
    setAccessoriesNote('');
    setReceiverName('');
    setSignatureData(null);
    setPhotos([]);
  };

  const handleReturnSubmit = async () => {
    if (dialog.items.length === 0 || !condition) return;

    setProcessing(true);
    try {
      for (const item of dialog.items) {
        const res = await borrowAPI.returnItem(item.id, { condition, damageNote, accessoriesNote, receiverName, signatureData });
        const returnId = res.data?.returnId;
        if (returnId && photos.length > 0) {
          // Best-effort: the return itself already succeeded, so a photo
          // upload failure shouldn't roll back or block the flow — just
          // surface it and move on.
          for (const p of photos) {
            try { await borrowAPI.uploadReturnImage(returnId, p.file); }
            catch { toast.error('อัปโหลดรูปภาพบางรายการไม่สำเร็จ'); }
          }
        }
      }
      toast.success(`คืนทรัพย์สิน ${dialog.items.length} รายการสำเร็จ`);
      setDialog({ open: false, items: [] });
      setQuickSearch('');
      setQuickResults([]);
      setSignatureData(null);
      setPhotos([]);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickReturn = (item: FlatItem) => {
    handleReturnInit([{
      id: item.id,
      assetId: item.assetId,
      assetCode: item.assetCode,
      serialNo: item.serialNo,
      brand: item.brand,
      model: item.model,
      borrowDate: item.borrowDate,
      dueDate: item.dueDate,
      itemStatus: item.itemStatus,
    }]);
  };

  const totalPending = groups.reduce((sum, g) => sum + g.pendingCount, 0);
  const totalOverdue = groups.filter(g => g.items.some(i => !i.isQuantityBased && i.dueDate && new Date(i.dueDate) < new Date() && i.itemStatus === 'CheckedOut')).length;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700}>รับคืนทรัพย์สิน</Typography>
        <Typography variant="body1" color="text.secondary">ค้นหาและบันทึกการคืนทรัพย์สิน</Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}` }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">รอการคืน</Typography>
              <Typography variant="h4" fontWeight={800} color="primary.main">{totalPending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: `1px solid ${alpha(theme.palette.error.main, 0.15)}` }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">เกินกำหนด</Typography>
              <Typography variant="h4" fontWeight={800} color="error.main">{totalOverdue}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: `1px solid ${alpha(theme.palette.success.main, 0.15)}` }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">คืนแล้ว</Typography>
              <Typography variant="h4" fontWeight={800} color="success.main">{groups.reduce((s, g) => s + g.returnedCount, 0)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: 2.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              inputRef={searchRef}
              label="ค้นหา"
              fullWidth
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                endAdornment: searchTerm && <InputAdornment position="end"><ClearIcon sx={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} /></InputAdornment>,
              }}
              placeholder="เลขที่คำขอ, ผู้ยืม, แผนก, รหัสทรัพย์สิน, Serial No."
            />
            <Button
              variant={quickReturnMode ? 'contained' : 'outlined'}
              startIcon={<QrCodeScannerIcon />}
              onClick={() => { setQuickReturnMode(!quickReturnMode); setQuickSearch(''); setQuickResults([]); }}
              sx={{ minWidth: 160 }}
            >
              {quickReturnMode ? 'ปิดโหมดคืนด่วน' : 'คืนด่วน'}
            </Button>
            <Button variant="outlined" startIcon={<QrCodeScannerIcon />} onClick={() => setScannerOpen(true)}>
              สแกน QR รับคืน
            </Button>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Tabs value={filterTab} onChange={(e, v) => setFilterTab(v)} sx={{ minHeight: 36 }}>
              <Tab label={`ทั้งหมด (${groups.length})`} sx={{ minHeight: 36, py: 0, px: 2, fontSize: '0.85rem' }} />
              <Tab label={
                <Badge badgeContent={totalOverdue} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem' } }}>
                  <span>เกินกำหนด</span>
                </Badge>
              } sx={{ minHeight: 36, py: 0, px: 2, fontSize: '0.85rem' }} />
              <Tab label={`รอคืน (${groups.filter(g => g.pendingCount > 0).length})`} sx={{ minHeight: 36, py: 0, px: 2, fontSize: '0.85rem' }} />
              <Tab label={`คืนหมด (${groups.filter(g => g.pendingCount === 0 && g.returnedCount > 0).length})`} sx={{ minHeight: 36, py: 0, px: 2, fontSize: '0.85rem' }} />
            </Tabs>
          </Box>
        </Box>

        {quickReturnMode && (
          <Box sx={{ p: 2.5, bgcolor: alpha(theme.palette.primary.main, 0.03), borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <QrCodeScannerIcon fontSize="small" /> คืนด่วน - ค้นหาทรัพย์สินเพื่อคืนทันที
            </Typography>
            <Autocomplete
              freeSolo
              options={quickResults}
              getOptionLabel={(option) => typeof option === 'string' ? option : `${option.assetCode} - ${option.brand} ${option.model}`}
              inputValue={quickSearch}
              onInputChange={(e, val) => setQuickSearch(val)}
              onChange={(e, val) => {
                if (val && typeof val !== 'string') {
                  handleQuickReturn(val);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="พิมพ์รหัสทรัพย์สิน, Serial No., หรือชื่อวัสดุ"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id} sx={{ py: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={700}>{option.assetCode}</Typography>
                    <Typography variant="caption" color="text.secondary">{option.isQuantityBased ? `${option.inventoryItemName} x${option.inventoryQty} ${option.inventoryUnit}` : `${option.brand} ${option.model} | ${option.serialNo}`}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">{option.requestNo}</Typography>
                    <StatusChip status="CheckedOut" />
                  </Box>
                </Box>
              )}
              ListboxProps={{ sx: { maxHeight: 300 } }}
            />
          </Box>
        )}
      </Card>

      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ width: 50 }} />
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>เลขที่คำขอ</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>ผู้ยืม</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>วัตถุประสงค์</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>สถานะการคืน</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>กำหนดคืน</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>สถานะคำขอ</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>ผู้รับคืน</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>การกระทำ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">{groups.length === 0 ? 'ไม่มีรายการรอการคืน' : 'ไม่พบผลการค้นหา'}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredGroups.map(group => (
                <RequestRow
                  key={group.id}
                  group={group}
                  onReturn={handleReturnInit}
                  defaultOpen={filterTab === 1}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Return Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, items: [] })} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentReturnIcon color="success" />
            บันทึกการคืนทรัพย์สิน
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              รายการที่จะคืน ({dialog.items.length} รายการ)
            </Typography>
            {dialog.items.map(item => (
              <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, px: 1.5, bgcolor: 'action.hover', borderRadius: 1, mb: 0.5 }}>
                <Typography fontWeight={600}>{item.assetCode}</Typography>
                <Typography variant="body2" color="text.secondary">{item.isQuantityBased ? `${item.inventoryQty} ${item.inventoryUnit}` : `${item.brand} ${item.model}`}</Typography>
              </Box>
            ))}
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>สภาพเครื่อง *</InputLabel>
            <Select value={condition} label="สภาพเครื่อง *" onChange={(e) => { setCondition(e.target.value); setDamageNote(''); setAccessoriesNote(''); }}>
              {conditions.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField
            label="ผู้รับคืน"
            fullWidth
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder="ชื่อผู้รับคืนอุปกรณ์"
            sx={{ mb: 2 }}
            helperText="ระบุชื่อผู้ที่รับคืนอุปกรณ์ (ถ้ามี)"
          />

          {(condition === 'Damaged' || condition === 'Repairing') && (
            <TextField label="รายละเอียดความเสียหาย" fullWidth multiline rows={2} value={damageNote} onChange={(e) => setDamageNote(e.target.value)} placeholder="บรรยายสภาพเสียหาย" sx={{ mb: 2 }} />
          )}
          {condition === 'Lost' && (
            <TextField label="รายละเอียดการสูญหาย" fullWidth multiline rows={2} value={damageNote} onChange={(e) => setDamageNote(e.target.value)} placeholder="สถานการณ์ที่ทราบว่าสูญหาย" sx={{ mb: 2 }} />
          )}
          {condition === 'AccessoryIncomplete' && (
            <TextField label="อุปกรณ์เสริมที่ไม่ครบ" fullWidth multiline rows={2} value={accessoriesNote} onChange={(e) => setAccessoriesNote(e.target.value)} placeholder="ระบุอุปกรณ์ที่ไม่มา" sx={{ mb: 2 }} />
          )}

          <Box sx={{ mb: 2 }}>
            <EvidencePhotoPicker photos={photos} onChange={setPhotos} label="แนบภาพถ่ายสภาพตอนรับคืน" />
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
              ลายเซ็นผู้รับคืน
            </Typography>
            <SignaturePad onChange={setSignatureData} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, items: [] })}>ยกเลิก</Button>
          <Button variant="contained" color="success" onClick={handleReturnSubmit} disabled={processing || !condition}>
            {processing ? <CircularProgress size={20} /> : `ยืนยันการคืน ${dialog.items.length} รายการ`}
          </Button>
        </DialogActions>
      </Dialog>

      <QRScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(decoded) => {
          const match = flatItems.find(i => i.assetCode === decoded || i.serialNo === decoded);
          if (match) {
            handleQuickReturn(match);
          } else {
            setQuickReturnMode(true);
            setQuickSearch(decoded);
            toast.error(`ไม่พบทรัพย์สินที่กำลังยืมอยู่ตรงกับรหัส "${decoded}"`);
          }
        }}
      />
    </Box>
  );
}
