import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { assetAPI, borrowAPI, inventoryAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, useMediaQuery } from '@mui/material';

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
      return `(${effectiveBorrowDays} \u0e27\u0e31\u0e19)`;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDue = new Date(dueDate);
    selectedDue.setHours(0, 0, 0, 0);
    const diffTime = selectedDue.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (isNaN(diffDays) || diffDays < 0) return '';
    return `(${diffDays} \u0e27\u0e31\u0e19)`;
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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}><div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div><div>กำลังโหลดรายการ...</div></div>
    </div>
  );

  return (
    <div style={{ paddingBottom: 48, maxWidth: 1200, margin: '0 auto', padding: isMobile ? '0 8px' : undefined }}>
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: toastType === 'ok' ? '#1e293b' : '#dc2626', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: '0.9rem', maxWidth: 360 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{"\u0e22\u0e37\u0e21\u0e17\u0e23\u0e31\u0e1e\u0e22\u0e4c\u0e2a\u0e34\u0e19"}</h2>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>{"\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e22\u0e37\u0e21 \u0e41\u0e25\u0e49\u0e27\u0e01\u0e23\u0e2d\u0e01\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14"}</p>
      </div>

      {overdueItems.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #fef2f2, #ffe4e6)', border: '1px solid #fecdd3', borderRadius: 14, padding: '16px 20px', marginBottom: 24, boxShadow: '0 4px 12px rgba(220, 38, 38, 0.05)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.3rem', marginTop: -2 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '0.92rem', marginBottom: 4 }}>
                {"\u0e04\u0e38\u0e13\u0e21\u0e35\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e22\u0e37\u0e21\u0e17\u0e35\u0e48\u0e40\u0e01\u0e34\u0e19\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e2a\u0e48\u0e07\u0e04\u0e37\u0e19 \u0e01\u0e23\u0e38\u0e13\u0e32\u0e2a\u0e48\u0e07\u0e04\u0e37\u0e19\u0e2b\u0e23\u0e37\u0e2d\u0e02\u0e2d\u0e15\u0e48\u0e2d\u0e40\u0e27\u0e25\u0e32\u0e01\u0e48\u0e2d\u0e19\u0e17\u0e33\u0e01\u0e32\u0e23\u0e22\u0e37\u0e21\u0e43\u0e2b\u0e21\u0e48"}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: 8 }}>
                <strong style={{ display: 'block', marginBottom: 6 }}>{"\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e17\u0e35\u0e48\u0e40\u0e01\u0e34\u0e19\u0e01\u0e33\u0e2b\u0e19\u0e14:"}</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  {overdueItems.map((item: any) => (
                    <li key={item.id}>
                      {item.asset ? `${item.asset.assetCode} - ${item.asset.brand} ${item.asset.model}` : item.inventoryItem?.name}{' '}
                      ({new Date(item.dueDate).toLocaleDateString('th-TH')})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: isMobile ? 16 : 24, alignItems: 'start' }}>
        {/* Left: Form + Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Borrow Info Card */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📋</span> ข้อมูลการยืม
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>วัตถุประสงค์การยืม <span style={{ color: '#dc2626' }}>*</span></label>
                <textarea value={purpose} onChange={e => setPurpose(e.target.value)} rows={2}
                  placeholder="เช่น ใช้ในการประชุม, ใช้สำหรับโปรเจกต์ XYZ"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${purpose.trim() === '' && submitting ? '#dc2626' : '#e2e8f0'}`, fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>สถานที่/หน่วยงานที่ใช้งาน</label>
                <input value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="เช่น สำนักงานใหญ่ ชั้น 5"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  <span>{"\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e04\u0e37\u0e19"}</span>
                  <span style={{ color: '#0ea5e9', fontWeight: 800 }}>{getBorrowDurationText()}</span>
                </label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>{"\u0e04\u0e48\u0e32\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19"} {effectiveBorrowDays} {"\u0e27\u0e31\u0e19\u0e19\u0e31\u0e1a\u0e08\u0e32\u0e01\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49"} ({"\u0e2a\u0e39\u0e07\u0e2a\u0e39\u0e14"} {systemSettings?.maxBorrowDays ?? 30} {"\u0e27\u0e31\u0e19"})</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>หมายเหตุ</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          {/* Asset / Inventory Selection Card */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[{ label: `🖥 ทรัพย์สิน IT (${assets.length})`, value: 0 }, { label: `📦 วัสดุสิ้นเปลือง (${inventoryItems.filter(i => i.availableQuantity > 0).length})`, value: 1 }].map(t => (
                <button key={t.value} onClick={() => setActiveTab(t.value)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${activeTab === t.value ? '#0ea5e9' : '#e2e8f0'}`, background: activeTab === t.value ? '#e0f2fe' : '#f8fafc', color: activeTab === t.value ? '#0284c7' : '#64748b', fontWeight: activeTab === t.value ? 700 : 500, cursor: 'pointer', fontSize: '0.85rem' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 0 ? (
              <>
                {/* Quick Filters */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                  <button onClick={() => setFilterType('')} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid', borderColor: filterType === '' ? '#0ea5e9' : '#e2e8f0', background: filterType === '' ? '#f0f9ff' : '#fff', color: filterType === '' ? '#0284c7' : '#64748b', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>ทั้งหมด</button>
                  {allTypes.map(t => (
                    <button key={t} onClick={() => setFilterType(t)} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid', borderColor: filterType === t ? '#0ea5e9' : '#e2e8f0', background: filterType === t ? '#f0f9ff' : '#fff', color: filterType === t ? '#0284c7' : '#64748b', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>{t}</button>
                  ))}
                </div>

                {/* Search & Location Filter */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: 10, marginBottom: 14 }}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                    <input value={assetSearch} onChange={e => setAssetSearch(e.target.value)}
                      placeholder="ค้นหา รหัส / ชื่อ / Serial / ยี่ห้อ / รุ่น"
                      style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                  </div>
                  <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem', color: filterLocation ? '#0284c7' : '#6b7280', background: filterLocation ? '#f0f9ff' : '#fff', minWidth: 130 }}>
                    <option value="">ทุกสถานที่</option>
                    {allLocations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {/* Active filters */}
                {(filterType || filterLocation) && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    {filterType && <span style={{ background: '#e0f2fe', color: '#0284c7', borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>🏷 {filterType} <button onClick={() => setFilterType('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0284c7', fontWeight: 700, padding: 0, marginLeft: 4 }}>✕</button></span>}
                    {filterLocation && <span style={{ background: '#e0f2fe', color: '#0284c7', borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>📍 {filterLocation} <button onClick={() => setFilterLocation('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0284c7', fontWeight: 700, padding: 0, marginLeft: 4 }}>✕</button></span>}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>พบ <strong>{filteredAssets.length}</strong> รายการ</span>
                  <span style={{ background: selected.length > 0 ? '#dcfce7' : '#f1f5f9', color: selected.length > 0 ? '#16a34a' : '#94a3b8', borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 }}>เลือกแล้ว {selected.length}</span>
                </div>

                {/* Asset Table */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', maxHeight: isMobile ? 300 : 350, overflowY: 'auto', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#94a3b8', width: 36 }}></th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#94a3b8' }}>ชื่อทรัพย์สิน</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#94a3b8' }}>Serial No.</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#94a3b8' }}>ยี่ห้อ/รุ่น</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#94a3b8' }}>ประเภท</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#94a3b8' }}>สถานที่</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#94a3b8' }}>บริษัท</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssets.length === 0 ? (
                        <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>ไม่พบรายการ</td></tr>
                      ) : filteredAssets.map((a, idx) => {
                        const isSelected = selected.includes(a.id);
                        const isTypeBlocked = a.type && blockedTypes.includes(a.type);
                        return (
                          <tr key={a.id}
                            onClick={() => !isTypeBlocked && toggleAsset(a.id)}
                            onMouseEnter={() => setAssetHover(isTypeBlocked ? null : a)}
                            onMouseLeave={() => setAssetHover(null)}
                            style={{
                              borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none',
                              background: isTypeBlocked ? '#f1f5f9' : isSelected ? '#f0f9ff' : 'transparent',
                              cursor: isTypeBlocked ? 'not-allowed' : 'pointer',
                              opacity: isTypeBlocked ? 0.5 : 1,
                              transition: 'background 0.1s',
                            }}
                            title={isTypeBlocked ? `คุณยืม "${a.type}" อยู่แล้ว กรุณาคืนก่อนจึงจะยืมเพิ่มได้` : ''}>
                            <td style={{ padding: '10px 12px' }}>
                              {isTypeBlocked ? (
                                <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>🔒</span>
                              ) : (
                                <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? '#0ea5e9' : '#d1d5db'}`, background: isSelected ? '#0ea5e9' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                  {isSelected && <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 900 }}>✓</span>}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                              <div>{a.assetName || a.assetCode}</div>
                              {a.assetName ? <div style={{ fontSize: '0.73rem', color: '#94a3b8', fontWeight: 400 }}>{a.assetCode}</div> : null}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#374151' }}>{a.serialNo || '-'}</td>
                            <td style={{ padding: '10px 12px', color: '#374151' }}>{`${a.brand || ''} ${a.model || ''}`.trim() || '-'}</td>
                            <td style={{ padding: '10px 12px' }}>
                              {(a.deviceType || a.category?.name) ? <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 20, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600 }}>{a.deviceType || a.category?.name}</span> : <span style={{ color: '#cbd5e1' }}>-</span>}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '0.8rem' }}>{a.location || '-'}</td>
                            <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '0.8rem' }}>{a.company || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Hover detail tooltip */}
                {assetHover && !selected.includes(assetHover.id) && (
                  <div style={{ marginTop: 10, padding: '10px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, fontSize: '0.82rem', color: '#0369a1' }}>
                    <strong>{assetHover.assetCode}</strong> · {assetHover.brand} {assetHover.model}
                    {assetHover.cpu && <> · CPU: {assetHover.cpu}</>}
                    {assetHover.ram && <> · RAM: {assetHover.ram}</>}
                    {assetHover.os && <> · OS: {assetHover.os}</>}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                  <input value={invSearch} onChange={e => setInvSearch(e.target.value)}
                    placeholder="ค้นหาวัสดุ..."
                    style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', maxHeight: 350, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                        <th style={{ padding: '10px 12px', width: 36 }}></th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#94a3b8' }}>ชื่อรายการ</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#94a3b8' }}>หมวด</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#94a3b8' }}>คงเหลือ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.length === 0 ? (
                        <tr><td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>ไม่มีวัสดุให้ยืม</td></tr>
                      ) : filteredInventory.map((item, idx) => {
                        const isSel = selectedInventory.some(s => s.item.id === item.id);
                        return (
                          <tr key={item.id} onClick={() => toggleInventory(item)}
                            style={{ borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none', background: isSel ? '#f0fdf4' : 'transparent', cursor: 'pointer' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSel ? '#16a34a' : '#d1d5db'}`, background: isSel ? '#16a34a' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {isSel && <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 900 }}>✓</span>}
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{item.name}</td>
                            <td style={{ padding: '10px 12px' }}><span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 20, padding: '2px 8px', fontSize: '0.72rem' }}>{item.category}</span></td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{item.availableQuantity} {item.unit}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Summary Card (sticky) */}
        <div style={{ position: isMobile ? 'relative' : 'sticky', top: isMobile ? undefined : 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 22px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>สรุปการยืม</h3>
            <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 12, paddingTop: 14 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>ผู้ขอ</div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{user?.displayName || user?.adUsername || '-'}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>รายการที่เลือก</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: totalSelected > 0 ? '#0ea5e9' : '#94a3b8' }}>{totalSelected}</div>
              </div>

              {/* Selected items list */}
              <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
                {selectedAssets.map(a => (
                  <div key={a.id} style={{ padding: '10px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.assetCode}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{a.brand} {a.model}</div>
                    </div>
                    <button onClick={() => removeAsset(a.id)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 2 }}>✕</button>
                  </div>
                ))}
                {selectedInventory.map(({ item, qty }) => (
                  <div key={item.id} style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 9 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{item.name}</div>
                      <button onClick={() => setSelectedInventory(prev => prev.filter(s => s.item.id !== item.id))}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 2 }}>✕</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => updateQty(item.id, qty - 1)} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>-</button>
                      <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{qty}</span>
                      <button onClick={() => updateQty(item.id, qty + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>+</button>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{item.unit} (คงเหลือ {item.availableQuantity})</span>
                    </div>
                  </div>
                ))}
                {totalSelected === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#cbd5e1', fontSize: '0.85rem' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>📋</div>
                    ยังไม่มีรายการที่เลือก
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ℹ️ {"\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e04\u0e37\u0e19\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34"} <strong style={{ color: '#374151' }}>{effectiveBorrowDays} {"\u0e27\u0e31\u0e19"}</strong> {"\u0e19\u0e31\u0e1a\u0e08\u0e32\u0e01\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e22\u0e37\u0e21"} ({"\u0e2a\u0e39\u0e07\u0e2a\u0e39\u0e14"} {systemSettings?.maxBorrowDays ?? 30} {"\u0e27\u0e31\u0e19"})
                </div>
                <button onClick={handleSubmit} disabled={submitting || totalSelected === 0 || !purpose.trim() || overdueItems.length > 0}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: totalSelected === 0 || !purpose.trim() || overdueItems.length > 0 ? '#e2e8f0' : '#0ea5e9', color: totalSelected === 0 || !purpose.trim() || overdueItems.length > 0 ? '#94a3b8' : '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: totalSelected === 0 || !purpose.trim() || overdueItems.length > 0 ? 'not-allowed' : 'pointer', transition: 'all 0.2s', marginBottom: 8 }}
                  title={overdueItems.length > 0 ? "\u0e04\u0e38\u0e13\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e22\u0e37\u0e21\u0e17\u0e23\u0e31\u0e1e\u0e22\u0e4c\u0e2a\u0e34\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e44\u0e14\u0e49 \u0e40\u0e19\u0e37\u0e48\u0e2d\u0e07\u0e08\u0e32\u0e01\u0e21\u0e35\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e04\u0e49\u0e32\u0e07\u0e2a\u0e48\u0e07\u0e04\u0e37\u0e19\u0e40\u0e01\u0e34\u0e19\u0e01\u0e33\u0e2b\u0e19\u0e14" : ""}>
                  {submitting ? '⏳ ...' : overdueItems.length > 0 ? "\u0e04\u0e38\u0e13\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e22\u0e37\u0e21\u0e43\u0e2b\u0e21\u0e48\u0e44\u0e14\u0e49" : `📤 \u0e2a\u0e48\u0e07\u0e04\u0e33\u0e02\u0e2d\u0e22\u0e37\u0e21${totalSelected > 0 ? ` (${totalSelected} \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23)` : ''}`}
                </button>
                <button onClick={() => navigate('/borrow/my-requests')}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                  {"\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01"}
                </button>
              </div>

              {/* Policy Card */}
              <div style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 20px', marginTop: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🛡️</span> {"\u0e19\u0e42\u0e22\u0e1a\u0e32\u0e22\u0e01\u0e32\u0e23\u0e22\u0e37\u0e21\u0e04\u0e37\u0e19"}
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: 8, lineHeight: 1.4 }}>
                  <div>{"1. \u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e22\u0e37\u0e21\u0e17\u0e23\u0e31\u0e1e\u0e22\u0e4c\u0e2a\u0e34\u0e19\u0e41\u0e25\u0e30\u0e27\u0e31\u0e2a\u0e14\u0e38\u0e2a\u0e34\u0e49\u0e19\u0e40\u0e1b\u0e25\u0e37\u0e2d\u0e07\u0e44\u0e14\u0e49\u0e15\u0e32\u0e21\u0e42\u0e04\u0e27\u0e15\u0e32\u0e17\u0e35\u0e48\u0e01\u0e33\u0e2b\u0e19\u0e14"}</div>
                  <div>{"2. \u0e08\u0e33\u0e19\u0e27\u0e19\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e17\u0e35\u0e48\u0e22\u0e37\u0e21\u0e44\u0e14\u0e49\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14:"} <strong style={{ color: '#0ea5e9' }}>{systemSettings?.maxItemsPerRequest ?? 5} {"\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e15\u0e48\u0e2d\u0e04\u0e33\u0e02\u0e2d"}</strong></div>
                  <div>{"3. \u0e23\u0e30\u0e22\u0e30\u0e40\u0e27\u0e25\u0e32\u0e01\u0e32\u0e23\u0e22\u0e37\u0e21\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14:"} <strong style={{ color: '#0ea5e9' }}>{systemSettings?.maxBorrowDays ?? 30} {"\u0e27\u0e31\u0e19"}</strong></div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 8, color: '#b91c1c' }}>
                    {"4. \u0e01\u0e23\u0e38\u0e13\u0e32\u0e2a\u0e48\u0e07\u0e04\u0e37\u0e19\u0e17\u0e23\u0e31\u0e1e\u0e22\u0e4c\u0e2a\u0e34\u0e19\u0e15\u0e23\u0e07\u0e40\u0e27\u0e25\u0e32 \u0e2b\u0e32\u0e01\u0e21\u0e35\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e40\u0e01\u0e34\u0e19\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e2a\u0e48\u0e07\u0e04\u0e37\u0e19 \u0e08\u0e30\u0e15\u0e49\u0e2d\u0e07\u0e04\u0e37\u0e19\u0e17\u0e23\u0e31\u0e1e\u0e22\u0e4c\u0e2a\u0e34\u0e19\u0e19\u0e31\u0e49\u0e19\u0e01\u0e48\u0e2d\u0e19\u0e08\u0e36\u0e07\u0e08\u0e30\u0e22\u0e37\u0e21\u0e43\u0e2b\u0e21\u0e48\u0e44\u0e14\u0e49"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
