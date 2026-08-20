import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Card, Chip, CircularProgress, Divider, GlobalStyles,
  Menu, MenuItem, Select, Snackbar, Typography, alpha, useTheme,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import BarChartIcon from '@mui/icons-material/BarChart';
import BuildIcon from '@mui/icons-material/Build';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Building2, LayoutList } from 'lucide-react';
import { pmAPI } from '../../services/api';
import { SectionCard } from '../../components/SectionCard';
import {
  GanttAxis, GanttBar, GanttLegend, GanttRow, GanttTrack, StatePill,
} from './components/GanttChart';
import {
  PLAN_STATES, RawPlan, SchedGroup, SchedSelection, buildTimeline,
  emptySchedSelection, groupState, matchesPlan, normalise, pct, planStateColors,
  rollup, schedScopeSummary, schedSelectionActive, thDate,
} from './pmSchedule';
import { buildScheduleReports, exportScheduleCsv, exportScheduleWorkbook } from './pmScheduleExport';

const fmt = (n: number) => n.toLocaleString('en-US');
const ROW_H = { company: 40, group: 26, dept: 24 };

/**
 * "กี่เครื่อง" คือคำถามที่ถูกถามจริง — เปอร์เซ็นต์เป็นแค่วิธีย่อคำตอบ
 * ตัวเลขจำนวนเครื่องจึงถูกยกขึ้นมาให้อ่านได้จากระยะไกล ส่วนตัวหารและคำ
 * ประกอบถูกหรี่ลง เพื่อให้สายตาจับตัวเลขที่ต้องใช้ตัดสินใจได้ก่อน
 */
function UnitCount({ n, of, pre, post = 'เครื่อง', size = 12.5 }: {
  n: number; of?: number; pre?: string; post?: string; size?: number;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.4, mt: 0.15 }}>
      {pre && <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>{pre}</Typography>}
      <Typography sx={{
        fontSize: size, fontWeight: 800, lineHeight: 1.15, color: 'text.primary',
        fontVariantNumeric: 'tabular-nums',
      }}>{fmt(n)}</Typography>
      {of != null && (
        <Typography sx={{ fontSize: 10.5, color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
          / {fmt(of)}
        </Typography>
      )}
      <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>{post}</Typography>
    </Box>
  );
}

/** คอลัมน์ขวาของ Gantt — ทำแล้วกี่เครื่อง เด่นกว่าตัวหาร */
function MetaCount({ done, total, size = 11.5 }: { done: number; total: number; size?: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.3 }}>
      <Typography sx={{
        fontSize: size, fontWeight: 800, lineHeight: 1.1, color: 'text.primary',
        fontVariantNumeric: 'tabular-nums',
      }}>{fmt(done)}</Typography>
      <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
        /{fmt(total)}
      </Typography>
    </Box>
  );
}

