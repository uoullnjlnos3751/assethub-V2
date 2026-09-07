import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
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
  LinearProgress,
  Pagination,
  Snackbar,
  Alert,
  Checkbox,
  Tooltip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import BuildIcon from '@mui/icons-material/Build';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AssignmentIcon from '@mui/icons-material/Assignment';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PercentIcon from '@mui/icons-material/Percent';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteIcon from '@mui/icons-material/Delete';
import MonitorIcon from '@mui/icons-material/Monitor';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import PhoneIcon from '@mui/icons-material/Phone';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import SaveIcon from '@mui/icons-material/Save';
import StarIcon from '@mui/icons-material/Star';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import LockIcon from '@mui/icons-material/Lock';
import ExtensionIcon from '@mui/icons-material/Extension';
import ComputerIcon from '@mui/icons-material/Computer';
import SensorsIcon from '@mui/icons-material/Sensors';
import PushPinIcon from '@mui/icons-material/PushPin';
import { pmAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { PMDeviceArrayInput } from './components/PMDeviceArrayInput';
import { ImageLightbox } from '../../components/ImageLightbox';
import { Modal } from './components/Modal';
import { StarRating } from './components/StarRating';
import { getRatingCategory, RATING_RUBRIC, suggestRating } from './components/pmRatingRubric';
import { useConfirm } from '../../contexts/ConfirmContext';

// html5-qrcode ~382 KB โหลดตอนเปิดกล้องสแกนจริงเท่านั้น
const loadQr = async () => (await import('html5-qrcode')).Html5Qrcode;

// xlsx ~419 KB โหลดตอนกดส่งออกจริงเท่านั้น ไม่ใช่ตอนเปิดหน้า
const loadXlsx = () => import('xlsx');

/* ─────────────────────────────────────────────────────────────
   Types & Constants
───────────────────────────────────────────────────────────────── */
const DEFAULT_CHECKLIST = [
  { key: 'computer_name',      label: 'ตรวจสอบ Computer Name (ถูกต้องตามมาตรฐาน)', group: 'user', type: 'boolean' },
  { key: 'change_name',        label: 'เปลี่ยน Computer Name (ถ้าไม่ตรงมาตรฐาน)', group: 'user', type: 'boolean' },
  { key: 'ip_phone',           label: 'ตรวจสอบ IP Phone / หมายเลขโทรศัพท์ภายใน', group: 'user', type: 'boolean' },
  { key: 'windows_version',    label: 'ตรวจสอบ Windows Version และ Activate', group: 'os', type: 'boolean' },
  { key: 'windows_update',     label: 'ตรวจสอบ Windows Update (winver)', group: 'os', type: 'boolean' },
  { key: 'office_check',       label: 'ตรวจสอบ Microsoft Office & Activate', group: 'os', type: 'boolean' },
  { key: 'antivirus',          label: 'อัปเดต Antivirus (Virus Definition)', group: 'os', type: 'boolean' },
  { key: 'change_password',    label: 'เปลี่ยน Password Local Admin', group: 'security', type: 'boolean' },
  { key: 'usb_policy',         label: 'ตรวจสอบ USB Policy (Block/Allow)', group: 'security', type: 'boolean' },
  { key: 'glpi_agent',         label: 'ติดตั้ง/ตรวจสอบ GLPI Agent v1.6/1.7', group: 'agent', type: 'boolean' },
  { key: 'spiceworks',         label: 'ติดตั้ง Spiceworks Agent', group: 'agent', type: 'boolean' },
  { key: 'pc_audit',           label: 'PC Audit (บันทึก Hardware spec)', group: 'agent', type: 'boolean' },
  { key: 'hw_info',            label: 'HW Info (Serial No., Service Tag)', group: 'agent', type: 'boolean' },
  { key: 'cleaning',           label: 'ทำความสะอาดอุปกรณ์ (Cleaning Device)', group: 'hardware', type: 'boolean' },
  { key: 'cpu',                label: 'CPU (Processor)', group: 'hardware', type: 'text' },
  { key: 'ram',                label: 'RAM (Memory)', group: 'hardware', type: 'text' },
  { key: 'storage',            label: 'Storage (Disk)', group: 'hardware', type: 'text' },
  { key: 'printer',            label: 'ตรวจสอบ Printer Local', group: 'hardware', type: 'boolean' },
  { key: 'ups',                label: 'ตรวจสอบ UPS', group: 'hardware', type: 'boolean' },
  { key: 'monitor',            label: 'ตรวจสอบจอ Monitor (Monitor 1 & 2)', group: 'hardware', type: 'boolean' },
  { key: 'issue_note',         label: 'ปัญหาที่พบ / ข้อเสนอแนะ', group: 'result', type: 'text' },
  { key: 'satisfaction',       label: 'ความพึงพอใจผู้ใช้ (1–5 ดาว)', group: 'result', type: 'rating' },
  { key: 'staff_name',         label: 'เจ้าหน้าที่ผู้ทำ PM', group: 'result', type: 'text' },
];

const GROUP_INFO: Record<string, { label: string; icon: React.ElementType }> = {
  user:     { label: 'ข้อมูลผู้ใช้และอุปกรณ์', icon: PersonIcon },
  os:       { label: 'ระบบปฏิบัติการ (OS) & Software', icon: DesktopWindowsIcon },
  security: { label: 'ความปลอดภัย (Security)', icon: LockIcon },
  agent:    { label: 'ติดตั้ง Agent / Tools', icon: ExtensionIcon },
  hardware: { label: 'Hardware & Peripheral', icon: ComputerIcon },
  result:   { label: 'ผลการประเมิน', icon: StarIcon },
};

const STATUS_CHIP: Record<string, { color: 'success' | 'info' | 'warning' | 'default'; label: string }> = {
  COMPLETED: { color: 'success', label: 'เสร็จแล้ว' },
  IN_PROGRESS: { color: 'info', label: 'กำลังทำ' },
  DRAFT: { color: 'warning', label: 'รอดำเนินการ' },
};

/**
 * งานที่เลยวันนัดมาแล้วแต่ยังไม่ได้ทำ
 *
 * แยกจาก "เกินกำหนด" ของแผน ซึ่งดูวันสิ้นสุดของทั้งแผน — ตัวนี้เตือนได้ตั้งแต่
 * วันรุ่งขึ้นหลังวันนัด แทนที่จะต้องรอจนสิ้นแผนถึงจะรู้ว่าตกหล่น
 */
const schedLate = (run: any) => {
  if (!run?.scheduledDate || run.status === 'COMPLETED') return false;
  return new Date(run.scheduledDate).getTime() < new Date().setHours(0, 0, 0, 0);
};

/**
 * แปลงวันนัดเป็นค่าของ <input type="date"> (YYYY-MM-DD) ตามเวลาเครื่องผู้ใช้
 *
 * ตัดสตริง ISO ตรง ๆ ไม่ได้ เพราะฝั่งเซิร์ฟเวอร์เก็บเป็นเที่ยงคืนเวลาไทย ซึ่ง
 * ใน UTC คือห้าโมงเย็นของ "วันก่อนหน้า" — การ slice(0, 10) จึงได้วันที่ย้อนไป
 * หนึ่งวันทุกครั้ง
 */
const toDateInput = (value: any): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** ตัวกรองวันนัด — ตอบสี่คำถามที่ช่างถามจริงตอนเริ่มวัน */
const SCHED_FILTERS = [
  { key: 'TODAY', label: 'นัดวันนี้' },
  { key: 'WEEK', label: '7 วันข้างหน้า' },
  { key: 'LATE', label: 'เลยวันนัด' },
  { key: 'NONE', label: 'ยังไม่นัด' },
];

function matchesSchedFilter(run: any, key: string) {
  const today = new Date().setHours(0, 0, 0, 0);
  if (key === 'NONE') return !run.scheduledDate && run.status !== 'COMPLETED';
  if (key === 'LATE') return schedLate(run);
  if (!run.scheduledDate) return false;
  const d = new Date(run.scheduledDate).setHours(0, 0, 0, 0);
  if (key === 'TODAY') return d === today;
  if (key === 'WEEK') return d >= today && d <= today + 6 * 86_400_000;
  return true;
}

/* ─────────────────────────────────────────────────────────────
   Shared bits used by both the single-run and bulk checklist modals
───────────────────────────────────────────────────────────────── */
function BoolAnswerButtons({
  value,
  disabled,
  onSelect,
}: {
  value: string | undefined;
  disabled?: boolean;
  onSelect: (v: string) => void;
}) {
  // ปุ่มที่ผู้ใช้กดซ้ำ ๆ มากที่สุดตลอดการตรวจ PM ครั้งหนึ่ง (ทุกข้อในเช็คลิสต์) —
  // จึงขยายขนาดให้ใหญ่กว่าปุ่มอื่นในหน้าจอ (ไม่ใช่ size="small") ตามที่ผู้ใช้แจ้งว่า
  // ปุ่มเดิมอึดอัดและกดยาก หน้าจอนี้ใช้บนคอมพิวเตอร์เท่านั้นจึงไม่ต้องหด/ไม่ต้อง
  // รองรับมือถือ
  const options: { val: string; label: string; icon: React.ReactNode; color: 'success' | 'error' | 'inherit' }[] = [
    { val: 'yes', label: 'ใช่', icon: <CheckIcon sx={{ fontSize: 17 }} />, color: 'success' },
    { val: 'no', label: 'ไม่', icon: <CloseIcon sx={{ fontSize: 17 }} />, color: 'error' },
    { val: 'na', label: 'N/A', icon: <RemoveIcon sx={{ fontSize: 17 }} />, color: 'inherit' },
  ];
  return (
    <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
      {options.map((opt) => {
        const selected = value === opt.val;
        return (
          <Button
            key={opt.val}
            disabled={disabled}
            onClick={() => onSelect(opt.val)}
            startIcon={opt.icon}
            variant={selected ? 'contained' : 'outlined'}
            color={selected ? opt.color : 'inherit'}
            sx={{
              borderRadius: 5,
              px: 2.5,
              py: 0.9,
              fontSize: 14,
              fontWeight: 600,
              opacity: disabled && !selected ? 0.5 : 1,
            }}
          >
            {opt.label}
          </Button>
        );
      })}
    </Box>
  );
}

function ChecklistItemRow({
  item,
  index,
  answers,
  setAnswers,
  readOnly,
  asset,
}: {
  item: any;
  index: number;
  answers: Record<string, any>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  readOnly: boolean;
  asset: any;
}) {
  const type = item.type?.toLowerCase() || '';
  const showInlineNote =
    type === 'boolean' &&
    (answers[item.key] === 'no' ||
      answers[item.key] === 'na' ||
      (answers[item.key] === 'yes' && ['windows_version', 'office_check', 'antivirus'].includes(item.key)));
  const showIpPhoneNote = type === 'boolean' && item.key === 'ip_phone' && answers[item.key] === 'yes';
  const isDamaged =
    ['select_physical', 'select_result'].includes(type) &&
    (answers[item.key] === 'ชำรุดรอซ่อม' || answers[item.key] === 'ไม่ผ่านเกณฑ์');

  const selectOptions: string[] =
    type === 'select_physical' ? ['สภาพปกติ', 'ชำรุดเล็กน้อย', 'ชำรุดรอซ่อม', 'หมดสภาพ']
    : type === 'select_speed' ? ['เร็วปกติ', 'เริ่มหน่วงหนืด', 'ช้ามาก']
    : type === 'select_result' ? ['ผ่านเกณฑ์', 'แก้ไขเรียบร้อย', 'ไม่ผ่านเกณฑ์']
    : type === 'select' ? (item.options?.split(',').map((o: string) => o.trim()).filter(Boolean) || [])
    : [];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        flexWrap: 'wrap',
        px: 3,
        py: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          bgcolor: 'action.hover',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11.5,
          fontWeight: 600,
          color: 'text.secondary',
          flexShrink: 0,
        }}
      >
        {index + 1}
      </Box>

      <Box sx={{ flex: 1, minWidth: 220 }}>
        <Typography sx={{ fontSize: 14.5, color: 'text.primary', fontWeight: 500 }}>{item.label}</Typography>

        {type === 'text' && (
          <TextField
            multiline
            minRows={3}
            fullWidth
            size="small"
            sx={{ mt: 1 }}
            placeholder={item.key === 'issue_note' ? 'ระบุข้อเสนอแนะหรือปัญหาที่พบ...' : 'ระบุรายละเอียด...'}
            value={answers[item.key] || ''}
            onChange={(e) => setAnswers((p) => ({ ...p, [item.key]: e.target.value }))}
            disabled={readOnly || item.key === 'staff_name'}
          />
        )}

        {type === 'rating' && (() => {
          const rubric = RATING_RUBRIC[getRatingCategory(asset?.type)];
          const current = parseInt(answers[item.key] || '0');
          const suggested = suggestRating(answers);
          return (
            <Box sx={{ mt: 1 }}>
              <StarRating value={current} onChange={(v) => setAnswers((p) => ({ ...p, [item.key]: String(v) }))} disabled={readOnly} />
              {!readOnly && suggested != null && suggested !== current && (
                <Alert
                  severity="info"
                  icon={<SmartToyIcon fontSize="inherit" />}
                  sx={{ mt: 0.75, py: 0.25, fontSize: 12 }}
                  action={
                    <Button size="small" onClick={() => setAnswers((p) => ({ ...p, [item.key]: String(suggested) }))}>
                      ใช้ค่านี้
                    </Button>
                  }
                >
                  แนะนำจากผลตรวจเช็คลิสต์: <strong>{suggested} ดาว</strong>
                </Alert>
              )}
              <Box
                sx={{
                  mt: 1,
                  fontSize: 11,
                  color: 'text.secondary',
                  bgcolor: 'action.hover',
                  p: '10px 14px',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ fontWeight: 600, mb: 0.5, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LightbulbIcon sx={{ fontSize: 14 }} /> เกณฑ์การประเมินเพื่อช่วย IT Admin ตัดสินใจ:
                </Box>
                {rubric.map((desc, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', color: 'warning.main' }}>
                      {Array.from({ length: 5 - i }).map((_, s) => (
                        <StarIcon key={s} sx={{ fontSize: 12 }} />
                      ))}
                    </Box>
                    ({5 - i}) - {desc}
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })()}
      </Box>

      {type === 'boolean' && (
        <BoolAnswerButtons
          value={answers[item.key]}
          disabled={readOnly}
          onSelect={(v) => setAnswers((p) => ({ ...p, [item.key]: v }))}
        />
      )}

      {type.startsWith('select') && (
        <Box sx={{ mt: 1, width: '100%', maxWidth: 400 }}>
          <Select
            fullWidth
            size="small"
            displayEmpty
            value={answers[item.key] || ''}
            onChange={(e) => setAnswers((p) => ({ ...p, [item.key]: e.target.value }))}
            disabled={readOnly}
            color={isDamaged ? 'error' : undefined}
            sx={isDamaged ? { bgcolor: (t) => alpha(t.palette.error.main, 0.06) } : undefined}
          >
            <MenuItem value="">
              <em>-- กรุณาเลือก --</em>
            </MenuItem>
            {selectOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        </Box>
      )}

      {type === 'monitor_array' && (
        <Box sx={{ mt: 1, width: '100%' }}>
          <PMDeviceArrayInput
            type="monitor"
            value={answers[item.key] || ''}
            onChange={(v) => setAnswers((p) => ({ ...p, [item.key]: v }))}
            parentAsset={asset}
            readOnly={readOnly}
          />
        </Box>
      )}

      {type === 'printer_array' && (
        <Box sx={{ mt: 1, width: '100%' }}>
          <PMDeviceArrayInput
            type="printer"
            value={answers[item.key] || ''}
            onChange={(v) => setAnswers((p) => ({ ...p, [item.key]: v }))}
            parentAsset={asset}
            readOnly={readOnly}
          />
        </Box>
      )}

      {showInlineNote && (
        <Box sx={{ width: '100%', pl: '38px', mt: 0.75 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={
              ['windows_version', 'office_check', 'antivirus'].includes(item.key)
                ? 'ระบุรายละเอียดเพิ่มเติม (เช่น เวอร์ชัน, License)...'
                : 'ระบุสาเหตุประกอบการเลือกไม่ใช่หรือไม่ระบุ...'
            }
            value={answers[`${item.key}_note`] || ''}
            onChange={(e) => setAnswers((p) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
            disabled={readOnly}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: (t) => (readOnly ? 'action.hover' : alpha(t.palette.warning.main, 0.08)),
                '& fieldset': { borderColor: 'warning.main' },
              },
            }}
          />
        </Box>
      )}

      {showIpPhoneNote && (
        <Box sx={{ width: '100%', pl: '38px', mt: 0.75 }}>
          <Alert severity="success" icon={<PhoneIcon fontSize="inherit" />} sx={{ py: 0.5 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, mb: 0.75 }}>ระบุหมายเลขโทรศัพท์ภายใน (Extension Number)</Typography>
            <TextField
              size="small"
              sx={{ maxWidth: 300, bgcolor: 'background.paper' }}
              placeholder="ตัวอย่าง: 1035, 1036..."
              value={answers[`${item.key}_note`] || ''}
              onChange={(e) => setAnswers((p) => ({ ...p, [`${item.key}_note`]: e.target.value }))}
              disabled={readOnly}
            />
          </Alert>
        </Box>
      )}
    </Box>
  );
}

function ChecklistGroups({
  items,
  answers,
  setAnswers,
  readOnly,
  asset,
}: {
  items: any[];
  answers: Record<string, any>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  readOnly: boolean;
  asset: any;
}) {
  const groups = Array.from(new Set(items.map((i: any) => i.group)));
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 2.5 }}>
      {groups.map((group: any) => {
        const groupItems = items.filter((i: any) => i.group === group);
        const gi = GROUP_INFO[group] || { label: group, icon: PushPinIcon };
        const GroupIcon = gi.icon;
        return (
          <Box key={group}>
            <Box
              sx={{
                px: 2.5,
                py: 1.25,
                bgcolor: 'action.hover',
                fontSize: 11,
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <GroupIcon sx={{ fontSize: 14 }} /> {gi.label}
            </Box>
            {groupItems.map((item: any) => (
              <ChecklistItemRow
                key={item.key}
                item={item}
                index={items.indexOf(item)}
                answers={answers}
                setAnswers={setAnswers}
                readOnly={readOnly}
                asset={asset}
              />
            ))}
          </Box>
        );
      })}
    </Paper>
  );
}

function sortChecklistItems(rawItems: any[]) {
  return [...rawItems].sort((a: any, b: any) => {
    if (a.group !== b.group) {
      const groupOrder = Object.keys(GROUP_INFO);
      const aIdx = groupOrder.indexOf(a.group || '');
      const bIdx = groupOrder.indexOf(b.group || '');
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return (a.group || '').localeCompare(b.group || '');
    }
    return (a.order || 0) - (b.order || 0);
  });
}

/* ─────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────── */
export default function PMRunPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const planIdParam = searchParams.get('planId') || '';

  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStaff, setFilterStaff] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterSched, setFilterSched] = useState('');
  const [plans, setPlans] = useState<any[]>([]);

  const [pmModal, setPMModal] = useState<{ open: boolean; run: any; readOnly?: boolean }>({ open: false, run: null, readOnly: false });
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [exporting, setExporting] = useState(false);

  // New States
  const [selectedRunIds, setSelectedRunIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [bulkPMModal, setBulkPMModal] = useState<{ open: boolean; templateId: number | null }>({ open: false, templateId: null });
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fetchingGLPI, setFetchingGLPI] = useState(false);
  const [glpiSpec, setGlpiSpec] = useState<any>(null);
  const [glpiSpecApplied, setGlpiSpecApplied] = useState(false);

  /* ── สิ่งที่ Agent ตรวจเจอ ────────────────────────────────────────
     แยกจาก GLPI คนละปุ่ม เพราะเป็นคนละแหล่ง และ Agent ตอบเรื่องที่ GLPI
     ตอบไม่ได้ (แบตเตอรี่ ดิสก์ Windows Update) */
  const [agentCheck, setAgentCheck] = useState<any>(null);
  const [fetchingAgent, setFetchingAgent] = useState(false);
  const [agentApplied, setAgentApplied] = useState(false);
  const [noteModal, setNoteModal] = useState<{ open: boolean; run: any; value: string }>({ open: false, run: null, value: '' });
  const [savingNote, setSavingNote] = useState(false);
  const [schedModal, setSchedModal] = useState<{ open: boolean; value: string }>({ open: false, value: '' });
  const [savingSched, setSavingSched] = useState(false);
  const [pmPhotoZoom, setPmPhotoZoom] = useState(false);
  const pmPhotoInputRef = React.useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const fetchData = () => {
    setLoading(true);
    Promise.all([pmAPI.runs(), pmAPI.plans()])
      .then(([r, p]) => {
        setRuns(r.data || []);
        setPlans(p.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (planIdParam && plans.length > 0) {
      const p = plans.find(plan => String(plan.id) === planIdParam);
      if (p) {
        setFilterPlan(p.deptTask || p.site || `Plan #${p.id}`);
      }
    }
  }, [planIdParam, plans]);

  // Autosave Drafts
  useEffect(() => {
    if (pmModal.run?.id && Object.keys(answers).length > 0) {
      localStorage.setItem(`pm_draft_${pmModal.run.id}`, JSON.stringify(answers));
    }
  }, [answers, pmModal.run?.id]);

  // QR Code Scanner Effect
  useEffect(() => {
    if (!qrModalOpen) return;

    let html5QrCode: InstanceType<Awaited<ReturnType<typeof loadQr>>> | null = null;

    const timer = setTimeout(async () => {
      const element = document.getElementById('qr-reader');
      if (!element) return;

      const Html5Qrcode = await loadQr();
      html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          setSearch(decodedText);
          showToast(`🔍 สแกนพบรหัส: ${decodedText}`);
          setQrModalOpen(false);
        },
        () => {}
      ).catch(err => {
        console.error('Error starting QR scanner:', err);
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          html5QrCode?.clear();
        }).catch(err => {
          console.error('Error stopping QR scanner:', err);
        });
      }
    };
  }, [qrModalOpen]);

  // Compute unique values for filtering options
  const uniqueTypes = Array.from(new Set(runs.map(r => r.asset?.type).filter(Boolean))) as string[];
  const uniqueStaff = Array.from(new Set(runs.map(r => r.performer?.displayName || r.staffName).filter(Boolean))) as string[];
  const uniqueCompanies = Array.from(new Set(runs.map(r => r.asset?.company).filter(Boolean))) as string[];

  /* ── Filter ── */
  const filtered = runs.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || (r.asset?.assetName || '').toLowerCase().includes(q) || (r.asset?.assetCode || '').toLowerCase().includes(q) || (r.asset?.ownerName || '').toLowerCase().includes(q) || (r.asset?.brand || '').toLowerCase().includes(q) || (r.asset?.model || '').toLowerCase().includes(q) || (r.asset?.serialNo || '').toLowerCase().includes(q);
    const isOverdue = r.status !== 'COMPLETED' && r.plan?.endDate && new Date(r.plan.endDate).getTime() < new Date().setHours(0,0,0,0);
    const matchStatus = !filterStatus ? true : filterStatus === 'OVERDUE' ? isOverdue : r.status === filterStatus;
    const planName = r.plan?.deptTask || r.plan?.site || `Plan #${r.plan?.id}`;
    const matchPlan = !filterPlan || planName === filterPlan;
    const matchType = !filterType || r.asset?.type === filterType;
    const matchStaff = !filterStaff || (r.performer?.displayName || r.staffName) === filterStaff;
    const matchCompany = !filterCompany || r.asset?.company === filterCompany;
    const matchSched = !filterSched || matchesSchedFilter(r, filterSched);
    return matchQ && matchStatus && matchPlan && matchType && matchStaff && matchCompany && matchSched;
  });

  const sortedRuns = [...filtered].sort((a, b) => {
    if (!sortConfig) return 0;
    let valA: any = '';
    let valB: any = '';
    switch (sortConfig.key) {
      case 'id': valA = a.id; valB = b.id; break;
      case 'status': valA = a.status; valB = b.status; break;
      case 'dueDate': valA = a.plan?.endDate || ''; valB = b.plan?.endDate || ''; break;
      case 'dept': valA = a.asset?.departmentId || a.plan?.deptTask || ''; valB = b.asset?.departmentId || b.plan?.deptTask || ''; break;
    }
    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedRuns = sortedRuns.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(sortedRuns.length / pageSize);

  // Checklist Selection Helpers
  const selectableRuns = sortedRuns.filter(r => r.status !== 'COMPLETED');
  const allSelected = selectableRuns.length > 0 && selectableRuns.every(r => selectedRunIds.includes(r.id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRunIds(selectableRuns.map(r => r.id));
    } else {
      setSelectedRunIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedRunIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const fetchGLPI = async (runId: number) => {
    setFetchingGLPI(true);
    setGlpiSpec(null);
    setGlpiSpecApplied(false);
    try {
      const res = await pmAPI.getGLPISpec(runId);
      setGlpiSpec(res.data);
      showToast('🔌 ดึงข้อมูลจาก GLPI สำเร็จ — ตรวจสอบแล้วกด "ยืนยันอัพเดทข้อมูลสเปคคอม" เพื่อนำไปใส่ในแบบฟอร์ม');
    } catch (err: any) {
      showToast(`❌ ดึงข้อมูลล้มเหลว: ${err.response?.data?.error || err.message}`);
    } finally {
      setFetchingGLPI(false);
    }
  };

  const fetchAgentCheck = async (runId: number) => {
    setFetchingAgent(true);
    try {
      const res = await pmAPI.agentCheck(runId);
      setAgentCheck(res.data);
      if (!res.data?.available) {
        showToast('🤖 เครื่องนี้ยังไม่มีข้อมูลจาก Agent (ยังไม่ได้ติดตั้ง หรือยังไม่ได้รายงานเข้ามา)');
      } else {
        const crit = (res.data.findings || []).filter((f: any) => f.severity === 'critical').length;
        showToast(crit
          ? `🤖 Agent ตรวจเจอเรื่องต้องแก้ ${crit} เรื่อง — ดูในการ์ดด้านล่าง`
          : '🤖 ดึงข้อมูลจาก Agent สำเร็จ');
      }
    } catch (err: any) {
      showToast(`❌ ดึงข้อมูล Agent ไม่สำเร็จ: ${err.response?.data?.error || err.message}`);
    } finally {
      setFetchingAgent(false);
    }
  };

  /** Does the run's own template even have a place to put detected monitors?
   * The merge/apply buttons need this to know whether "nothing added" means
   * "already up to date" or "this template has nowhere to write it" —
   * those used to be indistinguishable and the button/toast claimed success
   * either way. */
  const hasMonitorArrayItem = (run: any): boolean =>
    !!run && getChecklistItems(run).some((item: any) => (item.type || '').toLowerCase() === 'monitor_array');

  // Merge detected monitors into the "ตรวจสอบจอ Monitor" device list.
  //
  // Shared by the GLPI and Agent paths: both end up filling the same checklist
  // item, and the merge has to behave identically either way. Pressing a
  // button twice — or pressing it after the technician already typed a
  // monitor in by hand — never duplicates or wipes their work: dedup keys on
  // serialNo when there is one, falls back to the matched registry _assetId,
  // and as a last resort (a panel with neither — real, not rare; see
  // agentMonitors.ts) a connectedPort+brand+model signature, since serial-less
  // devices used to sail through the old serial-only check on every press.
  const mergeMonitorsIntoAnswers = (target: Record<string, any>, devices: any[]): { added: number; hasField: boolean } => {
    if (!pmModal.run) return { added: 0, hasField: false };
    const monitorItem = getChecklistItems(pmModal.run).find(
      (item: any) => (item.type || '').toLowerCase() === 'monitor_array'
    );
    if (!monitorItem) return { added: 0, hasField: false };
    if (!devices.length) return { added: 0, hasField: true };

    let existingDevices: any[] = [];
    const rawExisting = target[monitorItem.key];
    if (rawExisting && rawExisting !== 'no') {
      try {
        const parsed = JSON.parse(rawExisting);
        if (Array.isArray(parsed)) existingDevices = parsed;
      } catch { /* start fresh if it wasn't valid device JSON */ }
    }

    const noIdSignature = (d: any) => `${d.connectedPort || ''}|${d.brand || ''}|${d.model || ''}`;
    const existingSerials = new Set(
      existingDevices.map((d) => (d.serialNo || '').trim().toLowerCase()).filter(Boolean)
    );
    const existingAssetIds = new Set(existingDevices.map((d) => d._assetId).filter(Boolean));
    const existingNoIdSignatures = new Set(
      existingDevices.filter((d) => !d.serialNo && !d._assetId).map(noIdSignature)
    );

    const fresh = devices.filter((d) => {
      if (d.serialNo) return !existingSerials.has(String(d.serialNo).trim().toLowerCase());
      if (d._assetId) return !existingAssetIds.has(d._assetId);
      return !existingNoIdSignatures.has(noIdSignature(d));
    });
    if (!fresh.length) return { added: 0, hasField: true };

    target[monitorItem.key] = JSON.stringify([...existingDevices, ...fresh]);
    return { added: fresh.length, hasField: true };
  };

  // เติมเฉพาะข้อที่ Agent ตอบได้ พร้อมหมายเหตุที่บอกว่าตอบจากอะไร ช่างแก้ทับได้
  // เสมอ — ข้อที่ต้องเดินไปดู (ทำความสะอาด UPS สภาพเครื่อง) ไม่ถูกแตะ
  const applyAgentAnswers = () => {
    const answerCount = agentCheck?.answers?.length || 0;
    const monitors = agentCheck?.monitors || [];
    if (!answerCount && !monitors.length) return;

    const next = { ...answers };
    for (const a of (agentCheck.answers || [])) {
      next[a.key] = a.value;
      if (a.note) next[`${a.key}_note`] = a.note;
    }

    // Agent มองไม่เห็นขนาดจอ (นิ้ว) และลำโพงในตัว จึงไม่ส่ง screenSize/ports/
    // hasSpeaker มาเลย — ถ้าส่งมาแม้แต่ตัวเดียว ฝั่งบันทึกจะ upsert MonitorDetail
    // แล้วเขียนอีกสองช่องที่เหลือเป็น null ทับของเดิมที่เคยกรอกไว้
    const { added, hasField: hasMonitorField } = mergeMonitorsIntoAnswers(next, monitors.map((m: any) => ({
      _assetId: m._assetId || undefined,
      assetCode: m._assetId ? (m.assetCode || '') : undefined,
      hasMonitor: true,
      company: m.company || pmModal.run?.asset?.company || '',
      brand: m.brand || '',
      model: m.model || '',
      serialNo: m.serial || '',
      source: 'agent',
      connectedPort: m.connectedPort || null,
      year: m.year || null,
    })));

    setAnswers(next);
    setAgentApplied(true);
    const parts = [
      answerCount ? `คำตอบ ${answerCount} ข้อ` : '',
      added ? `จอ ${added} ตัว` : '',
    ].filter(Boolean);
    // เทมเพลตนี้ไม่มีช่องจอเลย — ไม่ใช่ว่า "ครบแล้ว" ต้องบอกตรงๆ ว่าจอที่ Agent
    // เห็นไม่มีที่ให้เติม ไม่งั้นข้อความจะขัดกับความจริง (จอหายไปเงียบๆ)
    if (monitors.length > 0 && !hasMonitorField) {
      showToast(parts.filter(p => !p.includes('จอ')).length
        ? `⚠️ เติม${parts.filter(p => !p.includes('จอ')).join('')}จาก Agent แล้ว — แต่เทมเพลตนี้ไม่มีช่องบันทึกจอภาพ จอที่ตรวจพบ ${monitors.length} ตัวจึงไม่ถูกเติม`
        : `⚠️ เทมเพลตนี้ไม่มีช่องบันทึกจอภาพ — จอที่ Agent ตรวจพบ ${monitors.length} ตัวจึงไม่ถูกเติม`);
      return;
    }
    // กดซ้ำแล้วจอที่ Agent เห็นอยู่ในฟอร์มครบแล้ว — บอกตามจริงดีกว่าขึ้นว่าเติมสำเร็จ
    showToast(parts.length
      ? `✅ เติม${parts.join(' และ ')}จาก Agent แล้ว — ตรวจทานได้ก่อนบันทึก`
      : 'ℹ️ ข้อมูลจาก Agent อยู่ในแบบฟอร์มครบแล้ว ไม่มีอะไรต้องเติมเพิ่ม');
  };

  // Applies the previously-fetched GLPI spec into the checklist answers.
  // Kept as a separate, explicit step (rather than doing this inside
  // fetchGLPI) so a technician can review the scanned data before it
  // overwrites whatever they've already checked/entered by hand.
  const applyGLPISpecToAnswers = () => {
    if (!glpiSpec) return;
    const newAnswers = { ...answers };
    if (glpiSpec.os) {
      newAnswers['windows_version'] = 'yes';
      newAnswers['windows_version_note'] = glpiSpec.os;
    }
    if (glpiSpec.msOffice) {
      newAnswers['office_check'] = 'yes';
      newAnswers['office_check_note'] = glpiSpec.msOffice;
    }
    if (glpiSpec.antivirus) {
      newAnswers['antivirus'] = 'yes';
      newAnswers['antivirus_note'] = glpiSpec.antivirus;
    }

    // Pre-fill the "ตรวจสอบจอ Monitor" device list from what GLPI saw
    // connected, so the technician only has to verify/correct it instead of
    // typing brand/model/S/N by hand.
    mergeMonitorsIntoAnswers(newAnswers, (glpiSpec.monitors || []).map((m: any) => ({
      _assetId: m._assetId || undefined,
      // assetCode มาเป็นรหัสจริงของระเบียนแล้ว (หรือ null ถ้ายังไม่มี)
      // ไม่ใช่สตริง `ชื่อ / รหัส` ที่เคยพ่วงคำว่า null ติดมาอีกต่อไป
      // จอที่ยังไม่อยู่ในทะเบียนต้องเป็น undefined เพื่อให้ช่องโชว์รหัส
      // ที่ระบบเจนให้แทน
      assetCode: m._assetId ? (m.assetCode || '') : undefined,
      hasMonitor: true,
      // บริษัทของเครื่องที่กำลังทำ PM คือคำตอบที่ถูกเสมอสำหรับจอที่ยังไม่มี
      // ในทะเบียน — GLPI บอกบริษัทไม่ได้ ส่วนจอที่มีแล้วจะติดบริษัทของตัวเองมา
      company: m.company || pmModal.run?.asset?.company || '',
      brand: m.brand || '',
      model: m.model || '',
      serialNo: m.serial || '',
      source: 'glpi',
      screenSize: m.screenSize || null,
      ports: m.ports || null,
      hasSpeaker: !!m.hasSpeaker,
    })));

    setAnswers(newAnswers);
    setGlpiSpecApplied(true);
    showToast('✅ อัปเดตข้อมูลสเปคคอม (และจอที่ตรวจพบ) ลงในแบบฟอร์มแล้ว');
  };

  /* ── Open PM Checklist ── */
  const openPM = (run: any, readOnly = false) => {
    if (!run.plan?.template?.templateItems?.length) {
      showToast('❌ แผน PM นี้ยังไม่มี Checklist Template กรุณาไปเพิ่มในเมนู จัดการแผน');
      return;
    }

    setGlpiSpec(null); // Reset GLPI Spec
    setAgentCheck(null);
    setAgentApplied(false);

    // 1. Load from DB first
    let pre: Record<string, any> = {};
    (run.answers || []).forEach((a: any) => {
      const key = a.item?.key || a.key || a.itemKey;
      if (key) {
        if (a.value && typeof a.value === 'string' && a.value.includes('::')) {
          const [v, ...noteParts] = a.value.split('::');
          pre[key] = v;
          pre[`${key}_note`] = noteParts.join('::');
        } else {
          pre[key] = a.value;
        }
      }
    });

    // 2. Override with Local Draft (if any), BUT ONLY IF NOT COMPLETED
    const draftKey = `pm_draft_${run.id}`;
    if (run.status === 'COMPLETED') {
      localStorage.removeItem(draftKey); // Clean up stale draft if any
    } else {
      const localDraft = localStorage.getItem(draftKey);
      if (localDraft) {
        try {
          const draftParsed = JSON.parse(localDraft);
          if (Object.keys(draftParsed).length > 0) {
             pre = { ...pre, ...draftParsed };
          }
        } catch (e) {
          console.error('Failed to parse local draft', e);
        }
      }
    }

    if (!pre['staff_name'] && user && !readOnly) {
      pre['staff_name'] = user.displayName || user.adUsername || '';
    }

    setAnswers(pre);
    setPMModal({ open: true, run, readOnly });
  };

  /* ── Get checklist items ── */
  const getChecklistItems = (run: any) => {
    const items = run?.plan?.template?.templateItems;
    if (items?.length > 0) return items;
    return DEFAULT_CHECKLIST;
  };

  /* ── Save PM ── */
  const handleSave = async (nextStatus: 'IN_PROGRESS' | 'COMPLETED' = 'COMPLETED') => {
    const run = pmModal.run;
    if (!run) return;
    setSaving(true);
    try {
      const items = getChecklistItems(run);
      const answerList = items.filter((item: any) => item.id).map((item: any) => {
        let val = answers[item.key] !== undefined ? String(answers[item.key]) : '';
        const shouldSaveNote = (val === 'no' || val === 'na') || (val === 'yes' && ['windows_version', 'office_check', 'antivirus', 'ip_phone'].includes(item.key));
        if (shouldSaveNote && answers[`${item.key}_note`]) {
          val = `${val}::${answers[`${item.key}_note`]}`;
        }
        return { itemId: item.id, key: item.key, value: val };
      });
      if (items.length === 0 || answerList.length === 0) {
        showToast('❌ แผน PM นี้ยังไม่มี Checklist Template');
        return;
      }
      const res = await pmAPI.performRun(run.id, { answers: answerList, status: nextStatus });
      const updatedRun = res.data;
      setRuns(prev => prev.map(r => r.id === updatedRun.id ? updatedRun : r));

      // Clear draft on success
      localStorage.removeItem(`pm_draft_${run.id}`);

      if (nextStatus === 'IN_PROGRESS') {
        showToast(`✅ บันทึกร่าง PM สำหรับ ${run.asset?.assetName || run.asset?.assetCode} สำเร็จ`);
        setPMModal({ open: false, run: null });
        return;
      }
      showToast(`✅ บันทึก PM สำหรับ ${run.asset?.assetName || run.asset?.assetCode} สำเร็จ`);
      setPMModal({ open: false, run: null });
    } catch (err: any) {
      showToast(`❌ ${err.response?.data?.error || 'บันทึกไม่สำเร็จ'}`);
    } finally { setSaving(false); }
  };

  /* ── Bulk Save PM ── */
  const handleBulkSave = async () => {
    if (selectedRunIds.length === 0) return;
    const firstRun = runs.find(r => r.id === selectedRunIds[0]);
    if (!firstRun) return;

    setSaving(true);
    try {
      const items = getChecklistItems(firstRun);
      const answerList = items.filter((item: any) => item.id).map((item: any) => {
        let val = answers[item.key] !== undefined ? String(answers[item.key]) : '';
        const shouldSaveNote = (val === 'no' || val === 'na') || (val === 'yes' && ['windows_version', 'office_check', 'antivirus', 'ip_phone'].includes(item.key));
        if (shouldSaveNote && answers[`${item.key}_note`]) {
          val = `${val}::${answers[`${item.key}_note`]}`;
        }
        return { itemId: item.id, key: item.key, value: val };
      });
      if (items.length === 0 || answerList.length === 0) {
        showToast('❌ แผน PM นี้ยังไม่มี Checklist Template');
        return;
      }

      const res = await pmAPI.bulkPerformRun({ runIds: selectedRunIds, answers: answerList });
      const updatedRuns: any[] = res.data?.runs || [];
      const updatedById = new Map(updatedRuns.map(r => [r.id, r]));
      setRuns(prev => prev.map(r => updatedById.has(r.id) ? updatedById.get(r.id) : r));
      showToast(`✅ บันทึก PM แบบกลุ่ม ${selectedRunIds.length} รายการสำเร็จ`);

      // Clean up drafts
      selectedRunIds.forEach(id => localStorage.removeItem(`pm_draft_${id}`));

      setBulkPMModal({ open: false, templateId: null });
      setSelectedRunIds([]);
    } catch (err: any) {
      showToast(`❌ ${err.response?.data?.error || 'บันทึกไม่สำเร็จ'}`);
    } finally { setSaving(false); }
  };

  /* ── Photo Upload ── */
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pmModal.run) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingPhoto(true);
    try {
      const res = await pmAPI.uploadPMPhoto(pmModal.run.id, formData);
      const updatedRun = res.data;

      setPMModal(prev => ({
        ...prev,
        run: {
          ...prev.run,
          photoUrl: updatedRun.photoUrl
        }
      }));

      setRuns(prev => prev.map(r => r.id === updatedRun.id ? { ...r, photoUrl: updatedRun.photoUrl } : r));
      showToast('📸 อัปโหลดรูปภาพสำเร็จ');
    } catch (err: any) {
      showToast(`❌ อัปโหลดรูปภาพไม่สำเร็จ: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  /* ── Delete Run ── */
  const confirm = useConfirm();
  const handleDeleteRun = async (id: number) => {
    if (!await confirm({
      title: 'ลบงาน PM',
      target: runs.find(r => r.id === id)?.asset?.assetCode,
      detail: 'ผลตรวจและรูปถ่ายที่บันทึกไว้ในงานนี้จะถูกลบไปด้วย',
    })) return;
    try {
      await pmAPI.deleteRun(id);
      setRuns(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการลบงาน PM');
    }
  };

  /* ── Note (freeform remark, e.g. reschedule reason for overdue PM) ── */
  const openNoteModal = (run: any) => setNoteModal({ open: true, run, value: run.notes || '' });
  const handleSaveNote = async () => {
    if (!noteModal.run) return;
    setSavingNote(true);
    try {
      const res = await pmAPI.updateRunNotes(noteModal.run.id, noteModal.value);
      const notes = res.data.notes;
      setRuns(prev => prev.map(r => r.id === noteModal.run.id ? { ...r, notes } : r));
      setNoteModal({ open: false, run: null, value: '' });
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการบันทึกโน้ต');
    } finally {
      setSavingNote(false);
    }
  };

  /* ── วันนัดลงหน้างาน ──
     ตั้งทีเดียวทั้งชุดเสมอ เพราะงานจริงคือ "แผนก SAL ทั้งแผนก ลงวันจันทร์"
     ไม่ใช่การไล่ตั้งทีละเครื่อง 56 ครั้ง */
  const handleSaveSchedule = async (clear = false) => {
    if (selectedRunIds.length === 0) return;
    const value = clear ? null : schedModal.value;
    if (!clear && !value) return;
    setSavingSched(true);
    try {
      const res = await pmAPI.bulkSetRunSchedule(selectedRunIds, value);
      const ids = new Set(selectedRunIds);
      setRuns(prev => prev.map(r => (
        ids.has(r.id) && r.status !== 'COMPLETED' ? { ...r, scheduledDate: value } : r
      )));
      setSchedModal({ open: false, value: '' });
      setSelectedRunIds([]);
      showToast(`✅ ${res.data.message}`);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการตั้งวันนัด');
    } finally {
      setSavingSched(false);
    }
  };

  /* ── Export Excel ── */
  const handleExport = async () => {
    const XLSX = await loadXlsx();
    setExporting(true);
    try {
      const exportRows = filtered.map((r, idx) => {
        const row: any = {
          '#': idx + 1,
          'รหัสทรัพย์สิน': r.asset?.assetCode || '',
          'ชื่ออุปกรณ์': r.asset?.assetName || '',
          'Serial No.': r.asset?.serialNo || '',
          'ยี่ห้อ': r.asset?.brand || '',
          'รุ่น': r.asset?.model || '',
          'ผู้ถือครอง': r.asset?.ownerName || '',
          'แผนก': r.asset?.departmentId || r.plan?.deptTask || '',
          'Location': r.asset?.location || r.plan?.site || '',
          'แผน PM': r.plan?.deptTask || r.plan?.site || '',
          'สถานะ': r.status === 'COMPLETED' ? 'เสร็จแล้ว' : r.status === 'IN_PROGRESS' ? 'กำลังทำ' : 'รอดำเนินการ',
          'วันนัด': r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString('th-TH') : '',
          'ผู้ทำ PM': r.performer?.displayName || '',
          'วันที่ PM': r.performedAt ? new Date(r.performedAt).toLocaleDateString('th-TH') : '',
        };
        // Flatten checklist answers
        (r.answers || []).forEach((a: any) => {
          row[a.item?.label || a.label || a.item?.key || a.key] = a.value;
        });
        return row;
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportRows);
      ws['!cols'] = Object.keys(exportRows[0] || {}).map(k => ({ wch: Math.max(k.length + 4, 14) }));
      XLSX.utils.book_append_sheet(wb, ws, 'PM Results');
      XLSX.writeFile(wb, `PM-Results-${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast(`✅ Export สำเร็จ ${exportRows.length} รายการ`);
    } catch (err) {
      showToast('❌ Export ไม่สำเร็จ');
    } finally { setExporting(false); }
  };

  /* ── Stats ── */
  const done = runs.filter(r => r.status === 'COMPLETED').length;
  const pending = runs.filter(r => r.status === 'DRAFT').length;
  const inProgress = runs.filter(r => r.status === 'IN_PROGRESS').length;
  const overdueCount = runs.filter(r => r.status !== 'COMPLETED' && r.plan?.endDate && new Date(r.plan.endDate).getTime() < new Date().setHours(0,0,0,0)).length;
  // Only 8 of the 97 checks completed so far carry a photo. The checklist
  // answers are filled in properly (18-19 of 19 items every time), so this is
  // specifically the evidence step being skipped — worth a number of its own
  // rather than leaving it buried one icon per row.
  const donePhoto = runs.filter(r => r.status === 'COMPLETED' && r.photoUrl).length;

  /* ── Checklist progress ── */
  const checkItems = pmModal.run ? getChecklistItems(pmModal.run) : [];
  const boolItems = checkItems.filter((i: any) => i.type === 'boolean');
  const answeredBool = boolItems.filter((i: any) => answers[i.key] !== undefined).length;
  const checkPct = boolItems.length > 0 ? Math.round(answeredBool / boolItems.length * 100) : 0;

  const stats: { icon: React.ElementType; label: string; val: number; color: 'inherit' | 'success' | 'error' | 'secondary' | 'warning'; isProgress?: boolean; sub?: string }[] = [
    { icon: Inventory2Icon, label: 'ทั้งหมด', val: runs.length, color: 'inherit' },
    { icon: CheckCircleIcon, label: 'เสร็จแล้ว', val: done, color: 'success' },
    ...(overdueCount > 0
      ? [{ icon: WarningAmberIcon, label: 'เลยกำหนด', val: overdueCount, color: 'error' as const }]
      : [{ icon: AutorenewIcon, label: 'กำลังทำ', val: inProgress, color: 'secondary' as const }]),
    { icon: HourglassEmptyIcon, label: 'รอดำเนินการ', val: pending, color: 'warning' },
    { icon: PhotoCameraIcon, label: 'มีรูปหลักฐาน', val: donePhoto, color: donePhoto < done ? 'warning' : 'success', sub: done > 0 ? 'จาก ' + done + ' งานที่เสร็จ' : undefined },
    { icon: PercentIcon, label: '% เสร็จ', val: runs.length > 0 ? Math.round(done / runs.length * 100) : 0, color: 'success', isProgress: true },
  ];

  const clearFilters = () => {
    setSearch(''); setFilterStatus(''); setFilterPlan(''); setFilterType('');
    setFilterStaff(''); setFilterCompany(''); setFilterSched(''); setCurrentPage(1);
  };
  const anyFilter = !!(search || filterStatus || filterPlan || filterType || filterStaff || filterCompany || filterSched);

  /** Counts ignore the filter they belong to, so a chip never zeroes itself out. */
  const countBy = (fn: (r: any) => boolean) => runs.filter(fn).length;

  const statusChips = [
    { key: 'DRAFT', label: 'รอดำเนินการ', color: theme.palette.warning.main, n: pending },
    { key: 'IN_PROGRESS', label: 'กำลังทำ', color: theme.palette.info.main, n: inProgress },
    { key: 'COMPLETED', label: 'เสร็จแล้ว', color: theme.palette.success.main, n: done },
    { key: 'OVERDUE', label: 'เกินกำหนด', color: theme.palette.error.main, n: overdueCount },
  ];

  const chipSx = (active: boolean, color?: string) => ({
    fontSize: 11, height: 23, fontWeight: active ? 600 : 500, cursor: 'pointer',
    borderColor: active ? (color || theme.palette.primary.main) : theme.palette.divider,
    bgcolor: active ? alpha(color || theme.palette.primary.main, 0.1) : 'transparent',
    color: active ? (color || theme.palette.primary.main) : theme.palette.text.secondary,
    '& .MuiChip-label': { px: 1 },
    '&:hover': { borderColor: color || theme.palette.primary.main },
  });

  const chipRow = (label: string, node: React.ReactNode) => (
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
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.25, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2.25,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 1,
            }}
          >
            <BuildIcon color="primary" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>งาน Preventive Maintenance (PM)</Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.2 }}>ตรวจเช็ค คลีนอุปกรณ์ และลงบันทึกรายงานผล</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport} disabled={exporting || filtered.length === 0}>
            Export Excel
          </Button>
          <Button size="small" variant="contained" startIcon={<AssignmentIcon />} onClick={() => navigate('/pm/plans')}>
            จัดการแผน
          </Button>
        </Box>
      </Box>

      {/* ── Stats ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(126px,1fr))', gap: 1, mb: 1.5 }}>
        {stats.map((s) => (
          <Card key={s.label} variant="outlined" sx={{ p: '9px 12px', display: 'flex', alignItems: 'center', gap: 1.25 }}>
            {!s.isProgress && (
              <Box sx={{ color: s.color === 'inherit' ? 'text.primary' : `${s.color}.main`, display: 'flex' }}>
                <s.icon />
              </Box>
            )}
            <Box sx={{ flex: 1 }}>
              {s.isProgress ? (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: `${s.color}.main` }}>{s.val}%</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.label}</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={s.val} color={s.color as any} sx={{ height: 6, borderRadius: 4 }} />
                </>
              ) : (
                <>
                  <Typography sx={{ fontSize: 21, fontWeight: 800, color: s.color === 'inherit' ? 'text.primary' : `${s.color}.main`, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                    {s.val}
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.4 }}>{s.label}</Typography>
                  {s.sub && <Typography sx={{ fontSize: 9.5, color: 'text.disabled', mt: 0.1 }}>{s.sub}</Typography>}
                </>
              )}
            </Box>
          </Card>
        ))}
      </Box>

      {/* ── Filters ──────────────────────────────────────────────────
          Status / company / device type are short, high-traffic lists, so
          they are click-to-toggle chips like the other PM pages. Plan and
          performer stay as selects: 31 plans would be an unreadable wall of
          chips. Counts sit on the chips so you can see where the work is
          before filtering to it. */}
      <Card variant="outlined" sx={{ p: 1.4, mb: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            sx={{ flex: 1, minWidth: 220 }}
            placeholder="ค้นหาชื่ออุปกรณ์ / รหัส / ชื่อผู้ใช้ / ยี่ห้อ..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
          <Tooltip title="สแกน QR Code">
            <IconButton aria-label="สแกน QR Code" size="small" onClick={() => setQrModalOpen(true)}><QrCodeScannerIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Select size="small" sx={{ minWidth: 150 }} displayEmpty value={filterPlan}
            onChange={e => { setFilterPlan(e.target.value); setCurrentPage(1); }}>
            <MenuItem value="">ทุกแผน PM</MenuItem>
            {Array.from(new Set(plans.map(p => p.deptTask || p.site || `Plan #${p.id}`))).map(name =>
              <MenuItem key={name} value={name}>{name}</MenuItem>
            )}
          </Select>
          <Select size="small" sx={{ minWidth: 140 }} displayEmpty value={filterStaff}
            onChange={e => { setFilterStaff(e.target.value); setCurrentPage(1); }}>
            <MenuItem value="">ทุกผู้ทำ PM</MenuItem>
            {uniqueStaff.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
          {anyFilter && (
            <Button size="small" color="error" startIcon={<RestartAltIcon />} onClick={clearFilters}
              sx={{ fontSize: 10.5, fontWeight: 600 }}>ล้างตัวกรอง</Button>
          )}
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', whiteSpace: 'nowrap', ml: 'auto', fontVariantNumeric: 'tabular-nums' }}>
            แสดง {filtered.length}/{runs.length}
          </Typography>
        </Box>

        {chipRow('สถานะ', statusChips.map(s => (
          <Chip key={s.key} variant="outlined" size="small"
            onClick={() => { setFilterStatus(filterStatus === s.key ? '' : s.key); setCurrentPage(1); }}
            sx={chipSx(filterStatus === s.key, s.color)}
            label={<>{s.label} <Box component="span" sx={{ fontSize: 9.5, opacity: 0.7 }}>{s.n}</Box></>} />
        )))}

        {chipRow('วันนัด', SCHED_FILTERS.map(f => (
          <Chip key={f.key} variant="outlined" size="small"
            onClick={() => { setFilterSched(filterSched === f.key ? '' : f.key); setCurrentPage(1); }}
            sx={chipSx(filterSched === f.key, f.key === 'LATE' ? theme.palette.warning.main : undefined)}
            label={<>{f.label} <Box component="span" sx={{ fontSize: 9.5, opacity: 0.7 }}>{countBy(r => matchesSchedFilter(r, f.key))}</Box></>} />
        )))}

        {uniqueCompanies.length > 1 && chipRow('บริษัท', uniqueCompanies.map(c => (
          <Chip key={c} variant="outlined" size="small"
            onClick={() => { setFilterCompany(filterCompany === c ? '' : c); setCurrentPage(1); }}
            sx={chipSx(filterCompany === c)}
            label={<>{c} <Box component="span" sx={{ fontSize: 9.5, opacity: 0.65 }}>{countBy(r => (r.asset?.company || r.plan?.company) === c)}</Box></>} />
        )))}

        {uniqueTypes.length > 1 && chipRow('ประเภท', uniqueTypes.map(t => (
          <Chip key={t} variant="outlined" size="small"
            onClick={() => { setFilterType(filterType === t ? '' : t); setCurrentPage(1); }}
            sx={chipSx(filterType === t)}
            label={<>{t} <Box component="span" sx={{ fontSize: 9.5, opacity: 0.65 }}>{countBy(r => r.asset?.type === t)}</Box></>} />
        )))}
      </Card>

      {/* ── Table ── */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 8, textAlign: 'center', color: 'primary.main', fontSize: 14, fontWeight: 500 }}>กำลังโหลดข้อมูล...</Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ p: 8, textAlign: 'center', color: 'text.secondary' }}>
            <BuildIcon sx={{ fontSize: 36, mb: 1.5, color: 'text.disabled' }} />
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>ไม่พบรายการ PM</Typography>
            <Typography sx={{ fontSize: 12, mt: 0.5 }}>
              {runs.length === 0 ? 'ยังไม่มีงาน PM — ไปสร้างแผนและสุ่มงานระบบก่อน' : 'ลองปรับการกรองหรือข้อความค้นหาใหม่'}
            </Typography>
            {runs.length === 0 && (
              <Button variant="contained" startIcon={<AssignmentIcon />} sx={{ mt: 2 }} onClick={() => navigate('/pm/plans')}>
                ไปสร้างแผน PM
              </Button>
            )}
          </Box>
        ) : (
          <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
            <Table size="small" sx={{ fontSize: 12 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell padding="checkbox">
                    <Checkbox size="small" checked={allSelected} onChange={handleSelectAll} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', width: 50, textAlign: 'center' }}>ลำดับ</TableCell>
                  <TableCell sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>สถานะ</TableCell>
                  <TableCell sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>รหัสทรัพย์สิน / ชื่ออุปกรณ์</TableCell>
                  <TableCell sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>แผนก / ผู้ถือครอง</TableCell>
                  <TableCell sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>วันนัด</TableCell>
                  <TableCell sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>แผน PM (กำหนดเสร็จ)</TableCell>
                  <TableCell sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>ประเภท</TableCell>
                  <TableCell sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textAlign: 'right' }}>จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRuns.map((r, i) => {
                  const idx = (currentPage - 1) * pageSize + i;
                  const isDone = r.status === 'COMPLETED';
                  const isOverdue = !isDone && r.plan?.endDate && new Date(r.plan.endDate).getTime() < new Date().setHours(0,0,0,0);
                  const statusInfo = STATUS_CHIP[r.status] || { color: 'default' as const, label: r.status };

                  return (
                    <TableRow key={r.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" disabled={r.status === 'COMPLETED'} checked={selectedRunIds.includes(r.id)} onChange={() => handleSelectOne(r.id)} />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', color: 'text.secondary', fontWeight: 500, fontSize: 11 }}>
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={isOverdue ? 'error' : statusInfo.color}
                          icon={isOverdue ? <WarningAmberIcon sx={{ fontSize: 14 }} /> : undefined}
                          label={isOverdue ? 'เกินกำหนด' : statusInfo.label}
                          sx={{ fontSize: 10, fontWeight: 700, height: 22 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ fontWeight: 600, fontSize: 12, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                          {(r.asset?.type === 'Monitor' || r.asset?.assetName?.toLowerCase().includes('monitor')) && (
                            <Tooltip title="Monitor"><MonitorIcon sx={{ fontSize: 14 }} /></Tooltip>
                          )}
                          <span>{r.asset?.assetCode || 'ไม่มีรหัส'} / {r.asset?.assetName || 'ไม่มีชื่ออุปกรณ์'}</span>
                          {r.photoUrl && <Tooltip title="มีรูปถ่าย"><PhotoCameraIcon sx={{ fontSize: 14 }} /></Tooltip>}
                        </Box>
                        <Box sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5, display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                          {r.asset?.brand || r.asset?.model ? (
                            <Box component="span" sx={{ bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 0.5 }}>
                              {r.asset?.brand || ''} {r.asset?.model || ''}
                            </Box>
                          ) : null}
                          <span>S/N: {r.asset?.serialNo || '—'}</span>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 500, fontSize: 12 }}>{r.asset?.departmentId || r.plan?.deptTask || '—'}</Typography>
                        <Box sx={{ fontSize: 10, color: 'text.secondary', mt: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 12 }} /> {r.asset?.ownerName || '—'}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 11 }}>
                        {r.scheduledDate ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600, color: schedLate(r) ? 'warning.main' : 'text.primary' }}>
                            <EventIcon sx={{ fontSize: 13 }} />
                            {new Date(r.scheduledDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </Box>
                        ) : (
                          <Box sx={{ color: 'text.disabled' }}>ยังไม่นัด</Box>
                        )}
                        {schedLate(r) && (
                          <Box sx={{ fontSize: 10, color: 'warning.main', mt: 0.25 }}>เลยวันนัดแล้ว</Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11 }}>
                        <Typography sx={{ fontWeight: 500, fontSize: 11 }}>{r.plan?.deptTask || (r.plan?.isAdhoc ? 'Ad-hoc' : 'ทุกแผนก')}</Typography>
                        <Box sx={{ color: isOverdue ? 'error.main' : 'text.secondary', mt: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EventIcon sx={{ fontSize: 12 }} />
                          สิ้นสุด {r.plan?.endDate ? new Date(r.plan.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                        </Box>
                        {r.notes && (
                          <Tooltip title={r.notes}>
                            <Box sx={{ mt: 0.5, fontSize: 10, color: 'primary.main', display: 'flex', alignItems: 'flex-start', gap: 0.5, maxWidth: 220 }}>
                              <EditNoteIcon sx={{ fontSize: 12, flexShrink: 0 }} />
                              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes}</Box>
                            </Box>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {r.asset?.type || '—'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <Tooltip title="ดูรายละเอียด PM">
                            <span>
                              <IconButton aria-label="ดูรายละเอียด PM" size="small" color="primary" onClick={() => openPM(r, true)} disabled={!r.plan?.template?.templateItems?.length}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="แก้ไข / บันทึกผล PM">
                            <span>
                              <IconButton aria-label="แก้ไข / บันทึกผล PM" size="small" color="success" onClick={() => openPM(r, false)} disabled={!r.plan?.template?.templateItems?.length}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={r.notes ? 'แก้ไขโน้ต' : 'เพิ่มโน้ต (เช่น เจ้าของเครื่องไม่ว่าง จะนัดทำ PM วันไหน)'}>
                            <IconButton aria-label="แก้ไขโน้ต" size="small" color={r.notes ? 'primary' : 'default'} onClick={() => openNoteModal(r)}>
                              <EditNoteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="ลบข้อมูล">
                            <IconButton aria-label="ลบข้อมูล" size="small" color="error" onClick={() => handleDeleteRun(r.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination */}
        {!loading && sortedRuns.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, p: '12px 16px', borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>แสดง:</Typography>
              <Select size="small" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} sx={{ fontSize: 12 }}>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>รายการ</Typography>
            </Box>
            <Pagination
              size="small"
              count={totalPages}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
            />
          </Box>
        )}
      </Paper>

      {/* Sticky Bulk Action Bar */}
      {selectedRunIds.length > 0 && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            p: '12px 24px',
            borderRadius: 100,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            zIndex: 1300,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>
              {selectedRunIds.length}
            </Box>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>เลือกรายการแล้ว</Typography>
          </Box>
          <Box sx={{ width: '1px', height: 24, bgcolor: 'divider' }} />
          <Button
            variant="contained"
            startIcon={<BuildIcon />}
            onClick={() => {
              const firstRun = runs.find((r) => r.id === selectedRunIds[0]);
              if (firstRun) {
                setAnswers({ staff_name: user?.displayName || user?.adUsername || '' });
                setBulkPMModal({ open: true, templateId: firstRun.plan?.templateId || null });
              }
            }}
          >
            ทำ PM พร้อมกัน
          </Button>
          <Button
            variant="outlined"
            startIcon={<EventIcon />}
            onClick={() => {
              // ตั้งค่าเริ่มต้นเป็นวันนัดเดิมของรายการแรกที่เลือก ถ้ามี — การแก้วันนัด
              // ทั้งแผนกที่จองไว้แล้วเป็นเรื่องปกติพอ ๆ กับการตั้งครั้งแรก
              const first = runs.find(r => r.id === selectedRunIds[0]);
              setSchedModal({ open: true, value: toDateInput(first?.scheduledDate) });
            }}
          >
            ตั้งวันนัด
          </Button>
          <Button variant="outlined" onClick={() => setSelectedRunIds([])}>
            ยกเลิก
          </Button>
        </Paper>
      )}

      {/* ── PM Checklist Modal ── */}
      <Modal
        open={pmModal.open}
        onClose={() => setPMModal({ open: false, run: null, readOnly: false })}
        fullScreen
        title={`${pmModal.readOnly || pmModal.run?.status === 'COMPLETED' ? 'รายละเอียดข้อมูล' : 'บันทึกข้อมูล'} PM: ${pmModal.run?.asset?.assetName || pmModal.run?.asset?.assetCode || ''} — ${pmModal.run?.asset?.brand || ''} ${pmModal.run?.asset?.model || ''}`}
      >
        {pmModal.run && (() => {
          const items = sortChecklistItems(getChecklistItems(pmModal.run));
          const isReadOnly = !!pmModal.readOnly;

          const setAll = (val: string) => {
            const newAns = { ...answers };
            items.filter((i: any) => i.type?.toLowerCase() === 'boolean').forEach((i: any) => newAns[i.key] = val);
            setAnswers(newAns);
          };

          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              {/* Progress & Actions — เต็มความกว้าง ค้างอยู่บนสุดเสมอ เพราะเป็น
                  ตัวเลขที่ต้องเห็นตลอดว่าเหลืออีกกี่ข้อ */}
              <Box sx={{ p: '10px 24px', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 1.5, bgcolor: 'action.hover' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 220 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600 }}>ความคืบหน้า</Typography>
                  <LinearProgress variant="determinate" value={checkPct} color="success" sx={{ flex: 1, height: 6, borderRadius: 99 }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'success.main', minWidth: 40 }}>{checkPct}%</Typography>
                </Box>
                {!isReadOnly && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" startIcon={<CheckIcon />} onClick={() => setAll('yes')}>ทำทั้งหมด (Yes)</Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RestartAltIcon />}
                      onClick={() => {
                        setAnswers({ staff_name: user?.displayName || user?.adUsername || '' });
                        localStorage.removeItem(`pm_draft_${pmModal.run.id}`);
                      }}
                    >
                      ล้างข้อมูล
                    </Button>
                  </Box>
                )}
              </Box>

              {/* ── สองคอลัมน์ ────────────────────────────────────────────
                  ซ้าย = เช็คลิสต์ที่ต้องกรอก เลื่อนของตัวเอง
                  ขวา = ข้อมูลเครื่องกับผลตรวจ Agent ที่ต้องเห็นระหว่างกรอก
                  ของเดิมวางเรียงลงมาชั้นเดียว ผลตรวจ Agent จึงเลื่อนหายไปพอดี
                  ตอนที่ช่างเริ่มกรอกเช็คลิสต์ ทั้งที่เป็นข้อมูลที่ต้องใช้อ้างอิง

                  แถบเลื่อนแยกคอลัมน์เฉพาะจอกว้าง จอแคบปล่อยให้เลื่อนทั้งหน้า
                  เป็นแถบเดียว ไม่งั้นจะได้กล่องเลื่อนสองกล่องซ้อนกันบนมือถือ */}
              <Box sx={{
                flex: 1, minHeight: 0,
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 400px' },
                overflowY: { xs: 'auto', lg: 'hidden' },
              }}>

              {/* ── คอลัมน์ขวา: ข้อมูลเครื่อง + ผลตรวจ ── */}
              <Box sx={{
                gridColumn: { lg: 2 }, gridRow: { lg: 1 },
                order: { xs: -1, lg: 0 },
                overflowY: { xs: 'visible', lg: 'auto' },
                borderLeft: { lg: '1px solid' }, borderColor: { lg: 'divider' },
                display: 'flex', flexDirection: 'column',
              }}>
              {/* Header Info */}
              <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', p: '12px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px 20px', flexShrink: 0 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px' }}>
                  {[
                    { lbl: 'ผู้ถือครอง', val: pmModal.run.asset?.ownerName || '—' },
                    { lbl: 'แผนก', val: pmModal.run.asset?.departmentId || pmModal.run.plan?.deptTask || '—' },
                    { lbl: 'Location', val: pmModal.run.asset?.location || pmModal.run.plan?.site || '—' },
                    { lbl: 'Serial No.', val: pmModal.run.asset?.serialNo || '—' },
                  ].map(i => (
                    <Box key={i.lbl}>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary', mb: 0.25, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{i.lbl}</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{i.val}</Typography>
                    </Box>
                  ))}
                </Box>
                {!isReadOnly && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {pmModal.run.asset?.serialNo && (
                      <Button size="small" variant="outlined" startIcon={<SyncAltIcon />} onClick={() => fetchGLPI(pmModal.run.id)} disabled={fetchingGLPI}>
                        {fetchingGLPI ? 'กำลังดึงข้อมูล...' : 'ดึงสเปคจาก GLPI'}
                      </Button>
                    )}
                    <Button size="small" variant="outlined" color="secondary" startIcon={<SyncAltIcon />}
                      onClick={() => fetchAgentCheck(pmModal.run.id)} disabled={fetchingAgent}>
                      {fetchingAgent ? 'กำลังตรวจ...' : '🤖 ตรวจจาก Agent'}
                    </Button>
                  </Box>
                )}
              </Box>

              {/* Photo Upload Section */}
              <Box sx={{ p: '10px 20px', borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                <Box sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PhotoCameraIcon sx={{ fontSize: 14 }} /> รูปถ่ายขณะทำ PM (Photo attachment)
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {pmModal.run.photoUrl ? (
                    /* รูปย่อ 64px ถูกครอบ (objectFit: cover) จึงบอกไม่ได้เลยว่าถ่าย
                       ติดครบหรือชัดไหม — คลิกเพื่อกางเต็มจอ */
                    <Tooltip title="คลิกเพื่อดูรูปขนาดเต็ม">
                      <Box
                        onClick={() => setPmPhotoZoom(true)}
                        sx={{
                          width: 64, height: 64, borderRadius: 1, border: '1px solid', borderColor: 'divider',
                          overflow: 'hidden', bgcolor: 'action.hover', cursor: 'zoom-in', position: 'relative',
                          '&:hover .zoom-hint': { opacity: 1 },
                        }}
                      >
                        <img src={`/uploads/pm/${pmModal.run.photoUrl}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="PM Attachment" />
                        <Box className="zoom-hint" sx={{
                          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          bgcolor: 'rgba(0,0,0,0.45)', color: '#fff', opacity: 0, transition: 'opacity .15s',
                        }}>
                          <ZoomOutMapIcon sx={{ fontSize: 20 }} />
                        </Box>
                      </Box>
                    </Tooltip>
                  ) : (
                    <Box sx={{ width: 64, height: 64, borderRadius: 1, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.disabled', bgcolor: 'action.hover' }}>
                      {isReadOnly ? <Typography sx={{ fontSize: 11 }}>ไม่มีรูปถ่าย</Typography> : <PhotoCameraIcon />}
                    </Box>
                  )}
                  {!isReadOnly && (
                    <Box>
                      <Button variant="outlined" size="small" startIcon={<PhotoCameraIcon />} disabled={uploadingPhoto}
                        onClick={() => pmPhotoInputRef.current?.click()}>
                        {uploadingPhoto ? 'กำลังอัปโหลด...' : 'เลือกรูปภาพ'}
                      </Button>
                      {/* input แยกออกมาถือ ref ไว้ ปุ่ม "เปลี่ยนรูป" ในหน้าดูรูปเต็ม
                          จะได้เรียกใช้ตัวเดียวกันนี้ได้ */}
                      <input ref={pmPhotoInputRef} type="file" accept="image/*" hidden onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                      <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.75 }}>
                        รองรับไฟล์ JPG, PNG, GIF, WEBP ขนาดไม่เกิน 10MB
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* ── สิ่งที่ Agent ตรวจเจอ ─────────────────────────────────
                  วางไว้เหนือ checklist เพราะเป็นเรื่องที่ต้องรู้ก่อนเริ่มตรวจ
                  และหลายข้อ (แบตเสื่อม ดิสก์เต็ม) มองด้วยตาไม่เห็น */}
              {agentCheck && (
                <Box sx={{ px: 2.5, py: 2 }}>
                  <Box sx={{
                    borderRadius: '12px', overflow: 'hidden',
                    border: '1px solid', borderColor: 'divider',
                  }}>
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
                      p: '8px 14px', bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider',
                    }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>🤖 สิ่งที่ Agent ตรวจเจอ</Typography>
                      {agentCheck.available && (
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                          {agentCheck.hostname}
                          {agentCheck.online ? ' · ออนไลน์' : agentCheck.lastSeen ? ` · รายงานล่าสุด ${String(agentCheck.lastSeen).slice(0, 16).replace('T', ' ')}` : ''}
                        </Typography>
                      )}
                      <Box sx={{ flex: 1 }} />
                      {(() => {
                        // Only promise "จอ N ตัว" when the template actually has
                        // somewhere to put them — otherwise the button claims a
                        // count it can never write, then reports false success.
                        const canFileMonitors = hasMonitorArrayItem(pmModal.run);
                        const monitorCount = canFileMonitors ? (agentCheck.monitors?.length || 0) : 0;
                        const answerCount = agentCheck.answers?.length || 0;
                        if (!agentCheck.available || isReadOnly || (!answerCount && !monitorCount)) return null;
                        return (
                          <Button size="small" variant={agentApplied ? 'outlined' : 'contained'} color="secondary"
                            onClick={applyAgentAnswers}
                            sx={{ fontSize: 10.5, py: 0.25, textTransform: 'none' }}>
                            {agentApplied ? `เติมแล้ว (กดซ้ำได้)` : `เติม${[
                              answerCount ? `คำตอบ ${answerCount} ข้อ` : '',
                              monitorCount ? `จอ ${monitorCount} ตัว` : '',
                            ].filter(Boolean).join(' + ')}`}
                          </Button>
                        );
                      })()}
                    </Box>

                    <Box sx={{ p: '10px 14px' }}>
                      {!agentCheck.available ? (
                        <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>
                          เครื่องนี้ยังไม่มีข้อมูลจาก Agent — อาจยังไม่ได้ติดตั้ง หรือยังไม่ได้รายงานเข้ามา
                        </Typography>
                      ) : (
                        <>
                          {agentCheck.findings?.length === 0 && (
                            <Typography sx={{ fontSize: 11.5, color: 'success.main', fontWeight: 600 }}>
                              ✅ ไม่พบเรื่องผิดปกติจากข้อมูล Agent
                            </Typography>
                          )}
                          {(agentCheck.findings || []).map((f: any) => {
                            const tone = f.severity === 'critical' ? 'error' : f.severity === 'warn' ? 'warning' : 'info';
                            return (
                              <Box key={f.key} sx={{ display: 'flex', gap: 1, alignItems: 'baseline', py: 0.5 }}>
                                <Box sx={{
                                  flex: 'none', mt: 0.5, width: 7, height: 7, borderRadius: '50%',
                                  bgcolor: (t: any) => t.palette[tone].main,
                                }} />
                                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: `${tone}.main` }}>
                                  {f.label}
                                </Typography>
                                <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{f.detail}</Typography>
                              </Box>
                            );
                          })}

                          {/* จอที่ต่ออยู่: เติมลงฟอร์มได้ ต่างจากเครื่องพิมพ์ เพราะจอ
                              ผูกกับเครื่องตัวเดียวและมี Serial ของตัวเองให้จับคู่ทะเบียน */}
                          {agentCheck.monitors?.length > 0 && (
                            <Box sx={{ mt: 0.75, pt: 0.75, borderTop: '1px dashed', borderColor: 'divider' }}>
                              {/* จำนวนจอ ณ ขณะตรวจ คือตัวเลขแรกที่ผู้ใช้ต้องอ่าน — เลยทำให้
                                  เด่นกว่ารายละเอียดแต่ละจอด้านล่าง ไม่ใช่แค่ label เล็ก ๆ เท่ากัน */}
                              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                                🖥️ จอที่ต่ออยู่ขณะนี้ {agentCheck.monitors.length} ตัว
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                {agentCheck.monitors.map((m: any, idx: number) => (
                                  <Chip
                                    key={idx}
                                    size="small"
                                    icon={<MonitorIcon />}
                                    variant={m._assetId ? 'filled' : 'outlined'}
                                    color={m._assetId ? 'default' : 'warning'}
                                    label={`${[m.brand, m.model].filter(Boolean).join(' ') || 'ไม่ทราบรุ่น'}${
                                      m.serial ? ` (S/N: ${m.serial})` : ' (ไม่มี S/N)'
                                    }${m.connectedPort ? ` · พอร์ต ${m.connectedPort}` : ''}${
                                      m._assetId ? ` · ${m.assetCode || 'อยู่ในทะเบียน'}` : ' · ยังไม่มีในทะเบียน'}`}
                                    sx={{ fontSize: 10 }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}

                          {/* เครื่องพิมพ์: โชว์เฉย ๆ ไม่เติมลงฟอร์ม เพราะตัวที่ใช้ร่วมกัน
                              ทั้งออฟฟิศจะกลายเป็นทรัพย์สินซ้ำบนทุกเครื่องที่ map ไว้ */}
                          {agentCheck.printers?.length > 0 && (
                            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.75, pt: 0.75, borderTop: '1px dashed', borderColor: 'divider' }}>
                              🖨️ เครื่องพิมพ์ที่ต่อ USB: {agentCheck.printers.map((x: any) => `${x.name} (${x.port})`).join(' · ')}
                            </Typography>
                          )}
                        </>
                      )}
                    </Box>
                  </Box>
                </Box>
              )}
              </Box>{/* ── จบคอลัมน์ขวา ── */}

              {/* ── คอลัมน์ซ้าย: เช็คลิสต์ ── */}
              <Box sx={{
                gridColumn: { lg: 1 }, gridRow: { lg: 1 },
                p: '16px 24px',
                overflowY: { xs: 'visible', lg: 'auto' },
                bgcolor: 'action.hover',
              }}>
                {glpiSpec && (
                  <Alert severity="success" icon={<SensorsIcon fontSize="inherit" />} sx={{ mb: 2 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 12, mb: 0.75 }}>ข้อมูลฮาร์ดแวร์สแกนอัตโนมัติจาก GLPI:</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px 16px', fontSize: 12 }}>
                      <div><strong>CPU:</strong> {glpiSpec.cpu || '—'}</div>
                      <div><strong>RAM:</strong> {glpiSpec.ram || '—'}</div>
                      <div><strong>OS:</strong> {glpiSpec.os || '—'}</div>
                      <div><strong>Office:</strong> {glpiSpec.msOffice || '—'}</div>
                      <div><strong>Antivirus:</strong> {glpiSpec.antivirus || '—'}</div>
                      <div><strong>License:</strong> {glpiSpec.license || '—'}</div>
                      {glpiSpec.monitors && glpiSpec.monitors.length > 0 && (
                        <Box sx={{ gridColumn: '1 / -1', mt: 0.5 }}>
                          <Typography sx={{ fontWeight: 600, mb: 0.75, fontSize: 12 }}>จอภาพที่เชื่อมต่อ:</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                            {glpiSpec.monitors.map((m: any, idx: number) => (
                              <Chip key={idx} size="small" icon={<MonitorIcon />} label={`${m.brand} ${m.model} (S/N: ${m.serial})`} />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                    {!isReadOnly && (
                      <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                          size="small"
                          variant={glpiSpecApplied ? 'outlined' : 'contained'}
                          color="success"
                          startIcon={glpiSpecApplied ? <CheckCircleIcon fontSize="small" /> : undefined}
                          onClick={applyGLPISpecToAnswers}
                        >
                          {glpiSpecApplied ? 'อัปเดตแบบฟอร์มแล้ว (กดซ้ำได้)' : 'ยืนยันอัพเดทข้อมูลสเปคคอม'}
                        </Button>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                          ตรวจสอบข้อมูลด้านบนก่อน แล้วจึงกดยืนยันเพื่อนำไปใส่ในช่อง Windows/Office/Antivirus ของแบบฟอร์ม
                        </Typography>
                      </Box>
                    )}
                  </Alert>
                )}

                <ChecklistGroups items={items} answers={answers} setAnswers={setAnswers} readOnly={isReadOnly} asset={pmModal.run.asset} />
              </Box>{/* ── จบคอลัมน์ซ้าย ── */}

              </Box>{/* ── จบสองคอลัมน์ ── */}

              {/* ไม่มีปุ่มลบ เพราะยังไม่มี API ลบรูป PM — ทับด้วยรูปใหม่ได้อย่างเดียว */}
              <ImageLightbox
                open={pmPhotoZoom}
                onClose={() => setPmPhotoZoom(false)}
                src={pmModal.run.photoUrl ? `/uploads/pm/${pmModal.run.photoUrl}` : null}
                title={`รูปถ่ายขณะทำ PM · ${pmModal.run.asset?.assetCode || pmModal.run.asset?.assetName || ''}`}
                onReplace={isReadOnly ? undefined : () => pmPhotoInputRef.current?.click()}
                replacing={uploadingPhoto}
              />

              {/* Footer Actions */}
              <Box sx={{ p: '12px 24px', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1.25, flexShrink: 0, bgcolor: 'background.paper' }}>
                <Button variant="outlined" onClick={() => setPMModal({ open: false, run: null, readOnly: false })}>ปิด</Button>
                {!isReadOnly && (
                  <>
                    <Button variant="outlined" startIcon={<SaveIcon />} onClick={() => handleSave('IN_PROGRESS')} disabled={saving}>
                      {saving ? '...' : 'บันทึกร่าง'}
                    </Button>
                    <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleSave('COMPLETED')} disabled={saving}>
                      {saving ? 'กำลังบันทึก...' : 'บันทึกผล PM'}
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          );
        })()}
      </Modal>

      {/* ── Bulk PM Checklist Modal ── */}
      <Modal
        open={bulkPMModal.open}
        onClose={() => setBulkPMModal({ open: false, templateId: null })}
        fullScreen
        title={`บันทึก PM แบบกลุ่ม (${selectedRunIds.length} รายการ)`}
      >
        {selectedRunIds.length > 0 && (() => {
          const firstRun = runs.find(r => r.id === selectedRunIds[0]);
          if (!firstRun) return null;

          const items = sortChecklistItems(getChecklistItems(firstRun));

          const setAll = (val: string) => {
            const newAns = { ...answers };
            items.filter((i: any) => i.type?.toLowerCase() === 'boolean').forEach((i: any) => newAns[i.key] = val);
            setAnswers(newAns);
          };

          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <Alert severity="warning" sx={{ borderRadius: 0 }}>
                ข้อความนี้จะถูกบันทึกไปยังรายการอุปกรณ์ที่เลือก {selectedRunIds.length} รายการ และสถานะจะเป็น 'เสร็จแล้ว (COMPLETED)' โดยอัตโนมัติ
              </Alert>

              {/* Quick Actions */}
              <Box sx={{ p: '14px 24px', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, gap: 1.5, bgcolor: 'action.hover' }}>
                <Button size="small" variant="outlined" startIcon={<CheckIcon />} onClick={() => setAll('yes')}>ทำทั้งหมด (Yes)</Button>
                <Button size="small" variant="outlined" startIcon={<RestartAltIcon />} onClick={() => setAnswers({ staff_name: user?.displayName || user?.adUsername || '' })}>ล้างข้อมูล</Button>
              </Box>

              {/* ── สองคอลัมน์ ────────────────────────────────────────────
                  ซ้าย = เช็คลิสต์ชุดเดียวที่จะถูกเขียนลงทุกเครื่อง
                  ขวา = รายชื่อเครื่องที่จะโดน ของเดิมบอกแค่จำนวน ("15 รายการ")
                  ทั้งที่ปุ่มนี้เขียนสถานะ COMPLETED ทับทุกเครื่องรวดเดียว —
                  เลือกพลาดมาหนึ่งเครื่องแล้วไม่มีทางเห็นก่อนกดบันทึก */}
              <Box sx={{
                flex: 1, minHeight: 0,
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 340px' },
                overflowY: { xs: 'auto', lg: 'hidden' },
              }}>
                <Box sx={{
                  gridColumn: { lg: 1 }, gridRow: { lg: 1 },
                  p: 3, overflowY: { xs: 'visible', lg: 'auto' }, bgcolor: 'action.hover',
                }}>
                  <ChecklistGroups items={items} answers={answers} setAnswers={setAnswers} readOnly={false} asset={firstRun.asset} />
                </Box>

                <Box sx={{
                  gridColumn: { lg: 2 }, gridRow: { lg: 1 },
                  order: { xs: -1, lg: 0 },
                  overflowY: { xs: 'visible', lg: 'auto' },
                  borderLeft: { lg: '1px solid' }, borderColor: { lg: 'divider' },
                }}>
                  <Box sx={{ p: '12px 16px', borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                      อุปกรณ์ที่จะบันทึก ({selectedRunIds.length})
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.25 }}>
                      กดกากบาทเพื่อเอาออกจากชุดนี้
                    </Typography>
                  </Box>
                  {selectedRunIds.map(id => {
                    const r = runs.find(x => x.id === id);
                    if (!r) return null;
                    return (
                      <Box key={id} sx={{
                        display: 'flex', alignItems: 'flex-start', gap: 1,
                        px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider',
                      }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: 'primary.main' }}>
                            {r.asset?.assetCode || 'ไม่มีรหัส'}
                          </Typography>
                          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.45 }}>
                            {r.asset?.assetName || '—'}<br />
                            {r.asset?.departmentId || '—'} · {r.asset?.ownerName || '—'}
                          </Typography>
                        </Box>
                        {/* เหลือเครื่องเดียวแล้วเอาออกไม่ได้ บันทึกกลุ่มที่ว่างเปล่าไม่มีความหมาย */}
                        <Tooltip title={selectedRunIds.length <= 1 ? 'ต้องเหลืออย่างน้อย 1 รายการ' : 'เอาออกจากชุดนี้'}>
                          <span>
                            <IconButton aria-label="ปิด"
                              size="small"
                              disabled={selectedRunIds.length <= 1}
                              onClick={() => setSelectedRunIds(prev => prev.filter(x => x !== id))}
                            >
                              <CloseIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              {/* Footer Actions */}
              <Box sx={{ p: '16px 24px', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1.25, flexShrink: 0 }}>
                <Button variant="outlined" onClick={() => setBulkPMModal({ open: false, templateId: null })}>ปิด</Button>
                <Button variant="contained" startIcon={<CheckCircleIcon />} onClick={handleBulkSave} disabled={saving}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกผล PM ทั้งหมด'}
                </Button>
              </Box>
            </Box>
          );
        })()}
      </Modal>

      {/* ── QR Scanner Modal ── */}
      <Modal open={qrModalOpen} onClose={() => setQrModalOpen(false)} title="สแกน QR Code เพื่อค้นหาทรัพย์สิน" maxWidth={480}>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Box id="qr-reader" sx={{ width: '100%', overflow: 'hidden', borderRadius: 1.5, bgcolor: '#000', minHeight: 300 }} />
          <Typography sx={{ mt: 2, fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
            วาง QR Code ให้อยู่ในตำแหน่งกรอบของกล้องเพื่อทำการสแกนโดยอัตโนมัติ
          </Typography>
        </Box>
      </Modal>

      {/* ── Note Modal (e.g. owner busy, reschedule reason for overdue PM) ── */}
      <Modal open={noteModal.open} onClose={() => setNoteModal({ open: false, run: null, value: '' })} title="โน้ตงาน PM" maxWidth={480}>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
            {noteModal.run?.asset?.assetCode || 'ไม่มีรหัส'} / {noteModal.run?.asset?.assetName || 'ไม่มีชื่ออุปกรณ์'}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1.5 }}>
            บันทึกเหตุผล/แผนนัดหมาย เช่น "เจ้าของเครื่องไม่ว่าง จะนัดทำ PM วันที่ 10 ส.ค."
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            placeholder="ระบุรายละเอียด..."
            value={noteModal.value}
            onChange={e => setNoteModal(p => ({ ...p, value: e.target.value }))}
          />
        </Box>
        <Box sx={{ p: '16px 24px', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}>
          <Button variant="outlined" onClick={() => setNoteModal({ open: false, run: null, value: '' })}>ยกเลิก</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveNote} disabled={savingNote}>
            {savingNote ? 'กำลังบันทึก...' : 'บันทึกโน้ต'}
          </Button>
        </Box>
      </Modal>

      <Modal open={schedModal.open} onClose={() => setSchedModal({ open: false, value: '' })} title="ตั้งวันนัดลงหน้างาน" maxWidth={440}>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
            {selectedRunIds.length} รายการที่เลือก
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 2 }}>
            วันที่ทีมจะเข้าไปตรวจเครื่องกลุ่มนี้ ต่างจาก "สิ้นสุด" ของแผน ซึ่งเป็นกำหนดของทั้งแผนรวมกัน
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="date"
            label="วันนัด"
            InputLabelProps={{ shrink: true }}
            value={schedModal.value}
            onChange={e => setSchedModal(p => ({ ...p, value: e.target.value }))}
          />
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1.5 }}>
            งานที่ทำเสร็จแล้วจะถูกข้ามโดยอัตโนมัติ
          </Typography>
        </Box>
        <Box sx={{ p: '16px 24px', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', gap: 1.25 }}>
          <Button color="inherit" onClick={() => handleSaveSchedule(true)} disabled={savingSched}>
            ล้างวันนัด
          </Button>
          <Box sx={{ display: 'flex', gap: 1.25 }}>
            <Button variant="outlined" onClick={() => setSchedModal({ open: false, value: '' })}>ยกเลิก</Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={() => handleSaveSchedule()} disabled={savingSched || !schedModal.value}>
              {savingSched ? 'กำลังบันทึก...' : 'บันทึกวันนัด'}
            </Button>
          </Box>
        </Box>
      </Modal>

      <Snackbar
        open={!!toast}
        autoHideDuration={2800}
        onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.startsWith('❌') ? 'error' : 'success'} variant="filled" sx={{ whiteSpace: 'nowrap' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
