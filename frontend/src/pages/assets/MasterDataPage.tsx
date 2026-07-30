import React, { useEffect, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';

/* ─────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */
type StatusOption = { code: string; name: string };

interface MasterDataItem {
  id: number;
  name: string;
  code?: string;
  description?: string | null;
  company?: string;
  isActive: boolean;
  assetCount?: number;
}

type MasterDataPageProps = {
  title: string;
  subtitle: string;
  itemLabel: string;
  icon?: string;
  accentColor?: string;
  fetchItems: () => Promise<any>;
  createItem: (data: any) => Promise<any>;
  updateItem: (id: number, data: any) => Promise<any>;
  deleteItem: (id: number) => Promise<any>;
  importItems?: () => Promise<any>;
  statusOptions?: StatusOption[];
  showCompanyField?: boolean;
  showCodeField?: boolean;
};

const emptyForm = { code: '', name: '', company: '', description: '', isActive: true };

/* ─────────────────────────────────────────────────────────────────
   Inline Modal
───────────────────────────────────────────────────────────────── */
function Modal({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
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
   Main Component
───────────────────────────────────────────────────────────────── */
export default function MasterDataPage({
  title, subtitle, itemLabel, icon = '📋', accentColor = '#0ea5e9',
  fetchItems, createItem, updateItem, deleteItem,
  importItems, statusOptions, showCompanyField, showCodeField,
}: MasterDataPageProps) {

  const toast = useToast();
  const [items, setItems] = useState<MasterDataItem[]>([]);
  const [filtered, setFiltered] = useState<MasterDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<MasterDataItem | null>(null);

  const isStatusPage = Boolean(statusOptions?.length);

  /* ── Data ── */
  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetchItems();
      const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setItems(data);
      setFiltered(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? items.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.code || '').toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q)
    ) : items);
  }, [search, items]);

  /* ── Dialog ── */
  const openCreate = () => {
    setEditingItem(null);
    setForm({ ...emptyForm, code: statusOptions?.[0]?.code || '' });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      code: item.code || statusOptions?.[0]?.code || '',
      name: item.name || '',
      company: item.company || '',
      description: item.description || '',
      isActive: item.isActive ?? true,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (isStatusPage && !form.code.trim()) { setError('กรุณาเลือกรหัสสถานะ'); return; }
    if (!form.name.trim()) { setError(`กรุณาระบุ${itemLabel}`); return; }
    setSaving(true); setError('');
    try {
      const data = {
        code: isStatusPage ? form.code.trim() : showCodeField ? form.code.trim() || null : undefined,
        name: form.name.trim(),
        company: showCompanyField ? form.company.trim() || null : undefined,
        description: form.description.trim() || null,
        isActive: form.isActive,
      };
      if (editingItem) {
        await updateItem(editingItem.id, data);
        toast.success(`แก้ไข "${form.name}" สำเร็จ`);
      } else {
        await createItem(data);
        toast.success(`เพิ่ม "${form.name}" สำเร็จ`);
      }
      setDialogOpen(false);
      loadItems();
    } catch (err: any) {
      setError(err.response?.data?.error || `ไม่สามารถบันทึก${itemLabel}ได้`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: any) => {
    try {
      await deleteItem(item.id);
      setDeleteConfirm(null);
      loadItems();
      toast.success(`ลบ "${item.name}" สำเร็จ`);
    } catch (err: any) {
      setDeleteConfirm(null);
      toast.error(`❌ ${err.response?.data?.error || `ไม่สามารถลบ${itemLabel}ได้`}`);
    }
  };

  const handleImport = async () => {
    if (!importItems) return;
    setImporting(true);
    try {
      const res = await importItems();
      await loadItems();
      toast.success(`นำเข้าสำเร็จ ${res?.data?.imported ?? ''} รายการ`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'นำเข้าไม่สำเร็จ');
    } finally {
      setImporting(false);
    }
  };

  const activeCount = items.filter(i => i.isActive !== false).length;
  const inactiveCount = items.length - activeCount;

  return (
    <>
      <style>{`
        .mdp-root { font-family: 'Sarabun', sans-serif; }
        .mdp-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; }
        .mdp-title-wrap { display: flex; align-items: center; gap: 12px; }
        .mdp-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .mdp-title { font-size: 16px; font-weight: 700; color: #0f172a; line-height: 1.2; }
        .mdp-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }

        /* Stats row */
        .mdp-stats { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
        .mdp-stat { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; flex: 1; min-width: 100px; }
        .mdp-stat-val { font-size: 20px; font-weight: 800; color: #0f172a; }
        .mdp-stat-lbl { font-size: 10px; color: #94a3b8; line-height: 1.2; }

        /* Toolbar */
        .mdp-toolbar { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; }
        .mdp-search { flex: 1; min-width: 180px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 12px 7px 34px; font-size: 12px; font-family: 'Sarabun', sans-serif; outline: none; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E") no-repeat 10px center; }
        .mdp-search:focus { border-color: #0ea5e9; }
        .mdp-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 13px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Sarabun', sans-serif; transition: all .15s; white-space: nowrap; }
        .mdp-btn-primary { background: #0ea5e9; border: 1px solid #0284c7; color: #fff; }
        .mdp-btn-primary:hover { background: #0284c7; }
        .mdp-btn-outline { background: #fff; border: 1px solid #e2e8f0; color: #475569; }
        .mdp-btn-outline:hover { border-color: #0ea5e9; color: #0ea5e9; background: #f0f9ff; }
        .mdp-btn:disabled { opacity: .5; cursor: not-allowed; }

        /* Table */
        .mdp-table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        .mdp-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .mdp-table thead th { background: #f8fafc; padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .05em; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .mdp-table tbody tr { border-bottom: 1px solid #f1f5f9; transition: background .1s; }
        .mdp-table tbody tr:last-child { border-bottom: none; }
        .mdp-table tbody tr:hover { background: #f8fafc; }
        .mdp-table td { padding: 10px 14px; color: #334155; vertical-align: middle; }
        .mdp-code { font-family: monospace; font-size: 11px; font-weight: 700; color: #0369a1; background: #f0f9ff; padding: 2px 7px; border-radius: 5px; }
        .mdp-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: 99px; font-size: 10px; font-weight: 700; }
        .mdp-badge-on { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .mdp-badge-off { background: #f8fafc; color: #94a3b8; border: 1px solid #e2e8f0; }
        .mdp-count { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 600; color: #475569; }
        .mdp-dot { width: 6px; height: 6px; border-radius: 50%; background: #0ea5e9; display: inline-block; }
        .mdp-desc { color: #64748b; font-size: 11px; max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mdp-action-btn { padding: 4px 8px; border: 1px solid; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer; font-family: 'Sarabun', sans-serif; transition: all .12s; }
        .mdp-edit { background: #f0f9ff; border-color: #bae6fd; color: #0369a1; }
        .mdp-edit:hover { background: #e0f2fe; }
        .mdp-del { background: #fff5f5; border-color: #fecaca; color: #dc2626; }
        .mdp-del:hover { background: #fee2e2; }
        .mdp-empty { padding: 40px; text-align: center; color: #94a3b8; font-size: 13px; }
        .mdp-loading { padding: 40px; text-align: center; color: #0ea5e9; }

        /* Form */
        .mdp-form-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
        .mdp-form-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; border-top: 1px solid #f1f5f9; }
        .mdp-label { font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px; }
        .mdp-input { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; font-size: 12px; font-family: 'Sarabun', sans-serif; outline: none; box-sizing: border-box; color: #334155; }
        .mdp-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,.1); }
        .mdp-select { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; font-size: 12px; font-family: 'Sarabun', sans-serif; outline: none; background: #fff; color: #334155; }
        .mdp-textarea { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; font-size: 12px; font-family: 'Sarabun', sans-serif; outline: none; box-sizing: border-box; resize: vertical; min-height: 72px; color: #334155; }
        .mdp-textarea:focus, .mdp-select:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,.1); }
        .mdp-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 8px 12px; font-size: 11px; color: #dc2626; }
        .mdp-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
        .mdp-toggle-lbl { font-size: 12px; color: #334155; font-weight: 500; }

        /* Delete confirm */
        .mdp-confirm { padding: 18px 20px; }
        .mdp-confirm-msg { font-size: 13px; color: #334155; margin-bottom: 6px; }
        .mdp-confirm-sub { font-size: 11px; color: #94a3b8; }
        .mdp-confirm-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; border-top: 1px solid #f1f5f9; }
      `}</style>

      <div className="mdp-root">
        {/* ── Header ── */}
        <div className="mdp-header">
          <div className="mdp-title-wrap">
            <div className="mdp-icon" style={{ background: `${accentColor}15`, border: `1.5px solid ${accentColor}30` }}>
              {icon}
            </div>
            <div>
              <div className="mdp-title">{title}</div>
              <div className="mdp-sub">{subtitle}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {importItems && (
              <button className="mdp-btn mdp-btn-outline" onClick={handleImport} disabled={importing}>
                {importing ? '⏳' : '🔄'} นำเข้าจากทรัพย์สิน
              </button>
            )}
            <button className="mdp-btn mdp-btn-primary" onClick={openCreate}>
              ＋ เพิ่ม{itemLabel}
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="mdp-stats">
          <div className="mdp-stat">
            <div style={{ fontSize: '22px' }}>📦</div>
            <div>
              <div className="mdp-stat-val" style={{ color: accentColor }}>{items.length}</div>
              <div className="mdp-stat-lbl">ทั้งหมด</div>
            </div>
          </div>
          <div className="mdp-stat">
            <div style={{ fontSize: '22px' }}>✅</div>
            <div>
              <div className="mdp-stat-val" style={{ color: '#16a34a' }}>{activeCount}</div>
              <div className="mdp-stat-lbl">ใช้งาน</div>
            </div>
          </div>
          {inactiveCount > 0 && (
            <div className="mdp-stat">
              <div style={{ fontSize: '22px' }}>🔒</div>
              <div>
                <div className="mdp-stat-val" style={{ color: '#94a3b8' }}>{inactiveCount}</div>
                <div className="mdp-stat-lbl">ปิดใช้งาน</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Toolbar ── */}
        <div className="mdp-toolbar">
          <input
            className="mdp-search"
            placeholder={`ค้นหา${itemLabel}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            แสดง {filtered.length}/{items.length}
          </span>
        </div>

        {/* ── Table ── */}
        <div className="mdp-table-wrap">
          {loading ? (
            <div className="mdp-loading">⏳ กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div className="mdp-empty">
              {search ? `ไม่พบ "${search}"` : `ยังไม่มี${itemLabel}`}<br />
              <span style={{ fontSize: '11px' }}>กดปุ่ม "+ เพิ่ม" เพื่อเพิ่มรายการใหม่</span>
            </div>
          ) : (
            <table className="mdp-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  {(isStatusPage || showCodeField) && <th>รหัส</th>}
                  <th>{itemLabel}</th>
                  {showCompanyField && <th>Company</th>}
                  <th>รายละเอียด</th>
                  <th>ทรัพย์สิน</th>
                  <th>สถานะ</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ color: '#cbd5e1', fontSize: '11px' }}>{idx + 1}</td>
                    {(isStatusPage || showCodeField) && (
                      <td><span className="mdp-code">{item.code || '—'}</span></td>
                    )}
                    <td>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</span>
                    </td>
                    {showCompanyField && (
                      <td><span style={{ fontSize: '11px', color: '#64748b' }}>{item.company || '—'}</span></td>
                    )}
                    <td><span className="mdp-desc">{item.description || <span style={{ color: '#d1d5db' }}>—</span>}</span></td>
                    <td>
                      {item.assetCount != null ? (
                        <span className="mdp-count">
                          <span className="mdp-dot" />
                          {item.assetCount} รายการ
                        </span>
                      ) : <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td>
                      <span className={`mdp-badge ${item.isActive !== false ? 'mdp-badge-on' : 'mdp-badge-off'}`}>
                        {item.isActive !== false ? '● ใช้งาน' : '○ ปิด'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <button className="mdp-action-btn mdp-edit" onClick={() => openEdit(item)}>✏️ แก้ไข</button>
                        <button className="mdp-action-btn mdp-del" onClick={() => setDeleteConfirm(item)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination hint ── */}
        {items.length > 0 && (
          <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '8px', textAlign: 'right' }}>
            {filtered.length} รายการ {search && `(กรอง "${search}")`}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingItem ? `✏️ แก้ไข${itemLabel}` : `➕ เพิ่ม${itemLabel}`}
      >
        <div className="mdp-form-body">
          {error && <div className="mdp-error">⚠️ {error}</div>}

          {isStatusPage && (
            <div>
              <div className="mdp-label">รหัสสถานะ *</div>
              <select
                className="mdp-select"
                value={form.code}
                onChange={e => {
                  const nextCode = e.target.value;
                  const opt = statusOptions?.find(s => s.code === nextCode);
                  setForm(p => ({ ...p, code: nextCode, name: p.name || opt?.name || '' }));
                }}
              >
                {statusOptions?.map(s => (
                  <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                ))}
              </select>
            </div>
          )}

          {showCodeField && !isStatusPage && (
            <div>
              <div className="mdp-label">รหัส</div>
              <input
                className="mdp-input"
                placeholder="รหัสแผนก (ไม่บังคับ)"
                value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
              />
            </div>
          )}

          <div>
            <div className="mdp-label">{itemLabel} *</div>
            <input
              autoFocus={!isStatusPage}
              className="mdp-input"
              placeholder={`ระบุ${itemLabel}`}
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && !isStatusPage && handleSave()}
            />
          </div>

          {showCompanyField && (
            <div>
              <div className="mdp-label">Company</div>
              <input
                className="mdp-input"
                placeholder="ชื่อบริษัท"
                value={form.company}
                onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
              />
            </div>
          )}

          <div>
            <div className="mdp-label">รายละเอียด</div>
            <textarea
              className="mdp-textarea"
              placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="mdp-toggle-row">
            <span className="mdp-toggle-lbl">เปิดใช้งาน</span>
            <Toggle checked={form.isActive} onChange={v => setForm(p => ({ ...p, isActive: v }))} />
          </div>
        </div>

        <div className="mdp-form-footer">
          <button className="mdp-btn mdp-btn-outline" onClick={() => setDialogOpen(false)}>ยกเลิก</button>
          <button
            className="mdp-btn mdp-btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ minWidth: '80px' }}
          >
            {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
          </button>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        open={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        title="🗑 ยืนยันการลบ"
      >
        <div className="mdp-confirm">
          <div className="mdp-confirm-msg">
            ต้องการลบ <strong>"{deleteConfirm?.name}"</strong> ใช่หรือไม่?
          </div>
          <div className="mdp-confirm-sub">
            การลบไม่สามารถย้อนกลับได้ และอาจกระทบข้อมูลทรัพย์สินที่เชื่อมอยู่
          </div>
        </div>
        <div className="mdp-confirm-footer">
          <button className="mdp-btn mdp-btn-outline" onClick={() => setDeleteConfirm(null)}>ยกเลิก</button>
          <button
            className="mdp-btn"
            style={{ background: '#ef4444', border: '1px solid #dc2626', color: '#fff' }}
            onClick={() => handleDelete(deleteConfirm)}
          >
            🗑 ลบเลย
          </button>
        </div>
      </Modal>

    </>
  );
}
