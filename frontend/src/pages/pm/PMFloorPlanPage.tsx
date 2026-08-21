import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, IconButton, TextField, Select, MenuItem,
  Paper, CircularProgress, Chip, Tooltip, alpha, useTheme,
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import AddIcon from '@mui/icons-material/Add';
import ListAltIcon from '@mui/icons-material/ListAlt';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import BusinessIcon from '@mui/icons-material/Business';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { floorPlanAPI, assetAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from './components/Modal';
import { DeviceIcon, SeatIcon, KIND_LABEL, DeviceKind } from './components/DeviceIcons';

/**
 * แผนผังชั้น — ปักที่นั่งของคน อุปกรณ์ตามไปเอง
 *
 * แบบเดิมปักหมุดทีละเครื่อง ซึ่งใช้จริงไม่ได้: ต้นทุนโตตามจำนวนอุปกรณ์ (733 ชิ้น)
 * ไม่ใช่จำนวนที่นั่ง (365 คน) และหมุดจะชี้ผิดทันทีที่เปลี่ยนเครื่องให้พนักงาน
 * ทั้งระบบจึงมีหมุดอยู่จุดเดียวตั้งแต่สร้างฟีเจอร์มา
 *
 * ตอนนี้ที่นั่งผูกกับชื่อผู้ครอบครอง แล้วอุปกรณ์ทุกชิ้นของคนนั้นตามมาเอง —
 * ส่งมอบเครื่องใหม่แล้วแผนผังอัปเดตเองโดยไม่ต้องเปิดหน้านี้
 *
 * เครื่องพิมพ์กับอุปกรณ์เครือข่ายยังปักเองเหมือนเดิม เพราะเป็นของใช้ร่วมกัน
 * ไม่ได้เป็นของใคร (เครื่องพิมพ์มีผู้ครอบครองแค่ 5%)
 */

type PMStatus = 'COMPLETED' | 'IN_PROGRESS' | 'DRAFT' | 'OVERDUE' | 'NO_PM';

const STATUS: Record<PMStatus, { color: string; label: string }> = {
  COMPLETED:   { color: '#1c873b', label: 'PM เสร็จแล้ว' },
  IN_PROGRESS: { color: '#8946cc', label: 'กำลังทำ' },
  DRAFT:       { color: '#d97706', label: 'รอทำ' },
  OVERDUE:     { color: '#ff3b30', label: 'เลยกำหนด' },
  NO_PM:       { color: '#86868b', label: 'ไม่มีแผน PM' },
};

interface LiveDevice {
  assetId: number; assetName: string | null; assetCode: string | null;
  type: string | null; kind: DeviceKind; pmStatus: PMStatus; pmDate: string | null; viaLink: boolean;
}
interface LiveSeat {
  id: number; x: number; y: number; label: string | null;
  ownerName: string | null; departmentId: string | null; note: string | null;
  devices: LiveDevice[]; status: PMStatus; looksLikeStorage: boolean;
}
interface LiveSpot {
  id: number; x: number; y: number; label: string | null; assetId: number;
  assetName: string | null; assetCode: string | null; type: string | null;
  kind: DeviceKind; ownerName: string | null; departmentId: string | null;
  pmStatus: PMStatus; pmDate: string | null;
}
interface LivePlan {
  plan: { id: number; name: string; floor: string; building: string | null; company: string | null; imageUrl: string };
  year: number;
  seats: LiveSeat[];
  spots: LiveSpot[];
  summary: {
    seats: number; seatsDone: number; seatsUnplaced: number;
    devices: number; devicesDone: number; spots: number; byKind: Record<string, number>;
  };
}
interface PlanRow {
  id: number; name: string; floor: string; building: string | null;
  company: string | null; imageUrl: string; isActive: boolean;
}
interface OwnerRow {
  ownerName: string; departmentId: string | null; company: string | null;
  devices: number; computers: number; looksLikeStorage: boolean;
}

/** ชื่อยาว ๆ บนแผนผังทับกันจนอ่านไม่ออก ตัดเหลือชื่อต้นกับอักษรแรกของนามสกุล */
function shortName(full: string | null | undefined): string {
  const s = String(full ?? '').trim();
  if (!s) return '—';
  const parts = s.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 14);
  return `${parts[0]} ${parts[1][0]}.`.slice(0, 16);
}

const thYear = (ad: number) => ad + 543;

