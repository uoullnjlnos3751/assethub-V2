import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import AddIcon from '@mui/icons-material/Add';
import ListAltIcon from '@mui/icons-material/ListAlt';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import BusinessIcon from '@mui/icons-material/Business';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import { pmAPI, floorPlanAPI, assetAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from './components/Modal';

// --- Types ---
interface FloorPlan {
  id: number;
  name: string;
  floor: string;
  building: string | null;
  company: string | null;
  imageUrl: string;
  isActive: boolean;
  pins?: FloorPlanPin[];
  _count?: { pins: number };
}

interface FloorPlanPin {
  id: number;
  assetId: number;
  x: number;
  y: number;
  label?: string;
  asset?: {
    id: number;
    assetCode: string;
    assetName: string;
    type: string;
    ownerName: string;
    departmentId: string;
  };
}

interface PMRun {
  id: number;
  assetId: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'DRAFT';
  plan?: { endDate: string };
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  COMPLETED: { color: '#1c873b', label: 'เสร็จแล้ว' },
  IN_PROGRESS: { color: '#8946cc', label: 'กำลังทำ' },
  DRAFT: { color: '#d97706', label: 'รอทำ' },
  OVERDUE: { color: '#ff3b30', label: 'เลยกำหนด' },
  NO_PM: { color: '#86868b', label: 'ไม่มีแผน PM' },
};

export default function PMFloorPlanPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'IT_ADMIN' || user?.role === 'SUPERADMIN';

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  // Current plan full data
  const [currentPlan, setCurrentPlan] = useState<FloorPlan | null>(null);
  const [runs, setRuns] = useState<PMRun[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);

  // Edit Mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftPins, setDraftPins] = useState<FloorPlanPin[]>([]);
  const [isSavingPins, setIsSavingPins] = useState(false);

  // Modal for Create/Edit Floor Plan
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: 0, name: '', floor: '', building: '', company: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Asset search for adding pins
  const [searchAsset, setSearchAsset] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Drag state
  const imgRef = useRef<HTMLImageElement>(null);
  const [draggingPinIndex, setDraggingPinIndex] = useState<number | null>(null);

  // Tooltip
  const [hoveredPin, setHoveredPin] = useState<FloorPlanPin | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // 1. Fetch floor plans list
  const fetchPlans = async () => {
    try {
      const res = await floorPlanAPI.getAll();
      setPlans(res.data);
      if (res.data.length > 0 && !selectedPlanId) {
        setSelectedPlanId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // 2. Fetch selected plan details & PM runs for the year
  useEffect(() => {
    if (!selectedPlanId) return;

    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [planRes, runsRes] = await Promise.all([
          floorPlanAPI.getById(selectedPlanId),
          pmAPI.runs({ year: selectedYear - 543, limit: 10000 })
        ]);
        if (isMounted) {
          setCurrentPlan(planRes.data);
          setDraftPins(planRes.data.pins || []);
          setRuns(runsRes.data?.data || runsRes.data || []); // Handle paginated or direct array
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [selectedPlanId, selectedYear]);

  // Handle Plan Save (Create/Update)
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPlan(true);
    try {
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('floor', formData.floor);
      fd.append('building', formData.building);
      fd.append('company', formData.company);
      if (imageFile) fd.append('image', imageFile);

      if (formData.id) {
        await floorPlanAPI.update(formData.id, fd as any);
      } else {
        await floorPlanAPI.create(fd as any);
      }
      setIsModalOpen(false);
      await fetchPlans();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกแปลน');
      console.error(err);
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!formData.id || !confirm('ยืนยันการลบแผนผังชั้นนี้?')) return;
    try {
      await floorPlanAPI.delete(formData.id);
      setIsModalOpen(false);
      setSelectedPlanId(null);
      await fetchPlans();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบ');
    }
  };

  // Asset Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchAsset || searchAsset.length < 3) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await assetAPI.list({ search: searchAsset, limit: 10 });
        setSearchResults(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchAsset]);

  const handleAddPin = (asset: any) => {
    if (draftPins.some(p => p.assetId === asset.id)) {
      alert('มีเครื่องนี้ในแผนผังนี้แล้ว');
      return;
    }
    setDraftPins([...draftPins, {
      id: 0,
      assetId: asset.id,
      x: 50, // drop in center by default
      y: 50,
      asset: {
        id: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        type: asset.type,
        ownerName: asset.ownerName,
        departmentId: asset.departmentId
      }
    }]);
    setSearchAsset('');
    setSearchResults([]);
  };

  const handleRemovePin = (index: number) => {
    setDraftPins(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePins = async () => {
    if (!currentPlan) return;
    setIsSavingPins(true);
    try {
      await floorPlanAPI.updatePins(currentPlan.id, draftPins.map(p => ({
        assetId: p.assetId,
        x: p.x,
        y: p.y
      })));
      alert('บันทึกตำแหน่งสำเร็จ');
      setIsEditMode(false);
      // Reload current plan
      const res = await floorPlanAPI.getById(currentPlan.id);
      setCurrentPlan(res.data);
      setDraftPins(res.data.pins || []);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกตำแหน่ง');
    } finally {
      setIsSavingPins(false);
    }
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditMode) {
      e.preventDefault();
      return;
    }
    setDraggingPinIndex(index);
    // Transparent drag image
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingPinIndex === null || !imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // clamp
    const cx = Math.max(0, Math.min(100, x));
    const cy = Math.max(0, Math.min(100, y));

    setDraftPins(prev => {
      const next = [...prev];
      next[draggingPinIndex] = { ...next[draggingPinIndex], x: cx, y: cy };
      return next;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingPinIndex(null);
  };

  const getPMStatus = (assetId: number) => {
    const run = runs.find(r => r.assetId === assetId);
    if (!run) return 'NO_PM';
    if (run.status === 'COMPLETED') return 'COMPLETED';
    if (run.status === 'IN_PROGRESS') return 'IN_PROGRESS';

    const isOverdue = run.plan?.endDate && new Date(run.plan.endDate).getTime() < new Date().setHours(0,0,0,0);
    return isOverdue ? 'OVERDUE' : 'DRAFT';
  };

  // --- Render Helpers ---
  const pinsToRender = isEditMode ? draftPins : (currentPlan?.pins || []);
  const apiUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 3, background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 2 }}>
            <MapIcon sx={{ color: '#fff' }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 700 }}>แผนผังชั้น (Floor Plan)</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>ดูพิกัดเครื่องและสถานะ PM แบบ Real-time</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {isAdmin && (
            <Button
              variant="contained"
              color="success"
              startIcon={<AddIcon />}
              onClick={() => { setFormData({ id: 0, name: '', floor: '', building: '', company: '' }); setImageFile(null); setIsModalOpen(true); }}
            >
              เพิ่มแผนผังใหม่
            </Button>
          )}
          <Button variant="outlined" startIcon={<ListAltIcon />} onClick={() => navigate('/pm/runs')}>รายการ PM</Button>
        </Box>
      </Box>

      {/* Controls */}
      <Paper variant="outlined" sx={{ p: '16px 20px', mb: 2.5, display: 'flex', gap: 2.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>เลือกแปลน:</Typography>
          <Select size="small" value={selectedPlanId || ''} onChange={e => setSelectedPlanId(Number(e.target.value))} sx={{ minWidth: 200 }}>
            {plans.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.name} {p.building ? `(${p.building})` : ''}</MenuItem>
            ))}
          </Select>
        </Box>

        <Box sx={{ width: '1px', height: 24, bgcolor: 'divider' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>ปี PM:</Typography>
          <Select size="small" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {[...Array(5)].map((_, i) => {
              const y = new Date().getFullYear() + 543 - 2 + i;
              return <MenuItem key={y} value={y}>{y}</MenuItem>;
            })}
          </Select>
        </Box>

        <Box sx={{ flex: 1 }} />

        {isAdmin && currentPlan && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isEditMode ? (
              <>
                <Button variant="outlined" onClick={() => { setIsEditMode(false); setDraftPins(currentPlan.pins || []); }}>ยกเลิก</Button>
                <Button variant="contained" onClick={handleSavePins} disabled={isSavingPins}>
                  {isSavingPins ? 'กำลังบันทึก...' : 'บันทึกตำแหน่ง'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outlined" startIcon={<EditLocationAltIcon />} onClick={() => setIsEditMode(true)}>จัดการตำแหน่ง Pin</Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<SettingsIcon />}
                  onClick={() => { setFormData({ id: currentPlan.id, name: currentPlan.name, floor: currentPlan.floor, building: currentPlan.building || '', company: currentPlan.company || '' }); setIsModalOpen(true); }}
                >
                  ตั้งค่าแปลน
                </Button>
              </>
            )}
          </Box>
        )}
      </Paper>

      {/* Main Map Area */}
      <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>

        {/* Left Sidebar: Edit Mode Tools */}
        {isEditMode && (
          <Paper variant="outlined" sx={{ width: 300, p: 2, flexShrink: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>เพิ่มจุดอุปกรณ์บนแปลน</Typography>
            <Box sx={{ position: 'relative' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="ค้นหารหัส หรือชื่อผู้ใช้ (3 อักษร+)..."
                value={searchAsset}
                onChange={e => setSearchAsset(e.target.value)}
                InputProps={{ endAdornment: isSearching ? <CircularProgress size={14} /> : undefined }}
              />
            </Box>

            {searchResults.length > 0 && (
              <Box sx={{ mt: 1, maxHeight: 200, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                {searchResults.map(a => (
                  <Box
                    key={a.id}
                    onClick={() => handleAddPin(a)}
                    sx={{ p: '8px 12px', borderBottom: '1px solid', borderColor: 'divider', cursor: 'pointer', fontSize: 12, '&:hover': { bgcolor: 'action.hover' }, '&:last-of-type': { borderBottom: 'none' } }}
                  >
                    <Box sx={{ fontWeight: 600, color: 'primary.main' }}>{a.assetCode}</Box>
                    <Box sx={{ color: 'text.secondary' }}>{a.assetName}</Box>
                  </Box>
                ))}
              </Box>
            )}

            <Typography sx={{ fontSize: 14, fontWeight: 700, mt: 3, mb: 1.5 }}>อุปกรณ์บนแปลน ({draftPins.length})</Typography>
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {draftPins.map((p, i) => (
                <Box key={p.assetId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '8px 10px', bgcolor: 'action.hover', borderRadius: 1.5, mb: 1, fontSize: 12 }}>
                  <Box>
                    <Box sx={{ fontWeight: 600 }}>{p.asset?.assetCode}</Box>
                    <Box sx={{ color: 'text.secondary', fontSize: 10 }}>{p.asset?.ownerName || p.asset?.assetName}</Box>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => handleRemovePin(i)}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
                </Box>
              ))}
            </Box>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 2 }}>
              * ลาก Pin บนรูปเพื่อเปลี่ยนตำแหน่ง<br />
              * ข้อมูลจะถูกบันทึกเมื่อกด "บันทึกตำแหน่ง"
            </Typography>
          </Paper>
        )}

        {/* Map Container */}
        <Paper variant="outlined" sx={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 600 }}>
          {loading ? (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, color: 'text.secondary' }}>
              <CircularProgress />
              <Typography sx={{ fontSize: 14, fontWeight: 500 }}>กำลังโหลด...</Typography>
            </Box>
          ) : currentPlan ? (
            <Box
              sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Box
                  component="img"
                  ref={imgRef}
                  src={currentPlan.imageUrl.startsWith('http') ? currentPlan.imageUrl : `${apiUrl}${currentPlan.imageUrl}`}
                  alt={currentPlan.name}
                  draggable={false}
                  sx={{ display: 'block', maxWidth: '100%', maxHeight: '800px', objectFit: 'contain', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, boxShadow: 1 }}
                />

                {/* Pins */}
                {pinsToRender.map((pin, i) => {
                  const status = getPMStatus(pin.assetId);
                  const cfg = STATUS_CONFIG[status];
                  // Modern Pin SVG with drop shadow inside SVG
                  const pinSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" fill="${encodeURIComponent(cfg.color)}"><path d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 24 12 24s12-15.5 12-24C24 5.373 18.627 0 12 0zm0 17c-2.761 0-5-2.239-5-5s2.239-5 5-5 5 2.239 5 5-2.239 5-5 5z"/><circle cx="12" cy="12" r="4" fill="%23ffffff"/></svg>`;

                  return (
                    <Box
                      key={pin.assetId}
                      sx={{
                        position: 'absolute', width: 28, height: 38, ml: '-14px', mt: '-38px',
                        cursor: isEditMode ? 'grab' : 'pointer', transition: 'transform 0.2s',
                        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))', zIndex: 10,
                        '&:hover': { transform: 'scale(1.15) translateY(-2px)', zIndex: 20 },
                        '&:active': isEditMode ? { cursor: 'grabbing' } : undefined,
                        left: `${pin.x}%`, top: `${pin.y}%`,
                      }}
                      draggable={isEditMode}
                      onDragStart={(e) => handleDragStart(e, i)}
                      onMouseEnter={(e) => {
                        if (!isEditMode) {
                          setHoveredPin(pin);
                          setTooltipPos({ x: e.clientX + 15, y: e.clientY - 20 });
                        }
                      }}
                      onMouseMove={(e) => {
                        if (!isEditMode) setTooltipPos({ x: e.clientX + 15, y: e.clientY - 20 });
                      }}
                      onMouseLeave={() => setHoveredPin(null)}
                      onClick={() => {
                        if (!isEditMode && pin.asset?.assetCode) {
                          navigate(`/pm/runs?search=${encodeURIComponent(pin.asset?.assetCode)}`);
                        }
                      }}
                    >
                      <Box component="img" src={pinSvg} alt="pin" draggable={false} sx={{ width: 28, height: 38 }} />
                      {/* Asset Code label under pin */}
                      <Box sx={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', bgcolor: 'rgba(255,255,255,0.9)', color: '#1d1d1f', px: 0.5, py: 0.25, borderRadius: 0.5, fontSize: 9, fontWeight: 700, border: '1px solid #e5e5ea', whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: 1 }}>
                        {pin.asset?.assetCode}
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
      </Box>

      {/* Legend Footer */}
      {!isEditMode && currentPlan && (
        <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
            <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: cfg.color }} />
              {cfg.label}
            </Box>
          ))}
        </Box>
      )}

      {/* Tooltip */}
      {hoveredPin && !isEditMode && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed', zIndex: 9999, bgcolor: 'rgba(29,29,31,0.95)', backdropFilter: 'blur(12px)',
            color: '#fff', p: '14px 18px', borderRadius: 3.5, fontSize: 12, pointerEvents: 'none', minWidth: 200,
            left: tooltipPos.x, top: tooltipPos.y,
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1, color: '#fff' }}>
            {hoveredPin.asset?.assetCode}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px', fontSize: 11, color: '#d2d2d7' }}>
            <span>ชื่อ:</span><span style={{ color: '#fff' }}>{hoveredPin.asset?.assetName}</span>
            <span>ผู้ใช้:</span><span style={{ color: '#fff' }}>{hoveredPin.asset?.ownerName || '—'}</span>
            <span>แผนก:</span><span style={{ color: '#fff' }}>{hoveredPin.asset?.departmentId || '—'}</span>
            <span>สถานะ:</span>
            <span style={{ color: STATUS_CONFIG[getPMStatus(hoveredPin.assetId)].color, fontWeight: 700 }}>
              {STATUS_CONFIG[getPMStatus(hoveredPin.assetId)].label}
            </span>
          </Box>
          <Box sx={{ mt: 1.25, pt: 1, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <TouchAppIcon sx={{ fontSize: 12 }} /> คลิกเพื่อเปิดรายการ PM
          </Box>
        </Paper>
      )}

      {/* Form Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={formData.id ? 'แก้ไขแผนผัง' : 'เพิ่มแผนผังใหม่'}>
        <Box component="form" onSubmit={handleSavePlan} sx={{ p: '16px 20px' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: 400, maxWidth: '100%' }}>
            <TextField
              required
              size="small"
              label="ชื่อแผนผัง"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="เช่น ชั้น 22 เพลินจิต"
            />
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                required
                fullWidth
                size="small"
                label="ชั้น"
                value={formData.floor}
                onChange={e => setFormData({ ...formData, floor: e.target.value })}
                placeholder="22"
              />
              <TextField
                fullWidth
                size="small"
                label="อาคาร"
                value={formData.building}
                onChange={e => setFormData({ ...formData, building: e.target.value })}
                placeholder="อาคารเพลินจิต"
              />
            </Box>
            <TextField
              size="small"
              label="บริษัท"
              value={formData.company}
              onChange={e => setFormData({ ...formData, company: e.target.value })}
              placeholder="เช่น TRRHQ"
            />
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.75 }}>
                รูปแปลนชั้น (PNG/JPG) {formData.id ? '(เลือกใหม่หากต้องการเปลี่ยน)' : '*'}
              </Typography>
              <input type="file" accept="image/*" required={!formData.id} onChange={e => setImageFile(e.target.files?.[0] || null)} style={{ fontSize: 13 }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5 }}>
              <Button type="submit" variant="contained" color="success" fullWidth disabled={isSavingPlan}>
                {isSavingPlan ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </Button>
              {formData.id > 0 && (
                <Button type="button" variant="outlined" color="error" onClick={handleDeletePlan}>ลบแปลนนี้</Button>
              )}
            </Box>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}
