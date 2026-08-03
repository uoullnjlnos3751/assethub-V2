import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Typography,
  alpha,
  useTheme,
  Box,
  Grid,
  Button,
  Tabs,
  Tab,
  LinearProgress,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import SyncIcon from '@mui/icons-material/Sync';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HistoryIcon from '@mui/icons-material/History';
import BuildIcon from '@mui/icons-material/Build';
import HandymanIcon from '@mui/icons-material/Handyman';
import LinkIcon from '@mui/icons-material/Link';
import ComputerIcon from '@mui/icons-material/Computer';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import RouterIcon from '@mui/icons-material/Router';
import DnsIcon from '@mui/icons-material/Dns';
import VideocamIcon from '@mui/icons-material/Videocam';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import QRCode from 'react-qr-code';
import { assetAPI, pmAPI } from '../../services/api';
import { getStatusLabel } from '../../config/statusConfig';
import StatusChip from '../../components/StatusChip';
import MaintenanceTab from './MaintenanceTab';
import LinkedAssetsTab from './tabs/LinkedAssetsTab';

/* ─── History helpers ─────────────────────────────────────────── */
const HISTORY_LABEL: Record<string, string> = {
  CREATE: 'เพิ่มทรัพย์สินเข้าระบบ', STATUS_CHANGE: 'เปลี่ยนสถานะ',
  OWNER_CHANGE: 'เปลี่ยนผู้ถือครอง', LOCATION_CHANGE: 'เปลี่ยนสถานที่',
  CHECKOUT: 'ส่งมอบอุปกรณ์ Check-out', RETURN: 'คืนอุปกรณ์',
};

const HISTORY_ICON: Record<string, React.ElementType> = {
  CREATE: AddCircleIcon, STATUS_CHANGE: EditNoteIcon, OWNER_CHANGE: PersonIcon,
  LOCATION_CHANGE: LocationOnIcon, CHECKOUT: ShoppingCartIcon, RETURN: AssignmentReturnIcon,
};

/* ─── Type icon (matches the icon set used on the asset registry list) ── */
function getTypeIconComponent(type: string): React.ElementType {
  const t = type?.toLowerCase() || '';
  if (t.includes('server')) return DnsIcon;
  if (t.includes('monitor')) return DesktopWindowsIcon;
  if (t.includes('printer')) return PrintIcon;
  if (['phone', 'tablet', 'smartphone', 'ipad'].some(k => t.includes(k))) return PhoneAndroidIcon;
  if (['switch', 'router', 'firewall', 'access point', 'ap', 'network'].some(k => t.includes(k))) return RouterIcon;
  if (t.includes('projector')) return VideocamIcon;
  if (t.includes('webcam')) return CameraAltIcon;
  if (t.includes('speaker')) return VolumeUpIcon;
  if (['notebook', 'laptop', 'macbook', 'desktop', 'pc', 'workstation', 'all-in-one'].some(k => t.includes(k))) return ComputerIcon;
  return HandymanIcon;
}

/* ─── Spec item ───────────────────────────────────────────────── */
function SpecItem({ label, value, mono, colorClass }: {
  label: string; value?: string | number | null; mono?: boolean; colorClass?: string;
}) {
  if (value === null || value === undefined || value === '') return null;

  let valColor = 'text.primary';
  if (colorClass === 'warn') valColor = 'warning.main';
  if (colorClass === 'err') valColor = 'error.main';

  return (
    <Grid item xs={12} sm={6} md={4}>
      <Box sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
      }}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 500, mb: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{
          fontWeight: 600,
          fontFamily: mono ? 'monospace' : 'inherit',
          color: valColor,
        }}>
          {String(value)}
        </Typography>
      </Box>
    </Grid>
  );
}

function BoolBadge({ value, yes, no }: { value: boolean | null | undefined; yes?: string; no?: string }) {
  if (value === null || value === undefined) return null;
  return value
    ? <Chip label={yes || 'ใช่'} color="success" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }} />
    : <Chip label={no || 'ไม่ใช่'} color="error" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }} />;
}

/* ─── Warranty progress bar ───────────────────────────────────── */
function WarrantyBar({ purchaseDate, warrantyEndDate }: { purchaseDate?: string; warrantyEndDate?: string }) {
  if (!purchaseDate || !warrantyEndDate) return null;
  const start = new Date(purchaseDate).getTime();
  const end = new Date(warrantyEndDate).getTime();
  const now = Date.now();
  const total = end - start;
  const elapsed = now - start;
  const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
  const daysLeft = Math.max(0, Math.round((end - now) / 86400000));

  let color: 'success' | 'warning' | 'error' | 'primary' = 'primary';
  if (pct >= 90) color = 'error';
  else if (pct >= 70) color = 'warning';

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: '12px 14px', '&:last-child': { pb: '12px' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            ประกัน: {new Date(purchaseDate).toLocaleDateString('th-TH')} → {new Date(warrantyEndDate).toLocaleDateString('th-TH')}
          </Typography>
          <Typography variant="caption" fontWeight={700} color="primary.main">
            {daysLeft > 0 ? `เหลือ ${daysLeft.toLocaleString('th-TH')} วัน (${Math.round(100 - pct)}%)` : 'หมดประกันแล้ว'}
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={pct} color={color} sx={{ height: 6, borderRadius: 4 }} />
      </CardContent>
    </Card>
  );
}

