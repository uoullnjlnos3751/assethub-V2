import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { pmAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import { Html5Qrcode } from 'html5-qrcode';

/* ─────────────────────────────────────────────────────────────
   Types & Constants
───────────────────────────────────────────────────────────────── */
const DEFAULT_CHECKLIST = [
  { key: 'computer_name',      label: 'ตรวจสอบ Computer Name (ถูกต้องตามมาตรฐาน)', group: 'user', type: 'boolean' },
  { key: 'change_name',        label: 'เปลี่ยน Computer Name (ถ้าไม่ตรงมาตรฐาน)', group: 'user', type: 'boolean' },
  { key: 'ip_phone',           label: 'ตรวจสอบ IP Phone / หมายเลขโทรศัพท์ภายใน', group: 'user', type: 'boolean' },
  { key: 'windows_version',    label: 'ตรวจสอบ Windows Version และ Activate', group: 'os', type: 'boolean' },
  { key: 'windows_update',     label: 'ตรวจสอบ Windows Update (winver)', group: 'os', type: 'boolean' },
  { key: 'office_check',       label: 'ตรวจสอบ Microsoft Office & Activate', group: 'os', type: 'boolean' },
  { key: 'antivirus',          label: 'อัปเดต Antivirus (Virus Definition)', group: 'os', type: 'boolean' },
  { key: 'change_password',    label: 'เปลี่ยน Password Local Admin', group: 'security', type: 'boolean' },
  { key: 'usb_policy',         label: 'ตรวจสอบ USB Policy (Block/Allow)', group: 'security', type: 'boolean' },
  { key: 'glpi_agent',         label: 'ติดตั้ง/ตรวจสอบ GLPI Agent v1.6/1.7', group: 'agent', type: 'boolean' },
  { key: 'spiceworks',         label: 'ติดตั้ง Spiceworks Agent', group: 'agent', type: 'boolean' },
  { key: 'pc_audit',           label: 'PC Audit (บันทึก Hardware spec)', group: 'agent', type: 'boolean' },
  { key: 'hw_info',            label: 'HW Info (Serial No., Service Tag)', group: 'agent', type: 'boolean' },
  { key: 'cleaning',           label: 'ทำความสะอาดอุปกรณ์ (Cleaning Device)', group: 'hardware', type: 'boolean' },
  { key: 'printer',            label: 'ตรวจสอบ Printer Local', group: 'hardware', type: 'boolean' },
  { key: 'ups',                label: 'ตรวจสอบ UPS', group: 'hardware', type: 'boolean' },
  { key: 'monitor',            label: 'ตรวจสอบจอ Monitor (Monitor 1 & 2)', group: 'hardware', type: 'boolean' },
  { key: 'issue_note',         label: 'ปัญหาที่พบ / ข้อเสนอแนะ', group: 'result', type: 'text' },
  { key: 'satisfaction',       label: 'ความพึงพอใจผู้ใช้ (1–5 ดาว)', group: 'result', type: 'rating' },
  { key: 'staff_name',         label: 'เจ้าหน้าที่ผู้ทำ PM', group: 'result', type: 'text' },
];

const GROUP_INFO: Record<string, { label: string; icon: string }> = {
  user:     { label: 'ข้อมูลผู้ใช้และอุปกรณ์', icon: '👤' },
  os:       { label: 'ระบบปฏิบัติการ (OS) & Software', icon: '🪟' },
  security: { label: 'ความปลอดภัย (Security)', icon: '🔒' },
  agent:    { label: 'ติดตั้ง Agent / Tools', icon: '🛠' },
  hardware: { label: 'Hardware & Peripheral', icon: '🖥' },
  result:   { label: 'ผลการประเมิน', icon: '⭐' },
};

/* ─────────────────────────────────────────────────────────────
   Modal
───────────────────────────────────────────────────────────────── */
function Modal({ open, onClose, title, children, maxWidth = 640 }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: number;
}) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(29,29,31,.35)', backdropFilter: 'blur(12px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth, boxShadow: '0 30px 70px rgba(0,0,0,.15)', overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #e5e5ea', flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{title}</span>
          <button onClick={onClose} style={{ background: '#f5f5f7', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 13, cursor: 'pointer', color: '#86868b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, backgroundColor: '#f5f5f7' }}>{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Stars
───────────────────────────────────────────────────────────────── */
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} onClick={() => onChange(n)} style={{ fontSize: 24, cursor: 'pointer', color: n <= value ? '#ff9500' : '#d2d2d7', transition: 'color .1s' }}>★</span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────── */
export default function PMRunPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planIdParam = searchParams.get('planId') || '';

  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan] = useState(planIdParam);
  const [filterType, setFilterType] = useState('');
  const [filterStaff, setFilterStaff] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  
  const [pmModal, setPMModal] = useState<{ open: boolean; run: any }>({ open: false, run: null });
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [exporting, setExporting] = useState(false);

  // New States
  const [selectedRunIds, setSelectedRunIds] = useState<number[]>([]);
  const [bulkPMModal, setBulkPMModal] = useState<{ open: boolean; templateId: number | null }>({ open: false, templateId: null });
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fetchingGLPI, setFetchingGLPI] = useState(false);
  const [glpiSpec, setGlpiSpec] = useState<any>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const fetchData = () => {
    setLoading(true);
    Promise.all([pmAPI.runs(), pmAPI.plans()])
      .then(([r, p]) => { 
        setRuns(r.data || []); 
        setPlans(p.data || []); 
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (planIdParam) {
      setFilterPlan(planIdParam);
    }
  }, [planIdParam]);

  // Autosave Drafts
  useEffect(() => {
    if (pmModal.run?.id && Object.keys(answers).length > 0) {
      localStorage.setItem(`pm_draft_${pmModal.run.id}`, JSON.stringify(answers));
    }
  }, [answers, pmModal.run?.id]);

  // QR Code Scanner Effect
  useEffect(() => {
    if (!qrModalOpen) return;
    
    let html5QrCode: Html5Qrcode | null = null;
    
    const timer = setTimeout(() => {
      const element = document.getElementById('qr-reader');
      if (!element) return;
      
      html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          setSearch(decodedText);
          showToast(`🔍 สแกนพบรหัส: ${decodedText}`);
          setQrModalOpen(false);
        },
        () => {}
      ).catch(err => {
        console.error('Error starting QR scanner:', err);
      });
    }, 300);
    
    return () => {
      clearTimeout(timer);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          html5QrCode?.clear();
        }).catch(err => {
          console.error('Error stopping QR scanner:', err);
        });
      }
    };
  }, [qrModalOpen]);

  // Compute unique values for filtering options
  const uniqueTypes = Array.from(new Set(runs.map(r => r.asset?.type).filter(Boolean))) as string[];
  const uniqueStaff = Array.from(new Set(runs.map(r => r.performer?.displayName || r.staffName).filter(Boolean))) as string[];

  /* ── Filter ── */
  const filtered = runs.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || (r.asset?.assetCode || '').toLowerCase().includes(q) || (r.asset?.ownerName || '').toLowerCase().includes(q) || (r.asset?.brand || '').toLowerCase().includes(q) || (r.asset?.model || '').toLowerCase().includes(q) || (r.asset?.serialNo || '').toLowerCase().includes(q);
    const matchStatus = !filterStatus || r.status === filterStatus;
    const matchPlan = !filterPlan || String(r.plan?.id) === filterPlan;
    const matchType = !filterType || r.asset?.type === filterType;
    const matchStaff = !filterStaff || (r.performer?.displayName || r.staffName) === filterStaff;
    return matchQ && matchStatus && matchPlan && matchType && matchStaff;
  });

  // Checklist Selection Helpers
  const selectableRuns = filtered.filter(r => r.status !== 'COMPLETED');
  const allSelected = selectableRuns.length > 0 && selectableRuns.every(r => selectedRunIds.includes(r.id));
  
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRunIds(selectableRuns.map(r => r.id));
    } else {
      setSelectedRunIds([]);
    }
  };
  
  const handleSelectOne = (id: number) => {
    setSelectedRunIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const fetchGLPI = async (runId: number) => {
    setFetchingGLPI(true);
    setGlpiSpec(null);
    try {
      const res = await pmAPI.getGLPISpec(runId);
      setGlpiSpec(res.data);
      showToast('🔌 ดึงข้อมูลจาก GLPI สำเร็จ');

      // Auto-prefill OS and hardware check values
      const newAnswers = { ...answers };
      if (res.data.os) {
        newAnswers['windows_version'] = 'yes';
      }
      setAnswers(newAnswers);
    } catch (err: any) {
      showToast(`❌ ดึงข้อมูลล้มเหลว: ${err.response?.data?.error || err.message}`);
    } finally {
      setFetchingGLPI(false);
    }
  };

  /* ── Open PM Checklist ── */
  const openPM = (run: any) => {
    if (!run.plan?.template?.templateItems?.length) {
      showToast('❌ แผน PM นี้ยังไม่มี Checklist Template กรุณาไปเพิ่มในเมนู จัดการแผน');
      return;
    }
    
    setGlpiSpec(null); // Reset GLPI Spec

    // Load local draft first
    const draftKey = `pm_draft_${run.id}`;
    const localDraft = localStorage.getItem(draftKey);
    let pre: Record<string, any> = {};
    if (localDraft) {
      try {
        pre = JSON.parse(localDraft);
      } catch (e) {
        console.error('Failed to parse local draft', e);
      }
    } else {
      // Fallback from DB answers
      (run.answers || []).forEach((a: any) => {
        const key = a.item?.key || a.key || a.itemKey;
        if (key) {
          if (a.value && typeof a.value === 'string' && a.value.includes('::')) {
            const [v, ...noteParts] = a.value.split('::');
            pre[key] = v;
            pre[`${key}_note`] = noteParts.join('::');
          } else {
            pre[key] = a.value;
          }
        }
      });
    }
    setAnswers(pre);
    setPMModal({ open: true, run });
  };

  /* ── Get checklist items ── */
  const getChecklistItems = (run: any) => {
    const items = run?.plan?.template?.templateItems;
    if (items?.length > 0) return items;
    return DEFAULT_CHECKLIST;
  };

  /* ── Save PM ── */
  const handleSave = async (nextStatus: 'IN_PROGRESS' | 'COMPLETED' = 'COMPLETED') => {
    const run = pmModal.run;
    if (!run) return;
    setSaving(true);
    try {
      const items = getChecklistItems(run);
      const answerList = items.filter((item: any) => item.id).map((item: any) => {
        let val = answers[item.key] !== undefined ? String(answers[item.key]) : '';
        if ((val === 'no' || val === 'na') && answers[`${item.key}_note`]) {
          val = `${val}::${answers[`${item.key}_note`]}`;
        }
        return { itemId: item.id, key: item.key, value: val };
      });
      if (items.length === 0 || answerList.length === 0) {
        showToast('❌ แผน PM นี้ยังไม่มี Checklist Template');
        return;
      }
      await pmAPI.performRun(run.id, { answers: answerList, status: nextStatus });
      
      // Clear draft on success
      localStorage.removeItem(`pm_draft_${run.id}`);

      if (nextStatus === 'IN_PROGRESS') {
        showToast(`✅ บันทึกร่าง PM สำหรับ ${run.asset?.assetCode} สำเร็จ`);
        setPMModal({ open: false, run: null });
        fetchData();
        return;
      }
      showToast(`✅ บันทึก PM สำหรับ ${run.asset?.assetCode} สำเร็จ`);
      setPMModal({ open: false, run: null });
      fetchData();
    } catch (err: any) {
      showToast(`❌ ${err.response?.data?.error || 'บันทึกไม่สำเร็จ'}`);
    } finally { setSaving(false); }
  };

  /* ── Bulk Save PM ── */
  const handleBulkSave = async () => {
    if (selectedRunIds.length === 0) return;
    const firstRun = runs.find(r => r.id === selectedRunIds[0]);
    if (!firstRun) return;

    setSaving(true);
    try {
      const items = getChecklistItems(firstRun);
      const answerList = items.filter((item: any) => item.id).map((item: any) => {
        let val = answers[item.key] !== undefined ? String(answers[item.key]) : '';
        if ((val === 'no' || val === 'na') && answers[`${item.key}_note`]) {
          val = `${val}::${answers[`${item.key}_note`]}`;
        }
        return { itemId: item.id, key: item.key, value: val };
      });
      if (items.length === 0 || answerList.length === 0) {
        showToast('❌ แผน PM นี้ยังไม่มี Checklist Template');
        return;
      }

      await pmAPI.bulkPerformRun({ runIds: selectedRunIds, answers: answerList });
      showToast(`✅ บันทึก PM แบบกลุ่ม ${selectedRunIds.length} รายการสำเร็จ`);
      
      // Clean up drafts
      selectedRunIds.forEach(id => localStorage.removeItem(`pm_draft_${id}`));
      
      setBulkPMModal({ open: false, templateId: null });
      setSelectedRunIds([]);
      fetchData();
    } catch (err: any) {
      showToast(`❌ ${err.response?.data?.error || 'บันทึกไม่สำเร็จ'}`);
    } finally { setSaving(false); }
  };

  /* ── Photo Upload ── */
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pmModal.run) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingPhoto(true);
    try {
      const res = await pmAPI.uploadPMPhoto(pmModal.run.id, formData);
      const updatedRun = res.data;

      setPMModal(prev => ({
        ...prev,
        run: {
          ...prev.run,
          photoUrl: updatedRun.photoUrl
        }
      }));

      setRuns(prev => prev.map(r => r.id === updatedRun.id ? { ...r, photoUrl: updatedRun.photoUrl } : r));
      showToast('📸 อัปโหลดรูปภาพสำเร็จ');
    } catch (err: any) {
      showToast(`❌ อัปโหลดรูปภาพไม่สำเร็จ: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  /* ── Export Excel ── */
  const handleExport = async () => {
    setExporting(true);
    try {
      const exportRows = filtered.map((r, idx) => {
        const row: any = {
          '#': idx + 1,
          'รหัสทรัพย์สิน': r.asset?.assetCode || '',
          'Serial No.': r.asset?.serialNo || '',
          'ยี่ห้อ': r.asset?.brand || '',
          'รุ่น': r.asset?.model || '',
          'ผู้ถือครอง': r.asset?.ownerName || '',
          'แผนก': r.asset?.departmentId || r.plan?.deptTask || '',
          'Location': r.asset?.location || r.plan?.site || '',
          'แผน PM': r.plan?.deptTask || r.plan?.site || '',
          'สถานะ': r.status === 'COMPLETED' ? 'เสร็จแล้ว' : r.status === 'IN_PROGRESS' ? 'กำลังทำ' : 'รอดำเนินการ',
          'ผู้ทำ PM': r.performer?.displayName || '',
          'วันที่ PM': r.performedAt ? new Date(r.performedAt).toLocaleDateString('th-TH') : '',
        };
        // Flatten checklist answers
        (r.answers || []).forEach((a: any) => {
          row[a.item?.label || a.label || a.item?.key || a.key] = a.value;
        });
        return row;
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportRows);
      ws['!cols'] = Object.keys(exportRows[0] || {}).map(k => ({ wch: Math.max(k.length + 4, 14) }));
      XLSX.utils.book_append_sheet(wb, ws, 'PM Results');
      XLSX.writeFile(wb, `PM-Results-${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast(`✅ Export สำเร็จ ${exportRows.length} รายการ`);
    } catch (err) {
      showToast('❌ Export ไม่สำเร็จ');
    } finally { setExporting(false); }
  };

  /* ── Stats ── */
  const done = runs.filter(r => r.status === 'COMPLETED').length;
  const pending = runs.filter(r => r.status === 'DRAFT').length;
  const inProgress = runs.filter(r => r.status === 'IN_PROGRESS').length;

  /* ── Checklist progress ── */
  const checkItems = pmModal.run ? getChecklistItems(pmModal.run) : [];
  const boolItems = checkItems.filter((i: any) => i.type === 'boolean');
  const answeredBool = boolItems.filter((i: any) => answers[i.key] !== undefined).length;
  const checkPct = boolItems.length > 0 ? Math.round(answeredBool / boolItems.length * 100) : 0;

  return (
    <>
      <style>{`
        .pmr-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1d1d1f; }
        .pmr-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          background: rgba(29, 29, 31, 0.9); backdrop-filter: blur(10px); color: #fff; padding: 12px 24px; border-radius: 12px;
          font-size: 13px; font-weight: 500; z-index: 9999; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
          animation: pmrFadeUp .2s cubic-bezier(0.16, 1, 0.3, 1); pointer-events: none; white-space: nowrap; }
        @keyframes pmrFadeUp { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .pmr-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 16px; border-radius: 8px;
          font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit;
          transition: all 0.2s ease; border: 1px solid transparent; white-space: nowrap; }
        .pmr-btn-primary { background: #0071e3; color: #fff; }
        .pmr-btn-primary:hover { background: #0077ed; }
        .pmr-btn-success { background: #34c759; color: #fff; }
        .pmr-btn-success:hover { background: #30b651; }
        .pmr-btn-outline { background: #fff; border-color: #d2d2d7; color: #1d1d1f; }
        .pmr-btn-outline:hover { background: #f5f5f7; border-color: #86868b; }
        .pmr-btn:disabled { opacity: .4; cursor: not-allowed; }
        .pmr-input { border: 1px solid #d2d2d7; border-radius: 8px; padding: 8px 12px;
          font-size: 13px; font-family: inherit; outline: none; color: #1d1d1f; background: #fff; transition: all 0.2s; }
        .pmr-input:focus { border-color: #0071e3; box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.15); }
        .pmr-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; cursor: pointer; }
        .pmr-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #e5e5ea; transition: background .15s; }
        .pmr-row:last-child { border-bottom: none; }
        .pmr-row:hover { background: #f5f5f7; }
        .pmr-check-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #e5e5ea; }
        .pmr-check-row:last-child { border-bottom: none; }
        .pmr-radio { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500;
          cursor: pointer; border: 1px solid #d2d2d7; background: #fff; color: #515154;
          transition: all .15s; font-family: inherit; }
        .pmr-radio:hover:not(:disabled) { border-color: #0071e3; color: #0071e3; background-color: rgba(0, 113, 227, 0.04); }
        .pmr-radio:disabled { opacity: 0.5; cursor: not-allowed; }
        .pmr-radio.sel-yes { background: #eaf6ed; border-color: #34c759; color: #1c873b; }
        .pmr-radio.sel-no  { background: #fdf2f2; border-color: #ff3b30; color: #c91e14; }
        .pmr-radio.sel-na  { background: #f5f5f7; border-color: #d2d2d7; color: #515154; }
        .checklist-card { background: #fff; border: 1px solid #e5e5ea; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.04); margin-bottom: 20px; }
        .check-group-title { padding: 10px 20px; background: #f5f5f7; font-size: 11px; font-weight: 600; color: #86868b; text-transform: uppercase; letter-spacing: .08em; border-bottom: 1px solid #e5e5ea; display: flex; align-items: center; gap: 8px; }
        .check-item { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 20px; border-bottom: 1px solid #f5f5f7; transition: background .1s; }
        .check-item:last-child { border-bottom: none; }
        .check-item:hover { background: rgba(0, 113, 227, 0.02); }
        .check-no { width: 24px; height: 24px; border-radius: 50%; background: #f5f5f7; border: 1px solid #e5e5ea; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; color: #86868b; flex-shrink: 0; }
      `}</style>

      <div className="pmr-root">

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', border: '1px solid #d2d2d7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>🔧</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em' }}>งาน Preventive Maintenance (PM)</div>
              <div style={{ fontSize: 12, color: '#86868b', marginTop: 2 }}>ตรวจเช็ค คลีนอุปกรณ์ และลงบันทึกรายงานผล</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {selectedRunIds.length > 0 && (
              <button 
                type="button" 
                className="pmr-btn pmr-btn-primary"
                onClick={() => {
                  const firstRun = runs.find(r => r.id === selectedRunIds[0]);
                  if (firstRun) {
                    setAnswers({});
                    setBulkPMModal({ open: true, templateId: firstRun.plan?.templateId || null });
                  }
                }}
              >
                🔧 ทำกลุ่ม ({selectedRunIds.length})
              </button>
            )}
            <button className="pmr-btn pmr-btn-outline" onClick={handleExport} disabled={exporting || filtered.length === 0}>
              {exporting ? '⏳' : '📥'} Export Excel
            </button>
            <button className="pmr-btn pmr-btn-primary" onClick={() => navigate('/pm/plans')}>📋 จัดการแผน</button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { icon: '📦', label: 'ทั้งหมด', val: runs.length, color: '#1d1d1f' },
            { icon: '✅', label: 'เสร็จแล้ว', val: done, color: '#34c759' },
            { icon: '🔄', label: 'กำลังทำ', val: inProgress, color: '#af52de' },
            { icon: '⏳', label: 'รอดำเนินการ', val: pending, color: '#ff9500' },
            { icon: '📊', label: '% เสร็จ', val: runs.length > 0 ? `${Math.round(done / runs.length * 100)}%` : '0%', color: '#34c759' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e5ea', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{s.val}</div>
                <div style={{ fontSize: 11, color: '#86868b', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter toolbar ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', background: '#fff', border: '1px solid #e5e5ea', borderRadius: 12, padding: '12px 16px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ flex: 1, minWidth: 240, display: 'flex', gap: 8 }}>
            <input
              className="pmr-input"
              style={{ flex: 1,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: '12px center', paddingLeft: 36,
              }}
              placeholder="ค้นหารหัส / ชื่อผู้ใช้ / ยี่ห้อ / รุ่น..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button 
              type="button" 
              className="pmr-btn pmr-btn-outline" 
              onClick={() => setQrModalOpen(true)} 
              style={{ padding: '8px 12px' }}
            >
              📷 สแกน QR
            </button>
          </div>
          <select className="pmr-input pmr-select" style={{ minWidth: 120 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">ทุกสถานะ</option>
            <option value="DRAFT">⏳ รอดำเนินการ</option>
            <option value="IN_PROGRESS">🔄 กำลังทำ</option>
            <option value="COMPLETED">✅ เสร็จแล้ว</option>
          </select>
          <select className="pmr-input pmr-select" style={{ minWidth: 120 }} value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
            <option value="">ทุกแผน</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.deptTask || p.site || `Plan #${p.id}`}</option>)}
          </select>
          <select className="pmr-input pmr-select" style={{ minWidth: 140 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">ทุกประเภทอุปกรณ์</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="pmr-input pmr-select" style={{ minWidth: 130 }} value={filterStaff} onChange={e => setFilterStaff(e.target.value)}>
            <option value="">ทุกผู้ทำ PM</option>
            {uniqueStaff.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#86868b', whiteSpace: 'nowrap', marginLeft: 'auto' }}>แสดง {filtered.length}/{runs.length} รายการ</span>
        </div>

        {/* ── Table ── */}
        <div style={{ background: '#fff', border: '1px solid #e5e5ea', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#0071e3', fontSize: 14, fontWeight: 500 }}>⏳ กำลังโหลดข้อมูล...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 64, textAlign: 'center', color: '#86868b' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔧</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>ไม่พบรายการ PM</div>
              <div style={{ fontSize: 12, marginTop: 4, color: '#86868b' }}>
                {runs.length === 0 ? 'ยังไม่มีงาน PM — ไปสร้างแผนและสุ่มงานระบบก่อน' : 'ลองปรับการกรองหรือข้อความค้นหาใหม่'}
              </div>
              {runs.length === 0 && (
                <button className="pmr-btn pmr-btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/pm/plans')}>
                  📋 ไปสร้างแผน PM
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f5f5f7', borderBottom: '1px solid #e5e5ea' }}>
                    <th style={{ padding: '12px 16px', width: 30 }}>
                      <input 
                        type="checkbox" 
                        checked={allSelected} 
                        onChange={handleSelectAll} 
                        disabled={selectableRuns.length === 0} 
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    {['#', 'รหัสทรัพย์สิน', 'ยี่ห้อ / รุ่น', 'ผู้ถือครอง', 'แผนก / Location', 'แผน PM', 'สถานะ', 'วันที่เสร็จ', 'จัดการ'].map((h, i) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: i === 8 ? 'center' : 'left', fontSize: 11, fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap', width: i === 0 ? 40 : undefined }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => {
                    const isDone = r.status === 'COMPLETED';
                    const isInProgress = r.status === 'IN_PROGRESS';
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #e5e5ea', transition: 'background .15s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,113,227,0.01)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                      >
                        <td style={{ padding: '12px 16px', width: 30 }}>
                          <input 
                            type="checkbox" 
                            checked={selectedRunIds.includes(r.id)} 
                            onChange={() => handleSelectOne(r.id)} 
                            disabled={isDone} 
                            style={{ cursor: isDone ? 'not-allowed' : 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px', color: '#86868b', fontSize: 12 }}>{idx + 1}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <code style={{ fontSize: 12, fontWeight: 600, background: '#f5f5f7', padding: '2px 8px', borderRadius: 4, color: '#1d1d1f', width: 'fit-content' }}>{r.asset?.assetCode || '—'}</code>
                            <span style={{ fontSize: 11, color: '#86868b' }}>{r.asset?.serialNo || ''}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#1d1d1f' }}>{r.asset?.brand || '—'}</div>
                          <div style={{ fontSize: 11, color: '#86868b' }}>{r.asset?.model || ''}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#515154' }}>{r.asset?.ownerName || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#515154' }}>
                          {r.asset?.departmentId || r.plan?.deptTask || r.asset?.location || r.plan?.site || '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, background: '#f5f5f7', border: '1px solid #d2d2d7', padding: '2px 8px', borderRadius: 6, color: '#1d1d1f' }}>
                            {r.plan?.deptTask || r.plan?.site || `Plan #${r.plan?.id}`}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                            ...(isDone ? { background: '#eaf6ed', color: '#1c873b', border: '1px solid rgba(52,199,89,0.2)' }
                              : isInProgress ? { background: '#f4f0fa', color: '#8946cc', border: '1px solid rgba(175,82,222,0.2)' }
                              : { background: '#fff9e6', color: '#d97706', border: '1px solid rgba(255,149,0,0.2)' }),
                          }}>
                            {isDone ? '✅ เสร็จแล้ว' : isInProgress ? '🔄 กำลังทำ' : '⏳ รอดำเนินการ'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#86868b' }}>
                          {r.performedAt ? new Date(r.performedAt).toLocaleDateString('th-TH') : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {!isDone ? (
                            <button type="button" className="pmr-btn pmr-btn-success" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, opacity: !r.plan?.template?.templateItems?.length ? 0.5 : 1 }} onClick={() => openPM(r)}>
                              🔧 ทำ PM
                            </button>
                          ) : (
                            <button type="button" className="pmr-btn pmr-btn-outline" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6 }} onClick={() => openPM(r)}>
                              👁 ดู / แก้ไข
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── PM Checklist Modal ── */}
      <Modal open={pmModal.open} onClose={() => setPMModal({ open: false, run: null })} maxWidth={760}
        title={`🔧 บันทึกข้อมูล PM: ${pmModal.run?.asset?.assetCode || ''} — ${pmModal.run?.asset?.brand || ''} ${pmModal.run?.asset?.model || ''}`}
      >
        {pmModal.run && (() => {
          const rawItems = getChecklistItems(pmModal.run);
          const items = [...rawItems].sort((a: any, b: any) => {
            if (a.group !== b.group) return (a.group || '').localeCompare(b.group || '');
            return (a.order || 0) - (b.order || 0);
          });
          const groups = Array.from(new Set(items.map((i: any) => i.group)));
          const isDoneRun = pmModal.run.status === 'COMPLETED';

          const setAll = (val: string) => {
            const newAns = { ...answers };
            items.filter((i:any) => i.type?.toLowerCase() === 'boolean').forEach((i:any) => newAns[i.key] = val);
            setAnswers(newAns);
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '80vh' }}>
              {/* Header Info */}
              <div style={{ background: '#fff', borderBottom: '1px solid #e5e5ea', padding: '16px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px 32px', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 32px' }}>
                  {[
                    { lbl: 'ผู้ถือครอง', val: pmModal.run.asset?.ownerName || '—' },
                    { lbl: 'แผนก', val: pmModal.run.asset?.departmentId || pmModal.run.plan?.deptTask || '—' },
                    { lbl: 'Location', val: pmModal.run.asset?.location || pmModal.run.plan?.site || '—' },
                    { lbl: 'Serial No.', val: pmModal.run.asset?.serialNo || '—' },
                  ].map(i => (
                    <div key={i.lbl}>
                      <div style={{ fontSize: 10, color: '#86868b', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{i.lbl}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{i.val}</div>
                    </div>
                  ))}
                </div>
                {pmModal.run.asset?.serialNo && (
                  <button
                    type="button"
                    className="pmr-btn pmr-btn-outline"
                    onClick={() => fetchGLPI(pmModal.run.id)}
                    disabled={fetchingGLPI}
                    style={{ borderRadius: 6, fontSize: 12, padding: '6px 12px' }}
                  >
                    {fetchingGLPI ? '⏳ กำลังดึงข้อมูล...' : '🔌 ดึงสเปคจาก GLPI'}
                  </button>
                )}
              </div>

              {/* GLPI Spec Display */}
              {glpiSpec && (
                <div style={{ background: '#eaf6ed', borderBottom: '1px solid rgba(52,199,89,0.2)', padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#1c873b', animation: 'pmrFadeUp 0.15s ease' }}>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>📡 ข้อมูลฮาร์ดแวร์สแกนอัตโนมัติจาก GLPI:</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 16px' }}>
                    <div><strong>CPU:</strong> {glpiSpec.cpu || '—'}</div>
                    <div><strong>RAM:</strong> {glpiSpec.ram || '—'}</div>
                    <div><strong>OS:</strong> {glpiSpec.os || '—'}</div>
                    <div><strong>Product Key / License:</strong> {glpiSpec.license || '—'}</div>
                  </div>
                </div>
              )}

              {/* Progress & Actions */}
              <div style={{ padding: '14px 24px', borderBottom: '1px solid #e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 12, background: '#f5f5f7' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 }}>
                  <span style={{ fontSize: 12, color: '#515154', fontWeight: 600 }}>ความคืบหน้า</span>
                  <div style={{ flex: 1, background: '#e5e5ea', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: '#34c759', width: `${checkPct}%`, transition: 'width .3s ease' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#34c759', minWidth: 40 }}>{checkPct}%</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="pmr-btn pmr-btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setAll('yes')}>✓ ทำทั้งหมด (Yes)</button>
                  <button type="button" className="pmr-btn pmr-btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => {
                    setAnswers({});
                    localStorage.removeItem(`pm_draft_${pmModal.run.id}`);
                  }}>↺ ล้างข้อมูล</button>
                </div>
              </div>

              {/* Photo Upload Section */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e5ea', background: '#fff', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#86868b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📸 รูปถ่ายขณะทำ PM (Photo attachment)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {pmModal.run.photoUrl ? (
                    <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, border: '1px solid #d2d2d7', overflow: 'hidden', background: '#f5f5f7' }}>
                      <img src={`/uploads/pm/${pmModal.run.photoUrl}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="PM Attachment" />
                    </div>
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: 8, border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#94a3b8', background: '#f5f5f7' }}>
                      📷
                    </div>
                  )}
                  <div>
                    <label className="pmr-btn pmr-btn-outline" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 6, padding: '6px 12px', fontSize: 12 }}>
                      {uploadingPhoto ? '⏳ กำลังอัปโหลด...' : '📸 เลือกรูปภาพ'}
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} disabled={uploadingPhoto} />
                    </label>
                    <div style={{ fontSize: 10, color: '#86868b', marginTop: 6 }}>
                      รองรับไฟล์ JPG, PNG, GIF, WEBP ขนาดไม่เกิน 10MB
                    </div>
                  </div>
                </div>
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
                                <textarea style={{ width: '100%', border: '1px solid #d2d2d7', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontFamily: 'inherit', minHeight: 70, marginTop: 8, resize: 'vertical', outline: 'none' }}
                                  placeholder={item.key === 'issue_note' ? 'ระบุข้อเสนอแนะหรือปัญหาที่พบ...' : 'ระบุรายละเอียด...'}
                                  value={answers[item.key] || ''}
                                  onChange={e => setAnswers(p => ({ ...p, [item.key]: e.target.value }))}
                                />
                              )}
                              {item.type?.toLowerCase() === 'rating' && (
                                <div style={{ marginTop: 8 }}>
                                  <StarRating value={parseInt(answers[item.key] || '0')} onChange={v => setAnswers(p => ({ ...p, [item.key]: String(v) }))} />
                                </div>
                              )}
                            </div>
                            {item.type?.toLowerCase() === 'boolean' && (
                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                {[{ val: 'yes', lbl: '✓ ใช่' }, { val: 'no', lbl: '✗ ไม่' }, { val: 'na', lbl: '— N/A' }].map(opt => (
                                  <button key={opt.val} type="button"
                                    className={`pmr-radio ${answers[item.key] === opt.val ? `sel-${opt.val}` : ''}`}
                                    onClick={() => setAnswers(p => ({ ...p, [item.key]: opt.val }))}
                                  >{opt.lbl}</button>
                                ))}
                              </div>
                            )}
                            
                            {/* Inline Note for No/NA */}
                            {item.type?.toLowerCase() === 'boolean' && (answers[item.key] === 'no' || answers[item.key] === 'na') && (
                              <div style={{ width: '100%', paddingLeft: 38, marginTop: 6, animation: 'pmrFadeUp 0.15s ease' }}>
                                <input type="text"
                                  style={{ width: '100%', border: '1px solid #ff9500', borderRadius: 6, padding: '8px 12px', fontSize: 12, background: '#fffbeb', outline: 'none', fontFamily: 'inherit' }}
                                  placeholder="ระบุสาเหตุประกอบการเลือกไม่ใช่หรือไม่ระบุ..."
                                  value={answers[`${item.key}_note`] || ''}
                                  onChange={e => setAnswers(p => ({ ...p, [`${item.key}_note`]: e.target.value }))}
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
                <button type="button" className="pmr-btn pmr-btn-outline" onClick={() => setPMModal({ open: false, run: null })}>ปิด</button>
                {!isDoneRun && (
                  <>
                    <button type="button" className="pmr-btn pmr-btn-outline" onClick={() => handleSave('IN_PROGRESS')} disabled={saving}>
                      {saving ? '⏳...' : '💾 บันทึกร่าง'}
                    </button>
                    <button type="button" className="pmr-btn pmr-btn-success" onClick={() => handleSave('COMPLETED')} disabled={saving}>
                      {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึกผล PM'}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Bulk PM Checklist Modal ── */}
      <Modal open={bulkPMModal.open} onClose={() => setBulkPMModal({ open: false, templateId: null })} maxWidth={760}
        title={`🔧 บันทึก PM แบบกลุ่ม (${selectedRunIds.length} รายการ)`}
      >
        {selectedRunIds.length > 0 && (() => {
          const firstRun = runs.find(r => r.id === selectedRunIds[0]);
          if (!firstRun) return null;
          
          const rawItems = getChecklistItems(firstRun);
          const items = [...rawItems].sort((a: any, b: any) => {
            if (a.group !== b.group) return (a.group || '').localeCompare(b.group || '');
            return (a.order || 0) - (b.order || 0);
          });
          const groups = Array.from(new Set(items.map((i: any) => i.group)));

          const setAll = (val: string) => {
            const newAns = { ...answers };
            items.filter((i:any) => i.type?.toLowerCase() === 'boolean').forEach((i:any) => newAns[i.key] = val);
            setAnswers(newAns);
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '80vh' }}>
              {/* Alert banner */}
              <div style={{ background: '#fff9e6', borderBottom: '1px solid rgba(255,149,0,0.2)', padding: '12px 24px', fontSize: 12, color: '#d97706', fontWeight: 500, display: 'flex', gap: 8, alignItems: 'center' }}>
                ⚠️ ข้อความนี้จะถูกบันทึกไปยังรายการอุปกรณ์ที่เลือก {selectedRunIds.length} รายการ และสถานะจะเป็น 'เสร็จแล้ว (COMPLETED)' โดยอัตโนมัติ
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
                                <textarea style={{ width: '100%', border: '1px solid #d2d2d7', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontFamily: 'inherit', minHeight: 70, marginTop: 8, resize: 'vertical', outline: 'none' }}
                                  placeholder={item.key === 'issue_note' ? 'ระบุข้อเสนอแนะหรือปัญหาที่พบ...' : 'ระบุรายละเอียด...'}
                                  value={answers[item.key] || ''}
                                  onChange={e => setAnswers(p => ({ ...p, [item.key]: e.target.value }))}
                                />
                              )}
                              {item.type?.toLowerCase() === 'rating' && (
                                <div style={{ marginTop: 8 }}>
                                  <StarRating value={parseInt(answers[item.key] || '0')} onChange={v => setAnswers(p => ({ ...p, [item.key]: String(v) }))} />
                                </div>
                              )}
                            </div>
                            {item.type?.toLowerCase() === 'boolean' && (
                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                {[{ val: 'yes', lbl: '✓ ใช่' }, { val: 'no', lbl: '✗ ไม่' }, { val: 'na', lbl: '— N/A' }].map(opt => (
                                  <button key={opt.val} type="button"
                                    className={`pmr-radio ${answers[item.key] === opt.val ? `sel-${opt.val}` : ''}`}
                                    onClick={() => setAnswers(p => ({ ...p, [item.key]: opt.val }))}
                                  >{opt.lbl}</button>
                                ))}
                              </div>
                            )}
                            
                            {/* Inline Note for No/NA */}
                            {item.type?.toLowerCase() === 'boolean' && (answers[item.key] === 'no' || answers[item.key] === 'na') && (
                              <div style={{ width: '100%', paddingLeft: 38, marginTop: 6, animation: 'pmrFadeUp 0.15s ease' }}>
                                <input type="text"
                                  style={{ width: '100%', border: '1px solid #ff9500', borderRadius: 6, padding: '8px 12px', fontSize: 12, background: '#fffbeb', outline: 'none', fontFamily: 'inherit' }}
                                  placeholder="ระบุสาเหตุประกอบการเลือกไม่ใช่หรือไม่ระบุ..."
                                  value={answers[`${item.key}_note`] || ''}
                                  onChange={e => setAnswers(p => ({ ...p, [`${item.key}_note`]: e.target.value }))}
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
                <button type="button" className="pmr-btn pmr-btn-outline" onClick={() => setBulkPMModal({ open: false, templateId: null })}>ปิด</button>
                <button type="button" className="pmr-btn pmr-btn-primary" onClick={handleBulkSave} disabled={saving}>
                  {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึกผล PM ทั้งหมด'}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── QR Scanner Modal ── */}
      <Modal open={qrModalOpen} onClose={() => setQrModalOpen(false)} title="📷 สแกน QR Code เพื่อค้นหาทรัพย์สิน" maxWidth={480}>
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div id="qr-reader" style={{ width: '100%', overflow: 'hidden', borderRadius: 12, background: '#000', minHeight: 300 }}></div>
          <div style={{ marginTop: 16, fontSize: 13, color: '#86868b', lineHeight: 1.5 }}>
            วาง QR Code ให้อยู่ในตำแหน่งกรอบของกล้องเพื่อทำการสแกนโดยอัตโนมัติ
          </div>
        </div>
      </Modal>

      {toast && <div className="pmr-toast">{toast}</div>}
    </>
  );
}
