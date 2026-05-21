import React, { useEffect, useState, useRef } from 'react';
import { assetAPI } from '../../services/api';

/* ─────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */
const emptyForm = { name: '', description: '', isActive: true };

/* ─────────────────────────────────────────────────────────────────
   Toggle Switch
───────────────────────────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '38px', height: '22px', borderRadius: '11px',
        background: checked ? '#0ea5e9' : '#e2e8f0',
        position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: '3px',
        left: checked ? '19px' : '3px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: '#fff', transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,.18)',
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Modal
───────────────────────────────────────────────────────────────── */
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)',
        zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '460px',
          boxShadow: '0 20px 60px rgba(0,0,0,.18)', overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{title}</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer',
            color: '#94a3b8', lineHeight: 1, padding: '2px 6px',
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────── */
export default function DeviceTypesPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [editingType, setEditingType] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  /* ── Data ── */
  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await assetAPI.deviceTypes();
      const data = res.data || [];
      setTypes(data);
      setFiltered(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTypes(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q
      ? types.filter(t =>
          (t.name || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
        )
      : types
    );
  }, [search, types]);

  /* ── Toast ── */
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  /* ── Dialog ── */
  const openCreate = () => {
    setEditingType(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (type: any) => {
    setEditingType(type);
    setForm({ name: type.name || '', description: type.description || '', isActive: type.isActive ?? true });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) { setError('กรุณาระบุประเภทอุปกรณ์'); return; }
    setSaving(true); setError('');
    try {
      const data = { name, description: form.description.trim() || null, isActive: form.isActive };
      if (editingType) {
        await assetAPI.updateDeviceType(editingType.id, data);
        showToast(`✅ แก้ไข "${name}" สำเร็จ`);
      } else {
        await assetAPI.createDeviceType(data);
        showToast(`✅ เพิ่ม "${name}" สำเร็จ`);
      }
      setDialogOpen(false);
      fetchTypes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'ไม่สามารถบันทึกประเภทอุปกรณ์ได้');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: any) => {
    try {
      await assetAPI.deleteDeviceType(type.id);
      setDeleteConfirm(null);
      fetchTypes();
      showToast(`🗑 ลบ "${type.name}" สำเร็จ`);
    } catch (err: any) {
      setDeleteConfirm(null);
      showToast(`❌ ${err.response?.data?.error || 'ไม่สามารถลบประเภทได้'}`);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await assetAPI.importDeviceTypesFromAssets();
      await fetchTypes();
      showToast(`✅ นำเข้าสำเร็จ ${res.data?.imported ?? ''} รายการ`);
    } catch (err: any) {
      showToast(`❌ ${err.response?.data?.error || 'นำเข้าไม่สำเร็จ'}`);
    } finally {
      setImporting(false);
    }
  };

  const activeCount   = types.filter(t => t.isActive !== false).length;
  const inactiveCount = types.length - activeCount;
  const accentColor   = '#0ea5e9';

  return (
    <>
      <style>{`
        .dtp-root { font-family: 'Sarabun', sans-serif; }
        .dtp-toast {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 8px;
          font-size: 12px; font-family: 'Sarabun', sans-serif; z-index: 9999;
          box-shadow: 0 8px 24px rgba(0,0,0,.2); pointer-events: none;
          animation: dtpFadeUp .2s ease;
        }
        @keyframes dtpFadeUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div className="dtp-root">

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: '#f0f9ff', border: '1.5px solid #bae6fd',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0,
            }}>🖥️</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>🖥️ ประเภทอุปกรณ์ (Device Types)</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                จัดการรายการประเภทสำหรับใช้ในฟอร์มทรัพย์สินและตัวกรองทะเบียน
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleImport}
              disabled={importing}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '7px 13px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.6 : 1,
                fontFamily: 'Sarabun, sans-serif', transition: 'all .15s',
                background: '#fff', border: '1px solid #e2e8f0', color: '#475569',
              }}
            >
              {importing ? '⏳' : '🔄'} นำเข้าจากทรัพย์สิน
            </button>
            <button
              onClick={openCreate}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '7px 13px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Sarabun, sans-serif', transition: 'all .15s',
                background: accentColor, border: `1px solid #0284c7`, color: '#fff',
              }}
            >
              ＋ เพิ่มประเภท
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {[
            { icon: '📦', val: types.length,   lbl: 'ทั้งหมด',    color: accentColor },
            { icon: '✅', val: activeCount,     lbl: 'ใช้งาน',    color: '#16a34a' },
            ...(inactiveCount > 0 ? [{ icon: '🔒', val: inactiveCount, lbl: 'ปิดใช้งาน', color: '#94a3b8' }] : []),
          ].map(s => (
            <div key={s.lbl} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 16px', background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: '10px', minWidth: '100px',
            }}>
              <span style={{ fontSize: '22px' }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>{s.lbl}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar / Search ── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            style={{
              flex: 1, minWidth: '180px', border: '1px solid #e2e8f0', borderRadius: '8px',
              padding: '7px 12px 7px 34px', fontSize: '12px',
              fontFamily: 'Sarabun, sans-serif', outline: 'none', background: '#fff',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: '10px center',
            }}
            placeholder="ค้นหาประเภทอุปกรณ์..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            แสดง {filtered.length}/{types.length}
          </span>
        </div>

        {/* ── Table ── */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: accentColor, fontSize: '13px' }}>⏳ กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              {search ? `ไม่พบ "${search}"` : 'ยังไม่มีประเภทอุปกรณ์'}<br />
              <span style={{ fontSize: '11px' }}>กดปุ่ม "+ เพิ่มประเภท" เพื่อเริ่มต้น</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['#', 'ประเภทอุปกรณ์', 'รายละเอียด', 'ทรัพย์สิน', 'สถานะ', 'จัดการ'].map((h, i) => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: i === 5 ? 'center' : 'left',
                      fontSize: '11px', fontWeight: 700, color: '#64748b',
                      textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap',
                      width: i === 0 ? '40px' : i === 5 ? '120px' : undefined,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#f8fafc'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                  >
                    <td style={{ padding: '10px 14px', color: '#cbd5e1', fontSize: '11px' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '7px',
                          background: `${accentColor}15`, border: `1px solid ${accentColor}25`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', flexShrink: 0,
                        }}>🖥️</div>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{t.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '11px', maxWidth: '280px' }}>
                      <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.description || <span style={{ color: '#d1d5db' }}>—</span>}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {t.assetCount != null ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: accentColor, display: 'inline-block' }} />
                          {t.assetCount} รายการ
                        </span>
                      ) : <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 9px', borderRadius: '99px',
                        fontSize: '10px', fontWeight: 700,
                        ...(t.isActive !== false
                          ? { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }
                          : { background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0' }),
                      }}>
                        {t.isActive !== false ? '● ใช้งาน' : '○ ปิด'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <button
                          onClick={() => openEdit(t)}
                          style={{
                            padding: '4px 8px', border: '1px solid #bae6fd',
                            borderRadius: '6px', fontSize: '10px', fontWeight: 600,
                            cursor: 'pointer', background: '#f0f9ff', color: '#0369a1',
                            fontFamily: 'Sarabun, sans-serif', transition: 'all .12s',
                          }}
                        >✏️ แก้ไข</button>
                        <button
                          onClick={() => setDeleteConfirm(t)}
                          style={{
                            padding: '4px 8px', border: '1px solid #fecaca',
                            borderRadius: '6px', fontSize: '10px', fontWeight: 600,
                            cursor: 'pointer', background: '#fff5f5', color: '#dc2626',
                            fontFamily: 'Sarabun, sans-serif', transition: 'all .12s',
                          }}
                        >🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Row count ── */}
        {types.length > 0 && (
          <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '8px', textAlign: 'right' }}>
            {filtered.length} รายการ {search && `(กรอง "${search}")`}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingType ? '✏️ แก้ไขประเภทอุปกรณ์' : '➕ เพิ่มประเภทอุปกรณ์'}
      >
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', color: '#dc2626' }}>
              ⚠️ {error}
            </div>
          )}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>ประเภทอุปกรณ์ *</div>
            <input
              autoFocus
              style={{
                width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px',
                padding: '8px 10px', fontSize: '12px', fontFamily: 'Sarabun, sans-serif',
                outline: 'none', boxSizing: 'border-box', color: '#334155',
              }}
              placeholder="เช่น Computer, Monitor, Printer..."
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              onFocus={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.boxShadow = `0 0 0 3px ${accentColor}18`; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = ''; }}
            />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>รายละเอียด</div>
            <textarea
              style={{
                width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px',
                padding: '8px 10px', fontSize: '12px', fontFamily: 'Sarabun, sans-serif',
                outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                minHeight: '72px', color: '#334155',
              }}
              placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              onFocus={e => { e.currentTarget.style.borderColor = accentColor; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>เปิดใช้งาน</span>
            <Toggle checked={form.isActive} onChange={v => setForm(p => ({ ...p, isActive: v }))} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={() => setDialogOpen(false)}
            style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif' }}
          >ยกเลิก</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '7px 18px', borderRadius: '8px', border: `1px solid #0284c7`,
              background: accentColor, color: '#fff', fontSize: '12px', fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              fontFamily: 'Sarabun, sans-serif', minWidth: '80px',
            }}
          >{saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}</button>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        open={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        title="🗑 ยืนยันการลบ"
      >
        <div style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
            ต้องการลบประเภท <strong>"{deleteConfirm?.name}"</strong> ใช่หรือไม่?
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            การลบไม่สามารถย้อนกลับได้ และอาจกระทบข้อมูลทรัพย์สินที่เชื่อมอยู่
            {deleteConfirm?.assetCount > 0 && (
              <span style={{ color: '#ef4444', fontWeight: 600 }}>
                {' '}({deleteConfirm.assetCount} รายการกำลังใช้ประเภทนี้)
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={() => setDeleteConfirm(null)}
            style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif' }}
          >ยกเลิก</button>
          <button
            onClick={() => handleDelete(deleteConfirm)}
            style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #dc2626', background: '#ef4444', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif' }}
          >🗑 ลบเลย</button>
        </div>
      </Modal>

      {/* ── Toast ── */}
      {toast && <div className="dtp-toast">{toast}</div>}
    </>
  );
}
