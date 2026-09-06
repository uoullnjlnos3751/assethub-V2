import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  ListSubheader,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Card,
  LinearProgress,
  Snackbar,
  Alert,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { alpha, useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import BusinessIcon from '@mui/icons-material/Business';
import EngineeringIcon from '@mui/icons-material/Engineering';
import ComputerIcon from '@mui/icons-material/Computer';
import BarChartIcon from '@mui/icons-material/BarChart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import EventIcon from '@mui/icons-material/Event';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SearchIcon from '@mui/icons-material/Search';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import PersonIcon from '@mui/icons-material/Person';
import PushPinIcon from '@mui/icons-material/PushPin';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { pmAPI, assetAPI } from '../../services/api';
import { PlanGapPanel, GapPrefill } from './components/PlanGapPanel';
import { PlanGap } from './pmPlanGaps';
import { formatDate } from '../../utils/dateUtils';
import { Modal } from './components/Modal';
import { useConfirm } from '../../contexts/ConfirmContext';

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */
interface PlanForm {
  year: number;
  company: string;
  site: string;
  deptTask: string;
  deviceType: string;
  lead: string;
  plannedDeviceCount: number;
  startDate: string;
  endDate: string;
  templateId: string;
}

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */
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

function invalidDateRange(startDate: string, endDate: string) {
  return Boolean(startDate && endDate && new Date(startDate) > new Date(endDate));
}

function getPlanStatus(plan: any) {
  const runs = plan.runs || [];
  const total = plan.totalCount ?? runs.length;
  const done = plan.completedCount ?? runs.filter((r: any) => r.status === 'COMPLETED').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const start = plan.startDate ? new Date(plan.startDate) : null;
  const end = plan.endDate ? new Date(plan.endDate) : null;
  const today = new Date();
  const isActive = !!(start && end && today >= start && today <= end);
  const isOverdue = !!(end && today > end && pct < 100);
  const isDone = pct >= 100 && total > 0;
  const notGenerated = total === 0;

  if (isDone) return { total, done, pct, color: 'success' as const, label: 'เสร็จ', Icon: CheckCircleIcon };
  if (isOverdue) return { total, done, pct, color: 'error' as const, label: 'เกินกำหนด', Icon: WarningAmberIcon };
  if (isActive) return { total, done, pct, color: 'info' as const, label: 'ดำเนินการ', Icon: AutorenewIcon };
  if (notGenerated) return { total, done, pct, color: 'secondary' as const, label: 'ยังไม่ Generate', Icon: FiberNewIcon };
  return { total, done, pct, color: 'default' as const, label: 'กำหนดการ', Icon: EventIcon };
}

/* ─────────────────────────────────────────────────────────────
   Shared bits
───────────────────────────────────────────────────────────────── */
function EligibilityStats({ data }: { data: any }) {
  const items: { label: string; value: number; color: 'primary' | 'inherit' | 'success' | 'warning' }[] = [
    { label: 'ใน scope', value: data.totalInScope, color: 'primary' },
    { label: 'มีงานปีนี้แล้ว', value: data.alreadyInYear, color: 'inherit' },
    { label: 'เหลือสร้างได้', value: data.available, color: 'success' },
    { label: 'จะสร้างได้', value: data.creatable, color: 'warning' },
  ];
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1 }}>
      {items.map((item) => (
        <Paper key={item.label} variant="outlined" sx={{ p: '8px 10px' }}>
          <Typography sx={{ fontSize: 21, fontWeight: 800, lineHeight: 1, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', color: item.color === 'inherit' ? 'text.primary' : `${item.color}.main` }}>
            {item.value}
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.4 }}>{item.label}</Typography>
        </Paper>
      ))}
    </Box>
  );
}

