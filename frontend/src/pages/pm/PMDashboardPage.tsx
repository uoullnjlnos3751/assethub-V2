import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Card, Chip, CircularProgress, Divider, GlobalStyles,
  LinearProgress, ListSubheader, Menu, MenuItem, Select, Snackbar, Table, TableBody,
  ToggleButton, ToggleButtonGroup,
  TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import ShieldIcon from '@mui/icons-material/Shield';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import BuildIcon from '@mui/icons-material/Build';
import DescriptionIcon from '@mui/icons-material/Description';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TableRowsIcon from '@mui/icons-material/TableRows';
import BarChartIcon from '@mui/icons-material/BarChart';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import BoltIcon from '@mui/icons-material/Bolt';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import { pmAPI } from '../../services/api';
import { SectionCard } from '../../components/SectionCard';
import { Inbox, PieChart as PieIcon, Building2, MonitorSmartphone, CalendarRange, ListChecks } from 'lucide-react';
import { CoverageLegend, MonthStrip, RankedBars, StackedBar } from './components/CoverageBars';
import {
  CoveragePayload, CoverageState, Selection, SOURCE_MODES, SourceMode, dimensionCounts,
  emptySelection, filterPlans, filterRows, groupBy, pct, planStatus, planStatusColor,
  scopeSummary, selectionActive, stateColors, statesFor, tally,
} from './pmCoverage';
import { REPORTS, ReportKey, exportCsv, exportSheet, exportWorkbook } from './pmExport';

const fmt = (n: number) => n.toLocaleString('en-US');

/** Chips for the long tail of a dimension collapse into one "อื่นๆ" toggle. */
const CHIP_LIMIT = { company: 12, type: 6 };

