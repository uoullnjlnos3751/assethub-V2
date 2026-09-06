import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Select, MenuItem, FormControl, InputLabel,
  ToggleButtonGroup, ToggleButton, Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox, Autocomplete,
  Tabs, Tab, Paper, alpha, useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Package, PackagePlus, Truck, ClipboardCheck, ListChecks, CalendarClock, RotateCcw, BarChart3, Recycle, Settings2 } from 'lucide-react';
import { deliveryAPI, assetAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import StatusChip from '../../components/StatusChip';
import { SectionCard } from '../../components/SectionCard';
import { KpiCard } from '../dashboard/components/KpiCard';
import SetupChecklistTab from './SetupChecklistTab';

const DELIVERY_TYPE_LABELS: Record<string, string> = {
  NEW_PURCHASE: 'เครื่องใหม่',
  RECYCLED: 'เครื่องหมุนเวียน',
  TEMP_REPLACEMENT: 'เครื่องทดแทนชั่วคราว',
};

const PERIPHERAL_CATEGORIES = ['จอภาพ', 'เมาส์', 'คีย์บอร์ด', 'กระเป๋า', 'อะแดปเตอร์', 'หูฟัง', 'อื่นๆ'];

const emptyPeripheral = () => ({ category: PERIPHERAL_CATEGORIES[0], itemName: '', serialNo: '', qty: 1, remark: '', prepared: false });

const emptyForm = {
  deliveryType: 'NEW_PURCHASE',
  recipientName: '', recipientEmail: '', recipientDept: '', recipientCompany: '',
  source: '', notes: '',
  assetMode: 'existing' as 'existing' | 'new',
  assetId: null as number | null,
  newAsset: { assetName: '', serialNo: '', type: '', brand: '', model: '', company: '', departmentId: '', location: '', ownerName: '' },
  peripherals: [emptyPeripheral()],
};

const TAB_GROUPS = [
  { index: 0, label: 'ทะเบียนเครื่อง', icon: <PackagePlus size={16} /> },
  { index: 1, label: 'Setup Checklist', icon: <ListChecks size={16} /> },
  { index: 2, label: 'ส่งมอบ & แจ้งเมล', icon: <Truck size={16} /> },
  { index: 3, label: 'ติดตามการยืนยันรับ', icon: <ClipboardCheck size={16} /> },
  { index: 4, label: 'คิวงาน Setup', icon: <CalendarClock size={16} /> },
  { index: 5, label: 'คืนเครื่อง / ลาออก', icon: <RotateCcw size={16} /> },
  { index: 6, label: 'รายงานเวลาส่งมอบ', icon: <BarChart3 size={16} /> },
  { index: 7, label: 'เครื่องหมุนเวียน', icon: <Recycle size={16} /> },
  { index: 8, label: 'จัดการชุด Checklist', icon: <Settings2 size={16} /> },
];

function ComingSoon({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <SectionCard title={label} icon={Package}>
      <Typography sx={{ fontSize: '0.85rem', color: theme.palette.text.secondary, py: 4, textAlign: 'center' }}>
        ส่วนนี้ยังอยู่ระหว่างพัฒนา (เฟสถัดไป) — ยังไม่มีข้อมูลจริงให้แสดง
      </Typography>
    </SectionCard>
  );
}

export default function DeliveryPage() {
  const theme = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState(0);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [assetOptions, setAssetOptions] = useState<any[]>([]);
  const [assetSearch, setAssetSearch] = useState('');

  const load = () => {
    setLoading(true);
    deliveryAPI.list().then(r => setRequests(r.data || [])).catch(() => toast.error('ไม่สามารถโหลดรายการส่งมอบได้')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (form.assetMode !== 'existing' || !assetSearch.trim()) { setAssetOptions([]); return; }
    const t = setTimeout(() => {
      assetAPI.list({ search: assetSearch, limit: 15 }).then(r => setAssetOptions(r.data?.data || [])).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [assetSearch, form.assetMode]);

  const openCreate = () => { setForm(emptyForm); setCreateOpen(true); };

  const updatePeripheral = (idx: number, field: string, val: any) => {
    setForm(p => {
      const peripherals = [...p.peripherals];
      peripherals[idx] = { ...peripherals[idx], [field]: val };
      return { ...p, peripherals };
    });
  };
  const addPeripheral = () => setForm(p => ({ ...p, peripherals: [...p.peripherals, emptyPeripheral()] }));
  const removePeripheral = (idx: number) => setForm(p => ({ ...p, peripherals: p.peripherals.filter((_, i) => i !== idx) }));

  const handleCreate = async () => {
    if (!form.recipientName.trim()) { toast.error('กรุณาระบุชื่อผู้รับเครื่อง'); return; }
    setSaving(true);
    try {
      let assetId = form.assetId;
      if (form.assetMode === 'new') {
        if (!form.newAsset.serialNo.trim()) { toast.error('กรุณาระบุ Serial Number ของเครื่องใหม่'); setSaving(false); return; }
        const created = await assetAPI.create(form.newAsset);
        assetId = created.data.id;
      }
      await deliveryAPI.create({
        deliveryType: form.deliveryType,
        assetId,
        recipientName: form.recipientName,
        recipientEmail: form.recipientEmail,
        recipientDept: form.recipientDept,
        recipientCompany: form.recipientCompany,
        source: form.source,
        notes: form.notes,
        peripherals: form.peripherals.filter(p => p.itemName.trim()),
      });
      toast.success('บันทึกรายการส่งมอบเรียบร้อย');
      setCreateOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReady = async (id: number) => {
    try {
      await deliveryAPI.markReady(id);
      toast.success('ทำเครื่องหมายพร้อมส่งมอบแล้ว — ไปที่แท็บ "ส่งมอบ & แจ้งเมล" เพื่อดำเนินการต่อ');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'ทำรายการไม่สำเร็จ');
    }
  };

  const handleDeliver = async (id: number) => {
    try {
      await deliveryAPI.deliver(id);
      toast.success('ส่งอีเมลยืนยันการรับเครื่องแล้ว');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'ส่งมอบไม่สำเร็จ');
    }
  };

  const togglePeripheralFlag = async (requestId: number, itemId: number, field: 'prepared' | 'delivered', value: boolean) => {
    try {
      await deliveryAPI.togglePeripheral(requestId, itemId, { [field]: value });
      load();
    } catch {
      toast.error('อัปเดตไม่สำเร็จ');
    }
  };

  const notYetDelivered = requests.filter(r => !['DELIVERED', 'CONFIRMED'].includes(r.status));
  const readyOrDelivered = requests.filter(r => ['SETUP_DONE', 'PENDING_DELIVERY', 'DELIVERED'].includes(r.status));
  const total = requests.length;
  const pendingDelivery = requests.filter(r => r.status === 'SETUP_DONE' || r.status === 'PENDING_DELIVERY').length;
  const delivered = requests.filter(r => r.status === 'DELIVERED').length;
  const confirmed = requests.filter(r => r.status === 'CONFIRMED').length;

  const assetLabel = (a: any) => `${a.assetCode || a.assetName || ''} — ${a.serialNo || ''}`.trim();

  return (
    <Box sx={{ pb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Package size={20} color={theme.palette.primary.main} />
        <Typography sx={{ fontSize: '1.05rem', fontWeight: 600, color: theme.palette.text.primary }}>เครื่องใหม่ & ส่งมอบ</Typography>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: '14px', border: `1px solid ${theme.palette.divider}`, mb: 2, p: 1 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' } }}>
          {TAB_GROUPS.map(item => <Tab key={item.index} icon={item.icon} label={item.label} iconPosition="start" />)}
        </Tabs>
      </Paper>

      {tab === 0 && (
        <SectionCard title="ทะเบียนเครื่อง + อุปกรณ์ต่อพ่วง" icon={PackagePlus} action={openCreate} actionLabel="+ เพิ่มรายการใหม่">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ผู้รับ</TableCell>
                  <TableCell>ประเภท</TableCell>
                  <TableCell>ทรัพย์สิน</TableCell>
                  <TableCell>อุปกรณ์ต่อพ่วง</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell align="right">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>กำลังโหลด...</TableCell></TableRow>
                ) : notYetDelivered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.disabled' }}>ยังไม่มีรายการที่กำลังเตรียม</TableCell></TableRow>
                ) : notYetDelivered.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{r.recipientName}</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>{r.recipientDept || '-'}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{DELIVERY_TYPE_LABELS[r.deliveryType]}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{r.asset ? `${r.asset.assetCode || r.asset.assetName} (${r.asset.serialNo})` : '-'}</TableCell>
                    <TableCell>
                      {(r.peripherals || []).length === 0 ? (
                        <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>ไม่มี</Typography>
                      ) : (r.peripherals || []).map((p: any) => (
                        <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                          <Checkbox size="small" checked={p.prepared} onChange={e => togglePeripheralFlag(r.id, p.id, 'prepared', e.target.checked)} sx={{ p: 0.25 }} />
                          <Typography sx={{ fontSize: '0.72rem' }}>{p.category} — {p.itemName}</Typography>
                        </Box>
                      ))}
                    </TableCell>
                    <TableCell><StatusChip status={r.status} /></TableCell>
                    <TableCell align="right">
                      {r.status !== 'PENDING_DELIVERY' && (
                        <Button size="small" variant="outlined" onClick={() => handleMarkReady(r.id)}>พร้อมส่งมอบ</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      )}

      {tab === 1 && <SetupChecklistTab requests={requests} loading={loading} onRefresh={load} />}

      {tab === 2 && (
        <SectionCard title="ส่งมอบ & แจ้งเมล" icon={Truck}>
          <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, mb: 2 }}>
            เมื่อกด "ส่งอีเมลยืนยัน" ระบบจะส่งลิงก์ยืนยันรับเครื่องให้ผู้รับทางอีเมลโดยตรง (ไม่ต้องล็อกอิน) แทนการใช้ Power Automate / Microsoft Forms
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ผู้รับ</TableCell>
                  <TableCell>ทรัพย์สิน</TableCell>
                  <TableCell>อีเมล</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell align="right">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {readyOrDelivered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.disabled' }}>ยังไม่มีรายการพร้อมส่งมอบ</TableCell></TableRow>
                ) : readyOrDelivered.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{r.recipientName}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>
                      {r.asset ? (r.asset.assetCode || r.asset.assetName) : '-'}
                      {(r.peripherals || []).map((p: any) => (
                        <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                          <Checkbox size="small" checked={p.delivered} onChange={e => togglePeripheralFlag(r.id, p.id, 'delivered', e.target.checked)} sx={{ p: 0.25 }} />
                          <Typography sx={{ fontSize: '0.7rem' }}>{p.itemName}</Typography>
                        </Box>
                      ))}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{r.recipientEmail || <em style={{ color: theme.palette.error.main }}>ไม่มีอีเมล</em>}</TableCell>
                    <TableCell><StatusChip status={r.status} /></TableCell>
                    <TableCell align="right">
                      {r.status !== 'DELIVERED' && r.status !== 'CONFIRMED' && (
                        <Button size="small" variant="contained" disabled={!r.recipientEmail} onClick={() => handleDeliver(r.id)}>
                          ส่งอีเมลยืนยัน
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      )}

      {tab === 3 && (
        <Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 2 }}>
            <KpiCard icon={Package} label="ทั้งหมด" value={total} accent={theme.palette.primary.main} />
            <KpiCard icon={Truck} label="รอส่งมอบ" value={pendingDelivery} accent={theme.palette.warning.main} />
            <KpiCard icon={ClipboardCheck} label="ส่งมอบแล้ว" value={delivered} accent={theme.palette.info.main} />
            <KpiCard icon={ListChecks} label="ยืนยันรับแล้ว" value={confirmed} accent={theme.palette.success.main} />
          </Box>
          <SectionCard title="ติดตามการยืนยันรับ" icon={ClipboardCheck}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ผู้รับ</TableCell>
                    <TableCell>ส่งมอบเมื่อ</TableCell>
                    <TableCell>ยืนยันเมื่อ</TableCell>
                    <TableCell>สถานะ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.disabled' }}>ยังไม่มีข้อมูล</TableCell></TableRow>
                  ) : requests.map(r => (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{r.recipientName}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{r.deliveredAt ? new Date(r.deliveredAt).toLocaleString('th-TH') : '-'}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{r.confirmedAt ? new Date(r.confirmedAt).toLocaleString('th-TH') : '-'}</TableCell>
                      <TableCell><StatusChip status={r.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        </Box>
      )}

      {tab === 4 && <ComingSoon label="คิวงาน Setup" />}
      {tab === 5 && <ComingSoon label="คืนเครื่อง / ลาออก" />}
      {tab === 6 && <ComingSoon label="รายงานเวลาส่งมอบ" />}
      {tab === 7 && <ComingSoon label="เครื่องหมุนเวียน" />}
      {tab === 8 && <ComingSoon label="จัดการชุด Checklist" />}

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>เพิ่มรายการส่งมอบใหม่</Typography>
          <IconButton aria-label="ปิด" size="small" onClick={() => setCreateOpen(false)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
            <ToggleButtonGroup
              exclusive size="small" value={form.deliveryType}
              onChange={(_, v) => v && setForm(p => ({ ...p, deliveryType: v }))}
            >
              {Object.entries(DELIVERY_TYPE_LABELS).map(([k, label]) => (
                <ToggleButton key={k} value={k} sx={{ textTransform: 'none', fontSize: '0.78rem' }}>{label}</ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <TextField label="ชื่อผู้รับเครื่อง *" size="small" value={form.recipientName} onChange={e => setForm(p => ({ ...p, recipientName: e.target.value }))} />
              <TextField label="อีเมลผู้รับ" size="small" value={form.recipientEmail} onChange={e => setForm(p => ({ ...p, recipientEmail: e.target.value }))} />
              <TextField label="แผนก" size="small" value={form.recipientDept} onChange={e => setForm(p => ({ ...p, recipientDept: e.target.value }))} />
              <TextField label="บริษัท" size="small" value={form.recipientCompany} onChange={e => setForm(p => ({ ...p, recipientCompany: e.target.value }))} />
            </Box>
            <TextField label="ที่มาของเครื่อง" size="small" fullWidth value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))} placeholder="เช่น จัดซื้อใหม่ Q3/2569, โอนจากสาขา..." />

            <Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, mb: 1 }}>ทรัพย์สินหลัก</Typography>
              <ToggleButtonGroup exclusive size="small" value={form.assetMode} onChange={(_, v) => v && setForm(p => ({ ...p, assetMode: v }))} sx={{ mb: 1.5 }}>
                <ToggleButton value="existing" sx={{ textTransform: 'none', fontSize: '0.75rem' }}>เลือกทรัพย์สินที่มีอยู่</ToggleButton>
                <ToggleButton value="new" sx={{ textTransform: 'none', fontSize: '0.75rem' }}>สร้างทรัพย์สินใหม่</ToggleButton>
              </ToggleButtonGroup>

              {form.assetMode === 'existing' ? (
                <Autocomplete
                  size="small"
                  options={assetOptions}
                  getOptionLabel={assetLabel}
                  onInputChange={(_, v) => setAssetSearch(v)}
                  onChange={(_, v) => setForm(p => ({ ...p, assetId: v?.id ?? null }))}
                  renderInput={(params) => <TextField {...params} label="ค้นหาด้วยรหัส/Serial/ชื่อ" />}
                />
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <TextField label="ชื่อทรัพย์สิน" size="small" value={form.newAsset.assetName} onChange={e => setForm(p => ({ ...p, newAsset: { ...p.newAsset, assetName: e.target.value } }))} />
                  <TextField label="Serial No. *" size="small" value={form.newAsset.serialNo} onChange={e => setForm(p => ({ ...p, newAsset: { ...p.newAsset, serialNo: e.target.value } }))} />
                  <TextField label="ประเภท" size="small" value={form.newAsset.type} onChange={e => setForm(p => ({ ...p, newAsset: { ...p.newAsset, type: e.target.value } }))} placeholder="Computer, Monitor..." />
                  <TextField label="ยี่ห้อ" size="small" value={form.newAsset.brand} onChange={e => setForm(p => ({ ...p, newAsset: { ...p.newAsset, brand: e.target.value } }))} />
                  <TextField label="รุ่น" size="small" value={form.newAsset.model} onChange={e => setForm(p => ({ ...p, newAsset: { ...p.newAsset, model: e.target.value } }))} />
                  <TextField label="บริษัท" size="small" value={form.newAsset.company} onChange={e => setForm(p => ({ ...p, newAsset: { ...p.newAsset, company: e.target.value } }))} />
                  <TextField label="แผนก" size="small" value={form.newAsset.departmentId} onChange={e => setForm(p => ({ ...p, newAsset: { ...p.newAsset, departmentId: e.target.value } }))} />
                  <TextField label="ที่ตั้ง" size="small" value={form.newAsset.location} onChange={e => setForm(p => ({ ...p, newAsset: { ...p.newAsset, location: e.target.value } }))} />
                  <TextField label="ผู้ถือครอง" size="small" value={form.newAsset.ownerName} onChange={e => setForm(p => ({ ...p, newAsset: { ...p.newAsset, ownerName: e.target.value } }))} />
                </Box>
              )}
            </Box>

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>อุปกรณ์ต่อพ่วง</Typography>
                <Button size="small" onClick={addPeripheral}>+ เพิ่มรายการ</Button>
              </Box>
              {form.peripherals.map((p, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <Select value={p.category} onChange={e => updatePeripheral(idx, 'category', e.target.value)}>
                      {PERIPHERAL_CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField size="small" placeholder="รายการ" value={p.itemName} onChange={e => updatePeripheral(idx, 'itemName', e.target.value)} sx={{ flex: 1 }} />
                  <TextField size="small" placeholder="Serial" value={p.serialNo} onChange={e => updatePeripheral(idx, 'serialNo', e.target.value)} sx={{ width: 110 }} />
                  <TextField size="small" type="number" value={p.qty} onChange={e => updatePeripheral(idx, 'qty', Number(e.target.value) || 1)} sx={{ width: 70 }} />
                  <IconButton aria-label="ปิด" size="small" onClick={() => removePeripheral(idx)}><CloseIcon fontSize="small" /></IconButton>
                </Box>
              ))}
            </Box>

            <TextField label="หมายเหตุ" size="small" fullWidth multiline minRows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