export default function PMSchedulePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const colors = planStateColors(theme);

  const [year, setYear] = useState(new Date().getFullYear());
  const [raw, setRaw] = useState<RawPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sel, setSel] = useState<SchedSelection>(emptySchedSelection);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [toast, setToast] = useState('');

  // Fixed at mount so every bar, the today line and the exported header all
  // agree on "now" even if the tab is left open across midnight.
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);

  useEffect(() => {
    setLoading(true);
    pmAPI.plans({ year })
      .then(res => { setRaw(res.data || []); setError(''); })
      .catch(() => setError('โหลดกำหนดการ PM ไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => { setSel(emptySchedSelection()); setCollapsed({}); }, [year]);

  const plans = useMemo(() => normalise(raw, today), [raw, today]);
  const dated = useMemo(() => plans.filter(p => p.start && p.end), [plans]);
  const undated = useMemo(() => plans.filter(p => !p.start || !p.end), [plans]);

  const visible = useMemo(() => dated.filter(p => matchesPlan(p, sel, null)), [dated, sel]);
  const timeline = useMemo(() => buildTimeline(dated), [dated]);

  const byCompany = useMemo(() => rollup(visible, 'company'), [visible]);
  const totals = useMemo(() => {
    const total = visible.reduce((a, p) => a + p.total, 0);
    const done = visible.reduce((a, p) => a + p.done, 0);
    const late = visible.filter(p => p.state === 'OVERDUE');
    const running = visible.filter(p => p.state === 'RUNNING');
    const remain = (list: typeof visible) => list.reduce((a, p) => a + (p.total - p.done), 0);
    return { total, done, late, running, lateUnits: remain(late), runUnits: remain(running) };
  }, [visible]);

  const toggle = (key: keyof SchedSelection, value: string) => {
    setSel(prev => {
      const next: SchedSelection = {
        state: new Set(prev.state), company: new Set(prev.company), dept: new Set(prev.dept),
      };
      const set = next[key] as Set<string>;
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
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>กำลังโหลดกำหนดการ PM…</Typography>
      </Box>
    );
  }

  const chipSx = (active: boolean, color?: string) => ({
    fontSize: 11, height: 23, fontWeight: active ? 600 : 500, cursor: 'pointer',
    borderColor: active ? (color || theme.palette.primary.main) : theme.palette.divider,
    bgcolor: active ? alpha(color || theme.palette.primary.main, 0.1) : 'transparent',
    color: active ? (color || theme.palette.primary.main) : theme.palette.text.secondary,
    '& .MuiChip-label': { px: 1 },
    '&:hover': { borderColor: color || theme.palette.primary.main },
  });

  /** Counts ignore their own dimension so a chip never zeroes itself out. */
  const dimCounts = (key: 'company' | 'dept') => {
    const m = new Map<string, number>();
    dated.forEach(p => {
      if (!matchesPlan(p, sel, key)) return;
      m.set(p[key], (m.get(p[key]) || 0) + 1);
    });
    sel[key].forEach(v => { if (!m.has(v)) m.set(v, 0); });
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'th'))
      .map(([name, count]) => ({ name, count }));
  };

  const filterRow = (label: string, node: React.ReactNode, withReset = false) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
      <Typography sx={{
        flex: '0 0 78px', fontSize: 9.5, fontWeight: 700, color: 'text.disabled',
        letterSpacing: '.04em', pt: 0.6,
      }}>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>{node}</Box>
      {withReset && schedSelectionActive(sel) && (
        <Button size="small" color="error" onClick={() => setSel(emptySchedSelection())}
          sx={{ fontSize: 10.5, fontWeight: 600, ml: 'auto', minWidth: 0 }}>ล้างตัวกรอง</Button>
      )}
    </Box>
  );

  const gutterSx = {
    display: 'flex', alignItems: 'center', gap: 0.75, px: 1, minWidth: 0, overflow: 'hidden',
    borderRight: `1px solid ${theme.palette.divider}`,
  };
  const metaSx = {
    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: 1,
    borderLeft: `1px solid ${theme.palette.divider}`,
    fontSize: 10.5, fontVariantNumeric: 'tabular-nums', color: 'text.secondary',
  };
  const nameSx = {
    fontSize: 11.5, fontWeight: 600, color: 'text.primary', minWidth: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  };
  const subSx = { fontSize: 9.5, color: 'text.disabled', whiteSpace: 'nowrap', flex: 'none' };

  const noTimeline = (
    <Typography sx={{ py: 3.5, textAlign: 'center', color: 'text.disabled', fontSize: 11.5 }}>
      ไม่มีแผนที่ตรงกับตัวกรองที่เลือก
    </Typography>
  );

  return (
    <Box>
      <GlobalStyles styles={printStyles(theme)} />

      {/* Letterhead — paper only. A printed schedule that does not say what it
          was filtered by is unreadable a week later. */}
      <Box className="pms-printhead" sx={{ display: 'none' }}>
        <Box className="pms-ph-top">
          <Box>
            <Box className="pms-ph-org">TRR Group · ฝ่ายเทคโนโลยีสารสนเทศ</Box>
            <Box className="pms-ph-title">กำหนดการบำรุงรักษาเชิงป้องกัน (PM Schedule)</Box>
            <Box className="pms-ph-year">ปีงบประมาณ {year + 543}</Box>
          </Box>
          <Box className="pms-ph-meta">
            <div>พิมพ์เมื่อ {today.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </Box>
        </Box>
        <Box className="pms-ph-scope">
          <b>ขอบเขต:</b> {schedScopeSummary(sel)} &nbsp;|&nbsp;{' '}
          <b>{fmt(visible.length)} แผน</b> · ทำเสร็จ {fmt(totals.done)} จาก {fmt(totals.total)} เครื่อง
          {totals.late.length > 0 && <> · เกินกำหนด {fmt(totals.late.length)} แผน</>}
        </Box>
      </Box>

      {/* ── Header ─────────────────────────────────────────────── */}
      <Box className="pms-noprint" sx={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 1.25, mb: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 2.25, display: 'flex', alignItems: 'center',
            justifyContent: 'center', border: '1px solid', borderColor: 'primary.main',
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08),
          }}>
            <CalendarMonthIcon color="primary" fontSize="small" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 800 }}>กำหนดการ PM</Typography>
              <Select size="small" value={year} onChange={e => setYear(Number(e.target.value))}
                sx={{ fontSize: 11.5, fontWeight: 700, '& .MuiSelect-select': { py: 0.4 } }}>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <MenuItem key={y} value={y}>ปี {y + 543}</MenuItem>
                ))}
              </Select>
            </Box>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.2 }}>
              ตารางแผนงานรายบริษัทและรายแผนก ปี {year + 543}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" startIcon={<BarChartIcon />} onClick={() => navigate('/pm')}>ภาพรวม</Button>
          <Button variant="outlined" size="small" startIcon={<BuildIcon />} onClick={() => navigate('/pm/runs')}>ทำ PM</Button>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
            onClick={e => setExportAnchor(e.currentTarget)}>ส่งออก</Button>
          <Button variant="outlined" size="small" startIcon={<PrintIcon />} onClick={() => window.print()}>พิมพ์แผนงาน</Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => navigate('/pm/plans')}>สร้างแผน</Button>
        </Box>
      </Box>

      <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 300 } } }}>
        <MenuItem onClick={() => runExport(
          () => exportScheduleWorkbook(year, visible, sel, today), 'ไฟล์ Excel รวมทุกชีต')}>
          <Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>Excel รวมทุกชีต (.xlsx)</Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>สรุปรายบริษัท · รายแผนก · รายแผน</Typography>
          </Box>
        </MenuItem>
        <Divider />
        {buildScheduleReports(year, visible, sel, today).map(rep => (
          <MenuItem key={rep.key} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
            onClick={() => runExport(() => exportScheduleCsv(year, visible, sel, today, rep.key), rep.label)}>
            <Typography sx={{ fontSize: 12 }}>{rep.label}</Typography>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>CSV</Typography>
          </MenuItem>
        ))}
        <Divider />
        <Typography sx={{ fontSize: 10, color: 'text.disabled', px: 2, py: 1, lineHeight: 1.6, maxWidth: 300 }}>
          ทุกไฟล์ยึดตามตัวกรองที่เลือกอยู่ · CSV เข้ารหัส UTF-8 (มี BOM) เปิดใน Excel ภาษาไทยได้ทันที
        </Typography>
      </Menu>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <Box sx={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(132px,1fr))', gap: 1, mb: 1.5,
      }}>
        {[
          { v: fmt(visible.length), l: 'แผนในกำหนดการ',
            s: visible.length !== dated.length ? `จากทั้งหมด ${dated.length} แผน`
              : timeline ? `${thDate(timeline.t0)} – ${thDate(timeline.weekStarts[timeline.weeks - 1])}` : '—',
            c: theme.palette.text.primary },
          { v: `${pct(totals.done, totals.total)}%`, l: 'ความคืบหน้ารวม',
            s: <UnitCount n={totals.done} of={totals.total} />, c: colors.DONE },
          { v: fmt(totals.late.length), l: 'แผนที่เกินกำหนด',
            s: totals.lateUnits ? <UnitCount n={totals.lateUnits} pre="ค้างอยู่" /> : 'ไม่มีงานค้าง', c: colors.OVERDUE },
          { v: fmt(totals.running.length), l: 'แผนที่กำลังดำเนินการ',
            s: totals.runUnits ? <UnitCount n={totals.runUnits} pre="เหลือ" /> : 'ครบแล้ว', c: colors.RUNNING },
        ].map(k => (
          <Card key={k.l} variant="outlined" sx={{ p: '9px 12px' }}>
            <Typography sx={{ fontSize: 21, fontWeight: 800, lineHeight: 1, letterSpacing: '-.02em', color: k.c, fontVariantNumeric: 'tabular-nums' }}>
              {k.v}
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.4 }}>{k.l}</Typography>
            {typeof k.s === 'string'
              ? <Typography sx={{ fontSize: 9.5, color: 'text.disabled', mt: 0.1 }}>{k.s}</Typography>
              : k.s}
          </Card>
        ))}
      </Box>

      {/* ── Filters ────────────────────────────────────────────── */}
      <Card variant="outlined" className="pms-noprint" sx={{ p: 1.4, mb: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {filterRow('สถานะแผน', PLAN_STATES.map(s => {
          const n = dated.filter(p => p.state === s.key && matchesPlan(p, sel, 'state')).length;
          return (
            <Chip key={s.key} variant="outlined" size="small" onClick={() => toggle('state', s.key)}
              sx={chipSx(sel.state.has(s.key), colors[s.key])}
              icon={<Box sx={{ width: 7, height: 7, borderRadius: '2px', bgcolor: colors[s.key], ml: '7px !important' }} />}
              label={<>{s.label} <Box component="span" sx={{ fontSize: 9.5, opacity: 0.7 }}>{fmt(n)}</Box></>} />
          );
        }), true)}
        {filterRow('บริษัท', dimCounts('company').map(c => (
          <Chip key={c.name} variant="outlined" size="small" onClick={() => toggle('company', c.name)}
            sx={chipSx(sel.company.has(c.name))}
            label={<>{c.name} <Box component="span" sx={{ fontSize: 9.5, opacity: 0.65 }}>{fmt(c.count)}</Box></>} />
        )))}
        {filterRow('แผนก', dimCounts('dept').map(c => (
          <Chip key={c.name} variant="outlined" size="small" onClick={() => toggle('dept', c.name)}
            sx={chipSx(sel.dept.has(c.name))}
            label={<>{c.name} <Box component="span" sx={{ fontSize: 9.5, opacity: 0.65 }}>{fmt(c.count)}</Box></>} />
        )))}
      </Card>

      {/* ── Gantt 1: company roll-up ───────────────────────────── */}
      <Box sx={{ mb: 1.5 }} className="pms-gantt-company">
        <SectionCard title="ภาพรวมรายบริษัท" icon={Building2}>
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mb: 1 }}>
            แต่ละแท่งคือช่วงเวลารวมของทุกแผนในบริษัทนั้น
          </Typography>
          {!timeline || !byCompany.length ? noTimeline : (
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ minWidth: 700 }}>
                <GanttAxis tl={timeline} today={today} />
                {byCompany.map(g => {
                  const st = groupState(g);
                  const late = g.plans.filter(p => p.state === 'OVERDUE').length;
                  return (
                    <GanttRow key={g.name} sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Box sx={gutterSx}>
                        <Typography sx={nameSx}>{g.name}</Typography>
                        <StatePill state={st} />
                      </Box>
                      <GanttTrack tl={timeline} today={today} height={ROW_H.company}>
                        <GanttBar
                          tl={timeline} start={g.start} end={g.end} state={st}
                          done={g.done} total={g.total} target={g.target} height={24}
                          title={g.name}
                          subtitle={`${g.plans.length} แผน${late ? ` · เกินกำหนด ${late} แผน` : ''}`}
                        />
                      </GanttTrack>
                      <Box sx={{
                        ...metaSx, flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center',
                      }}>
                        <MetaCount done={g.done} total={g.total} size={12.5} />
                        <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: 'text.secondary', lineHeight: 1.2 }}>
                          {pct(g.done, g.total)}%
                        </Typography>
                      </Box>
                    </GanttRow>
                  );
                })}
              </Box>
            </Box>
          )}
          <GanttLegend />
        </SectionCard>
      </Box>

      {/* ── Gantt 2: per department ────────────────────────────── */}
      <Box className="pms-gantt-dept">
        <SectionCard title="รายละเอียดรายแผนก" icon={LayoutList}>
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mb: 1 }}>
            คลิกชื่อบริษัทเพื่อย่อ/ขยาย
          </Typography>
          {!timeline || !byCompany.length ? noTimeline : (
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ minWidth: 700 }}>
                <GanttAxis tl={timeline} today={today} />
                {byCompany.map(co => {
                  const open = !collapsed[co.name];
                  const depts: SchedGroup[] = rollup(co.plans, 'dept');
                  return (
                    <React.Fragment key={co.name}>
                      <GanttRow sx={{
                        bgcolor: theme.palette.action.hover,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                      }}>
                        <Box
                          role="button" tabIndex={0}
                          onClick={() => setCollapsed(c => ({ ...c, [co.name]: !c[co.name] }))}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(c => ({ ...c, [co.name]: !c[co.name] })); } }}
                          sx={{ ...gutterSx, cursor: 'pointer', userSelect: 'none', '&:hover': { color: 'primary.main' } }}
                        >
                          <ExpandMoreIcon sx={{
                            fontSize: 14, color: 'text.disabled', flex: 'none',
                            transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .18s',
                          }} />
                          <Typography sx={{ ...nameSx, fontWeight: 700, fontSize: 11 }}>{co.name}</Typography>
                          <Typography sx={subSx}>{depts.length} แผนก · {co.plans.length} แผน</Typography>
                        </Box>
                        <GanttTrack tl={timeline} today={today} height={ROW_H.group} />
                        <Box sx={metaSx}><MetaCount done={co.done} total={co.total} /></Box>
                      </GanttRow>

                      {open && depts.map(dp => (
                        <GanttRow key={`${co.name}-${dp.name}`} sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                          <Box sx={{ ...gutterSx, pl: 2.75 }}>
                            <Typography sx={nameSx}>{dp.name}</Typography>
                            {dp.plans.length > 1 && <Typography sx={subSx}>{dp.plans.length} แผน</Typography>}
                          </Box>
                          <GanttTrack tl={timeline} today={today} height={ROW_H.dept}>
                            {/* one bar per plan, so a department running two
                                separate windows shows two bars rather than one
                                span that covers the gap between them */}
                            {dp.plans.map(p => (
                              <GanttBar
                                key={p.id} tl={timeline} start={p.start!} end={p.end!} state={p.state}
                                done={p.done} total={p.total} target={p.target} height={15}
                                title={`${dp.name} · ${p.company}`}
                                subtitle={`แผน #${p.id}${p.deviceType ? ` · ${p.deviceType}` : ''}`}
                              />
                            ))}
                          </GanttTrack>
                          <Box sx={metaSx}><MetaCount done={dp.done} total={dp.total} /></Box>
                        </GanttRow>
                      ))}
                    </React.Fragment>
                  );
                })}
              </Box>
            </Box>
          )}

          {undated.length > 0 && (
            <Typography sx={{
              mt: 1.25, fontSize: 10.5, color: 'text.secondary', p: '7px 10px',
              bgcolor: theme.palette.action.hover, borderRadius: '7px',
              borderLeft: `2px solid ${theme.palette.primary.main}`,
            }}>
              <b>ไม่ได้อยู่ในกำหนดการ:</b> {undated.map(p => p.dept).join(', ')} — รวม{' '}
              <b>{fmt(undated.reduce((a, p) => a + p.done, 0))} เครื่อง</b> ที่ทำ PM แล้วแต่ไม่ได้ระบุช่วงเวลา
              จึงวางบนไทม์ไลน์ไม่ได้
            </Typography>
          )}
        </SectionCard>
      </Box>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast('')}
        message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}