/* ─── ITAM lifecycle stepper — stages from docs/IMPROVEMENT_PLAN.md ──── */
const LIFECYCLE_STAGES = [
  { key: 'procure', label: 'จัดหา' },
  { key: 'register', label: 'ลงทะเบียน' },
  { key: 'assign', label: 'มอบหมายใช้งาน' },
  { key: 'maintain', label: 'บำรุงรักษา' },
  { key: 'dispose', label: 'จำหน่ายออก' },
];

function getLifecycleStageIndex(asset: { status?: string; ownerName?: string }): number {
  const disposalStatuses = ['Retired', 'Lost', 'Damaged'];
  if (asset.status && disposalStatuses.includes(asset.status)) return 4;
  if (asset.status === 'Maintenance') return 3;
  if (asset.status === 'InUse' || asset.ownerName) return 2;
  return 1; // Available — registered but not yet assigned
}

function LifecycleStepper({ asset }: { asset: { status?: string; ownerName?: string } }) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: '14px 20px !important' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '10.5px' }}>
          วงจรชีวิตทรัพย์สิน (ITAM Lifecycle)
        </Typography>
        <Stepper activeStep={getLifecycleStageIndex(asset)} alternativeLabel>
          {LIFECYCLE_STAGES.map((s) => (
            <Step key={s.key}>
              <StepLabel>{s.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </CardContent>
    </Card>
  );
}

/* ─── Section header (single consistent accent bar, theme-driven) ──── */
function SectionHeader({ title }: { title: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 3, height: 14, borderRadius: '2px', bgcolor: 'primary.main' }} />
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {title}
      </Typography>
    </Box>
  );
}

