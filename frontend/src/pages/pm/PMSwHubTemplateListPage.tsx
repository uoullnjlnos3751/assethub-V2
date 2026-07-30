import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pmSwHubTemplateService, PMSwHubTemplate } from '../../services/pmSwHub';

export default function PMSwHubTemplateListPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<PMSwHubTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await pmSwHubTemplateService.getAll();
      setTemplates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('ยืนยันการลบ Template นี้?')) return;
    try {
      await pmSwHubTemplateService.delete(id);
      loadTemplates();
    } catch (err) {
      alert('ลบไม่สำเร็จ');
    }
  };

  const handleCreate = (type: '7' | '9') => {
    navigate(`/pm/sw-hub/template/new?preset=${type}`);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#0ea5e9' }}>⏳ กำลังโหลด...</div>;
  }

  return (
    <>
      <style>{`
        .ptl-root { font-family: 'Sarabun', sans-serif; padding: 24px; max-width: 1000px; margin: 0 auto; }
        .ptl-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; transition: box-shadow .15s; }
        .ptl-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.06); }
        .ptl-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all .2s; }
        .ptl-btn-primary { background: #0ea5e9; color: #fff; }
        .ptl-btn-outline { background: #fff; border-color: #e2e8f0; color: #475569; }
        .ptl-btn-outline:hover { border-color: #0ea5e9; color: #0ea5e9; }
        .ptl-badge { padding: 2px 8px; borderRadius: 99px; font-size: 10px; font-weight: 700; }
        
        .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: #fff; border-radius: 16px; padding: 24px; width: 400px; box-shadow: 0 20px 50px rgba(0,0,0,.15); }
        .preset-opt { border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 16px; cursor: pointer; transition: all .2s; display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .preset-opt:hover { border-color: #0ea5e9; background: #f0f9ff; }
      `}</style>

      <div className="ptl-root">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>📋 PM Template (Checklist)</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>สร้างและจัดการรายการตรวจสอบ PM แบบ Customize</p>
          </div>
          <button className="ptl-btn ptl-btn-primary" onClick={() => setShowCreateModal(true)}>
            ＋ สร้าง Template ใหม่
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {templates.map(t => (
            <div className="ptl-card" key={t.id}>
              <div style={{ height: 4, background: t.isActive ? '#10b981' : '#cbd5e1' }} />
              <div style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{t.name}</div>
                  {t.isActive && <span style={{ fontSize: 10, background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 99, border: '1px solid #bbf7d0' }}>ใช้งานอยู่</span>}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16, minHeight: 36 }}>{t.description || 'ไม่มีคำอธิบาย'}</div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <div style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 16 }}>📑</span> {(t as any)._count?.items || 0} ข้อ
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 16 }}>🔘</span> 1 ใช่ / ไม่ใช่ / N/A
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="ptl-btn ptl-btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate(`/pm/sw-hub/template/${t.id}`)}>
                    🔍 Preview
                  </button>
                  <button className="ptl-btn ptl-btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate(`/pm/sw-hub/template/${t.id}/edit`)}>
                    ✏️ แก้ไข
                  </button>
                  {!t.isActive && (
                    <button className="ptl-btn ptl-btn-outline" style={{ color: '#ef4444' }} onClick={() => handleDelete(t.id)}>
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>เลือกรูปแบบ Template</h3>
              
              <div className="preset-opt" onClick={() => handleCreate('7')}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📄</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>แบบมาตรฐาน (7 ข้อ)</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>รายการตรวจสอบพื้นฐานสำหรับ Hub Room</div>
                </div>
              </div>

              <div className="preset-opt" onClick={() => handleCreate('9')}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📜</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>แบบเต็มรูปแบบ (9 ข้อ)</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>เพิ่มรายการตรวจสอบระบบวิกฤต (TRR Standard)</div>
                </div>
              </div>

              <div style={{ textAlign: 'right', marginTop: 12 }}>
                <button className="ptl-btn ptl-btn-outline" onClick={() => setShowCreateModal(false)}>ยกเลิก</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
