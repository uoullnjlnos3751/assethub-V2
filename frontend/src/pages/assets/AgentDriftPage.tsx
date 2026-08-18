import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, CircularProgress, Alert, Snackbar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Accordion, AccordionSummary, AccordionDetails, alpha, useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import { RadioTower, Wand2, TriangleAlert } from 'lucide-react';
import { assetAPI } from '../../services/api';
import { SectionCard } from '../../components/SectionCard';

interface DriftField { field: string; label: string; value?: string; current?: string; incoming?: string }
interface Machine {
  hostname: string; online: boolean; lastSeen: string | null; matchedBy: string;
  assetId: number; assetCode: string | null; ownerName: string | null;
  blanks: DriftField[]; conflicts: DriftField[];
}
interface Unmatched { hostname: string; serialNo: string | null; model: string | null; brand: string | null; loggedUser: string | null; online: boolean }

const fmtSeen = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

/**
 * Fleet view of how far the asset registry has drifted from what the
 * monitoring agent reports.
 *
 * The two columns are deliberately different kinds of work: empty fields can
 * be filled in bulk because nothing can be lost, while a field where both
 * sides hold a value needs someone to decide which is right — those link out
 * to the asset's own comparison card rather than offering a bulk button.
 */
export default function AgentDriftPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [filling, setFilling] = useState(false);
  const [available, setAvailable] = useState(true);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [unmatched, setUnmatched] = useState<Unmatched[]>([]);
  const [totals, setTotals] = useState<{ machines: number; blanks: number; conflicts: number } | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const load = () => {
    setLoading(true);
    assetAPI.agentDrift()
      .then((res) => {
        setAvailable(res.data?.available !== false);
        setMachines(res.data?.machines || []);
        setUnmatched(res.data?.unmatched || []);
        setTotals(res.data?.totals || null);
      })
      .catch(() => setAvailable(false))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleFillBlanks = async () => {
    if (!window.confirm(`เติมข้อมูลในช่องที่ยังว่าง ${totals?.blanks ?? 0} ช่อง จากระบบ Agent?\n\nจะเติมเฉพาะช่องที่ว่างอยู่เท่านั้น ค่าที่มีอยู่แล้วจะไม่ถูกแก้`)) return;
    setFilling(true);
    try {
      const res = await assetAPI.agentFillBlanks();
      setToast({ open: true, message: res.data?.message || 'เติมข้อมูลเรียบร้อย', severity: 'success' });
      load();
    } catch (err: any) {
      setToast({ open: true, message: err.response?.data?.error || 'เติมข้อมูลไม่สำเร็จ', severity: 'error' });
    } finally {
      setFilling(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em' }}>ตรวจสอบข้อมูลจาก Agent</Typography>
          <Typography variant="body2" color="text.secondary">
            เทียบทะเบียนทรัพย์สินกับสิ่งที่ระบบ Agent เห็นจริงบนเครื่อง
          </Typography>
        </Box>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: 16 }} />} onClick={load} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
          รีเฟรช
        </Button>
      </Box>

      {!available ? (
        <Alert severity="warning">
          ยังเชื่อมต่อระบบ Agent ไม่ได้ — ตรวจสอบการตั้งค่าที่ ตั้งค่า › เชื่อมต่อระบบภายนอก
        </Alert>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: 2 }}>
            {[
              { label: 'เครื่องที่ Agent ดูแล', value: totals?.machines ?? 0, color: theme.palette.primary.main },
              { label: 'ช่องว่างที่เติมได้ทันที', value: totals?.blanks ?? 0, color: theme.palette.success.main },
              { label: 'ค่าที่ขัดกัน (ต้องตัดสินใจ)', value: totals?.conflicts ?? 0, color: theme.palette.warning.main },
            ].map((s) => (
              <Box key={s.label} sx={{
                p: '14px 16px', borderRadius: '14px',
                bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`,
              }}>
                <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value}</Typography>
                <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary }}>{s.label}</Typography>
              </Box>
            ))}
          </Box>

          {(totals?.blanks ?? 0) > 0 && (
            <Alert
              severity="success" icon={<Wand2 size={18} />} sx={{ mb: 2, alignItems: 'center' }}
              action={
                <Button
                  size="small" variant="contained" color="success" disabled={filling}
                  onClick={handleFillBlanks}
                  startIcon={filling ? <CircularProgress size={12} color="inherit" /> : undefined}
                  sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  {filling ? 'กำลังเติม...' : `เติมทั้งหมด (${totals?.blanks})`}
                </Button>
              }
            >
              มี {totals?.blanks} ช่องที่ทะเบียนยังว่างอยู่และ Agent มีข้อมูลให้ — เติมได้เลยโดยไม่ทับค่าเดิม
            </Alert>
          )}

          <SectionCard title="รายเครื่อง" icon={RadioTower}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700 }}>เครื่อง (hostname)</TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700 }}>ทะเบียน</TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700 }}>ผู้ครอบครอง</TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700 }} align="center">เติมได้</TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700 }} align="center">ขัดกัน</TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700 }}>พบล่าสุด</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {machines.length === 0 ? (
                    <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>ไม่มีเครื่องที่จับคู่กับทะเบียนได้</TableCell></TableRow>
                  ) : machines.map((m) => {
                    const clean = m.blanks.length === 0 && m.conflicts.length === 0;
                    return (
                      <TableRow key={m.hostname} hover>
                        <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: m.online ? theme.palette.success.main : theme.palette.text.disabled, flexShrink: 0 }} />
                            {m.hostname}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>
                          {m.assetCode || `#${m.assetId}`}
                          {m.matchedBy === 'serial' && (
                            <Chip label="จับคู่ด้วย Serial" size="small" sx={{ ml: 0.75, height: 16, fontSize: '0.6rem' }} />
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{m.ownerName || '—'}</TableCell>
                        <TableCell align="center">
                          {m.blanks.length > 0
                            ? <Chip label={m.blanks.length} size="small" color="success" variant="outlined" sx={{ height: 20, fontWeight: 700 }} />
                            : <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled' }}>—</Typography>}
                        </TableCell>
                        <TableCell align="center">
                          {m.conflicts.length > 0
                            ? <Chip label={m.conflicts.length} size="small" color="warning" variant="outlined" sx={{ height: 20, fontWeight: 700 }} />
                            : <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled' }}>—</Typography>}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.74rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>{fmtSeen(m.lastSeen)}</TableCell>
                        <TableCell align="right">
                          {clean
                            ? <Chip label="ตรงกันแล้ว" size="small" color="success" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} />
                            : <Button size="small" onClick={() => navigate(`/assets/${m.assetId}`)} sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.74rem' }}>ดู / แก้</Button>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {machines.some((m) => m.conflicts.length > 0) && (
              <Accordion disableGutters elevation={0} sx={{ mt: 1.5, bgcolor: 'transparent', '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ px: 0, minHeight: 0, '& .MuiAccordionSummary-content': { my: 1 } }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.warning.dark }}>
                    ดูรายละเอียดค่าที่ขัดกันทั้งหมด ({totals?.conflicts ?? 0})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 0 }}>
                  <TableContainer sx={{ maxHeight: 420 }}>
                    <Table size="small" stickyHeader>
                      <TableHead><TableRow>
                        <TableCell sx={{ fontSize: '0.7rem' }}>เครื่อง</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem' }}>ช่อง</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem' }}>ในทะเบียน</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem' }}>Agent เห็น</TableCell>
                      </TableRow></TableHead>
                      <TableBody>
                        {machines.flatMap((m) => m.conflicts.map((c) => (
                          <TableRow key={`${m.hostname}-${c.field}`} hover>
                            <TableCell sx={{ fontSize: '0.74rem' }}>{m.assetCode || m.hostname}</TableCell>
                            <TableCell sx={{ fontSize: '0.74rem', fontWeight: 600 }}>{c.label}</TableCell>
                            <TableCell sx={{ fontSize: '0.74rem', color: 'text.secondary', wordBreak: 'break-word' }}>{c.current || '—'}</TableCell>
                            <TableCell sx={{ fontSize: '0.74rem', color: theme.palette.success.dark, wordBreak: 'break-word' }}>{c.incoming || '—'}</TableCell>
                          </TableRow>
                        )))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            )}
          </SectionCard>

          {unmatched.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <SectionCard title="เครื่องที่ Agent เห็นแต่ยังไม่มีในทะเบียน" icon={TriangleAlert}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
                  จับคู่ไม่ได้ทั้งจากชื่อเครื่องและ Serial — อาจเป็นเครื่องใหม่ที่ยังไม่ได้ลงทะเบียน หรือเป็นเครื่องเสมือน
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead><TableRow>
                      <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700 }}>ชื่อเครื่อง</TableCell>
                      <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700 }}>ยี่ห้อ / รุ่น</TableCell>
                      <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700 }}>Serial</TableCell>
                      <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700 }}>ผู้ใช้ที่ล็อกอิน</TableCell>
                      <TableCell />
                    </TableRow></TableHead>
                    <TableBody>
                      {unmatched.map((u) => (
                        <TableRow key={u.hostname} hover>
                          <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{u.hostname}</TableCell>
                          <TableCell sx={{ fontSize: '0.78rem' }}>{[u.brand, u.model].filter(Boolean).join(' ') || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.72rem', fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: 220 }}>{u.serialNo || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{u.loggedUser || '—'}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small" variant="outlined"
                              onClick={() => navigate(`/assets/new?assetName=${encodeURIComponent(u.hostname)}&serialNo=${encodeURIComponent(u.serialNo || '')}`)}
                              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.74rem' }}
                            >
                              สร้างทะเบียน
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            </Box>
          )}

          <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', mt: 2, lineHeight: 1.8 }}>
            💡 ระบบจะเติมช่องที่ว่างจาก Agent ให้อัตโนมัติทุกวัน · ค่าที่ขัดกันจะไม่ถูกแตะต้อง รอให้เจ้าหน้าที่ตรวจสอบเสมอ
            (ปิดงานอัตโนมัติได้ด้วย <code>AGENT_AUTOFILL_ENABLED=false</code>)
          </Typography>
        </>
      )}

      <Snackbar open={toast.open} autoHideDuration={5000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} sx={{ width: '100%' }}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}
