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
type ZoneKind = 'DESKS' | 'ROOM';
interface LiveZone {
  id: number; code: string; name: string | null; color: string | null;
  kind: ZoneKind;
  x: number; y: number; w: number; h: number; cols: number; rows: number;
  desks: LiveDesk[]; occupied: number;
}
interface TemplateRow {
  id: number; name: string; description: string | null; company: string | null;
  aspect: number | null; zoneCount: number; deskCount: number;
  createdBy: string | null; updatedAt: string;
}
interface LiveSpot {
  id: number; x: number; y: number; label: string | null; assetId: number;
  assetName: string | null; assetCode: string | null; type: string | null;
  kind: DeviceKind; ownerName: string | null; departmentId: string | null;
  pmStatus: PMStatus; pmDate: string | null;
}
interface LiveFrameAsset {
  assetId: number; assetName: string | null; assetCode: string | null;
  type: string | null; kind: DeviceKind; pmStatus: PMStatus; pmDate: string | null;
}
/** กรอบอุปกรณ์วาดเอง — อิสระจากตารางที่นั่ง/โซน เช่น ตู้ Rack มุมเซิร์ฟเวอร์ */
interface LiveFrame {
  id: number; x: number; y: number; w: number; h: number;
  label: string | null; color: string | null; assets: LiveFrameAsset[];
}
interface LivePlan {
  plan: {
    id: number; name: string; floor: string; building: string | null;
    company: string | null; imageUrl: string | null; aspect: number | null;
  };
  year: number;
  zones: LiveZone[];
  seats: LiveSeat[];
  spots: LiveSpot[];
  frames: LiveFrame[];
  summary: {
    seats: number; seatsDone: number; seatsUnplaced: number;
    devices: number; devicesDone: number; spots: number; byKind: Record<string, number>;
    desks: number; desksFree: number; seatsUnsnapped: number;
  };
}
interface PlanRow {
  id: number; name: string; floor: string; building: string | null;
  company: string | null; imageUrl: string | null; isActive: boolean;
}
interface OwnerRow {
  ownerName: string; departmentId: string | null; company: string | null;
  devices: number; computers: number; looksLikeStorage: boolean;
}
interface Candidate {
  ownerName: string; departmentId: string; devices: number;
  pmPlanned: boolean; placed: boolean; looksLikeStorage: boolean;
}

const thYear = (ad: number) => ad + 543;

/** สีให้โซนที่วาดใหม่ ไล่วนไปเรื่อย ๆ เพื่อให้โซนติดกันไม่ได้สีเดียวกัน */
const ZONE_COLORS = ['#2563eb', '#dc2626', '#15803d', '#a16207', '#db2777',
                     '#0891b2', '#ea580c', '#7c3aed', '#0284c7', '#b45309'];

/** ห้องกับจุดสังเกตไม่ควรแย่งสายตาไปจากโซนแผนก สีกลาง ๆ จึงเหมาะกว่าสีในชุดข้างบน */
const ROOM_COLOR = '#64748b';

