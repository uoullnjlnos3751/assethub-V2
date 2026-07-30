import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; icon: string }> = {
  COMPLETED: { color: '#1c873b', bg: '#eaf6ed', border: '#34c759', label: 'เสร็จแล้ว', icon: '✅' },
  IN_PROGRESS: { color: '#8946cc', bg: '#f4f0fa', border: '#af52de', label: 'กำลังทำ', icon: '🔄' },
  DRAFT: { color: '#d97706', bg: '#fff9e6', border: '#ff9500', label: 'รอทำ', icon: '⏳' },
  OVERDUE: { color: '#ff3b30', bg: '#fdf2f2', border: '#ff3b30', label: 'เลยกำหนด', icon: '⚠️' },
  NO_PM: { color: '#86868b', bg: '#f5f5f7', border: '#d2d2d7', label: 'ไม่มีแผน PM', icon: '⚪' },
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
        const res = await assetAPI.getAll({ search: searchAsset, limit: 10 });
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
    <div style={{ minHeight: '100vh', background: '#f5f5f7', padding: '24px', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        .fp-pin {
          position: absolute; width: 28px; height: 38px; margin-left: -14px; margin-top: -38px;
          cursor: pointer; transition: transform 0.2s; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
          z-index: 10;
        }
        .fp-pin:hover { transform: scale(1.15) translateY(-2px); z-index: 20; }
        .fp-pin.edit-mode { cursor: grab; }
        .fp-pin.edit-mode:active { cursor: grabbing; }
        
        .fp-tooltip {
          position: fixed; z-index: 9999; background: rgba(29,29,31,0.95); backdrop-filter: blur(12px);
          color: #fff; padding: 14px 18px; border-radius: 14px; font-size: 12px; pointer-events: none;
          box-shadow: 0 12px 40px rgba(0,0,0,0.25); min-width: 200px;
          animation: fpFadeIn 0.15s ease;
        }
        @keyframes fpFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>🗺️</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f' }}>แผนผังชั้น (Floor Plan)</div>
            <div style={{ fontSize: 12, color: '#86868b', marginTop: 3 }}>ดูพิกัดเครื่องและสถานะ PM แบบ Real-time</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isAdmin && (
            <button onClick={() => { setFormData({ id:0, name:'', floor:'', building:'', company:'' }); setImageFile(null); setIsModalOpen(true); }}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#e8f5e9', color: '#1c873b', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              + เพิ่มแผนผังใหม่
            </button>
          )}
          <button onClick={() => navigate('/pm/runs')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d2d2d7', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            รายการ PM
          </button>
        </div>
      </div>

      {/* Controls */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5ea', padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#515154' }}>เลือกแปลน:</span>
          <select value={selectedPlanId || ''} onChange={e => setSelectedPlanId(Number(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d2d2d7', fontSize: 13, minWidth: 200, cursor: 'pointer' }}>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name} {p.building ? `(${p.building})` : ''}</option>
            ))}
          </select>
        </div>

        <div style={{ width: 1, height: 24, background: '#e5e5ea' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#515154' }}>ปี PM:</span>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d2d2d7', fontSize: 13, cursor: 'pointer' }}>
            {[...Array(5)].map((_, i) => {
              const y = new Date().getFullYear() + 543 - 2 + i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>

        <div style={{ flex: 1 }} />

        {isAdmin && currentPlan && (
          <div style={{ display: 'flex', gap: 8 }}>
            {isEditMode ? (
              <>
                <button onClick={() => { setIsEditMode(false); setDraftPins(currentPlan.pins || []); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d2d2d7', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#86868b' }}>
                  ยกเลิก
                </button>
                <button onClick={handleSavePins} disabled={isSavingPins} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0071e3', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {isSavingPins ? 'กำลังบันทึก...' : 'บันทึกตำแหน่ง'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditMode(true)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #0071e3', background: '#fff', color: '#0071e3', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  ✏️ จัดการตำแหน่ง Pin
                </button>
                <button onClick={() => { setFormData({ id: currentPlan.id, name: currentPlan.name, floor: currentPlan.floor, building: currentPlan.building || '', company: currentPlan.company || '' }); setIsModalOpen(true); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d2d2d7', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#515154' }}>
                  ⚙️ ตั้งค่าแปลน
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Map Area */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        
        {/* Left Sidebar: Edit Mode Tools */}
        {isEditMode && (
          <div style={{ width: 300, background: '#fff', borderRadius: 14, border: '1px solid #e5e5ea', padding: 16, flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 16, color: '#1d1d1f' }}>เพิ่มจุดอุปกรณ์บนแปลน</h3>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="ค้นหารหัส หรือชื่อผู้ใช้ (3 อักษร+)..." 
                value={searchAsset}
                onChange={e => setSearchAsset(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d2d2d7', fontSize: 13, boxSizing: 'border-box' }}
              />
              {isSearching && <span style={{ position: 'absolute', right: 10, top: 10, fontSize: 12 }}>⏳</span>}
            </div>

            {searchResults.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', border: '1px solid #e5e5ea', borderRadius: 8 }}>
                {searchResults.map(a => (
                  <div key={a.id} onClick={() => handleAddPin(a)}
                    style={{ padding: '8px 12px', borderBottom: '1px solid #f5f5f7', cursor: 'pointer', fontSize: 12, transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f7')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <div style={{ fontWeight: 600, color: '#0071e3' }}>{a.assetCode}</div>
                    <div style={{ color: '#515154' }}>{a.assetName}</div>
                  </div>
                ))}
              </div>
            )}

            <h3 style={{ fontSize: 14, marginTop: 24, marginBottom: 12, color: '#1d1d1f' }}>อุปกรณ์บนแปลน ({draftPins.length})</h3>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {draftPins.map((p, i) => (
                <div key={p.assetId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f5f5f7', borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.asset?.assetCode}</div>
                    <div style={{ color: '#86868b', fontSize: 10 }}>{p.asset?.ownerName || p.asset?.assetName}</div>
                  </div>
                  <button onClick={() => handleRemovePin(i)} style={{ border: 'none', background: 'transparent', color: '#ff3b30', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>✖</button>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#86868b', marginTop: 16 }}>
              * ลาก Pin บนรูปเพื่อเปลี่ยนตำแหน่ง<br/>
              * ข้อมูลจะถูกบันทึกเมื่อกด "บันทึกตำแหน่ง"
            </div>
          </div>
        )}

        {/* Map Container */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 14, border: '1px solid #e5e5ea', overflow: 'hidden', position: 'relative', minHeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
          {loading ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868b' }}>
              <div style={{ fontSize: 40, marginBottom: 16, animation: 'spin 1s linear infinite' }}>⏳</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>กำลังโหลด...</div>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : currentPlan ? (
            <div 
              style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7' }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img 
                  ref={imgRef}
                  src={currentPlan.imageUrl.startsWith('http') ? currentPlan.imageUrl : `${apiUrl}${currentPlan.imageUrl}`}
                  alt={currentPlan.name} 
                  style={{ display: 'block', maxWidth: '100%', maxHeight: '800px', objectFit: 'contain', border: '1px solid #e5e5ea', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}
                  draggable={false}
                />
                
                {/* Pins */}
                {pinsToRender.map((pin, i) => {
                  const status = getPMStatus(pin.assetId);
                  const cfg = STATUS_CONFIG[status];
                  // Modern Pin SVG with drop shadow inside SVG
                  const pinSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" fill="${encodeURIComponent(cfg.color)}"><path d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 24 12 24s12-15.5 12-24C24 5.373 18.627 0 12 0zm0 17c-2.761 0-5-2.239-5-5s2.239-5 5-5 5 2.239 5 5-2.239 5-5 5z"/><circle cx="12" cy="12" r="4" fill="%23ffffff"/></svg>`;

                  return (
                    <div
                      key={pin.assetId}
                      className={`fp-pin ${isEditMode ? 'edit-mode' : ''}`}
                      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
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
                      <img src={pinSvg} alt="pin" style={{ width: 28, height: 38 }} draggable={false} />
                      {/* Asset Code label under pin */}
                      <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.9)', padding: '2px 4px', borderRadius: 4, fontSize: 9, fontWeight: 700, color: '#1d1d1f', border: '1px solid #e5e5ea', whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        {pin.asset?.assetCode}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868b' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>ยังไม่มีแผนผังชั้น</div>
                {isAdmin && <div style={{ fontSize: 13, marginTop: 4 }}>กดปุ่ม "+ เพิ่มแผนผังใหม่" ด้านบนเพื่อเริ่มต้น</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend Footer */}
      {!isEditMode && currentPlan && (
        <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#515154' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: cfg.color }} />
              {cfg.label}
            </div>
          ))}
        </div>
      )}

      {/* Tooltip */}
      {hoveredPin && !isEditMode && (
        <div className="fp-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#fff' }}>
            {hoveredPin.asset?.assetCode}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px', fontSize: 11, color: '#d2d2d7' }}>
            <span>ชื่อ:</span><span style={{ color: '#fff' }}>{hoveredPin.asset?.assetName}</span>
            <span>ผู้ใช้:</span><span style={{ color: '#fff' }}>{hoveredPin.asset?.ownerName || '—'}</span>
            <span>แผนก:</span><span style={{ color: '#fff' }}>{hoveredPin.asset?.departmentId || '—'}</span>
            <span>สถานะ:</span>
            <span style={{ color: STATUS_CONFIG[getPMStatus(hoveredPin.assetId)].color, fontWeight: 700 }}>
              {STATUS_CONFIG[getPMStatus(hoveredPin.assetId)].icon} {STATUS_CONFIG[getPMStatus(hoveredPin.assetId)].label}
            </span>
          </div>
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 10, color: '#86868b', textAlign: 'center' }}>
            🖱️ คลิกเพื่อเปิดรายการ PM
          </div>
        </div>
      )}

      {/* Form Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={formData.id ? 'แก้ไขแผนผัง' : 'เพิ่มแผนผังใหม่'}>
        <form onSubmit={handleSavePlan}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 400 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>ชื่อแผนผัง *</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="เช่น ชั้น 22 เพลินจิต" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d2d2d7', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>ชั้น *</label>
                <input required value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} placeholder="22" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d2d2d7', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>อาคาร</label>
                <input value={formData.building} onChange={e => setFormData({...formData, building: e.target.value})} placeholder="อาคารเพลินจิต" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d2d2d7', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>บริษัท</label>
              <input value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="เช่น TRRHQ" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d2d2d7', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>รูปแปลนชั้น (PNG/JPG) {formData.id ? '(เลือกใหม่หากต้องการเปลี่ยน)' : '*'}</label>
              <input type="file" accept="image/*" required={!formData.id} onChange={e => setImageFile(e.target.files?.[0] || null)} style={{ fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button type="submit" disabled={isSavingPlan} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#1c873b', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                {isSavingPlan ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
              {formData.id > 0 && (
                <button type="button" onClick={handleDeletePlan} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #ff3b30', background: '#fff', color: '#ff3b30', fontWeight: 600, cursor: 'pointer' }}>ลบแปลนนี้</button>
              )}
            </div>
          </div>
        </form>
      </Modal>

    </div>
  );
}
