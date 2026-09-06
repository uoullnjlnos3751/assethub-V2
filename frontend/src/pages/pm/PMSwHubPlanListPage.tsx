import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  Card,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Snackbar,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  GlobalStyles,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import HubIcon from '@mui/icons-material/Hub';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PrintIcon from '@mui/icons-material/Print';
import BarChartIcon from '@mui/icons-material/BarChart';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import BuildIcon from '@mui/icons-material/Build';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PersonIcon from '@mui/icons-material/Person';
import LoopIcon from '@mui/icons-material/Loop';
import DescriptionIcon from '@mui/icons-material/Description';
import { pmSwHubPlanService, PMSwHubPlan, pmSwHubTemplateService } from '../../services/pmSwHub';
import { formatDate } from '../../utils/dateUtils';
import { Modal } from './components/Modal';
import { useConfirm } from '../../contexts/ConfirmContext';

function fmtDate(d: string | Date | null) {
  if (!d) return '—';
  return formatDate(d);
}

function periodLabel(period: string) {
  if (period === 'Monthly') return 'รายเดือน';
  if (period === 'Quarterly') return 'รายไตรมาส';
  if (period === 'Annual') return 'รายปี';
  return period || '—';
}

function invalidDateRange(startDate: string, endDate: string) {
  return Boolean(startDate && endDate && new Date(startDate) > new Date(endDate));
}

// Get Monday of the week for a given date
function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(date.setDate(diff));
}

// Get calendar week number of the year
function getCalendarWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

