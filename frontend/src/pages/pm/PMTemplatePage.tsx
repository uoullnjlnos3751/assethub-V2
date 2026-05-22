import React, { useEffect, useState } from 'react';
import { pmAPI } from '../../services/api';

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */
type ItemType = 'boolean' | 'text' | 'rating' | 'select';

interface TemplateItem {
  id?: number;
  key: string;
  label: string;
  type: ItemType;
  group: string;
  required: boolean;
  options?: string; // for select type
  order: number;
}

interface Template {
  id?: number;
  name: string;
  description: string;
  templateItems: TemplateItem[];
}

const TYPE_LABELS: Record<ItemType, { label: string; icon: string; desc: string }> = {
  boolean: { label: 'ใช่ / ไม่ใช่ / N/A', icon: '☑️', desc: 'ตอบ Yes / No / N/A' },
  text:    { label: 'ข้อความ', icon: '📝', desc: 'กรอกข้อความอิสระ' },
  rating:  { label: 'คะแนนดาว', icon: '⭐', desc: 'ให้คะแนน 1–5 ดาว' },
  select:  { label: 'เลือกรายการ', icon: '📋', desc: 'Dropdown เลือกรายการ' },
};

const DEFAULT_GROUPS = ['user', 'os', 'security', 'agent', 'hardware', 'result', 'other'];
const GROUP_LABELS: Record<string, string> = {
  user: '👤 ข้อมูลผู้ใช้', os: '🪟 OS & Software', security: '🔒 ความปลอดภัย',
  agent: '🛠 Agent/Tools', hardware: '🖥 Hardware', result: '⭐ ผลประเมิน', other: '📌 อื่นๆ',
};

const DEFAULT_ITEMS: TemplateItem[] = [
  { key: 'computer_name', label: 'ตรวจสอบ Computer Name', type: 'boolean', group: 'user', required: true, order: 1 },
  { key: 'change_name', label: 'เปลี่ยน Computer Name (ถ้าไม่ตรงมาตรฐาน)', type: 'boolean', group: 'user', required: false, order: 2 },
  { key: 'ip_phone', label: 'ตรวจสอบ IP Phone', type: 'boolean', group: 'user', required: false, order: 3 },
  { key: 'windows_version', label: 'ตรวจสอบ Windows Version & Activate', type: 'boolean', group: 'os', required: true, order: 4 },
  { key: 'windows_update', label: 'ตรวจสอบ Windows Update (winver)', type: 'boolean', group: 'os', required: true, order: 5 },
  { key: 'office_check', label: 'ตรวจสอบ Microsoft Office & Activate', type: 'boolean', group: 'os', required: true, order: 6 },
  { key: 'antivirus', label: 'อัปเดต Antivirus', type: 'boolean', group: 'os', required: true, order: 7 },
  { key: 'change_password', label: 'เปลี่ยน Password Local Admin', type: 'boolean', group: 'security', required: true, order: 8 },
  { key: 'usb_policy', label: 'ตรวจสอบ USB Policy', type: 'boolean', group: 'security', required: true, order: 9 },
  { key: 'glpi_agent', label: 'ติดตั้ง GLPI Agent v1.6/1.7', type: 'boolean', group: 'agent', required: true, order: 10 },
  { key: 'spiceworks', label: 'ติดตั้ง Spiceworks Agent', type: 'boolean', group: 'agent', required: false, order: 11 },
  { key: 'pc_audit', label: 'PC Audit (Hardware spec)', type: 'boolean', group: 'agent', required: true, order: 12 },
  { key: 'hw_info', label: 'HW Info (Serial, Service Tag)', type: 'boolean', group: 'agent', required: true, order: 13 },
  { key: 'cleaning', label: 'ทำความสะอาดอุปกรณ์', type: 'boolean', group: 'hardware', required: true, order: 14 },
  { key: 'printer', label: 'ตรวจสอบ Printer Local', type: 'boolean', group: 'hardware', required: false, order: 15 },
  { key: 'ups', label: 'ตรวจสอบ UPS', type: 'boolean', group: 'hardware', required: false, order: 16 },
  { key: 'monitor', label: 'ตรวจสอบจอ Monitor (1 & 2)', type: 'boolean', group: 'hardware', required: false, order: 17 },
  { key: 'issue_note', label: 'ปัญหาที่พบ / ข้อเสนอแนะ', type: 'text', group: 'result', required: false, order: 18 },
  { key: 'satisfaction', label: 'ความพึงพอใจผู้ใช้ (1–5 ดาว)', type: 'rating', group: 'result', required: false, order: 19 },
  { key: 'staff_name', label: 'เจ้าหน้าที่ผู้ทำ PM', type: 'text', group: 'result', required: true, order: 20 },
];

