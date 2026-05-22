import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pmAPI } from '../../services/api';

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

function progressColor(pct: number) {
  if (pct >= 100) return '#10b981';
  if (pct >= 50) return '#0ea5e9';
  if (pct >= 20) return '#f59e0b';
  return '#ef4444';
}

export default function PMDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    pmAPI.dashboard().then(res => setDashboard(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: '#0ea5e9', fontSize: 14 }}>
        ⏳ กำลังโหลดข้อมูล PM...
      </div>
    );
  }

  const planned   = dashboard?.planned || 0;
  const completed = dashboard?.completed || 0;
  const remaining = dashboard?.remaining || 0;
  const overdue   = dashboard?.overdue || 0;
  const pctAll    = planned > 0 ? Math.round(completed / planned * 100) : 0;
  const plans: any[] = dashboard?.plans || [];

  return (
    <>
      <style>{`
        .pmd-root { font-family: 'Sarabun', sans-serif; }
        .pmd-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 8px;
          font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Sarabun', sans-serif;
          transition: all .15s; border: 1px solid transparent; white-space: nowrap; }
        .pmd-btn-primary  { background: #0ea5e9; border-color: #0284c7; color: #fff; }
        .pmd-btn-primary:hover  { background: #0284c7; }
        .pmd-btn-success  { background: #10b981; border-color: #059669; color: #fff; }
        .pmd-btn-success:hover  { filter: brightness(1.08); }
        .pmd-btn-outline  { background: #fff; border-color: #e2e8f0; color: #475569; }
        .pmd-btn-outline:hover  { border-color: #0ea5e9; color: #0ea5e9; }
        .pmd-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
      `}</style>

      <div className="pmd-root">

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f9ff', border: '1.5px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛡</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>PM Dashboard</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>ภาพรวม Preventive Maintenance ปี {year + 543}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="pmd-btn pmd-btn-outline" onClick={() => navigate('/pm/schedule')}>📅 Gantt Chart</button>
            <button className="pmd-btn pmd-btn-outline" onClick={() => navigate('/pm/templates')}>📝 Template</button>
            <button className="pmd-btn pmd-btn-outline" onClick={() => navigate('/pm/runs')}>🔧 ทำ PM</button>
            <button className="pmd-btn pmd-btn-primary" onClick={() => navigate('/pm/plans')}>＋ สร้างแผน</button>
          </div>
        </div>

        {/* ── Overall Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 18 }}>
          {[
            { icon: '🎯', label: 'เป้าหมาย', val: planned, color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' },
            { icon: '✅', label: 'เสร็จแล้ว', val: completed, color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
            { icon: '⏳', label: 'รอดำเนินการ', val: remaining, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
            { icon: '⚠️', label: 'เกินกำหนด', val: overdue, color: '#ef4444', bg: '#fff5f5', border: '#fecaca' },
            { icon: '📊', label: 'ความคืบหน้า', val: `${pctAll}%`, color: progressColor(pctAll), bg: '#f8fafc', border: '#e2e8f0' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 26 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Overall progress ── */}
        {planned > 0 && (
          <div className="pmd-card" style={{ padding: '14px 18px', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>ความคืบหน้าโดยรวม ปี {year + 543}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: progressColor(pctAll) }}>{pctAll}%</span>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: 99, height: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: progressColor(pctAll), width: `${pctAll}%`, transition: 'width .5s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
              <span>เสร็จแล้ว {completed} เครื่อง</span>
              <span>เป้าหมาย {planned} เครื่อง</span>
            </div>
          </div>
        )}

        {/* ── Quick Actions ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 18 }}>
          {[
            { icon: '📋', title: 'แผน PM', sub: `${plans.length} แผน`, color: '#0ea5e9', bg: '#f0f9ff', onClick: () => navigate('/pm/plans') },
            { icon: '📅', title: 'กำหนดการ PM (Gantt)', sub: 'Gantt Chart แผนรายสัปดาห์', color: '#10b981', bg: '#f0fdf4', onClick: () => navigate('/pm/schedule') },
            { icon: '🔧', title: 'ทำ PM Checklist', sub: `${remaining} รายการรอ`, color: '#f59e0b', bg: '#fffbeb', onClick: () => navigate('/pm/runs') },
            { icon: '📝', title: 'จัดการ Template', sub: 'Customize Checklist', color: '#8b5cf6', bg: '#f5f3ff', onClick: () => navigate('/pm/templates') },
          ].map(a => (
            <button key={a.title} onClick={a.onClick} style={{
              background: a.bg, border: `1px solid ${a.color}30`, borderRadius: 12, padding: '14px 16px',
              cursor: 'pointer', textAlign: 'left', transition: 'box-shadow .15s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = ''}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{a.title}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{a.sub}</div>
            </button>
          ))}
        </div>

        {/* ── Plan breakdown table ── */}
        {plans.length > 0 && (
          <div className="pmd-card">
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>📊</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>รายละเอียดแผน PM</span>
              <span style={{ fontSize: 10, background: '#f0f9ff', color: '#0369a1', padding: '2px 8px', borderRadius: 99, border: '1px solid #bae6fd', fontWeight: 700, marginLeft: 4 }}>
                {plans.length} แผน
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['แผนก / Site', 'ประเภท', 'เป้าหมาย', 'สร้างงาน', 'เสร็จ', 'ความคืบหน้า', 'วันเริ่ม', 'วันสิ้นสุด', 'สถานะ'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan: any) => {
                    const total = plan.totalCount ?? (plan.runs?.length || 0);
                    const done = plan.completedCount ?? (plan.runs?.filter((r: any) => r.status === 'COMPLETED').length || 0);
                    const pct = total > 0 ? Math.round(done / total * 100) : 0;
                    const isDept = Boolean(plan.deptTask);
                    const label = isDept ? plan.deptTask : plan.site;
                    const today = new Date();
                    const end = plan.endDate ? new Date(plan.endDate) : null;
                    const start = plan.startDate ? new Date(plan.startDate) : null;
                    const isOverdue = end && today > end && pct < 100;
                    const isActive = start && end && today >= start && today <= end;
                    const isDone = pct >= 100;

                    return (
                      <tr key={plan.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                        onClick={() => navigate(`/pm/runs?planId=${plan.id}`)}
                      >
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 12 }}>{label || 'ทั่วไป'}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>ปี {plan.year + 543}</div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: isDept ? '#f5f3ff' : '#f0f9ff', color: isDept ? '#7c3aed' : '#0369a1', border: `1px solid ${isDept ? '#ddd6fe' : '#bae6fd'}` }}>
                            {isDept ? '🏢 แผนก' : '📍 Location'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#334155' }}>{plan.plannedDeviceCount}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569' }}>{total}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#10b981' }}>{done}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 99, background: progressColor(pct), width: `${pct}%`, transition: 'width .4s' }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: progressColor(pct), minWidth: 34 }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(plan.startDate)}</td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(plan.endDate)}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
                            ...(isDone ? { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }
                              : isOverdue ? { background: '#fff5f5', color: '#dc2626', border: '1px solid #fecaca' }
                              : isActive ? { background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }
                              : { background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0' }),
                          }}>
                            {isDone ? '✅ เสร็จสิ้น' : isOverdue ? '⚠️ เกินกำหนด' : isActive ? '🔄 กำลังดำเนิน' : '📅 กำหนดการ'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {plans.length === 0 && !loading && (
          <div className="pmd-card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛡</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>ยังไม่มีข้อมูล PM</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, marginBottom: 16 }}>เริ่มต้นด้วยการสร้างแผน PM และ Generate งาน</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="pmd-btn pmd-btn-outline" onClick={() => navigate('/pm/templates')}>📝 สร้าง Template</button>
              <button className="pmd-btn pmd-btn-primary" onClick={() => navigate('/pm/plans')}>📋 สร้างแผน PM</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