/* ─── Spec sections by type ───────────────────────────────────── */
function SpecTab({ asset, glpiSpec, loadingGLPI, syncingGLPI, onSync }: {
  asset: any;
  glpiSpec?: any;
  loadingGLPI?: boolean;
  syncingGLPI?: boolean;
  onSync?: (field?: string, label?: string) => void;
}) {
  const t = (asset.type || '').toLowerCase();
  const cat = (asset.category?.name || '').toLowerCase();
  const detail = asset.detail || {};

  const isComputer = ['notebook', 'laptop', 'macbook', 'pc desktop', 'desktop', 'workstation', 'all-in-one', 'mini pc', 'thin client', 'computer'].some(k => t.includes(k)) || cat === 'คอมพิวเตอร์' || t === 'pc';
  const isMonitor = t.includes('monitor') || cat === 'จอภาพ';
  const isPhone = ['smartphone', 'tablet', 'ipad', 'mobile'].some(k => t.includes(k)) || cat === 'อุปกรณ์สื่อสาร';
  const isNetwork = ['switch', 'router', 'access point', 'firewall', 'modem'].some(k => t.includes(k)) || cat === 'อุปกรณ์เครือข่าย';
  const isPrinter = t.includes('printer') || cat === 'เครื่องพิมพ์';

  const renderComparisonRow = (fieldLabel: string, assetValue: string, glpiValue: string, fieldKey?: string) => {
    const isMatch = (assetValue || '').trim().toLowerCase() === (glpiValue || '').trim().toLowerCase();
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', width: '25%', fontSize: '0.8rem' }}>{fieldLabel}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', width: '35%', wordBreak: 'break-all', fontSize: '0.8rem' }}>{assetValue || '—'}</Typography>
        <Box sx={{ width: '40%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          {isMatch ? (
            <Chip label="ตรงกัน" color="success" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.7rem', fontWeight: 600 }} />
          ) : (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Chip label="ไม่ตรงกัน" color="warning" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.7rem', fontWeight: 600, width: 'fit-content' }} />
                <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600, fontSize: '0.7rem' }}>ค่าจริง: {glpiValue || '—'}</Typography>
              </Box>
              {fieldKey && onSync && (
                <IconButton
                  size="small"
                  onClick={() => onSync(fieldKey, fieldLabel)}
                  disabled={syncingGLPI}
                  sx={{ color: 'primary.main' }}
                  title={`ปรับปรุงเฉพาะ ${fieldLabel}`}
                >
                  <SyncIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {isComputer && (glpiSpec || loadingGLPI) && (
        <Card sx={{ overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '12px 18px', borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) }}>
            <Typography variant="subtitle2" fontWeight={700} color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.85rem' }}>
              ตรวจสอบสเปคจริงจาก GLPI
            </Typography>
            {glpiSpec && onSync && (
              <Button
                variant="contained"
                onClick={() => onSync()}
                disabled={syncingGLPI}
                size="small"
                startIcon={syncingGLPI ? <CircularProgress size={10} color="inherit" /> : <SyncIcon sx={{ fontSize: 14 }} />}
                sx={{ borderRadius: '6px', textTransform: 'none', fontWeight: 600, fontSize: '0.7rem', py: 0.5, px: 1.5 }}
              >
                {syncingGLPI ? 'กำลังปรับปรุง...' : 'ปรับปรุงตาม GLPI'}
              </Button>
            )}
          </Box>
          <CardContent sx={{ p: '12px 18px !important' }}>
            {loadingGLPI ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, justifyContent: 'center' }}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">กำลังดึงข้อมูลสเปคฮาร์ดแวร์จริงกับ GLPI...</Typography>
              </Box>
            ) : (
              <Box>
                {renderComparisonRow('ชื่อคอมพิวเตอร์', asset.assetName, glpiSpec.name, 'name')}
                {renderComparisonRow('ผู้ใช้งานหลัก (End User)', asset.ownerName, glpiSpec.user, 'user')}
                {renderComparisonRow('CPU', asset.cpu, glpiSpec.cpu, 'cpu')}
                {renderComparisonRow('RAM', asset.ram, glpiSpec.ram, 'ram')}
                {renderComparisonRow('OS System', asset.osVersion, glpiSpec.os, 'os')}
                {renderComparisonRow('Windows License', asset.windowsLicense, glpiSpec.license, 'license')}
                {renderComparisonRow('MS Office', asset.officeLicense, glpiSpec.msOffice, 'msOffice')}
                {renderComparisonRow('Antivirus', asset.antivirusStatus, glpiSpec.antivirus, 'antivirus')}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <Card sx={{ p: 1.5 }}>
        {/* General */}
        <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, px: 0, '& .MuiAccordionSummary-content': { m: 0 } }}>
            <SectionHeader title="ข้อมูลพื้นฐานทรัพย์สิน" />
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
            <Grid container spacing={1}>
              <SpecItem label="เลขครุภัณฑ์" value={asset.assetCode} mono />
              <SpecItem label="ชื่อทรัพย์สิน" value={asset.assetName} />
              <SpecItem label="ประเภท" value={asset.type} />
              <SpecItem label="ยี่ห้อ" value={asset.brand} />
              <SpecItem label="รุ่น" value={asset.model} />
              <SpecItem label="Serial No." value={asset.serialNo} mono />
              <SpecItem label="Company" value={asset.company} />
              <SpecItem label="รหัสทรัพย์สินเดิม" value={asset.oldAssetCode} mono />
              <SpecItem label="Domain Name" value={asset.domainName} />
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Computer Hardware */}
        {isComputer && !isMonitor && (
          <>
            <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, px: 0, '& .MuiAccordionSummary-content': { m: 0 } }}>
                <SectionHeader title="Hardware" />
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
                <Grid container spacing={1}>
                  <SpecItem label="CPU" value={asset.cpu} />
                  <SpecItem label="Generation" value={asset.cpuGeneration} />
                  <SpecItem label="RAM" value={asset.ram} />
                  <SpecItem label="RAM Slot 1" value={asset.ramSlot1} />
                  <SpecItem label="RAM Slot 2" value={asset.ramSlot2} />
                  <SpecItem label="Storage 1" value={asset.storage1} />
                  <SpecItem label="Storage 2" value={asset.storage2} />
                  <SpecItem label="GPU" value={asset.gpu} />
                </Grid>
              </AccordionDetails>
            </Accordion>
            <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, px: 0, '& .MuiAccordionSummary-content': { m: 0 } }}>
                <SectionHeader title="ระบบปฏิบัติการ" />
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
                <Grid container spacing={1}>
                  <SpecItem label="OS Type" value={asset.osType} />
                  <SpecItem label="OS Version" value={asset.osVersion} mono />
                  <SpecItem label="S/N Computer" value={asset.snComputer} mono />
                  <SpecItem label="Join Domain" value={asset.domainName} />
                  <SpecItem label="Windows License" value={asset.windowsLicense} />
                  <SpecItem label="MS Office" value={asset.officeLicense} />
                  <SpecItem label="Antivirus" value={asset.antivirusStatus} />
                </Grid>
              </AccordionDetails>
            </Accordion>
          </>
        )}

        {/* Monitor */}
        {isMonitor && (
          <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, px: 0, '& .MuiAccordionSummary-content': { m: 0 } }}>
              <SectionHeader title="ข้อมูลจอภาพ" />
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
              <Grid container spacing={1}>
                <SpecItem label="ขนาดจอ (นิ้ว)" value={detail.screenSize} />
                <SpecItem label="ความละเอียด" value={detail.resolution} />
                <SpecItem label="Panel Type" value={detail.panelType} />
                <SpecItem label="Refresh Rate" value={detail.refreshRate} />
                <SpecItem label="พอร์ตเชื่อมต่อ" value={detail.ports} />
                {detail.hasSpeaker !== undefined && detail.hasSpeaker !== null && (
                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04), border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.08)}` }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 500, mb: 0.5 }}>ลำโพงในตัว</Typography>
                      <BoolBadge value={detail.hasSpeaker} yes="มี" no="ไม่มี" />
                    </Box>
                  </Grid>
                )}
                {detail.curved !== undefined && detail.curved !== null && (
                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04), border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.08)}` }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 500, mb: 0.5 }}>Curved</Typography>
                      <BoolBadge value={detail.curved} yes="จอโค้ง" no="จอแบน" />
                    </Box>
                  </Grid>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Phone/Tablet */}
        {isPhone && (
          <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, px: 0, '& .MuiAccordionSummary-content': { m: 0 } }}>
              <SectionHeader title="ข้อมูลอุปกรณ์สื่อสาร" />
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
              <Grid container spacing={1}>
                <SpecItem label="IMEI 1" value={detail.imei1} mono />
                <SpecItem label="IMEI 2" value={detail.imei2} mono />
                <SpecItem label="เบอร์โทรศัพท์" value={detail.phoneNumber} />
                <SpecItem label="OS" value={detail.osType} />
                <SpecItem label="OS Version" value={detail.osVersion} />
                <SpecItem label="Storage" value={detail.storageCapacity} />
                <SpecItem label="RAM" value={detail.ram} />
                <SpecItem label="สี" value={detail.color} />
                <SpecItem label="SIM Provider" value={detail.simProvider} />
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Network */}
        {isNetwork && (
          <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, px: 0, '& .MuiAccordionSummary-content': { m: 0 } }}>
              <SectionHeader title="ข้อมูลอุปกรณ์เครือข่าย" />
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
              <Grid container spacing={1}>
                <SpecItem label="IP Address" value={detail.ipAddress} mono />
                <SpecItem label="MAC Address" value={detail.macAddress} mono />
                <SpecItem label="จำนวน Port" value={detail.portCount} />
                <SpecItem label="Port Speed" value={detail.portSpeed} />
                <SpecItem label="Firmware" value={detail.firmwareVersion} />
                <SpecItem label="WiFi Standard" value={detail.wifiStandard} />
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Printer */}
        {isPrinter && (
          <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, px: 0, '& .MuiAccordionSummary-content': { m: 0 } }}>
              <SectionHeader title="ข้อมูลเครื่องพิมพ์" />
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
              <Grid container spacing={1}>
                <SpecItem label="ประเภทเครื่องพิมพ์" value={detail.printerType} />
                <SpecItem label="ขนาดกระดาษ" value={detail.paperSizes} />
                <SpecItem label="รุ่นหมึก" value={detail.cartridgeModel} />
                <SpecItem label="IP Address" value={detail.ipAddress} mono />
                <SpecItem label="จำนวนหน้าที่พิมพ์" value={detail.pageCount} />
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Purchase / Warranty */}
        <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, px: 0, '& .MuiAccordionSummary-content': { m: 0 } }}>
            <SectionHeader title="จัดซื้อ / ประกัน" />
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
            <Grid container spacing={1}>
              <SpecItem label="วันที่ซื้อ" value={asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('th-TH') : null} />
              <SpecItem label="วันหมดประกัน" value={asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString('th-TH') : null} colorClass="warn" />
              <SpecItem label="ราคาซื้อ" value={asset.purchasePrice != null ? `฿${Number(asset.purchasePrice).toLocaleString('th-TH')}` : null} />
              <SpecItem label="PO Number" value={asset.poNumber} mono />
              <SpecItem label="PR Number" value={asset.prNumber} mono />
              <SpecItem label="PO Date" value={asset.poDate ? new Date(asset.poDate).toLocaleDateString('th-TH') : null} />
              <SpecItem label="Vendor" value={asset.vendor} />
              <SpecItem label="งบประมาณ" value={asset.budget} />
              <SpecItem label="อายุอุปกรณ์" value={asset.age != null ? `${asset.age} ปี` : null} />
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Owner */}
        <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, px: 0, '& .MuiAccordionSummary-content': { m: 0 } }}>
            <SectionHeader title="ผู้ถือครอง" />
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
            <Grid container spacing={1}>
              <SpecItem label="ชื่อผู้ใช้" value={asset.ownerName} />
              <SpecItem label="แผนก" value={asset.departmentId} />
              <SpecItem label="Location" value={asset.location} />
              <SpecItem label="ชั้น" value={asset.floor} />
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Metadata */}
        <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, px: 0, '& .MuiAccordionSummary-content': { m: 0 } }}>
            <SectionHeader title="ข้อมูลระบบ" />
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
            <Grid container spacing={1}>
              <SpecItem label="หมวดหมู่" value={asset.category?.name} />
              <SpecItem label="สร้างเมื่อ" value={asset.createdAt ? new Date(asset.createdAt).toLocaleString('th-TH') : null} />
              <SpecItem label="แก้ไขล่าสุด" value={asset.updatedAt ? new Date(asset.updatedAt).toLocaleString('th-TH') : null} />
              <SpecItem label="ID" value={asset.id} mono />
              <SpecItem label="สถานะ" value={getStatusLabel(asset.status)} />
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Remark */}
        {asset.remark && (
          <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, px: 0, '& .MuiAccordionSummary-content': { m: 0 } }}>
              <SectionHeader title="หมายเหตุ" />
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
              <Box sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                fontSize: '13px',
                color: 'text.primary',
                lineHeight: 1.6
              }}>
                {asset.remark}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Asset image */}
        {asset.image && (
          <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, px: 0, '& .MuiAccordionSummary-content': { m: 0 } }}>
              <SectionHeader title="รูปภาพทะเบียนทรัพย์สิน" />
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box component="img" src={asset.image} alt="Asset" sx={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid', borderColor: 'divider' }} />
              </Box>
            </AccordionDetails>
          </Accordion>
        )}
      </Card>
    </Box>
  );
}

