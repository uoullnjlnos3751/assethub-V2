import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { borrowAPI, adminAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  Pending:          { label: 'รออนุมัติ',    color: '#d97706', bg: '#fffbeb' },
  Approved:         { label: 'อนุมัติแล้ว',  color: '#0284c7', bg: '#f0f9ff' },
  CheckedOut:       { label: 'กำลังยืม',     color: '#16a34a', bg: '#f0fdf4' },
  Returned:         { label: 'คืนแล้ว',       color: '#6b7280', bg: '#f9fafb' },
  Rejected:         { label: 'ไม่อนุมัติ',   color: '#dc2626', bg: '#fef2f2' },
  PartiallyReturned:{ label: 'คืนบางส่วน',   color: '#7c3aed', bg: '#f5f3ff' },
  Cancelled:        { label: 'ยกเลิกแล้ว',   color: '#6b7280', bg: '#f3f4f6' },
};

function getDaysLeft(dueDate: string | null): number | null {
  if (!dueDate) return null;
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function DueBar({ dueDate }: { dueDate: string }) {
  const days = getDaysLeft(dueDate);
  if (days === null) return null;
  const total = 30;
  const pct = Math.max(0, Math.min(100, (days / total) * 100));
  const color = days < 0 ? '#dc2626' : days <= 3 ? '#f59e0b' : days <= 7 ? '#f97316' : '#16a34a';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color, whiteSpace: 'nowrap' }}>
        {days < 0 ? `เกิน ${Math.abs(days)} วัน` : `เหลือ ${days} วัน`}
      </span>
    </div>
  );
}

const TABS = [
  { label: 'กำลังยืม',    filter: 'CheckedOut' },
  { label: 'รออนุมัติ',   filter: 'Pending' },
  { label: 'อนุมัติแล้ว', filter: 'Approved' },
  { label: 'ทั้งหมด',     filter: '' },
  { label: 'ประวัติ',     filter: 'Returned' },
];

const PER_PAGE = 10;