export default function PMDashboardPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const colors = stateColors(theme);

  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<CoveragePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sel, setSel] = useState<Selection>(emptySelection);
  // Which PM counts as coverage: everything, only scheduled plans, or only
  // ad-hoc work. See SOURCE_MODES in pmCoverage.ts for why this matters.
  const [mode, setMode] = useState<SourceMode>('ALL');
  const [showTable, setShowTable] = useState<{ company: boolean; type: boolean }>({ company: false, type: false });
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setLoading(true);
    pmAPI.coverage({ year })
      .then(res => { setData(res.data); setError(''); })
      .catch(() => setError('โหลดข้อมูล PM ไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, [year]);

  // Clear filters when the year changes — a company that exists in one year's
  // data may not exist in another, and a stale chip would silently empty the page.
  useEffect(() => { setSel(emptySelection()); }, [year]);

  // Switching source can strand a state chip (a machine that was DONE under
  // ALL may be UNPLANNED under PLAN), so the state filter resets with it.
  useEffect(() => {
    setSel(prev => (prev.state.size ? { ...prev, state: new Set<CoverageState>() } : prev));
  }, [mode]);

  const rows = data?.rows || [];
  const plans = data?.plans || [];

  /** The headline breakdown always shows all three states — it IS the state
   *  chart, so filtering it by state would be circular. */
  const overall = useMemo(() => tally(filterRows(rows, sel, 'state', mode), mode), [rows, sel, mode]);
  const scoped = useMemo(() => tally(filterRows(rows, sel, null, mode), mode), [rows, sel, mode]);
  const byCompany = useMemo(() => groupBy(rows, sel, 'c', 'company', mode), [rows, sel, mode]);
  const byType = useMemo(() => groupBy(rows, sel, 't', 'type', mode), [rows, sel, mode]);
  const visiblePlans = useMemo(() => filterPlans(plans, sel, mode), [plans, sel, mode]);
  const companyChips = useMemo(() => dimensionCounts(rows, 'c', mode), [rows, mode]);
  const typeChips = useMemo(() => dimensionCounts(rows, 't', mode), [rows, mode]);
  const states = useMemo(() => statesFor(mode), [mode]);

  const planned = overall.DONE + overall.PENDING;
  const coverPct = pct(planned, overall.total);
  const progressPct = pct(overall.DONE, planned);

  const toggle = <T,>(key: keyof Selection, value: T) => {
    setSel(prev => {
      const next: Selection = {
        state: new Set(prev.state), company: new Set(prev.company), type: new Set(prev.type),
      };
      const set = next[key] as Set<T>;
      set.has(value) ? set.delete(value) : set.add(value);
      return next;
    });
  };

  const runExport = (fn: () => void, label: string) => {
    try { fn(); setToast(`กำลังดาวน์โหลด ${label}`); }
    catch { setToast('ส่งออกไฟล์ไม่สำเร็จ'); }
    setExportAnchor(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, gap: 1.5 }}>
        <CircularProgress size={20} />
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>กำลังโหลดข้อมูล PM…</Typography>
      </Box>
    );
  }

  const chipSx = (active: boolean, color?: string) => ({
    fontSize: 12, height: 26, fontWeight: active ? 600 : 500, cursor: 'pointer',
    borderColor: active ? (color || theme.palette.primary.main) : theme.palette.divider,
    bgcolor: active ? alpha(color || theme.palette.primary.main, 0.1) : 'transparent',
    color: active ? (color || theme.palette.primary.main) : theme.palette.text.secondary,
    '&:hover': { borderColor: color || theme.palette.primary.main },
  });

  const renderDimChips = (
    list: { name: string; count: number }[], key: 'company' | 'type', limit: number,
  ) => {
    const shown = list.slice(0, limit);
    const rest = list.slice(limit);
    const restOn = rest.length > 0 && rest.every(r => sel[key].has(r.name));
    return (
      <>
        {shown.map(c => (
          <Chip
            key={c.name} variant="outlined" size="small" onClick={() => toggle(key, c.name)}
            sx={chipSx(sel[key].has(c.name))}
            label={<>{c.name} <Box component="span" sx={{ fontSize: 10.5, opacity: 0.65, ml: 0.25 }}>{fmt(c.count)}</Box></>}
          />
        ))}
        {rest.length > 0 && (
          <Chip
            variant="outlined" size="small" sx={chipSx(restOn)}
            onClick={() => setSel(prev => {
              const next: Selection = {
                state: new Set(prev.state), company: new Set(prev.company), type: new Set(prev.type),
              };
              const allOn = rest.every(r => next[key].has(r.name));
              rest.forEach(r => (allOn ? next[key].delete(r.name) : next[key].add(r.name)));
              return next;
            })}
            label={<>อื่นๆ ({rest.length}) <Box component="span" sx={{ fontSize: 10.5, opacity: 0.65, ml: 0.25 }}>
              {fmt(rest.reduce((a, r) => a + r.count, 0))}</Box></>}
          />
        )}
      </>
    );
  };

  const donut = (segs: { name: string; value: number; color: string }[], centre: string, centreLabel: string) => {
    const total = segs.reduce((a, s) => a + s.value, 0);
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.25, flexWrap: 'wrap' }}>
        <Box sx={{ width: 138, height: 138, position: 'relative', flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={segs} cx="50%" cy="50%" innerRadius={44} outerRadius={64}
                paddingAngle={2} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                {segs.map(s => <Cell key={s.name} fill={s.color} />)}
              </Pie>
              <RTooltip
                contentStyle={{
                  borderRadius: 8, border: `1px solid ${theme.palette.divider}`,
                  background: theme.palette.background.paper, boxShadow: theme.shadows[4], fontSize: 12,
                }}
                formatter={(v: any, n: any) => [`${fmt(v)} เครื่อง (${pct(v, total)}%)`, n]}
              />
            </PieChart>
          </ResponsiveContainer>
          <Box sx={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
          }}>
            <Typography sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: '-.02em' }}>{centre}</Typography>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.4 }}>{centreLabel}</Typography>
          </Box>
        </Box>
        <Box sx={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
          {segs.map(s => (
            <Box key={s.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 12.5 }}>
              <Box sx={{ width: 11, height: 11, borderRadius: '3px', bgcolor: s.color, flex: 'none' }} />
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', flex: 1 }}>{s.name}</Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(s.value)}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', minWidth: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {pct(s.value, total)}%
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const barCard = (
    title: string, icon: any, groups: ReturnType<typeof groupBy>, which: 'company' | 'type',
  ) => (
    <SectionCard title={title} icon={icon}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }} className="pm-noprint">
        <Button
          size="small" variant="text"
          startIcon={showTable[which] ? <BarChartIcon sx={{ fontSize: 15 }} /> : <TableRowsIcon sx={{ fontSize: 15 }} />}
          onClick={() => setShowTable(s => ({ ...s, [which]: !s[which] }))}
          sx={{ fontSize: 11.5, fontWeight: 600 }}
        >
          {showTable[which] ? 'ดูเป็นกราฟ' : 'ดูเป็นตาราง'}
        </Button>
      </Box>
      {showTable[which] ? (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>{which === 'company' ? 'บริษัท' : 'ประเภท'}</TableCell>
                {states.map(s => <TableCell key={s.key} align="right" sx={thSx}>{s.label}</TableCell>)}
                <TableCell align="right" sx={thSx}>รวม</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map(g => (
                <TableRow key={g.name} hover>
                  <TableCell sx={{ fontSize: 12.5 }}>{g.name}</TableCell>
                  {states.map(s => (
                    <TableCell key={s.key} align="right" sx={numSx}>{fmt(g[s.key])}</TableCell>
                  ))}
                  <TableCell align="right" sx={{ ...numSx, fontWeight: 700 }}>{fmt(g.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <RankedBars groups={groups} states={states} />
      )}
    </SectionCard>
  );

  return (
    <Box>
      <GlobalStyles styles={printStyles(theme)} />

      {/* Letterhead — only ever visible on paper. A printout that does not say
          which filters produced it is unreadable a week later. */}
      <Box className="pm-printhead" sx={{ display: 'none' }}>
        <Box className="pm-ph-top">
          <Box>
            <Box className="pm-ph-org">TRR Group · ฝ่ายเทคโนโลยีสารสนเทศ</Box>
            <Box className="pm-ph-title">รายงานความครอบคลุมการบำรุงรักษาเชิงป้องกัน (PM)</Box>
            <Box className="pm-ph-year">ปีงบประมาณ {year + 543}</Box>
          </Box>
          <Box className="pm-ph-meta">
            <div>พิมพ์เมื่อ {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            {data?.generated && (
              <div>ข้อมูล ณ {new Date(data.generated).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            )}
          </Box>
        </Box>
        <Box className="pm-ph-scope">
          <b>ขอบเขตรายงาน:</b> {scopeSummary(sel, mode)} &nbsp;|&nbsp; <b>รวม {fmt(overall.total)} เครื่อง</b>
          {' '}(สร้างแผนแล้ว {fmt(planned)} · ยังไม่ได้สร้างแผน {fmt(overall.UNPLANNED)})
        </Box>
      </Box>

      {/* ── Header ─────────────────────────────────────────────── */}
      <Box className="pm-noprint" sx={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 1.5, mb: 2.5,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2.5, display: 'flex', alignItems: 'center',
            justifyContent: 'center', border: '1px solid', borderColor: 'primary.main',
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08),
          }}>
            <ShieldIcon color="primary" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 17, fontWeight: 800 }}>PM Dashboard</Typography>
              <Select size="small" value={year} onChange={e => setYear(Number(e.target.value))}
                sx={{ fontSize: 12, fontWeight: 700 }}>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <MenuItem key={y} value={y}>ปี {y + 543}</MenuItem>
                ))}
              </Select>
            </Box>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
              ความครอบคลุมการบำรุงรักษาเชิงป้องกัน ปี {year + 543}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" startIcon={<CalendarMonthIcon />} onClick={() => navigate('/pm/schedule')}>Gantt</Button>
          <Button variant="outlined" size="small" startIcon={<DescriptionIcon />} onClick={() => navigate('/pm/templates')}>Template</Button>
          <Button variant="outlined" size="small" startIcon={<BuildIcon />} onClick={() => navigate('/pm/runs')}>ทำ PM</Button>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
            onClick={e => setExportAnchor(e.currentTarget)}>ส่งออก</Button>
          <Button variant="outlined" size="small" startIcon={<PrintIcon />} onClick={() => window.print()}>พิมพ์รายงาน</Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => navigate('/pm/plans')}>สร้างแผน</Button>
        </Box>
      </Box>

      <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 320 } } }}>
        <MenuItem onClick={() => runExport(() => exportWorkbook(data!, sel, mode), 'ไฟล์ Excel รวมทุกรายงาน')}>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Excel รวมทุกรายงาน (.xlsx)</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{REPORTS.length} ชีตในไฟล์เดียว</Typography>
          </Box>
        </MenuItem>
        <Divider />
        {(['exec', 'ops'] as const).map(group => [
          <ListSubheader key={`h-${group}`} sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em', lineHeight: 2.4 }}>
            {group === 'exec' ? 'สรุปสำหรับผู้บริหาร' : 'รายการสำหรับทีมงาน'}
          </ListSubheader>,
          ...REPORTS.filter(r => r.group === group).map(rep => (
            <MenuItem key={rep.key} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
              onClick={() => runExport(() => exportSheet(data!, sel, mode, rep.key as ReportKey), rep.label)}>
              <Typography sx={{ fontSize: 12.5 }}>{rep.label}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(rep.count(data!, sel, mode))} แถว
                </Typography>
                <Tooltip title="ส่งออกเป็น CSV แทน">
                  <Box component="span" onClick={e => { e.stopPropagation(); runExport(() => exportCsv(data!, sel, mode, rep.key as ReportKey), `${rep.label} (CSV)`); }}
                    sx={{
                      fontSize: 9.5, fontWeight: 700, px: 0.7, py: 0.15, borderRadius: '4px',
                      border: `1px solid ${theme.palette.divider}`, color: 'text.disabled',
                      '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                    }}>CSV</Box>
                </Tooltip>
              </Box>
            </MenuItem>
          )),
        ])}
        <Divider />
        <Typography sx={{ fontSize: 10.5, color: 'text.disabled', px: 2, py: 1, lineHeight: 1.6, maxWidth: 320 }}>
          ทุกไฟล์ยึดตามตัวกรองที่เลือกอยู่ · CSV เข้ารหัส UTF-8 (มี BOM) เปิดใน Excel ภาษาไทยได้ทันที
        </Typography>
      </Menu>

      {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

      {/* ── Filters ────────────────────────────────────────────── */}
      <Card variant="outlined" className="pm-noprint" sx={{ p: 2, mb: 2, display: 'flex', flexDirection: 'column', gap: 1.4 }}>
      {/* Source toggle — what counts as PM coverage */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', pb: 1.4, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography sx={{ flex: '0 0 92px', fontSize: 10.5, fontWeight: 700, color: 'text.disabled', letterSpacing: '.04em' }}>
          ขอบเขตงาน
        </Typography>
        <ToggleButtonGroup
          size="small" exclusive value={mode}
          onChange={(_, v) => v && setMode(v as SourceMode)}
          sx={{
            '& .MuiToggleButton-root': {
              fontSize: 12, fontWeight: 600, px: 1.5, py: 0.5, textTransform: 'none',
              gap: 0.6, color: 'text.secondary',
            },
            '& .Mui-selected': { color: 'primary.main' },
          }}
        >
          {SOURCE_MODES.map(m => (
            <ToggleButton key={m.key} value={m.key}>
              {m.key === 'ALL' ? <AllInclusiveIcon sx={{ fontSize: 14 }} />
                : m.key === 'PLAN' ? <EventRepeatIcon sx={{ fontSize: 14 }} />
                : <BoltIcon sx={{ fontSize: 14 }} />}
              {m.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Typography sx={{ fontSize: 11, color: 'text.disabled', flex: 1, minWidth: 200 }}>
          {SOURCE_MODES.find(m => m.key === mode)!.hint}
        </Typography>
      </Box>
        {([
          // In ADHOC the scope is already "machines with ad-hoc work", so the
          // UNPLANNED bucket is structurally always 0 and the chip is noise.
          { label: 'สถานะ', node: states
            .filter(s => !(mode === 'ADHOC' && s.key === 'UNPLANNED'))
            .map(s => (
            <Chip key={s.key} variant="outlined" size="small" onClick={() => toggle('state', s.key as CoverageState)}
              sx={chipSx(sel.state.has(s.key), colors[s.key])}
              icon={<Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: colors[s.key], ml: '8px !important' }} />}
              label={<>{s.label} <Box component="span" sx={{ fontSize: 10.5, opacity: 0.7, ml: 0.25 }}>{fmt(overall[s.key])}</Box></>}
            />
          )) },
          { label: 'บริษัท', node: renderDimChips(companyChips, 'company', CHIP_LIMIT.company) },
          { label: 'ประเภทอุปกรณ์', node: renderDimChips(typeChips, 'type', CHIP_LIMIT.type) },
        ]).map(row => (
          <Box key={row.label} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography sx={{
              flex: '0 0 92px', fontSize: 10.5, fontWeight: 700, color: 'text.disabled',
              letterSpacing: '.04em', pt: 0.7,
            }}>{row.label}</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>{row.node}</Box>
            {row.label === 'สถานะ' && selectionActive(sel) && (
              <Button size="small" color="error" onClick={() => setSel(emptySelection())}
                sx={{ fontSize: 11.5, fontWeight: 600, ml: 'auto' }}>ล้างตัวกรองทั้งหมด</Button>
            )}
          </Box>
        ))}
      </Card>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <Card variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px minmax(0,1fr)' }, gap: 2.5 }}>
          <Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', color: 'text.disabled' }}>
              {mode === 'ADHOC' ? 'เครื่องที่ทำ PM นอกแผน' : states[2].label}
            </Typography>
            <Typography sx={{
              fontSize: 56, fontWeight: 800, lineHeight: 0.95, letterSpacing: '-.03em',
              color: mode === 'ADHOC' ? colors.DONE : colors.UNPLANNED, mt: 0.5, fontVariantNumeric: 'tabular-nums',
            }}>
              {fmt(mode === 'ADHOC' ? overall.total : overall.UNPLANNED)}
              <Box component="span" sx={{ fontSize: 20, fontWeight: 600, color: 'text.secondary', ml: 0.75 }}>เครื่อง</Box>
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 1, maxWidth: '34ch' }}>
              {mode === 'ADHOC'
                ? <>เครื่องที่ถูกทำ PM นอกแผนในปีนี้ — ไม่ได้อยู่ในแผนตามกำหนด</>
                : mode === 'PLAN'
                ? <>คิดเป็น <b>{pct(overall.UNPLANNED, overall.total)}%</b> ของเครื่องที่เข้าเกณฑ์ PM — ยังไม่มีแผนตามกำหนดรองรับ (งานนอกแผนไม่นับ)</>
                : <>คิดเป็น <b>{pct(overall.UNPLANNED, overall.total)}%</b> ของเครื่องที่เข้าเกณฑ์ PM — ยังไม่เคยถูกดึงเข้าแผนไหนเลยในปีนี้</>}
            </Typography>
            <Typography sx={{
              fontSize: 11.5, color: 'text.disabled', mt: 1.25, pt: 1.25,
              borderTop: `1px dashed ${theme.palette.divider}`,
            }}>
              ฐานคำนวณ: <b>{fmt(overall.total)}</b> เครื่อง{' '}
              {mode === 'ADHOC'
                ? '(เฉพาะเครื่องที่มีงาน PM นอกแผน)'
                : sel.company.size || sel.type.size
                ? 'ที่เข้าเกณฑ์ (ตามตัวกรองที่เลือก)'
                : 'ที่เข้าเกณฑ์ (ไม่นับเครื่องที่ปลดระวาง สูญหาย ชำรุด หรือกำลังซ่อม)'}
              {' '}· ทำเสร็จแล้ว <b>{fmt(overall.DONE)}</b> · รอทำ <b>{fmt(overall.PENDING)}</b>
            </Typography>
          </Box>
          <Box>
            <StackedBar t={overall} states={states} showPct minLabel={0.09} />
            <CoverageLegend t={overall} states={states} />
            {sel.state.size > 0 && (
              <Typography className="pm-noprint" sx={{
                mt: 1.5, fontSize: 11.5, color: 'text.secondary', p: '7px 10px',
                bgcolor: theme.palette.action.hover, borderRadius: '7px',
                borderLeft: `2px solid ${theme.palette.primary.main}`,
              }}>
                แถบด้านบนแสดงภาพรวมทั้งหมดเสมอ · กราฟและตารางด้านล่างกรองเฉพาะ{' '}
                <b>{states.filter(s => sel.state.has(s.key)).map(s => s.label).join(' + ')}</b> ({fmt(scoped.total)} เครื่อง)
              </Typography>
            )}
          </Box>
        </Box>
      </Card>

      {/* ── Donuts ─────────────────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,minmax(0,1fr))' }, gap: 2, mb: 2 }}>
        <SectionCard title={mode === 'ADHOC' ? 'งานนอกแผนคืบหน้าแค่ไหน' : 'ครอบคลุมแค่ไหน'} icon={PieIcon}>
          {donut([
            { name: mode === 'ADHOC' ? 'มีงานนอกแผน' : 'มีงาน PM แล้ว', value: planned, color: theme.palette.primary.main },
            { name: states[2].label, value: overall.UNPLANNED, color: colors.UNPLANNED },
          ], `${coverPct}%`, mode === 'ADHOC' ? 'มีงาน' : 'ครอบคลุม')}
        </SectionCard>
        <SectionCard title="ในแผนแล้ว ทำไปเท่าไร" icon={ListChecks}>
          {donut([
            { name: 'ทำเสร็จแล้ว', value: overall.DONE, color: colors.DONE },
            { name: 'รอทำ', value: overall.PENDING, color: colors.PENDING },
          ], `${progressPct}%`, 'คืบหน้า')}
        </SectionCard>
      </Box>

      {/* ── Ranked bars ────────────────────────────────────────── */}
      <Box className="pm-bars" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,minmax(0,1fr))' }, gap: 2, mb: 2 }}>
        {barCard('แยกตามบริษัท', Building2, byCompany, 'company')}
        {barCard('แยกตามประเภทอุปกรณ์', MonitorSmartphone, byType, 'type')}
      </Box>

      {/* ── Month strip ────────────────────────────────────────── */}
      <Box sx={{ mb: 2 }}>
        <SectionCard title={`จังหวะการทำ PM ตลอดปี ${year + 543}`} icon={CalendarRange}>
          <MonthStrip monthly={data?.monthly || {}} year={year} />
        </SectionCard>
      </Box>

      {/* ── Plan table ─────────────────────────────────────────── */}
      <Box className="pm-plantable">
        <SectionCard title="รายละเอียดแผน PM" icon={Inbox}>
          <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mb: 1 }}>
            {fmt(visiblePlans.length)} แผน
            {visiblePlans.length !== plans.length && ` (จากทั้งหมด ${fmt(plans.length)})`}
          </Typography>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  {['แผน', 'บริษัท', 'ประเภท', 'ผู้รับผิดชอบ'].map(h => <TableCell key={h} sx={thSx}>{h}</TableCell>)}
                  {['เป้าหมาย', 'สร้างงาน', 'เสร็จ'].map(h => <TableCell key={h} align="right" sx={thSx}>{h}</TableCell>)}
                  {['ความคืบหน้า', 'ช่วงเวลา', 'สถานะ'].map(h => <TableCell key={h} sx={thSx}>{h}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {visiblePlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ py: 4, textAlign: 'center', fontSize: 12.5, color: 'text.secondary', lineHeight: 1.8 }}>
                      {scoped.DONE + scoped.PENDING > 0 ? (
                        <>
                          ไม่มีแผน PM ที่ผูกกับขอบเขตนี้ — แต่มี <b>{fmt(scoped.DONE + scoped.PENDING)} เครื่อง</b> ที่มีงาน PM แล้ว
                          <br />แปลว่างานเหล่านั้นมาจาก <b>งานนอกแผน (Ad-hoc)</b> หรือแผนที่ไม่ได้ระบุบริษัทไว้
                        </>
                      ) : 'ไม่มีแผน PM ที่ตรงกับตัวกรองที่เลือก'}
                    </TableCell>
                  </TableRow>
                ) : visiblePlans.map(p => {
                  const st = planStatus(p);
                  const c = planStatusColor(theme, st.key);
                  const prog = pct(p.done, p.generated || p.planned);
                  const range = p.startDate && p.endDate
                    ? `${new Date(p.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} – ${new Date(p.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`
                    : '—';
                  return (
                    <TableRow key={p.id} hover sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(p.generated > 0 ? `/pm/runs?planId=${p.id}` : '/pm/plans')}>
                      {/* แผนที่ไม่ระบุแผนก = ครอบคลุมทุกแผนก ไม่ใช่ "ไม่มีชื่อ" ที่ต้อง
                          หยิบชื่อสถานที่มาแทน — การตกไปโชว์ site ทำให้อ่านเป็นว่าแผน
                          จำกัดอยู่แค่สถานที่นั้นแผนกเดียว สถานที่ย้ายไปเป็นบรรทัดรอง
                          เพื่อให้ยังแยกแผนคนละสถานที่ออกจากกันได้ */}
                      <TableCell sx={{ fontSize: 12.5, fontWeight: 700 }}>
                        {p.dept || 'ทุกแผนก'}
                        {p.isAdhoc && <Box component="span" sx={{ fontWeight: 400, color: 'text.disabled', ml: 0.5 }}>(นอกแผน)</Box>}
                        {p.site && (
                          <Box sx={{ fontWeight: 400, fontSize: 10.5, color: 'text.disabled' }}>{p.site}</Box>
                        )}
                      </TableCell>
                      <TableCell sx={mutedSx}>{p.company || '—'}</TableCell>
                      <TableCell sx={mutedSx}>{p.deviceType || '—'}</TableCell>
                      <TableCell sx={mutedSx}>{p.lead || '—'}</TableCell>
                      <TableCell align="right" sx={numSx}>{fmt(p.planned)}</TableCell>
                      <TableCell align="right" sx={numSx}>{fmt(p.generated)}</TableCell>
                      <TableCell align="right" sx={{ ...numSx, fontWeight: 700 }}>{fmt(p.done)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 118 }}>
                          <LinearProgress variant="determinate" value={prog}
                            sx={{
                              flex: 1, height: 5, borderRadius: 99,
                              bgcolor: theme.palette.action.hover,
                              '& .MuiLinearProgress-bar': { bgcolor: c },
                            }} />
                          <Typography sx={{ fontSize: 11, fontWeight: 700, minWidth: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {prog}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ ...mutedSx, whiteSpace: 'nowrap' }}>{range}</TableCell>
                      <TableCell>
                        <Chip size="small" label={st.label} sx={{
                          height: 20, fontSize: 10.5, fontWeight: 700,
                          bgcolor: alpha(c, 0.12), color: c,
                        }} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      </Box>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast('')}
        message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}

