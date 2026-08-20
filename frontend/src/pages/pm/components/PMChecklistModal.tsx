import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Select, MenuItem, alpha, useTheme } from '@mui/material';
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
  const theme = useTheme();
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

  const renderReadonlyAnswer = (item: any) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: theme.palette.text.primary }}>{item.label}</Typography>
      <Box sx={{
        px: 2.25, py: 1.75, borderRadius: '12px',
        bgcolor: theme.palette.background.default, border: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.secondary, fontSize: 13, lineHeight: 1.6,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {formatAnswerValue(item)}
      </Box>
    </Box>
  );

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
              // GLPI บอกบริษัทไม่ได้ จอที่ยังไม่มีในทะเบียนจึงตกเป็นของเครื่องที่ทำ PM อยู่
              company: m.company || run.asset?.company || '',
              brand: m.brand || '',
              model: m.model || '',
              serialNo: m.serial || '',
              // ใช้รหัสได้เฉพาะจอที่มีระเบียนอยู่แล้ว จอใหม่ต้องปล่อยให้ระบบเจนให้
              assetCode: m._assetId ? (m.assetCode || '') : '',
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

  const BOOL_OPTS = [
    { val: 'yes', lbl: '✓ ใช่', key: 'success' as const },
    { val: 'no', lbl: '✗ ไม่', key: 'error' as const },
    { val: 'na', lbl: '— N/A', key: 'neutral' as const },
  ];
  const boolActiveSx = (key: 'success' | 'error' | 'neutral') => key === 'neutral'
    ? { bgcolor: theme.palette.background.default, borderColor: theme.palette.text.disabled, color: theme.palette.text.primary }
    : { bgcolor: alpha(theme.palette[key].main, 0.1), borderColor: theme.palette[key].main, color: theme.palette[key].dark };

  const greenNoteBox = (label: string, icon: string, item: any) => (
    <Box sx={{ mt: 0.5 }}>
      <Box sx={{ bgcolor: alpha(theme.palette.success.main, 0.08), border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`, borderRadius: '10px', p: '14px 18px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography sx={{ fontSize: 12, color: theme.palette.success.dark, fontWeight: 700 }}>{icon} {label}</Typography>
        <TextField
          fullWidth size="small"
          value={answers[`${item.key}_note`] || ''}
          onChange={(e) => setAnswers((p: any) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: theme.palette.background.paper } }}
        />
      </Box>
    </Box>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth={940}
      title={`🔧 บันทึกข้อมูล PM: ${run?.asset?.assetName || run?.asset?.assetCode || ''} — ${run?.asset?.brand || ''} ${run?.asset?.model || ''}`}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '85vh', bgcolor: theme.palette.background.default }}>

        {/* Header Section */}
        <Box sx={{
          px: 3, py: 1.5,
          bgcolor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, flexShrink: 0,
        }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
            {[
              { lbl: 'ผู้ถือครอง', val: run.asset?.ownerName || '—' },
              { lbl: 'แผนก', val: run.asset?.departmentId || run.plan?.deptTask || '—' },
              { lbl: 'Location', val: run.asset?.location || run.plan?.site || '—' },
              { lbl: 'Serial No.', val: run.asset?.serialNo || '—' },
              { lbl: 'อายุเครื่อง', val: run.asset?.age != null ? `${run.asset.age} ปี` : '—' },
            ].map((i) => (
              <Box key={i.lbl} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{i.lbl}</Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 600, color: theme.palette.text.primary }}>{i.val}</Typography>
              </Box>
            ))}
          </Box>
          {run.asset?.serialNo && (
            <Button
              variant="outlined"
              onClick={() => fetchGLPI(run.id)}
              disabled={fetchingGLPI}
              sx={{ fontSize: 13, fontWeight: 600 }}
            >
              {fetchingGLPI ? '⏳ กำลังดึงข้อมูล...' : '🔌 ดึงสเปคจาก GLPI'}
            </Button>
          )}
        </Box>

        {/* Progress & Actions Section */}
        <Box sx={{
          px: 3, py: 1.25, borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 1.5,
          bgcolor: theme.palette.background.paper,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 280 }}>
            <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary, fontWeight: 600 }}>ความคืบหน้า</Typography>
            <Box sx={{ flex: 1, bgcolor: theme.palette.background.default, borderRadius: '12px', height: 8, overflow: 'hidden' }}>
              <Box sx={{
                height: '100%', borderRadius: '12px',
                background: `linear-gradient(90deg, ${theme.palette.success.main} 0%, ${alpha(theme.palette.success.main, 0.7)} 100%)`,
                width: `${checkPct}%`, transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            </Box>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: theme.palette.success.main, minWidth: 44 }}>{checkPct}%</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.25 }}>
            <Button
              size="small"
              onClick={() => setAll('yes')}
              sx={{ fontSize: 13, fontWeight: 600, bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.dark, border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`, '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.18) } }}
            >
              ✓ ทำทั้งหมด (Yes)
            </Button>
            <Button
              size="small" variant="outlined"
              onClick={() => {
                setAnswersState({});
                setIsDirty(false);
                localStorage.removeItem(`pm_draft_${run.id}`);
              }}
              sx={{ fontSize: 13, fontWeight: 600 }}
            >
              ↺ ล้างข้อมูล
            </Button>
          </Box>
        </Box>

        {/* Scrollable Content Container */}
        <Box sx={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* GLPI Spec Display */}
          {glpiSpec && (
            <Box sx={{
              background: `linear-gradient(to right, ${alpha(theme.palette.success.main, 0.08)}, ${alpha(theme.palette.success.main, 0.04)})`,
              borderBottom: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
              px: 3, py: 1.25, display: 'flex', flexDirection: 'column', gap: 1, fontSize: 12, color: theme.palette.success.dark, flexShrink: 0,
            }}>
              <Box sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 13 }}>
                📡 <span>ข้อมูลฮาร์ดแวร์สแกนอัตโนมัติจาก GLPI:</span>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '6px 16px' }}>
                <Box><strong style={{ opacity: 0.8 }}>CPU:</strong> {glpiSpec.cpu || '—'}</Box>
                <Box><strong style={{ opacity: 0.8 }}>RAM:</strong> {glpiSpec.ram || '—'}</Box>
                <Box><strong style={{ opacity: 0.8 }}>OS:</strong> {glpiSpec.os || '—'}</Box>
                <Box><strong style={{ opacity: 0.8 }}>Office:</strong> {glpiSpec.msOffice || '—'}</Box>
                <Box><strong style={{ opacity: 0.8 }}>Antivirus:</strong> {glpiSpec.antivirus || '—'}</Box>
                <Box><strong style={{ opacity: 0.8 }}>License:</strong> {glpiSpec.license || '—'}</Box>
                {glpiSpec.monitors && glpiSpec.monitors.length > 0 && (
                  <Box sx={{ gridColumn: '1 / -1', mt: 0.5, bgcolor: alpha(theme.palette.background.paper, 0.5), px: 1.75, py: 1.25, borderRadius: '8px' }}>
                    <strong style={{ opacity: 0.8, display: 'block', marginBottom: 6 }}>จอภาพที่เชื่อมต่อ:</strong>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                      {glpiSpec.monitors.map((m: any, idx: number) => (
                        <Box key={idx} sx={{
                          bgcolor: theme.palette.background.paper, px: 1.5, py: 0.75, borderRadius: '6px',
                          border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                          display: 'inline-flex', alignItems: 'center', gap: 0.75, fontWeight: 500,
                        }}>
                          📺 {m.brand} {m.model} <Box component="span" sx={{ opacity: 0.7 }}>(S/N: {m.serial})</Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Photo Upload Section */}
          <Box sx={{ px: 3, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper, flexShrink: 0 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: theme.palette.text.secondary, mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📸 รูปถ่ายขณะทำ PM (Photo attachment)</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {photoUrl ? (
                <Box sx={{ position: 'relative', width: 64, height: 64, borderRadius: '8px', border: `2px solid ${theme.palette.divider}`, overflow: 'hidden', bgcolor: theme.palette.background.default }}>
                  <Box component="img" src={
                    photoUrl.startsWith('data:') || photoUrl.startsWith('http')
                      ? photoUrl
                      : resolveMediaUrl(photoUrl.startsWith('/') ? photoUrl : `/uploads/pm/${photoUrl}`)
                  } sx={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="PM Attachment" />
                </Box>
              ) : (
                <Box sx={{ width: 64, height: 64, borderRadius: '8px', border: `2px dashed ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: theme.palette.text.disabled, bgcolor: theme.palette.background.default }}>📷</Box>
              )}
              {!isDoneRun ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button component="label" variant="outlined" size="small" disabled={uploadingPhoto} sx={{ fontSize: 13, fontWeight: 600 }}>
                    {uploadingPhoto ? '⏳ กำลังอัปโหลด...' : '📸 เลือกรูปภาพใหม่'}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} hidden disabled={uploadingPhoto} />
                  </Button>
                  <Typography sx={{ fontSize: 11, color: theme.palette.text.disabled, fontWeight: 500 }}>รองรับไฟล์ JPG, PNG, GIF, WEBP ขนาดไม่เกิน 10MB</Typography>
                </Box>
              ) : (
                <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, fontWeight: 500 }}>รายการนี้เสร็จสิ้นแล้ว จึงไม่สามารถอัปโหลดรูปใหม่ได้</Typography>
              )}
            </Box>
          </Box>

          {/* Checklist Items Area */}
          <Box sx={{ px: 3, py: 2, flex: 1 }}>
            {isDoneRun ? (
              <Box sx={{ display: 'grid', gap: 2.25 }}>
                {groups.map((group: any) => {
                  const groupItems = items.filter((i: any) => i.group === group);
                  const gi = GROUP_INFO[group] || { label: group, icon: '📌' };
                  return (
                    <Box key={group} sx={{
                      bgcolor: theme.palette.background.paper, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden',
                    }}>
                      <Box sx={{
                        px: 3, py: 1.75, bgcolor: theme.palette.background.default, borderBottom: `1px solid ${theme.palette.divider}`,
                        fontSize: 13, fontWeight: 700, color: theme.palette.text.primary, display: 'flex', alignItems: 'center', gap: 1.25,
                      }}>
                        <Box component="span" sx={{ fontSize: 16 }}>{gi.icon}</Box> {gi.label}
                      </Box>
                      <Box sx={{ display: 'grid', gap: 2, px: 3, py: 2.5 }}>
                        {groupItems.map((item: any) => (
                          <Box key={item.key}>{renderReadonlyAnswer(item)}</Box>
                        ))}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {groups.map((group: any) => {
                  const groupItems = items.filter((i: any) => i.group === group);
                  const gi = GROUP_INFO[group] || { label: group, icon: '📌' };
                  return (
                    <Box key={group} sx={{
                      bgcolor: theme.palette.background.paper, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden',
                    }}>
                      <Box sx={{
                        px: 3, py: 1.75, bgcolor: theme.palette.background.default, borderBottom: `1px solid ${theme.palette.divider}`,
                        fontSize: 13, fontWeight: 700, color: theme.palette.text.primary, display: 'flex', alignItems: 'center', gap: 1.25,
                      }}>
                        <Box component="span" sx={{ fontSize: 16 }}>{gi.icon}</Box> {gi.label}
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        {groupItems.map((item: any, idx: number) => (
                          <Box key={item.key} sx={{
                            display: 'flex', alignItems: 'flex-start', gap: 2.5, px: 3, py: 2.5,
                            borderBottom: idx === groupItems.length - 1 ? 'none' : `1px solid ${theme.palette.divider}`,
                            transition: 'background 0.2s ease',
                            '&:hover': { bgcolor: theme.palette.background.default },
                          }}>
                            <Box sx={{
                              width: 28, height: 28, borderRadius: '50%',
                              bgcolor: theme.palette.background.default, border: `1px solid ${theme.palette.divider}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700, color: theme.palette.text.secondary, flexShrink: 0,
                            }}>
                              {items.indexOf(item) + 1}
                            </Box>

                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                                <Typography sx={{ fontSize: 14, color: theme.palette.text.primary, fontWeight: 600, flex: 1, minWidth: 260, mt: 0.5 }}>
                                  {item.label}
                                </Typography>

                                {/* Boolean Action Buttons aligned to the right */}
                                {item.type?.toLowerCase() === 'boolean' && (
                                  <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                                    {BOOL_OPTS.map((opt) => {
                                      const isActive = answers[item.key] === opt.val;
                                      return (
                                        <Button
                                          key={opt.val}
                                          size="small"
                                          onClick={() => setAnswers((p: any) => ({ ...p, [item.key]: opt.val }))}
                                          sx={{
                                            borderRadius: '20px', fontSize: 13, fontWeight: 600,
                                            border: '1px solid', bgcolor: theme.palette.background.paper, color: theme.palette.text.secondary, borderColor: theme.palette.divider,
                                            ...(isActive ? boolActiveSx(opt.key) : {}),
                                          }}
                                        >
                                          {opt.lbl}
                                        </Button>
                                      );
                                    })}
                                  </Box>
                                )}
                              </Box>

                              {/* Inputs based on type */}
                              {item.type?.toLowerCase() === 'text' && (
                                <TextField
                                  fullWidth multiline minRows={3} size="small"
                                  placeholder={item.key === 'issue_note' ? 'ระบุข้อเสนอแนะหรือปัญหาที่พบ...' : 'ระบุรายละเอียด...'}
                                  value={answers[item.key] || ''}
                                  onChange={(e) => setAnswers((p: any) => ({ ...p, [item.key]: e.target.value }))}
                                />
                              )}

                              {item.type?.toLowerCase() === 'rating' && (() => {
                                const category = getRatingCategory(run.asset?.type);
                                const rubric = RATING_RUBRIC[category];
                                const stars = ['⭐⭐⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐', '⭐⭐', '⭐'];
                                const suggested = suggestRating(answers);
                                const current = parseInt(answers[item.key] || '0');
                                return (
                                  <Box>
                                    <StarRating value={current} onChange={(v) => setAnswers((p: any) => ({ ...p, [item.key]: String(v) }))} />
                                    {!isDoneRun && suggested != null && suggested !== current && (
                                      <Box sx={{ mt: 0.75, fontSize: 12.5, color: theme.palette.text.primary, bgcolor: alpha(theme.palette.info.main, 0.06), px: 1.5, py: 1, borderRadius: '8px', border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box component="span">🤖 แนะนำจากผลตรวจเช็คลิสต์: <strong>{suggested} ดาว</strong></Box>
                                        <Button
                                          size="small"
                                          onClick={() => setAnswers((p: Record<string, any>) => ({ ...p, [item.key]: String(suggested) }))}
                                          sx={{ ml: 'auto', fontSize: 12, fontWeight: 600, minWidth: 0, px: 1.25, border: `1px solid ${theme.palette.info.main}`, color: theme.palette.info.main }}
                                        >
                                          ใช้ค่านี้
                                        </Button>
                                      </Box>
                                    )}
                                    <Box sx={{ mt: 1, fontSize: 12, color: theme.palette.text.secondary, bgcolor: theme.palette.background.default, px: 1.75, py: 1.25, borderRadius: '8px', border: `1px solid ${theme.palette.divider}` }}>
                                      <Box sx={{ fontWeight: 600, mb: 0.5, color: theme.palette.text.primary }}>💡 เกณฑ์การประเมินเพื่อช่วย IT Admin ตัดสินใจ:</Box>
                                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0.5 }}>
                                        {rubric.map((desc, i) => (
                                          <Box key={i}>
                                            <Box component="span" sx={{ color: theme.palette.warning.main, letterSpacing: '2px' }}>{stars[i]}</Box>
                                            {' '}({5 - i}) - {desc}
                                          </Box>
                                        ))}
                                      </Box>
                                    </Box>
                                  </Box>
                                );
                              })()}

                              {['select', 'select_physical', 'select_speed', 'select_result'].includes(item.type?.toLowerCase()) && (() => {
                                const isDefect = ['select_physical', 'select_result'].includes(item.type?.toLowerCase()) && (answers[item.key] === 'ชำรุดรอซ่อม' || answers[item.key] === 'ไม่ผ่านเกณฑ์');
                                return (
                                  <Select
                                    displayEmpty
                                    size="small"
                                    sx={{
                                      width: '100%', maxWidth: 400,
                                      ...(isDefect ? {
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.error.main, borderWidth: '2px' },
                                        bgcolor: alpha(theme.palette.error.main, 0.06),
                                      } : {}),
                                    }}
                                    value={answers[item.key] || ''}
                                    onChange={(e) => setAnswers((p: any) => ({ ...p, [item.key]: e.target.value }))}
                                  >
                                    <MenuItem value=""><em>-- กรุณาเลือก --</em></MenuItem>
                                    {item.type?.toLowerCase() === 'select_physical' && ['สภาพปกติ', 'ชำรุดเล็กน้อย', 'ชำรุดรอซ่อม', 'หมดสภาพ'].map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                    {item.type?.toLowerCase() === 'select_speed' && ['เร็วปกติ', 'เริ่มหน่วงหนืด', 'ช้ามาก'].map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                    {item.type?.toLowerCase() === 'select_result' && ['ผ่านเกณฑ์', 'แก้ไขเรียบร้อย', 'ไม่ผ่านเกณฑ์'].map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                    {item.type?.toLowerCase() === 'select' && item.options?.split(',').map((opt: string) => opt.trim()).filter(Boolean).map((opt: string) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                  </Select>
                                );
                              })()}

                              {item.type?.toLowerCase() === 'monitor_array' && (
                                <Box sx={{ mt: 0.5 }}>
                                  <PMDeviceArrayInput
                                    type="monitor"
                                    value={answers[item.key] || ''}
                                    onChange={(v) => setAnswers((p: any) => ({ ...p, [item.key]: v }))}
                                    parentAsset={run?.asset}
                                    readOnly={isDoneRun}
                                  />
                                </Box>
                              )}

                              {item.type?.toLowerCase() === 'printer_array' && (
                                <Box sx={{ mt: 0.5 }}>
                                  <PMDeviceArrayInput
                                    type="printer"
                                    value={answers[item.key] || ''}
                                    onChange={(v) => setAnswers((p: any) => ({ ...p, [item.key]: v }))}
                                    parentAsset={run?.asset}
                                    readOnly={isDoneRun}
                                  />
                                </Box>
                              )}

                              {/* Inline Note for No/NA */}
                              {item.type?.toLowerCase() === 'boolean' && (answers[item.key] === 'no' || answers[item.key] === 'na') && (
                                <Box sx={{ mt: 0.5 }}>
                                  <TextField
                                    fullWidth size="small"
                                    placeholder="ระบุสาเหตุประกอบการเลือกไม่ใช่หรือไม่ระบุ..."
                                    value={answers[`${item.key}_note`] || ''}
                                    onChange={(e) => setAnswers((p: any) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
                                    sx={{
                                      '& .MuiOutlinedInput-root': { bgcolor: alpha(theme.palette.warning.main, 0.06) },
                                      '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.warning.main },
                                    }}
                                  />
                                </Box>
                              )}

                              {/* Green Box for IP Phone (Yes) */}
                              {item.type?.toLowerCase() === 'boolean' && item.key === 'ip_phone' && answers[item.key] === 'yes' &&
                                greenNoteBox('ระบุหมายเลขโทรศัพท์ภายใน (Extension Number)', '📞', item)}

                              {/* Green Box for Windows Version (Yes) */}
                              {item.type?.toLowerCase() === 'boolean' && item.key === 'windows_version' && answers[item.key] === 'yes' &&
                                greenNoteBox('โปรดระบุเวอร์ชันของ Windows ที่ติดตั้ง', '🪟', item)}

                              {/* Green Box for Windows Update (winver) (Yes) */}
                              {item.type?.toLowerCase() === 'boolean' && item.key === 'windows_update' && answers[item.key] === 'yes' &&
                                greenNoteBox('โปรดระบุข้อมูลเวอร์ชัน (winver) และอัปเดตล่าสุด', '🔄', item)}

                              {/* Green Box for Microsoft Office (Yes) */}
                              {item.type?.toLowerCase() === 'boolean' && item.key === 'office_check' && answers[item.key] === 'yes' &&
                                greenNoteBox('โปรดระบุเวอร์ชันของ Microsoft Office ที่ติดตั้ง', '📄', item)}

                              {/* Note for Select physical/result */}
                              {['select_physical', 'select_result'].includes(item.type?.toLowerCase()) && (answers[item.key] === 'ชำรุดรอซ่อม' || answers[item.key] === 'ไม่ผ่านเกณฑ์') && (
                                <Box sx={{ mt: 0.5 }}>
                                  <TextField
                                    fullWidth size="small"
                                    placeholder={item.type?.toLowerCase() === 'select_physical' ? 'ระบุสาเหตุที่ชำรุด / อาการ...' : 'ระบุเหตุผลที่ไม่ผ่านเกณฑ์...'}
                                    value={answers[`${item.key}_note`] || ''}
                                    onChange={(e) => setAnswers((p: any) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
                                    sx={{
                                      '& .MuiOutlinedInput-root': { bgcolor: alpha(theme.palette.error.main, 0.04) },
                                      '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.error.main },
                                    }}
                                  />
                                </Box>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>

        {/* Footer Actions */}
        <Box sx={{
          px: 3, py: 1.5, borderTop: `1px solid ${theme.palette.divider}`,
          display: 'flex', justifyContent: 'flex-end', gap: 1.5, bgcolor: theme.palette.background.paper, flexShrink: 0,
        }}>
          <Button variant="outlined" onClick={onClose} sx={{ px: 2.5, fontWeight: 600, fontSize: 14 }}>
            ปิด
          </Button>
          {isDoneRun ? null : (
            <>
              <Button
                variant="outlined"
                onClick={() => handleSave('IN_PROGRESS')}
                disabled={saving}
                sx={{ px: 2.5, fontWeight: 600, fontSize: 14 }}
              >
                {saving ? '⏳...' : '💾 บันทึกร่าง'}
              </Button>
              <Button
                variant="contained" color="success"
                onClick={() => handleSave('COMPLETED')}
                disabled={saving}
                sx={{ px: 3, fontWeight: 600, fontSize: 14 }}
              >
                {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึกผล PM'}
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Modal>
  );
};