export default function MyItemsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState('');
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [extDialog, setExtDialog] = useState<{ open: boolean; req: any | null }>({ open: false, req: null });
  const [extDays, setExtDays] = useState('3');
  const [extReason, setExtReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [expandedReq, setExpandedReq] = useState<number | null>(null);
  const isAdmin = user?.role && ['IT_ADMIN', 'SUPERADMIN'].includes(user.role);

  useEffect(() => {
    adminAPI.settings().then((res: any) => setIsDark(res.data?.darkMode || false)).catch(() => {});
  }, []);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await borrowAPI.myRequests({ limit: 500 });
      setRequests(res.data.data || []);
    } catch (e: any) {
      setError(e.response?.data?.error || 'โหลดข้อมูลไม่สำเร็จ');
      setRequests([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCancel = async (id: number) => {
    setSubmitting(true);
    try {
      await borrowAPI.cancelRequest(id);
      showToast('✅ ยกเลิกคำขอเรียบร้อยแล้ว');
      setCancelDialog({ open: false, id: null });
      fetchData();
    } catch (e: any) {
      showToast(`❌ ${e.response?.data?.error || 'ยกเลิกไม่สำเร็จ'}`);
    } finally { setSubmitting(false); }
  };

  const handleExtend = async () => {
    if (!extDialog.req) return;
    const days = parseInt(extDays);
    if (!days || days < 1) { showToast('⚠ ระบุจำนวนวันให้ถูกต้อง'); return; }
    if (!extReason.trim()) { showToast('⚠ กรุณาระบุเหตุผล'); return; }
    setSubmitting(true);
    try {
      const req = extDialog.req;
      const itemIds = req.items?.filter((i: any) => i.itemStatus === 'CheckedOut').map((i: any) => i.id) || [];
      if (itemIds.length === 0) { showToast('⚠ ไม่มีรายการที่ยืมอยู่'); return; }
      await borrowAPI.createExtension({ requestId: req.id, itemIds, extraDays: days, reason: extReason });
      showToast('✅ ส่งคำขอต่อเวลาเรียบร้อย รอ IT Admin อนุมัติ');
      setExtDialog({ open: false, req: null });
      setExtDays('3'); setExtReason('');
      fetchData();
    } catch (e: any) {
      showToast(`❌ ${e.response?.data?.error || 'เกิดข้อผิดพลาด'}`);
    } finally { setSubmitting(false); }
  };

  const countBy = useCallback((s: string) => requests.filter(r => r.status === s).length, [requests]);

  const overdueCount = useMemo(() =>
    requests.filter(r => r.status === 'CheckedOut' && r.items?.some((i: any) => {
      const d = getDaysLeft(i.dueDate);
      return i.itemStatus === 'CheckedOut' && d !== null && d < 0;
    })).length, [requests]);

  const filtered = useMemo(() => {
    let result = requests.filter(r => !TABS[activeTab].filter || r.status === TABS[activeTab].filter);
    result.sort((a, b) => {
      const aHasOverdue = a.items?.some((i: any) => { const d = getDaysLeft(i.dueDate); return i.itemStatus === 'CheckedOut' && d !== null && d < 0; });
      const bHasOverdue = b.items?.some((i: any) => { const d = getDaysLeft(i.dueDate); return i.itemStatus === 'CheckedOut' && d !== null && d < 0; });
      if (aHasOverdue && !bHasOverdue) return -1;
      if (!aHasOverdue && bHasOverdue) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [requests, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const C = {
    pageBg:      isDark ? '#0f172a' : '#f1f5f9',
    cardBg:      isDark ? '#1e293b' : '#fff',
    cardBorder:  isDark ? '#334155' : '#e2e8f0',
    text:        isDark ? '#e2e8f0' : '#0f172a',
    textDim:     isDark ? '#94a3b8' : '#64748b',
    textMuted:   isDark ? '#64748b' : '#94a3b8',
    border:      isDark ? '#334155' : '#e2e8f0',
    inputBg:     isDark ? '#0f172a' : '#fff',
    inputBorder: isDark ? '#475569' : '#e2e8f0',
    hoverBg:     isDark ? '#334155' : '#f8fafc',
    tabActive:   isDark ? '#38bdf8' : '#0284c7',
    statBg:      isDark ? '#1e293b' : '#fff',
    sectionBg:   isDark ? '#0f172a' : '#f8fafc',
    badgeBg:     isDark ? '#334155' : '#f1f5f9',
    badgeText:   isDark ? '#cbd5e1' : '#94a3b8',
    overlay:     'rgba(0,0,0,0.5)',
    modalBg:     isDark ? '#1e293b' : '#fff',
    modalText:   isDark ? '#e2e8f0' : '#0f172a',
    modalDim:    isDark ? '#94a3b8' : '#64748b',
    btnPrimary:  isDark ? '#0e7490' : '#0ea5e9',
    btnDanger:   '#dc2626',
    btnCancel:   isDark ? '#334155' : '#f1f5f9',
    btnCancelTxt: isDark ? '#e2e8f0' : '#334155',
    toastBg:     isDark ? '#334155' : '#1e293b',
  };

  if (loading) return (
    <div style={{ background: C.pageBg, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', color: C.textDim }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>⏳</div>
        <div style={{ fontWeight: 600 }}>กำลังโหลด...</div>
      </div>
    </div>
  );

  return (
    <div style={{ background: C.pageBg, minHeight: '100vh', paddingBottom: 48 }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px' }}>
        {toast && (
          <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: C.toastBg, color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: '0.9rem' }}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12, paddingTop: 28 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: C.text }}>รายการของฉัน</h2>
            <p style={{ margin: '2px 0 0', color: C.textDim, fontSize: '0.85rem' }}>ติดตามสถานะยืม-คืน ส่งคืน หรือขอต่อเวลา</p>
          </div>
          <button onClick={() => navigate('/borrow/new')}
            style={{ background: C.btnPrimary, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(14,165,233,0.3)' }}>
            + ยืมใหม่
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.4rem' }}>❌</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.95rem' }}>เกิดข้อผิดพลาด</div>
              <div style={{ color: '#b91c1c', fontSize: '0.82rem', marginTop: 2 }}>{error}</div>
            </div>
            <button onClick={fetchData} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
              🔄 ลองใหม่
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'กำลังยืม',    value: countBy('CheckedOut'),  icon: '📦', color: '#16a34a', bg: isDark ? '#052e16' : '#f0fdf4' },
            { label: 'เกินกำหนด',   value: overdueCount,           icon: '🔴', color: '#dc2626', bg: isDark ? '#450a0a' : '#fef2f2' },
            { label: 'รออนุมัติ',   value: countBy('Pending'),     icon: '⏳', color: '#d97706', bg: isDark ? '#451a03' : '#fffbeb' },
            { label: 'คืนแล้ว',     value: countBy('Returned'),    icon: '📥', color: '#6b7280', bg: isDark ? '#1e293b' : '#f9fafb' },
          ].map(s => (
            <div key={s.label} style={{ background: C.statBg, borderRadius: 14, padding: '14px 16px', border: `1px solid ${C.cardBorder}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: C.textMuted, fontWeight: 600 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, background: isDark ? '#1e293b' : '#e2e8f0', borderRadius: 10, padding: 3, marginBottom: 20, overflowX: 'auto' }}>
          {TABS.map((t, i) => {
            const cnt = i === 3 ? requests.length : countBy(t.filter);
            return (
              <button key={t.label} onClick={() => { setActiveTab(i); setPage(1); setExpandedReq(null); }} style={{
                flex: 1, border: 'none', padding: '8px 14px', cursor: 'pointer', borderRadius: 8, whiteSpace: 'nowrap',
                fontWeight: activeTab === i ? 700 : 500, fontSize: '0.82rem',
                background: activeTab === i ? (isDark ? '#0f172a' : '#fff') : 'transparent',
                color: activeTab === i ? C.tabActive : C.textDim,
                boxShadow: activeTab === i ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}>
                {t.label}
                {cnt > 0 && <span style={{ marginLeft: 4, opacity: 0.7 }}>({cnt})</span>}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {paged.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: C.textMuted }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>{activeTab === 0 ? '📭' : '📋'}</div>
            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>ไม่มีรายการในสถานะนี้</div>
            <p style={{ fontSize: '0.85rem', margin: '0 0 20px', color: C.textDim }}>
              {activeTab === 0 ? 'คุณยังไม่มีรายการที่กำลังยืมอยู่ ไปยืมอุปกรณ์กันเลย!' : 'ไม่มีประวัติรายการในสถานะนี้'}
            </p>
            <button onClick={() => navigate('/borrow/new')}
              style={{ background: C.btnPrimary, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
              + เริ่มยืมอุปกรณ์
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {paged.map((req) => {
              const sm = statusMeta[req.status] || statusMeta['Pending'];
              const checkedOutItems = (req.items || []).filter((i: any) => i.itemStatus === 'CheckedOut');
              const hasOverdue = checkedOutItems.some((i: any) => { const d = getDaysLeft(i.dueDate); return d !== null && d < 0; });
              const hasUrgent = checkedOutItems.some((i: any) => { const d = getDaysLeft(i.dueDate); return d !== null && d >= 0 && d <= 3; });
              const pendingExt = req.extensions?.find((e: any) => e.status === 'Pending');
              const isExpanded = expandedReq === req.id;
              const borderColor = hasOverdue ? '#dc2626' : hasUrgent ? '#f59e0b' : C.cardBorder;

              return (
                <div key={req.id} style={{
                  background: C.cardBg, borderRadius: 14,
                  border: `1px solid ${borderColor}`,
                  borderLeft: `2px solid ${borderColor}`,
                  overflow: 'hidden', transition: 'all 0.15s',
                  cursor: 'pointer',
                }} onClick={() => setExpandedReq(isExpanded ? null : req.id)}>
                  {/* Compact header */}
                  <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.requestNo}</span>
                      <span style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.color}30`, borderRadius: 20, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {sm.label}
                      </span>
                      {hasOverdue && <span style={{ color: '#dc2626', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>🔴 เกินกำหนด</span>}
                      {hasUrgent && !hasOverdue && <span style={{ color: '#d97706', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>⚠ ใกล้ครบกำหนด</span>}
                      {pendingExt && <span style={{ color: '#d97706', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>⏳ รออนุมัติต่อเวลา</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: '0.75rem', color: C.textMuted }}>{formatDate(req.createdAt)}</span>
                      <span style={{ color: C.textMuted, fontSize: '0.8rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▾</span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
                      {/* Purpose */}
                      <div style={{ padding: '12px 18px', background: C.sectionBg, display: 'flex', gap: 20, flexWrap: 'wrap', borderBottom: `1px solid ${C.border}`, fontSize: '0.82rem' }}>
                        <div><span style={{ color: C.textMuted }}>วัตถุประสงค์: </span><span style={{ color: C.text, fontWeight: 500 }}>{req.purpose || '-'}</span></div>
                        {checkedOutItems.length > 0 && checkedOutItems[0]?.dueDate && (
                          <div><span style={{ color: C.textMuted }}>กำหนดคืน: </span><span style={{ color: hasOverdue ? '#dc2626' : C.text, fontWeight: 700 }}>{formatDate(checkedOutItems[0].dueDate)}</span></div>
                        )}
                      </div>

                      {/* Items */}
                      <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(req.items || []).map((item: any) => {
                          const isCheckedOut = item.itemStatus === 'CheckedOut';
                          const daysLeft = getDaysLeft(item.dueDate);
                          const isOverdue = isCheckedOut && daysLeft !== null && daysLeft < 0;
                          const isUrgent = isCheckedOut && daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
                          let urgencyClass = 'normal';
                          if (isOverdue) urgencyClass = 'overdue';
                          else if (isUrgent) urgencyClass = 'urgent';

                          return (
                            <div key={item.id} style={{
                              padding: '12px 14px', borderRadius: 10,
                              border: `1px solid ${urgencyClass === 'overdue' ? '#fca5a5' : urgencyClass === 'urgent' ? '#fcd34d' : C.border}`,
                              background: urgencyClass === 'overdue' ? (isDark ? '#450a0a' : '#fef2f2') : urgencyClass === 'urgent' ? (isDark ? '#451a03' : '#fffbeb') : C.sectionBg,
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: C.text }}>
                                    {item.asset?.assetName || item.inventoryItem?.name || item.asset?.assetCode || `Item #${item.id}`}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: C.textDim, marginTop: 1 }}>
                                    {item.asset?.assetCode && <span style={{ fontFamily: 'monospace' }}>{item.asset.assetCode}</span>}
                                    {item.asset?.brand && <span> · {item.asset.brand} {item.asset.model}</span>}
                                    {item.isQuantityBased && <span>จำนวน {item.quantity} {item.inventoryItem?.unit}</span>}
                                  </div>
                                </div>
                                <span style={{
                                  padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
                                  background: item.itemStatus === 'CheckedOut' ? '#f0fdf4' : item.itemStatus === 'Returned' ? '#f9fafb' : '#f0f9ff',
                                  color: item.itemStatus === 'CheckedOut' ? '#16a34a' : item.itemStatus === 'Returned' ? '#6b7280' : '#0284c7',
                                  border: `1px solid ${item.itemStatus === 'CheckedOut' ? '#bbf7d0' : item.itemStatus === 'Returned' ? '#e5e7eb' : '#bae6fd'}`,
                                }}>
                                  {item.itemStatus === 'CheckedOut' ? 'กำลังยืม' : item.itemStatus === 'Returned' ? 'คืนแล้ว' : item.itemStatus}
                                </span>
                              </div>

                              {/* Due date bar */}
                              {isCheckedOut && item.dueDate && <DueBar dueDate={item.dueDate} />}

                              {/* Actions */}
                              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                                {!item.isQuantityBased && item.assetId && (
                                  <button onClick={() => navigate('/assets/' + item.assetId)}
                                    style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                                    🔍 ดูรายละเอียด
                                  </button>
                                )}
                                {isCheckedOut && (
                                  <>
                                    <button onClick={() => {
                                      setExtDialog({ open: true, req });
                                      setExtDays('3'); setExtReason('');
                                    }}
                                      disabled={!!pendingExt}
                                      title="ขยายวันยืม"
                                      style={{
                                        padding: '5px 12px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, cursor: pendingExt ? 'not-allowed' : 'pointer',
                                        background: pendingExt ? (isDark ? '#1e293b' : '#f1f5f9') : (isDark ? '#0c4a6e' : '#f0f9ff'),
                                        color: pendingExt ? (isDark ? '#475569' : '#94a3b8') : (isDark ? '#38bdf8' : '#0284c7'),
                                        border: `1px solid ${pendingExt ? (isDark ? '#334155' : '#e2e8f0') : (isDark ? '#0e7490' : '#bae6fd')}`,
                                      }}>
                                      ⏰ ขอต่อเวลา
                                    </button>
                                    {isAdmin && (
                                      <button onClick={() => navigate(`/borrow/return?itemId=${item.id}`)}
                                        title="ดำเนินการคืน (IT)"
                                        style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                                        ↩ คืน
                                      </button>
                                    )}
                                  </>
                                )}
                                {item.itemStatus === 'Returned' && item.returnDate && (
                                  <span style={{ fontSize: '0.72rem', color: C.textMuted, padding: '5px 0' }}>
                                    ✅ คืนแล้ว {formatDate(item.returnDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Extension history */}
                      {req.extensions && req.extensions.length > 0 && (
                        <div style={{ margin: '0 18px 12px', padding: '10px 14px', background: C.sectionBg, borderRadius: 10, border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: C.textDim, marginBottom: 6 }}>📋 ประวัติขอต่อเวลา</div>
                          {req.extensions.map((ext: any) => (
                            <div key={ext.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: '0.78rem', color: C.text, borderBottom: `1px dashed ${C.border}` }}>
                              <span style={{
                                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                background: ext.status === 'Approved' ? '#16a34a' : ext.status === 'Pending' ? '#d97706' : '#dc2626',
                              }} />
                              <span>ขอต่อ +{ext.items?.[0]?.extraDays || 0} วัน</span>
                              {ext.status === 'Approved' && <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ อนุมัติ</span>}
                              {ext.status === 'Pending' && <span style={{ color: '#d97706', fontWeight: 600 }}>⏳ รออนุมัติ</span>}
                              {ext.status === 'Rejected' && <span style={{ color: '#dc2626', fontWeight: 600 }}>❌ ปฏิเสธ</span>}
                              <span style={{ fontSize: '0.7rem', color: C.textMuted }}>({formatDate(ext.createdAt)})</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer actions */}
                      <div style={{ padding: '10px 18px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {req.status === 'Pending' && (
                          <button onClick={() => setCancelDialog({ open: true, id: req.id })}
                            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                            ✕ ยกเลิกคำขอ
                          </button>
                        )}
                        {req.status === 'CheckedOut' && checkedOutItems.length > 0 && isAdmin && (
                          <button onClick={() => navigate(`/borrow/return?requestId=${req.id}`)}
                            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                            ↩ คืนทั้งหมด ({checkedOutItems.length} รายการ)
                          </button>
                        )}
                        {req.approvals?.[0] && (
                          <span style={{ fontSize: '0.72rem', color: C.textMuted, padding: '6px 0' }}>
                            {req.approvals[0].action === 'Rejected' ? 'ปฏิเสธ' : 'อนุมัติ'} โดย {req.approvals[0].approver?.displayName || req.approvals[0].approver?.adUsername || 'ระบบ'} เมื่อ {formatDate(req.approvals[0].actedAt)}
                          </span>
                        )}
                      </div>

                      {/* Rejected reason */}
                      {req.status === 'Rejected' && req.approvals?.find((a: any) => a.action === 'Rejected') && (
                        <div style={{ margin: '0 18px 12px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8 }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626' }}>เหตุผลที่ไม่อนุมัติ</div>
                          <div style={{ fontSize: '0.82rem', color: '#991b1b' }}>
                            {req.approvals.find((a: any) => a.action === 'Rejected')?.note || 'ไม่ระบุเหตุผล'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24 }}>
            <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
              style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.cardBg, color: safePage <= 1 ? C.textMuted : C.text, fontSize: '0.82rem', fontWeight: 600, cursor: safePage <= 1 ? 'not-allowed' : 'pointer' }}>
              ← ก่อนหน้า
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: p === safePage ? C.tabActive : 'transparent',
                  color: p === safePage ? '#fff' : C.text,
                  border: p === safePage ? 'none' : `1px solid ${C.border}`,
                  fontWeight: p === safePage ? 700 : 500, fontSize: '0.82rem', cursor: 'pointer',
                }}>
                {p}
              </button>
            ))}
            <button disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}
              style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.cardBg, color: safePage >= totalPages ? C.textMuted : C.text, fontSize: '0.82rem', fontWeight: 600, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer' }}>
              ถัดไป →
            </button>
          </div>
        )}

        {/* Cancel Dialog */}
        {cancelDialog.open && (
          <div style={{ position: 'fixed', inset: 0, background: C.overlay, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setCancelDialog({ open: false, id: null })}>
            <div onClick={e => e.stopPropagation()} style={{ background: C.modalBg, borderRadius: 16, padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: 12 }}>🗑️</div>
              <h3 style={{ margin: '0 0 8px', textAlign: 'center', color: C.modalText, fontSize: '1.1rem' }}>ยืนยันยกเลิก</h3>
              <p style={{ margin: '0 0 24px', textAlign: 'center', color: C.modalDim, fontSize: '0.85rem' }}>
                ยกเลิกคำขอยืมนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setCancelDialog({ open: false, id: null })} disabled={submitting}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: C.btnCancel, color: C.btnCancelTxt, fontWeight: 700, cursor: 'pointer' }}>
                  กลับ
                </button>
                <button onClick={() => handleCancel(cancelDialog.id!)} disabled={submitting}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {submitting ? 'กำลังยกเลิก...' : 'ยืนยัน'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Extension Dialog */}
        {extDialog.open && (
          <div style={{ position: 'fixed', inset: 0, background: C.overlay, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setExtDialog({ open: false, req: null })}>
            <div onClick={e => e.stopPropagation()} style={{ background: C.modalBg, borderRadius: 16, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 4px', color: C.modalText, fontSize: '1.1rem' }}>⏰ ขอต่อเวลา</h3>
              <p style={{ margin: '0 0 16px', color: C.modalDim, fontSize: '0.82rem' }}>
                คำขอ: <strong style={{ color: C.modalText }}>{extDialog.req?.requestNo}</strong>
              </p>

              {extDialog.req && (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: C.sectionBg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: C.textDim, marginBottom: 6 }}>📦 รายการที่ขอต่อ:</div>
                  {extDialog.req.items?.filter((i: any) => i.itemStatus === 'CheckedOut').map((item: any) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px dashed ${C.border}`, fontSize: '0.82rem', color: C.text }}>
                      <span>{item.asset?.assetName || item.asset?.assetCode || item.inventoryItem?.name || `Item #${item.id}`}</span>
                      {item.dueDate && <span style={{ color: C.textDim, fontSize: '0.72rem' }}>กำหนด {formatDate(item.dueDate)}</span>}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: C.textDim, marginBottom: 6 }}>จำนวนวันที่ขอต่อ</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {[3, 7, 14].map(d => (
                    <button key={d} onClick={() => setExtDays(String(d))}
                      style={{ flex: 1, padding: '8px', borderRadius: 8, border: extDays === String(d) ? `2px solid ${C.tabActive}` : `1px solid ${C.border}`, background: extDays === String(d) ? (isDark ? '#0c4a6e' : '#f0f9ff') : 'transparent', color: extDays === String(d) ? C.tabActive : C.text, fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                      {d} วัน
                    </button>
                  ))}
                </div>
                <input type="number" min={1} max={30} value={extDays} onChange={e => setExtDays(e.target.value)}
                  placeholder="ระบุจำนวนวัน (1-30)"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.text, fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: C.textDim, marginBottom: 6 }}>เหตุผลที่ขอต่อ *</label>
                <textarea value={extReason} onChange={e => setExtReason(e.target.value)} rows={3}
                  placeholder="ระบุเหตุผล เช่น งานยังไม่เสร็จ ต้องใช้ต่อ"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.text, fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setExtDialog({ open: false, req: null })} disabled={submitting}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: C.btnCancel, color: C.btnCancelTxt, fontWeight: 700, cursor: 'pointer' }}>
                  ยกเลิก
                </button>
                <button onClick={handleExtend} disabled={submitting}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: C.btnPrimary, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {submitting ? 'กำลังส่ง...' : '📤 ส่งคำขอ'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