/* ─── History tab (MUI Lab Timeline) ──────────────────────────── */
function HistoryTab({ asset }: { asset: any }) {
  const history = asset.assetHistory || [];
  if (history.length === 0) return (
    <Card sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">ไม่มีประวัติการเปลี่ยนแปลง</Typography>
    </Card>
  );

  return (
    <Card sx={{ p: 2.5 }}>
      <Timeline sx={{ p: 0, m: 0 }}>
        {history.map((h: any, i: number) => {
          const ActionIcon = HISTORY_ICON[h.actionType] || HistoryIcon;
          const label = HISTORY_LABEL[h.actionType] || h.actionType;
          const detail = [h.fromStatus, h.toStatus, h.fromOwner, h.toOwner, h.fromLoc, h.toLoc, h.note].filter(Boolean).join(' → ');

          let dotColor: any = 'grey';
          if (h.actionType === 'CREATE') dotColor = 'primary';
          else if (h.actionType === 'STATUS_CHANGE') dotColor = 'info';
          else if (h.actionType === 'CHECKOUT') dotColor = 'warning';
          else if (h.actionType === 'RETURN') dotColor = 'success';

          return (
            <TimelineItem key={h.id ?? i}>
              <TimelineOppositeContent sx={{ flex: 0.2, pl: 0, minWidth: '100px', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="caption" color="text.secondary">
                  {new Date(h.createdAt).toLocaleDateString('th-TH')}
                </Typography>
                <Typography variant="caption" display="block" color="text.disabled">
                  {new Date(h.createdAt).toLocaleTimeString('th-TH')}
                </Typography>
              </TimelineOppositeContent>
              <TimelineSeparator>
                <TimelineDot color={dotColor} variant="outlined" sx={{ p: '6px' }}>
                  <ActionIcon sx={{ fontSize: 14 }} />
                </TimelineDot>
                {i < history.length - 1 && <TimelineConnector sx={{ bgcolor: alpha('#9ca3af', 0.2) }} />}
              </TimelineSeparator>
              <TimelineContent sx={{ pb: 3, pr: 0 }}>
                <Typography variant="body2" fontWeight={700} color="text.primary">
                  {label}
                </Typography>
                {detail && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25, lineHeight: 1.5, bgcolor: alpha('#9ca3af', 0.05), p: 1, borderRadius: 1 }}>
                    {detail}
                  </Typography>
                )}
                <Box sx={{ display: { xs: 'flex', sm: 'none' }, gap: 1, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.disabled">
                    {new Date(h.createdAt).toLocaleString('th-TH')}
                  </Typography>
                </Box>
                {h.actor && (
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <Avatar sx={{ width: 18, height: 18, fontSize: '8px', fontWeight: 700, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                      {String(h.actor.displayName || h.actor.email || 'U').substring(0, 2).toUpperCase()}
                    </Avatar>
                    <Typography variant="caption" color="text.secondary">
                      โดย {h.actor.displayName || h.actor.email}
                    </Typography>
                  </Box>
                )}
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
    </Card>
  );
}

/* ─── PM tab ──────────────────────────────────────────────────── */
function PMTab({ asset, onReloadAsset }: { asset: any; onReloadAsset?: () => void }) {
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

/* ─── Documents tab ───────────────────────────────────────────── */
function DocumentsTab({ asset, onReload }: { asset: any; onReload: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const docs = asset.documents || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Check size limit (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('ขนาดไฟล์ต้องไม่เกิน 10MB');
      return;
    }

    setUploading(true);
    setErrorMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      await assetAPI.uploadDocument(asset.id, fd);
      onReload();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'อัพโหลดไม่สำเร็จ');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId: number) => {
    if (!window.confirm('ยืนยันการลบเอกสารนี้?')) return;
    try {
      await assetAPI.deleteDocument(asset.id, docId);
      onReload();
    } catch (err: any) {
      alert(err.response?.data?.message || 'ลบไม่สำเร็จ');
    }
  };

  return (
    <Card sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} color="text.primary">
          เอกสารแนบ
        </Typography>
        <Button
          component="label"
          variant="contained"
          startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
          disabled={uploading}
          sx={{ borderRadius: '8px', textTransform: 'none' }}
        >
          {uploading ? 'กำลังอัพโหลด...' : 'อัพโหลดเอกสาร'}
          <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx" onChange={handleUpload} />
        </Button>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}

      {docs.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <InsertDriveFileIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
          <Typography variant="body2" color="text.secondary">ยังไม่มีเอกสารแนบ</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {docs.map((doc: any) => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <Card variant="outlined" sx={{ boxShadow: 'none' }}>
                <CardContent sx={{ p: '12px !important', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: 'primary.main', width: 36, height: 36 }}>
                    <InsertDriveFileIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap title={doc.fileName}>
                      {doc.fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {(doc.fileSize / 1024).toFixed(1)} KB • {new Date(doc.createdAt).toLocaleDateString('th-TH')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Tooltip title="ดาวน์โหลด">
                      <IconButton size="small" onClick={() => assetAPI.downloadDocument(asset.id, doc.id)}>
                        <DownloadIcon fontSize="small" color="primary" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="ลบ">
                      <IconButton size="small" onClick={() => handleDelete(doc.id)}>
                        <DeleteOutlineIcon fontSize="small" color="error" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Card>
  );
}

/* ─── Main Page ───────────────────────────────────────────────── */
export default function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('spec');
  const [showQR, setShowQR] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [similarAssets, setSimilarAssets] = useState<any[]>([]);

  const [glpiSpec, setGlpiSpec] = useState<any>(null);
  const [loadingGLPI, setLoadingGLPI] = useState(false);
  const [syncingGLPI, setSyncingGLPI] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    if (id) {
      setLoading(true);
      setGlpiSpec(null); // Clear previous spec when navigating
      assetAPI.get(parseInt(id))
        .then((res) => setAsset(res.data))
        .finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    if (!asset || !id || asset.id !== parseInt(id)) return;
    const t = (asset.type || '').toLowerCase();
    const cat = (asset.category?.name || '').toLowerCase();
    const isComputer = ['notebook', 'laptop', 'macbook', 'pc desktop', 'desktop', 'workstation', 'all-in-one', 'mini pc', 'thin client', 'computer'].some(k => t.includes(k)) || cat === 'คอมพิวเตอร์' || t === 'pc';

    if (isComputer && asset.serialNo) {
      setLoadingGLPI(true);
      assetAPI.getGLPISpec(parseInt(id))
        .then((res) => {
          setGlpiSpec(res.data);
        })
        .catch((err) => {
          console.warn('Failed to fetch GLPI spec:', err);
        })
        .finally(() => {
          setLoadingGLPI(false);
        });
    }
  }, [asset?.id, asset?.serialNo, id]);

  const handleGLPISync = async (field?: string, label?: string) => {
    if (!id || !asset) return;

    const confirmMsg = field
      ? `คุณต้องการอัปเดต "${label}" ของทรัพย์สินนี้ตามข้อมูลใน GLPI หรือไม่?`
      : 'คุณต้องการอัปเดตรายละเอียดฮาร์ดแวร์ทั้งหมดของทรัพย์สินนี้ตามข้อมูลใน GLPI หรือไม่? (ค่าเดิมในระบบจะถูกเขียนทับ)';

    if (!window.confirm(confirmMsg)) return;

    setSyncingGLPI(true);
    try {
      await assetAPI.syncGLPI(parseInt(id), field);
      setToast({
        open: true,
        message: field ? `อัปเดต "${label}" ตาม GLPI เรียบร้อยแล้ว` : 'อัปเดตรายละเอียดฮาร์ดแวร์ตาม GLPI เรียบร้อยแล้ว',
        severity: 'success'
      });
      // Reload asset and refetch spec
      const res = await assetAPI.get(parseInt(id));
      setAsset(res.data);
      const specRes = await assetAPI.getGLPISpec(parseInt(id));
      setGlpiSpec(specRes.data);
    } catch (err: any) {
      setToast({
        open: true,
        message: err.response?.data?.message || 'ไม่สามารถอัปเดตข้อมูลจาก GLPI ได้',
        severity: 'error'
      });
    } finally {
      setSyncingGLPI(false);
    }
  };

  // recent view tracking
  useEffect(() => {
    if (!id) return;
    try {
      const key = 'assethub.recentAssets';
      const recent: number[] = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = [parseInt(id), ...recent.filter(r => r !== parseInt(id))].slice(0, 10);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch { /* ignore */ }
  }, [id]);

  // favorite check
  useEffect(() => {
    try {
      const favs: number[] = JSON.parse(localStorage.getItem('assethub.favoriteAssets') || '[]');
      setIsFavorite(favs.includes(parseInt(id!)));
    } catch { setIsFavorite(false); }
  }, [id]);

  // load similar assets
  useEffect(() => {
    if (!asset?.categoryId) return;
    assetAPI.list({ categoryId: asset.categoryId, limit: 5 })
      .then((res) => setSimilarAssets((res.data.data || []).filter((a: any) => a.id !== asset.id)))
      .catch(() => {});
  }, [asset]);

  /* Warranty calculation */
  const warrantyDaysLeft = useMemo(() => {
    if (!asset?.warrantyEndDate) return null;
    return Math.max(0, Math.round((new Date(asset.warrantyEndDate).getTime() - Date.now()) / 86400000));
  }, [asset]);

  const totalBorrows = asset?.pmRuns?.length ?? 0;
  const completedPMs = asset?.pmRuns?.filter((r: any) => r.status === 'COMPLETED').length ?? 0;

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress size={32} />
    </Box>
  );
  if (!asset) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">ไม่พบทรัพย์สิน</Typography></Box>;

  const TypeIcon = getTypeIconComponent(asset.type);
  const historyCount = asset.assetHistory?.length ?? 0;

  const toggleFavorite = () => {
    try {
      const favs: number[] = JSON.parse(localStorage.getItem('assethub.favoriteAssets') || '[]');
      const idNum = parseInt(id!);
      if (isFavorite) {
        localStorage.setItem('assethub.favoriteAssets', JSON.stringify(favs.filter(f => f !== idNum)));
        setIsFavorite(false);
      } else {
        localStorage.setItem('assethub.favoriteAssets', JSON.stringify([idNum, ...favs]));
        setIsFavorite(true);
      }
    } catch { /* ignore */ }
  };

  return (
    <Box sx={{ pb: 5 }}>
      {/* Hero card */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: '20px 24px !important' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={9}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                <Avatar sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '14px',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  flexShrink: 0
                }}>
                  <TypeIcon sx={{ fontSize: 26 }} />
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
                    <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>
                      {asset.brand} {asset.model}
                    </Typography>
                    <StatusChip status={asset.status} />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                    <Chip label={asset.assetCode} size="small" variant="outlined" color="primary" sx={{ height: 20, fontFamily: 'monospace', fontWeight: 700 }} />
                    {asset.assetName && (
                      <Chip label={asset.assetName} size="small" sx={{ height: 20, bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: 'primary.dark', fontWeight: 600 }} />
                    )}
                    {asset.type && (
                      <Typography variant="caption" color="text.secondary">{asset.type}</Typography>
                    )}
                    {asset.location && (
                      <Typography variant="caption" color="text.secondary">
                        · {asset.location}{asset.floor ? ` ชั้น ${asset.floor}` : ''}
                      </Typography>
                    )}
                    {asset.departmentId && (
                      <Typography variant="caption" color="text.secondary">
                        · แผนก {asset.departmentId}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    {asset.age != null && (
                      <Chip label={`อายุ ${asset.age} ปี`} size="small" sx={{ height: 18, bgcolor: (t) => alpha(t.palette.warning.main, 0.12), color: 'warning.dark', fontWeight: 600, fontSize: '10px' }} />
                    )}
                    {asset.serialNo && (
                      <Typography variant="caption" color="text.disabled">S/N: {asset.serialNo}</Typography>
                    )}
                    {asset.ownerName && (
                      <Typography variant="caption" color="primary.main" sx={{ ml: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 14 }} /> {asset.ownerName}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={3} sx={{ textAlign: { xs: 'left', md: 'right' }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {asset.purchasePrice != null && (
                <Box>
                  <Typography variant="h5" fontWeight={800} color="primary.main">
                    ฿{Number(asset.purchasePrice).toLocaleString('th-TH')}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" display="block">ราคาซื้อ</Typography>
                </Box>
              )}
            </Grid>
          </Grid>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button variant="outlined" startIcon={<EditIcon sx={{ fontSize: 16 }} />} onClick={() => navigate(`/assets/${id}/edit`)} size="small" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
              แก้ไข
            </Button>
            <Button
              variant={isFavorite ? 'contained' : 'outlined'}
              startIcon={isFavorite ? <StarIcon sx={{ fontSize: 16 }} /> : <StarBorderIcon sx={{ fontSize: 16 }} />}
              onClick={toggleFavorite}
              size="small"
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
            >
              ดาวโปรด
            </Button>
            <Button variant="outlined" color="warning" startIcon={<QrCodeIcon sx={{ fontSize: 16 }} />} onClick={() => setShowQR(true)} size="small" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
              QR Code
            </Button>
            <Button variant="outlined" startIcon={<PrintIcon sx={{ fontSize: 16 }} />} onClick={() => navigate(`/assets/print-qr?ids=${id}`)} size="small" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
              พิมพ์สติ๊กเกอร์
            </Button>
            <Button variant="outlined" color="inherit" startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />} onClick={() => navigate('/assets')} size="small" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, ml: { sm: 'auto' } }}>
              กลับรายการ
            </Button>
          </Box>
        </CardContent>
      </Card>

      <LifecycleStepper asset={asset} />

      {/* Quick stats strip */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <CardContent sx={{ py: '12px !important' }}>
              <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ lineHeight: 1 }}>
                {historyCount}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', mt: 0.5, display: 'block' }}>
                ประวัติการเปลี่ยนแปลง
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <CardContent sx={{ py: '12px !important' }}>
              <Typography variant="h6" fontWeight={800} color="secondary.main" sx={{ lineHeight: 1 }}>
                {totalBorrows}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', mt: 0.5, display: 'block' }}>
                บันทึก PM
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <CardContent sx={{ py: '12px !important' }}>
              <Typography variant="h6" fontWeight={800} color="success.main" sx={{ lineHeight: 1 }}>
                {completedPMs}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', mt: 0.5, display: 'block' }}>
                PM เสร็จแล้ว
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <CardContent sx={{ py: '12px !important' }}>
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{
                  lineHeight: 1,
                  color: warrantyDaysLeft === 0 ? 'error.main' : warrantyDaysLeft != null && warrantyDaysLeft < 180 ? 'warning.main' : 'primary.main'
                }}
              >
                {warrantyDaysLeft != null ? warrantyDaysLeft.toLocaleString('th-TH') : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', mt: 0.5, display: 'block' }}>
                วันหมดประกัน
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Warranty bar */}
      <WarrantyBar purchaseDate={asset.purchaseDate} warrantyEndDate={asset.warrantyEndDate} />

      {/* Tabs navigation */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            fontWeight: 700,
            fontSize: '0.8125rem',
            minHeight: 44,
          }
        }}
      >
        <Tab value="spec" icon={<InfoOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="สเปก" />
        <Tab value="history" icon={<HistoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="ประวัติ" />
        <Tab value="pm" icon={<BuildIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="PM" />
        <Tab value="documents" icon={<InsertDriveFileIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="เอกสาร" />
        <Tab value="repairs" icon={<HandymanIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="ประวัติการซ่อม" />
        <Tab value="linked" icon={<LinkIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="อุปกรณ์ที่เชื่อมโยง" />
      </Tabs>

      {/* Tab panels */}
      {activeTab === 'spec' && (
        <SpecTab
          asset={asset}
          glpiSpec={glpiSpec}
          loadingGLPI={loadingGLPI}
          syncingGLPI={syncingGLPI}
          onSync={handleGLPISync}
        />
      )}
      {activeTab === 'history' && <HistoryTab asset={asset} />}
      {activeTab === 'pm' && <PMTab asset={asset} />}
      {activeTab === 'documents' && (
        <DocumentsTab
          asset={asset}
          onReload={() => {
            assetAPI.get(parseInt(id!)).then(res => setAsset(res.data));
          }}
        />
      )}
      {activeTab === 'repairs' && (
        <MaintenanceTab
          assetId={asset.id}
          onUpdate={() => {
            assetAPI.get(parseInt(id!)).then(res => setAsset(res.data));
          }}
        />
      )}
      {activeTab === 'linked' && <LinkedAssetsTab asset={asset} />}

      {/* Similar assets */}
      {similarAssets.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Box sx={{ width: 3, height: 14, borderRadius: '2px', bgcolor: 'primary.main' }} />
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>
              ทรัพย์สินใกล้เคียงในหมวดหมู่เดียวกัน
            </Typography>
          </Box>
          <Grid container spacing={1}>
            {similarAssets.slice(0, 4).map((a: any) => (
              <Grid item xs={12} key={a.id}>
                <Box
                  onClick={() => navigate(`/assets/${a.id}`)}
                  sx={{
                    cursor: 'pointer',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                      borderColor: 'primary.main',
                      transform: 'translateY(-2px)',
                    }
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                      {a.assetCode}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {a.brand} {a.model} · {a.serialNo}
                    </Typography>
                  </Box>
                  <StatusChip status={a.status} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* QR Modal */}
      <Dialog open={showQR} onClose={() => setShowQR(false)} maxWidth="xs" fullWidth sx={{ '& .MuiDialog-paper': { p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          QR Code — {asset.assetCode}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
          <Box sx={{
            p: 1.5,
            bgcolor: '#fff',
            border: '1.5px solid #e5e7eb',
            borderRadius: '10px',
            display: 'inline-block',
            mb: 2,
          }}>
            <QRCode
              value={`${window.location.origin}/assets/${asset.id}`}
              size={160}
              level="M"
            />
          </Box>
          <Typography variant="body2" fontWeight={700} color="text.primary" align="center">
            {[asset.brand, asset.model].filter(Boolean).join(' ') || asset.assetName}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            S/N: {asset.serialNo}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 0.5 }}>
          <Button variant="outlined" startIcon={<PrintIcon sx={{ fontSize: 16 }} />} onClick={() => { setShowQR(false); navigate(`/assets/print-qr?ids=${id}`); }} size="small" sx={{ borderRadius: '10px', fontWeight: 600 }}>
            พิมพ์สติ๊กเกอร์
          </Button>
          <Button variant="contained" onClick={() => setShowQR(false)} size="small" sx={{ borderRadius: '10px', fontWeight: 600 }}>
            ปิด
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: '100%', borderRadius: '10px', fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