export default function PMFloorPlanPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN';

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [live, setLive] = useState<LivePlan | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  // โหมดแก้ไข: ที่นั่งกับอุปกรณ์ส่วนกลางแก้คนละชุด แต่บันทึกพร้อมกัน
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTab, setEditTab] = useState<'seat' | 'spot'>('seat');
  const [draftSeats, setDraftSeats] = useState<LiveSeat[]>([]);
  const [draftSpots, setDraftSpots] = useState<LiveSpot[]>([]);
  const [saving, setSaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: 0, name: '', floor: '', building: '', company: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  const [search, setSearch] = useState('');
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState<{ kind: 'seat' | 'spot'; index: number } | null>(null);
  const [selected, setSelected] = useState<{ kind: 'seat' | 'spot'; id: number } | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';

  const fetchPlans = useCallback(async () => {
    try {
      const res = await floorPlanAPI.getAll();
      setPlans(res.data);
      setSelectedPlanId(prev => prev ?? (res.data.length ? res.data[0].id : null));
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const fetchLive = useCallback(async (planId: number, y: number) => {
    setLoading(true);
    try {
      const res = await floorPlanAPI.live(planId, y);
      setLive(res.data);
      setDraftSeats(res.data.seats || []);
      setDraftSpots(res.data.spots || []);
    } catch (err) {
      console.error(err);
      setLive(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!selectedPlanId) { setLoading(false); return; }
    fetchLive(selectedPlanId, year);
  }, [selectedPlanId, year, fetchLive]);

  // ค้นหาคน (แท็บที่นั่ง) หรือค้นหาทรัพย์สิน (แท็บอุปกรณ์ส่วนกลาง)
  useEffect(() => {
    if (!isEditMode) return;
    const t = setTimeout(async () => {
      if (search.trim().length < 2) { setOwners([]); setAssets([]); return; }
      setSearching(true);
      try {
        if (editTab === 'seat') {
          const res = await floorPlanAPI.owners(search.trim(), live?.plan.company || undefined);
          setOwners(res.data || []);
        } else {
          const res = await assetAPI.list({ search: search.trim(), limit: 12 });
          setAssets(res.data?.data || []);
        }
      } catch (err) { console.error(err); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [search, editTab, isEditMode, live?.plan.company]);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlan(true);
    try {
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('floor', formData.floor);
      fd.append('building', formData.building);
      fd.append('company', formData.company);
      if (imageFile) fd.append('image', imageFile);
      if (formData.id) await floorPlanAPI.update(formData.id, fd as any);
      else await floorPlanAPI.create(fd as any);
      setIsModalOpen(false);
      await fetchPlans();
      if (formData.id && selectedPlanId) await fetchLive(selectedPlanId, year);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกแปลน');
    } finally { setSavingPlan(false); }
  };

  const handleDeletePlan = async () => {
    if (!formData.id || !confirm('ยืนยันการลบแผนผังชั้นนี้? ที่นั่งและจุดอุปกรณ์ทั้งหมดบนแปลนจะถูกลบไปด้วย')) return;
    try {
      await floorPlanAPI.delete(formData.id);
      setIsModalOpen(false);
      setSelectedPlanId(null);
      setLive(null);
      await fetchPlans();
    } catch { alert('เกิดข้อผิดพลาดในการลบ'); }
  };

  const addSeat = (o: OwnerRow) => {
    if (draftSeats.some(s => (s.ownerName || '').toLowerCase() === o.ownerName.toLowerCase())) {
      alert(`"${o.ownerName}" มีที่นั่งบนแปลนนี้แล้ว`);
      return;
    }
    setDraftSeats(prev => [...prev, {
      id: 0, x: 50, y: 50, label: null, ownerName: o.ownerName,
      departmentId: o.departmentId, note: null,
      devices: [], status: 'NO_PM', looksLikeStorage: o.looksLikeStorage,
    }]);
    setSearch(''); setOwners([]);
  };

  const addSpot = (a: any) => {
    if (draftSpots.some(s => s.assetId === a.id)) { alert('มีอุปกรณ์นี้บนแปลนแล้ว'); return; }
    setDraftSpots(prev => [...prev, {
      id: 0, x: 50, y: 50, label: null, assetId: a.id,
      assetName: a.assetName, assetCode: a.assetCode, type: a.type,
      kind: 'other', ownerName: a.ownerName, departmentId: a.departmentId,
      pmStatus: 'NO_PM', pmDate: null,
    }]);
    setSearch(''); setAssets([]);
  };

  const handleSave = async () => {
    if (!live) return;
    setSaving(true);
    try {
      await floorPlanAPI.updateSeats(live.plan.id, draftSeats.map(s => ({
        x: s.x, y: s.y, label: s.label, ownerName: s.ownerName, departmentId: s.departmentId, note: s.note,
      })), year);
      await floorPlanAPI.updatePins(live.plan.id, draftSpots.map(s => ({
        assetId: s.assetId, x: s.x, y: s.y, label: s.label,
      })));
      setIsEditMode(false);
      await fetchLive(live.plan.id, year);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกตำแหน่ง');
    } finally { setSaving(false); }
  };

  // ── ลากวางบนแปลน ────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, kind: 'seat' | 'spot', index: number) => {
    if (!isEditMode) { e.preventDefault(); return; }
    setDragging({ kind, index });
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragging || !imgRef.current) return;
    const r = imgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
    const setter = dragging.kind === 'seat' ? setDraftSeats : setDraftSpots;
    (setter as any)((prev: any[]) => {
      const next = [...prev];
      next[dragging.index] = { ...next[dragging.index], x, y };
      return next;
    });
  };

  const seatsShown = isEditMode ? draftSeats : (live?.seats || []);
  const spotsShown = isEditMode ? draftSpots : (live?.spots || []);
  const s = live?.summary;

  const kindTotals = useMemo(() => {
    const b = s?.byKind || {};
    return (Object.keys(KIND_LABEL) as DeviceKind[])
      .map(k => ({ kind: k, n: b[k] || 0 }))
      .filter(x => x.n > 0);
  }, [s]);

  const selectedSeat = selected?.kind === 'seat' ? seatsShown.find(x => x.id === selected.id) : undefined;
  const selectedSpot = selected?.kind === 'spot' ? spotsShown.find(x => x.id === selected.id) : undefined;

  return (
    <Box>
      {/* ── หัวเรื่อง ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 3, background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 2 }}>
            <MapIcon sx={{ color: '#fff' }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 700 }}>แผนผังชั้น (Floor Plan)</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
              ปักที่นั่งของคน อุปกรณ์ตามไปเองจากผู้ครอบครอง
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {isAdmin && (
            <Button variant="contained" color="success" startIcon={<AddIcon />}
              onClick={() => { setFormData({ id: 0, name: '', floor: '', building: '', company: '' }); setImageFile(null); setIsModalOpen(true); }}>
              เพิ่มแผนผังใหม่
            </Button>
          )}
          <Button variant="outlined" startIcon={<ListAltIcon />} onClick={() => navigate('/pm/runs')}>รายการ PM</Button>
        </Box>
      </Box>

      {/* ── แถบควบคุม ── */}
      <Paper variant="outlined" sx={{ p: '14px 20px', mb: 2, display: 'flex', gap: 2.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>เลือกแปลน:</Typography>
          <Select size="small" value={selectedPlanId || ''} onChange={e => setSelectedPlanId(Number(e.target.value))} sx={{ minWidth: 200 }}>
            {plans.map(p => <MenuItem key={p.id} value={p.id}>{p.name} {p.building ? `(${p.building})` : ''}</MenuItem>)}
          </Select>
        </Box>
        <Box sx={{ width: '1px', height: 24, bgcolor: 'divider' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>ปี PM:</Typography>
          <Select size="small" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[...Array(5)].map((_, i) => {
              const y = new Date().getFullYear() - 2 + i;
              return <MenuItem key={y} value={y}>{thYear(y)}</MenuItem>;
            })}
          </Select>
        </Box>
        <Box sx={{ flex: 1 }} />
        {isAdmin && live && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isEditMode ? (
              <>
                <Button variant="outlined" onClick={() => {
                  setIsEditMode(false); setSelected(null);
                  setDraftSeats(live.seats); setDraftSpots(live.spots);
                }}>ยกเลิก</Button>
                <Button variant="contained" onClick={handleSave} disabled={saving}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกตำแหน่ง'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outlined" startIcon={<EditLocationAltIcon />}
                  onClick={() => { setIsEditMode(true); setSelected(null); setSearch(''); }}>
                  จัดผังที่นั่ง
                </Button>
                <Button variant="outlined" color="inherit" startIcon={<SettingsIcon />}
                  onClick={() => { setFormData({ id: live.plan.id, name: live.plan.name, floor: live.plan.floor, building: live.plan.building || '', company: live.plan.company || '' }); setIsModalOpen(true); }}>
                  ตั้งค่าแปลน
                </Button>
              </>
            )}
          </Box>
        )}
      </Paper>

      {/* ── สรุป + คำอธิบายสัญลักษณ์ ── */}
      {live && !loading && (
        <Paper variant="outlined" sx={{ p: '12px 20px', mb: 2, display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'baseline' }}>
            <Box>
              <Typography component="span" sx={{ fontSize: 20, fontWeight: 800 }}>{s!.seatsDone}</Typography>
              <Typography component="span" sx={{ fontSize: 13, color: 'text.secondary' }}> / {s!.seats} ที่นั่ง PM ครบ</Typography>
            </Box>
            <Box>
              <Typography component="span" sx={{ fontSize: 20, fontWeight: 800 }}>{s!.devicesDone}</Typography>
              <Typography component="span" sx={{ fontSize: 13, color: 'text.secondary' }}> / {s!.devices} อุปกรณ์</Typography>
            </Box>
            {s!.spots > 0 && (
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>+ ส่วนกลาง {s!.spots} จุด</Typography>
            )}
          </Box>

          <Box sx={{ width: '1px', height: 24, bgcolor: 'divider' }} />

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            {kindTotals.map(({ kind, n }) => (
              <Box key={kind} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                <DeviceIcon kind={kind} size={15} />
                <Typography sx={{ fontSize: 12 }}>{KIND_LABEL[kind]} {n}</Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ flex: 1 }} />

          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
            {(Object.keys(STATUS) as PMStatus[]).map(k => (
              <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: STATUS[k].color }} />
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{STATUS[k].label}</Typography>
              </Box>
            ))}
          </Box>

          {s!.seatsUnplaced > 0 && (
            <Tooltip title="ที่นั่งเหล่านี้ปักไว้แล้วแต่ไม่พบอุปกรณ์ของเจ้าของ — ชื่ออาจสะกดไม่ตรงกับในทะเบียน หรือเจ้าของย้ายออกไปแล้ว">
              <Chip size="small" icon={<WarningAmberIcon />} color="warning" variant="outlined"
                label={`${s!.seatsUnplaced} ที่นั่งไม่พบอุปกรณ์`} sx={{ fontSize: 11 }} />
            </Tooltip>
          )}
        </Paper>
      )}

      <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>
        {/* ── แถบเครื่องมือโหมดแก้ไข ── */}
        {isEditMode && (
          <Paper variant="outlined" sx={{ width: 310, p: 2, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', gap: 0.75, mb: 2 }}>
              {([['seat', 'ที่นั่ง (คน)'], ['spot', 'อุปกรณ์ส่วนกลาง']] as const).map(([k, label]) => (
                <Button key={k} size="small" fullWidth
                  variant={editTab === k ? 'contained' : 'outlined'}
                  onClick={() => { setEditTab(k); setSearch(''); setOwners([]); setAssets([]); }}
                  sx={{ fontSize: 12 }}>
                  {label}
                </Button>
              ))}
            </Box>

            {editTab === 'seat' ? (
              <>
                <TextField fullWidth size="small" placeholder="ค้นชื่อพนักงาน (2 อักษร+)..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  InputProps={{ endAdornment: searching ? <CircularProgress size={14} /> : undefined }} />
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.75, lineHeight: 1.6 }}>
                  เลือกคน ไม่ต้องเลือกเครื่อง — อุปกรณ์ทุกชิ้นของคนนั้นจะขึ้นตามมาเอง
                  และเปลี่ยนตามทะเบียนโดยไม่ต้องกลับมาแก้แผนผัง
                </Typography>

                {owners.length > 0 && (
                  <Box sx={{ mt: 1.25, maxHeight: 230, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                    {owners.map(o => (
                      <Box key={o.ownerName} onClick={() => addSeat(o)}
                        sx={{ p: '8px 12px', borderBottom: '1px solid', borderColor: 'divider', cursor: 'pointer', fontSize: 12, '&:hover': { bgcolor: 'action.hover' }, '&:last-of-type': { borderBottom: 'none' } }}>
                        <Box sx={{ fontWeight: 600 }}>{o.ownerName}</Box>
                        <Box sx={{ color: 'text.secondary', fontSize: 10.5 }}>
                          {o.departmentId || '—'} · อุปกรณ์ {o.devices} ชิ้น
                          {o.looksLikeStorage && (
                            <Box component="span" sx={{ color: 'warning.main', fontWeight: 700 }}> · น่าจะเป็นจุดเก็บ ไม่ใช่คน</Box>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

                <Typography sx={{ fontSize: 13, fontWeight: 700, mt: 2.5, mb: 1 }}>ที่นั่งบนแปลน ({draftSeats.length})</Typography>
                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  {draftSeats.map((seat, i) => (
                    <Box key={`${seat.ownerName}-${i}`}
                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '7px 10px', bgcolor: 'action.hover', borderRadius: 1.5, mb: 0.75, fontSize: 12 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Box sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seat.ownerName}</Box>
                        <Box sx={{ color: 'text.secondary', fontSize: 10 }}>
                          {seat.departmentId || '—'} · {seat.devices.length ? `${seat.devices.length} ชิ้น` : 'ยังไม่พบอุปกรณ์'}
                        </Box>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => setDraftSeats(p => p.filter((_, j) => j !== i))}>
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </>
            ) : (
              <>
                <TextField fullWidth size="small" placeholder="ค้นเครื่องพิมพ์ / อุปกรณ์ส่วนกลาง..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  InputProps={{ endAdornment: searching ? <CircularProgress size={14} /> : undefined }} />
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.75, lineHeight: 1.6 }}>
                  ใช้กับของที่ไม่ได้เป็นของใครคนเดียว — เครื่องพิมพ์ สวิตช์ เครื่องส่วนกลาง
                  ของที่มีเจ้าของให้ปักเป็นที่นั่งแทน
                </Typography>

                {assets.length > 0 && (
                  <Box sx={{ mt: 1.25, maxHeight: 230, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                    {assets.map(a => (
                      <Box key={a.id} onClick={() => addSpot(a)}
                        sx={{ p: '8px 12px', borderBottom: '1px solid', borderColor: 'divider', cursor: 'pointer', fontSize: 12, '&:hover': { bgcolor: 'action.hover' }, '&:last-of-type': { borderBottom: 'none' } }}>
                        <Box sx={{ fontWeight: 600 }}>{a.assetName || a.assetCode || `#${a.id}`}</Box>
                        <Box sx={{ color: 'text.secondary', fontSize: 10.5 }}>{a.type} · {a.departmentId || '—'}</Box>
                      </Box>
                    ))}
                  </Box>
                )}

                <Typography sx={{ fontSize: 13, fontWeight: 700, mt: 2.5, mb: 1 }}>จุดส่วนกลาง ({draftSpots.length})</Typography>
                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  {draftSpots.map((sp, i) => (
                    <Box key={sp.assetId}
                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '7px 10px', bgcolor: 'action.hover', borderRadius: 1.5, mb: 0.75, fontSize: 12 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <DeviceIcon kind={sp.kind} size={15} />
                        <Box sx={{ minWidth: 0 }}>
                          <Box sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sp.assetName || sp.assetCode}
                          </Box>
                          <Box sx={{ color: 'text.secondary', fontSize: 10 }}>{sp.type}</Box>
                        </Box>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => setDraftSpots(p => p.filter((_, j) => j !== i))}>
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </>
            )}

            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 2, lineHeight: 1.7 }}>
              ลากป้ายบนแปลนเพื่อย้ายตำแหน่ง · ตำแหน่งจะบันทึกเมื่อกด "บันทึกตำแหน่ง"
            </Typography>
          </Paper>
        )}

        {/* ── แผนผัง ── */}
        <Paper variant="outlined" sx={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 600 }}>
          {loading ? (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, color: 'text.secondary' }}>
              <CircularProgress />
              <Typography sx={{ fontSize: 14, fontWeight: 500 }}>กำลังโหลด...</Typography>
            </Box>
          ) : live ? (
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', p: 2 }}
              onDragOver={onDragOver} onDrop={e => { e.preventDefault(); setDragging(null); }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Box component="img" ref={imgRef} draggable={false}
                  src={live.plan.imageUrl.startsWith('http') ? live.plan.imageUrl : `${apiUrl}${live.plan.imageUrl}`}
                  alt={live.plan.name}
                  sx={{ display: 'block', maxWidth: '100%', maxHeight: 780, objectFit: 'contain', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, boxShadow: 1 }} />

                {/* ที่นั่ง */}
                {seatsShown.map((seat, i) => {
                  const cfg = STATUS[seat.status];
                  const isSel = selected?.kind === 'seat' && selected.id === seat.id;
                  return (
                    <Box key={`seat-${seat.id || i}-${seat.ownerName}`}
                      draggable={isEditMode}
                      onDragStart={e => onDragStart(e, 'seat', i)}
                      onClick={() => setSelected(isSel ? null : { kind: 'seat', id: seat.id })}
                      sx={{
                        position: 'absolute', left: `${seat.x}%`, top: `${seat.y}%`,
                        transform: 'translate(-50%, -50%)',
                        cursor: isEditMode ? 'grab' : 'pointer',
                        zIndex: isSel ? 30 : 10,
                        '&:hover': { zIndex: 25 },
                        '&:active': isEditMode ? { cursor: 'grabbing' } : undefined,
                      }}>
                      <Box sx={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25,
                        bgcolor: 'background.paper',
                        border: `2px solid ${cfg.color}`,
                        borderRadius: '9px', px: 0.75, py: 0.4,
                        boxShadow: isSel ? `0 0 0 3px ${alpha(cfg.color, 0.35)}, 0 4px 10px rgba(0,0,0,.28)` : '0 2px 6px rgba(0,0,0,.24)',
                        transition: 'box-shadow .15s, transform .15s',
                        '&:hover': { transform: 'scale(1.06)' },
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                            {shortName(seat.ownerName)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center', color: 'text.secondary' }}>
                          {seat.devices.length === 0 ? (
                            <SeatIcon size={12} />
                          ) : seat.devices.slice(0, 4).map(d => (
                            <Box key={d.assetId} sx={{ color: STATUS[d.pmStatus].color, display: 'flex' }}>
                              <DeviceIcon kind={d.kind} size={12} />
                            </Box>
                          ))}
                          {seat.devices.length > 4 && (
                            <Typography sx={{ fontSize: 8.5, fontWeight: 700 }}>+{seat.devices.length - 4}</Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  );
                })}

                {/* อุปกรณ์ส่วนกลาง */}
                {spotsShown.map((sp, i) => {
                  const cfg = STATUS[sp.pmStatus];
                  const isSel = selected?.kind === 'spot' && selected.id === sp.id;
                  return (
                    <Box key={`spot-${sp.assetId}`}
                      draggable={isEditMode}
                      onDragStart={e => onDragStart(e, 'spot', i)}
                      onClick={() => setSelected(isSel ? null : { kind: 'spot', id: sp.id })}
                      sx={{
                        position: 'absolute', left: `${sp.x}%`, top: `${sp.y}%`,
                        transform: 'translate(-50%, -50%)',
                        cursor: isEditMode ? 'grab' : 'pointer',
                        zIndex: isSel ? 30 : 11,
                        '&:hover': { zIndex: 25 },
                      }}>
                      <Box sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 30, height: 30, borderRadius: '50%',
                        bgcolor: 'background.paper', color: cfg.color,
                        border: `2px solid ${cfg.color}`,
                        boxShadow: isSel ? `0 0 0 3px ${alpha(cfg.color, 0.35)}, 0 4px 10px rgba(0,0,0,.28)` : '0 2px 6px rgba(0,0,0,.24)',
                        transition: 'transform .15s',
                        '&:hover': { transform: 'scale(1.1)' },
                      }}>
                        <DeviceIcon kind={sp.kind} size={16} />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ) : (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
              <Box sx={{ textAlign: 'center' }}>
                <BusinessIcon sx={{ fontSize: 48, mb: 1.5, color: 'text.disabled' }} />
                <Typography sx={{ fontSize: 16, fontWeight: 600 }}>ยังไม่มีแผนผังชั้น</Typography>
                {isAdmin && <Typography sx={{ fontSize: 13, mt: 0.5 }}>กดปุ่ม "เพิ่มแผนผังใหม่" ด้านบนเพื่อเริ่มต้น</Typography>}
              </Box>
            </Box>
          )}
        </Paper>

        {/* ── รายละเอียดจุดที่เลือก ── */}
        {(selectedSeat || selectedSpot) && !isEditMode && (
          <Paper variant="outlined" sx={{ width: 300, p: 2, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Box>
                <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
                  {selectedSeat ? selectedSeat.ownerName : (selectedSpot!.assetName || selectedSpot!.assetCode)}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                  {selectedSeat
                    ? `${selectedSeat.departmentId || '—'} · ที่นั่ง`
                    : `${selectedSpot!.type} · อุปกรณ์ส่วนกลาง`}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setSelected(null)}><CloseIcon sx={{ fontSize: 17 }} /></IconButton>
            </Box>

            {selectedSeat?.looksLikeStorage && (
              <Box sx={{ p: '8px 10px', mb: 1.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.1), border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}` }}>
                <Typography sx={{ fontSize: 10.5, lineHeight: 1.7 }}>
                  ชื่อนี้ผูกกับอุปกรณ์ {selectedSeat.devices.length} ชิ้น ซึ่งมากกว่าโต๊ะทำงานปกติ —
                  น่าจะเป็นป้ายจุดเก็บของ ไม่ใช่ชื่อคน ควรแก้ผู้ครอบครองในทะเบียนให้ตรงกับความจริง
                </Typography>
              </Box>
            )}

            {selectedSeat && selectedSeat.devices.length === 0 && (
              <Box sx={{ p: '8px 10px', mb: 1.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.1), border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}` }}>
                <Typography sx={{ fontSize: 10.5, lineHeight: 1.7 }}>
                  ไม่พบอุปกรณ์ของคนนี้ในทะเบียน — ชื่ออาจสะกดไม่ตรงกับช่องผู้ครอบครอง
                  หรือเจ้าของย้ายออกไปแล้ว
                </Typography>
              </Box>
            )}

            {(selectedSeat ? selectedSeat.devices : [{
              assetId: selectedSpot!.assetId, assetName: selectedSpot!.assetName, assetCode: selectedSpot!.assetCode,
              type: selectedSpot!.type, kind: selectedSpot!.kind, pmStatus: selectedSpot!.pmStatus,
              pmDate: selectedSpot!.pmDate, viaLink: false,
            } as LiveDevice]).map(d => (
              <Box key={d.assetId} onClick={() => navigate(`/assets/${d.assetId}`)}
                sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', p: '9px 10px', mb: 0.75, borderRadius: 1.5, cursor: 'pointer', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
                <Box sx={{ color: STATUS[d.pmStatus].color, mt: 0.25 }}><DeviceIcon kind={d.kind} size={17} /></Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.assetName || d.assetCode || `#${d.assetId}`}
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                    {KIND_LABEL[d.kind]}
                    {d.viaLink && ' · พบตอนทำ PM'}
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: STATUS[d.pmStatus].color, fontWeight: 600, mt: 0.25 }}>
                    {STATUS[d.pmStatus].label}
                    {d.pmDate && ` · ${new Date(d.pmDate).toLocaleDateString('th-TH')}`}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Paper>
        )}
      </Box>

      {/* ── ตั้งค่าแปลน ── */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={formData.id ? 'แก้ไขแผนผังชั้น' : 'เพิ่มแผนผังชั้นใหม่'}>
        <Box component="form" onSubmit={handleSavePlan} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="ชื่อแปลน" size="small" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          <TextField label="ชั้น" size="small" required value={formData.floor} onChange={e => setFormData({ ...formData, floor: e.target.value })} />
          <TextField label="อาคาร" size="small" value={formData.building} onChange={e => setFormData({ ...formData, building: e.target.value })} />
          <TextField label="บริษัท" size="small" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })}
            helperText="ใช้กรองรายชื่อพนักงานตอนปักที่นั่ง" />
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>
              รูปแปลน {formData.id ? '(เว้นว่างไว้ถ้าไม่เปลี่ยน)' : '(จำเป็น)'}
            </Typography>
            <input type="file" accept="image/*" required={!formData.id} onChange={e => setImageFile(e.target.files?.[0] || null)} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
            {formData.id > 0 && <Button color="error" onClick={handleDeletePlan}>ลบแปลนนี้</Button>}
            <Box sx={{ flex: 1 }} />
            <Button onClick={() => setIsModalOpen(false)}>ยกเลิก</Button>
            <Button type="submit" variant="contained" disabled={savingPlan}>{savingPlan ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}