const thSx = {
  fontSize: 10, fontWeight: 700, color: 'text.disabled',
  letterSpacing: '.05em', whiteSpace: 'nowrap',
} as const;
const numSx = { fontSize: 12.5, fontVariantNumeric: 'tabular-nums' } as const;
const mutedSx = { fontSize: 12.5, color: 'text.secondary' } as const;

/**
 * Print rules. The screen page is a tool; the printed page is a document that
 * leaves the building, so it drops every control, prints in the light palette
 * whatever the viewer's theme, and forces the bar fills to actually ink.
 */
const printStyles = (theme: any) => ({
  '@media print': {
    '@page': { size: 'A4 portrait', margin: '14mm 12mm 16mm' },
    'body': { background: '#fff !important' },
    '*': { WebkitPrintColorAdjust: 'exact !important', printColorAdjust: 'exact !important' },
    /* app chrome: sidebar, top bar, breadcrumbs, the floating chat bubble,
       and every transient overlay */
    ['.MuiDrawer-root, header.MuiAppBar-root, .MuiBreadcrumbs-root, .app-noprint, '
      + '.pm-noprint, .MuiSnackbar-root, .MuiTooltip-popper, .MuiMenu-root']: {
      display: 'none !important',
    },
    'main, .MuiBox-root': { boxShadow: 'none !important' },
    '.pm-printhead': { display: 'block !important', marginBottom: '4mm' },
    '.pm-ph-top': {
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14mm',
      borderBottom: `2.5px solid ${theme.palette.primary.main}`, paddingBottom: '3mm',
    },
    '.pm-ph-org': { fontSize: '9pt', fontWeight: 600, color: theme.palette.primary.main, letterSpacing: '.04em' },
    '.pm-ph-title': { fontSize: '16pt', fontWeight: 700, marginTop: '1.5mm', letterSpacing: '-.01em' },
    '.pm-ph-year': { fontSize: '10pt', color: '#4b5c72', marginTop: '1mm' },
    '.pm-ph-meta': { fontSize: '8.5pt', color: '#4b5c72', textAlign: 'right', lineHeight: 1.7, flex: 'none' },
    '.pm-ph-scope': {
      marginTop: '3mm', fontSize: '9pt', background: '#f2f5f9',
      borderLeft: `2.5px solid ${theme.palette.primary.main}`, padding: '2.5mm 3.5mm', borderRadius: '3px',
    },
    /* Side by side the ranked bars lose their segment labels, so on paper each
       gets the full width. */
    '.pm-bars': { gridTemplateColumns: 'minmax(0,1fr) !important' },
    '.MuiCard-root, .MuiPaper-root': { breakInside: 'avoid', boxShadow: 'none !important' },
    /* the plan table is the appendix — own page, repeating header */
    '.pm-plantable': { breakBefore: 'page' },
    '.pm-plantable table': { minWidth: '0 !important', fontSize: '8.5pt' },
    '.pm-plantable .MuiTableContainer-root': { overflow: 'visible !important' },
    'thead': { display: 'table-header-group' },
    'tr': { breakInside: 'avoid' },
  },
});
