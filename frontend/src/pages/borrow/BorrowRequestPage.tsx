import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { assetAPI, borrowAPI, inventoryAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box, Typography, Card, CardContent, TextField, Select, MenuItem, FormControl,
  Button, Chip, IconButton, Tabs, Tab, InputAdornment, Snackbar, Alert,
  CircularProgress, alpha, useTheme, useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LockIcon from '@mui/icons-material/Lock';
import ShieldIcon from '@mui/icons-material/Shield';
import AssignmentIcon from '@mui/icons-material/Assignment';
import InventoryIcon from '@mui/icons-material/Inventory2';
import SendIcon from '@mui/icons-material/Send';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import { formatDate } from '../../utils/dateUtils';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { Laptop, Monitor, Printer, Smartphone, Mouse, Wifi, Package } from 'lucide-react';

const getMuiCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('notebook') || name.includes('laptop') || name.includes('macbook')) {
    return <Laptop size={18} />;
  }
  if (name.includes('monitor') || name.includes('จอ')) {
    return <Monitor size={18} />;
  }
  if (name.includes('printer') || name.includes('พิมพ์')) {
    return <Printer size={18} />;
  }
  if (name.includes('phone') || name.includes('mobile') || name.includes('โทรศัพท์')) {
    return <Smartphone size={18} />;
  }
  if (name.includes('mouse') || name.includes('เมาส์')) {
    return <Mouse size={18} />;
  }
  if (name.includes('wifi') || name.includes('router') || name.includes('network')) {
    return <Wifi size={18} />;
  }
  return <Package size={18} />;
};

