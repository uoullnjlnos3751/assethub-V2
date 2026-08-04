import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  Avatar,
  alpha,
  useTheme,
} from '@mui/material';
import { pmAPI } from '../../../services/api';
import StatusChip from '../../../components/StatusChip';

/* ─── PM tab ──────────────────────────────────────────────────── */
export function PMTab({ asset, onReloadAsset }: { asset: any; onReloadAsset?: () => void }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const runs = asset.pmRuns || [];
  const currentYear = new Date().getFullYear();
  const [pmCheck, setPmCheck] = React.useState<any>(null);
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [templateDialog, setTemplateDialog] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<number | null>(null);
  const [starting, setStarting] = React.useState(false);
  const [pmError, setPmError] = React.useState('');

  React.useEffect(() => {
    pmAPI.adhocCheck(asset.id).then(r => setPmCheck(r.data)).catch(() => {});
    pmAPI.templates().then(r => setTemplates(r.data || [])).catch(() => {});
  }, [asset.id]);

  const handleStartPM = async () => {
    if (!selectedTemplate) { setPmError('กรุณาเลือก Template PM'); return; }
    setStarting(true);
    setPmError('');
    try {
      const resp = await pmAPI.adhocCreate({ assetId: asset.id, templateId: selectedTemplate });
      const runId = resp.data?.run?.id;
      setTemplateDialog(false);
      if (runId) navigate(`/pm/runs?runId=${runId}`);
    } catch (e: any) {
      setPmError(e.response?.data?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setStarting(false);
    }
  };

  const thisYearRun = pmCheck?.existingRun;
  const isEligible = pmCheck?.eligible;
  const isInProgress = thisYearRun && thisYearRun.status !== 'COMPLETED';
  const isDoneThisYear = thisYearRun && thisYearRun.status === 'COMPLETED';

  const templateDialogEl = (
    <Dialog open={templateDialog} onClose={() => setTemplateDialog(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>เลือก Template PM</DialogTitle>
      <DialogContent>
        {pmError && <Alert severity="error" sx={{ mb: 1 }}>{pmError}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
          {templates.filter(t => !t.year || t.year === currentYear || t.year === currentYear + 543).map((t: any) => (
            <Box key={t.id} onClick={() => setSelectedTemplate(t.id)} sx={{ p: 1.5, borderRadius: 2, border: '2px solid', borderColor: selectedTemplate === t.id ? 'primary.main' : 'divider', cursor: 'pointer', bgcolor: selectedTemplate === t.id ? alpha(theme.palette.primary.main, 0.07) : 'transparent', transition: 'all 0.15s' }}>
              <Typography variant="body2" fontWeight={600}>{t.name}</Typography>
              <Typography variant="caption" color="text.secondary">ปี {t.year} · {t.templateItems?.length ?? 0} รายการ</Typography>
            </Box>
          ))}
          {templates.length === 0 && <Typography variant="body2" color="text.secondary">ไม่มี Template PM</Typography>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setTemplateDialog(false)} disabled={starting}>ยกเลิก</Button>
        <Button onClick={handleStartPM} variant="contained" disabled={starting || !selectedTemplate}>{starting ? 'กำลังสร้าง...' : 'เริ่มทำ PM'}</Button>
      </DialogActions>
    </Dialog>
  );

  const pmActionBar = (
    <Box sx={{ mb: 2.5, p: 2.5, borderRadius: 3, bgcolor: (t) => alpha(t.palette.primary.main, 0.05), border: '1px solid', borderColor: (t) => alpha(t.palette.primary.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
      <Box>
        <Typography variant="body2" fontWeight={700} color="text.primary">สถานะ PM ปี {currentYear + 543}</Typography>
        <Typography variant="caption" color="text.secondary">
          {!pmCheck ? 'กำลังตรวจสอบ...' :
            isDoneThisYear ? 'ทำ PM เสร็จแล้วปีนี้' :
            isInProgress ? `กำลังดำเนินการ (Run #${thisYearRun.id})` :
            'ยังไม่ได้ทำ PM ปีนี้'}
        </Typography>
      </Box>
      {pmCheck && !isDoneThisYear && (
        isInProgress ? (
          <Button variant="contained" color="warning" size="small" onClick={() => navigate(`/pm/runs?runId=${thisYearRun.id}`)} sx={{ fontWeight: 700, borderRadius: 2 }}>
            ทำ PM ต่อ
          </Button>
        ) : (
          <Button variant="contained" size="small" onClick={() => { setTemplateDialog(true); setPmError(''); }} sx={{ fontWeight: 700, borderRadius: 2 }}>
            เริ่มทำ PM
          </Button>
        )
      )}
    </Box>
  );

  if (runs.length === 0) return (
    <Card sx={{ p: 3 }}>
      {pmActionBar}
      <Typography variant="body2" color="text.secondary" textAlign="center">ยังไม่มีประวัติ PM</Typography>
      {templateDialogEl}
    </Card>
  );

  return (
    <Card sx={{ p: 2.5 }}>
      {pmActionBar}
      {templateDialogEl}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {runs.map((r: any) => {
          const performer = r.performer?.displayName || r.performer?.adUsername || r.performer?.username || '-';
          return (
            <Box key={r.id} sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={700} color="text.primary">
                    PM ปี {r.year}
                  </Typography>
                  <StatusChip status={r.status} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Avatar sx={{ width: 20, height: 20, fontSize: '9px', fontWeight: 700, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                    {performer.substring(0, 2).toUpperCase()}
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">
                    {performer} · {r.completedAt ? new Date(r.completedAt).toLocaleDateString('th-TH') : (r.performedAt ? new Date(r.performedAt).toLocaleDateString('th-TH') : '-')}
                    {r.updatedAt && r.createdAt && new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime() > 2000 ? ` (อัปเดตเมื่อ: ${new Date(r.updatedAt).toLocaleString('th-TH')})` : ''}
                  </Typography>
                </Box>
              </Box>

              {(() => {
                const answers = r.answers || [];
                // Handle legacy data where r.checklist/r.score might still exist directly
                const legacyChecklist = r.checklist || [];
                const legacyScore = r.score;

                const checklist = answers.filter((a: any) => a.item?.type === 'boolean' || a.item?.key === 'monitor');
                const scoreAnswer = answers.find((a: any) => a.item?.key === 'satisfaction');
                const score = scoreAnswer ? parseInt(scoreAnswer.value) : legacyScore;
                const issueNote = answers.find((a: any) => a.item?.key === 'issue_note')?.value;
                const physicalStatus = answers.find((a: any) => a.item?.key === 'physical_condition')?.value;
                const speedStatus = answers.find((a: any) => a.item?.key === 'speed_performance')?.value;
                const pmResult = answers.find((a: any) => a.item?.key === 'pm_result')?.value;

                return (
                  <>
                    {(pmResult || physicalStatus || speedStatus) && (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5, mb: 1 }}>
                        {pmResult && (
                          <Typography variant="caption" sx={{
                            color: pmResult === 'ผ่านเกณฑ์' ? 'success.main' : pmResult === 'แก้ไขเรียบร้อย' ? 'warning.main' : 'error.main',
                            fontWeight: 700
                          }}>
                            ผลตรวจ: {pmResult}
                          </Typography>
                        )}
                        {physicalStatus && (
                          <Typography variant="caption" color="text.secondary">
                            กายภาพ: {physicalStatus}
                          </Typography>
                        )}
                        {speedStatus && (
                          <Typography variant="caption" color="text.secondary">
                            ความเร็ว: {speedStatus}
                          </Typography>
                        )}
                      </Box>
                    )}

                    {(checklist.length > 0 || legacyChecklist.length > 0) && (
                      <Grid container spacing={1} sx={{ mt: 1 }}>
                        {(checklist.length > 0 ? checklist : legacyChecklist).map((c: any) => {
                          const isMonitor = c.item?.type === 'monitor_array' || c.item?.key === 'monitor';
                          let isChecked = false;
                          let monitorList: any[] = [];

                          if (isMonitor && c.value && c.value.startsWith('[')) {
                            try {
                              monitorList = JSON.parse(c.value);
                              isChecked = Array.isArray(monitorList) && monitorList.length > 0;
                            } catch(e) {
                              isChecked = false;
                            }
                          } else {
                            isChecked = c.value ? (c.value === 'true' || c.value === 'yes') : c.checked;
                          }

                          const label = c.item?.label || c.label || c.item?.key;
                          return (
                            <Grid item xs={12} sm={isMonitor && monitorList.length > 0 ? 12 : 6} md={isMonitor && monitorList.length > 0 ? 12 : 4} key={c.id ?? c.item?.key ?? c.label}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <Box sx={{
                                  width: 16,
                                  height: 16,
                                  mt: 0.25,
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                  bgcolor: (t) => alpha(isChecked ? t.palette.success.main : t.palette.error.main, 0.12),
                                  color: isChecked ? 'success.main' : 'error.main',
                                  border: '1px solid',
                                  borderColor: (t) => alpha(isChecked ? t.palette.success.main : t.palette.error.main, 0.25),
                                }}>
                                  {isChecked ? '✓' : '✗'}
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.primary">
                                    {label}
                                  </Typography>
                                  {isMonitor && monitorList.length > 0 && (
                                    <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5, pl: 0.5, borderLeft: '1px dashed', borderColor: 'divider' }}>
                                      {monitorList.map((m: any, idx: number) => (
                                        <Typography key={idx} variant="caption" sx={{ color: 'text.secondary', fontSize: '10px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                                          {m.assetCode || 'ไม่มีชื่อ/รหัส'} {m.serial ? `(SN: ${m.serial})` : ''}
                                        </Typography>
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              </Box>
                            </Grid>
                          );
                        })}
                      </Grid>
                    )}

                    {issueNote && (
                      <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" fontWeight={700} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          ปัญหา/ข้อเสนอแนะ:
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                          "{issueNote}"
                        </Typography>
                      </Box>
                    )}

                    {score != null && (
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mt: 1.5,
                        pt: 1.5,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        fontSize: '11px',
                        color: 'text.secondary'
                      }}>
                        <Typography variant="caption" color="warning.main" sx={{ fontSize: 13, letterSpacing: 1 }}>
                          {'★'.repeat(score)}{'☆'.repeat(5 - score)}
                        </Typography>
                        <Typography variant="caption" fontWeight={700} color="text.primary">
                          {score}/5
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          · ความพึงพอใจผู้ใช้
                        </Typography>
                      </Box>
                    )}
                  </>
                );
              })()}
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}
