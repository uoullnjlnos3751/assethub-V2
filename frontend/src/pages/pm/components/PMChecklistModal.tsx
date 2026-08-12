import React, { useState, useEffect } from 'react';
import { pmAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import { Modal } from './Modal';
import { PMDeviceArrayInput } from './PMDeviceArrayInput';
import { DEFAULT_CHECKLIST, GROUP_INFO } from './constants';
import { StarRating } from './StarRating';
import imageCompression from 'browser-image-compression';
import { getRatingCategory, RATING_RUBRIC, suggestRating } from './pmRatingRubric';

interface PMChecklistModalProps {
  open: boolean;
  onClose: () => void;
  run: any;
  onSuccess: () => void;
}

export const PMChecklistModal: React.FC<PMChecklistModalProps> = ({ open, onClose, run, onSuccess }) => {
  const { user } = useAuth();
  const [answers, setAnswersState] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fetchingGLPI, setFetchingGLPI] = useState(false);
  const [glpiSpec, setGlpiSpec] = useState<any>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const setAnswers = (val: any) => {
    setIsDirty(true);
    setAnswersState(val);
  };

  useEffect(() => {
    if (run) {
      setPhotoUrl(run.photoUrl || null);
      setIsDirty(false);
      const draftKey = `pm_draft_${run.id}`;
      const draft = localStorage.getItem(draftKey);
      let draftAnswers: Record<string, any> | null = null;

      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            draftAnswers = parsed;
          }
        } catch (e) {
          draftAnswers = null;
        }
      }

      const dbAnswers: Record<string, any> = {};
      (run.answers || []).forEach((a: any) => {
        if (a.value && a.value.includes('::')) {
          const idx = a.value.indexOf('::');
          dbAnswers[a.item?.key || a.itemId] = a.value.slice(0, idx);
          dbAnswers[`${a.item?.key || a.itemId}_note`] = a.value.slice(idx + 2);
        } else if (a.value) {
          dbAnswers[a.item?.key || a.itemId] = a.value;
        }
      });

      // Auto-fill staff name if not set
      if (!dbAnswers['staff_name']) {
        dbAnswers['staff_name'] = user?.displayName || user?.adUsername || '';
      }

      // Debug: log what we loaded
      console.log(`[PMChecklistModal] run.id=${run.id} status=${run.status}`);
      console.log(`[PMChecklistModal] run.answers count: ${(run.answers || []).length}`);
      console.log(`[PMChecklistModal] dbAnswers keys:`, Object.keys(dbAnswers));
      console.log(`[PMChecklistModal] dbAnswers sample:`, JSON.stringify(dbAnswers).substring(0, 300));

      // Use draft answers only for active/in-progress runs and when the draft contains data.
      if (draftAnswers && run.status !== 'COMPLETED') {
        setAnswersState(draftAnswers);
      } else {
        setAnswersState(dbAnswers);
        if (draft && run.status === 'COMPLETED') {
          localStorage.removeItem(draftKey);
        }
      }

      setGlpiSpec(null);
    } else {
      setAnswersState({});
      setPhotoUrl(null);
      setIsDirty(false);
    }
  }, [run, open]);

  useEffect(() => {
    if (isDirty && run?.id && Object.keys(answers).length > 0) {
      localStorage.setItem(`pm_draft_${run.id}`, JSON.stringify(answers));
    }
  }, [answers, run?.id, isDirty]);

  if (!run) return null;

  const getChecklistItems = () => {
    const items = run?.plan?.template?.templateItems;
    if (items?.length > 0) return items;
    return DEFAULT_CHECKLIST;
  };

  const formatAnswerValue = (item: any) => {
    const raw = answers[item.key];
    const note = answers[`${item.key}_note`];
    if (!raw && !note) return '—';

    if (['monitor_array', 'printer_array'].includes(item.type?.toLowerCase())) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) {
          return parsed
            .map((device: any, index: number) => {
              const codePart = device.assetCode ? `[${device.assetCode}] ` : '';
              const snPart = device.serialNo ? ` S/N: ${device.serialNo}` : '';
              return `${index + 1}. ${codePart}${device.company || ''} ${device.brand || ''} ${device.model || ''}${snPart}`.trim();
            })
            .filter(Boolean)
            .join(' / ');
        }
      } catch (e) {
        return raw || '—';
      }
      return raw || '—';
    }

    const base = raw !== undefined && raw !== null && raw !== '' ? String(raw) : '—';
    if (note) {
      return `${base} (${String(note)})`;
    }
    return base;
  };

  const renderReadonlyAnswer = (item: any) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{item.label}</div>
        <div style={{
          padding: '14px 18px',
          borderRadius: 12,
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          color: '#334155',
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {formatAnswerValue(item)}
        </div>
      </div>
    );
  };

  const rawItems = getChecklistItems();
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
  const isDoneRun = run.status === 'COMPLETED';

  const boolItems = items.filter((i: any) => i.type?.toLowerCase() === 'boolean');
  const answeredBool = boolItems.filter((i: any) => answers[i.key] !== undefined).length;
  const checkPct = boolItems.length > 0 ? Math.round((answeredBool / boolItems.length) * 100) : 0;

  const setAll = (val: string) => {
    setIsDirty(true);
    const newAns = { ...answers };
    items
      .filter((i: any) => i.type?.toLowerCase() === 'boolean')
      .forEach((i: any) => (newAns[i.key] = val));
    setAnswers(newAns);
  };

  const fetchGLPI = async (runId: number) => {
    try {
      setFetchingGLPI(true);
      // Fixed: use correct method name 'getGLPISpec' (not 'fetchGLPISpec')
      const res = await pmAPI.getGLPISpec(runId);
      // Fixed: backend returns spec directly as res.data (not wrapped in { spec: ... })
      if (res.data) {
        const spec = res.data;
        setGlpiSpec(spec);
        const newAns = { ...answers };
        if (spec.cpu) newAns['pc_audit'] = 'yes';
        if (spec.ram) newAns['hw_info'] = 'yes';

        // Auto-fill OS data
        if (spec.os) {
          newAns['windows_version'] = 'yes';
          newAns['windows_version_note'] = spec.os;
        }

        // Auto-fill Windows Update / OS Build
        if (spec.os) {
          newAns['windows_update'] = 'yes';
          // Try to extract build info: "22H2", "Build 19045" etc.
          const buildMatch = spec.os.match(/(Build\s*[\d.]+|2[0-9]H[12]|[0-9]{5,6}\.[0-9]+)/i);
          newAns['windows_update_note'] = buildMatch ? buildMatch[0] : spec.os;
        }

        // Auto-fill MS Office
        if (spec.msOffice) {
          newAns['office_check'] = 'yes';
          newAns['office_check_note'] = spec.msOffice;
        }

        // Auto-fill antivirus if a matching key exists
        if (spec.antivirus) {
          const antivirusItem = run.plan?.template?.templateItems?.find(
            (item: any) => item.key === 'antivirus' || item.key === 'av'
          );
          if (antivirusItem) {
            newAns[antivirusItem.key] = 'yes';
            newAns[`${antivirusItem.key}_note`] = spec.antivirus;
          }
        }

        if (spec.monitors && spec.monitors.length > 0) {
          newAns['monitor'] = 'yes';

          const monitorItem = run.plan?.template?.templateItems?.find(
            (item: any) => item.type?.toLowerCase() === 'monitor_array'
          );
          if (monitorItem) {
            const monitorKey = monitorItem.key;
            const monitorData = spec.monitors.map((m: any) => ({
              hasMonitor: true,
              company: m.company || run.asset?.company || 'TRR HQ',
              brand: m.brand || '',
              model: m.model || '',
              serialNo: m.serial || '',
              assetCode: m.assetCode || '',
              _assetId: m._assetId || null,
              source: 'glpi'
            }));
            newAns[monitorKey] = JSON.stringify(monitorData);
          }
        }
        setIsDirty(true);
        setAnswers(newAns);

        // Build summary of what was auto-filled
        const filled = [];
        if (spec.os) filled.push(`🖥️ OS: ${spec.os}`);
        if (spec.msOffice) filled.push(`📄 Office: ${spec.msOffice}`);
        if (spec.antivirus) filled.push(`🛡️ Antivirus: ${spec.antivirus}`);
        if (spec.monitors?.length > 0) filled.push(`📺 จอภาพ ${spec.monitors.length} จอ`);
        const summary = filled.length > 0 ? '\n' + filled.join('\n') : '';
        alert(`🔌 ดึง spec จาก GLPI สำเร็จ อัปเดต Checklist ร่างแล้ว${summary}`);
      } else {
        alert('❌ ไม่พบข้อมูล spec ของคอมพิวเตอร์เครื่องนี้ใน GLPI');
      }
    } catch (e: any) {
      console.error('GLPI fetch error:', e);
      const msg = e?.response?.data?.message || e?.message || 'ไม่ทราบสาเหตุ';
      alert(`❌ เกิดข้อผิดพลาดในการดึงข้อมูล spec: ${msg}`);
    } finally {
      setFetchingGLPI(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    try {
      setUploadingPhoto(true);
      // Compress image before upload
      const options = {
        maxSizeMB: 0.5, // limit to ~500KB
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      
      const formData = new FormData();
      formData.append('file', compressedFile, file.name);
      
      const res = await pmAPI.uploadPMPhoto(run.id, formData);
      setPhotoUrl(res.data.photoUrl || file.name);
      alert('📸 อัปโหลดรูปภาพสำเร็จ!');
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('❌ อัปโหลดรูปภาพไม่สำเร็จ');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (nextStatus: 'IN_PROGRESS' | 'COMPLETED' = 'COMPLETED') => {
    if (nextStatus === 'COMPLETED') {
      for (const item of items) {
        // Check if item has any answer at all
        const isRequired = item.required !== false; // Default to true
        if (isRequired && (answers[item.key] === undefined || answers[item.key] === '')) {
          alert(`⚠️ กรุณาประเมินให้ครบทุกข้อ (ยังไม่ได้ทำข้อ: ${item.label})`);
          return;
        }

        // IP Phone
        if (item.key === 'ip_phone' && answers[item.key] === 'yes' && !answers[`${item.key}_note`]?.trim()) {
          alert('⚠️ กรุณากรอกหมายเลขโทรศัพท์ภายใน (Extension Number) ในข้อ IP Phone');
          return;
        }
        // Windows Version
        if (item.type?.toLowerCase() === 'boolean' && item.key === 'windows_version' && answers[item.key] === 'yes' && !answers[`${item.key}_note`]?.trim()) {
          alert('⚠️ กรุณาระบุเวอร์ชันของ Windows ในช่องกรอกข้อมูล');
          return;
        }
        // Microsoft Office
        if (item.type?.toLowerCase() === 'boolean' && item.key === 'office_check' && answers[item.key] === 'yes' && !answers[`${item.key}_note`]?.trim()) {
          alert('⚠️ กรุณาระบุเวอร์ชันของ Microsoft Office ในช่องกรอกข้อมูล');
          return;
        }

        // Reason for "ชำรุดรอซ่อม" or "ไม่ผ่านเกณฑ์"
        if (['select_physical', 'select_result'].includes(item.type?.toLowerCase()) && (answers[item.key] === 'ชำรุดรอซ่อม' || answers[item.key] === 'ไม่ผ่านเกณฑ์') && !answers[`${item.key}_note`]?.trim()) {
          alert(`⚠️ กรุณาระบุสาเหตุ/อาการชำรุด (ข้อ: ${item.label})`);
          return;
        }
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
          return { itemId: item.id, value: val };
        });

      await pmAPI.performRun(run.id, { answers: answerList, status: nextStatus });
      localStorage.removeItem(`pm_draft_${run.id}`);
      alert(nextStatus === 'COMPLETED' ? '✅ บันทึกผล PM เรียบร้อยแล้ว!' : '💾 บันทึกร่างเรียบร้อยแล้ว!');
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
      maxWidth={940}
      title={`🔧 บันทึกข้อมูล PM: ${run?.asset?.assetName || run?.asset?.assetCode || ''} — ${run?.asset?.brand || ''} ${run?.asset?.model || ''}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '85vh', backgroundColor: '#F9FAFB' }}>
        
        {/* Header Section */}
        <div style={{ 
          padding: '12px 24px', 
          background: 'linear-gradient(to right, #ffffff, #f8fafc)',
          borderBottom: '1px solid #e2e8f0', 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'flex-start', 
          justifyContent: 'space-between', 
          gap: '12px', 
          flexShrink: 0 
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
            {[
              { lbl: 'ผู้ถือครอง', val: run.asset?.ownerName || '—' },
              { lbl: 'แผนก', val: run.asset?.departmentId || run.plan?.deptTask || '—' },
              { lbl: 'Location', val: run.asset?.location || run.plan?.site || '—' },
              { lbl: 'Serial No.', val: run.asset?.serialNo || '—' },
              { lbl: 'อายุเครื่อง', val: run.asset?.age != null ? `${run.asset.age} ปี` : '—' },
            ].map((i) => (
              <div key={i.lbl} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{i.lbl}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{i.val}</span>
              </div>
            ))}
          </div>
          {run.asset?.serialNo && (
            <button
              type="button"
              className="pmr-btn pmr-btn-outline"
              onClick={() => fetchGLPI(run.id)}
              disabled={fetchingGLPI}
              style={{ 
                borderRadius: 8, 
                fontSize: 13, 
                padding: '8px 16px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#fff',
                borderColor: '#cbd5e1',
                color: '#334155',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              {fetchingGLPI ? (
                <>⏳ <span>กำลังดึงข้อมูล...</span></>
              ) : (
                <>🔌 <span>ดึงสเปคจาก GLPI</span></>
              )}
            </button>
          )}
        </div>

        {/* Progress & Actions Section */}
        <div style={{ 
          padding: '10px 24px', 
          borderBottom: '1px solid #e2e8f0', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexShrink: 0, 
          flexWrap: 'wrap', 
          gap: 12, 
          background: '#ffffff' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 280 }}>
            <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>ความคืบหน้า</span>
            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 12, height: 8, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ 
                height: '100%', 
                borderRadius: 12, 
                background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)', 
                width: `${checkPct}%`, 
                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
              }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#059669', minWidth: 44 }}>{checkPct}%</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              type="button" 
              className="pmr-btn" 
              style={{ 
                padding: '8px 16px', fontSize: 13, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 8, fontWeight: 600, transition: 'all 0.2s' 
              }} 
              onClick={() => setAll('yes')}
            >
              ✓ ทำทั้งหมด (Yes)
            </button>
            <button
              type="button"
              className="pmr-btn"
              style={{ 
                padding: '8px 16px', fontSize: 13, background: '#fff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, transition: 'all 0.2s' 
              }}
              onClick={() => {
                setAnswersState({});
                setIsDirty(false);
                localStorage.removeItem(`pm_draft_${run.id}`);
              }}
            >
              ↺ ล้างข้อมูล
            </button>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* GLPI Spec Display */}
          {glpiSpec && (
            <div style={{ 
              background: 'linear-gradient(to right, #ecfdf5, #f0fdf4)', 
              borderBottom: '1px solid #a7f3d0', 
              padding: '10px 24px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 8, 
              fontSize: 12, 
              color: '#065f46',
              flexShrink: 0
            }}>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                📡 <span>ข้อมูลฮาร์ดแวร์สแกนอัตโนมัติจาก GLPI:</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '6px 16px' }}>
                <div><strong style={{ opacity: 0.8 }}>CPU:</strong> {glpiSpec.cpu || '—'}</div>
                <div><strong style={{ opacity: 0.8 }}>RAM:</strong> {glpiSpec.ram || '—'}</div>
                <div><strong style={{ opacity: 0.8 }}>OS:</strong> {glpiSpec.os || '—'}</div>
                <div><strong style={{ opacity: 0.8 }}>Office:</strong> {glpiSpec.msOffice || '—'}</div>
                <div><strong style={{ opacity: 0.8 }}>Antivirus:</strong> {glpiSpec.antivirus || '—'}</div>
                <div><strong style={{ opacity: 0.8 }}>License:</strong> {glpiSpec.license || '—'}</div>
                {glpiSpec.monitors && glpiSpec.monitors.length > 0 && (
                  <div style={{ gridColumn: '1 / -1', marginTop: 4, background: '#ffffff50', padding: '10px 14px', borderRadius: 8 }}>
                    <strong style={{ opacity: 0.8, display: 'block', marginBottom: 6 }}>จอภาพที่เชื่อมต่อ:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {glpiSpec.monitors.map((m: any, idx: number) => (
                        <span key={idx} style={{ 
                          background: '#fff', 
                          padding: '6px 12px', 
                          borderRadius: 6, 
                          border: '1px solid #a7f3d0',
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: 6,
                          fontWeight: 500,
                          color: '#064e3b'
                        }}>
                          📺 {m.brand} {m.model} <span style={{ opacity: 0.7 }}>(S/N: {m.serial})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Photo Upload Section */}
          <div style={{ padding: '12px 24px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📸 รูปถ่ายขณะทำ PM (Photo attachment)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {photoUrl ? (
                <div style={{ position: 'relative', width: 64, height: 64, borderRadius: 8, border: '2px solid #e2e8f0', overflow: 'hidden', background: '#f8fafc', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)' }}>
                  <img src={
                    photoUrl.startsWith('data:') || photoUrl.startsWith('http') 
                      ? photoUrl 
                      : resolveMediaUrl(photoUrl.startsWith('/') ? photoUrl : `/uploads/pm/${photoUrl}`)
                  } style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="PM Attachment" />
                </div>
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 8, border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#94a3b8', background: '#f8fafc' }}>📷</div>
              )}
              {!isDoneRun ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label className="pmr-btn pmr-btn-outline" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, background: '#fff' }}>
                    {uploadingPhoto ? '⏳ กำลังอัปโหลด...' : '📸 เลือกรูปภาพใหม่'}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} disabled={uploadingPhoto} />
                  </label>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>รองรับไฟล์ JPG, PNG, GIF, WEBP ขนาดไม่เกิน 10MB</div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>รายการนี้เสร็จสิ้นแล้ว จึงไม่สามารถอัปโหลดรูปใหม่ได้</div>
              )}
            </div>
          </div>

          {/* Checklist Items Area */}
          <div style={{ padding: '16px 24px', flex: 1 }}>
            {isDoneRun ? (
              <div style={{ display: 'grid', gap: 18 }}>
                {groups.map((group: any) => {
                  const groupItems = items.filter((i: any) => i.group === group);
                  const gi = GROUP_INFO[group] || { label: group, icon: '📌' };
                  return (
                    <div key={group} style={{
                      background: '#ffffff',
                      borderRadius: 16,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        padding: '14px 24px',
                        background: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <span style={{ fontSize: 16 }}>{gi.icon}</span> {gi.label}
                      </div>
                      <div style={{ display: 'grid', gap: 16, padding: '20px 24px' }}>
                        {groupItems.map((item: any) => (
                          <div key={item.key}>{renderReadonlyAnswer(item)}</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {groups.map((group: any) => {
              const groupItems = items.filter((i: any) => i.group === group);
              const gi = GROUP_INFO[group] || { label: group, icon: '📌' };
              return (
                <div key={group} style={{ 
                  background: '#ffffff', 
                  borderRadius: 16, 
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    padding: '14px 24px', 
                    background: '#f8fafc', 
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: 13, 
                    fontWeight: 700, 
                    color: '#334155', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10 
                  }}>
                    <span style={{ fontSize: 16 }}>{gi.icon}</span> {gi.label}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {groupItems.map((item: any, idx: number) => (
                      <div key={item.key} style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: 20, 
                        padding: '20px 24px', 
                        borderBottom: idx === groupItems.length - 1 ? 'none' : '1px solid #f1f5f9',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <div style={{ 
                          width: 28, 
                          height: 28, 
                          borderRadius: '50%', 
                          background: '#f1f5f9', 
                          border: '1px solid #e2e8f0', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: 12, 
                          fontWeight: 700, 
                          color: '#64748b', 
                          flexShrink: 0 
                        }}>
                          {items.indexOf(item) + 1}
                        </div>
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: 16 
                      }}>
                        <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 600, flex: 1, minWidth: 260, marginTop: 4 }}>
                          {item.label}
                        </div>
                        
                        {/* Boolean Action Buttons aligned to the right */}
                        {item.type?.toLowerCase() === 'boolean' && (
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            {[{ val: 'yes', lbl: '✓ ใช่', activeBg: '#ecfdf5', activeBorder: '#10b981', activeColor: '#047857' },
                            { val: 'no', lbl: '✗ ไม่', activeBg: '#fef2f2', activeBorder: '#ef4444', activeColor: '#b91c1c' },
                            { val: 'na', lbl: '— N/A', activeBg: '#f1f5f9', activeBorder: '#94a3b8', activeColor: '#334155' }].map((opt) => {
                              const isActive = answers[item.key] === opt.val;
                              return (
                                <button
                                  key={opt.val}
                                  type="button"
                                  onClick={() => setAnswers((p) => ({ ...p, [item.key]: opt.val }))}
                                  style={{
                                    padding: '8px 16px',
                                    borderRadius: 20,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: isActive ? opt.activeBg : '#ffffff',
                                    border: `1px solid ${isActive ? opt.activeBorder : '#cbd5e1'}`,
                                    color: isActive ? opt.activeColor : '#64748b',
                                    boxShadow: isActive ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
                                  }}
                                >
                                  {opt.lbl}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      {/* Inputs based on type */}
                      {item.type?.toLowerCase() === 'text' && (
                        <textarea
                          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '12px 16px', fontSize: 13, fontFamily: 'inherit', minHeight: 80, resize: 'vertical', outline: 'none', transition: 'border-color 0.2s', color: '#0f172a' }}
                          placeholder={item.key === 'issue_note' ? 'ระบุข้อเสนอแนะหรือปัญหาที่พบ...' : 'ระบุรายละเอียด...'}
                          value={answers[item.key] || ''}
                          onChange={(e) => setAnswers((p) => ({ ...p, [item.key]: e.target.value }))}
                          onFocus={(e) => e.target.style.borderColor = '#0891b2'}
                          onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        />
                      )}
                          
                          {item.type?.toLowerCase() === 'rating' && (() => {
                            const category = getRatingCategory(run.asset?.type);
                            const rubric = RATING_RUBRIC[category];
                            const stars = ['⭐⭐⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐', '⭐⭐', '⭐'];
                            const suggested = suggestRating(answers);
                            const current = parseInt(answers[item.key] || '0');
                            return (
                              <div>
                                <StarRating value={current} onChange={(v) => setAnswers((p) => ({ ...p, [item.key]: String(v) }))} />
                                {!isDoneRun && suggested != null && suggested !== current && (
                                  <div style={{ marginTop: 6, fontSize: 12.5, color: '#0f172a', background: '#eff6ff', padding: '8px 12px', borderRadius: 8, border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>🤖 แนะนำจากผลตรวจเช็คลิสต์: <strong>{suggested} ดาว</strong></span>
                                    <button
                                      type="button"
                                      onClick={() => setAnswers((p: Record<string, any>) => ({ ...p, [item.key]: String(suggested) }))}
                                      style={{ marginLeft: 'auto', border: '1px solid #0891b2', background: '#fff', color: '#0891b2', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                    >
                                      ใช้ค่านี้
                                    </button>
                                  </div>
                                )}
                                <div style={{ marginTop: 8, fontSize: 12, color: '#64748b', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                  <div style={{ fontWeight: 600, marginBottom: 4, color: '#475569' }}>💡 เกณฑ์การประเมินเพื่อช่วย IT Admin ตัดสินใจ:</div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
                                    {rubric.map((desc, i) => (
                                      <div key={i}>
                                        <span style={{ color: '#fbbf24', letterSpacing: '2px' }}>{stars[i]}</span>
                                        <span style={{ opacity: 0 }}>{'⭐'.repeat(i)}</span>
                                        {' '}({5 - i}) - {desc}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          
                          {['select', 'select_physical', 'select_speed', 'select_result'].includes(item.type?.toLowerCase()) && (
                            <div>
                              <select
                                style={{
                                  width: '100%',
                                  maxWidth: 400,
                                  border: (['select_physical', 'select_result'].includes(item.type?.toLowerCase()) && (answers[item.key] === 'ชำรุดรอซ่อม' || answers[item.key] === 'ไม่ผ่านเกณฑ์')) ? '2px solid #ef4444' : '1px solid #cbd5e1',
                                  borderRadius: 8, padding: '10px 16px', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                                  background: (['select_physical', 'select_result'].includes(item.type?.toLowerCase()) && (answers[item.key] === 'ชำรุดรอซ่อม' || answers[item.key] === 'ไม่ผ่านเกณฑ์')) ? '#fef2f2' : '#fff',
                                  color: '#0f172a',
                                  appearance: 'none',
                                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
                                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center',
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
                            <div style={{ marginTop: 4 }}>
                              <PMDeviceArrayInput
                                type="monitor"
                                value={answers[item.key] || ''}
                                onChange={(v) => setAnswers((p) => ({ ...p, [item.key]: v }))}
                                parentAsset={run?.asset}
                                readOnly={isDoneRun}
                              />
                            </div>
                          )}
                          
                          {item.type?.toLowerCase() === 'printer_array' && (
                            <div style={{ marginTop: 4 }}>
                              <PMDeviceArrayInput
                                type="printer"
                                value={answers[item.key] || ''}
                                onChange={(v) => setAnswers((p) => ({ ...p, [item.key]: v }))}
                                parentAsset={run?.asset}
                                readOnly={isDoneRun}
                              />
                            </div>
                          )}

                          {/* Inline Note for No/NA */}
                          {item.type?.toLowerCase() === 'boolean' && (answers[item.key] === 'no' || answers[item.key] === 'na') && (
                            <div style={{ marginTop: 4 }}>
                              <input
                                type="text"
                                style={{ width: '100%', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 14px', fontSize: 13, background: '#fffbeb', outline: 'none', fontFamily: 'inherit', color: '#b45309' }}
                                placeholder="ระบุสาเหตุประกอบการเลือกไม่ใช่หรือไม่ระบุ..."
                                value={answers[`${item.key}_note`] || ''}
                                onChange={(e) => setAnswers((p) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
                              />
                            </div>
                          )}
                          
                          {/* Green Box for IP Phone (Yes) */}
                          {item.type?.toLowerCase() === 'boolean' && item.key === 'ip_phone' && answers[item.key] === 'yes' && (
                            <div style={{ marginTop: 4 }}>
                              <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: 12, color: '#047857', fontWeight: 700 }}>📞 ระบุหมายเลขโทรศัพท์ภายใน (Extension Number)</label>
                                <input
                                  type="text"
                                  style={{ width: '100%', maxWidth: 300, border: '1px solid #34d399', borderRadius: 6, padding: '8px 12px', fontSize: 13, background: '#fff', outline: 'none', fontFamily: 'inherit', color: '#0f172a' }}
                                  placeholder="ตัวอย่าง: 1035, 1036..."
                                  value={answers[`${item.key}_note`] || ''}
                                  onChange={(e) => setAnswers((p) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
                                />
                              </div>
                            </div>
                          )}

                          {/* Green Box for Windows Version (Yes) */}
                          {item.type?.toLowerCase() === 'boolean' && item.key === 'windows_version' && answers[item.key] === 'yes' && (
                            <div style={{ marginTop: 4 }}>
                              <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: 12, color: '#047857', fontWeight: 700 }}>🪟 โปรดระบุเวอร์ชันของ Windows ที่ติดตั้ง</label>
                                <input
                                  type="text"
                                  style={{ width: '100%', border: '1px solid #34d399', borderRadius: 6, padding: '8px 12px', fontSize: 13, background: '#fff', outline: 'none', fontFamily: 'inherit', color: '#0f172a' }}
                                  placeholder="ตัวอย่าง: Windows 10 Pro, Windows 11 Enterprise..."
                                  value={answers[`${item.key}_note`] || ''}
                                  onChange={(e) => setAnswers((p) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
                                />
                              </div>
                            </div>
                          )}

                          {/* Green Box for Windows Update (winver) (Yes) */}
                          {item.type?.toLowerCase() === 'boolean' && item.key === 'windows_update' && answers[item.key] === 'yes' && (
                            <div style={{ marginTop: 4 }}>
                              <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: 12, color: '#047857', fontWeight: 700 }}>🔄 โปรดระบุข้อมูลเวอร์ชัน (winver) และอัปเดตล่าสุด</label>
                                <input
                                  type="text"
                                  style={{ width: '100%', border: '1px solid #34d399', borderRadius: 6, padding: '8px 12px', fontSize: 13, background: '#fff', outline: 'none', fontFamily: 'inherit', color: '#0f172a' }}
                                  placeholder="ตัวอย่าง: 22H2 (OS Build 19045.4291)..."
                                  value={answers[`${item.key}_note`] || ''}
                                  onChange={(e) => setAnswers((p) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
                                />
                              </div>
                            </div>
                          )}

                          {/* Green Box for Microsoft Office (Yes) */}
                          {item.type?.toLowerCase() === 'boolean' && item.key === 'office_check' && answers[item.key] === 'yes' && (
                            <div style={{ marginTop: 4 }}>
                              <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: 12, color: '#047857', fontWeight: 700 }}>📄 โปรดระบุเวอร์ชันของ Microsoft Office ที่ติดตั้ง</label>
                                <input
                                  type="text"
                                  style={{ width: '100%', border: '1px solid #34d399', borderRadius: 6, padding: '8px 12px', fontSize: 13, background: '#fff', outline: 'none', fontFamily: 'inherit', color: '#0f172a' }}
                                  placeholder="ตัวอย่าง: Office 2019, Microsoft 365..."
                                  value={answers[`${item.key}_note`] || ''}
                                  onChange={(e) => setAnswers((p) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Note for Select physical/result */}
                          {['select_physical', 'select_result'].includes(item.type?.toLowerCase()) && (answers[item.key] === 'ชำรุดรอซ่อม' || answers[item.key] === 'ไม่ผ่านเกณฑ์') && (
                            <div style={{ marginTop: 4 }}>
                              <input
                                type="text"
                                style={{ width: '100%', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', fontSize: 13, background: '#fef2f2', outline: 'none', fontFamily: 'inherit', color: '#991b1b' }}
                                placeholder={item.type?.toLowerCase() === 'select_physical' ? "ระบุสาเหตุที่ชำรุด / อาการ..." : "ระบุเหตุผลที่ไม่ผ่านเกณฑ์..."}
                                value={answers[`${item.key}_note`] || ''}
                                onChange={(e) => setAnswers((p) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ 
          padding: '12px 24px', 
          borderTop: '1px solid #e2e8f0', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 12, 
          background: '#ffffff', 
          flexShrink: 0,
          boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.02)'
        }}>
          <button 
            type="button" 
            className="pmr-btn pmr-btn-outline" 
            onClick={onClose}
            style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14 }}
          >
            ปิด
          </button>
          {isDoneRun ? null : (
            <>
              <button 
                type="button" 
                className="pmr-btn pmr-btn-outline" 
                onClick={() => handleSave('IN_PROGRESS')} 
                disabled={saving}
                style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14 }}
              >
                {saving ? '⏳...' : '💾 บันทึกร่าง'}
              </button>
              <button 
                type="button" 
                className="pmr-btn pmr-btn-success" 
                onClick={() => handleSave('COMPLETED')} 
                disabled={saving}
                style={{ padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
              >
                {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึกผล PM'}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
