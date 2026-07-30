import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { pmSwHubTemplateService, PMSwHubTemplateItem, PMSwHubTemplate } from '../../services/pmSwHub';

const GROUP_OPTIONS = [
  { value: 'led_status', label: 'LED สถานะ (LED Status)' },
  { value: 'cleaning', label: 'ทำความสะอาด (Cleaning)' },
  { value: 'cable_conn', label: 'สายและ Connection (Cables and Connection)' },
  { value: 'f27_critical', label: 'F27 — Critical Systems' },
  { value: 'power', label: 'ระบบไฟฟ้าและ UPS (Power & UPS)' },
  { value: 'cooling', label: 'ระบบปรับอากาศ (Cooling & HVAC)' },
  { value: 'network', label: 'อุปกรณ์ Network (Switch / Router / Firewall)' },
  { value: 'server', label: 'เครื่องเซิร์ฟเวอร์ (Server & Storage)' },
  { value: 'rack_cable', label: 'ตู้ Rack และการจัดการสาย (Rack & Cabling)' },
  { value: 'security', label: 'ระบบรักษาความปลอดภัย (Security & Access Control)' },
  { value: 'fire', label: 'ระบบป้องกันอัคคีภัย (Fire Protection)' },
  { value: 'env', label: 'ความสะอาดและสภาพแวดล้อม (Environment)' },
  { value: 'other', label: 'อื่นๆ (Others)' },
];

const PRESETS = {
  '7': [
    { group: 'LED สถานะ (LED Status)', label: '🔴 FAULT / ALARM LED ดับทุกตัว (CRS317, Aruba, FortiGate)', key: 'led_fault_alarm', type: 'boolean', order: 1 },
    { group: 'LED สถานะ (LED Status)', label: '🔴 POWER LED ติดครบทุกตัว', key: 'led_power', type: 'boolean', order: 2 },
    { group: 'LED สถานะ (LED Status)', label: 'Port LED ผิดปกติ (Amber / ดับถาวร)', key: 'led_ports', type: 'boolean', order: 3 },
    { group: 'ทำความสะอาด (Cleaning)', label: 'เป่าฝุ่นช่อง Vent ทุกอุปกรณ์ (ระนาบ 10-15 ซม.)', key: 'cleaning_vent', type: 'boolean', order: 4 },
    { group: 'ทำความสะอาด (Cleaning)', label: 'เช็ดฝุ่นพื้น Rack และรอบตู้', key: 'cleaning_floor', type: 'boolean', order: 5 },
    { group: 'สายและ Connection (Cables and Connection)', label: 'Patch / Fiber เสียบแน่น คลิปล็อก (ไม่หักงอ)', key: 'cable_physical', type: 'boolean', order: 6 },
    { group: 'สายและ Connection (Cables and Connection)', label: 'Port ว่างมี Dust Cap (โดยเฉพาะ SFP+)', key: 'cable_dust_cap', type: 'boolean', order: 7 },
  ],
  '9': [
    { group: 'LED สถานะ (LED Status)', label: '🔴 FAULT / ALARM LED ดับทุกตัว (CRS317, Aruba, FortiGate)', key: 'led_fault_alarm', type: 'boolean', order: 1 },
    { group: 'LED สถานะ (LED Status)', label: '🔴 POWER LED ติดครบทุกตัว', key: 'led_power', type: 'boolean', order: 2 },
    { group: 'LED สถานะ (LED Status)', label: 'Port LED ผิดปกติ (Amber / ดับถาวร)', key: 'led_ports', type: 'boolean', order: 3 },
    { group: 'ทำความสะอาด (Cleaning)', label: 'เป่าฝุ่นช่อง Vent ทุกอุปกรณ์ (ระนาบ 10-15 ซม.)', key: 'cleaning_vent', type: 'boolean', order: 4 },
    { group: 'ทำความสะอาด (Cleaning)', label: 'เช็ดฝุ่นพื้น Rack และรอบตู้', key: 'cleaning_floor', type: 'boolean', order: 5 },
    { group: 'สายและ Connection (Cables and Connection)', label: 'Patch / Fiber เสียบแน่น คลิปล็อก (ไม่หักงอ)', key: 'cable_physical', type: 'boolean', order: 6 },
    { group: 'สายและ Connection (Cables and Connection)', label: 'Port ว่างมี Dust Cap (โดยเฉพาะ SFP+)', key: 'cable_dust_cap', type: 'boolean', order: 7 },
    { group: 'F27 — Critical Systems', label: '🔴 [F27] UPS APC — Online + Battery OK', key: 'f27_ups', type: 'boolean', order: 8 },
    { group: 'F27 — Critical Systems', label: '🔴 [F27] อุณหภูมิห้อง ≤ 24°C / แอร์ทำงานปกติ', key: 'f27_temp', type: 'boolean', order: 9 },
  ]
};

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  boolean: { label: 'ใช่ / ไม่ใช่ / N/A', icon: '☑️' },
  text:    { label: 'ข้อความ', icon: '📝' },
  rating:  { label: 'คะแนนดาว', icon: '⭐' },
  select:  { label: 'เลือกรายการ', icon: '📋' },
};

