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
  zoneId: number | null; deskIndex: number | null; deskCode: string | null;
  ownerName: string | null; departmentId: string | null; note: string | null;
  devices: LiveDevice[]; status: PMStatus; looksLikeStorage: boolean;
}
interface LiveDesk {
  code: string; index: number; cx: number; cy: number; w: number; h: number; seatId: number | null;
}
interface LiveZone {
  id: number; code: string; name: string | null; color: string | null;
  x: number; y: number; w: number; h: number; cols: number; rows: number;
  desks: LiveDesk[]; occupied: number;
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
  zones: LiveZone[];
  seats: LiveSeat[];
  spots: LiveSpot[];
  summary: {
    seats: number; seatsDone: number; seatsUnplaced: number;
    devices: number; devicesDone: number; spots: number; byKind: Record<string, number>;
    desks: number; desksFree: number; seatsUnsnapped: number;
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
interface Candidate {
  ownerName: string; departmentId: string; devices: number;
  pmPlanned: boolean; placed: boolean; looksLikeStorage: boolean;
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

  // ชั้นที่เปิด/ปิดได้ — แบบ CAD เป็นเอกสารก่อสร้าง หมึกส่วนใหญ่เป็นเส้นบอกระยะ
  // กับสัญลักษณ์ไฟฟ้าที่งาน IT ไม่ได้ใช้ จึงหรี่ลงเป็นชั้นอ้างอิง
  const [showZones, setShowZones] = useState(true);
  const [showFreeDesks, setShowFreeDesks] = useState(true);
  const [dimPlan, setDimPlan] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: 0, name: '', floor: '', building: '', company: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  const [search, setSearch] = useState('');
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // รายชื่อที่เตรียมไว้ให้กดวางเลย ไม่ต้องค้นทีละชื่อ
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [plannedOnly, setPlannedOnly] = useState(true);
  // คนที่เลือกไว้แล้วรอคลิกบนแปลนเพื่อกำหนดตำแหน่ง
  const [armed, setArmed] = useState<{ ownerName: string; departmentId: string | null; looksLikeStorage: boolean } | null>(null);

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
          // รายการหลักกรองในเครื่องอยู่แล้ว ยิง API เฉพาะตอนหาไม่เจอ เพื่อเผื่อคน
          // ที่อยู่คนละบริษัทกับแปลน (เช่น ย้ายมานั่งชั่วคราว)
          const res = await floorPlanAPI.owners(search.trim());
          const known = new Set(candidates.map(c => c.ownerName.toLowerCase()));
          setOwners((res.data || []).filter((o: OwnerRow) => !known.has(o.ownerName.toLowerCase())));
        } else {
          const res = await assetAPI.list({ search: search.trim(), limit: 12 });
          setAssets(res.data?.data || []);
        }
      } catch (err) { console.error(err); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [search, editTab, isEditMode, candidates]);

  // โหลดรายชื่อผู้สมัครเมื่อเข้าโหมดจัดผัง — ให้เห็นทั้งชั้นทีเดียวแทนการค้นทีละคน
  useEffect(() => {
    if (!isEditMode || !live) { setCandidates([]); return; }
    let alive = true;
    floorPlanAPI.candidates(live.plan.id, year)
      .then(res => { if (alive) setCandidates(res.data?.candidates || []); })
      .catch(err => console.error(err));
    return () => { alive = false; };
  }, [isEditMode, live?.plan.id, year, live]);

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

  const alreadySeated = (name: string) =>
    draftSeats.some(s => (s.ownerName || '').toLowerCase() === name.toLowerCase());

  /**
   * เลือกคนไว้ก่อน แล้วค่อยคลิกบนแปลนเพื่อบอกว่านั่งตรงไหน
   *
   * ของเดิมเพิ่มที่นั่งลงกลางแปลนที่ (50,50) ทุกครั้ง คนที่เพิ่มทีหลังจึงไปทับ
   * คนก่อนหน้าจนมองไม่เห็นและคลิกไม่โดน ดูเหมือน "กดเพิ่มแล้วไม่มีอะไรขึ้น"
   * ทั้งที่เพิ่มสำเร็จ — เลือกก่อนแล้วคลิกวางจึงไม่มีทางซ้อนกันเอง
   */
  const armSeat = (name: string, dept: string | null, storage: boolean) => {
    if (alreadySeated(name)) { alert(`"${name}" มีที่นั่งบนแปลนนี้แล้ว`); return; }
    setArmed({ ownerName: name, departmentId: dept, looksLikeStorage: storage });
  };