/* ─────────────────────────────────────────────────────────────
   Modal
───────────────────────────────────────────────────────────────── */
function Modal({ open, onClose, title, children, maxWidth = 600 }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: number;
}) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth, boxShadow: '0 20px 60px rgba(0,0,0,.2)', overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8', padding: '2px 6px' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────── */
export default function PMTemplatePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [templateModal, setTemplateModal] = useState<{ open: boolean; template: Template | null }>({ open: false, template: null });
  const [editingTemplate, setEditingTemplate] = useState<Template>({ name: '', description: '', templateItems: [] });
  const [previewModal, setPreviewModal] = useState<{ open: boolean; template: Template | null }>({ open: false, template: null });
  const [deleteConfirm, setDeleteConfirm] = useState<Template | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const fetchTemplates = () => {
    setLoading(true);
    pmAPI.templates().then(res => setTemplates(res.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchTemplates(); }, []);

  /* ── Open create ── */
  const openCreate = () => {
    setEditingTemplate({ name: '', description: '', templateItems: DEFAULT_ITEMS.map((i, idx) => ({ ...i, order: idx + 1 })) });
    setTemplateModal({ open: true, template: null });
  };

  /* ── Open edit ── */
  const openEdit = (t: Template) => {
    setEditingTemplate({ ...t, templateItems: [...(t.templateItems || [])] });
    setTemplateModal({ open: true, template: t });
  };

  const handleSave = async () => {
    if (!editingTemplate.name.trim()) { showToast('⚠️ กรุณาระบุชื่อ Template'); return; }
    if (editingTemplate.templateItems.length === 0) { showToast('⚠️ ต้องมีรายการ Checklist อย่างน้อย 1 ข้อ'); return; }
    setSaving(true);
    try {
      const payload = {
        name: editingTemplate.name.trim(),
        description: editingTemplate.description?.trim() || '',
        items: editingTemplate.templateItems.map((item, idx) => ({
          ...item,
          order: idx + 1,
        })),
      };

      const isEdit = Boolean(templateModal.template?.id);
      if (isEdit) {
        // PUT — update existing template
        await pmAPI.updateTemplate(templateModal.template!.id!, payload);
        showToast(`✅ อัปเดต Template "${editingTemplate.name}" สำเร็จ`);
      } else {
        // POST — create new template
        await pmAPI.createTemplate(payload);
        showToast(`✅ สร้าง Template "${editingTemplate.name}" สำเร็จ`);
      }

      setTemplateModal({ open: false, template: null });
      fetchTemplates();
    } catch (err: any) {
      showToast(`❌ ${err.response?.data?.error || err.message || 'บันทึกไม่สำเร็จ'}`);
    } finally { setSaving(false); }
  };


  /* ── Item management ── */
  const addItem = () => {
    const newItem: TemplateItem = {
      key: `item_${Date.now()}`, label: '', type: 'boolean', group: 'other', required: false,
      order: editingTemplate.templateItems.length + 1,
    };
    setEditingTemplate(p => ({ ...p, templateItems: [...p.templateItems, newItem] }));
  };

  const updateItem = (idx: number, field: keyof TemplateItem, val: any) => {
    setEditingTemplate(p => {
      const items = [...p.templateItems];
      items[idx] = { ...items[idx], [field]: val };
      return { ...p, templateItems: items };
    });
  };

  const removeItem = (idx: number) => {
    setEditingTemplate(p => ({ ...p, templateItems: p.templateItems.filter((_, i) => i !== idx) }));
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= editingTemplate.templateItems.length) return;
    setEditingTemplate(p => {
      const items = [...p.templateItems];
      [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
      return { ...p, templateItems: items };
    });
  };

  /* ── Load default ── */
  const loadDefaults = () => {
    setEditingTemplate(p => ({ ...p, templateItems: DEFAULT_ITEMS.map((i, idx) => ({ ...i, order: idx + 1 })) }));
    showToast('📋 โหลด Template มาตรฐาน IT PM 20 ข้อสำเร็จ');
  };

  return (
    <>
      <style>{`
        .pmt-root { font-family: 'Sarabun', sans-serif; }
        .pmt-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 8px;
          font-size: 12px; z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,.2);
          animation: pmtFadeUp .2s ease; pointer-events: none; }
        @keyframes pmtFadeUp { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .pmt-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 8px;
          font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Sarabun', sans-serif;
          transition: all .15s; border: 1px solid transparent; white-space: nowrap; }
        .pmt-btn-primary { background: #0ea5e9; border-color: #0284c7; color: #fff; }
        .pmt-btn-primary:hover { background: #0284c7; }
        .pmt-btn-outline { background: #fff; border-color: #e2e8f0; color: #475569; }
        .pmt-btn-outline:hover { border-color: #0ea5e9; color: #0ea5e9; }
        .pmt-btn-success { background: #10b981; border-color: #059669; color: #fff; }
        .pmt-btn-danger { background: #fff5f5; border-color: #fecaca; color: #dc2626; }
        .pmt-btn:disabled { opacity: .5; cursor: not-allowed; }
        .pmt-input { border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 10px;
          font-size: 12px; font-family: 'Sarabun', sans-serif; outline: none; color: #334155; background: #fff; }
        .pmt-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,.1); }
        .pmt-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 8px center; padding-right: 26px; cursor: pointer; }
        .pmt-item-row { display: flex; gap: 6px; align-items: center; padding: 8px 10px; border: 1px solid #f1f5f9; border-radius: 8px; background: #fff; margin-bottom: 6px; transition: border-color .15s; }
        .pmt-item-row:hover { border-color: #e2e8f0; }
        .pmt-label { font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 3px; display: block; }
        .pmt-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; transition: box-shadow .15s; }
        .pmt-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }
      `}</style>

      <div className="pmt-root">

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef9c3', border: '1.5px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📝</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>PM Template (Checklist)</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>สร้างและจัดการรายการตรวจสอบ PM แบบ Customize</div>
            </div>
          </div>
          <button className="pmt-btn pmt-btn-primary" onClick={openCreate}>＋ สร้าง Template ใหม่</button>
        </div>

        {/* ── Template list ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#0ea5e9' }}>⏳ กำลังโหลด...</div>
        ) : templates.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>ยังไม่มี PM Template</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, marginBottom: 20 }}>สร้าง Template แรกพร้อม Checklist 20 ข้อมาตรฐาน IT PM</div>
            <button className="pmt-btn pmt-btn-primary" onClick={openCreate}>＋ สร้าง Template ใหม่</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
            {templates.map((t: any) => {
              const itemCount = t.templateItems?.length || 0;
              const boolCount = t.templateItems?.filter((i: any) => i.type === 'boolean').length || 0;
              return (
                <div className="pmt-card" key={t.id}>
                  <div style={{ height: 4, background: '#0ea5e9' }} />
                  <div style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{t.description || 'ไม่มีคำอธิบาย'}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', whiteSpace: 'nowrap' }}>
                        {itemCount} ข้อ
                      </span>
                    </div>

                    {/* Item type summary */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                      {Object.entries(TYPE_LABELS).map(([type, info]) => {
                        const count = t.templateItems?.filter((i: any) => i.type === type).length || 0;
                        if (count === 0) return null;
                        return (
                          <span key={type} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>
                            {info.icon} {count} {info.label}
                          </span>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="pmt-btn pmt-btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                        onClick={() => setPreviewModal({ open: true, template: t })}>
                        👁 Preview
                      </button>
                      <button className="pmt-btn pmt-btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                        onClick={() => openEdit(t)}>
                        ✏️ แก้ไข
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create / Edit Template Modal ── */}
      <Modal open={templateModal.open} onClose={() => setTemplateModal({ open: false, template: null })} maxWidth={780}
        title={templateModal.template ? `✏️ แก้ไข Template: ${templateModal.template.name}` : '➕ สร้าง PM Template ใหม่'}
      >
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Name & Description */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="pmt-label">ชื่อ Template *</label>
              <input className="pmt-input" style={{ width: '100%', boxSizing: 'border-box' }}
                placeholder="เช่น IT PM Standard 2568"
                value={editingTemplate.name}
                onChange={e => setEditingTemplate(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="pmt-label">คำอธิบาย</label>
              <input className="pmt-input" style={{ width: '100%', boxSizing: 'border-box' }}
                placeholder="คำอธิบายสั้นๆ"
                value={editingTemplate.description}
                onChange={e => setEditingTemplate(p => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>รายการ Checklist</span>
              <span style={{ fontSize: 10, background: '#f0f9ff', color: '#0369a1', padding: '2px 8px', borderRadius: 99, border: '1px solid #bae6fd', fontWeight: 700 }}>
                {editingTemplate.templateItems.length} ข้อ
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="pmt-btn pmt-btn-outline" style={{ fontSize: 11 }} onClick={loadDefaults}>
                📋 โหลด Template มาตรฐาน
              </button>
              <button className="pmt-btn pmt-btn-success" style={{ fontSize: 11 }} onClick={addItem}>
                ＋ เพิ่มรายการ
              </button>
            </div>
          </div>

          {/* Items list */}
          <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 2 }}>
            {editingTemplate.templateItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 12 }}>
                กด "+ เพิ่มรายการ" หรือ "โหลด Template มาตรฐาน" เพื่อเริ่มต้น
              </div>
            ) : (
              editingTemplate.templateItems.map((item, idx) => (
                <div className="pmt-item-row" key={idx}>
                  {/* Order controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => moveItem(idx, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 10, padding: '1px 4px', lineHeight: 1 }}>▲</button>
                    <span style={{ fontSize: 10, color: '#cbd5e1', textAlign: 'center', width: 20 }}>{idx + 1}</span>
                    <button onClick={() => moveItem(idx, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 10, padding: '1px 4px', lineHeight: 1 }}>▼</button>
                  </div>

                  {/* Label */}
                  <input className="pmt-input" style={{ flex: 1, minWidth: 120 }}
                    placeholder="รายการตรวจสอบ..."
                    value={item.label}
                    onChange={e => updateItem(idx, 'label', e.target.value)}
                  />

                  {/* Type */}
                  <select className="pmt-input pmt-select" style={{ width: 130 }}
                    value={item.type}
                    onChange={e => updateItem(idx, 'type', e.target.value as ItemType)}
                  >
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>

                  {/* Group */}
                  <select className="pmt-input pmt-select" style={{ width: 120 }}
                    value={item.group}
                    onChange={e => updateItem(idx, 'group', e.target.value)}
                  >
                    {DEFAULT_GROUPS.map(g => <option key={g} value={g}>{GROUP_LABELS[g]?.replace(/^[^\s]+ /, '') || g}</option>)}
                  </select>

                  {/* Required */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569', cursor: 'pointer', flexShrink: 0 }}>
                    <input type="checkbox" checked={item.required} onChange={e => updateItem(idx, 'required', e.target.checked)} style={{ cursor: 'pointer' }} />
                    จำเป็น
                  </label>

                  {/* Delete */}
                  <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, padding: '2px 6px', flexShrink: 0 }}>🗑</button>
                </div>
              ))
            )}
          </div>

          {/* Summary */}
          {editingTemplate.templateItems.length > 0 && (
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {Object.entries(TYPE_LABELS).map(([type, info]) => {
                const count = editingTemplate.templateItems.filter(i => i.type === type).length;
                if (count === 0) return null;
                return <span key={type} style={{ fontSize: 11, color: '#475569' }}>{info.icon} {info.label}: <strong>{count}</strong></span>;
              })}
              <span style={{ fontSize: 11, color: '#ef4444' }}>
                🔴 จำเป็น: <strong>{editingTemplate.templateItems.filter(i => i.required).length}</strong>
              </span>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button className="pmt-btn pmt-btn-outline" onClick={() => setTemplateModal({ open: false, template: null })}>ยกเลิก</button>
          <button className="pmt-btn pmt-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ กำลังบันทึก...' : templateModal.template?.id ? '💾 อัปเดต Template' : '💾 บันทึก Template'}
          </button>
        </div>
      </Modal>

      {/* ── Preview Modal ── */}
      <Modal open={previewModal.open} onClose={() => setPreviewModal({ open: false, template: null })} maxWidth={580}
        title={`👁 Preview: ${previewModal.template?.name || ''}`}
      >
        <div style={{ padding: '12px 20px' }}>
          {previewModal.template?.templateItems?.map((item: any, idx: number) => {
            const gi = GROUP_LABELS[item.group] || item.group;
            const showGroupHeader = idx === 0 || previewModal.template!.templateItems![idx - 1]?.group !== item.group;
            return (
              <div key={idx}>
                {showGroupHeader && (
                  <div style={{ padding: '8px 0 4px', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none', marginTop: idx > 0 ? 8 : 0 }}>
                    {gi}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ fontSize: 10, color: '#cbd5e1', width: 22, flexShrink: 0, textAlign: 'center', fontWeight: 700 }}>{idx + 1}</span>
                  <span style={{ flex: 1, fontSize: 12, color: '#334155' }}>{item.label} {item.required && <span style={{ color: '#ef4444' }}>*</span>}</span>
                  <span style={{ fontSize: 10, background: '#f8fafc', padding: '2px 8px', borderRadius: 5, color: '#64748b', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                    {TYPE_LABELS[item.type as ItemType]?.icon} {TYPE_LABELS[item.type as ItemType]?.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="pmt-btn pmt-btn-outline" onClick={() => setPreviewModal({ open: false, template: null })}>ปิด</button>
        </div>
      </Modal>

      {toast && <div className="pmt-toast">{toast}</div>}
    </>
  );
}