export default function PMSwHubTemplatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preset = searchParams.get('preset');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<PMSwHubTemplateItem[]>([]);

  useEffect(() => {
    loadTemplate();
  }, [id, preset]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      if (id && id !== 'new') {
        const data = await pmSwHubTemplateService.getById(Number(id));
        if (data) {
          setName(data.name);
          setDescription(data.description || '');
          setIsActive(data.isActive);
          setItems(data.items || []);
        }
      } else if (preset && (preset === '7' || preset === '9')) {
        setName(preset === '7' ? 'แบบมาตรฐาน (7 ข้อ)' : 'แบบเต็มรูปแบบ (9 ข้อ)');
        setItems(PRESETS[preset as keyof typeof PRESETS]);
      } else {
        setName('New Template');
        setItems([]);
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถโหลด Template ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    const newItem: PMSwHubTemplateItem = {
      group: '',
      key: `custom_${Date.now()}`,
      label: '',
      type: 'boolean',
      required: true,
      order: items.length + 1
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleChangeItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSave = async () => {
    if (!name.trim()) { alert('กรุณาระบุชื่อ Template'); return; }
    const invalid = items.find(i => !i.label.trim());
    if (invalid) { alert('กรุณาระบุชื่อรายการตรวจให้ครบทุกข้อ'); return; }

    try {
      setSaving(true);
      await pmSwHubTemplateService.save({
        id: id && id !== 'new' ? Number(id) : undefined,
        name,
        description,
        isActive,
        items
      });
      alert('บันทึก Template สำเร็จ');
      navigate('/pm/sw-hub/template');
    } catch (err) {
      console.error(err);
      alert('บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const location = useLocation();
  const isEdit = location.pathname.endsWith('/edit') || id === 'new';

  const moveItem = (idx: number, dir: number) => {
    if (!isEdit) return;
    if (idx + dir < 0 || idx + dir >= items.length) return;
    const newItems = [...items];
    const temp = newItems[idx];
    newItems[idx] = newItems[idx + dir];
    newItems[idx + dir] = temp;
    newItems.forEach((item, i) => { item.order = i + 1; });
    setItems(newItems);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#0ea5e9' }}>⏳ กำลังโหลด...</div>;
  }

  return (
    <>
      <style>{`
        .pmt-root { font-family: 'Sarabun', sans-serif; background: #f8fafc; min-height: 100vh; padding: 24px; }
        .pmt-btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 7px 14px; border-radius: 8px;
          font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s; border: 1px solid transparent; white-space: nowrap; }
        .pmt-btn-primary { background: #0ea5e9; border-color: #0284c7; color: #fff; }
        .pmt-btn-outline { background: #fff; border-color: #e2e8f0; color: #475569; }
        .pmt-btn-outline:hover { border-color: #0ea5e9; color: #0ea5e9; }
        .pmt-btn-success { background: #10b981; color: #fff; }
        .pmt-input { border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 10px;
          font-size: 12px; font-family: 'Sarabun', sans-serif; outline: none; color: #334155; background: #fff; }
        .pmt-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,.1); }
        .pmt-item-row { display: flex; gap: 6px; align-items: center; padding: 8px 10px; border: 1px solid #f1f5f9; border-radius: 8px; background: #fff; margin-bottom: 6px; }
        .pmt-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,.04); max-width: 950px; margin: 0 auto; }
        .preview-badge { background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; }
      `}</style>

      <div className="pmt-root">
        <div className="pmt-card">
          <div style={{ height: 4, background: isEdit ? '#0ea5e9' : '#10b981' }} />
          
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => navigate('/pm/sw-hub/template')}>←</span>
                  {isEdit ? (id && id !== 'new' ? '✏️ แก้ไข Template' : '➕ สร้าง Template ใหม่') : '🔍 Preview Template'}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {isEdit ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                    เปิดใช้งานเป็นหลัก
                  </label>
                ) : (
                  <button className="pmt-btn pmt-btn-outline" onClick={() => navigate(`/pm/sw-hub/template/${id}/edit`)}>
                    ✏️ เข้าสู่โหมดแก้ไข
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>ชื่อ Template</label>
                {isEdit ? (
                  <input className="pmt-input" style={{ width: '100%' }} value={name} onChange={e => setName(e.target.value)} placeholder="เช่น PM รายเดือน..." />
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{name}</div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>คำอธิบาย</label>
                {isEdit ? (
                  <input className="pmt-input" style={{ width: '100%' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="รายละเอียดเพิ่มเติม..." />
                ) : (
                  <div style={{ fontSize: 13, color: '#475569' }}>{description || '-'}</div>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>📑 รายการ Checklist ({items.length})</span>
                {isEdit && <button className="pmt-btn pmt-btn-success" onClick={handleAddItem}>＋ เพิ่มรายการ</button>}
              </div>

              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 10 }}>
                {items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>ไม่มีรายการตรวจสอบ</div>
                ) : (
                  items.map((item, index) => (
                    <div className="pmt-item-row" key={index}>
                      {isEdit && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                          <button onClick={() => moveItem(index, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 10 }}>▲</button>
                          <span style={{ fontSize: 10, color: '#cbd5e1', textAlign: 'center' }}>{index + 1}</span>
                          <button onClick={() => moveItem(index, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 10 }}>▼</button>
                        </div>
                      )}
                      
                      {isEdit ? (
                        <>
                          <input 
                            className="pmt-input"
                            style={{ width: 180, flexShrink: 0 }}
                            value={item.group}
                            onChange={(e) => handleChangeItem(index, 'group', e.target.value)}
                            placeholder="หมวดหมู่..."
                          />
                          <input 
                            className="pmt-input" 
                            style={{ flex: 1, minWidth: 150 }}
                            value={item.label}
                            onChange={(e) => handleChangeItem(index, 'label', e.target.value)}
                            placeholder="รายการตรวจสอบ..."
                          />
                          <select className="pmt-input" style={{ width: 130, flexShrink: 0, paddingRight: 20 }}
                            value={item.type || 'boolean'}
                            onChange={e => handleChangeItem(index, 'type', e.target.value)}
                          >
                            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                          </select>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569', cursor: 'pointer', flexShrink: 0 }}>
                            <input type="checkbox" checked={item.required || false} onChange={e => handleChangeItem(index, 'required', e.target.checked)} />
                            จำเป็น
                          </label>
                          <button onClick={() => handleRemoveItem(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, padding: '2px 6px' }}>🗑</button>
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '4px 0' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', minWidth: 20 }}>{index + 1}.</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>{item.group}</div>
                            <div style={{ fontSize: 13, color: '#1d1d1f' }}>{item.label}</div>
                          </div>
                          <div className="preview-badge">{TYPE_LABELS[item.type]?.label || item.type}</div>
                          {item.required && <span style={{ color: '#ef4444', fontSize: 12 }}>*</span>}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ padding: '16px 0 0', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="pmt-btn pmt-btn-outline" onClick={() => navigate('/pm/sw-hub/template')}>ย้อนกลับ</button>
              {isEdit && (
                <button className="pmt-btn pmt-btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก Template'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
