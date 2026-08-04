import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Card,
  CardActionArea,
  LinearProgress,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ShieldIcon from '@mui/icons-material/Shield';
import BarChartIcon from '@mui/icons-material/BarChart';
import BoltIcon from '@mui/icons-material/Bolt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DescriptionIcon from '@mui/icons-material/Description';
import BuildIcon from '@mui/icons-material/Build';
import AddIcon from '@mui/icons-material/Add';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import EventIcon from '@mui/icons-material/Event';
import BusinessIcon from '@mui/icons-material/Business';
import PlaceIcon from '@mui/icons-material/Place';
import { pmAPI } from '../../services/api';
import { formatDate } from '../../utils/dateUtils';

function fmtDate(d: string | null) {
  if (!d) return '—';
  return formatDate(d);
}

function progressColor(pct: number): 'success' | 'info' | 'warning' | 'error' {
  if (pct >= 100) return 'success';
  if (pct >= 50) return 'info';
  if (pct >= 20) return 'warning';
  return 'error';
}

function getRowStatus(plan: any) {
  const total = plan.totalCount ?? (plan.runs?.length || 0);
  const done = plan.completedCount ?? (plan.runs?.filter((r: any) => r.status === 'COMPLETED').length || 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const today = new Date();
  const end = plan.endDate ? new Date(plan.endDate) : null;
  const start = plan.startDate ? new Date(plan.startDate) : null;
  const isOverdue = !!(end && today > end && pct < 100);
  const isActive = !!(start && end && today >= start && today <= end);
  const isDone = pct >= 100;

  if (isDone) return { total, done, pct, color: 'success' as const, label: 'เสร็จสิ้น', Icon: CheckCircleIcon };
  if (isOverdue) return { total, done, pct, color: 'error' as const, label: 'เกินกำหนด', Icon: WarningAmberIcon };
  if (isActive) return { total, done, pct, color: 'info' as const, label: 'กำลังดำเนิน', Icon: AutorenewIcon };
  return { total, done, pct, color: 'default' as const, label: 'กำหนดการ', Icon: EventIcon };
}

export default function PMDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'PLANNED' | 'ADHOC'>('PLANNED');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    pmAPI.dashboard({ year: selectedYear })
      .then(res => {
        setDashboard(res.data);
        setError('');
      })
      .catch(() => setError('โหลดข้อมูล PM Dashboard ไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, [selectedYear]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 1.25, color: 'primary.main', fontSize: 14 }}>
        กำลังโหลดข้อมูล PM...
      </Box>
    );
  }

  // Base data
  const plans: any[] = dashboard?.plans || [];

  // Select data based on tab
  const displayPlans = plans.filter((p: any) => activeTab === 'ADHOC' ? p.isAdhoc : !p.isAdhoc);
  const planned = activeTab === 'ADHOC' ? (dashboard?.plannedAdhoc || 0) : (dashboard?.planned || 0);
  const completed = activeTab === 'ADHOC' ? (dashboard?.completedAdhoc || 0) : (dashboard?.completed || 0);
  const remaining = activeTab === 'ADHOC' ? (dashboard?.remainingAdhoc || 0) : (dashboard?.remaining || 0);
  const overdue = activeTab === 'ADHOC' ? 0 : (dashboard?.overdue || 0);
  const pctAll = planned > 0 ? Math.round(completed / planned * 100) : 0;

  const notGenerated = displayPlans.filter((plan: any) => (plan.totalCount ?? plan.runs?.length ?? 0) === 0).length;
  const activePlans = displayPlans.filter((plan: any) => {
    const start = plan.startDate ? new Date(plan.startDate) : null;
    const end = plan.endDate ? new Date(plan.endDate) : null;
    const total = plan.totalCount ?? (plan.runs?.length || 0);
    const done = plan.completedCount ?? (plan.runs?.filter((r: any) => r.status === 'COMPLETED').length || 0);
    return start && end && new Date() >= start && new Date() <= end && done < total;
  }).length;

  const stats: { icon: React.ElementType; label: string; val: number | string; color: 'info' | 'success' | 'warning' | 'error' | 'secondary' }[] = [
    { icon: GpsFixedIcon, label: 'เป้าหมาย', val: planned, color: 'info' },
    { icon: CheckCircleIcon, label: 'เสร็จแล้ว', val: completed, color: 'success' },
    { icon: HourglassEmptyIcon, label: 'รอดำเนินการ', val: remaining, color: 'warning' },
    { icon: WarningAmberIcon, label: 'เกินกำหนด', val: overdue, color: 'error' },
    { icon: AssignmentLateIcon, label: 'ยังไม่ Generate', val: notGenerated, color: 'secondary' },
    { icon: TrendingUpIcon, label: 'ความคืบหน้า', val: `${pctAll}%`, color: progressColor(pctAll) },
  ];

  const workflow = [
    { title: '1. Template', copy: 'เตรียม Checklist มาตรฐานก่อนเริ่มรอบ PM', color: 'secondary' as const, Icon: DescriptionIcon, action: () => navigate('/pm/templates') },
    { title: '2. Plan', copy: 'กำหนด scope, ระยะเวลา, ผู้รับผิดชอบ และจำนวนเครื่อง', color: 'info' as const, Icon: AssignmentIcon, action: () => navigate('/pm/plans') },
    { title: '3. Generate', copy: `${notGenerated} แผนยังไม่มีรายการงาน`, color: notGenerated > 0 ? 'warning' as const : 'success' as const, Icon: BoltIcon, action: () => navigate('/pm/plans') },
    { title: '4. Execute', copy: `${activePlans} แผนกำลังอยู่ในช่วงดำเนินการ`, color: 'success' as const, Icon: PlayArrowIcon, action: () => navigate('/pm/runs') },
  ];

  const quickActions = [
    { Icon: AssignmentIcon, title: 'แผน PM', sub: `${displayPlans.length} แผน`, color: 'info' as const, onClick: () => navigate('/pm/plans') },
    { Icon: CalendarMonthIcon, title: 'กำหนดการ PM (Gantt)', sub: 'Gantt Chart แผนรายสัปดาห์', color: 'success' as const, onClick: () => navigate('/pm/schedule') },
    { Icon: BuildIcon, title: 'ทำ PM Checklist', sub: `${remaining} รายการรอ`, color: 'warning' as const, onClick: () => navigate('/pm/runs') },
    { Icon: DescriptionIcon, title: 'จัดการ Template', sub: 'Checklist มาตรฐานก่อนสร้างแผน', color: 'secondary' as const, onClick: () => navigate('/pm/templates') },
  ];

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.08), border: '1px solid', borderColor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldIcon color="primary" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 17, fontWeight: 800 }}>PM Dashboard</Typography>
              <Select size="small" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} sx={{ fontSize: 12, fontWeight: 700 }}>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <MenuItem key={y} value={y}>ปี {y + 543}</MenuItem>
                ))}
              </Select>
            </Box>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>ศูนย์ติดตาม Preventive Maintenance ปี {selectedYear + 543}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <ToggleButtonGroup size="small" exclusive value={activeTab} onChange={(_, v) => v && setActiveTab(v)} sx={{ mr: 1 }}>
            <ToggleButton value="PLANNED"><BarChartIcon fontSize="small" sx={{ mr: 0.5 }} /> PM ตามแผน</ToggleButton>
            <ToggleButton value="ADHOC"><BoltIcon fontSize="small" sx={{ mr: 0.5 }} /> PM นอกแผน</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="outlined" startIcon={<CalendarMonthIcon />} onClick={() => navigate('/pm/schedule')}>Gantt Chart</Button>
          <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={() => navigate('/pm/templates')}>Template</Button>
          <Button variant="outlined" startIcon={<BuildIcon />} onClick={() => navigate('/pm/runs')}>ทำ PM</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/pm/plans')}>สร้างแผน</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

      {/* ── Overall Stats ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 1.5, mb: 2.5 }}>
        {stats.map(s => (
          <Card key={s.label} variant="outlined" sx={{ p: '14px 16px', display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: (t) => alpha(t.palette[s.color].main, t.palette.mode === 'dark' ? 0.16 : 0.08), borderColor: `${s.color}.main` }}>
            <s.icon sx={{ fontSize: 26, color: `${s.color}.main` }} />
            <Box>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: `${s.color}.main`, lineHeight: 1 }}>{s.val}</Typography>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.25 }}>{s.label}</Typography>
            </Box>
          </Card>
        ))}
      </Box>

      {/* ── Overall progress ── */}
      {planned > 0 && (
        <Card variant="outlined" sx={{ p: '14px 18px', mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>ความคืบหน้าโดยรวม ปี {selectedYear + 543}</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: `${progressColor(pctAll)}.main` }}>{pctAll}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={pctAll} color={progressColor(pctAll)} sx={{ height: 10, borderRadius: 99 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75, fontSize: 11, color: 'text.secondary' }}>
            <span>เสร็จแล้ว {completed} เครื่อง</span>
            <span>เป้าหมาย {planned} เครื่อง</span>
          </Box>
        </Card>
      )}

      {/* ── Operational workflow ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 1.25, mb: 2.25 }}>
        {workflow.map(step => (
          <Card key={step.title} variant="outlined" sx={{ borderTop: 3, borderTopColor: `${step.color}.main` }}>
            <CardActionArea onClick={step.action} sx={{ p: '12px 14px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                <step.Icon sx={{ fontSize: 15, color: `${step.color}.main` }} />
                <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{step.title}</Typography>
              </Box>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.45 }}>{step.copy}</Typography>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      {/* ── Quick Actions ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 1.25, mb: 2.25 }}>
        {quickActions.map(a => (
          <Card key={a.title} variant="outlined" sx={{ bgcolor: (t) => alpha(t.palette[a.color].main, t.palette.mode === 'dark' ? 0.16 : 0.08), borderColor: `${a.color}.main` }}>
            <CardActionArea onClick={a.onClick} sx={{ p: '14px 16px' }}>
              <a.Icon sx={{ fontSize: 22, mb: 0.75, color: `${a.color}.main` }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{a.title}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>{a.sub}</Typography>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      {/* ── Plan breakdown table ── */}
      {displayPlans.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Box sx={{ p: '14px 18px', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
            <BarChartIcon fontSize="small" color="action" />
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>รายละเอียดแผน PM</Typography>
            <Chip size="small" label={`${displayPlans.length} แผน`} color="info" variant="outlined" sx={{ fontWeight: 700 }} />
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                {['แผนก / Site', 'ประเภท', 'เป้าหมาย', 'สร้างงาน', 'เสร็จ', 'ความคืบหน้า', 'วันเริ่ม', 'วันสิ้นสุด', 'สถานะ'].map(h => (
                  <TableCell key={h} sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayPlans.map((plan: any) => {
                const s = getRowStatus(plan);
                const isDept = Boolean(plan.deptTask);
                const label = isDept ? plan.deptTask : plan.site;

                return (
                  <TableRow
                    key={plan.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(s.total > 0 ? `/pm/runs?planId=${plan.id}` : '/pm/plans')}
                  >
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: 12 }}>{label || 'ทั่วไป'}</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>ปี {plan.year + 543}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={isDept ? 'secondary' : 'info'}
                        icon={isDept ? <BusinessIcon sx={{ fontSize: 12 }} /> : <PlaceIcon sx={{ fontSize: 12 }} />}
                        label={isDept ? 'แผนก' : 'Location'}
                        sx={{ fontSize: 10, fontWeight: 600, height: 20 }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>{plan.plannedDeviceCount}</TableCell>
                    <TableCell sx={{ textAlign: 'center', color: 'text.secondary' }}>{s.total}</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: 'success.main' }}>{s.done}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
                        <LinearProgress variant="determinate" value={s.pct} color={progressColor(s.pct)} sx={{ flex: 1, height: 6, borderRadius: 99 }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 700, minWidth: 34 }}>{s.pct}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, color: 'text.secondary', whiteSpace: 'nowrap' }}>{fmtDate(plan.startDate)}</TableCell>
                    <TableCell sx={{ fontSize: 11, color: 'text.secondary', whiteSpace: 'nowrap' }}>{fmtDate(plan.endDate)}</TableCell>
                    <TableCell>
                      <Chip size="small" color={s.color} icon={<s.Icon sx={{ fontSize: 13 }} />} label={s.label} sx={{ fontSize: 10, fontWeight: 700, height: 22 }} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Empty state ── */}
      {plans.length === 0 && !loading && (
        <Card variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <ShieldIcon sx={{ fontSize: 40, mb: 1.5, color: 'text.disabled' }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>ยังไม่มีข้อมูล PM</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5, mb: 2 }}>เริ่มต้นด้วยการสร้างแผน PM และ Generate งาน</Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={() => navigate('/pm/templates')}>สร้าง Template</Button>
            <Button variant="contained" startIcon={<AssignmentIcon />} onClick={() => navigate('/pm/plans')}>สร้างแผน PM</Button>
          </Box>
        </Card>
      )}
    </Box>
  );
}