  /**
   * วางที่นั่งนอกโซน — ใช้กับคนที่นั่งในที่ที่ยังไม่มีโซนครอบ เช่น ห้องผู้บริหาร
   *
   * ปกติควรกดลงช่องโต๊ะในโซน (placeOnDesk) เพราะช่องโต๊ะกันซ้อนให้เอง
   * ทางนี้เป็นทางออกสำรอง ที่นั่งจะลอยอยู่บนพิกัดดิบและซ้อนกันได้ถ้าวางใกล้กันมาก
   */
  const placeArmedAt = (e: React.MouseEvent) => {
    if (!isEditMode || !armed || !imgRef.current) return;
    const r = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    // คลิกนอกรูปไม่ควรวางที่นั่งไว้ที่ขอบ
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    setDraftSeats(prev => [...prev, {
      id: 0, x, y, label: null,
      zoneId: null, deskIndex: null, deskCode: null,
      ownerName: armed.ownerName, departmentId: armed.departmentId, note: null,
      devices: [], status: 'NO_PM', looksLikeStorage: armed.looksLikeStorage,
    }]);
    setArmed(null);
  };

  const addSpot = (a: any) => {
    if (draftSpots.some(s => s.assetId === a.id)) { alert('มีอุปกรณ์นี้บนแปลนแล้ว'); return; }
    // จุดส่วนกลางเพิ่มทีละไม่กี่จุด เยื้องกันไว้กันซ้อน แล้วลากไปวางเอง
    const n = draftSpots.length;
    setDraftSpots(prev => [...prev, {
      id: 0, x: 45 + (n % 5) * 2.5, y: 45 + Math.floor(n / 5) * 4, label: null, assetId: a.id,
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
        zoneId: s.zoneId, deskIndex: s.deskIndex,
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
      // ลากที่นั่งที่เกาะโต๊ะอยู่ = ถอดออกจากโต๊ะ ไม่งั้น server จะดึงกลับเข้าช่องเดิม
      // ตอนบันทึก แล้วการลากจะดูเหมือนไม่ทำงาน
      const detach = dragging.kind === 'seat' ? { zoneId: null, deskIndex: null, deskCode: null } : {};
      next[dragging.index] = { ...next[dragging.index], ...detach, x, y };
      return next;
    });
  };

  const zones = live?.zones || [];

  /* โต๊ะว่าง = ช่องที่ไม่มีที่นั่งในฉบับร่าง ไม่ใช่ค่า seatId ที่ server ส่งมา
     ไม่งั้นวางคนลงไปแล้วช่องยังขึ้นว่าง จนกว่าจะกดบันทึก */
  const occupiedDesks = useMemo(() => {
    const m = new Map<string, LiveSeat>();
    for (const s of (isEditMode ? draftSeats : (live?.seats || []))) {
      if (s.zoneId !== null && s.deskIndex !== null) m.set(`${s.zoneId}:${s.deskIndex}`, s);
    }
    return m;
  }, [isEditMode, draftSeats, live]);

  /** นับจากฉบับร่าง ไม่ใช่ค่าที่ server ส่งมา ตัวเลขบนป้ายโซนจึงขยับทันทีที่วาง */
  const occupiedIn = (z: LiveZone) =>
    z.desks.filter(d => occupiedDesks.has(`${z.id}:${d.index}`)).length;

  /** วางคนที่เลือกไว้ลงช่องโต๊ะ — ตำแหน่งมาจากตารางของโซน ไม่ใช่จุดที่เมาส์อยู่ */
  const placeOnDesk = (z: LiveZone, d: LiveDesk) => {
    if (!armed) return;
    if (occupiedDesks.has(`${z.id}:${d.index}`)) { alert(`โต๊ะ ${d.code} มีคนนั่งอยู่แล้ว`); return; }
    setDraftSeats(prev => [...prev, {
      id: 0, x: d.cx, y: d.cy, label: null,
      zoneId: z.id, deskIndex: d.index, deskCode: d.code,
      ownerName: armed.ownerName, departmentId: armed.departmentId, note: null,
      devices: [], status: 'NO_PM', looksLikeStorage: armed.looksLikeStorage,
    }]);
    setArmed(null);
  };

  const seatsShown = isEditMode ? draftSeats : (live?.seats || []);
  const spotsShown = isEditMode ? draftSpots : (live?.spots || []);
  const s = live?.summary;

  /**
   * ใครถูกวางแล้วต้องอ่านจากฉบับร่างที่กำลังแก้ ไม่ใช่จากค่าที่ server ส่งมา
   *
   * ค่าจาก server เป็นสถานะ ณ ตอนโหลด ถ้าเอาที่นั่งออกจากร่างแล้วยังไม่บันทึก
   * รายชื่อจะยังขึ้นว่า "วางแล้ว" และกดวางซ้ำไม่ได้จนกว่าจะรีเฟรชทั้งหน้า
   */
  const seatedNames = useMemo(
    () => new Set(draftSeats.map(s => String(s.ownerName ?? '').trim().toLowerCase()).filter(Boolean)),
    [draftSeats],
  );

  // รายชื่อที่ยังไม่ได้วาง จัดกลุ่มตามแผนก — แผนกคือสิ่งที่แปลนแบ่งโซนไว้จริง
  const deptGroups = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of candidates) {
      if (plannedOnly && !c.pmPlanned) continue;
      if (seatedNames.has(c.ownerName.toLowerCase())) continue;
      m.set(c.departmentId, (m.get(c.departmentId) || 0) + 1);
    }
    // แผนกที่เลือกอยู่ต้องไม่หายไปตอนวางครบ ไม่งั้นตัวกรองค้างโดยไม่มีปุ่มให้กดออก
    if (deptFilter && !m.has(deptFilter)) m.set(deptFilter, 0);
    return [...m.entries()]
      .map(([dept, remaining]) => ({ dept, remaining }))
      .sort((a, b) => b.remaining - a.remaining || a.dept.localeCompare(b.dept));
  }, [candidates, plannedOnly, seatedNames, deptFilter]);

  const trayList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates
      .filter(c => {
        if (plannedOnly && !c.pmPlanned) return false;
        if (deptFilter && c.departmentId !== deptFilter) return false;
        if (q && !c.ownerName.toLowerCase().includes(q)) return false;
        return true;
      })
      .map(c => ({ ...c, placed: seatedNames.has(c.ownerName.toLowerCase()) }))
      // คนที่ยังไม่ได้วางขึ้นก่อนเสมอ คนที่วางแล้วไหลลงไปท้ายรายการ
      .sort((a, b) => Number(a.placed) - Number(b.placed));
  }, [candidates, plannedOnly, deptFilter, search, seatedNames]);

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
                  setIsEditMode(false); setSelected(null); setArmed(null); setSearch('');
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

          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
            {([
              ['โซน', showZones, setShowZones],
              ['โต๊ะว่าง', showFreeDesks, setShowFreeDesks],
              ['หรี่แบบ', dimPlan, setDimPlan],
            ] as const).map(([label, on, set]) => (
              <Chip key={label} size="small" label={label} clickable
                color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'}
                onClick={() => (set as any)((v: boolean) => !v)}
                sx={{ fontSize: 10.5, height: 22 }} />
            ))}
          </Box>

          {s!.desks > 0 && (
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              โต๊ะว่าง {s!.desksFree}/{s!.desks}
            </Typography>
          )}

          {s!.seatsUnsnapped > 0 && (
            <Tooltip title="ที่นั่งเหล่านี้ยังไม่ได้อยู่ในช่องโต๊ะของโซนใด — ลากไปวางบนโต๊ะว่างเพื่อเข้าตาราง">
              <Chip size="small" color="default" variant="outlined"
                label={`${s!.seatsUnsnapped} ที่นั่งนอกตาราง`} sx={{ fontSize: 11 }} />
            </Tooltip>
          )}

          {s!.seatsUnplaced > 0 && (
            <Tooltip title="ที่นั่งเหล่านี้ปักไว้แล้วแต่ไม่พบอุปกรณ์ของเจ้าของ — ชื่ออาจสะกดไม่ตรงกับในทะเบียน หรือเจ้าของย้ายออกไปแล้ว">
              <Chip size="small" icon={<WarningAmberIcon />} color="warning" variant="outlined"
                label={`${s!.seatsUnplaced} ที่นั่งไม่พบอุปกรณ์`} sx={{ fontSize: 11 }} />
            </Tooltip>
          )}
        </Paper>
      )}

      {armed && (
        <Paper variant="outlined" sx={{
          p: '10px 16px', mb: 2, display: 'flex', alignItems: 'center', gap: 1.5,
          borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.07),
        }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
            คลิกบนแผนผังเพื่อวางที่นั่งของ {armed.ownerName}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            {armed.departmentId || 'ไม่ระบุแผนก'}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button size="small" onClick={() => setArmed(null)}>ยกเลิกการเลือก</Button>
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
                <TextField fullWidth size="small" placeholder="กรองชื่อในรายการ / ค้นคนนอกบริษัทนี้..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  InputProps={{ endAdornment: searching ? <CircularProgress size={14} /> : undefined }} />

                <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                  <Chip size="small" label="เฉพาะที่อยู่ในแผน PM" clickable
                    color={plannedOnly ? 'primary' : 'default'}
                    variant={plannedOnly ? 'filled' : 'outlined'}
                    onClick={() => setPlannedOnly(v => !v)} sx={{ fontSize: 10.5 }} />
                  <Chip size="small" label="ทุกแผนก" clickable
                    color={deptFilter === '' ? 'primary' : 'default'}
                    variant={deptFilter === '' ? 'filled' : 'outlined'}
                    onClick={() => setDeptFilter('')} sx={{ fontSize: 10.5 }} />
                </Box>

                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75, flexWrap: 'wrap' }}>
                  {deptGroups.map(g => (
                    <Chip key={g.dept} size="small" clickable
                      label={`${g.dept} ${g.remaining}`}
                      color={deptFilter === g.dept ? 'primary' : 'default'}
                      variant={deptFilter === g.dept ? 'filled' : 'outlined'}
                      onClick={() => setDeptFilter(d => d === g.dept ? '' : g.dept)}
                      sx={{ fontSize: 10, height: 22 }} />
                  ))}
                </Box>

                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 1.25, lineHeight: 1.7 }}>
                  {armed
                    ? 'คลิกตำแหน่งบนแผนผังเพื่อวางที่นั่ง'
                    : 'กดชื่อคนก่อน แล้วคลิกบนแผนผังตรงที่เขานั่ง — อุปกรณ์ของเขาจะตามมาเอง'}
                </Typography>

                <Box sx={{ mt: 1, maxHeight: 260, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                  {trayList.length === 0 && (
                    <Typography sx={{ p: 1.5, fontSize: 11, color: 'text.secondary', textAlign: 'center' }}>
                      {candidates.length === 0 ? 'กำลังโหลดรายชื่อ...' : 'วางครบทุกคนตามเงื่อนไขนี้แล้ว'}
                    </Typography>
                  )}
                  {trayList.map(c => {
                    const isArmed = armed?.ownerName.toLowerCase() === c.ownerName.toLowerCase();
                    return (
                      <Box key={c.ownerName}
                        onClick={() => { if (!c.placed) armSeat(c.ownerName, c.departmentId, c.looksLikeStorage); }}
                        sx={{
                          p: '7px 10px', borderBottom: '1px solid', borderColor: 'divider',
                          cursor: c.placed ? 'default' : 'pointer', fontSize: 12,
                          opacity: c.placed ? 0.45 : 1,
                          bgcolor: isArmed ? alpha(theme.palette.primary.main, 0.14) : undefined,
                          '&:hover': { bgcolor: c.placed ? undefined : 'action.hover' },
                          '&:last-of-type': { borderBottom: 'none' },
                        }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Box sx={{ fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.ownerName}
                          </Box>
                          {c.placed && <Box sx={{ fontSize: 9.5, color: 'success.main', fontWeight: 700 }}>วางแล้ว</Box>}
                          {isArmed && <Box sx={{ fontSize: 9.5, color: 'primary.main', fontWeight: 700 }}>เลือกอยู่</Box>}
                        </Box>
                        <Box sx={{ color: 'text.secondary', fontSize: 10 }}>
                          {c.departmentId} · {c.devices} ชิ้น
                          {c.pmPlanned && <Box component="span" sx={{ color: 'info.main' }}> · อยู่ในแผน PM</Box>}
                          {c.looksLikeStorage && <Box component="span" sx={{ color: 'warning.main', fontWeight: 700 }}> · น่าจะเป็นจุดเก็บ</Box>}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                {owners.length > 0 && (
                  <>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, mt: 1.75, mb: 0.5, color: 'text.secondary' }}>
                      ผลค้นหานอกรายการข้างบน
                    </Typography>
                    <Box sx={{ maxHeight: 160, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                      {owners.map(o => (
                        <Box key={o.ownerName} onClick={() => armSeat(o.ownerName, o.departmentId, o.looksLikeStorage)}
                          sx={{ p: '7px 10px', borderBottom: '1px solid', borderColor: 'divider', cursor: 'pointer', fontSize: 12, '&:hover': { bgcolor: 'action.hover' }, '&:last-of-type': { borderBottom: 'none' } }}>
                          <Box sx={{ fontWeight: 600 }}>{o.ownerName}</Box>
                          <Box sx={{ color: 'text.secondary', fontSize: 10 }}>
                            {o.departmentId || '—'} · {o.company || '—'} · {o.devices} ชิ้น
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </>
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
            <Box sx={{
                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: 'action.hover', p: 2,
                cursor: armed ? 'crosshair' : 'default',
              }}
              onClick={placeArmedAt}
              onDragOver={onDragOver} onDrop={e => { e.preventDefault(); setDragging(null); }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Box component="img" ref={imgRef} draggable={false}
                  src={live.plan.imageUrl.startsWith('http') ? live.plan.imageUrl : `${apiUrl}${live.plan.imageUrl}`}
                  alt={live.plan.name}
                  sx={{
                    display: 'block', maxWidth: '100%', maxHeight: 780, objectFit: 'contain',
                    border: '1px solid', borderColor: 'divider', borderRadius: 1.5, boxShadow: 1,
                    // แบบ CAD เป็นเอกสารก่อสร้าง หมึกส่วนใหญ่เป็นเส้นบอกระยะกับสัญลักษณ์
                    // ไฟฟ้าที่งาน IT ไม่ได้ใช้ หรี่ลงเพื่อให้ชั้นข้อมูลเป็นตัวเอก
                    opacity: dimPlan ? 0.28 : 1,
                    filter: dimPlan ? 'grayscale(1) contrast(0.72)' : 'none',
                    transition: 'opacity .2s, filter .2s',
                  }} />

                {/* โซนแผนก + ช่องโต๊ะ */}
                {showZones && zones.map(z => {
                  const col = z.color || theme.palette.primary.main;
                  return (
                    <React.Fragment key={`zone-${z.id}`}>
                      <Box sx={{
                        position: 'absolute', left: `${z.x}%`, top: `${z.y}%`,
                        width: `${z.w}%`, height: `${z.h}%`,
                        border: `1.5px solid ${alpha(col, 0.55)}`,
                        bgcolor: alpha(col, 0.06), borderRadius: '5px',
                        pointerEvents: 'none', zIndex: 1,
                      }} />
                      <Box sx={{
                        position: 'absolute', left: `${z.x}%`, top: `${z.y}%`,
                        transform: 'translate(3px, 3px)',
                        bgcolor: col, color: '#fff', px: 0.6, py: '1px',
                        borderRadius: '4px', fontSize: 9.5, fontWeight: 800,
                        lineHeight: 1.5, pointerEvents: 'none', zIndex: 2, whiteSpace: 'nowrap',
                      }}>
                        {z.code} {occupiedIn(z)}/{z.desks.length}
                      </Box>

                      {z.desks.map(d => {
                        const taken = occupiedDesks.has(`${z.id}:${d.index}`);
                        if (taken) return null;
                        const clickable = isEditMode && !!armed;
                        if (!showFreeDesks && !clickable) return null;
                        return (
                          <Tooltip key={`desk-${z.id}-${d.index}`} title={`${d.code} · โต๊ะว่าง`} arrow>
                            <Box
                              onClick={e => { e.stopPropagation(); if (clickable) placeOnDesk(z, d); }}
                              sx={{
                                position: 'absolute', left: `${d.cx}%`, top: `${d.cy}%`,
                                width: `${d.w}%`, height: `${d.h}%`,
                                transform: 'translate(-50%, -50%)',
                                border: `1px dashed ${alpha(theme.palette.text.disabled, 0.75)}`,
                                bgcolor: clickable ? alpha(theme.palette.primary.main, 0.1) : alpha('#fff', 0.35),
                                borderRadius: '4px', zIndex: 2,
                                cursor: clickable ? 'pointer' : 'default',
                                pointerEvents: clickable ? 'auto' : 'none',
                                '&:hover': clickable ? {
                                  bgcolor: alpha(theme.palette.primary.main, 0.28),
                                  borderColor: theme.palette.primary.main,
                                } : undefined,
                              }} />
                          </Tooltip>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

                {/* ที่นั่ง */}
                {seatsShown.map((seat, i) => {
                  const cfg = STATUS[seat.status];
                  const isSel = selected?.kind === 'seat' && selected.id === seat.id;
                  return (
                    <Box key={`seat-${seat.id || i}-${seat.ownerName}`}
                      draggable={isEditMode}
                      onDragStart={e => onDragStart(e, 'seat', i)}
                      onClick={e => { e.stopPropagation(); setSelected(isSel ? null : { kind: 'seat', id: seat.id }); }}
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
                      onClick={e => { e.stopPropagation(); setSelected(isSel ? null : { kind: 'spot', id: sp.id }); }}
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
                    ? `${selectedSeat.departmentId || '—'} · ${selectedSeat.deskCode ? `โต๊ะ ${selectedSeat.deskCode}` : 'ที่นั่งนอกตาราง'}`
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
