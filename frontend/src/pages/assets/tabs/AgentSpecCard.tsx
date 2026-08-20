import React, { useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button, IconButton, CircularProgress,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Accordion, AccordionSummary, AccordionDetails, TextField, InputAdornment,
  LinearProgress, alpha, useTheme,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { assetAPI } from '../../../services/api';
import { MonitorCard, MonitorRow, bucketColors } from '../components/MonitorReconcile';

/** ป้ายผลการเทียบจอกับทะเบียน — ให้ตรงกับ bucket ใน services/agentMonitors.ts */
const MON_STATUS: Record<string, string> = {
  FIX: 'ต้องซ่อมข้อมูล', CREATE: 'ยังไม่มีในทะเบียน', OK: 'ตรงกัน', MANUAL: 'ไม่มี S/N',
};

/** Fields the backend's mapAgentToAssetSpec can write, in display order. */
const FIELD_LABELS: { key: string; label: string }[] = [
  { key: 'brand', label: 'ยี่ห้อ' },
  { key: 'model', label: 'รุ่น' },
  { key: 'snComputer', label: 'Serial (เครื่อง)' },
  { key: 'cpu', label: 'CPU' },
  { key: 'ram', label: 'RAM' },
  { key: 'ramSlot1', label: 'RAM Slot 1' },
  { key: 'ramSlot2', label: 'RAM Slot 2' },
  { key: 'ramType', label: 'ชนิด RAM' },
  { key: 'ramSpeed', label: 'ความเร็ว RAM' },
  { key: 'gpu', label: 'การ์ดจอ' },
  { key: 'osType', label: 'ระบบปฏิบัติการ' },
  { key: 'osVersion', label: 'เวอร์ชัน OS' },
  { key: 'officeLicense', label: 'MS Office' },
  { key: 'antivirusStatus', label: 'Antivirus' },
  { key: 'domainName', label: 'Domain' },
];

/**
 * Mirrors agentValueSatisfied() in backend/src/routes/assets.ts — keep the two
 * in step or the row will claim a difference that "ปรับปรุงทั้งหมด" then skips.
 *
 * "Already contains it" counts as satisfied because the registry is frequently
 * the more specific side: it stores "NVIDIA GeForce MX550 (2 GB)" where the
 * agent only sees "NVIDIA GeForce MX550".
 */
const satisfied = (current: any, incoming: any) => {
  const cur = String(current ?? '').trim().toLowerCase();
  const next = String(incoming ?? '').trim().toLowerCase();
  if (!next) return true;
  return cur === next || (cur.length > next.length && cur.includes(next));
};

/**
 * Side-by-side of what the registry holds against what the monitoring agent
 * currently reports, with a per-field apply button.
 *
 * Per-field rather than one overwrite because the agent is not simply more
 * up to date — for several fields the registry's value is the better one
 * (nominal disk size vs formatted, product key vs "Licensed", a person's name
 * vs their Windows login). Those are excluded from the comparison entirely and
 * shown as read-only monitoring data further down instead.
 */
export function AgentSpecCard({ agent, spec, asset, syncing, onSync }: {
  agent: any;
  spec: Record<string, string | null>;
  asset: any;
  syncing?: boolean;
  onSync?: (field?: string, label?: string) => void;
}) {
  const theme = useTheme();
  const [softwareQuery, setSoftwareQuery] = useState('');

  const rows = useMemo(
    () => FIELD_LABELS.filter(f => spec?.[f.key] != null).map(f => ({
      ...f,
      current: asset?.[f.key] ?? '',
      incoming: spec[f.key] as string,
      matches: satisfied(asset?.[f.key], spec[f.key]),
    })),
    [spec, asset],
  );
  const diffCount = rows.filter(r => !r.matches).length;

  const software: { name: string; version?: string }[] = agent?.software || [];
  const filteredSoftware = useMemo(() => {
    const q = softwareQuery.trim().toLowerCase();
    if (!q) return software;
    return software.filter(s => String(s.name || '').toLowerCase().includes(q));
  }, [software, softwareQuery]);

  /* ── Reconciling the attached monitors ───────────────────────────────
     The table below has always listed what the agent sees. What it could
     not say is whether any of it matches the registry, so a wrong brand or
     a stray character in an IT code sat here in plain sight for months.
     The comparison is fetched only when someone opens the section. */
  const navigate = useNavigate();
  const [monRows, setMonRows] = useState<MonitorRow[] | null>(null);
  const [monLoading, setMonLoading] = useState(false);
  const [openSerial, setOpenSerial] = useState<string | null>(null);
  const monColors = bucketColors(theme);

  const loadMonitorCheck = () => {
    if (monRows !== null || monLoading || !asset?.id) return;
    setMonLoading(true);
    assetAPI.assetAgentMonitors(asset.id)
      .then(res => setMonRows(res.data?.rows || []))
      .catch(() => setMonRows([]))
      .finally(() => setMonLoading(false));
  };

  /** The reconcile row for one monitor, matched on the only stable key it has. */
  const checkFor = (serial: any): MonitorRow | undefined =>
    serial ? (monRows || []).find(r => r.monitor.serial === serial) : undefined;

  const disks = agent?.disks || [];
  const monitors = agent?.monitors || [];
  const printers = agent?.printers || [];

  return (
    <Card sx={{ overflow: 'hidden' }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
        p: '12px 18px', borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: alpha(theme.palette.success.main, 0.06), flexWrap: 'wrap',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem', color: theme.palette.success.dark }}>
            สเปกจริงจากระบบ Agent
          </Typography>
          <Chip
            size="small"
            label={agent?.online ?? agent?.status === 'online' ? 'ออนไลน์' : 'ออฟไลน์'}
            sx={{
              height: 20, fontSize: '0.68rem', fontWeight: 700,
              bgcolor: alpha(agent?.online ? theme.palette.success.main : theme.palette.text.disabled, 0.14),
              color: agent?.online ? theme.palette.success.dark : theme.palette.text.secondary,
            }}
          />
          {diffCount > 0 && (
            <Chip size="small" color="warning" variant="outlined" label={`ต่างกัน ${diffCount} รายการ`} sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} />
          )}
        </Box>
        {onSync && diffCount > 0 && (
          <Button
            variant="contained" color="success" size="small"
            onClick={() => onSync()}
            disabled={syncing}
            startIcon={syncing ? <CircularProgress size={10} color="inherit" /> : <SyncIcon sx={{ fontSize: 14 }} />}
            sx={{ borderRadius: '6px', textTransform: 'none', fontWeight: 600, fontSize: '0.7rem', py: 0.5, px: 1.5 }}
          >
            {syncing ? 'กำลังปรับปรุง...' : `ปรับปรุงทั้งหมด (${diffCount})`}
          </Button>
        )}
      </Box>

      <CardContent sx={{ p: '12px 18px !important' }}>
        {rows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">Agent ยังไม่ได้รายงานสเปกของเครื่องนี้</Typography>
        ) : (
          <Box>
            {rows.map(r => (
              <Box key={r.key} sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 1, py: 1, borderBottom: '1px solid', borderColor: 'divider',
                '&:last-of-type': { borderBottom: 'none' },
              }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', width: '22%', fontSize: '0.8rem', flexShrink: 0 }}>
                  {r.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, width: '34%', fontSize: '0.8rem', wordBreak: 'break-word' }}>
                  {r.current || '—'}
                </Typography>
                <Box sx={{ width: '44%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  {r.matches ? (
                    <Chip label="ตรงกัน" color="success" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.7rem', fontWeight: 600 }} />
                  ) : (
                    <>
                      <Box sx={{ minWidth: 0 }}>
                        <Chip label="ไม่ตรงกัน" color="warning" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.7rem', fontWeight: 600 }} />
                        <Typography variant="caption" sx={{ display: 'block', color: 'success.dark', fontWeight: 600, fontSize: '0.7rem', wordBreak: 'break-word' }}>
                          Agent: {r.incoming}
                        </Typography>
                      </Box>
                      {onSync && (
                        <IconButton
                          size="small" disabled={syncing}
                          onClick={() => onSync(r.key, r.label)}
                          sx={{ color: 'success.main', flexShrink: 0 }}
                          title={`ใช้ค่าจาก Agent สำหรับ ${r.label}`}
                        >
                          <SyncIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                    </>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* ── Read-only monitoring data: real but not the registry's own record ── */}
        {disks.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>พื้นที่ดิสก์ (ใช้งานจริง)</Typography>
            {disks.map((d: any) => {
              const pct = Number(d.used_pct) || 0;
              const color = pct >= 90 ? theme.palette.error.main : pct >= 75 ? theme.palette.warning.main : theme.palette.success.main;
              return (
                <Box key={d.drive} sx={{ mt: 0.75 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '0.75rem' }}>{d.drive} · {d.total_gb} GB (เหลือ {d.free_gb} GB)</Typography>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color }}>{pct}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={Math.min(100, pct)} sx={{
                    height: 6, borderRadius: 999, mt: 0.25,
                    bgcolor: alpha(color, 0.15), '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 999 },
                  }} />
                </Box>
              );
            })}
          </Box>
        )}

        {monitors.length > 0 && (
          <Accordion disableGutters elevation={0} onChange={(_, expanded) => expanded && loadMonitorCheck()}
            sx={{ mt: 1.5, bgcolor: 'transparent', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, px: 0, '& .MuiAccordionSummary-content': { my: 1 } }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>จอที่ต่ออยู่ ({monitors.length})</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow>
                    <TableCell sx={{ fontSize: '0.7rem' }}>รุ่น</TableCell>
                    <TableCell sx={{ fontSize: '0.7rem' }}>ชนิด</TableCell>
                    <TableCell sx={{ fontSize: '0.7rem' }}>Serial</TableCell>
                    <TableCell sx={{ fontSize: '0.7rem' }}>พอร์ต</TableCell>
                    <TableCell sx={{ fontSize: '0.7rem' }}>ปี</TableCell>
                    <TableCell sx={{ fontSize: '0.7rem' }} align="right">ทะเบียน</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {monitors.map((m: any, i: number) => {
                      const check = checkFor(m.serial);
                      const open = !!check && openSerial === m.serial;
                      return (
                        <React.Fragment key={i}>
                          <TableRow>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{m.name || '—'}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{m.type === 'Internal' ? 'จอในตัว' : 'จอนอก'}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{m.serial || '—'}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{m.port || '—'}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{m.year || '—'}</TableCell>
                            <TableCell align="right" sx={{ py: 0.3 }}>
                              {/* จอในตัวไม่ใช่ทรัพย์สินแยก จึงไม่มีอะไรให้เทียบ */}
                              {m.type === 'Internal' ? (
                                <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>—</Typography>
                              ) : monLoading ? (
                                <CircularProgress size={13} />
                              ) : !check ? (
                                <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>—</Typography>
                              ) : check.bucket === 'FIX' || check.bucket === 'CREATE' ? (
                                <Button size="small" onClick={() => setOpenSerial(open ? null : m.serial)}
                                  sx={{ fontSize: 10, py: 0.1, minWidth: 0, fontWeight: 700, textTransform: 'none',
                                        color: monColors[check.bucket] }}>
                                  {MON_STATUS[check.bucket]}
                                </Button>
                              ) : (
                                <Chip size="small" label={MON_STATUS[check.bucket]}
                                  sx={{ height: 17, fontSize: 9, fontWeight: 700,
                                        bgcolor: alpha(monColors[check.bucket], 0.14), color: monColors[check.bucket] }} />
                              )}
                            </TableCell>
                          </TableRow>
                          {open && check && (
                            <TableRow>
                              <TableCell colSpan={6} sx={{ py: 1, borderBottom: 0, bgcolor: 'transparent' }}>
                                <MonitorCard row={check} compact
                                  onDone={() => { setMonRows(null); setOpenSerial(null); }}
                                  onCreate={(row) => navigate(
                                    `/assets/new?type=${encodeURIComponent('Monitor มาตรฐาน')}` +
                                    `&serialNo=${encodeURIComponent(row.monitor.serial || '')}` +
                                    `&brand=${encodeURIComponent(row.monitor.manufacturer || '')}` +
                                    `&model=${encodeURIComponent(row.monitor.name || '')}`,
                                  )} />
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        )}

        {printers.length > 0 && (
          <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, px: 0, '& .MuiAccordionSummary-content': { my: 1 } }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>เครื่องพิมพ์ที่ติดตั้ง ({printers.length})</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <TableContainer sx={{ maxHeight: 260 }}>
                <Table size="small" stickyHeader>
                  <TableHead><TableRow>
                    <TableCell sx={{ fontSize: '0.7rem' }}>ชื่อ</TableCell>
                    <TableCell sx={{ fontSize: '0.7rem' }}>ไดรเวอร์</TableCell>
                    <TableCell sx={{ fontSize: '0.7rem' }}>เครือข่าย</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {printers.map((p: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          {p.name || '—'}
                          {p.is_default ? <Chip label="ค่าเริ่มต้น" size="small" sx={{ ml: 0.75, height: 16, fontSize: '0.62rem' }} /> : null}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{p.driver || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{p.is_network ? 'ใช่' : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        )}

        {software.length > 0 && (
          <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, px: 0, '& .MuiAccordionSummary-content': { my: 1 } }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>ซอฟต์แวร์ที่ติดตั้ง ({software.length})</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <TextField
                size="small" fullWidth placeholder="ค้นหาชื่อโปรแกรม..."
                value={softwareQuery}
                onChange={(e) => setSoftwareQuery(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment> }}
                sx={{ mb: 1 }}
              />
              <TableContainer sx={{ maxHeight: 320 }}>
                <Table size="small" stickyHeader>
                  <TableHead><TableRow>
                    <TableCell sx={{ fontSize: '0.7rem' }}>ชื่อโปรแกรม</TableCell>
                    <TableCell sx={{ fontSize: '0.7rem', width: 140 }}>เวอร์ชัน</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {filteredSoftware.length === 0 ? (
                      <TableRow><TableCell colSpan={2} sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>ไม่พบโปรแกรมที่ค้นหา</TableCell></TableRow>
                    ) : filteredSoftware.map((s, i) => (
                      <TableRow key={`${s.name}-${i}`}>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{s.name}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>{s.version || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {softwareQuery && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  พบ {filteredSoftware.length} จาก {software.length} รายการ
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        )}

        <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', mt: 1.5, pt: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
          ข้อมูลจากระบบ Agent ตรวจสอบเครื่อง (ภายนอก){agent?.collected_at ? ` · เก็บข้อมูลเมื่อ ${new Date(agent.collected_at).toLocaleString('th-TH')}` : ''}
          {' · '}พื้นที่ดิสก์ / ซอฟต์แวร์ / จอ / เครื่องพิมพ์ เป็นข้อมูลอ่านอย่างเดียว ไม่ได้บันทึกลงทะเบียนทรัพย์สิน
        </Typography>
      </CardContent>
    </Card>
  );
}
