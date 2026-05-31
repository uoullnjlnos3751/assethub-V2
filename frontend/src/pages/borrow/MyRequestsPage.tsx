import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { borrowAPI } from '../../services/api';
import { useTheme, useMediaQuery } from '@mui/material';

const statusMeta: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Pending:          { label: 'รออนุมัติ',    color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  Approved:         { label: 'อนุมัติแล้ว',  color: '#0284c7', bg: '#f0f9ff', border: '#7dd3fc' },
  Rejected:         { label: 'ไม่อนุมัติ',   color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  CheckedOut:       { label: 'ส่งมอบแล้ว',   color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  PartiallyReturned:{ label: 'คืนบางส่วน',   color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
  Returned:         { label: 'คืนแล้ว',       color: '#6b7280', bg: '#f9fafb', border: '#d1d5db' },
  Cancelled:        { label: 'ยกเลิกแล้ว',   color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
};

const TABS = [
  { label: 'รออนุมัติ', filter: 'Pending' },
  { label: 'อนุมัติแล้ว', filter: 'Approved' },
  { label: 'ส่งมอบแล้ว', filter: 'CheckedOut' },
  { label: 'คืนแล้ว', filter: 'Returned' },
  { label: 'ไม่อนุมัติ', filter: 'Rejected' },
  { label: 'ยกเลิก', filter: 'Cancelled' },
];

export default function MyRequestsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailReq, setDetailReq] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchRequests(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await borrowAPI.myRequests();
      setRequests(res.data.data || []);
    } catch { setRequests([]); }
    finally { setLoading(false); }
  };

  const handleCancel = async (id: number) => {
    setSubmitting(true);
    try {
      await borrowAPI.cancelRequest(id);
      showToast('✅ ยกเลิกคำขอเรียบร้อยแล้ว');
      setCancelDialog({ open: false, id: null });
      if (detailReq?.id === id) setDetailReq(null);
      fetchRequests();
    } catch (e: any) {
      showToast(`❌ ${e.response?.data?.error || 'ยกเลิกไม่สำเร็จ'}`);
    } finally { setSubmitting(false); }
  };

  const countBy = (s: string) => requests.filter(r => r.status === s).length;
  const filtered = requests
    .filter(r => r.status === TABS[activeTab].filter)
    .filter(r => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return r.requestNo?.toLowerCase().includes(s) || r.purpose?.toLowerCase().includes(s) ||
        r.items?.some((i: any) => i.asset?.assetCode?.toLowerCase().includes(s));
    });

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#64748b' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div><div>กำลังโหลด...</div></div>
    </div>
  );

  return (
    <div style={{ paddingBottom: 48, maxWidth: 1100, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: '#1e293b', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: '0.9rem' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>คำขอยืมของฉัน</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>ติดตามสถานะคำขอยืมทรัพย์สิน</p>
        </div>
        <button onClick={() => navigate('/borrow/new')}
          style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
          + ยืมใหม่
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'รออนุมัติ',    count: countBy('Pending'),   color: '#d97706', bg: '#fffbeb', icon: '⏳' },
          { label: 'อนุมัติแล้ว',  count: countBy('Approved'),  color: '#0284c7', bg: '#f0f9ff', icon: '✅' },
          { label: 'ส่งมอบแล้ว',   count: countBy('CheckedOut'),color: '#16a34a', bg: '#f0fdf4', icon: '📦' },
          { label: 'คืนแล้ว',      count: countBy('Returned'),  color: '#6b7280', bg: '#f9fafb', icon: '📥' },
          { label: 'ไม่อนุมัติ',   count: countBy('Rejected'),  color: '#dc2626', bg: '#fef2f2', icon: '✕' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: '0.72rem', color: s.color, fontWeight: 600, opacity: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1rem' }}>🔍</span>
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="ค้นหาด้วยเลขที่คำขอ, วัตถุประสงค์, รหัสอุปกรณ์"
          style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.9rem', boxSizing: 'border-box', background: '#fff', outline: 'none' }} />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem', lineHeight: 1 }}>✕</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e2e8f0', marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map((t, i) => {
          const cnt = countBy(t.filter);
          return (
            <button key={t.label} onClick={() => setActiveTab(i)} style={{
              border: 'none', background: 'none', padding: '10px 16px', cursor: 'pointer',
              fontWeight: activeTab === i ? 700 : 500, fontSize: '0.85rem', whiteSpace: 'nowrap',
              color: activeTab === i ? '#0ea5e9' : '#64748b',
              borderBottom: activeTab === i ? '2px solid #0ea5e9' : '2px solid transparent',
              marginBottom: -2,
            }}>
              {t.label}
              {cnt > 0 && <span style={{ background: activeTab === i ? '#e0f2fe' : '#f1f5f9', color: activeTab === i ? '#0284c7' : '#94a3b8', borderRadius: 20, padding: '1px 7px', fontSize: '0.75rem', marginLeft: 5 }}>{cnt}</span>}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 600 }}>ไม่มีรายการ</div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          {isMobile ? (
            /* Mobile: Card Layout */
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((r) => {
                const sm = statusMeta[r.status] || statusMeta.Pending;
                return (
                  <div key={r.id} style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fafbfc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{r.requestNo}</span>
                      <span style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{sm.label}</span>
                    </div>
                    {r.purpose && <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.purpose}</div>}
                    <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: '#64748b', marginBottom: 8, flexWrap: 'wrap' }}>
                      <span>📦 {r.items?.length || 0} รายการ</span>
                      <span>📅 {new Date(r.createdAt).toLocaleDateString('th-TH')}</span>
                      {r.items?.[0]?.dueDate && <span>⏰ คืน {new Date(r.items[0].dueDate).toLocaleDateString('th-TH')}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setDetailReq(r)}
                        style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 7, padding: '7px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                        👁 ดูรายละเอียด
                      </button>
                      {r.status === 'Pending' && (
                        <button onClick={() => setCancelDialog({ open: true, id: r.id })}
                          style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 7, padding: '7px 12px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                          ✕ ยกเลิก
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Desktop: Table Layout */
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {["\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48\u0e04\u0e33\u0e02\u0e2d", "\u0e27\u0e31\u0e15\u0e16\u0e38\u0e1b\u0e23\u0e30\u0e2a\u0e07\u0e04\u0e4c", "\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23", "\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e02\u0e2d", "\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e04\u0e37\u0e19", "\u0e2a\u0e16\u0e32\u0e19\u0e30", ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const sm = statusMeta[r.status] || statusMeta.Pending;
                  return (
                    <tr key={r.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '13px 16px', fontWeight: 700, color: '#0f172a' }}>{r.requestNo}</td>
                      <td style={{ padding: '13px 16px', color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.purpose || '-'}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 20, padding: '2px 10px', fontSize: '0.78rem', fontWeight: 600 }}>
                          {r.items?.length || 0} {"\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23"}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleDateString('th-TH')}</td>
                      <td style={{ padding: '13px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {r.items?.[0]?.dueDate ? new Date(r.items[0].dueDate).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                          {sm.label}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => setDetailReq(r)}
                            style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 7, padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                            👁 ดู
                          </button>
                          {r.status === 'Pending' && (
                            <button onClick={() => setCancelDialog({ open: true, id: r.id })}
                              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 7, padding: '5px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                              ✕ ยกเลิก
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {detailReq && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 0, maxWidth: 520, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{detailReq.requestNo}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>รายละเอียดคำขอยืม</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {(() => { const sm = statusMeta[detailReq.status] || statusMeta.Pending; return (
                  <span style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, borderRadius: 20, padding: '3px 12px', fontSize: '0.78rem', fontWeight: 700 }}>{sm.label}</span>
                ); })()}
                <button onClick={() => setDetailReq(null)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              {/* Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {[
                  { label: 'วัตถุประสงค์', value: detailReq.purpose || '-' },
                  { label: 'วันที่ขอ', value: new Date(detailReq.createdAt).toLocaleString('th-TH') },
                  { label: 'สถานที่', value: detailReq.location || '-' },
                  { label: 'หมายเหตุ', value: detailReq.note || '-' },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{f.label}</div>
                    <div style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 500 }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {/* Approver details */}
              {detailReq.approvals && detailReq.approvals.length > 0 && (
                <div style={{ padding: '12px 16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, marginBottom: 16 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', marginBottom: 6 }}>
                    {"\u0e1c\u0e39\u0e49\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34"}
                  </div>
                  {detailReq.approvals.map((app: any) => {
                    const isApp = app.action === 'Approved';
                    return (
                      <div key={app.id} style={{ fontSize: '0.82rem', color: '#0c4a6e', display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 6, borderBottom: detailReq.approvals.length > 1 ? '1px dashed #bae6fd' : 'none', marginBottom: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700 }}>{app.approver?.displayName || app.approver?.adUsername || '-'}</span>
                          <span style={{ background: isApp ? '#dcfce7' : '#fef2f2', color: isApp ? '#16a34a' : '#dc2626', borderRadius: 20, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
                            {isApp ? "\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34" : "\u0e44\u0e21\u0e48\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34"}
                          </span>
                        </div>
                        {app.note && <div style={{ fontSize: '0.78rem', color: '#475569', fontStyle: 'italic', marginTop: 2 }}>"{app.note}"</div>}
                        <div style={{ fontSize: '0.68rem', color: '#64748b', textAlign: 'right' }}>{new Date(app.actedAt).toLocaleString('th-TH')}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rejected reason fallback */}
              {detailReq.status === 'Rejected' && (!detailReq.approvals || detailReq.approvals.length === 0) && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, marginBottom: 16 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>{"\u0e48\u0e2b\u0e15\u0e38\u0e1c\u0e25\u0e01\u0e32\u0e23\u0e44\u0e21\u0e48\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34"}</div>
                  <div style={{ fontSize: '0.88rem', color: '#991b1b' }}>
                    {"\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38\u0e40\u0e2b\u0e15\u0e38\u0e1c\u0e25"}
                  </div>
                </div>
              )}

              {/* Items */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{"\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e17\u0e35\u0e48\u0e02\u0e2d\u0e22\u0e37\u0e21"} ({detailReq.items?.length || 0})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detailReq.items?.map((item: any) => {
                    const ism = statusMeta[item.itemStatus] || statusMeta.Pending;
                    return (
                      <div key={item.id} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {item.isQuantityBased && item.inventoryItem ? (
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.inventoryItem.name}</div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{"\u0e08\u0e33\u0e19\u0e27\u0e19"} {item.quantity} {item.inventoryItem.unit}</div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{item.asset?.assetCode || 'N/A'} {item.asset?.assetName ? `| ${item.asset.assetName}` : ''}</div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                ประเภท: {item.asset?.type || '-'} · S/N: {item.asset?.serialNo || '-'} · {item.asset?.brand} {item.asset?.model}
                              </div>
                            </div>
                          )}
                          <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: 4 }}>
                            {"\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e04\u0e37\u0e19:"} {item.dueDate ? new Date(item.dueDate).toLocaleDateString('th-TH') : '-'}
                          </div>
                        </div>
                        <span style={{ background: ism.bg, color: ism.color, border: `1px solid ${ism.border}`, borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {ism.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                {detailReq.status === 'Pending' && (
                  <button onClick={() => { setDetailReq(null); setCancelDialog({ open: true, id: detailReq.id }); }}
                    style={{ flex: 1, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px', fontWeight: 700, cursor: 'pointer' }}>
                    ✕ ยกเลิกคำขอ
                  </button>
                )}
                <button onClick={() => setDetailReq(null)}
                  style={{ flex: 1, background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 700, cursor: 'pointer' }}>
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm Dialog */}
      {cancelDialog.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>ยืนยันการยกเลิก</h3>
            <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>
              คุณต้องการยกเลิกคำขอยืมนี้ใช่หรือไม่?<br/>การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setCancelDialog({ open: false, id: null })} disabled={submitting}
                style={{ flex: 1, background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                ไม่ยกเลิก
              </button>
              <button onClick={() => handleCancel(cancelDialog.id!)} disabled={submitting}
                style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                {submitting ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