// Format date to Thai month short
function formatThaiMonthDay(date: Date) {
  const day = date.getDate();
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${day} ${months[date.getMonth()]}`;
}

const PRINT_STYLES = {
  '@media print': {
    '.no-print': { display: 'none !important' },
    '.pmp-root': { padding: '0 !important', width: '100% !important' },
    '.gantt-table': { fontSize: '10px !important' },
    'body': { background: '#fff !important' },
  },
};

export default function PMSwHubPlanListPage() {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PMSwHubPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState(currentYear); // Dynamic default
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [exporting, setExporting] = useState(false);

  // Gantt Chart View States
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [timeOffset, setTimeOffset] = useState(0);
  const [pmStartDate, setPmStartDate] = useState<string>('');

  const initialForm = {
    year: currentYear,
    floor: '',
    period: 'Monthly',
    startDate: '',
    endDate: '',
    technician: '',
    templateId: '' as string | number,
  };
  const [form, setForm] = useState(initialForm);
  const [templates, setTemplates] = useState<import('../../services/pmSwHub').PMSwHubTemplate[]>([]);

  const openCreateModal = () => {
    setEditingPlanId(null);
    setForm({ ...initialForm, year: filterYear });
    setModalOpen(true);
  };

  const handleEditPlan = (plan: PMSwHubPlan) => {
    setEditingPlanId(plan.id);
    setForm({
      year: plan.year,
      floor: plan.floor,
      period: plan.period,
      startDate: plan.startDate ? new Date(plan.startDate).toISOString().split('T')[0] : '',
      endDate: plan.endDate ? new Date(plan.endDate).toISOString().split('T')[0] : '',
      technician: plan.technician || '',
      templateId: plan.templateId ?? '',
    });
    setModalOpen(true);
  };

  // Load templates for the dropdown
  useEffect(() => {
    pmSwHubTemplateService.getAll()
      .then(res => setTemplates(res))
      .catch(() => {});
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const fetchPlans = () => {
    setLoading(true);
    pmSwHubPlanService.getAll()
      .then(res => {
        setPlans(res);

        // Find earliest start date to default PM Start Date for the selected year
        const validPlansForYear = res.filter((p: any) => p.startDate && p.year === filterYear);
        if (validPlansForYear.length > 0) {
          const minTime = Math.min(...validPlansForYear.map((p: any) => new Date(p.startDate).getTime()));
          const minDateStr = new Date(minTime).toISOString().split('T')[0];
          setPmStartDate(minDateStr);
        } else {
          setPmStartDate(`${filterYear}-01-01`);
        }
        setTimeOffset(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlans();
  }, [filterYear]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.floor) { showToast('⚠️ กรุณาเลือกชั้น / ห้องที่ต้องตรวจ'); return; }
    if (!form.startDate || !form.endDate) { showToast('⚠️ กรุณากำหนดวันเริ่มและวันสิ้นสุด'); return; }
    if (invalidDateRange(form.startDate, form.endDate)) { showToast('⚠️ วันที่สิ้นสุดน้อยกว่าวันที่เริ่มไม่ได้'); return; }

    setSaving(true);
    try {
    const payload = {
        ...form,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        templateId: form.templateId ? Number(form.templateId) : null,
      };

      if (editingPlanId) {
        await pmSwHubPlanService.update(editingPlanId, payload);
        showToast('✅ อัปเดตแผนงานสำเร็จ');
      } else {
        await pmSwHubPlanService.create(payload);
        showToast('✅ บันทึกแผนงานสำเร็จ');
      }

      setModalOpen(false);
      setForm(initialForm);
      fetchPlans();
    } catch (err) {
      showToast('❌ บันทึกแผนไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const confirm = useConfirm();
  const handleDelete = async (id: number, label?: string) => {
    if (!await confirm({
      title: 'ลบแผน PM SW/Hub Room',
      target: label,
      detail: 'งานตรวจทั้งหมดในแผนนี้จะถูกลบไปด้วย',
    })) return;
    setSaving(true);
    try {
      await pmSwHubPlanService.delete(id);
      showToast('✅ ลบแผนสำเร็จ');
      fetchPlans();
    } catch (err) {
      showToast('❌ ลบแผนไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const yearOptions = Array.from(new Set([
    2024, 2025, 2026, 2027,
    ...plans.map((p) => p.year),
  ])).sort();

  const filtered = plans.filter((plan) => {
    const q = search.toLowerCase();
    const matchYear = plan.year === filterYear;
    const matchQ = !q || plan.floor.toLowerCase().includes(q) || plan.technician?.toLowerCase().includes(q) || plan.period.toLowerCase().includes(q);
    return matchYear && matchQ;
  });

  const stats = useMemo(() => {
    const scoped = plans.filter((plan) => plan.year === filterYear);
    const completed = scoped.filter((plan) => plan.status === 'Completed').length;
    const active = scoped.filter((plan) => plan.status !== 'Completed').length;
    const monthly = scoped.filter((plan) => plan.period === 'Monthly').length;
    return { total: scoped.length, completed, active, monthly };
  }, [plans, filterYear]);

  // Generate Gantt Columns based on viewMode
  const columns = useMemo(() => {
    const cols = [];
    const baseDate = pmStartDate ? new Date(pmStartDate) : new Date(filterYear, 0, 1);

    if (viewMode === 'monthly') {
      const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
      months.forEach((m, i) => {
        cols.push({
          label: m,
          start: new Date(filterYear, i, 1, 0, 0, 0, 0),
          end: new Date(filterYear, i + 1, 0, 23, 59, 59, 999)
        });
      });
    } else if (viewMode === 'weekly') {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + (timeOffset * 7));
      let current = getMonday(d);
      for (let i = 0; i < 12; i++) {
        const next = new Date(current);
        next.setDate(current.getDate() + 6);
        next.setHours(23, 59, 59, 999);
        cols.push({
          label: `W${getCalendarWeek(current)}`,
          subLabel: formatThaiMonthDay(current),
          start: new Date(current),
          end: next
        });
        current.setDate(current.getDate() + 7);
      }
    } else { // daily
      const d = new Date(baseDate);
      d.setDate(d.getDate() + timeOffset);
      let current = new Date(d);
      current.setHours(0, 0, 0, 0);
      for (let i = 0; i < 21; i++) {
        const next = new Date(current);
        next.setHours(23, 59, 59, 999);
        cols.push({
          label: current.getDate().toString(),
          subLabel: formatThaiMonthDay(current),
          start: new Date(current),
          end: next,
          isWeekend: current.getDay() === 0 || current.getDay() === 6
        });
        current.setDate(current.getDate() + 1);
      }
    }
    return cols;
  }, [viewMode, filterYear, timeOffset, pmStartDate]);

  const visiblePeriodLabel = useMemo(() => {
    if (columns.length === 0) return '';
    const start = columns[0].start;
    const end = columns[columns.length - 1].end;
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    if (viewMode === 'monthly') return `ม.ค. - ธ.ค. ${filterYear + 543}`;

    const startMonth = months[start.getMonth()];
    const endMonth = months[end.getMonth()];

    if (startMonth === endMonth) {
      return `${startMonth} ${start.getFullYear() + 543}`;
    } else {
      return `${startMonth} - ${endMonth} ${start.getFullYear() + 543}`;
    }
  }, [columns, viewMode, filterYear]);

  // Excel Export Handler
  const handleExportExcel = async () => {
    try {
      setExporting(true);

      // 1. Fetch template items to use as headers
      const template = await pmSwHubTemplateService.getActive();
      const templateItems = template?.items || [];

      const dataRows: any[] = [];

      // Title
      dataRows.push([`รายงานแผนงานและสรุปผลตรวจ PM SW/Hub Room ประจำปี ${filterYear + 543}`]);
      dataRows.push([`ช่วงเวลาที่แสดงผล: ${visiblePeriodLabel}`]);
      dataRows.push([]);

      // Headers
      const headers = ['ลำดับ', 'พื้นที่ / ห้อง', 'รอบการตรวจ', 'ผู้รับผิดชอบ', 'วันที่เริ่ม', 'วันที่สิ้นสุด', 'สถานะ'];

      // Add Gantt headers
      columns.forEach(col => {
        headers.push(`${col.label} ${col.subLabel ? `(${col.subLabel})` : ''}`);
      });

      // Add Checklist headers
      templateItems.forEach(item => {
        headers.push(`[${item.group}] ${item.label}`);
      });

      dataRows.push(headers);

      // Data
      filtered.forEach((plan, idx) => {
        const row = [
          idx + 1,
          plan.floor,
          periodLabel(plan.period),
          plan.technician || '-',
          fmtDate(plan.startDate),
          fmtDate(plan.endDate),
          plan.status === 'Completed' ? 'เสร็จสิ้น' : 'รอดำเนินการ'
        ];

        // Fill Gantt cols
        const pStart = plan.startDate ? new Date(plan.startDate) : null;
        const pEnd = plan.endDate ? new Date(plan.endDate) : null;
        columns.forEach(col => {
          const isActive = pStart && pEnd && pStart <= col.end && pEnd >= col.start;
          row.push(isActive ? (plan.status === 'Completed' ? '✓' : '●') : '');
        });

        // Fill Checklist results from the latest record (swHubs)
        const swHubs = (plan as any).swHubs;
        let latestRecord = null;

        if (Array.isArray(swHubs) && swHubs.length > 0) {
          latestRecord = [...swHubs].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        }

        templateItems.forEach(tItem => {
          if (!latestRecord || !Array.isArray(latestRecord.items)) {
            row.push('-');
          } else {
            const rItem = latestRecord.items.find((i: any) => i.checkItem === tItem.label);
            if (!rItem) {
              row.push('-');
            } else {
              row.push(rItem.status === 'pass' ? 'ผ่าน (✓)' : rItem.status === 'fail' ? 'ไม่ผ่าน (✗)' : 'N/A');
            }
          }
        });

        dataRows.push(row);
      });

      if (!XLSX || !XLSX.utils) {
        throw new Error('XLSX library is not properly loaded');
      }

      const ws = XLSX.utils.aoa_to_sheet(dataRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "PM_Report");

      XLSX.writeFile(wb, `Detailed_PM_SW_Hub_Report_${filterYear + 543}.xlsx`);
      showToast('🚀 ส่งออกรายงานละเอียดสำเร็จ!');
    } catch (err: any) {
      console.error('Excel Export Error:', err);
      showToast(`❌ ไม่สามารถสร้างรายงานได้: ${err.message || 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box className="pmp-root">
      <GlobalStyles styles={PRINT_STYLES} />

      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.08), border: '1px solid', borderColor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HubIcon color="primary" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>แผน PM SW/Hub Room</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>วางแผนรอบตรวจห้อง Network / Hub Room — ปี {filterYear + 543}</Typography>
          </Box>
        </Box>
        <Box className="no-print" sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExportExcel} disabled={exporting}>
            {exporting ? 'กำลังสร้าง Excel...' : 'Excel Report'}
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>PDF / Print</Button>
          <Select size="small" sx={{ width: 110 }} value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
            {yearOptions.map(y => <MenuItem key={y} value={y}>ปี {y + 543}</MenuItem>)}
          </Select>
          <Button variant="outlined" startIcon={<BarChartIcon />} onClick={() => navigate('/pm/sw-hub')}>Dashboard</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateModal}>สร้างแผน SW/Hub</Button>
        </Box>
      </Box>

      <Box className="no-print" sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 1.25, mb: 2.25 }}>
        {[
          { Icon: AssignmentIcon, label: 'แผนทั้งหมด', val: stats.total, color: 'info' as const },
          { Icon: AutorenewIcon, label: 'กำลังดำเนินการ', val: stats.active, color: 'warning' as const },
          { Icon: CheckCircleIcon, label: 'เสร็จแล้ว', val: stats.completed, color: 'success' as const },
          { Icon: CalendarMonthIcon, label: 'รอบรายเดือน', val: stats.monthly, color: 'secondary' as const },
        ].map((s) => (
          <Card key={s.label} variant="outlined" sx={{ p: '12px 14px', display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <s.Icon sx={{ fontSize: 22, color: `${s.color}.main` }} />
            <Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: `${s.color}.main`, lineHeight: 1 }}>{s.val}</Typography>
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{s.label}</Typography>
            </Box>
          </Card>
        ))}
      </Box>

      {/* ── Gantt Chart Matrix ── */}
      <Card variant="outlined" sx={{ p: '16px 20px', mb: 2.25 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <BarChartIcon fontSize="small" /> ตารางแผนงานประจำปี {filterYear + 543} (Gantt Chart)
            {visiblePeriodLabel && <Box component="span" sx={{ color: 'primary.main', fontSize: 13 }}>[{visiblePeriodLabel}]</Box>}
          </Typography>

          <Box className="no-print" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <ToggleButtonGroup size="small" exclusive value={viewMode} onChange={(_, v) => { if (v) { setViewMode(v); setTimeOffset(0); } }}>
              <ToggleButton value="daily" sx={{ fontSize: 10 }}>รายวัน</ToggleButton>
              <ToggleButton value="weekly" sx={{ fontSize: 10 }}>รายสัปดาห์</ToggleButton>
              <ToggleButton value="monthly" sx={{ fontSize: 10 }}>รายเดือน</ToggleButton>
            </ToggleButtonGroup>

            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton aria-label="ก่อนหน้า"
                size="small"
                onClick={() => {
                  if (viewMode === 'monthly') setFilterYear(prev => prev - 1);
                  else setTimeOffset(prev => prev - (viewMode === 'weekly' ? 1 : 7));
                }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <IconButton aria-label="รีเซ็ต"
                size="small"
                onClick={() => {
                  setTimeOffset(0);
                  if (viewMode === 'monthly') setFilterYear(new Date().getFullYear());
                }}
              >
                <RestartAltIcon fontSize="small" />
              </IconButton>
              <IconButton aria-label="ถัดไป"
                size="small"
                onClick={() => {
                  if (viewMode === 'monthly') setFilterYear(prev => prev + 1);
                  else setTimeOffset(prev => prev + (viewMode === 'weekly' ? 1 : 7));
                }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>

        <TableContainer>
          <Table className="gantt-table" size="small" sx={{ fontSize: 12 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 100, color: 'text.secondary' }}>แผน / พื้นที่</TableCell>
                <TableCell sx={{ width: 60, textAlign: 'center', color: 'text.secondary' }}>รอบ</TableCell>
                <TableCell sx={{ width: 120, color: 'text.secondary' }}>ผู้รับผิดชอบ</TableCell>
                <TableCell sx={{ width: 130, color: 'text.secondary' }}>กำหนดการ</TableCell>
                {columns.map((col) => (
                  <TableCell key={col.start.getTime()} sx={{ textAlign: 'center', color: 'text.disabled', fontSize: 9, minWidth: viewMode === 'daily' ? 30 : 60 }}>
                    {col.label}<br />
                    {col.subLabel && <Box component="span" sx={{ fontWeight: 400, fontSize: 8 }}>{col.subLabel.split(' ')[0]}</Box>}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length > 0 ? filtered.map(plan => {
                const pStart = plan.startDate ? new Date(plan.startDate) : null;
                const pEnd = plan.endDate ? new Date(plan.endDate) : null;
                return (
                  <TableRow key={plan.id}>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <Chip size="small" label={plan.floor} sx={{ fontSize: 10, height: 20 }} />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontSize: 10, color: 'text.secondary' }}>{periodLabel(plan.period)}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>
                      <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>{plan.technician || '-'}</Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 10, color: 'text.secondary' }}>
                      <Box sx={{ fontWeight: 600, color: 'text.primary' }}>{fmtDate(plan.startDate)}</Box>
                      <Box sx={{ fontSize: 9 }}>ถึง {fmtDate(plan.endDate)}</Box>
                    </TableCell>
                    {columns.map(col => {
                      const isActive = pStart && pEnd && pStart <= col.end && pEnd >= col.start;
                      return (
                        <TableCell key={col.start.getTime()} sx={{ textAlign: 'center', bgcolor: col.isWeekend ? 'action.hover' : 'transparent' }}>
                          <Box
                            className="gantt-bar"
                            title={isActive ? `${fmtDate(plan.startDate)} - ${fmtDate(plan.endDate)}` : ''}
                            sx={{
                              height: 16, width: '100%', borderRadius: 1,
                              bgcolor: isActive ? (plan.status === 'Completed' ? 'success.main' : 'primary.main') : 'transparent',
                              border: isActive ? 'none' : '1px dashed', borderColor: 'divider',
                              opacity: isActive ? 1 : 0.3,
                            }}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              }) : (
                <TableRow><TableCell colSpan={4 + columns.length} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>ไม่มีแผนงานในช่วงเวลานี้</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Box className="no-print" sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', mb: 2.25 }}>
        {[
          { title: '1. เลือกพื้นที่', detail: 'กำหนดชั้น / Hub Room ที่ต้องตรวจ', color: 'info' as const },
          { title: '2. กำหนดรอบ', detail: 'Monthly, Quarterly หรือ Annual', color: 'secondary' as const },
          { title: '3. ตรวจหน้างาน', detail: 'เปิด checklist และบันทึกผลตรวจ', color: 'warning' as const },
          { title: '4. ติดตามปัญหา', detail: 'ดู Fail / Open issue ใน Dashboard', color: 'success' as const },
        ].map((step) => (
          <Card key={step.title} variant="outlined" sx={{ borderTop: 3, borderTopColor: `${step.color}.main`, p: '10px 12px', minWidth: 150, flex: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{step.title}</Typography>
            <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.45 }}>{step.detail}</Typography>
          </Card>
        ))}
      </Box>

      <Box className="no-print" sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          sx={{ maxWidth: 320, flex: 1 }}
          placeholder="ค้นหาชั้น / ผู้รับผิดชอบ / รอบตรวจ..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>แสดง {filtered.length}/{plans.filter(p => p.year === filterYear).length} แผน</Typography>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', p: 5, color: 'primary.main' }}>กำลังโหลด...</Box>
      ) : filtered.length === 0 ? (
        <Card variant="outlined" sx={{ textAlign: 'center', p: 6 }}>
          <HubIcon sx={{ fontSize: 32, mb: 1, color: 'text.disabled' }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>ยังไม่มีแผน PM SW/Hub ปี {filterYear + 543}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5, mb: 2 }}>เริ่มจากสร้างแผนตามชั้นและรอบตรวจ</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateModal}>สร้างแผนแรก</Button>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 1.75 }}>
          {filtered.map((plan) => {
            const isDone = plan.status === 'Completed';
            return (
              <Card variant="outlined" key={plan.id} sx={{ overflow: 'hidden' }}>
                <Box sx={{ height: 4, bgcolor: isDone ? 'success.main' : 'primary.main' }} />
                <Box sx={{ p: '14px 16px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.08), border: '1px solid', borderColor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <HubIcon color="primary" sx={{ fontSize: 16 }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{plan.floor}</Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 500, mt: 0.25 }}>ปี {plan.year + 543} · {periodLabel(plan.period)}</Typography>
                      </Box>
                    </Box>
                    <Chip
                      size="small"
                      color={isDone ? 'success' : 'info'}
                      icon={isDone ? <CheckCircleIcon sx={{ fontSize: 13 }} /> : <AutorenewIcon sx={{ fontSize: 13 }} />}
                      label={isDone ? 'เสร็จสิ้น' : 'รอดำเนินการ'}
                      sx={{ fontSize: 10, fontWeight: 700, height: 22 }}
                    />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, mb: 1.5 }}>
                    {[
                      { Icon: EventIcon, lbl: 'เริ่ม', val: fmtDate(plan.startDate) },
                      { Icon: EventAvailableIcon, lbl: 'สิ้นสุด', val: fmtDate(plan.endDate) },
                      { Icon: PersonIcon, lbl: 'ผู้รับผิดชอบ', val: plan.technician || '—' },
                      { Icon: LoopIcon, lbl: 'รอบ', val: periodLabel(plan.period) },
                    ].map((item) => (
                      <Box key={item.lbl} sx={{ bgcolor: 'action.hover', borderRadius: 1, p: '5px 8px' }}>
                        <Box sx={{ fontSize: 9, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}><item.Icon sx={{ fontSize: 10 }} /> {item.lbl}</Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{item.val}</Typography>
                      </Box>
                    ))}
                    <Box sx={{ gridColumn: '1 / span 2', bgcolor: 'action.hover', borderRadius: 1, p: '5px 8px' }}>
                      <Box sx={{ fontSize: 9, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}><DescriptionIcon sx={{ fontSize: 10 }} /> PM Template (Checklist)</Box>
                      <Box sx={{ fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {plan.template ? (
                          <><CheckCircleIcon sx={{ fontSize: 12, color: 'success.main' }} /> {plan.template.name}</>
                        ) : (
                          <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>— ใช้ Template เริ่มต้น —</Box>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <Box className="no-print" sx={{ display: 'flex', gap: 0.75 }}>
                    {!isDone ? (
                      <Button
                        size="small"
                        variant="contained"
                        fullWidth
                        startIcon={<BuildIcon />}
                        onClick={() => navigate(`/pm/sw-hub/new?planId=${plan.id}&floor=${plan.floor.replace('F', '')}&period=${plan.period}`)}
                      >
                        ตรวจ SW/Hub
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        fullWidth
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/pm/sw-hub/new?planId=${plan.id}&floor=${plan.floor.replace('F', '')}&period=${plan.period}`)}
                      >
                        แก้ไขผลตรวจ
                      </Button>
                    )}

                    <IconButton aria-label="แก้ไข" size="small" onClick={() => handleEditPlan(plan)} title="แก้ไขข้อมูลแผน"><EditIcon fontSize="small" /></IconButton>
                    <IconButton aria-label="ลบ" size="small" color="error" onClick={() => handleDelete(plan.id, `ชั้น ${plan.floor} · ${plan.period}`)} disabled={saving} title="ลบแผน"><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth={560}
        title={editingPlanId ? 'แก้ไขแผน PM SW/Hub Room' : 'สร้างแผน PM SW/Hub Room'}
      >
        <Box component="form" onSubmit={handleSave}>
          <Box sx={{ p: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>ปีที่วางแผน</Typography>
              <Select fullWidth size="small" value={form.year} onChange={e => setForm(p => ({ ...p, year: Number(e.target.value) }))}>
                {yearOptions.map(y => <MenuItem key={y} value={y}>พ.ศ. {y + 543} ({y})</MenuItem>)}
              </Select>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>ชั้น / Hub Room *</Typography>
              <Select fullWidth size="small" displayEmpty value={form.floor} onChange={e => setForm(p => ({ ...p, floor: e.target.value }))}>
                <MenuItem value=""><em>-- เลือกชั้น --</em></MenuItem>
                {['F22', 'F23', 'F24', 'F25', 'F26', 'F27'].map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
              </Select>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>รอบตรวจ</Typography>
              <Select fullWidth size="small" value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))}>
                <MenuItem value="Monthly">รายเดือน (Monthly)</MenuItem>
                <MenuItem value="Quarterly">รายไตรมาส (Quarterly)</MenuItem>
                <MenuItem value="Annual">รายปี (Annual)</MenuItem>
              </Select>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>ผู้รับผิดชอบ</Typography>
              <TextField fullWidth size="small" value={form.technician} placeholder="ชื่อผู้รับผิดชอบ" onChange={e => setForm(p => ({ ...p, technician: e.target.value }))} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>วันที่เริ่ม *</Typography>
              <DatePicker
                format="DD/MM/YYYY"
                value={form.startDate ? dayjs(form.startDate) : null}
                onChange={(newVal) => setForm(p => ({ ...p, startDate: newVal ? newVal.format('YYYY-MM-DD') : '' }))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>วันที่สิ้นสุด *</Typography>
              <DatePicker
                format="DD/MM/YYYY"
                value={form.endDate ? dayjs(form.endDate) : null}
                onChange={(newVal) => setForm(p => ({ ...p, endDate: newVal ? newVal.format('YYYY-MM-DD') : '' }))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Box>
            <Box sx={{ gridColumn: '1 / span 2' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>PM Template (Checklist)</Typography>
              <Select fullWidth size="small" displayEmpty value={form.templateId} onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))}>
                <MenuItem value="">— ไม่ระบุ / ใช้ Template ที่ Active อยู่ —</MenuItem>
                {templates.map(t => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.isActive ? '✓ ' : ''}{t.name}{t.isActive ? ' (Active)' : ''}
                  </MenuItem>
                ))}
              </Select>
              <Typography sx={{ mt: 0.5, fontSize: 10, color: 'text.secondary' }}>
                {form.templateId
                  ? `เลือก: ${templates.find(t => String(t.id) === String(form.templateId))?.name || '—'} · ${templates.find(t => String(t.id) === String(form.templateId))?.items?.length ?? 0} รายการ`
                  : 'หากไม่เลือก จะใช้ Template ที่ Active อยู่ขณะตรวจ'}
              </Typography>
            </Box>
            {form.startDate && form.endDate && (
              <Alert severity={invalidDateRange(form.startDate, form.endDate) ? 'error' : 'info'} sx={{ gridColumn: '1 / span 2', py: 0.25 }}>
                {invalidDateRange(form.startDate, form.endDate) ? 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่ม' : `ระยะเวลา ${Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000)} วัน`}
              </Alert>
            )}
          </Box>

          <Box sx={{ p: '12px 20px', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button type="button" variant="outlined" onClick={() => setModalOpen(false)}>ยกเลิก</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึกแผน'}</Button>
          </Box>
        </Box>
      </Modal>

      <Snackbar open={!!toast} autoHideDuration={2800} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.startsWith('❌') ? 'error' : toast.startsWith('⚠️') ? 'warning' : 'success'} variant="filled" sx={{ whiteSpace: 'nowrap' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