function PlanFormFields({
  form,
  onChange,
  yearOptions,
  companyOptions,
  locOptions,
  deptOptions,
  typeOptions,
  leadOptions,
  templates,
  disabled,
  onNoTemplateClick,
}: {
  form: PlanForm;
  onChange: (patch: Partial<PlanForm>) => void;
  yearOptions: number[];
  companyOptions: string[];
  locOptions: string[];
  deptOptions: string[];
  typeOptions: string[];
  leadOptions: { users: string[]; legacy: string[] };
  templates: any[];
  disabled?: { year?: boolean; company?: boolean; site?: boolean; dept?: boolean; template?: boolean; countMin?: number };
  onNoTemplateClick?: () => void;
}) {
  const days = form.startDate && form.endDate
    ? Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000)
    : 0;
  const weeks = Math.ceil(days / 7);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>ปีที่วางแผน (พ.ศ.)</Typography>
        <Select fullWidth size="small" value={form.year} disabled={disabled?.year} onChange={(e) => onChange({ year: Number(e.target.value) })}>
          {yearOptions.map((y) => <MenuItem key={y} value={y}>พ.ศ. {y + 543} ({y})</MenuItem>)}
        </Select>
      </Box>

      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>บริษัท (Company)</Typography>
        <Select fullWidth size="small" displayEmpty value={form.company} disabled={disabled?.company} onChange={(e) => onChange({ company: e.target.value })}>
          <MenuItem value="">ทุกบริษัท (All Companies)</MenuItem>
          {companyOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </Select>
      </Box>

      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>สถานที่ / ไซต์ (Location/Site)</Typography>
        <Select fullWidth size="small" displayEmpty value={form.site} disabled={disabled?.site} onChange={(e) => onChange({ site: e.target.value })}>
          <MenuItem value="">ทุกสถานที่ (All Locations)</MenuItem>
          {locOptions.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
        </Select>
      </Box>

      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>แผนก (Department)</Typography>
        <Select fullWidth size="small" displayEmpty value={form.deptTask} disabled={disabled?.dept} onChange={(e) => onChange({ deptTask: e.target.value })}>
          <MenuItem value="">ทุกแผนก (All Departments)</MenuItem>
          {deptOptions.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
        </Select>
      </Box>

      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>ประเภทอุปกรณ์ (Device Type)</Typography>
        <Select fullWidth size="small" displayEmpty value={form.deviceType} onChange={(e) => onChange({ deviceType: e.target.value })}>
          <MenuItem value="">ทุกประเภท (All Types)</MenuItem>
          {/* รายการมีเฉพาะประเภทที่มีเครื่องอยู่จริง — แผนที่เล็งประเภทที่ไม่มีเครื่อง
              เลยจะได้เป้าหมาย 0 เสมอ · ประเภทเดิมของแผนที่กำลังแก้ไขถูกคงไว้ให้เลือกได้
              เสมอ ไม่งั้นช่องจะว่างเปล่าตอนเปิดแผนเก่าที่ประเภทเลิกใช้ไปแล้ว */}
          {(form.deviceType && form.deviceType !== '__ALL__' && !typeOptions.includes(form.deviceType)
            ? [form.deviceType, ...typeOptions] : typeOptions
          ).map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </Select>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>ผู้รับผิดชอบ (Lead)</Typography>
          {/* Was free text, and all 31 plans in 2569 ended up holding the
              literal "IT Support" — no way to filter or report by owner.
              Values already stored stay selectable via leadOptions.legacy. */}
          <Select fullWidth size="small" displayEmpty value={form.lead}
            onChange={(e) => onChange({ lead: e.target.value })}
            renderValue={(v) => (v as string) || <Box component="span" sx={{ color: 'text.disabled' }}>ยังไม่ระบุ</Box>}>
            <MenuItem value="">ยังไม่ระบุ</MenuItem>
            {leadOptions.users.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            {leadOptions.legacy.length > 0 && <ListSubheader sx={{ fontSize: 10, lineHeight: 2.2 }}>ค่าเดิมในระบบ</ListSubheader>}
            {leadOptions.legacy.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
          </Select>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>จำนวนเครื่องตามแผน</Typography>
          <TextField
            fullWidth
            size="small"
            type="number"
            inputProps={{ min: disabled?.countMin ?? 1 }}
            value={form.plannedDeviceCount}
            onChange={(e) => onChange({ plannedDeviceCount: Number(e.target.value) })}
          />
          {disabled?.countMin !== undefined && disabled.countMin > 0 && (
            <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.5 }}>* ปรับเป้าหมายให้ตรงกับงานจริงได้</Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>วันที่เริ่ม *</Typography>
          <DatePicker
            format="DD/MM/YYYY"
            value={form.startDate ? dayjs(form.startDate) : null}
            onChange={(newVal) => onChange({ startDate: newVal ? newVal.format('YYYY-MM-DD') : '' })}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>วันที่สิ้นสุด *</Typography>
          <DatePicker
            format="DD/MM/YYYY"
            value={form.endDate ? dayjs(form.endDate) : null}
            onChange={(newVal) => onChange({ endDate: newVal ? newVal.format('YYYY-MM-DD') : '' })}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        </Box>
      </Box>

      {days > 0 && (
        <Alert severity="info" icon={<EventIcon fontSize="inherit" />} sx={{ py: 0.25 }}>
          ระยะเวลา {days} วัน ({weeks} สัปดาห์) · สิ้นสุด {fmtDate(form.endDate)}
        </Alert>
      )}

      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>PM Template (Checklist)</Typography>
        <Select fullWidth size="small" displayEmpty value={form.templateId} disabled={disabled?.template} onChange={(e) => onChange({ templateId: e.target.value })}>
          <MenuItem value="">
            <em>-- เลือก Template สำหรับตรวจ PM --</em>
          </MenuItem>
          {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
        </Select>
        {templates.length === 0 ? (
          <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LightbulbIcon sx={{ fontSize: 12 }} /> ยังไม่มี Template —{' '}
            <Box component="span" sx={{ color: 'primary.main', cursor: 'pointer', textDecoration: 'underline' }} onClick={onNoTemplateClick}>
              สร้าง Template
            </Box>
          </Typography>
        ) : (
          <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.5 }}>
            จำเป็นต้องเลือก Template เพราะงาน PM ต้องมีรายการตรวจเช็คก่อนบันทึกผลได้
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────── */
export default function PMPlanListPage() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [deptOptions, setDeptOptions] = useState<string[]>([]);
  // The create/edit modals show only the departments the chosen company
  // actually owns assets in — the full list is 32 codes while TRRT has two,
  // and a plan scoped to a department with no machines generates nothing.
  // The filter bar above keeps the full list, since it filters plans that
  // may reference any department.
  const [formDeptOptions, setFormDeptOptions] = useState<string[]>([]);
  const [editDeptOptions, setEditDeptOptions] = useState<string[]>([]);
  const [formLocOptions, setFormLocOptions] = useState<string[]>([]);
  const [editLocOptions, setEditLocOptions] = useState<string[]>([]);
  const [locOptions, setLocOptions] = useState<string[]>([]);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [leadOptions, setLeadOptions] = useState<{ users: string[]; legacy: string[] }>({ users: [], legacy: [] });
  const [gaps, setGaps] = useState<PlanGap[]>([]);
  // Chip filters. Company/type also scope the gap panel above the list.
  const [selCompany, setSelCompany] = useState<Set<string>>(new Set());
  const [selType, setSelType] = useState<Set<string>>(new Set());
  const [selStatus, setSelStatus] = useState<Set<string>>(new Set());
  const [collapsedCos, setCollapsedCos] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eligibility, setEligibility] = useState<any>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [generateEligibility, setGenerateEligibility] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [generateModal, setGenerateModal] = useState<{ open: boolean; plan: any }>({ open: false, plan: null });
  const [genMsg, setGenMsg] = useState('');
  const [toast, setToast] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterCompany, setFilterCompany] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDeviceType, setFilterDeviceType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<any>(null);
  const [editForm, setEditForm] = useState<PlanForm>({
    year: new Date().getFullYear(),
    company: '',
    site: '',
    deptTask: '',
    deviceType: '',
    lead: '',
    plannedDeviceCount: 10,
    startDate: '',
    endDate: '',
    templateId: '',
  });

  const [form, setForm] = useState<PlanForm>({
    year: new Date().getFullYear(),
    company: '',
    site: '',
    deptTask: '',
    deviceType: '',
    lead: '',
    plannedDeviceCount: 10,
    startDate: '',
    endDate: '',
    templateId: '',
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      pmAPI.plans(),
      pmAPI.templates(true),
      assetAPI.departmentOptions(),
      assetAPI.locationOptions(),
      assetAPI.companyOptions(),
      assetAPI.typeOptions(true),
      pmAPI.leads(),
      pmAPI.planGaps({ year: filterYear }),
    ]).then(([p, t, d, l, c, ty, ld, gp]) => {
      setPlans(p.data || []);
      setTemplates(t.data || []);
      setDeptOptions((d.data || []).map((x: any) => typeof x === 'string' ? x : x.name || x));
      setLocOptions((l.data || []).map((x: any) => typeof x === 'string' ? x : x.name || x));
      setCompanyOptions((c.data || []).map((x: any) => typeof x === 'string' ? x : x.name || x));
      setTypeOptions((ty.data || []).map((x: any) => typeof x === 'string' ? x : x.name || x));
      setLeadOptions({ users: ld.data?.users || [], legacy: ld.data?.legacy || [] });
      setGaps(gp.data?.gaps || []);
    }).finally(() => setLoading(false));
  };

  // Gaps are year-scoped, so the whole payload is refetched when the year changes.
  useEffect(() => { fetchAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filterYear]);

  // Scoped department lists for the two modals. Re-fetched on company change,
  // and any selection that is no longer offered is cleared rather than left
  // sitting in a field the user can no longer see in the list.
  useEffect(() => {
    if (!modalOpen) return;
    const company = (form.company === '__ALL__' || !form.company) ? '' : form.company;
    let cancelled = false;
    Promise.all([assetAPI.departmentOptions(company), assetAPI.locationOptions(company)])
      .then(([d, l]) => {
        if (cancelled) return;
        const depts = (d.data || []).map((x: any) => typeof x === 'string' ? x : x.name || x);
        const locs = (l.data || []).map((x: any) => typeof x === 'string' ? x : x.name || x);
        setFormDeptOptions(depts);
        setFormLocOptions(locs);
        setForm(prev => ({
          ...prev,
          deptTask: prev.deptTask && !depts.includes(prev.deptTask) ? '' : prev.deptTask,
          site: prev.site && !locs.includes(prev.site) ? '' : prev.site,
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setFormDeptOptions(deptOptions);
        setFormLocOptions(locOptions);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, form.company]);

  useEffect(() => {
    if (!editModalOpen) return;
    const company = (editForm.company === '__ALL__' || !editForm.company) ? '' : editForm.company;
    let cancelled = false;
    Promise.all([assetAPI.departmentOptions(company), assetAPI.locationOptions(company)])
      .then(([d, l]) => {
        if (cancelled) return;
        const depts: string[] = (d.data || []).map((x: any) => typeof x === 'string' ? x : x.name || x);
        const locs: string[] = (l.data || []).map((x: any) => typeof x === 'string' ? x : x.name || x);
        // On edit the plan's own department and site stay selectable even when
        // they fall outside the scoped lists — dropping them would silently
        // rewrite the scope of an existing plan on save.
        const keep = (list: string[], current: string) =>
          current && !list.includes(current) ? [...list, current] : list;
        setEditDeptOptions(keep(depts, editForm.deptTask));
        setEditLocOptions(keep(locs, editForm.site));
      })
      .catch(() => {
        if (cancelled) return;
        setEditDeptOptions(deptOptions);
        setEditLocOptions(locOptions);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editModalOpen, editForm.company]);

  useEffect(() => {
    if (!modalOpen) return;
    const companyVal = (form.company === '__ALL__' || !form.company) ? '' : form.company;
    const siteVal = (form.site === '__ALL__' || !form.site) ? '' : form.site;
    const deptVal = (form.deptTask === '__ALL__' || !form.deptTask) ? '' : form.deptTask;
    const typeVal = (form.deviceType === '__ALL__' || !form.deviceType) ? '' : form.deviceType;
    if (!companyVal && !siteVal && !deptVal && !typeVal) {
      setEligibility(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setEligibilityLoading(true);
      pmAPI.eligibility({
        year: form.year,
        company: companyVal || undefined,
        site: siteVal || undefined,
        deptTask: deptVal || undefined,
        deviceType: typeVal || undefined,
        plannedDeviceCount: form.plannedDeviceCount,
      })
        .then((res) => {
          const data = res.data;
          setEligibility(data);
          setForm((prev) => (
            data.available > 0
              ? { ...prev, plannedDeviceCount: data.available }
              : prev
          ));
        })
        .catch(() => setEligibility(null))
        .finally(() => setEligibilityLoading(false));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [modalOpen, form.year, form.company, form.site, form.deptTask, form.deviceType, form.plannedDeviceCount]);

  useEffect(() => {
    const plan = generateModal.plan;
    if (!generateModal.open || !plan) {
      setGenerateEligibility(null);
      return;
    }
    pmAPI.eligibility({
      year: plan.year,
      company: plan.company || undefined,
      site: plan.site || undefined,
      deptTask: plan.deptTask || undefined,
      deviceType: plan.deviceType || undefined,
      plannedDeviceCount: plan.plannedDeviceCount,
    })
      .then((res) => setGenerateEligibility(res.data))
      .catch(() => setGenerateEligibility(null));
  }, [generateModal.open, generateModal.plan]);

  const handleCreate = async () => {
    if (!form.startDate || !form.endDate) { showToast('⚠️ กรุณากำหนดวันเริ่มและวันสิ้นสุด'); return; }
    if (invalidDateRange(form.startDate, form.endDate)) { showToast('⚠️ วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่ม'); return; }
    if (!form.templateId) { showToast('⚠️ กรุณาเลือก Checklist Template ก่อนสร้างแผน PM'); return; }
    if (form.plannedDeviceCount < 1) { showToast('⚠️ จำนวนเครื่องตามแผนต้องมากกว่า 0'); return; }

    const companyVal = (form.company === '__ALL__' || !form.company) ? '' : form.company;
    const siteVal = (form.site === '__ALL__' || !form.site) ? '' : form.site;
    const deptVal = (form.deptTask === '__ALL__' || !form.deptTask) ? '' : form.deptTask;
    const typeVal = (form.deviceType === '__ALL__' || !form.deviceType) ? '' : form.deviceType;

    if (!companyVal && !siteVal && !deptVal && !typeVal) {
      showToast('⚠️ กรุณาระบุ บริษัท, สถานที่, แผนก หรือ ประเภทอุปกรณ์ อย่างใดอย่างหนึ่ง');
      return;
    }

    setSaving(true);
    try {
      await pmAPI.createPlan({
        year: form.year,
        company: companyVal,
        site: siteVal,
        deptTask: deptVal,
        deviceType: typeVal,
        lead: form.lead,
        plannedDeviceCount: form.plannedDeviceCount,
        startDate: form.startDate,
        endDate: form.endDate,
        templateId: form.templateId ? parseInt(form.templateId) : undefined,
      });
      showToast('✅ สร้างแผน PM สำเร็จ');
      setModalOpen(false);
      setForm({
        year: new Date().getFullYear(),
        company: '',
        site: '',
        deptTask: '',
        deviceType: '',
        lead: '',
        plannedDeviceCount: 10,
        startDate: '',
        endDate: '',
        templateId: '',
      });
      fetchAll();
    } catch (err: any) {
      showToast(`❌ ${err.response?.data?.error || 'สร้างแผนไม่สำเร็จ'}`);
    } finally { setSaving(false); }
  };

  /** Opens the create form already filled in from a gap row or a merged
   *  selection. Several plans at once are queued so the user confirms each
   *  one rather than having them written silently. */
  const [gapQueue, setGapQueue] = useState<GapPrefill[]>([]);
  const openFromGap = (prefills: GapPrefill[]) => {
    if (!prefills.length) return;
    const [first, ...rest] = prefills;
    setGapQueue(rest);
    setForm(prev => ({
      ...prev,
      year: filterYear,
      company: first.company,
      site: '',
      deptTask: first.dept,
      deviceType: first.type,
      plannedDeviceCount: first.count,
    }));
    setModalOpen(true);
    if (rest.length) showToast(`เตรียมไว้ ${prefills.length} แผน — บันทึกทีละแผน เหลืออีก ${rest.length}`);
  };

  const handleOpenEdit = (plan: any) => {
    setSelectedPlanForEdit(plan);
    setEditForm({
      year: plan.year,
      company: plan.company || '',
      site: plan.site || '',
      deptTask: plan.deptTask || '',
      deviceType: plan.deviceType || '',
      lead: plan.lead || '',
      plannedDeviceCount: plan.plannedDeviceCount || 0,
      startDate: plan.startDate ? plan.startDate.substring(0, 10) : '',
      endDate: plan.endDate ? plan.endDate.substring(0, 10) : '',
      templateId: plan.templateId ? String(plan.templateId) : '',
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedPlanForEdit) return;
    if (!editForm.startDate || !editForm.endDate) { showToast('⚠️ กรุณากำหนดวันเริ่มและวันสิ้นสุด'); return; }
    if (invalidDateRange(editForm.startDate, editForm.endDate)) { showToast('⚠️ วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่ม'); return; }
    if (!editForm.templateId) { showToast('⚠️ กรุณาเลือก Checklist Template ก่อนบันทึกแผน PM'); return; }
    if (editForm.plannedDeviceCount < 1) { showToast('⚠️ จำนวนเครื่องตามแผนต้องมากกว่า 0'); return; }

    const companyVal = (editForm.company === '__ALL__' || !editForm.company) ? '' : editForm.company;
    const siteVal = (editForm.site === '__ALL__' || !editForm.site) ? '' : editForm.site;
    const deptVal = (editForm.deptTask === '__ALL__' || !editForm.deptTask) ? '' : editForm.deptTask;
    const typeVal = (editForm.deviceType === '__ALL__' || !editForm.deviceType) ? '' : editForm.deviceType;

    if (!companyVal && !siteVal && !deptVal && !typeVal) {
      showToast('⚠️ กรุณาระบุ บริษัท, สถานที่, แผนก หรือ ประเภทอุปกรณ์ อย่างใดอย่างหนึ่ง');
      return;
    }

    setSaving(true);
    try {
      await pmAPI.updatePlan(selectedPlanForEdit.id, {
        year: editForm.year,
        company: companyVal,
        site: siteVal,
        deptTask: deptVal,
        deviceType: typeVal,
        lead: editForm.lead,
        plannedDeviceCount: editForm.plannedDeviceCount,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        templateId: editForm.templateId ? parseInt(editForm.templateId) : undefined,
      });
      showToast('✅ อัปเดตแผน PM สำเร็จ');
      setEditModalOpen(false);
      fetchAll();
    } catch (err: any) {
      showToast(`❌ ${err.response?.data?.error || 'แก้ไขแผนไม่สำเร็จ'}`);
    } finally { setSaving(false); }
  };

  const handleDelete = async (planId: number) => {
    const p = plans.find(x => x.id === planId);
    if (!await confirm({
      title: 'ลบแผน PM',
      target: p ? `${p.company || ''} ${p.deptTask || 'ทุกแผนก'} · ${p.deviceType || ''}`.trim() : `แผน #${planId}`,
      detail: `งาน PM ทั้งหมดในแผนนี้${p?.totalCount ? ` (${p.totalCount} รายการ` + (p.completedCount ? `, ทำเสร็จแล้ว ${p.completedCount}` : '') + ')' : ''} จะถูกลบไปด้วย และกู้คืนไม่ได้`,
    })) {
      return;
    }

    setSaving(true);
    try {
      await pmAPI.deletePlan(planId);
      showToast('✅ ลบแผน PM สำเร็จ');
      fetchAll();
    } catch (err: any) {
      showToast(`❌ ${err.response?.data?.error || 'ลบแผนไม่สำเร็จ'}`);
    } finally { setSaving(false); }
  };

  const handleGenerate = async () => {
    if (!generateModal.plan) return;
    setSaving(true);
    try {
      const res = await pmAPI.generate(generateModal.plan.id);
      setGenMsg(res.data?.message || 'สร้างงาน PM สำเร็จ');
      fetchAll();
    } catch (err: any) {
      setGenMsg(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally { setSaving(false); }
  };

  /** Single source of truth for a plan's status — used by the chips, their
   *  counts and the filter alike. */
  const planStatusKey = (p: any): string => {
    const completed = p.runs?.filter((r: any) => r.status === 'COMPLETED').length || p.completedCount || 0;
    const total = p.runs?.length || p.totalCount || 0;
    if (total === 0) return 'NOT_GENERATED';
    if (completed >= total) return 'COMPLETED';
    if (p.endDate && new Date(p.endDate) < new Date()) return 'OVERDUE';
    return 'IN_PROGRESS';
  };

  const filteredPlans = plans.filter(p => {
    if (p.year !== filterYear) return false;
    if (selCompany.size && !selCompany.has(p.company)) return false;
    if (filterDept && p.deptTask !== filterDept) return false;
    if (selType.size && !selType.has(p.deviceType)) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchesSearch = (p.deptTask || '').toLowerCase().includes(q) ||
        (p.company || '').toLowerCase().includes(q) ||
        (p.site || '').toLowerCase().includes(q) ||
        (p.lead || '').toLowerCase().includes(q) ||
        (p.deviceType || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    if (selStatus.size && !selStatus.has(planStatusKey(p))) return false;
    return true;
  });
  const totalPlanned = filteredPlans.reduce((s: number, p: any) => s + (p.plannedDeviceCount || 0), 0);
  const totalRuns = filteredPlans.reduce((s: number, p: any) => s + (p.runs?.length || p.totalCount || 0), 0);
  const totalDone = filteredPlans.reduce((s: number, p: any) => s + (p.runs?.filter((r: any) => r.status === 'COMPLETED').length || p.completedCount || 0), 0);
  const overallPct = totalRuns > 0 ? Math.round(totalDone / totalRuns * 100) : 0;

  // Gap rows narrowed by the same company/type chips the plan list uses.
  const visibleGapUnits = gaps
    .filter(g => (!selCompany.size || selCompany.has(g.company)) && (!selType.size || selType.has(g.type)))
    .reduce((s, g) => s + g.free, 0);

  // Plans that need generation (no runs yet)
  const plansNeedGenerate = filteredPlans.filter(p => {
    const total = p.totalCount ?? (p.runs?.length || 0);
    return total === 0;
  });

  // Unique device types for filter
  const deviceTypeFilterOptions = Array.from(new Set(plans.filter(p => p.year === filterYear).map((p: any) => p.deviceType).filter(Boolean))) as string[];

  const yearOptions = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i);

  const theme = useTheme();
  const yearPlans = plans.filter(p => p.year === filterYear);
  // Choices come from the plans plus the gap rows, so a company that has no
  // plan yet — the very case the gap panel is about — still gets a chip.
  const companyChoices = Array.from(new Set([
    ...yearPlans.map((p: any) => p.company).filter(Boolean),
    ...gaps.map(g => g.company),
  ])) as string[];
  companyChoices.sort((a, b) => a.localeCompare(b, 'th'));
  const typeChoices = Array.from(new Set([
    ...yearPlans.map((p: any) => p.deviceType).filter(Boolean),
    ...gaps.map(g => g.type),
  ])) as string[];
  typeChoices.sort((a, b) => a.localeCompare(b, 'th'));

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, v: string) =>
    setter(prev => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; });

  const anyPlanFilter = !!(searchTerm || filterDept || selCompany.size || selType.size || selStatus.size);
  const clearPlanFilters = () => {
    setSearchTerm(''); setFilterDept('');
    setSelCompany(new Set()); setSelType(new Set()); setSelStatus(new Set());
  };

  const PLAN_STATUS_CHIPS: { key: string; label: string; color: (t: any) => string }[] = [
    { key: 'NOT_GENERATED', label: 'ยังไม่ Generate', color: (t) => t.palette.error.main },
    { key: 'OVERDUE', label: 'ล่าช้ากว่ากำหนด', color: (t) => t.palette.error.main },
    { key: 'IN_PROGRESS', label: 'กำลังดำเนินการ', color: (t) => t.palette.info.main },
    { key: 'COMPLETED', label: 'เสร็จสิ้นแล้ว', color: (t) => t.palette.success.main },
  ];

  const planChipSx = (active: boolean, color?: string) => ({
    fontSize: 11, height: 23, fontWeight: active ? 600 : 500, cursor: 'pointer',
    borderColor: active ? (color || theme.palette.primary.main) : theme.palette.divider,
    bgcolor: active ? alpha(color || theme.palette.primary.main, 0.1) : 'transparent',
    color: active ? (color || theme.palette.primary.main) : theme.palette.text.secondary,
    '& .MuiChip-label': { px: 1 },
    '&:hover': { borderColor: color || theme.palette.primary.main },
  });

  const planChipRow = (label: string, node: React.ReactNode) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
      <Typography sx={{
        flex: '0 0 60px', fontSize: 9.5, fontWeight: 700, color: 'text.disabled',
        letterSpacing: '.04em', pt: 0.6,
      }}>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>{node}</Box>
    </Box>
  );

  return (
    <Box>
      {/* ── Page Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 1.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.08), border: '1px solid', borderColor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AssignmentIcon color="primary" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>แผน PM (PM Plans)</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>วางแผนและกำหนดกลุ่มเป้าหมาย Preventive Maintenance</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>สร้างแผน PM</Button>
          {plansNeedGenerate.length > 0 && (
            <Button
              variant="contained"
              color="success"
              startIcon={<BoltIcon />}
              disabled={saving}
              onClick={async () => {
                if (!await confirm({
                  title: 'สร้างงาน PM ให้แผนที่ยังไม่ได้เจน',
                  target: `${plansNeedGenerate.length} แผน`,
                  confirmLabel: 'สร้างงาน', danger: false,
                })) return;
                setSaving(true);
                let ok = 0, fail = 0;
                for (const plan of plansNeedGenerate) {
                  try {
                    await pmAPI.generate(plan.id);
                    ok++;
                  } catch {
                    fail++;
                  }
                }
                showToast(`⚡ Generate สำเร็จ ${ok} แผน${fail > 0 ? `, ล้มเหลว ${fail} แผน` : ''}`);
                fetchAll();
                setSaving(false);
              }}
            >
              Generate ทุกแผน ({plansNeedGenerate.length})
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Filters ──────────────────────────────────────────────────
          Company, device type and status are short lists used on every visit,
          so they are chips carrying their counts — the same selection also
          scopes the gap panel above. Year, department and search stay as
          controls because their value sets are long or free-form. */}
      <Card variant="outlined" sx={{ p: 1.4, mb: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Select size="small" sx={{ width: 108 }} value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
            {yearOptions.map(y => <MenuItem key={y} value={y}>ปี {y + 543}</MenuItem>)}
          </Select>
          <Select size="small" displayEmpty sx={{ width: 136 }} value={filterDept} onChange={e => setFilterDept(e.target.value)}
            renderValue={(v) => v || <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}><EngineeringIcon sx={{ fontSize: 14 }} /> ทุกแผนก</Box>}>
            <MenuItem value="">ทุกแผนก</MenuItem>
            {deptOptions.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </Select>
          <TextField
            size="small"
            sx={{ flex: 1, minWidth: 170 }}
            placeholder="ค้นหาชื่อแผนก, บริษัท, ผู้รับผิดชอบ..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <ToggleButtonGroup size="small" exclusive value={viewMode} onChange={(_, v) => v && setViewMode(v)}>
            <ToggleButton value="table"><TableRowsIcon fontSize="small" sx={{ mr: 0.5 }} /> ตาราง</ToggleButton>
            <ToggleButton value="card"><ViewModuleIcon fontSize="small" sx={{ mr: 0.5 }} /> การ์ด</ToggleButton>
          </ToggleButtonGroup>
          {anyPlanFilter && (
            <Button size="small" color="error" onClick={clearPlanFilters} sx={{ fontSize: 10.5, fontWeight: 600 }}>
              ล้างตัวกรอง
            </Button>
          )}
        </Box>

        {planChipRow('สถานะ', PLAN_STATUS_CHIPS.map(s => (
          <Chip key={s.key} variant="outlined" size="small"
            onClick={() => toggleSet(setSelStatus, s.key)}
            sx={planChipSx(selStatus.has(s.key), s.color(theme))}
            label={<>{s.label} <Box component="span" sx={{ fontSize: 9.5, opacity: 0.7 }}>{yearPlans.filter(p => planStatusKey(p) === s.key).length}</Box></>} />
        )))}

        {planChipRow('บริษัท', companyChoices.map(c => (
          <Chip key={c} variant="outlined" size="small"
            onClick={() => toggleSet(setSelCompany, c)}
            sx={planChipSx(selCompany.has(c))}
            label={<>{c} <Box component="span" sx={{ fontSize: 9.5, opacity: 0.65 }}>{yearPlans.filter(p => p.company === c).length}</Box></>} />
        )))}

        {typeChoices.length > 1 && planChipRow('ประเภท', typeChoices.map(t => (
          <Chip key={t} variant="outlined" size="small"
            onClick={() => toggleSet(setSelType, t)}
            sx={planChipSx(selType.has(t))}
            label={<>{t} <Box component="span" sx={{ fontSize: 9.5, opacity: 0.65 }}>{yearPlans.filter(p => p.deviceType === t).length}</Box></>} />
        )))}
      </Card>

      {/* ── Stats ──────────────────────────────────────────────────
          Six figures on one line at the shared 21px/10.5px step. "ยังไม่
          Generate" and "ไม่มีแผนรองรับ" are the two that ask for action; the
          rest are context. */}
      <Card variant="outlined" sx={{ p: '10px 14px', mb: 1.5, display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
        {[
          { icon: AssignmentIcon, label: 'แผน', val: filteredPlans.length, color: 'info' as const },
          { icon: GpsFixedIcon, label: 'เป้าหมาย', val: totalPlanned, color: 'secondary' as const },
          { icon: CheckCircleIcon, label: 'เสร็จ', val: totalDone, color: 'success' as const },
          { icon: EventIcon, label: 'เหลือ', val: totalRuns - totalDone, color: 'warning' as const },
          { icon: BoltIcon, label: 'ยังไม่ Generate', val: plansNeedGenerate.length, color: plansNeedGenerate.length ? 'error' as const : 'success' as const },
          { icon: GpsFixedIcon, label: 'ไม่มีแผนรองรับ', val: visibleGapUnits, color: 'warning' as const },
        ].map(s => (
          <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.9 }}>
            <s.icon sx={{ fontSize: 17, color: `${s.color}.main` }} />
            <Box>
              <Typography sx={{
                fontSize: 21, fontWeight: 800, lineHeight: 1, letterSpacing: '-.02em',
                fontVariantNumeric: 'tabular-nums', color: `${s.color}.main`,
              }}>{s.val.toLocaleString('en-US')}</Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.3 }}>{s.label}</Typography>
            </Box>
          </Box>
        ))}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 170 }}>
          <LinearProgress variant="determinate" value={overallPct} color={progressColor(overallPct)} sx={{ flex: 1, height: 6, borderRadius: 99 }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: `${progressColor(overallPct)}.main`, minWidth: 34, fontVariantNumeric: 'tabular-nums' }}>{overallPct}%</Typography>
          <Typography sx={{ fontSize: 10, color: 'text.disabled', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{totalDone}/{totalRuns}</Typography>
        </Box>
      </Card>

      {/* ── Scope with no plan — see components/PlanGapPanel.tsx ── */}
      {!loading && gaps.length > 0 && (
        <PlanGapPanel
          gaps={gaps}
          selCompany={selCompany}
          selType={selType}
          onToggleCompany={(name) => setSelCompany(prev => {
            const next = new Set(prev);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
          })}
          onCreate={openFromGap}
        />
      )}

      {/* ── Plan List ── */}
      {loading ? (
        <Box sx={{ textAlign: 'center', p: 5, color: 'primary.main' }}>กำลังโหลด...</Box>
      ) : filteredPlans.length === 0 ? (
        <Card variant="outlined" sx={{ textAlign: 'center', p: 6 }}>
          <AssignmentIcon sx={{ fontSize: 32, mb: 1, color: 'text.disabled' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            {visibleGapUnits > 0
              ? <>ยังไม่มีแผน PM ในขอบเขตนี้ — แต่มี {visibleGapUnits.toLocaleString('en-US')} เครื่องรออยู่</>
              : <>ยังไม่มีแผน PM ปี {filterYear + 543}</>}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5, mb: 2 }}>{visibleGapUnits > 0 ? 'กด "สร้างแผน" ในตารางช่องว่างด้านบนเพื่อเริ่ม' : 'กดปุ่ม "สร้างแผน PM" เพื่อเริ่มต้น'}</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>สร้างแผน PM แรก</Button>
        </Card>
      ) : viewMode === 'table' ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>แผนก / สถานที่</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>ประเภท</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>ระยะเวลา</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>ความคืบหน้า</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>สถานะ</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textAlign: 'right' }}>จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPlans.map((plan: any) => {
                const s = getPlanStatus(plan);
                return (
                  <TableRow key={plan.id} hover>
                    <TableCell>
                      <Box sx={{ fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        {plan.deptTask || 'ทุกแผนก'}
                        {plan.isAdhoc && <Chip size="small" label="นอกแผน" sx={{ height: 16, fontSize: 9.5 }} color="secondary" />}
                      </Box>
                      {!plan.isAdhoc && (
                        <Box sx={{ fontSize: 10, color: 'text.secondary', mt: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <BusinessIcon sx={{ fontSize: 11 }} /> {plan.company} {plan.site ? `- ${plan.site}` : ''}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 10 }}>
                      {plan.deviceType ? (
                        <Box sx={{ color: 'primary.main', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ComputerIcon sx={{ fontSize: 12 }} /> {plan.deviceType}
                        </Box>
                      ) : <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>}
                    </TableCell>
                    <TableCell sx={{ fontSize: 10 }}>{fmtDate(plan.startDate)} — {fmtDate(plan.endDate)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <LinearProgress variant="determinate" value={s.pct} color={s.color === 'default' || s.color === 'secondary' ? 'inherit' : s.color} sx={{ flex: 1, minWidth: 60, height: 5, borderRadius: 99 }} />
                        <Typography sx={{ fontSize: 10, fontWeight: 700, minWidth: 30 }}>{s.pct}%</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 9.5, color: 'text.secondary', mt: 0.25 }}>{s.done}/{s.total} (เป้า {plan.plannedDeviceCount})</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color={s.color} icon={<s.Icon sx={{ fontSize: 13 }} />} label={s.label} sx={{ fontSize: 10, fontWeight: 700, height: 22 }} />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        {s.total === 0 ? (
                          <Button size="small" variant="contained" color="success" startIcon={<BoltIcon />} onClick={() => { setGenerateModal({ open: true, plan }); setGenMsg(''); }}>
                            Generate
                          </Button>
                        ) : (
                          <Button size="small" variant="contained" startIcon={<AssignmentIcon />} onClick={() => navigate(`/pm/runs?planId=${plan.id}`)}>
                            ดูงาน ({s.total})
                          </Button>
                        )}
                        <Tooltip title="แก้ไข">
                          <IconButton aria-label="แก้ไข" size="small" onClick={() => handleOpenEdit(plan)}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="ลบ">
                          <IconButton aria-label="ลบ" size="small" color="error" onClick={() => handleDelete(plan.id)}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 1.75 }}>
          {filteredPlans.map((plan: any) => {
            const s = getPlanStatus(plan);
            const labelParts = [plan.company, plan.site].filter(Boolean);
            const siteLabel = labelParts.length > 0 ? labelParts.join(' - ') : '';
            const deptLabel = plan.deptTask || 'ทุกแผนก';

            return (
              <Card variant="outlined" key={plan.id} sx={{ overflow: 'hidden' }}>
                <Box sx={{ height: 4, bgcolor: `${s.color === 'default' ? 'text.disabled' : `${s.color}.main`}` }} />
                <Box sx={{ p: '14px 16px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.08), border: '1px solid', borderColor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <AssignmentIcon color="primary" sx={{ fontSize: 16 }} />
                      </Box>
                      <Box>
                        <Box sx={{ fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          {deptLabel}
                          {plan.isAdhoc && <Chip size="small" icon={<PushPinIcon sx={{ fontSize: 11 }} />} label="นอกแผน" color="secondary" sx={{ height: 18, fontSize: 9.5 }} />}
                        </Box>
                        {!plan.isAdhoc && (
                          <Box sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 500, mt: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <BusinessIcon sx={{ fontSize: 11 }} /> {siteLabel || 'ทุกบริษัท/ทุกสถานที่'}
                          </Box>
                        )}
                        {plan.deviceType && (
                          <Box sx={{ fontSize: 10, color: 'primary.main', fontWeight: 600, mt: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ComputerIcon sx={{ fontSize: 11 }} /> {plan.deviceType}
                          </Box>
                        )}
                      </Box>
                    </Box>
                    <Chip size="small" color={s.color} icon={<s.Icon sx={{ fontSize: 13 }} />} label={s.label} sx={{ fontSize: 9.5, fontWeight: 700, height: 22 }} />
                  </Box>

                  <Box sx={{ mb: 1.25 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>ความคืบหน้า</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: s.color === 'default' ? 'text.primary' : `${s.color}.main` }}>{s.pct}% ({s.done}/{s.total})</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={s.pct} color={s.color === 'default' || s.color === 'secondary' ? 'inherit' : s.color} sx={{ height: 6, borderRadius: 99 }} />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, mb: 1.5 }}>
                    {[
                      { Icon: GpsFixedIcon, lbl: 'เป้าหมาย', val: `${plan.plannedDeviceCount} เครื่อง` },
                      { Icon: PersonIcon, lbl: 'ผู้รับผิดชอบ', val: plan.lead || '—' },
                      { Icon: EventIcon, lbl: 'เริ่ม', val: fmtDate(plan.startDate) },
                      { Icon: EventAvailableIcon, lbl: 'สิ้นสุด', val: fmtDate(plan.endDate) },
                    ].map(i => (
                      <Box key={i.lbl} sx={{ bgcolor: 'action.hover', borderRadius: 1, p: '5px 8px' }}>
                        <Box sx={{ fontSize: 9.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <i.Icon sx={{ fontSize: 10 }} /> {i.lbl}
                        </Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{i.val}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.75 }}>
                    {s.total === 0 ? (
                      <Button size="small" variant="contained" color="success" startIcon={<BoltIcon />} sx={{ flex: 1 }} onClick={() => { setGenerateModal({ open: true, plan }); setGenMsg(''); }}>
                        Generate งาน PM
                      </Button>
                    ) : (
                      <Button size="small" variant="contained" startIcon={<AssignmentIcon />} sx={{ flex: 1 }} onClick={() => navigate(`/pm/runs?planId=${plan.id}`)}>
                        ดูงาน PM ({s.total})
                      </Button>
                    )}
                    <Tooltip title="ดู Dashboard">
                      <IconButton aria-label="ดู Dashboard" size="small" onClick={() => navigate('/pm')}><BarChartIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="แก้ไขแผน PM">
                      <IconButton aria-label="แก้ไขแผน PM" size="small" onClick={() => handleOpenEdit(plan)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="ลบแผน PM (ระวัง: ลบข้อมูลที่ตรวจแล้วด้วย)">
                      <IconButton aria-label="ลบแผน PM (ระวัง: ลบข้อมูลที่ตรวจแล้วด้วย)" size="small" color="error" onClick={() => handleDelete(plan.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {/* ── Create Plan Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="สร้างแผน PM ใหม่">
        <Box sx={{ p: '16px 20px' }}>
          <PlanFormFields
            form={form}
            onChange={(patch) => setForm((p) => ({ ...p, ...patch }))}
            yearOptions={yearOptions}
            companyOptions={companyOptions}
            locOptions={formLocOptions}
            deptOptions={formDeptOptions}
            typeOptions={typeOptions}
            leadOptions={leadOptions}
            templates={templates}
            onNoTemplateClick={() => { setModalOpen(false); setTimeout(() => { window.location.href = '/pm/templates'; }, 100); }}
          />
          {(eligibilityLoading || eligibility) && (
            <Paper variant="outlined" sx={{ p: 1.5, mt: 1.5 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, mb: 1 }}>สรุปเครื่องที่สามารถสร้างงาน PM ได้</Typography>
              {eligibilityLoading ? (
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>กำลังคำนวณจำนวนเครื่อง...</Typography>
              ) : (
                <>
                  <EligibilityStats data={eligibility} />
                  {eligibility.shortage > 0 && (
                    <Typography sx={{ mt: 1, fontSize: 11, color: 'error.main' }}>
                      จำนวนตามแผนมากกว่าเครื่องที่เหลืออยู่ {eligibility.shortage} เครื่อง
                    </Typography>
                  )}
                </>
              )}
            </Paper>
          )}
        </Box>
        <Box sx={{ p: '12px 20px', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="outlined" onClick={() => setModalOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? 'กำลังสร้าง...' : 'สร้างแผน PM'}
          </Button>
        </Box>
      </Modal>

      {/* ── Edit Plan Modal ── */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="แก้ไขแผน PM">
        {selectedPlanForEdit && (() => {
          const runs = selectedPlanForEdit.runs || [];
          const totalRuns = selectedPlanForEdit.totalCount ?? runs.length;
          const completedRuns = selectedPlanForEdit.completedCount ?? runs.filter((r: any) => r.status === 'COMPLETED').length;
          const hasCompletedRuns = completedRuns > 0;
          const hasDraftRunsOnly = totalRuns > 0 && completedRuns === 0;
          return (
            <>
              <Box sx={{ p: '16px 20px' }}>
                {hasCompletedRuns && (
                  <Alert severity="warning" sx={{ mb: 1.5 }}>
                    แผนนี้มีเครื่องที่ดำเนินการตรวจเช็คเสร็จสิ้นแล้ว ไม่สามารถแก้ไขกลุ่มเป้าหมายหรือ Template ได้ เพื่อป้องกันความถูกต้องของข้อมูลประวัติ
                  </Alert>
                )}
                {hasDraftRunsOnly && (
                  <Alert severity="info" sx={{ mb: 1.5 }}>
                    แผนนี้ยังไม่มีเครื่องที่เริ่มตรวจเช็ค (มีเฉพาะงานร่าง Draft) หากท่านแก้ไขกลุ่มเป้าหมายหรือ Template ระบบจะลบงานร่างเดิมและดึงรายการเครื่องชุดใหม่มา Generate ให้อัตโนมัติ
                  </Alert>
                )}

                <PlanFormFields
                  form={editForm}
                  onChange={(patch) => setEditForm((p) => ({ ...p, ...patch }))}
                  yearOptions={yearOptions}
                  companyOptions={companyOptions}
                  locOptions={editLocOptions}
                  deptOptions={editDeptOptions}
                  typeOptions={typeOptions}
                  leadOptions={leadOptions}
                  templates={templates}
                  disabled={{
                    year: hasCompletedRuns,
                    company: hasCompletedRuns,
                    site: hasCompletedRuns,
                    dept: hasCompletedRuns,
                    template: hasCompletedRuns,
                    countMin: completedRuns > 0 ? completedRuns : 1,
                  }}
                />
              </Box>

              <Box sx={{ p: '12px 20px', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button variant="outlined" onClick={() => setEditModalOpen(false)}>ยกเลิก</Button>
                <Button variant="contained" onClick={handleUpdate} disabled={saving}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </Button>
              </Box>
            </>
          );
        })()}
      </Modal>

      {/* ── Generate Workload Modal ── */}
      <Modal open={generateModal.open} onClose={() => setGenerateModal({ open: false, plan: null })} title="Generate งาน PM">
        <Box sx={{ p: '18px 20px' }}>
          {/* บอกขอบเขตของแผนให้ครบทุกเงื่อนไข ไม่ใช่หยิบมาโชว์ค่าเดียว
              เดิมเขียน `deptTask || site` ซึ่งเวลาเลือก "ทุกแผนก" (deptTask ว่าง)
              จะตกไปโชว์ชื่อสถานที่แทน กลายเป็นข้อความว่า "แผน: HQ" ทั้งที่แผนนั้น
              ครอบคลุมทุกแผนกใน HQ อยู่แล้ว ทำให้เข้าใจผิดว่าระบบกรองเหลือแค่ HQ */}
          <Alert severity="info" icon={<EventIcon fontSize="inherit" />} sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.5 }}>
              ขอบเขตของแผนนี้
            </Typography>
            <Typography sx={{ fontSize: 11.5, mb: 0.5 }}>
              {[
                `บริษัท: ${generateModal.plan?.company || 'ทุกบริษัท'}`,
                `สถานที่: ${generateModal.plan?.site || 'ทุกสถานที่'}`,
                `แผนก: ${generateModal.plan?.deptTask || 'ทุกแผนก'}`,
                `ประเภทอุปกรณ์: ${generateModal.plan?.deviceType || 'ทุกประเภท'}`,
              ].join(' · ')}
            </Typography>
            <Typography sx={{ fontSize: 11 }}>
              {fmtDate(generateModal.plan?.startDate)} → {fmtDate(generateModal.plan?.endDate)} · เป้าหมาย {generateModal.plan?.plannedDeviceCount} เครื่อง
            </Typography>
          </Alert>
          {generateEligibility && <Box sx={{ mb: 1.5 }}><EligibilityStats data={generateEligibility} /></Box>}
          <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6 }}>
            ระบบจะสร้างรายการงาน PM สำหรับทรัพย์สินที่<strong>ยังไม่เคย PM</strong>ในปีนี้
            และตรงกับขอบเขตข้างบนทุกข้อ — ช่องที่เป็น "ทุก…" คือไม่กรองด้วยเงื่อนไขนั้น
          </Typography>
          {genMsg && (
            <Alert severity={genMsg.includes('ผิดพลาด') ? 'error' : 'success'} sx={{ mt: 1.5 }}>{genMsg}</Alert>
          )}
        </Box>
        <Box sx={{ p: '12px 20px', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="outlined" onClick={() => setGenerateModal({ open: false, plan: null })}>ปิด</Button>
          {!genMsg && (
            <Button variant="contained" color="success" startIcon={<BoltIcon />} onClick={handleGenerate} disabled={saving || (generateEligibility && generateEligibility.creatable < 1)}>
              {saving ? 'กำลัง Generate...' : 'Generate'}
            </Button>
          )}
          {genMsg && !genMsg.includes('ผิดพลาด') && (
            <Button variant="contained" startIcon={<AssignmentIcon />} onClick={() => { const planId = generateModal.plan?.id; setGenerateModal({ open: false, plan: null }); navigate(planId ? `/pm/runs?planId=${planId}` : '/pm/runs'); }}>
              ไปหน้าทำ PM
            </Button>
          )}
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
