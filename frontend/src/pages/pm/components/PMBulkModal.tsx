import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Select, MenuItem, FormControl, alpha, useTheme,
} from '@mui/material';
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
  const theme = useTheme();
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

  const BOOLEAN_OPTS: { val: string; lbl: string }[] = [
    { val: 'yes', lbl: '✓ ใช่' },
    { val: 'no', lbl: '✗ ไม่' },
    { val: 'na', lbl: '— N/A' },
  ];
  const boolColor = (val: string) => val === 'yes' ? theme.palette.success.main : val === 'no' ? theme.palette.error.main : theme.palette.text.secondary;

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth={760}
      title={`🔧 บันทึก PM แบบกลุ่ม (${selectedRunIds.length} รายการ)`}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '80vh' }}>
        {/* Alert banner */}
        <Box sx={{
          bgcolor: alpha(theme.palette.warning.main, 0.08),
          borderBottom: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
          px: 3, py: 1.5, fontSize: 12, color: theme.palette.warning.dark, fontWeight: 500,
          display: 'flex', gap: 1, alignItems: 'center',
        }}>
          ⚠️ ข้อความนี้จะถูกบันทึกไปยังรายการอุปกรณ์ที่เลือก {selectedRunIds.length} รายการ
          และสถานะจะเป็น 'เสร็จแล้ว (COMPLETED)' โดยอัตโนมัติ
        </Box>

        {/* Quick Actions */}
        <Box sx={{
          px: 3, py: 1.75, borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, gap: 1.5,
          bgcolor: theme.palette.background.default,
        }}>
          <Button size="small" variant="outlined" onClick={() => setAll('yes')}>✓ ทำทั้งหมด (Yes)</Button>
          <Button size="small" variant="outlined" onClick={() => setAnswers({})}>↺ ล้างข้อมูล</Button>
        </Box>

        {/* Checklist Scrollable Body */}
        <Box sx={{ p: 3, overflowY: 'auto', flex: 1, bgcolor: theme.palette.background.default }}>
          <Box sx={{ bgcolor: theme.palette.background.paper, borderRadius: '12px', border: `1px solid ${theme.palette.divider}`, p: 2 }}>
            {groups.map((group: any) => {
              const groupItems = items.filter((i: any) => i.group === group);
              const gi = GROUP_INFO[group] || { label: group, icon: '📌' };
              return (
                <Box key={group} sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: theme.palette.text.primary, mb: 1 }}>{gi.icon} {gi.label}</Typography>
                  {groupItems.map((item: any) => (
                    <Box key={item.key} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 1.5, py: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
                      <Box sx={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, mt: 0.25,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: theme.palette.text.secondary, bgcolor: theme.palette.action.hover,
                      }}>
                        {items.indexOf(item) + 1}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 220 }}>
                        <Typography sx={{ fontSize: 13, color: theme.palette.text.primary, fontWeight: 500 }}>{item.label}</Typography>
                        {item.type?.toLowerCase() === 'text' && (
                          <TextField
                            fullWidth multiline minRows={3} size="small" sx={{ mt: 1 }}
                            placeholder={item.key === 'issue_note' ? 'ระบุข้อเสนอแนะหรือปัญหาที่พบ...' : 'ระบุรายละเอียด...'}
                            value={answers[item.key] || ''}
                            onChange={(e) => setAnswers((p) => ({ ...p, [item.key]: e.target.value }))}
                          />
                        )}
                        {item.type?.toLowerCase() === 'rating' && (
                          <Box sx={{ mt: 1 }}>
                            <StarRating value={parseInt(answers[item.key] || '0')} onChange={(v) => setAnswers((p) => ({ ...p, [item.key]: String(v) }))} />
                          </Box>
                        )}
                        {['select', 'select_physical', 'select_speed', 'select_result'].includes(item.type?.toLowerCase()) && (() => {
                          const isDefect = ['select_physical', 'select_result'].includes(item.type?.toLowerCase()) && (answers[item.key] === 'ชำรุดรอซ่อม' || answers[item.key] === 'ไม่ผ่านเกณฑ์');
                          return (
                            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                              <Select
                                displayEmpty
                                value={answers[item.key] || ''}
                                onChange={(e) => setAnswers((p) => ({ ...p, [item.key]: e.target.value }))}
                                sx={isDefect ? {
                                  '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.error.main, borderWidth: '2px' },
                                  bgcolor: alpha(theme.palette.error.main, 0.06),
                                } : undefined}
                              >
                                <MenuItem value=""><em>-- กรุณาเลือก --</em></MenuItem>
                                {item.type?.toLowerCase() === 'select_physical' && ['สภาพปกติ', 'ชำรุดเล็กน้อย', 'ชำรุดรอซ่อม', 'หมดสภาพ'].map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                {item.type?.toLowerCase() === 'select_speed' && ['เร็วปกติ', 'เริ่มหน่วงหนืด', 'ช้ามาก'].map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                {item.type?.toLowerCase() === 'select_result' && ['ผ่านเกณฑ์', 'แก้ไขเรียบร้อย', 'ไม่ผ่านเกณฑ์'].map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                {item.type?.toLowerCase() === 'select' && item.options?.split(',').map((opt: string) => opt.trim()).filter(Boolean).map((opt: string) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                              </Select>
                            </FormControl>
                          );
                        })()}
                        {item.type?.toLowerCase() === 'monitor_array' && (
                          <Box sx={{ mt: 1 }}>
                            <PMDeviceArrayInput
                              type="monitor"
                              value={answers[item.key] || ''}
                              onChange={(v) => setAnswers((p) => ({ ...p, [item.key]: v }))}
                              parentAsset={firstRun?.asset}
                            />
                          </Box>
                        )}
                        {item.type?.toLowerCase() === 'printer_array' && (
                          <Box sx={{ mt: 1 }}>
                            <PMDeviceArrayInput
                              type="printer"
                              value={answers[item.key] || ''}
                              onChange={(v) => setAnswers((p) => ({ ...p, [item.key]: v }))}
                              parentAsset={firstRun?.asset}
                            />
                          </Box>
                        )}
                      </Box>
                      {item.type?.toLowerCase() === 'boolean' && (
                        <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
                          {BOOLEAN_OPTS.map((opt) => {
                            const selected = answers[item.key] === opt.val;
                            const c = boolColor(opt.val);
                            return (
                              <Button
                                key={opt.val}
                                size="small"
                                variant={selected ? 'contained' : 'outlined'}
                                onClick={() => setAnswers((p) => ({ ...p, [item.key]: opt.val }))}
                                sx={selected ? { bgcolor: c, '&:hover': { bgcolor: c } } : { color: c, borderColor: alpha(c, 0.4) }}
                              >
                                {opt.lbl}
                              </Button>
                            );
                          })}
                        </Box>
                      )}

                      {/* Inline Note for No/NA */}
                      {item.type?.toLowerCase() === 'boolean' && (answers[item.key] === 'no' || answers[item.key] === 'na') && (
                        <Box sx={{ width: '100%', pl: '38px', mt: 0.5 }}>
                          <TextField
                            fullWidth size="small"
                            placeholder="ระบุสาเหตุประกอบการเลือกไม่ใช่หรือไม่ระบุ..."
                            value={answers[`${item.key}_note`] || ''}
                            onChange={(e) => setAnswers((p) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
                            sx={{
                              '& .MuiOutlinedInput-root': { bgcolor: alpha(theme.palette.warning.main, 0.06) },
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.warning.main },
                            }}
                          />
                        </Box>
                      )}

                      {/* Green Box for IP Phone (Yes) */}
                      {item.type?.toLowerCase() === 'boolean' && item.key === 'ip_phone' && answers[item.key] === 'yes' && (
                        <Box sx={{ width: '100%', pl: '38px', mt: 0.5 }}>
                          <Box sx={{
                            bgcolor: alpha(theme.palette.success.main, 0.08), border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
                            borderRadius: '8px', p: '10px 14px', display: 'flex', flexDirection: 'column', gap: 0.75,
                          }}>
                            <Typography sx={{ fontSize: 10, color: theme.palette.success.dark, fontWeight: 600 }}>📞 ระบุหมายเลขโทรศัพท์ภายใน (Extension Number)</Typography>
                            <TextField
                              fullWidth size="small"
                              placeholder="ตัวอย่าง: 1035, 1036..."
                              value={answers[`${item.key}_note`] || ''}
                              onChange={(e) => setAnswers((p) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
                              sx={{ '& .MuiOutlinedInput-root': { bgcolor: theme.palette.background.paper } }}
                            />
                          </Box>
                        </Box>
                      )}
                      {['select_physical', 'select_result'].includes(item.type?.toLowerCase()) && (answers[item.key] === 'ชำรุดรอซ่อม' || answers[item.key] === 'ไม่ผ่านเกณฑ์') && (
                        <Box sx={{ width: '100%', pl: '38px', mt: 0.5 }}>
                          <TextField
                            fullWidth size="small"
                            placeholder={item.type?.toLowerCase() === 'select_physical' ? 'ระบุสาเหตุที่ชำรุด / อาการ...' : 'ระบุเหตุผลที่ไม่ผ่านเกณฑ์...'}
                            value={answers[`${item.key}_note`] || ''}
                            onChange={(e) => setAnswers((p) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
                            sx={{
                              '& .MuiOutlinedInput-root': { bgcolor: alpha(theme.palette.warning.main, 0.06) },
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.warning.main },
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Footer Actions */}
        <Box sx={{
          px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}`,
          display: 'flex', justifyContent: 'flex-end', gap: 1.25, flexShrink: 0, bgcolor: theme.palette.background.paper,
        }}>
          <Button variant="outlined" onClick={onClose}>ปิด</Button>
          <Button variant="contained" onClick={handleBulkSave} disabled={saving}>
            {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึกผล PM ทั้งหมด'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};