/**
 * Print rules. The screen page is a tool; the printed page is a document, so it
 * drops the app shell and every control, prints in the light palette whatever
 * the viewer's theme, and forces the bar fills to actually ink.
 */
const printStyles = (theme: any) => ({
  '@media print': {
    '@page': { size: 'A4 landscape', margin: '12mm 10mm 14mm' },
    'body': { background: '#fff !important' },
    '*': { WebkitPrintColorAdjust: 'exact !important', printColorAdjust: 'exact !important' },
    ['.MuiDrawer-root, header.MuiAppBar-root, .MuiBreadcrumbs-root, .app-noprint, '
      + '.pms-noprint, .MuiSnackbar-root, .MuiTooltip-popper, .MuiMenu-root']: {
      display: 'none !important',
    },
    '.pms-printhead': { display: 'block !important', marginBottom: '4mm' },
    '.pms-ph-top': {
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14mm',
      borderBottom: `2.5px solid ${theme.palette.primary.main}`, paddingBottom: '2.5mm',
    },
    '.pms-ph-org': { fontSize: '8.5pt', fontWeight: 600, color: theme.palette.primary.main, letterSpacing: '.04em' },
    '.pms-ph-title': { fontSize: '15pt', fontWeight: 700, marginTop: '1.5mm', letterSpacing: '-.01em' },
    '.pms-ph-year': { fontSize: '9.5pt', color: '#4b5c72', marginTop: '1mm' },
    '.pms-ph-meta': { fontSize: '8pt', color: '#4b5c72', textAlign: 'right', lineHeight: 1.7, flex: 'none' },
    '.pms-ph-scope': {
      marginTop: '2.5mm', fontSize: '8.5pt', background: '#f2f5f9',
      borderLeft: `2.5px solid ${theme.palette.primary.main}`, padding: '2mm 3mm', borderRadius: '3px',
    },
    '.MuiCard-root, .MuiPaper-root': { breakInside: 'avoid', boxShadow: 'none !important' },
    // the timeline must not be cut off, so it prints unscrolled at full width
    '.pms-gantt-company [style*="overflow-x"], .pms-gantt-dept [style*="overflow-x"]': { overflow: 'visible !important' },
    '.pms-gantt-dept': { breakBefore: 'page' },
  },
});