/** สีเริ่มต้นของกรอบอุปกรณ์วาดเอง — แยกจากชุดสีโซนแผนกให้ดูออกว่าคนละชนิดกัน */
const FRAME_COLOR = '#0f766e';

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
  const [editTab, setEditTab] = useState<'seat' | 'spot' | 'zone' | 'frame'>('seat');
  const [draftSeats, setDraftSeats] = useState<LiveSeat[]>([]);
  const [draftSpots, setDraftSpots] = useState<LiveSpot[]>([]);
  const [saving, setSaving] = useState(false);

  // ชั้นที่เปิด/ปิดได้ — แบบ CAD เป็นเอกสารก่อสร้าง หมึกส่วนใหญ่เป็นเส้นบอกระยะ
  // กับสัญลักษณ์ไฟฟ้าที่งาน IT ไม่ได้ใช้ จึงหรี่ลงเป็นชั้นอ้างอิง
  // ผังที่แก้อยู่ ยังไม่บันทึก
  const [draftZones, setDraftZones] = useState<LiveZone[]>([]);
  const [drawing, setDrawing] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [zoneDrag, setZoneDrag] = useState<{ id: number; mode: 'move' | 'resize'; ox: number; oy: number } | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  // กรอบอุปกรณ์วาดเอง — ใช้กลไกลากวาดเดียวกับโซน (drawing/pctAt) แต่แยก state
  // การย้าย/ปรับขนาดออกจากโซน เพราะแก้ได้ทีละชนิดตามแท็บที่เลือกอยู่แล้ว
  const [draftFrames, setDraftFrames] = useState<LiveFrame[]>([]);
  const [frameDrag, setFrameDrag] = useState<{ id: number; mode: 'move' | 'resize'; ox: number; oy: number } | null>(null);
  // กรอบที่กำลังเปิดแผงผูกอุปกรณ์อยู่ในแถบเครื่องมือ — เปิดได้ทีละกรอบ
  const [assignOpenId, setAssignOpenId] = useState<number | null>(null);

  const [showZones, setShowZones] = useState(true);
  const [showFrames, setShowFrames] = useState(true);
  const [showFreeDesks, setShowFreeDesks] = useState(true);
  const [dimPlan, setDimPlan] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: 0, name: '', floor: '', building: '', company: '',
    // ผังวาดเองไม่มีรูป ต้องรู้สัดส่วนผืนวาด · 1.6 คือ 16:10 ซึ่งใกล้กับผังชั้นทั่วไป
    mode: 'image' as 'image' | 'blank', aspect: 1.6, templateId: 0,
  });
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

  /** ผืนวาด — เป็นตัวกำหนดระบบพิกัด ไม่ใช่รูป เพราะผังที่วาดเองไม่มีรูป */
  const surfaceRef = useRef<HTMLDivElement>(null);
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
      setDraftZones(res.data.zones || []);
      setDraftSeats(res.data.seats || []);
      setDraftSpots(res.data.spots || []);
      setDraftFrames(res.data.frames || []);
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

  useEffect(() => {
    if (!isModalOpen) return;
    floorPlanAPI.templates()
      .then(r => setTemplates(r.data || []))
      .catch(err => console.error(err));
  }, [isModalOpen]);

  const handleSaveTemplate = async () => {
    if (!live) return;
    const name = prompt('ตั้งชื่อเทมเพลต (ชื่อซ้ำจะเขียนทับของเดิม)',
      `${live.plan.building || live.plan.company || 'ผัง'} ชั้นแบบ ${live.plan.floor}`);
    if (!name?.trim()) return;
    try {
      // ต้องบันทึกผังลงชั้นก่อน เพราะเทมเพลตอ่านจากฐานข้อมูล ไม่ใช่จากฉบับร่างบนจอ
      await floorPlanAPI.updateZones(live.plan.id, draftZones.map(z => ({
        id: z.id > 0 ? z.id : null,
        code: z.code, name: z.name, color: z.color, kind: z.kind,
        x: z.x, y: z.y, w: z.w, h: z.h, cols: z.cols, rows: z.rows,
      })), year);
      const res = await floorPlanAPI.saveTemplate(live.plan.id, { name: name.trim() });
      await fetchLive(live.plan.id, year);
      alert(`บันทึกเทมเพลต "${res.data.name}" แล้ว — ใช้ได้ตอนสร้างแปลนใหม่`);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'บันทึกเทมเพลตไม่สำเร็จ');
    }
  };

  /**
   * ทับผังของชั้นนี้ด้วยเทมเพลต
   *
   * ย้อนยากกว่าการสร้างชั้นใหม่มาก เพราะโซนเดิมหายทั้งชุด คนที่นั่งอยู่จะหลุด
   * ออกจากตาราง (ไม่หายไป แต่ต้องมาจัดใหม่) จึงบอกจำนวนคนที่กระทบก่อนเสมอ
   */
  const handleApplyTemplate = async (t: TemplateRow) => {
    if (!live) return;
    const seated = draftSeats.filter(s => s.zoneId !== null).length;
    const warn = seated
      ? `\n\nโซนเดิม ${draftZones.length} โซนจะถูกแทนที่ และที่นั่ง ${seated} คนจะหลุดออกจากตาราง (ยังอยู่บนแปลน ต้องมาวางใหม่)`
      : `\n\nโซนเดิม ${draftZones.length} โซนจะถูกแทนที่`;
    if (!confirm(`ใช้เทมเพลต "${t.name}" (${t.zoneCount} โซน ${t.deskCount} โต๊ะ) กับแปลนนี้?${warn}`)) return;
    setApplyingTemplate(true);
    try {
      await floorPlanAPI.applyTemplate(live.plan.id, t.id, year);
      setTemplatePickerOpen(false);
      await fetchLive(live.plan.id, year);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'ใช้เทมเพลตไม่สำเร็จ');
    } finally { setApplyingTemplate(false); }
  };

  const handleDeleteTemplate = async (t: TemplateRow) => {
    if (!confirm(`ลบเทมเพลต "${t.name}"? แปลนที่เคยใช้เทมเพลตนี้ไม่ได้รับผลกระทบ`)) return;
    try {
      await floorPlanAPI.deleteTemplate(t.id);
      setTemplates(prev => prev.filter(x => x.id !== t.id));
    } catch { alert('ลบเทมเพลตไม่สำเร็จ'); }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlan(true);
    try {
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('floor', formData.floor);
      fd.append('building', formData.building);
      fd.append('company', formData.company);
      fd.append('aspect', String(formData.aspect));
      if (formData.mode === 'image' && imageFile) fd.append('image', imageFile);
      if (!formData.id && formData.templateId) fd.append('templateId', String(formData.templateId));
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

  /** แปลงตำแหน่งเมาส์เป็น % ของผืนวาด คืน null เมื่อคลิกนอกผืน */
  const pctAt = (e: { clientX: number; clientY: number }) => {
    const el = surfaceRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    return (x < 0 || x > 100 || y < 0 || y > 100) ? null : { x, y };
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
    if (!isEditMode || !armed || !surfaceRef.current) return;
    const r = surfaceRef.current.getBoundingClientRect();
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

  /* ── แก้ผัง ─────────────────────────────────────────────────────────── */

  const zoneEditing = isEditMode && editTab === 'zone';
  // กรอบอุปกรณ์ใช้กลไกลากวาดเดียวกับโซน (pctAt + drawing) แค่แยกแท็บ — วาดได้
  // ทีละอย่างอยู่แล้วเพราะเลือกได้ทีละแท็บ จึงใช้ drawing ร่วมกันได้โดยไม่ชนกัน
  const frameEditing = isEditMode && editTab === 'frame';

  /** ลากกรอบบนผืนวาดเพื่อสร้างโซน/กรอบอุปกรณ์ใหม่ ตามแท็บที่เปิดอยู่ */
  const startDraw = (e: React.MouseEvent) => {
    if (!(zoneEditing || frameEditing) || zoneDrag || frameDrag) return;
    const p = pctAt(e);
    if (!p) return;
    setDrawing({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };

  const moveDraw = (e: React.MouseEvent) => {
    const p = pctAt(e);
    if (!p) return;
    if (drawing) { setDrawing(d => d && { ...d, x1: p.x, y1: p.y }); return; }
    if (zoneDrag) {
      setDraftZones(prev => prev.map(z => {
        if (z.id !== zoneDrag.id) return z;
        if (zoneDrag.mode === 'move') {
          // หนีบไว้ในผืน ไม่งั้นลากโซนออกนอกจอแล้วหาไม่เจอ
          return { ...z,
            x: Math.max(0, Math.min(100 - z.w, p.x - zoneDrag.ox)),
            y: Math.max(0, Math.min(100 - z.h, p.y - zoneDrag.oy)) };
        }
        return { ...z, w: Math.max(2, Math.min(100 - z.x, p.x - z.x)), h: Math.max(2, Math.min(100 - z.y, p.y - z.y)) };
      }));
      return;
    }
    if (frameDrag) {
      setDraftFrames(prev => prev.map(f => {
        if (f.id !== frameDrag.id) return f;
        if (frameDrag.mode === 'move') {
          return { ...f,
            x: Math.max(0, Math.min(100 - f.w, p.x - frameDrag.ox)),
            y: Math.max(0, Math.min(100 - f.h, p.y - frameDrag.oy)) };
        }
        return { ...f, w: Math.max(1, Math.min(100 - f.x, p.x - f.x)), h: Math.max(1, Math.min(100 - f.y, p.y - f.y)) };
      }));
    }
  };

  const endDraw = () => {
    setZoneDrag(null);
    setFrameDrag(null);
    if (!drawing) return;
    const x = Math.min(drawing.x0, drawing.x1), y = Math.min(drawing.y0, drawing.y1);
    const w = Math.abs(drawing.x1 - drawing.x0), h = Math.abs(drawing.y1 - drawing.y0);
    const wasFrame = frameEditing;
    setDrawing(null);
    // ลากสั้น ๆ มักเป็นการคลิกพลาด ไม่ใช่ตั้งใจสร้างโซน/กรอบ
    if (w < 2 || h < 2) return;
    if (wasFrame) {
      const n = draftFrames.length;
      setDraftFrames(prev => [...prev, {
        // id ติดลบคือกรอบใหม่ที่ยังไม่มีในฐานข้อมูล ใช้แยกจากของที่บันทึกแล้ว
        id: -(Date.now() % 1e9) - n,
        x, y, w, h, label: null, color: FRAME_COLOR, assets: [],
      }]);
      return;
    }
    const n = draftZones.length;
    setDraftZones(prev => [...prev, {
      // id ติดลบคือโซนใหม่ที่ยังไม่มีในฐานข้อมูล ใช้แยกจากของที่บันทึกแล้ว
      id: -(Date.now() % 1e9) - n,
      code: `Z${n + 1}`, name: null, color: ZONE_COLORS[n % ZONE_COLORS.length],
      kind: 'DESKS', x, y, w, h, cols: 3, rows: 3, desks: [], occupied: 0,
    }]);
  };

  const patchZone = (id: number, patch: Partial<LiveZone>) =>
    setDraftZones(prev => prev.map(z => {
      if (z.id !== id) return z;
      const next = { ...z, ...patch };
      /* เปลี่ยนเป็นห้อง/จุดสังเกตแล้วยังใช้สีจากชุดโซนแผนกอยู่ ให้เปลี่ยนเป็นสีกลาง
         เพราะห้องประชุมสีแดงสดจะแย่งสายตาไปจากโซนที่ต้องดูจริง — แต่ถ้าเลือกสีเอง
         มาแล้วไม่ต้องไปยุ่ง */
      if (patch.kind === 'ROOM' && ZONE_COLORS.includes(String(z.color))) next.color = ROOM_COLOR;
      if (patch.kind === 'DESKS' && z.color === ROOM_COLOR) {
        next.color = ZONE_COLORS[draftZones.findIndex(x => x.id === id) % ZONE_COLORS.length];
      }
      return next;
    }));

  const removeZone = (id: number) => {
    const z = draftZones.find(x => x.id === id);
    const seated = draftSeats.filter(s => s.zoneId === id).length;
    if (seated && !confirm(`โซน ${z?.code} มีคนนั่งอยู่ ${seated} คน — ลบแล้วคนเหล่านั้นจะหลุดออกจากตาราง (ไม่หายไป) ยืนยันไหม`)) return;
    setDraftZones(prev => prev.filter(x => x.id !== id));
    setDraftSeats(prev => prev.map(s =>
      s.zoneId === id ? { ...s, zoneId: null, deskIndex: null, deskCode: null } : s));
  };

  const patchFrame = (id: number, patch: Partial<LiveFrame>) =>
    setDraftFrames(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));

  const removeFrame = (id: number) => {
    setDraftFrames(prev => prev.filter(x => x.id !== id));
    if (assignOpenId === id) setAssignOpenId(null);
  };

  /** ผูกอุปกรณ์เข้ากรอบ — kind ตั้งเป็น 'other' ไปก่อน (เหมือน addSpot) เพราะยัง
   *  ไม่รู้ชนิดจริงจนกว่าจะบันทึกแล้วดึง live ใหม่จาก server */
  const addDeviceToFrame = (frameId: number, a: any) => {
    setDraftFrames(prev => prev.map(f => {
      if (f.id !== frameId) return f;
      if (f.assets.some(x => x.assetId === a.id)) return f;
      return { ...f, assets: [...f.assets, {
        assetId: a.id, assetName: a.assetName, assetCode: a.assetCode, type: a.type,
        kind: 'other' as DeviceKind, pmStatus: 'NO_PM' as PMStatus, pmDate: null,
      }] };
    }));
    setSearch(''); setAssets([]);
  };

  const removeDeviceFromFrame = (frameId: number, assetId: number) => {
    setDraftFrames(prev => prev.map(f =>
      f.id === frameId ? { ...f, assets: f.assets.filter(a => a.assetId !== assetId) } : f));
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
      /* ผังต้องบันทึกก่อนที่นั่ง เพราะ server คำนวณตำแหน่งที่นั่งจากตารางของโซน
         ถ้าบันทึกกลับลำดับ ที่นั่งจะถูกวางบนผังเก่าแล้วเพี้ยนทันทีที่ผังเปลี่ยน */
      const zoneRes = await floorPlanAPI.updateZones(live.plan.id, draftZones.map(z => ({
        // โซนใหม่ยังไม่มี id จริง ส่ง null ให้ server สร้างให้
        id: z.id > 0 ? z.id : null,
        code: z.code, name: z.name, color: z.color, kind: z.kind,
        x: z.x, y: z.y, w: z.w, h: z.h, cols: z.cols, rows: z.rows,
      })), year);

      /* id ของโซนที่เพิ่งสร้างเปลี่ยนไปแล้ว ที่นั่งที่ชี้ id ชั่วคราวติดลบต้อง
         ย้ายมาชี้ id จริง มิฉะนั้นจะหลุดออกจากตารางทั้งที่ผู้ใช้วางไว้แล้ว */
      const byCode = new Map<string, number>(
        ((zoneRes.data?.zones || []) as LiveZone[]).map(z => [z.code, z.id]));
      const codeOf = new Map<number, string>(draftZones.map(z => [z.id, z.code]));

      await floorPlanAPI.updateSeats(live.plan.id, draftSeats.map(s => ({
        x: s.x, y: s.y, label: s.label, ownerName: s.ownerName, departmentId: s.departmentId, note: s.note,
        zoneId: s.zoneId === null ? null : (byCode.get(codeOf.get(s.zoneId) ?? '') ?? null),
        deskIndex: s.deskIndex,
      })), year);
      await floorPlanAPI.updatePins(live.plan.id, draftSpots.map(s => ({
        assetId: s.assetId, x: s.x, y: s.y, label: s.label,
      })));
      await floorPlanAPI.updateFrames(live.plan.id, draftFrames.map(f => ({
        // กรอบใหม่ยังไม่มี id จริง ส่ง null ให้ server สร้างให้ เหมือนโซน
        id: f.id > 0 ? f.id : null,
        x: f.x, y: f.y, w: f.w, h: f.h, label: f.label, color: f.color,
        assetIds: f.assets.map(a => a.assetId),
      })), year);
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
    if (!dragging || !surfaceRef.current) return;
    const r = surfaceRef.current.getBoundingClientRect();
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

  const zones = isEditMode ? draftZones : (live?.zones || []);

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

  /**
   * เติมคนทั้งแผนกลงโต๊ะว่างในโซนของแผนกนั้นรวดเดียว
   *
   * ปักทีละคนหมายถึงกดร้อยกว่าครั้งต่อชั้น ซึ่งเป็นงานที่มักไม่ได้ทำจริง —
   * แผนผังเดิมค้างอยู่ที่หมุดเดียวมาตลอดด้วยเหตุผลนี้ เรียงลงตามลำดับก่อนแล้ว
   * ให้คนมาลากสลับเฉพาะตัวที่ผิด เร็วกว่าการวางถูกตั้งแต่แรกทีละคนมาก
   *
   * จับคู่แผนกกับโซนด้วยรหัสตรง ๆ (แผนก ACC -> โซน ACC) แผนกที่ไม่มีโซนรองรับ
   * จะถูกข้ามและรายงานกลับ ไม่ใช่เดาว่าควรไปอยู่โซนไหน
   */
  const autoFillDepts = (codes: string[]) => {
    const zoneOf = new Map(draftZones.filter(z => z.kind === 'DESKS').map(z => [z.code.toUpperCase(), z]));
    const taken = new Set(draftSeats
      .filter(s => s.zoneId !== null && s.deskIndex !== null)
      .map(s => `${s.zoneId}:${s.deskIndex}`));
    const seated = new Set(draftSeats.map(s => String(s.ownerName ?? '').toLowerCase()));

    const added: LiveSeat[] = [];
    const noZone: string[] = [];
    let noDesk = 0;

    for (const code of codes) {
      const z = zoneOf.get(code.toUpperCase());
      const people = candidates.filter(c =>
        c.departmentId === code && !seated.has(c.ownerName.toLowerCase())
        && (!plannedOnly || c.pmPlanned));
      if (!people.length) continue;
      if (!z) { noZone.push(`${code} (${people.length} คน)`); continue; }

      const free = z.desks.filter(d => !taken.has(`${z.id}:${d.index}`));
      for (const c of people) {
        const d = free.shift();
        if (!d) { noDesk++; continue; }
        taken.add(`${z.id}:${d.index}`);
        seated.add(c.ownerName.toLowerCase());
        added.push({
          id: 0, x: d.cx, y: d.cy, label: null,
          zoneId: z.id, deskIndex: d.index, deskCode: d.code,
          ownerName: c.ownerName, departmentId: c.departmentId, note: null,
          devices: [], status: 'NO_PM', looksLikeStorage: c.looksLikeStorage,
        });
      }
    }

    if (!added.length && !noZone.length && !noDesk) { alert('ไม่มีใครเหลือให้เติมแล้ว'); return; }
    setDraftSeats(prev => [...prev, ...added]);

    const notes = [`วาง ${added.length} คนลงโต๊ะแล้ว — ลากสลับตัวที่ผิดได้`];
    if (noDesk) notes.push(`อีก ${noDesk} คนยังไม่ได้วาง เพราะโต๊ะในโซนเต็ม — เพิ่มแถวในแท็บผังโซน`);
    if (noZone.length) notes.push(`ไม่มีโซนรองรับ: ${noZone.join(', ')}`);
    alert(notes.join('\n\n'));
  };

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
  const framesShown = isEditMode ? draftFrames : (live?.frames || []);
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

  /** จำนวนที่ปุ่มเติมจะวางได้จริง กับจำนวนที่โต๊ะไม่พอ — คิดก่อนกดจะได้ไม่ต้องเดา */
  const fillable = useMemo(() => {
    const zoneOf = new Map(draftZones.filter(z => z.kind === 'DESKS').map(z => [z.code.toUpperCase(), z]));
    const taken = new Set(draftSeats
      .filter(s => s.zoneId !== null && s.deskIndex !== null)
      .map(s => `${s.zoneId}:${s.deskIndex}`));
    const depts = deptFilter ? [deptFilter] : deptGroups.map(g => g.dept);
    let total = 0, short = 0;
    for (const code of depts) {
      const waiting = deptGroups.find(g => g.dept === code)?.remaining ?? 0;
      const z = zoneOf.get(code.toUpperCase());
      const free = z ? z.desks.filter(d => !taken.has(`${z.id}:${d.index}`)).length : 0;
      total += Math.min(waiting, free);
      short += Math.max(0, waiting - free);
    }
    return { total, short };
  }, [draftZones, draftSeats, deptGroups, deptFilter]);

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
              onClick={() => { setFormData({ id: 0, name: '', floor: '', building: '', company: '', mode: 'image', aspect: 1.6, templateId: 0 }); setImageFile(null); setIsModalOpen(true); }}>
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
                  setDrawing(null); setZoneDrag(null); setFrameDrag(null); setAssignOpenId(null);
                  setDraftZones(live.zones); setDraftSeats(live.seats); setDraftSpots(live.spots); setDraftFrames(live.frames);
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
                  onClick={() => { setFormData({ id: live.plan.id, name: live.plan.name, floor: live.plan.floor, building: live.plan.building || '', company: live.plan.company || '', mode: live.plan.imageUrl ? 'image' : 'blank', aspect: live.plan.aspect ?? 1.6, templateId: 0 }); setIsModalOpen(true); }}>
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
              ['กรอบอุปกรณ์', showFrames, setShowFrames],
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
              {([['seat', 'ที่นั่ง'], ['spot', 'ส่วนกลาง'], ['zone', 'ผังโซน'], ['frame', 'กรอบ']] as const).map(([k, label]) => (
                <Button key={k} size="small" fullWidth
                  variant={editTab === k ? 'contained' : 'outlined'}
                  onClick={() => { setEditTab(k); setSearch(''); setOwners([]); setAssets([]); setAssignOpenId(null); }}
                  sx={{ fontSize: 11, px: 0.5, minWidth: 0 }}>
                  {label}
                </Button>
              ))}
            </Box>

            {editTab === 'zone' ? (
              <>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.7, mb: 1.5 }}>
                  ลากกรอบบนแปลนเพื่อสร้างโซนใหม่ · ลากตัวโซนเพื่อย้าย · ลากจุดมุมล่างขวาเพื่อปรับขนาด<br />
                  ตั้ง <b>คอลัมน์ × แถว</b> ให้ตรงกับจำนวนโต๊ะจริงในโซนนั้น
                </Typography>

                <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5 }}>
                  <Button size="small" variant="outlined" fullWidth sx={{ fontSize: 11 }}
                    onClick={handleSaveTemplate} disabled={!draftZones.length}>
                    บันทึกเป็นเทมเพลต
                  </Button>
                  <Button size="small" variant="outlined" fullWidth sx={{ fontSize: 11 }}
                    onClick={() => { setTemplatePickerOpen(true); floorPlanAPI.templates().then(r => setTemplates(r.data || [])).catch(console.error); }}>
                    ใช้เทมเพลต
                  </Button>
                </Box>

                <Box sx={{ maxHeight: 460, overflowY: 'auto' }}>
                  {draftZones.length === 0 && (
                    <Typography sx={{ p: 2, fontSize: 11, color: 'text.secondary', textAlign: 'center' }}>
                      ยังไม่มีโซน — ลากกรอบบนแปลนเพื่อเริ่ม
                    </Typography>
                  )}
                  {draftZones.map(z => (
                    <Box key={z.id} sx={{
                      p: 1, mb: 1, borderRadius: 1.5, border: '1px solid',
                      borderColor: alpha(z.color || theme.palette.primary.main, 0.5),
                      bgcolor: alpha(z.color || theme.palette.primary.main, 0.05),
                    }}>
                      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.75 }}>
                        <TextField size="small" value={z.code} label="รหัส"
                          onChange={e => patchZone(z.id, { code: e.target.value.toUpperCase() })}
                          sx={{ width: 88, '& input': { fontSize: 12, fontWeight: 700, py: 0.6 } }} />
                        <TextField size="small" value={z.name ?? ''} label="ชื่อ" fullWidth
                          onChange={e => patchZone(z.id, { name: e.target.value })}
                          sx={{ '& input': { fontSize: 12, py: 0.6 } }} />
                        <IconButton aria-label="ปิด" size="small" color="error" onClick={() => removeZone(z.id)}>
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                        <Select size="small" value={z.kind}
                          onChange={e => patchZone(z.id, { kind: e.target.value as ZoneKind })}
                          sx={{ fontSize: 11.5, flex: 1, '& .MuiSelect-select': { py: 0.6 } }}>
                          <MenuItem value="DESKS" sx={{ fontSize: 12 }}>โซนโต๊ะทำงาน</MenuItem>
                          <MenuItem value="ROOM" sx={{ fontSize: 12 }}>ห้อง / จุดสังเกต</MenuItem>
                        </Select>
                        {z.kind === 'DESKS' && (
                          <>
                            <TextField size="small" type="number" label="คอลัมน์" value={z.cols}
                              onChange={e => patchZone(z.id, { cols: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                              sx={{ width: 76, '& input': { fontSize: 12, py: 0.6 } }} />
                            <TextField size="small" type="number" label="แถว" value={z.rows}
                              onChange={e => patchZone(z.id, { rows: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                              sx={{ width: 66, '& input': { fontSize: 12, py: 0.6 } }} />
                          </>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center', mt: 0.75, flexWrap: 'wrap' }}>
                        {[...ZONE_COLORS, ROOM_COLOR].map(c => (
                          <Box key={c} onClick={() => patchZone(z.id, { color: c })}
                            sx={{
                              width: 15, height: 15, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                              border: z.color === c ? '2px solid' : '1px solid',
                              borderColor: z.color === c ? 'text.primary' : alpha('#000', 0.15),
                              transition: 'transform .12s',
                              '&:hover': { transform: 'scale(1.2)' },
                            }} />
                        ))}
                      </Box>
                      {z.kind === 'DESKS' && (
                        <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.5 }}>
                          {z.cols * z.rows} โต๊ะ · {z.code}-01 ถึง {z.code}-{String(z.cols * z.rows).padStart(2, '0')}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </>
            ) : editTab === 'seat' ? (
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

                <Box sx={{ display: 'flex', gap: 0.75, mt: 1.25 }}>
                  <Button size="small" variant="contained" fullWidth sx={{ fontSize: 11 }}
                    disabled={!fillable.total}
                    onClick={() => autoFillDepts(deptFilter ? [deptFilter] : deptGroups.map(g => g.dept))}>
                    {deptFilter
                      ? `เติม ${fillable.total} คนลง ${deptFilter}`
                      : `เติมทุกแผนก (${fillable.total} คน)`}
                  </Button>
                </Box>
                {!!fillable.total && (
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.5 }}>
                    เรียงลงโต๊ะว่างตามลำดับรายชื่อ แล้วลากสลับตัวที่ผิด — เร็วกว่ากดทีละคน
                    {fillable.short > 0 && ` · โต๊ะไม่พอ ${fillable.short} คน`}
                  </Typography>
                )}

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
                      <IconButton aria-label="ปิด" size="small" color="error" onClick={() => setDraftSeats(p => p.filter((_, j) => j !== i))}>
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </>
            ) : editTab === 'spot' ? (
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
                      <IconButton aria-label="ปิด" size="small" color="error" onClick={() => setDraftSpots(p => p.filter((_, j) => j !== i))}>
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </>
            ) : (
              <>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.7, mb: 1.5 }}>
                  ลากกรอบบนแปลนเพื่อสร้างกรอบอุปกรณ์ใหม่ (เช่น ตู้ Rack มุมเซิร์ฟเวอร์) · ลากตัวกรอบเพื่อย้าย ·
                  ลากจุดมุมล่างขวาเพื่อปรับขนาด แล้วผูกอุปกรณ์เข้ากรอบด้านล่าง
                </Typography>

                <Box sx={{ maxHeight: 460, overflowY: 'auto' }}>
                  {draftFrames.length === 0 && (
                    <Typography sx={{ p: 2, fontSize: 11, color: 'text.secondary', textAlign: 'center' }}>
                      ยังไม่มีกรอบอุปกรณ์ — ลากกรอบบนแปลนเพื่อเริ่ม
                    </Typography>
                  )}
                  {draftFrames.map(f => {
                    const open = assignOpenId === f.id;
                    return (
                      <Box key={f.id} sx={{
                        p: 1, mb: 1, borderRadius: 1.5, border: '1px solid',
                        borderColor: alpha(f.color || FRAME_COLOR, 0.5),
                        bgcolor: alpha(f.color || FRAME_COLOR, 0.05),
                      }}>
                        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.75 }}>
                          <TextField size="small" value={f.label ?? ''} label="ชื่อกรอบ" fullWidth
                            placeholder="เช่น Rack ชั้น 3"
                            onChange={e => patchFrame(f.id, { label: e.target.value })}
                            sx={{ '& input': { fontSize: 12, py: 0.6 } }} />
                          <IconButton aria-label="ปิด" size="small" color="error" onClick={() => removeFrame(f.id)}>
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center', mb: 0.75, flexWrap: 'wrap' }}>
                          {[FRAME_COLOR, ...ZONE_COLORS].map(c => (
                            <Box key={c} onClick={() => patchFrame(f.id, { color: c })}
                              sx={{
                                width: 15, height: 15, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                                border: f.color === c ? '2px solid' : '1px solid',
                                borderColor: f.color === c ? 'text.primary' : alpha('#000', 0.15),
                                transition: 'transform .12s',
                                '&:hover': { transform: 'scale(1.2)' },
                              }} />
                          ))}
                        </Box>

                        <Button size="small" fullWidth variant="outlined"
                          onClick={() => { setAssignOpenId(open ? null : f.id); setSearch(''); setAssets([]); }}
                          sx={{ fontSize: 11 }}>
                          {open ? 'ปิด' : `ผูกอุปกรณ์ (${f.assets.length})`}
                        </Button>

                        {open && (
                          <Box sx={{ mt: 1 }}>
                            <TextField fullWidth size="small" placeholder="ค้นอุปกรณ์ที่จะผูกเข้ากรอบนี้..."
                              value={search} onChange={e => setSearch(e.target.value)}
                              InputProps={{ endAdornment: searching ? <CircularProgress size={14} /> : undefined }} />
                            {assets.length > 0 && (
                              <Box sx={{ mt: 0.75, maxHeight: 160, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                                {assets.map(a => (
                                  <Box key={a.id} onClick={() => addDeviceToFrame(f.id, a)}
                                    sx={{ p: '6px 10px', borderBottom: '1px solid', borderColor: 'divider', cursor: 'pointer', fontSize: 11.5, '&:hover': { bgcolor: 'action.hover' }, '&:last-of-type': { borderBottom: 'none' } }}>
                                    <Box sx={{ fontWeight: 600 }}>{a.assetName || a.assetCode || `#${a.id}`}</Box>
                                    <Box sx={{ color: 'text.secondary', fontSize: 10 }}>{a.type} · {a.departmentId || '—'}</Box>
                                  </Box>
                                ))}
                              </Box>
                            )}
                            <Box sx={{ mt: 0.75 }}>
                              {f.assets.length === 0 ? (
                                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', textAlign: 'center', py: 1 }}>
                                  ยังไม่มีอุปกรณ์ในกรอบนี้
                                </Typography>
                              ) : f.assets.map(a => (
                                <Box key={a.assetId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '5px 8px', bgcolor: 'action.hover', borderRadius: 1, mb: 0.5, fontSize: 11.5 }}>
                                  <Box sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {a.assetName || a.assetCode}
                                  </Box>
                                  <IconButton aria-label="ปิด" size="small" color="error" onClick={() => removeDeviceFromFrame(f.id, a.assetId)}>
                                    <CloseIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
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
              <Box
                ref={surfaceRef}
                onMouseDown={startDraw}
                onMouseMove={moveDraw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                sx={{
                  position: 'relative', display: 'block',
                  border: '1px solid', borderColor: 'divider', borderRadius: 1.5, boxShadow: 1,
                  overflow: 'hidden', bgcolor: 'background.paper',
                  cursor: zoneEditing ? 'crosshair' : undefined,
                  // ผังที่มีรูปยึดขนาดตามรูป ส่วนผังที่วาดเองยึดตามสัดส่วนที่ตั้งไว้
                  ...(live.plan.imageUrl
                    ? { width: 'fit-content', maxWidth: '100%' }
                    : { width: '100%', aspectRatio: String(live.plan.aspect ?? 1.6), maxHeight: 780 }),
                }}>
                {live.plan.imageUrl ? (
                  <Box component="img" draggable={false}
                    src={live.plan.imageUrl.startsWith('http') ? live.plan.imageUrl : `${apiUrl}${live.plan.imageUrl}`}
                    alt={live.plan.name}
                    sx={{
                      display: 'block', maxWidth: '100%', maxHeight: 780, objectFit: 'contain',
                      // แบบ CAD เป็นเอกสารก่อสร้าง หมึกส่วนใหญ่เป็นเส้นบอกระยะกับสัญลักษณ์
                      // ไฟฟ้าที่งาน IT ไม่ได้ใช้ หรี่ลงเพื่อให้ชั้นข้อมูลเป็นตัวเอก
                      opacity: dimPlan ? 0.28 : 1,
                      filter: dimPlan ? 'grayscale(1) contrast(0.72)' : 'none',
                      transition: 'opacity .2s, filter .2s',
                    }} />
                ) : (
                  // ผืนว่างพร้อมตารางอ้างอิง ให้กะระยะตอนวาดโซนได้
                  <Box sx={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `linear-gradient(${alpha(theme.palette.text.disabled, 0.18)} 1px, transparent 1px),
                                      linear-gradient(90deg, ${alpha(theme.palette.text.disabled, 0.18)} 1px, transparent 1px)`,
                    backgroundSize: '5% 5%',
                  }} />
                )}

                {/* โซนแผนก + ช่องโต๊ะ */}
                {showZones && zones.map(z => {
                  const col = z.color || theme.palette.primary.main;
                  const isRoom = z.kind === 'ROOM';
                  return (
                    <React.Fragment key={`zone-${z.id}`}>
                      <Box
                        onMouseDown={e => {
                          if (!zoneEditing) return;
                          e.stopPropagation();
                          const p = pctAt(e);
                          if (p) setZoneDrag({ id: z.id, mode: 'move', ox: p.x - z.x, oy: p.y - z.y });
                        }}
                        sx={{
                          position: 'absolute', left: `${z.x}%`, top: `${z.y}%`,
                          width: `${z.w}%`, height: `${z.h}%`,
                          border: `1.5px ${isRoom ? 'dashed' : 'solid'} ${alpha(col, isRoom ? 0.75 : 0.55)}`,
                          bgcolor: alpha(col, isRoom ? 0.1 : 0.06), borderRadius: '5px',
                          pointerEvents: zoneEditing ? 'auto' : 'none',
                          cursor: zoneEditing ? 'move' : undefined,
                          zIndex: 1,
                        }} />
                      <Box sx={{
                        position: 'absolute', left: `${z.x}%`, top: `${z.y}%`,
                        transform: 'translate(3px, 3px)',
                        bgcolor: col, color: '#fff', px: 0.6, py: '1px',
                        borderRadius: '4px', fontSize: 9.5, fontWeight: 800,
                        lineHeight: 1.5, pointerEvents: 'none', zIndex: 2, whiteSpace: 'nowrap',
                      }}>
                        {z.code}{isRoom ? '' : ` ${occupiedIn(z)}/${z.desks.length}`}
                      </Box>
                      {isRoom && z.name && (
                        <Box sx={{
                          position: 'absolute', left: `${z.x + z.w / 2}%`, top: `${z.y + z.h / 2}%`,
                          transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 2,
                          fontSize: 11, fontWeight: 700, color: alpha(col, 0.95), whiteSpace: 'nowrap',
                        }}>{z.name}</Box>
                      )}
                      {zoneEditing && (
                        // มุมล่างขวาไว้ลากปรับขนาด
                        <Box
                          onMouseDown={e => { e.stopPropagation(); setZoneDrag({ id: z.id, mode: 'resize', ox: 0, oy: 0 }); }}
                          sx={{
                            position: 'absolute', left: `${z.x + z.w}%`, top: `${z.y + z.h}%`,
                            transform: 'translate(-50%,-50%)', width: 12, height: 12,
                            bgcolor: '#fff', border: `2px solid ${col}`, borderRadius: '3px',
                            cursor: 'nwse-resize', zIndex: 6,
                          }} />
                      )}

                      {z.desks.map(d => {
                        const taken = occupiedDesks.has(`${z.id}:${d.index}`);
                        if (taken) return null;
                        const clickable = isEditMode && !!armed;
                        if (!showFreeDesks && !clickable) return null;
                        // ช่องโต๊ะบนจอกว้างราว 22px ซึ่งเล็กเกินกว่าจะกดแม่น กรอบที่กดได้
                        // จึงกินเต็มช่องในตาราง ส่วนกรอบที่เห็นยังเล็กกว่าเพื่อให้มีร่องห่าง
                        // ระหว่างโต๊ะ — โตขึ้นได้เท่านี้โดยไม่ไปทับโต๊ะข้าง ๆ
                        const hitW = d.w / 0.9, hitH = d.h / 0.82;
                        return (
                          <Tooltip key={`desk-${z.id}-${d.index}`} title={`${d.code} · โต๊ะว่าง`} arrow>
                            <Box
                              onClick={e => { e.stopPropagation(); if (clickable) placeOnDesk(z, d); }}
                              sx={{
                                position: 'absolute', left: `${d.cx}%`, top: `${d.cy}%`,
                                width: `${hitW}%`, height: `${hitH}%`,
                                transform: 'translate(-50%, -50%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                zIndex: 2,
                                cursor: clickable ? 'pointer' : 'default',
                                pointerEvents: clickable ? 'auto' : 'none',
                                '& > *': {
                                  width: `${(d.w / hitW) * 100}%`, height: `${(d.h / hitH) * 100}%`,
                                  border: `1px dashed ${alpha(theme.palette.text.disabled, 0.75)}`,
                                  bgcolor: clickable ? alpha(theme.palette.primary.main, 0.1) : alpha('#fff', 0.35),
                                  borderRadius: '4px',
                                },
                                '&:hover > *': clickable ? {
                                  bgcolor: alpha(theme.palette.primary.main, 0.3),
                                  borderColor: theme.palette.primary.main,
                                  borderStyle: 'solid',
                                } : undefined,
                              }}>
                              <Box />
                            </Box>
                          </Tooltip>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

                {/* กรอบอุปกรณ์วาดเอง — เส้นประแยกจากกรอบทึบของโซน ให้ดูออกว่าคนละชนิด */}
                {showFrames && framesShown.map(f => {
                  const col = f.color || FRAME_COLOR;
                  return (
                    <Tooltip key={`frame-${f.id}`} arrow title={
                      <Box sx={{ py: 0.25 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{f.label || 'กรอบอุปกรณ์'}</Typography>
                        {f.assets.length === 0 ? (
                          <Typography sx={{ fontSize: 10.5, opacity: 0.7 }}>ยังไม่มีอุปกรณ์ในกรอบนี้</Typography>
                        ) : f.assets.map(a => (
                          <Typography key={a.assetId} sx={{ fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: STATUS[a.pmStatus].color, flexShrink: 0 }} />
                            {a.assetName || a.assetCode || a.type || 'อุปกรณ์'}
                          </Typography>
                        ))}
                      </Box>
                    }>
                      <Box
                        onMouseDown={e => {
                          if (!frameEditing) return;
                          e.stopPropagation();
                          const p = pctAt(e);
                          if (p) setFrameDrag({ id: f.id, mode: 'move', ox: p.x - f.x, oy: p.y - f.y });
                        }}
                        sx={{
                          position: 'absolute', left: `${f.x}%`, top: `${f.y}%`,
                          width: `${f.w}%`, height: `${f.h}%`,
                          border: `1.5px dashed ${alpha(col, 0.85)}`,
                          bgcolor: alpha(col, 0.08), borderRadius: '5px',
                          pointerEvents: frameEditing ? 'auto' : 'none',
                          cursor: frameEditing ? 'move' : undefined,
                          zIndex: 1,
                        }}>
                        <Box sx={{
                          position: 'absolute', left: 0, top: 0, transform: 'translate(3px, 3px)',
                          bgcolor: col, color: '#fff', px: 0.6, py: '1px',
                          borderRadius: '4px', fontSize: 9.5, fontWeight: 800,
                          lineHeight: 1.5, pointerEvents: 'none', zIndex: 2, whiteSpace: 'nowrap',
                        }}>
                          {f.label || 'กรอบ'}{f.assets.length > 0 ? ` · ${f.assets.length}` : ''}
                        </Box>
                        {frameEditing && (
                          <Box
                            onMouseDown={e => { e.stopPropagation(); setFrameDrag({ id: f.id, mode: 'resize', ox: 0, oy: 0 }); }}
                            sx={{
                              position: 'absolute', right: 0, bottom: 0, transform: 'translate(50%,50%)',
                              width: 12, height: 12,
                              bgcolor: '#fff', border: `2px solid ${col}`, borderRadius: '3px',
                              cursor: 'nwse-resize', zIndex: 6,
                            }} />
                        )}
                      </Box>
                    </Tooltip>
                  );
                })}

                {drawing && (
                  <Box sx={{
                    position: 'absolute',
                    left: `${Math.min(drawing.x0, drawing.x1)}%`,
                    top: `${Math.min(drawing.y0, drawing.y1)}%`,
                    width: `${Math.abs(drawing.x1 - drawing.x0)}%`,
                    height: `${Math.abs(drawing.y1 - drawing.y0)}%`,
                    border: `2px dashed ${frameEditing ? FRAME_COLOR : theme.palette.primary.main}`,
                    bgcolor: alpha(frameEditing ? FRAME_COLOR : theme.palette.primary.main, 0.12),
                    borderRadius: '5px', pointerEvents: 'none', zIndex: 7,
                  }} />
                )}

                {/* ที่นั่ง — แนวทางที่ 1: ไอคอนเล็กพอดีช่องโต๊ะ (เดิมเป็นป้ายชื่อ+ไอคอน
                    ที่ยาวกว่าช่องโต๊ะ ~22px เสมอ ล้นทับที่นั่งข้างเคียง) รายละเอียด
                    ชื่อ/แผนก/อุปกรณ์ย้ายไปอยู่ใน Tooltip ตอนชี้เมาส์แทน ส่วนคลิกยังเปิด
                    แผงรายละเอียดเต็มด้านล่างเหมือนเดิม (ไม่ได้แตะส่วนนั้น) */}
                {seatsShown.map((seat, i) => {
                  const cfg = STATUS[seat.status];
                  const isSel = selected?.kind === 'seat' && selected.id === seat.id;
                  const primaryDevice = seat.devices[0];
                  return (
                    <Tooltip
                      key={`seat-${seat.id || i}-${seat.ownerName}`}
                      arrow
                      title={
                        <Box sx={{ py: 0.25 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{seat.ownerName || '—'}</Typography>
                          <Typography sx={{ fontSize: 10.5, opacity: 0.85, mb: seat.devices.length ? 0.5 : 0 }}>
                            {[seat.departmentId, seat.deskCode ? `โต๊ะ ${seat.deskCode}` : null].filter(Boolean).join(' · ') || '—'}
                          </Typography>
                          {seat.devices.length === 0 ? (
                            <Typography sx={{ fontSize: 10.5, opacity: 0.7 }}>ยังไม่มีอุปกรณ์บนที่นั่งนี้</Typography>
                          ) : seat.devices.map(d => (
                            <Typography key={d.assetId} sx={{ fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: STATUS[d.pmStatus].color, flexShrink: 0 }} />
                              {d.assetName || d.assetCode || d.type || 'อุปกรณ์'}
                            </Typography>
                          ))}
                        </Box>
                      }
                    >
                      <Box
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
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 20, height: 20, borderRadius: '50%',
                          bgcolor: 'background.paper', color: cfg.color,
                          border: `2px solid ${cfg.color}`,
                          boxShadow: isSel ? `0 0 0 3px ${alpha(cfg.color, 0.35)}, 0 3px 8px rgba(0,0,0,.28)` : '0 1px 4px rgba(0,0,0,.24)',
                          transition: 'transform .15s',
                          '&:hover': { transform: 'scale(1.15)' },
                        }}>
                          {primaryDevice ? <DeviceIcon kind={primaryDevice.kind} size={11} /> : <SeatIcon size={11} />}
                        </Box>
                        {seat.devices.length > 1 && (
                          <Box sx={{
                            position: 'absolute', right: -3, bottom: -3,
                            minWidth: 11, height: 11, px: '2px', borderRadius: '999px',
                            bgcolor: cfg.color, color: '#fff', fontSize: 7.5, fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid', borderColor: 'background.paper',
                          }}>{seat.devices.length}</Box>
                        )}
                      </Box>
                    </Tooltip>
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
              <IconButton aria-label="ปิด" size="small" onClick={() => setSelected(null)}><CloseIcon sx={{ fontSize: 17 }} /></IconButton>
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

      {/* ── เลือกเทมเพลตมาใช้กับแปลนที่มีอยู่ ── */}
      <Modal open={templatePickerOpen} onClose={() => setTemplatePickerOpen(false)} title="ใช้เทมเพลตกับแปลนนี้">
        <Box sx={{ pt: 1 }}>
          <Box sx={{
            p: '9px 12px', mb: 1.5, borderRadius: 1.5,
            bgcolor: alpha(theme.palette.warning.main, 0.1),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}`,
          }}>
            <Typography sx={{ fontSize: 11.5, lineHeight: 1.8 }}>
              เทมเพลตจะ<b>แทนที่โซนเดิมทั้งชุด</b> ที่นั่งไม่หายไป แต่คนที่เกาะโซนเดิมอยู่
              จะหลุดออกจากตารางและต้องมาวางใหม่ — บันทึกงานที่ค้างอยู่ก่อนใช้
            </Typography>
          </Box>

          {templates.length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', textAlign: 'center', py: 3 }}>
              ยังไม่มีเทมเพลต — จัดผังให้เสร็จแล้วกด "บันทึกเป็นเทมเพลต" ก่อน
            </Typography>
          ) : templates.map(t => (
            <Box key={t.id} sx={{
              display: 'flex', alignItems: 'center', gap: 1.25, p: '10px 12px', mb: 0.75,
              border: '1px solid', borderColor: 'divider', borderRadius: 1.5,
              '&:hover': { bgcolor: 'action.hover' },
            }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{t.name}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {t.zoneCount} โซน · {t.deskCount} โต๊ะ
                  {t.company ? ` · ${t.company}` : ''}
                  {t.createdBy ? ` · โดย ${t.createdBy}` : ''}
                </Typography>
              </Box>
              <Button size="small" variant="contained" disabled={applyingTemplate}
                onClick={() => handleApplyTemplate(t)} sx={{ fontSize: 11.5 }}>
                ใช้ผังนี้
              </Button>
              <IconButton aria-label="ปิด" size="small" color="error" onClick={() => handleDeleteTemplate(t)}>
                <CloseIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Box>
          ))}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={() => setTemplatePickerOpen(false)}>ปิด</Button>
          </Box>
        </Box>
      </Modal>

      {/* ── ตั้งค่าแปลน ── */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={formData.id ? 'แก้ไขแผนผังชั้น' : 'เพิ่มแผนผังชั้นใหม่'}>
        <Box component="form" onSubmit={handleSavePlan} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="ชื่อแปลน" size="small" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          <TextField label="ชั้น" size="small" required value={formData.floor} onChange={e => setFormData({ ...formData, floor: e.target.value })} />
          <TextField label="อาคาร" size="small" value={formData.building} onChange={e => setFormData({ ...formData, building: e.target.value })} />
          <TextField label="บริษัท" size="small" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })}
            helperText="ใช้กรองรายชื่อพนักงานตอนปักที่นั่ง" />
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.75 }}>พื้นหลังแปลน</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1.25 }}>
              {([['image', 'ใช้รูปแบบแปลน'], ['blank', 'วาดเอง (ไม่ใช้รูป)']] as const).map(([m, label]) => (
                <Button key={m} size="small" fullWidth sx={{ fontSize: 12 }}
                  variant={formData.mode === m ? 'contained' : 'outlined'}
                  onClick={() => setFormData({ ...formData, mode: m })}>
                  {label}
                </Button>
              ))}
            </Box>

            {formData.mode === 'image' ? (
              <>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.5 }}>
                  {formData.id ? 'เว้นว่างไว้ถ้าไม่เปลี่ยนรูป' : 'ไฟล์รูปจากแบบ CAD หรือสไลด์ก็ได้'}
                </Typography>
              </>
            ) : (
              <>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 12 }}>สัดส่วนผืนวาด</Typography>
                  <Select size="small" value={formData.aspect}
                    onChange={e => setFormData({ ...formData, aspect: Number(e.target.value) })}
                    sx={{ fontSize: 12, minWidth: 160 }}>
                    <MenuItem value={1.6} sx={{ fontSize: 12 }}>16 : 10 (ทั่วไป)</MenuItem>
                    <MenuItem value={1.78} sx={{ fontSize: 12 }}>16 : 9 (ชั้นยาว)</MenuItem>
                    <MenuItem value={1.22} sx={{ fontSize: 12 }}>เกือบจัตุรัส</MenuItem>
                    <MenuItem value={1} sx={{ fontSize: 12 }}>จัตุรัส</MenuItem>
                  </Select>
                </Box>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.5, lineHeight: 1.7 }}>
                  ไม่ต้องเหมือนแบบสถาปนิก — ขอแค่วางโซนแผนกกับจุดสังเกต (ลิฟต์ บันได ห้องประชุม)
                  ให้คนเดินหน้างานรู้ว่าตัวเองอยู่ตรงไหนก็พอ
                </Typography>
              </>
            )}
          </Box>

          {!formData.id && templates.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5 }}>เริ่มจากเทมเพลต</Typography>
              <Select size="small" fullWidth value={formData.templateId}
                onChange={e => setFormData({ ...formData, templateId: Number(e.target.value) })}
                sx={{ fontSize: 12.5 }}>
                <MenuItem value={0} sx={{ fontSize: 12.5 }}>ไม่ใช้ — เริ่มจากผังเปล่า</MenuItem>
                {templates.map(t => (
                  <MenuItem key={t.id} value={t.id} sx={{ fontSize: 12.5 }}>
                    {t.name} · {t.zoneCount} โซน {t.deskCount} โต๊ะ
                  </MenuItem>
                ))}
              </Select>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.5 }}>
                ลอกเฉพาะผัง ไม่ลอกคน — ชั้นในตึกเดียวกันมักวางเหมือนกัน
              </Typography>
            </Box>
          )}
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
