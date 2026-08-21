import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, Typography, Button, Chip, CircularProgress, Alert, Snackbar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Accordion, AccordionSummary, AccordionDetails, alpha, useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import { RadioTower, Wand2, TriangleAlert, Monitor as MonitorIcon } from 'lucide-react';
import { assetAPI } from '../../services/api';
import { SectionCard } from '../../components/SectionCard';
import { MonitorCard, MonitorLinkList, MonitorRow, bucketColors } from './components/MonitorReconcile';

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

  /* ── Monitors ─────────────────────────────────────────────────────────
     Loaded on demand rather than with the page: the fleet scan is one
     upstream call per host, so it should only run when someone opens the
     tab that needs it. */
  const [tab, setTab] = React.useState<'specs' | 'monitors' | 'health'>('specs');

  /* ── สุขภาพเครื่องทั้งกอง ─────────────────────────────────────────
     สแกนทีละเครื่องกับ Agent จึงช้า โหลดเมื่อเปิดแท็บเท่านั้น */
  const [health, setHealth] = React.useState<any>(null);
  const [healthLoading, setHealthLoading] = React.useState(false);

  const loadHealth = React.useCallback(() => {
    setHealthLoading(true);
    assetAPI.agentHealth()
      .then(res => setHealth(res.data))
      .catch(() => setHealth(null))
      .finally(() => setHealthLoading(false));
  }, []);

  React.useEffect(() => {
    if (tab === 'health' && health === null && !healthLoading) loadHealth();
  }, [tab, health, healthLoading, loadHealth]);
  const [monRows, setMonRows] = React.useState<MonitorRow[] | null>(null);
  const [monLoading, setMonLoading] = React.useState(false);
  const [monBucket, setMonBucket] = React.useState<'FIX' | 'CREATE' | 'LINK' | 'OK' | 'MANUAL'>('FIX');

  const loadMonitors = React.useCallback(() => {
    setMonLoading(true);
    assetAPI.agentMonitors()
      .then(res => setMonRows(res.data?.rows || []))
      .catch(() => setMonRows([]))
      .finally(() => setMonLoading(false));
  }, []);

  React.useEffect(() => {
    if (tab === 'monitors' && monRows === null && !monLoading) loadMonitors();
  }, [tab, monRows, monLoading, loadMonitors]);

  const monCounts = React.useMemo(() => {
    const r = monRows || [];
    return {
      FIX: r.filter(x => x.bucket === 'FIX').length,
      CREATE: r.filter(x => x.bucket === 'CREATE').length,
      LINK: r.filter(x => x.linkable).length,
      OK: r.filter(x => x.bucket === 'OK').length,
      MANUAL: r.filter(x => x.bucket === 'MANUAL').length,
    };
  }, [monRows]);

  const monColors = bucketColors(theme);
  const MON_TABS: { k: 'FIX' | 'CREATE' | 'LINK' | 'OK' | 'MANUAL'; label: string; c: string }[] = [
    { k: 'FIX', label: 'ต้องซ่อมข้อมูล', c: monColors.FIX },
    { k: 'CREATE', label: 'ยังไม่มีในทะเบียน', c: monColors.CREATE },
    { k: 'LINK', label: 'ผูกจอกับเครื่อง', c: monColors.LINK },
    { k: 'OK', label: 'ตรงกันแล้ว', c: monColors.OK },
    { k: 'MANUAL', label: 'ทำมือเท่านั้น', c: monColors.MANUAL },
  ];

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

      <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
        {([['specs', 'สเปกเครื่อง'], ['monitors', 'จอภาพ'], ['health', 'สุขภาพเครื่อง']] as const).map(([k, label]) => (
          <Button key={k} size="small" variant={tab === k ? 'contained' : 'outlined'}
            onClick={() => setTab(k)}
            sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 600, fontSize: 11.5 }}>
            {label}
          </Button>
        ))}
      </Box>

      {tab === 'health' ? (
        <HealthPanel data={health} loading={healthLoading} reload={loadHealth} theme={theme} navigate={navigate} />
      ) : tab === 'monitors' ? (
        <MonitorsPanel
          rows={monRows} loading={monLoading} bucket={monBucket} setBucket={setMonBucket}
          counts={monCounts} tabs={MON_TABS} reload={loadMonitors} navigate={navigate} theme={theme}
        />
      ) : !available ? (
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

/**
 * The fleet monitor view. Split out so the page component stays about the
 * spec drift it was already doing, and because the buckets need their own
 * small amount of state.
 */
function MonitorsPanel({ rows, loading, bucket, setBucket, counts, tabs, reload, navigate, theme }: {
  rows: MonitorRow[] | null;
  loading: boolean;
  bucket: 'FIX' | 'CREATE' | 'LINK' | 'OK' | 'MANUAL';
  setBucket: (b: any) => void;
  counts: Record<string, number>;
  tabs: { k: any; label: string; c: string }[];
  reload: () => void;
  navigate: (to: string) => void;
  theme: any;
}) {
  if (loading || rows === null) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 6 }}>
        <CircularProgress size={18} />
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
          กำลังอ่านข้อมูลจอจาก Agent ทีละเครื่อง…
        </Typography>
      </Box>
    );
  }
  if (!rows.length) {
    return <Alert severity="warning">ยังไม่ได้ข้อมูลจอจาก Agent — ตรวจสอบการเชื่อมต่อที่ ตั้งค่า › เชื่อมต่อระบบภายนอก</Alert>;
  }

  const shown = bucket === 'LINK' ? rows.filter(r => r.linkable) : rows.filter(r => r.bucket === bucket);

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 1, mb: 1.5 }}>
        {[
          { label: 'จอนอกที่ Agent เห็น', value: rows.length, color: theme.palette.text.primary },
          { label: 'ต้องซ่อมข้อมูล', value: counts.FIX, color: bucketColors(theme).FIX },
          { label: 'ยังไม่มีในทะเบียน', value: counts.CREATE, color: bucketColors(theme).CREATE },
          { label: 'ผูกกับเครื่องได้', value: counts.LINK, color: bucketColors(theme).LINK },
        ].map(s => (
          <Box key={s.label} sx={{
            p: '9px 12px', borderRadius: '10px',
            bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`,
          }}>
            <Typography sx={{ fontSize: 21, fontWeight: 800, color: s.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {s.value}
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.4 }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.6, mb: 1.5, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <Button key={t.k} size="small" variant={bucket === t.k ? 'contained' : 'outlined'}
            onClick={() => setBucket(t.k)}
            sx={{
              borderRadius: '9px', textTransform: 'none', fontWeight: 600, fontSize: 11,
              ...(bucket === t.k
                ? { bgcolor: t.c, '&:hover': { bgcolor: t.c, filter: 'brightness(1.08)' } }
                : { borderColor: 'divider', color: 'text.secondary' }),
            }}>
            {t.label} ({counts[t.k] ?? 0})
          </Button>
        ))}
      </Box>

      <SectionCard title={tabs.find(t => t.k === bucket)?.label || ''} icon={MonitorIcon}>
        {bucket === 'LINK' ? (
          <MonitorLinkList rows={rows} onDone={reload} />
        ) : !shown.length ? (
          <Typography sx={{ py: 3, textAlign: 'center', color: 'text.disabled', fontSize: 11.5 }}>
            ไม่มีรายการในกลุ่มนี้
          </Typography>
        ) : (
          shown.map(r => (
            <MonitorCard key={`${r.host}-${r.monitor.serial || r.monitor.name}`} row={r} onDone={reload}
              onCreate={(row) => navigate(
                `/assets/new?type=${encodeURIComponent('Monitor มาตรฐาน')}` +
                `&serialNo=${encodeURIComponent(row.monitor.serial || '')}` +
                `&brand=${encodeURIComponent(row.monitor.manufacturer || '')}` +
                `&model=${encodeURIComponent(row.monitor.name || '')}`,
              )} />
          ))
        )}
        {bucket === 'MANUAL' && (
          <Typography sx={{
            mt: 1.25, fontSize: 10.5, color: 'text.secondary', p: '7px 10px',
            bgcolor: theme.palette.action.hover, borderRadius: '7px',
            borderLeft: `2px solid ${bucketColors(theme).MANUAL}`,
          }}>
            จอเหล่านี้ไม่ส่ง serial มา (EDID อ่านไม่ได้ หรือเป็นจอเก่า) — serial คือกุญแจเดียวที่ใช้จับคู่ได้
            จึงตรวจอัตโนมัติไม่ได้ แสดงไว้เพื่อไม่ให้ตกหล่น
          </Typography>
        )}
      </SectionCard>
    </>
  );
}

/**
 * สุขภาพเครื่องทั้งกองจากมุมของ Agent
 *
 * รวมสี่คำถามที่เคยต้องเปิดดูทีละเครื่อง: ควรดูแลเครื่องไหนก่อน · เครื่องไหนใกล้
 * ถึงเวลาเปลี่ยน · License ที่ใช้จริงเป็นแบบไหน · เครื่องไหนหยุดรายงาน
 */
function HealthPanel({ data, loading, reload, theme, navigate }: {
  data: any; loading: boolean; reload: () => void; theme: any; navigate: (p: string) => void;
}) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'center', py: 6 }}>
        <CircularProgress size={18} />
        <Typography sx={{ fontSize: 12 }}>กำลังสแกนเครื่องทั้งกอง — ใช้เวลาสักครู่</Typography>
      </Box>
    );
  }
  if (!data) {
    return (
      <Alert severity="warning" action={<Button size="small" onClick={reload}>ลองใหม่</Button>}>
        อ่านข้อมูลสุขภาพเครื่องจาก Agent ไม่สำเร็จ
      </Alert>
    );
  }

  const s = data.summary;
  const machines: any[] = data.machines || [];

  const tiles = [
    { v: s.total, l: 'เครื่องที่ Agent ดูแล', sub: `ออนไลน์ ${s.online}`, c: theme.palette.text.primary },
    { v: s.withCritical, l: 'มีเรื่องต้องแก้ด่วน', sub: 'ระดับ critical', c: theme.palette.error.main },
    { v: s.refreshCandidates, l: 'ควรพิจารณาเปลี่ยน', sub: 'OS ≥ 4 ปี · แบต < 50% · RAM < 8 GB', c: theme.palette.warning.main },
    { v: s.stale, l: 'หยุดรายงาน', sub: 'เกิน 14 วัน', c: s.stale ? theme.palette.error.main : theme.palette.success.main },
  ];

  const counters: { label: string; n: number; tone: 'error' | 'warning' | 'info' }[] = [
    { label: 'ไม่มี Antivirus', n: s.noAntivirus, tone: 'error' },
    { label: 'ยังไม่ Activate', n: s.notActivated, tone: 'error' },
    { label: 'แบตต่ำกว่า 80%', n: s.batteryBelow80, tone: 'warning' },
    { label: 'ดิสก์เหลือ < 15%', n: s.diskBelow15, tone: 'warning' },
    { label: 'Windows Update ค้าง', n: s.updateOutdated, tone: 'warning' },
    { label: 'ยังไม่มีในทะเบียน', n: s.unregistered, tone: 'info' },
  ];

  const breakdown = (title: string, map: Record<string, number>) => (
    <Box key={title} sx={{ flex: '1 1 200px', minWidth: 0 }}>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>{title}</Typography>
      {Object.entries(map).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
        <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.15 }}>
          <Typography sx={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{n}</Typography>
        </Box>
      ))}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 1 }}>
        {tiles.map(t => (
          <Card key={t.l} variant="outlined" sx={{ p: '9px 12px' }}>
            <Typography sx={{ fontSize: 21, fontWeight: 800, lineHeight: 1, color: t.c, fontVariantNumeric: 'tabular-nums' }}>{t.v}</Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.4 }}>{t.l}</Typography>
            <Typography sx={{ fontSize: 9.5, color: 'text.disabled', mt: 0.1 }}>{t.sub}</Typography>
          </Card>
        ))}
      </Box>

      <Card variant="outlined" sx={{ p: 1.4, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {counters.map(c => (
          <Chip key={c.label} size="small" variant="outlined"
            label={<>{c.label} <Box component="span" sx={{ fontWeight: 800 }}>{c.n}</Box></>}
            sx={{
              fontSize: 10.5,
              borderColor: c.n ? theme.palette[c.tone].main : theme.palette.divider,
              color: c.n ? theme.palette[c.tone].main : theme.palette.text.disabled,
            }} />
        ))}
      </Card>

      <SectionCard title="เรียงตามความเสี่ยง" icon={TriangleAlert}>
        <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mb: 1 }}>
          คะแนน = critical×10 + warn×3 + info×1 — เครื่องบนสุดคือเครื่องที่ควรได้รับการดูแลก่อน
        </Typography>
        <TableContainer sx={{ maxHeight: 460 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {['คะแนน', 'เครื่อง', 'บริษัท', 'ผู้ครอบครอง', 'อายุ OS', 'แบต', 'เรื่องที่พบ'].map(x => (
                  <TableCell key={x} sx={{ fontSize: 10, fontWeight: 700 }}>{x}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {machines.filter(m => m.riskScore > 0).map(m => (
                <TableRow key={m.hostname} hover
                  sx={{ cursor: m.assetId ? 'pointer' : 'default' }}
                  onClick={() => m.assetId && navigate(`/assets/${m.assetId}`)}>
                  <TableCell sx={{ fontSize: 12, fontWeight: 800, color: m.critical ? 'error.main' : 'warning.main', fontVariantNumeric: 'tabular-nums' }}>
                    {m.riskScore}
                  </TableCell>
                  <TableCell sx={{ fontSize: 11.5, fontWeight: 600 }}>
                    {m.hostname}
                    {!m.assetId && <Chip size="small" label="ไม่มีในทะเบียน" sx={{ ml: 0.5, height: 15, fontSize: 8.5 }} />}
                  </TableCell>
                  <TableCell sx={{ fontSize: 11 }}>{m.company || '—'}</TableCell>
                  <TableCell sx={{ fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.ownerName || '—'}</TableCell>
                  <TableCell sx={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{m.osAgeYears !== null ? `${m.osAgeYears} ปี` : '—'}</TableCell>
                  <TableCell sx={{ fontSize: 11, fontWeight: m.batteryPct !== null && m.batteryPct < 50 ? 800 : 400, color: m.batteryPct !== null && m.batteryPct < 50 ? 'error.main' : 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
                    {m.batteryPct !== null ? `${m.batteryPct}%` : '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 10 }}>
                    {(m.findings || []).slice(0, 3).map((f: any) => f.label).join(' · ')}
                    {(m.findings || []).length > 3 ? ` · +${m.findings.length - 3}` : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

      <SectionCard title="License ที่ใช้จริง และเวอร์ชัน Agent" icon={RadioTower}>
        <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mb: 1 }}>
          อ่านจากเครื่องจริง ใช้เทียบกับ License ที่ซื้อไว้ในเมนู License &amp; สัญญา
        </Typography>
        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
          {breakdown('Windows', s.winChannels)}
          {breakdown('Microsoft Office', s.officeLicenses)}
          {breakdown('เวอร์ชัน Agent', s.agentVersions)}
        </Box>
      </SectionCard>
    </Box>
  );
}
