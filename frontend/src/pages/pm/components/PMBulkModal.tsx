import React, { useState, useEffect } from 'react';
import { pmAPI } from '../../../services/api';
import { Modal } from './Modal';
import { PMDeviceArrayInput } from './PMDeviceArrayInput';
import { DEFAULT_CHECKLIST, GROUP_INFO } from './constants';
import { StarRating } from './StarRating';

interface PMBulkModalProps {
  open: boolean;
  onClose: () => void;
  selectedRunIds: number[];
  runs: any[];
  onSuccess: () => void;
}

export const PMBulkModal: React.FC<PMBulkModalProps> = ({ open, onClose, selectedRunIds, runs, onSuccess }) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAnswers({});
    }
  }, [open]);

  if (selectedRunIds.length === 0) return null;

  const firstRun = runs.find((r) => r.id === selectedRunIds[0]);
  if (!firstRun) return null;

  const getChecklistItems = (run: any) => {
    const items = run?.plan?.template?.templateItems;
    if (items?.length > 0) return items;
    return DEFAULT_CHECKLIST;
  };

  const rawItems = getChecklistItems(firstRun);
  const GROUP_ORDER = ['user', 'os', 'security', 'agent', 'hardware', 'result', 'other'];
  const items = [...rawItems].sort((a: any, b: any) => {
    if (a.group !== b.group) {
      const idxA = GROUP_ORDER.indexOf(a.group);
      const idxB = GROUP_ORDER.indexOf(b.group);
      if (idxA === -1 && idxB === -1) return (a.group || '').localeCompare(b.group || '');
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    }
    return (a.order || 0) - (b.order || 0);
  });
  const groups = Array.from(new Set(items.map((i: any) => i.group)));

  const setAll = (val: string) => {
    const newAns = { ...answers };
    items
      .filter((i: any) => i.type?.toLowerCase() === 'boolean')
      .forEach((i: any) => (newAns[i.key] = val));
    setAnswers(newAns);
  };

  const handleBulkSave = async () => {
    const ipPhoneItem = items.find((i: any) => i.key === 'ip_phone');
    if (ipPhoneItem && answers['ip_phone'] === 'yes') {
      const ext = answers['ip_phone_note']?.trim();
      if (!ext) {
        alert('⚠️ เนื่องจากท่านเลือก "มี IP Phone" กรุณากรอกหมายเลขโทรศัพท์ภายใน (Extension Number) ในช่องด้านล่างข้อย่อยด้วยครับ');
        return;
      }
    }

    try {
      setSaving(true);
      const answerList = items
        .filter((item: any) => answers[item.key] !== undefined || answers[`${item.key}_note`] !== undefined)
        .map((item: any) => {
          let val = answers[item.key] !== undefined ? String(answers[item.key]) : '';
          if (answers[`${item.key}_note`]) {
            val = `${val}::${answers[`${item.key}_note`]}`;
          }
          return { itemId: item.id, key: item.key, value: val };
        });

      await pmAPI.bulkPerformRun({ runIds: selectedRunIds, answers: answerList });
      alert(`✅ บันทึกผล PM แบบกลุ่มสำเร็จทั้งหมด ${selectedRunIds.length} รายการ`);
      onClose();
      onSuccess();
    } catch (e: any) {
      alert('❌ บันทึกไม่สำเร็จ: ' + (e.response?.data?.error || e.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth={760}
      title={`🔧 บันทึก PM แบบกลุ่ม (${selectedRunIds.length} รายการ)`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '80vh' }}>
        {/* Alert banner */}
        <div style={{ background: '#fff9e6', borderBottom: '1px solid rgba(255,149,0,0.2)', padding: '12px 24px', fontSize: 12, color: '#d97706', fontWeight: 500, display: 'flex', gap: 8, alignItems: 'center' }}>
          ⚠️ ข้อความนี้จะถูกบันทึกไปยังรายการอุปกรณ์ที่เลือก {selectedRunIds.length} รายการ
          และสถานะจะเป็น 'เสร็จแล้ว (COMPLETED)' โดยอัตโนมัติ
        </div>

        {/* Quick Actions */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid #e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, gap: 12, background: '#f5f5f7' }}>
          <button type="button" className="pmr-btn pmr-btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setAll('yes')}>✓ ทำทั้งหมด (Yes)</button>
          <button type="button" className="pmr-btn pmr-btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setAnswers({})}>↺ ล้างข้อมูล</button>
        </div>

        {/* Checklist Scrollable Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#f5f5f7' }}>
          <div className="checklist-card">
            {groups.map((group: any) => {
              const groupItems = items.filter((i: any) => i.group === group);
              const gi = GROUP_INFO[group] || { label: group, icon: '📌' };
              return (
                <div key={group}>
                  <div className="check-group-title">{gi.icon} {gi.label}</div>
                  {groupItems.map((item: any) => (
                    <div key={item.key} className="check-item">
                      <div className="check-no">{items.indexOf(item) + 1}</div>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ fontSize: 13, color: '#1d1d1f', fontWeight: 500 }}>{item.label}</div>
                        {item.type?.toLowerCase() === 'text' && (
                          <textarea
                            style={{ width: '100%', border: '1px solid #d2d2d7', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontFamily: 'inherit', minHeight: 70, marginTop: 8, resize: 'vertical', outline: 'none' }}
                            placeholder={item.key === 'issue_note' ? 'ระบุข้อเสนอแนะหรือปัญหาที่พบ...' : 'ระบุรายละเอียด...'}
                            value={answers[item.key] || ''}
                            onChange={(e) => setAnswers((p) => ({ ...p, [item.key]: e.target.value }))}
                          />
                        )}
                        {item.type?.toLowerCase() === 'rating' && (
                          <div style={{ marginTop: 8 }}>
                            <StarRating value={parseInt(answers[item.key] || '0')} onChange={(v) => setAnswers((p) => ({ ...p, [item.key]: String(v) }))} />
                          </div>
                        )}
                        {['select', 'select_physical', 'select_speed', 'select_result'].includes(item.type?.toLowerCase()) && (
                          <div style={{ marginTop: 8 }}>
                            <select
                              style={{
                                width: '100%',
                                border: (['select_physical', 'select_result'].includes(item.type?.toLowerCase()) && (answers[item.key] === 'ชำรุดรอซ่อม' || answers[item.key] === 'ไม่ผ่านเกณฑ์')) ? '2px solid #ff3b30' : '1px solid #d2d2d7',
                                borderRadius: 8, padding: '10px 14px', fontSize: 12, fontFamily: 'inherit', outline: 'none',
                                background: (['select_physical', 'select_result'].includes(item.type?.toLowerCase()) && (answers[item.key] === 'ชำรุดรอซ่อม' || answers[item.key] === 'ไม่ผ่านเกณฑ์')) ? '#fff0f0' : '#fff',
                                appearance: 'none',
                                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2386868b\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
                                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                              }}
                              value={answers[item.key] || ''}
                              onChange={(e) => setAnswers((p) => ({ ...p, [item.key]: e.target.value }))}
                            >
                              <option value="">-- กรุณาเลือก --</option>
                              {item.type?.toLowerCase() === 'select_physical' && ['สภาพปกติ', 'ชำรุดเล็กน้อย', 'ชำรุดรอซ่อม', 'หมดสภาพ'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              {item.type?.toLowerCase() === 'select_speed' && ['เร็วปกติ', 'เริ่มหน่วงหนืด', 'ช้ามาก'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              {item.type?.toLowerCase() === 'select_result' && ['ผ่านเกณฑ์', 'แก้ไขเรียบร้อย', 'ไม่ผ่านเกณฑ์'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              {item.type?.toLowerCase() === 'select' && item.options?.split(',').map((opt: string) => opt.trim()).filter(Boolean).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                        )}
                        {item.type?.toLowerCase() === 'monitor_array' && (
                          <div style={{ marginTop: 8 }}>
                            <PMDeviceArrayInput
                              type="monitor"
                              value={answers[item.key] || ''}
                              onChange={(v) => setAnswers((p) => ({ ...p, [item.key]: v }))}
                              parentAsset={firstRun?.asset}
                            />
                          </div>
                        )}
                        {item.type?.toLowerCase() === 'printer_array' && (
                          <div style={{ marginTop: 8 }}>
                            <PMDeviceArrayInput
                              type="printer"
                              value={answers[item.key] || ''}
                              onChange={(v) => setAnswers((p) => ({ ...p, [item.key]: v }))}
                              parentAsset={firstRun?.asset}
                            />
                          </div>
                        )}
                      </div>
                      {item.type?.toLowerCase() === 'boolean' && (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {[
                            { val: 'yes', lbl: '✓ ใช่' },
                            { val: 'no', lbl: '✗ ไม่' },
                            { val: 'na', lbl: '— N/A' },
                          ].map((opt) => (
                            <button
                              key={opt.val}
                              type="button"
                              className={`pmr-radio ${answers[item.key] === opt.val ? `sel-${opt.val}` : ''}`}
                              onClick={() => setAnswers((p) => ({ ...p, [item.key]: opt.val }))}
                            >
                              {opt.lbl}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Inline Note for No/NA */}
                      {item.type?.toLowerCase() === 'boolean' && (answers[item.key] === 'no' || answers[item.key] === 'na') && (
                        <div style={{ width: '100%', paddingLeft: 38, marginTop: 6 }}>
                          <input
                            type="text"
                            style={{ width: '100%', border: '1px solid #ff9500', borderRadius: 6, padding: '8px 12px', fontSize: 12, background: '#fffbeb', outline: 'none', fontFamily: 'inherit' }}
                            placeholder="ระบุสาเหตุประกอบการเลือกไม่ใช่หรือไม่ระบุ..."
                            value={answers[`${item.key}_note`] || ''}
                            onChange={(e) => setAnswers((p) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
                          />
                        </div>
                      )}
                      
                      {/* Green Box for IP Phone (Yes) */}
                      {item.type?.toLowerCase() === 'boolean' && item.key === 'ip_phone' && answers[item.key] === 'yes' && (
                        <div style={{ width: '100%', paddingLeft: 38, marginTop: 6 }}>
                          <div style={{ background: '#eaf6ed', border: '1px solid rgba(52, 199, 89, 0.4)', borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 10, color: '#1c873b', fontWeight: 600 }}>📞 ระบุหมายเลขโทรศัพท์ภายใน (Extension Number)</label>
                            <input
                              type="text"
                              style={{ width: '100%', border: '1px solid #34c759', borderRadius: 6, padding: '6px 10px', fontSize: 12, background: '#fff', outline: 'none', fontFamily: 'inherit', color: '#1d1d1f' }}
                              placeholder="ตัวอย่าง: 1035, 1036..."
                              value={answers[`${item.key}_note`] || ''}
                              onChange={(e) => setAnswers((p) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
                            />
                          </div>
                        </div>
                      )}
                      {['select_physical', 'select_result'].includes(item.type?.toLowerCase()) && (answers[item.key] === 'ชำรุดรอซ่อม' || answers[item.key] === 'ไม่ผ่านเกณฑ์') && (
                        <div style={{ width: '100%', paddingLeft: 38, marginTop: 6 }}>
                          <input
                            type="text"
                            style={{ width: '100%', border: '1px solid #ff9500', borderRadius: 6, padding: '8px 12px', fontSize: 12, background: '#fffbeb', outline: 'none', fontFamily: 'inherit' }}
                            placeholder={item.type?.toLowerCase() === 'select_physical' ? "ระบุสาเหตุที่ชำรุด / อาการ..." : "ระบุเหตุผลที่ไม่ผ่านเกณฑ์..."}
                            value={answers[`${item.key}_note`] || ''}
                            onChange={(e) => setAnswers((p) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e5ea', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fff', flexShrink: 0 }}>
          <button type="button" className="pmr-btn pmr-btn-outline" onClick={onClose}>ปิด</button>
          <button type="button" className="pmr-btn pmr-btn-primary" onClick={handleBulkSave} disabled={saving}>
            {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึกผล PM ทั้งหมด'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