// Shared borrow policy notice — used on both mobile (below the catalog) and desktop (below the summary card)
function PolicyCard({ maxItemsPerRequest, maxBorrowDays }: { maxItemsPerRequest: number; maxBorrowDays: number }) {
  const theme = useTheme();
  return (
    <Card sx={{ background: `linear-gradient(135deg, ${theme.palette.background.paper}, ${alpha(theme.palette.primary.main, 0.03)})`, mt: 1 }}>
      <CardContent sx={{ p: '16px 20px !important' }}>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: theme.palette.text.secondary, display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
          <ShieldIcon sx={{ fontSize: 18 }} /> นโยบายการยืมคืน
        </Typography>
        <Box sx={{ fontSize: '0.78rem', color: theme.palette.text.secondary, display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1.4 }}>
          <div>1. สามารถยืมทรัพย์สินและวัสดุสิ้นเปลืองได้ตามโควตาที่กำหนด</div>
          <div>2. จำนวนรายการที่ยืมได้สูงสุด: <Box component="strong" sx={{ color: 'primary.main' }}>{maxItemsPerRequest} รายการต่อคำขอ</Box></div>
          <div>3. ระยะเวลาการยืมสูงสุด: <Box component="strong" sx={{ color: 'primary.main' }}>{maxBorrowDays} วัน</Box></div>
          <Box sx={{ borderTop: `1px dashed ${theme.palette.divider}`, pt: 1, color: 'error.main' }}>
            4. กรุณาส่งคืนทรัพย์สินตรงเวลา หากมีรายการเกินกำหนดส่งคืน จะต้องคืนทรัพย์สินนั้นก่อนจึงจะยืมใหม่ได้
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function BorrowRequestPage() {
  const { user, systemSettings } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const effectiveBorrowDays = systemSettings?.borrowDays ?? parseInt(import.meta.env.VITE_BORROW_DUE_DAYS || '3');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialAssetId = searchParams.get('assetId');

  // Assets
  const [assets, setAssets] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>(initialAssetId ? [parseInt(initialAssetId)] : []);
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [assetHover, setAssetHover] = useState<any>(null);

  // Inventory
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<Array<{ item: any; qty: number }>>([]);
  const [invSearch, setInvSearch] = useState('');

  // Form
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + effectiveBorrowDays * 86400000).toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const defaultDue = new Date(Date.now() + effectiveBorrowDays * 86400000).toISOString().split('T')[0];
    setDueDate(prev => prev || defaultDue);
  }, [effectiveBorrowDays]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'ok' | 'err'>('ok');
  const [overdueItems, setOverdueItems] = useState<any[]>([]);
  const [blockedTypes, setBlockedTypes] = useState<string[]>([]);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => { setToast(msg); setToastType(type); setTimeout(() => setToast(''), 3500); };

  useEffect(() => {
    Promise.all([
      assetAPI.list({ status: 'Available', limit: 500 }),
      inventoryAPI.list({ limit: 500 }),
      borrowAPI.myItems(),
    ]).then(([aRes, iRes, itemsRes]) => {
      setAssets(aRes.data.data || []);
      setInventoryItems(iRes.data.data || []);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const overdue = (itemsRes.data || []).filter((item: any) => item.dueDate && new Date(item.dueDate) < now);
      setOverdueItems(overdue);
      const activeItems = (itemsRes.data || [])
        .filter((item: any) => ['Pending', 'Approved', 'CheckedOut'].includes(item.itemStatus))
        .map((item: any) => item.asset?.type)
        .filter(Boolean);
      const activeTypes = [...new Set(activeItems)] as string[];
      setBlockedTypes(activeTypes);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSelectedAssets(selected.map(id => assets.find((a: any) => a.id === id)).filter(Boolean));
  }, [selected, assets]);

  // Derived filter lists
  const allTypes = [...new Set(assets.map((a: any) => a.deviceType || a.category?.name || '').filter(Boolean))].sort();
  const allLocations = [...new Set(assets.map((a: any) => a.location || '').filter(Boolean))].sort();

  const filteredAssets = assets.filter(a =>
    (assetSearch === '' ||
      a.assetCode?.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.serialNo?.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.brand?.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.model?.toLowerCase().includes(assetSearch.toLowerCase())
    ) &&
    (filterType === '' || (a.deviceType || a.category?.name || '') === filterType) &&
    (filterLocation === '' || a.location === filterLocation)
  );

  const filteredInventory = inventoryItems.filter(i =>
    i.availableQuantity > 0 &&
    (invSearch === '' || i.name?.toLowerCase().includes(invSearch.toLowerCase()) || i.category?.toLowerCase().includes(invSearch.toLowerCase()))
  );

  const toggleAsset = (id: number) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const removeAsset = (id: number) => setSelected(prev => prev.filter(x => x !== id));

  const toggleInventory = (item: any) => {
    setSelectedInventory(prev => prev.find(s => s.item.id === item.id)
      ? prev.filter(s => s.item.id !== item.id)
      : [...prev, { item, qty: 1 }]);
  };
  const updateQty = (itemId: number, qty: number) => {
    setSelectedInventory(prev => prev.map(s => s.item.id === itemId
      ? { ...s, qty: Math.min(s.item.availableQuantity, Math.max(1, qty)) } : s));
  };

  const totalSelected = selected.length + selectedInventory.length;

  const getBorrowDurationText = () => {
    if (!dueDate) {
      return `(${effectiveBorrowDays} วัน)`;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDue = new Date(dueDate);
    selectedDue.setHours(0, 0, 0, 0);
    const diffTime = selectedDue.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (isNaN(diffDays) || diffDays < 0) return '';
    return `(${diffDays} วัน)`;
  };

  const handleSubmit = async () => {
    if (totalSelected === 0) { showToast('⚠ กรุณาเลือกทรัพย์สินหรือวัสดุอย่างน้อย 1 รายการ', 'err'); return; }
    if (!purpose.trim()) { showToast('⚠ กรุณากรอกวัตถุประสงค์การยืม', 'err'); return; }

    const maxItems = systemSettings?.maxItemsPerRequest ?? 5;
    if (totalSelected > maxItems) {
      showToast(`⚠ สามารถยืมได้สูงสุดไม่เกิน ${maxItems} รายการต่อคำขอ`, 'err');
      return;
    }

    const maxDays = systemSettings?.maxBorrowDays ?? 30;
    if (dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDue = new Date(dueDate);
      selectedDue.setHours(0, 0, 0, 0);
      const diffTime = selectedDue.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > maxDays) {
        showToast(`⚠ ระยะเวลาการยืมสูงสุดไม่เกิน ${maxDays} วัน`, 'err');
        return;
      }
    }

    setSubmitting(true);
    try {
      await borrowAPI.createRequest({
        assetIds: selected,
        inventoryItems: selectedInventory.map(s => ({ inventoryItemId: s.item.id, quantity: s.qty })),
        purpose, notes, location,
        dueDate: dueDate || new Date(Date.now() + effectiveBorrowDays * 86400000).toISOString().split('T')[0],
      });
      showToast('✅ ส่งคำขอยืมเรียบร้อยแล้ว');
      setTimeout(() => navigate('/borrow/my-requests'), 1500);
    } catch (err: any) {
      showToast(`❌ ${err.response?.data?.error || 'เกิดข้อผิดพลาด'}`, 'err');
    } finally { setSubmitting(false); }
  };

  const maxItemsPerRequest = systemSettings?.maxItemsPerRequest ?? 5;
  const maxBorrowDays = systemSettings?.maxBorrowDays ?? 30;
  const submitDisabled = submitting || totalSelected === 0 || !purpose.trim() || overdueItems.length > 0;

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
        <CircularProgress size={32} sx={{ mb: 1 }} />
        <div>กำลังโหลดรายการ...</div>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ pb: isMobile ? 15 : 6, px: isMobile ? 1 : 0, maxWidth: 1200, mx: 'auto' }}>
      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast('')} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={toastType === 'ok' ? 'success' : 'error'} onClose={() => setToast('')} sx={{ fontWeight: 600 }}>
          {toast}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Box sx={{ mb: 3.5 }}>
        <Typography variant="h5" fontWeight={800} color="text.primary">ยืมทรัพย์สิน</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>เลือกรายการที่ต้องการยืม แล้วกรอกรายละเอียด</Typography>
      </Box>

      {overdueItems.length > 0 && (
        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 3, borderRadius: '14px' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.92rem', mb: 0.5 }}>
            คุณมีรายการยืมที่เกินกำหนดส่งคืน กรุณาส่งคืนหรือขอต่อเวลาก่อนทำการยืมใหม่
          </Typography>
          <Box sx={{ fontSize: '0.8rem', mt: 1 }}>
            <Box component="strong" sx={{ display: 'block', mb: 0.75 }}>รายการที่เกินกำหนด:</Box>
            <Box component="ul" sx={{ m: '4px 0 0', pl: 2.5 }}>
              {overdueItems.map((item: any) => (
                <li key={item.id}>
                  {item.asset ? `${item.asset.assetCode} - ${item.asset.brand} ${item.asset.model}` : item.inventoryItem?.name}{' '}
                  ({formatDate(item.dueDate)})
                </li>
              ))}
            </Box>
          </Box>
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: isMobile ? 2 : 3, alignItems: 'start' }}>
        {/* Left: Form + Selection */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Borrow Info Card */}
          <Card>
            <CardContent sx={{ p: '20px 24px !important' }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AssignmentIcon sx={{ fontSize: 20, color: 'primary.main' }} /> ข้อมูลการยืม
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 1.75 }}>
                <TextField
                  sx={{ gridColumn: '1 / -1' }}
                  label="วัตถุประสงค์การยืม"
                  required
                  multiline
                  rows={2}
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="เช่น ใช้ในการประชุม, ใช้สำหรับโปรเจกต์ XYZ"
                  error={submitting && purpose.trim() === ''}
                />
                <TextField
                  label="สถานที่/หน่วยงานที่ใช้งาน"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="เช่น สำนักงานใหญ่ ชั้น 5"
                />
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">กำหนดคืน</Typography>
                    <Typography variant="caption" fontWeight={800} color="primary.main">{getBorrowDurationText()}</Typography>
                  </Box>
                  <DatePicker
                    format="DD/MM/YYYY"
                    value={dueDate ? dayjs(dueDate) : null}
                    onChange={(newVal) => setDueDate(newVal ? newVal.format('YYYY-MM-DD') : '')}
                    minDate={dayjs()}
                    maxDate={dayjs().add(maxBorrowDays, 'day')}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                    ค่าเริ่มต้น {effectiveBorrowDays} วันนับจากวันนี้ (สูงสุด {maxBorrowDays} วัน)
                  </Typography>
                </Box>
                <TextField
                  sx={{ gridColumn: '1 / -1' }}
                  label="หมายเหตุ"
                  multiline
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)"
                />
              </Box>
            </CardContent>
          </Card>

          {/* Asset / Inventory Selection Card */}
          <Card>
            <CardContent sx={{ p: '20px 24px !important' }}>
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2, minHeight: 40 }}>
                <Tab label={`อุปกรณ์และทรัพย์สิน (${assets.length})`} sx={{ minHeight: 40 }} />
                <Tab label={`วัสดุสิ้นเปลือง (${inventoryItems.filter(i => i.availableQuantity > 0).length})`} sx={{ minHeight: 40 }} />
              </Tabs>

              {activeTab === 0 ? (
                <>
                  {/* Quick Filters */}
                  <Box sx={{ display: 'flex', gap: 0.75, mb: 1.75, overflowX: 'auto', pb: 0.5, scrollbarWidth: 'none' }}>
                    <Chip
                      label="ทั้งหมด"
                      onClick={() => setFilterType('')}
                      color={filterType === '' ? 'primary' : 'default'}
                      variant={filterType === '' ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 700, flexShrink: 0 }}
                    />
                    {allTypes.map(t => (
                      <Chip
                        key={t}
                        label={t}
                        onClick={() => setFilterType(t)}
                        color={filterType === t ? 'primary' : 'default'}
                        variant={filterType === t ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 700, flexShrink: 0 }}
                      />
                    ))}
                  </Box>

                  {/* Search & Location Filter */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: 1.25, mb: 1.75 }}>
                    <TextField
                      size="small"
                      value={assetSearch}
                      onChange={e => setAssetSearch(e.target.value)}
                      placeholder="ค้นหา รหัส / ชื่อ / Serial / ยี่ห้อ / รุ่น"
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
                      }}
                    />
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <Select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} displayEmpty>
                        <MenuItem value="">ทุกสถานที่</MenuItem>
                        {allLocations.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Active filters */}
                  {(filterType || filterLocation) && (
                    <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, flexWrap: 'wrap' }}>
                      {filterType && <Chip size="small" color="primary" label={filterType} onDelete={() => setFilterType('')} sx={{ fontWeight: 600 }} />}
                      {filterLocation && <Chip size="small" color="primary" icon={<LocationOnIcon sx={{ fontSize: 14 }} />} label={filterLocation} onDelete={() => setFilterLocation('')} sx={{ fontWeight: 600 }} />}
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
                    <Typography variant="caption" color="text.secondary">พบ <Box component="strong">{filteredAssets.length}</Box> รายการ</Typography>
                    <Chip
                      size="small"
                      label={`เลือกแล้ว ${selected.length}`}
                      color={selected.length > 0 ? 'success' : 'default'}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>

                  {/* Catalog Card Grid */}
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 2,
                    maxHeight: 400,
                    overflowY: 'auto',
                    p: '6px 4px',
                    scrollbarWidth: 'thin',
                  }}>
                    {filteredAssets.length === 0 ? (
                      <Box sx={{ gridColumn: '1 / -1', p: 6, textAlign: 'center', color: 'text.disabled' }}>
                        ไม่พบรายการทรัพย์สินที่พร้อมยืม
                      </Box>
                    ) : filteredAssets.map((a) => {
                      const isSelected = selected.includes(a.id);
                      const isTypeBlocked = a.type && blockedTypes.includes(a.type);

                      return (
                        <Box
                          key={a.id}
                          onClick={() => !isTypeBlocked && toggleAsset(a.id)}
                          sx={{
                            bgcolor: isTypeBlocked ? 'action.hover' : isSelected ? alpha(theme.palette.primary.main, 0.06) : 'background.paper',
                            border: `1.5px solid ${isSelected ? theme.palette.primary.main : theme.palette.divider}`,
                            borderRadius: '14px',
                            p: 2,
                            cursor: isTypeBlocked ? 'not-allowed' : 'pointer',
                            opacity: isTypeBlocked ? 0.65 : 1,
                            boxShadow: isSelected ? `0 10px 15px -3px ${alpha(theme.palette.primary.main, 0.1)}` : '0 1px 3px rgba(0,0,0,0.04)',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: 1.5,
                          }}
                        >
                          {/* Card Header: Category Icon & Selection indicator */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{
                              width: 36, height: 36, borderRadius: '10px',
                              bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.15) : 'action.hover',
                              color: isSelected ? 'primary.main' : 'text.secondary',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {getMuiCategoryIcon(a.deviceType || a.category?.name || '')}
                            </Box>
                            <Box sx={{
                              width: 20, height: 20, borderRadius: '50%',
                              border: `2px solid ${isSelected ? theme.palette.primary.main : theme.palette.divider}`,
                              bgcolor: isSelected ? 'primary.main' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s',
                            }}>
                              {isSelected && <CheckIcon sx={{ fontSize: 13, color: '#fff' }} />}
                            </Box>
                          </Box>

                          {/* Card Content */}
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontWeight: 800, fontSize: '0.925rem', mb: 0.25, wordBreak: 'break-word' }}>
                              {a.assetName || a.assetCode}
                            </Typography>
                            {a.assetName && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                                {a.assetCode}
                              </Typography>
                            )}
                            <Box sx={{ fontSize: '0.78rem', color: 'text.secondary', display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                              {a.brand && <Box component="span" sx={{ bgcolor: 'action.hover', px: 1, py: 0.25, borderRadius: '20px' }}>{a.brand} {a.model}</Box>}
                              {a.serialNo && <Box component="span" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>S/N: {a.serialNo}</Box>}
                            </Box>

                            {(a.cpu || a.ram || a.os) && (
                              <Box sx={{
                                fontSize: '0.72rem', color: 'secondary.main',
                                bgcolor: alpha(theme.palette.secondary.main, 0.06),
                                p: '4px 8px', borderRadius: '8px', mt: 0.5,
                              }}>
                                {a.cpu && <span>CPU: {a.cpu} </span>}
                                {a.ram && <span>RAM: {a.ram} </span>}
                              </Box>
                            )}
                          </Box>

                          {/* Card Footer: Location & Lock */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${theme.palette.divider}`, pt: 1 }}>
                            <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                              <LocationOnIcon sx={{ fontSize: 13 }} /> {a.location || 'ไม่ระบุสถานที่'}
                            </Typography>
                            {isTypeBlocked && (
                              <Typography
                                variant="caption"
                                sx={{ color: 'error.main', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.25 }}
                                title={`คุณยืม "${a.type}" อยู่แล้ว กรุณาคืนก่อนจึงจะยืมเพิ่มได้`}
                              >
                                <LockIcon sx={{ fontSize: 12 }} /> จำกัดสิทธิ์
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </>
              ) : (
                <>
                  <TextField
                    fullWidth
                    size="small"
                    value={invSearch}
                    onChange={e => setInvSearch(e.target.value)}
                    placeholder="ค้นหาวัสดุ..."
                    sx={{ mb: 1.75 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
                    }}
                  />
                  {isMobile ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, maxHeight: 400, overflowY: 'auto', py: 0.5, scrollbarWidth: 'none' }}>
                      {filteredInventory.length === 0 ? (
                        <Box sx={{ p: 4, textAlign: 'center', color: 'text.disabled' }}>ไม่มีวัสดุให้ยืม</Box>
                      ) : filteredInventory.map((item) => {
                        const isSel = selectedInventory.some(s => s.item.id === item.id);
                        return (
                          <Box key={item.id} onClick={() => toggleInventory(item)}
                            sx={{
                              display: 'flex', gap: 1.5, alignItems: 'center',
                              p: '14px 16px', borderRadius: '12px',
                              border: `2px solid ${isSel ? theme.palette.success.main : theme.palette.divider}`,
                              bgcolor: isSel ? alpha(theme.palette.success.main, 0.06) : 'background.paper',
                              cursor: 'pointer',
                              boxShadow: isSel ? `0 2px 8px ${alpha(theme.palette.success.main, 0.15)}` : '0 1px 2px rgba(0,0,0,0.04)',
                              transition: 'all 0.2s',
                            }}
                          >
                            <Box sx={{
                              width: 24, height: 24, flexShrink: 0, borderRadius: '6px',
                              border: `2px solid ${isSel ? theme.palette.success.main : theme.palette.divider}`,
                              bgcolor: isSel ? 'success.main' : 'background.paper',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {isSel && <CheckIcon sx={{ fontSize: 16, color: '#fff' }} />}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', mb: 0.25 }}>{item.name}</Typography>
                              <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', gap: 0.75 }}>
                                <Box component="span" sx={{ bgcolor: 'action.hover', px: 1, py: 0.25, borderRadius: '12px' }}>{item.category}</Box>
                              </Box>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="caption" fontWeight={700} color="text.disabled">คงเหลือ</Typography>
                              <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: 'success.main' }}>{item.availableQuantity} <Box component="span" sx={{ fontSize: '0.75rem' }}>{item.unit}</Box></Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '10px', overflow: 'hidden', maxHeight: 350, overflowY: 'auto' }}>
                      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                        <Box component="thead">
                          <Box component="tr" sx={{ bgcolor: 'action.hover', position: 'sticky', top: 0 }}>
                            <Box component="th" sx={{ p: '10px 12px', width: 36 }} />
                            <Box component="th" sx={{ p: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'text.disabled' }}>ชื่อรายการ</Box>
                            <Box component="th" sx={{ p: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'text.disabled' }}>หมวด</Box>
                            <Box component="th" sx={{ p: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'text.disabled' }}>คงเหลือ</Box>
                          </Box>
                        </Box>
                        <Box component="tbody">
                          {filteredInventory.length === 0 ? (
                            <Box component="tr"><Box component="td" colSpan={4} sx={{ p: 4, textAlign: 'center', color: 'text.disabled' }}>ไม่มีวัสดุให้ยืม</Box></Box>
                          ) : filteredInventory.map((item, idx) => {
                            const isSel = selectedInventory.some(s => s.item.id === item.id);
                            return (
                              <Box component="tr" key={item.id} onClick={() => toggleInventory(item)}
                                sx={{ borderTop: idx > 0 ? `1px solid ${theme.palette.divider}` : 'none', bgcolor: isSel ? alpha(theme.palette.success.main, 0.06) : 'transparent', cursor: 'pointer' }}>
                                <Box component="td" sx={{ p: '10px 12px' }}>
                                  <Box sx={{ width: 18, height: 18, borderRadius: '4px', border: `2px solid ${isSel ? theme.palette.success.main : theme.palette.divider}`, bgcolor: isSel ? 'success.main' : 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {isSel && <CheckIcon sx={{ fontSize: 12, color: '#fff' }} />}
                                  </Box>
                                </Box>
                                <Box component="td" sx={{ p: '10px 12px', fontWeight: 600 }}>{item.name}</Box>
                                <Box component="td" sx={{ p: '10px 12px' }}><Chip size="small" label={item.category} sx={{ fontSize: '0.72rem' }} /></Box>
                                <Box component="td" sx={{ p: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'success.main' }}>{item.availableQuantity} {item.unit}</Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Policy Card on Mobile */}
          {isMobile && <PolicyCard maxItemsPerRequest={maxItemsPerRequest} maxBorrowDays={maxBorrowDays} />}
        </Box>

        {/* Right: Summary Card (sticky) */}
        <Box sx={{
          position: isMobile ? 'fixed' : 'sticky',
          bottom: isMobile ? 0 : undefined,
          top: isMobile ? undefined : 20,
          left: 0, right: 0,
          zIndex: isMobile ? 1000 : 1,
          p: isMobile ? '12px 16px' : 0,
          bgcolor: isMobile ? alpha(theme.palette.background.paper, 0.95) : 'transparent',
          backdropFilter: isMobile ? 'blur(10px)' : 'none',
          borderTop: isMobile ? `1px solid ${theme.palette.divider}` : 'none',
          boxShadow: isMobile ? '0 -4px 20px rgba(0,0,0,0.12)' : 'none',
        }}>
          {isMobile ? (
            /* Mobile Quick Summary Bar */
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', maxWidth: 600, mx: 'auto' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">รายการที่เลือก</Typography>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: totalSelected > 0 ? 'primary.main' : 'text.disabled' }}>{totalSelected} รายการ</Typography>
              </Box>
              <Button variant="outlined" color="inherit" onClick={() => navigate('/borrow/my-requests')}>ยกเลิก</Button>
              <Button variant="contained" onClick={handleSubmit} disabled={submitDisabled}>
                {submitting ? <CircularProgress size={18} color="inherit" /> : overdueItems.length > 0 ? 'ยืมไม่ได้' : 'ส่งคำขอ'}
              </Button>
            </Box>
          ) : (
            <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ p: '20px 22px !important' }}>
                <Typography sx={{ fontSize: '1rem', fontWeight: 700 }}>สรุปการยืม</Typography>
                <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, mt: 1.5, pt: 1.75 }}>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ textTransform: 'uppercase', display: 'block', mb: 0.25 }}>ผู้ขอ</Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{user?.displayName || user?.adUsername || '-'}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ textTransform: 'uppercase', display: 'block', mb: 0.25 }}>รายการที่เลือก</Typography>
                    <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: totalSelected > 0 ? 'primary.main' : 'text.disabled' }}>{totalSelected}</Typography>
                  </Box>

                  {/* Selected items list */}
                  <Box sx={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.875, mb: 2 }}>
                    {selectedAssets.map(a => (
                      <Box key={a.id} sx={{ p: '10px 12px', bgcolor: alpha(theme.palette.primary.main, 0.05), border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`, borderRadius: '9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.assetCode}</Typography>
                          <Typography variant="caption" color="text.secondary">{a.brand} {a.model}</Typography>
                        </Box>
                        <IconButton size="small" onClick={() => removeAsset(a.id)}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
                      </Box>
                    ))}
                    {selectedInventory.map(({ item, qty }) => (
                      <Box key={item.id} sx={{ p: '10px 12px', bgcolor: alpha(theme.palette.success.main, 0.05), border: `1px solid ${alpha(theme.palette.success.main, 0.25)}`, borderRadius: '9px' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{item.name}</Typography>
                          <IconButton size="small" onClick={() => setSelectedInventory(prev => prev.filter(s => s.item.id !== item.id))}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton size="small" onClick={() => updateQty(item.id, qty - 1)} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '6px', width: 24, height: 24 }}><RemoveIcon sx={{ fontSize: 14 }} /></IconButton>
                          <Typography sx={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{qty}</Typography>
                          <IconButton size="small" onClick={() => updateQty(item.id, qty + 1)} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '6px', width: 24, height: 24 }}><AddIcon sx={{ fontSize: 14 }} /></IconButton>
                          <Typography variant="caption" color="text.secondary">{item.unit} (คงเหลือ {item.availableQuantity})</Typography>
                        </Box>
                      </Box>
                    ))}
                    {totalSelected === 0 && (
                      <Box sx={{ p: 2.5, textAlign: 'center', color: 'text.disabled', fontSize: '0.85rem' }}>
                        <AssignmentIcon sx={{ fontSize: 30, mb: 0.75, opacity: 0.5 }} />
                        <div>ยังไม่มีรายการที่เลือก</div>
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, pt: 1.75 }}>
                    <Typography variant="caption" color="text.disabled" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <InfoOutlinedIcon sx={{ fontSize: 14 }} /> กำหนดคืนอัตโนมัติ <Box component="strong" sx={{ color: 'text.secondary' }}>{effectiveBorrowDays} วัน</Box> นับจากวันที่ยืม (สูงสุด {maxBorrowDays} วัน)
                    </Typography>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSubmit}
                      disabled={submitDisabled}
                      startIcon={submitting ? undefined : <SendIcon sx={{ fontSize: 16 }} />}
                      sx={{ mb: 1 }}
                      title={overdueItems.length > 0 ? 'คุณไม่สามารถยืมใหม่ได้ เนื่องจากมีรายการค้างส่งคืนเกินกำหนด' : ''}
                    >
                      {submitting ? <CircularProgress size={18} color="inherit" /> : overdueItems.length > 0 ? 'คุณไม่สามารถยืมใหม่ได้' : `ส่งคำขอยืม${totalSelected > 0 ? ` (${totalSelected} รายการ)` : ''}`}
                    </Button>
                    <Button fullWidth variant="outlined" color="inherit" onClick={() => navigate('/borrow/my-requests')}>
                      ยกเลิก
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Policy Card on Desktop */}
          {!isMobile && <PolicyCard maxItemsPerRequest={maxItemsPerRequest} maxBorrowDays={maxBorrowDays} />}
        </Box>
      </Box>
    </Box>
  );
}
