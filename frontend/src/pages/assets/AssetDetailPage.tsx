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
  Box,
  Container,
  Grid,
  Button,
  Breadcrumbs,
  Link,
  Tabs,
  Tab,
  LinearProgress,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import QRCode from 'react-qr-code';
import { assetAPI } from '../../services/api';

/* ─── Status helpers ──────────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
  Available: 'พร้อมใช้งาน', Borrowed: 'กำลังยืม', InUse: 'ใช้งานประจำ',
  Maintenance: 'ซ่อมบำรุง', Retired: 'ปลดระวาง', Lost: 'สูญหาย',
};

const HISTORY_LABEL: Record<string, string> = {
  CREATE: 'เพิ่มทรัพย์สินเข้าระบบ', STATUS_CHANGE: 'เปลี่ยนสถานะ',
  OWNER_CHANGE: 'เปลี่ยนผู้ถือครอง', LOCATION_CHANGE: 'เปลี่ยนสถานที่',
  CHECKOUT: 'ส่งมอบอุปกรณ์ Check-out', RETURN: 'คืนอุปกรณ์',
};

const HISTORY_ICON: Record<string, string> = {
  CREATE: '✨', STATUS_CHANGE: '✏️', OWNER_CHANGE: '👤',
  LOCATION_CHANGE: '📍', CHECKOUT: '📦', RETURN: '🔄',
};

const PM_LABEL: Record<string, string> = {
  DRAFT: 'ร่าง', IN_PROGRESS: 'กำลังดำเนินการ', COMPLETED: 'เสร็จสิ้น',
};

/* ─── Emoji icons by type ─────────────────────────────────────── */
function getTypeIcon(type: string): string {
  const t = type?.toLowerCase() || '';
  if (['notebook', 'laptop', 'macbook'].some(k => t.includes(k))) return '💻';
  if (['desktop', 'pc', 'workstation', 'all-in-one'].some(k => t.includes(k))) return '🖥';
  if (t.includes('server')) return '🗄';
  if (t.includes('monitor')) return '🖥';
  if (t.includes('printer')) return '🖨';
  if (['phone', 'tablet', 'smartphone', 'ipad'].some(k => t.includes(k))) return '📱';
  if (['switch', 'router', 'firewall', 'access point', 'ap', 'network'].some(k => t.includes(k))) return '🌐';
  if (t.includes('projector')) return '📽';
  if (t.includes('webcam')) return '📷';
  if (t.includes('speaker')) return '🔊';
  return '🔧';
}

const getStatusChipProps = (status: string) => {
  switch (status) {
    case 'Available':
      return { label: STATUS_LABEL.Available, color: 'success' as const };
    case 'Borrowed':
      return { label: STATUS_LABEL.Borrowed, color: 'warning' as const };
    case 'InUse':
      return { label: STATUS_LABEL.InUse, color: 'secondary' as const };
    case 'Maintenance':
      return { label: STATUS_LABEL.Maintenance, color: 'warning' as const };
    case 'Retired':
      return { label: STATUS_LABEL.Retired, color: 'default' as const };
    case 'Lost':
      return { label: STATUS_LABEL.Lost, color: 'error' as const };
    default:
      return { label: status, color: 'default' as const };
  }
};

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
        borderRadius: 2.5,
        bgcolor: 'rgba(248, 247, 255, 0.7)',
        border: '1px solid rgba(99, 102, 241, 0.07)',
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
    <Card sx={{
      background: 'rgba(255, 255, 255, 0.5)',
      border: '1px solid rgba(99, 102, 241, 0.12)',
      borderRadius: '10px',
      boxShadow: 'none',
      mb: 2
    }}>
      <CardContent sx={{ p: '12px 14px', '&:last-child': { pb: '12px' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            🛡 ประกัน: {new Date(purchaseDate).toLocaleDateString('th-TH')} → {new Date(warrantyEndDate).toLocaleDateString('th-TH')}
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

/* ─── Spec sections by type ───────────────────────────────────── */
function SpecTab({ asset }: { asset: any }) {
  const t = (asset.type || '').toLowerCase();
  const cat = (asset.category?.name || '').toLowerCase();
  const detail = asset.detail || {};

  const isComputer = ['notebook', 'laptop', 'macbook', 'pc desktop', 'desktop', 'workstation', 'all-in-one', 'mini pc', 'thin client', 'computer'].some(k => t.includes(k)) || cat === 'คอมพิวเตอร์' || t === 'pc';
  const isMonitor = t.includes('monitor') || cat === 'จอภาพ';
  const isPhone = ['smartphone', 'tablet', 'ipad', 'mobile'].some(k => t.includes(k)) || cat === 'อุปกรณ์สื่อสาร';
  const isNetwork = ['switch', 'router', 'access point', 'firewall', 'modem'].some(k => t.includes(k)) || cat === 'อุปกรณ์เครือข่าย';
  const isPrinter = t.includes('printer') || cat === 'เครื่องพิมพ์';

  const makeHeader = (title: string, barBg: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 3, height: 14, borderRadius: '2px', background: barBg }} />
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {title}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{
      background: 'rgba(255, 255, 255, 0.65)',
      border: '1px solid rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(20px)',
      borderRadius: '14px',
      boxShadow: '0 4px 24px rgba(99, 102, 241, 0.07), 0 1px 3px rgba(0, 0, 0, 0.04)',
      p: 1.5
    }}>
      {/* General */}
      <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, px: 0, '& .MuiAccordionSummary-content': { m: 0 } }}>
          {makeHeader('ข้อมูลพื้นฐานทรัพย์สิน', 'linear-gradient(180deg,#6366f1,#8b5cf6)')}
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
              {makeHeader('Hardware', 'linear-gradient(180deg,#4f46e5,#7c3aed)')}
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
              {makeHeader('ระบบปฏิบัติการ', 'linear-gradient(180deg,#2563eb,#60a5fa)')}
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
            {makeHeader('ข้อมูลจอภาพ', 'linear-gradient(180deg,#7c3aed,#a855f7)')}
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
                  <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(248, 247, 255, 0.7)', border: '1px solid rgba(99, 102, 241, 0.07)' }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 500, mb: 0.5 }}>ลำโพงในตัว</Typography>
                    <BoolBadge value={detail.hasSpeaker} yes="มี" no="ไม่มี" />
                  </Box>
                </Grid>
              )}
              {detail.curved !== undefined && detail.curved !== null && (
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(248, 247, 255, 0.7)', border: '1px solid rgba(99, 102, 241, 0.07)' }}>
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
            {makeHeader('ข้อมูลอุปกรณ์สื่อสาร', 'linear-gradient(180deg,#7c3aed,#a855f7)')}
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
            {makeHeader('ข้อมูลอุปกรณ์เครือข่าย', 'linear-gradient(180deg,#0891b2,#38bdf8)')}
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
            {makeHeader('ข้อมูลเครื่องพิมพ์', 'linear-gradient(180deg,#dc2626,#f87171)')}
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
          {makeHeader('จัดซื้อ / ประกัน', 'linear-gradient(180deg,#059669,#34d399)')}
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
          {makeHeader('ผู้ถือครอง', 'linear-gradient(180deg,#dc2626,#f87171)')}
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

      {/* Remark */}
      {asset.remark && (
        <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 0, py: 0.5, px: 0, '& .MuiAccordionSummary-content': { m: 0 } }}>
            {makeHeader('หมายเหตุ', 'linear-gradient(180deg,#6b7280,#9ca3af)')}
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
            <Box sx={{
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: 'rgba(248, 247, 255, 0.7)',
              border: '1px solid rgba(99, 102, 241, 0.07)',
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
            {makeHeader('รูปภาพทะเบียนทรัพย์สิน', 'linear-gradient(180deg,#6366f1,#8b5cf6)')}
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box component="img" src={asset.image} alt="Asset" sx={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(99,102,241,.12)' }} />
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}

/* ─── History tab ─────────────────────────────────────────────── */
function HistoryTab({ asset }: { asset: any }) {
  const history = asset.assetHistory || [];
  if (history.length === 0) return (
    <Box sx={{
      background: 'rgba(255, 255, 255, 0.65)',
      border: '1px solid rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(20px)',
      borderRadius: '14px',
      boxShadow: '0 4px 24px rgba(99, 102, 241, 0.07), 0 1px 3px rgba(0, 0, 0, 0.04)',
      p: 4,
      textAlign: 'center'
    }}>
      <Typography variant="body2" color="text.secondary">ไม่มีประวัติการเปลี่ยนแปลง</Typography>
    </Box>
  );

  return (
    <Box sx={{
      background: 'rgba(255, 255, 255, 0.65)',
      border: '1px solid rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(20px)',
      borderRadius: '14px',
      boxShadow: '0 4px 24px rgba(99, 102, 241, 0.07), 0 1px 3px rgba(0, 0, 0, 0.04)',
      p: 2.5
    }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {history.map((h: any, i: number) => {
          const icon = HISTORY_ICON[h.actionType] || '📋';
          const label = HISTORY_LABEL[h.actionType] || h.actionType;
          const detail = [h.fromStatus, h.toStatus, h.fromOwner, h.toOwner, h.fromLoc, h.toLoc, h.note].filter(Boolean).join(' → ');
          
          let dotColor = alpha('#9ca3af', 0.1);
          let borderColor = alpha('#9ca3af', 0.3);
          if (h.actionType === 'CREATE') { dotColor = alpha('#6366f1', 0.1); borderColor = alpha('#6366f1', 0.3); }
          else if (h.actionType === 'STATUS_CHANGE') { dotColor = alpha('#3b82f6', 0.1); borderColor = alpha('#3b82f6', 0.25); }
          else if (h.actionType === 'CHECKOUT') { dotColor = alpha('#f59e0b', 0.1); borderColor = alpha('#f59e0b', 0.28); }
          else if (h.actionType === 'RETURN') { dotColor = alpha('#10b981', 0.1); borderColor = alpha('#10b981', 0.25); }

          return (
            <Box key={h.id ?? i} sx={{ display: 'flex', gap: 2, position: 'relative' }}>
              {/* Timeline Connector Line */}
              {i < history.length - 1 && (
                <Box sx={{
                  position: 'absolute',
                  left: 15,
                  top: 32,
                  bottom: -16,
                  width: 1,
                  bgcolor: 'rgba(99, 102, 241, 0.12)'
                }} />
              )}
              
              {/* Icon Dot */}
              <Box sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                flexShrink: 0,
                mt: 0.25,
                border: '2px solid',
                borderColor,
                bgcolor: dotColor,
                zIndex: 1
              }}>
                {icon}
              </Box>

              {/* Timeline Content */}
              <Box sx={{ flex: 1, pb: i < history.length - 1 ? 2.5 : 1 }}>
                <Typography variant="body2" fontWeight={700} color="text.primary">
                  {label}
                </Typography>
                {detail && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25, lineHeight: 1.5 }}>
                    {detail}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.disabled">
                    {new Date(h.createdAt).toLocaleString('th-TH')}
                  </Typography>
                  {h.changedBy && (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      <Avatar sx={{
                        width: 18,
                        height: 18,
                        fontSize: '8px',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                        color: '#fff'
                      }}>
                        {String(h.changedBy).substring(0, 2).toUpperCase()}
                      </Avatar>
                      <Typography variant="caption" color="text.secondary">
                        {h.changedBy}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/* ─── PM tab ──────────────────────────────────────────────────── */
function PMTab({ asset }: { asset: any }) {
  const runs = asset.pmRuns || [];
  if (runs.length === 0) return (
    <Box sx={{
      background: 'rgba(255, 255, 255, 0.65)',
      border: '1px solid rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(20px)',
      borderRadius: '14px',
      boxShadow: '0 4px 24px rgba(99, 102, 241, 0.07), 0 1px 3px rgba(0, 0, 0, 0.04)',
      p: 4,
      textAlign: 'center'
    }}>
      <Typography variant="body2" color="text.secondary">ยังไม่มีประวัติ PM</Typography>
    </Box>
  );

  return (
    <Box sx={{
      background: 'rgba(255, 255, 255, 0.65)',
      border: '1px solid rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(20px)',
      borderRadius: '14px',
      boxShadow: '0 4px 24px rgba(99, 102, 241, 0.07), 0 1px 3px rgba(0, 0, 0, 0.04)',
      p: 2.5
    }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {runs.map((r: any) => {
          const performer = r.performer?.displayName || r.performer?.adUsername || r.performer?.username || '-';
          const statusOk = r.status === 'COMPLETED';
          return (
            <Box key={r.id} sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid rgba(99, 102, 241, 0.1)',
              bgcolor: 'rgba(248, 247, 255, 0.6)',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={700} color="text.primary">
                    PM ปี {r.year}
                  </Typography>
                  <Chip
                    label={`${statusOk ? '✓' : '⏳'} ${PM_LABEL[r.status] || r.status}`}
                    color={statusOk ? 'success' : 'warning'}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '10px', fontWeight: 600 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Avatar sx={{
                    width: 20,
                    height: 20,
                    fontSize: '9px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                    color: '#fff'
                  }}>
                    {performer.substring(0, 2).toUpperCase()}
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">
                    {performer} · {r.completedAt ? new Date(r.completedAt).toLocaleDateString('th-TH') : (r.performedAt ? new Date(r.performedAt).toLocaleDateString('th-TH') : '-')}
                  </Typography>
                </Box>
              </Box>
              
              {r.checklist && r.checklist.length > 0 && (
                <Grid container spacing={1} sx={{ mt: 1 }}>
                  {r.checklist.map((c: any) => (
                    <Grid item xs={6} sm={4} key={c.id ?? c.label}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '9px',
                          fontWeight: 700,
                          flexShrink: 0,
                          bgcolor: c.checked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                          color: c.checked ? 'success.main' : 'error.main',
                          border: '1px solid',
                          borderColor: c.checked ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.2)',
                        }}>
                          {c.checked ? '✓' : '✗'}
                        </Box>
                        <Typography variant="caption" color="text.primary">
                          {c.label}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
              {r.score != null && (
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mt: 1.5,
                  pt: 1.5,
                  borderTop: '1px solid rgba(99, 102, 241, 0.07)',
                  fontSize: '11px',
                  color: 'text.secondary'
                }}>
                  <Typography variant="caption" color="warning.main" sx={{ fontSize: 13, letterSpacing: 1 }}>
                    {'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}
                  </Typography>
                  <Typography variant="caption" fontWeight={700} color="text.primary">
                    {r.score}/5
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    · ความพึงพอใจผู้ใช้
                  </Typography>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/* ─── Main Page ───────────────────────────────────────────────── */
export default function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('spec');
  const [showQR, setShowQR] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [similarAssets, setSimilarAssets] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      assetAPI.get(parseInt(id))
        .then((res) => setAsset(res.data))
        .finally(() => setLoading(false));
    }
  }, [id]);

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

  const icon = getTypeIcon(asset.type);
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

  const statusProps = getStatusChipProps(asset.status);

  return (
    <Box sx={{ position: 'relative', minHeight: '80vh', pb: 5 }}>
      {/* Background orbs & grid */}
      <Box sx={{ position: 'fixed', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0, width: 420, height: 420, bgcolor: 'rgba(99,102,241,.08)', top: -140, left: -100 }} />
      <Box sx={{ position: 'fixed', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0, width: 300, height: 300, bgcolor: 'rgba(139,92,246,.07)', bottom: -80, right: -60 }} />
      <Box sx={{ position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(99,102,241,.08) 1px,transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none', zIndex: 0 }} />

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, pt: 1 }}>
        
        {/* Breadcrumb */}
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.disabled' }} />} aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component="button" onClick={() => navigate('/assets')} sx={{ textDecoration: 'none', color: 'primary.main', fontWeight: 600, border: 'none', bg: 'none', p: 0, cursor: 'pointer', outline: 'none' }}>
            ทรัพย์สิน IT
          </Link>
          <Typography variant="body2" color="text.disabled">
            {asset.assetCode}
          </Typography>
        </Breadcrumbs>

        {/* Hero card */}
        <Card sx={{
          background: 'rgba(255, 255, 255, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: '14px',
          boxShadow: '0 4px 24px rgba(99, 102, 241, 0.07), 0 1px 3px rgba(0, 0, 0, 0.04)',
          p: 1,
          mb: 2
        }}>
          <CardContent sx={{ p: '20px 24px !important' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={9}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                  <Avatar sx={{
                    width: 52,
                    height: 52,
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    fontSize: '26px',
                    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
                    flexShrink: 0
                  }}>
                    {icon}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
                      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>
                        {asset.brand} {asset.model}
                      </Typography>
                      <Chip label={statusProps.label} color={statusProps.color} size="small" sx={{ fontWeight: 700 }} />
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                      <Chip label={asset.assetCode} size="small" variant="outlined" color="primary" sx={{ height: 20, fontFamily: 'monospace', fontWeight: 700 }} />
                      {asset.assetName && (
                        <Chip label={`📝 ${asset.assetName}`} size="small" sx={{ height: 20, bgcolor: 'rgba(99,102,241,.1)', color: 'primary.dark', fontWeight: 600 }} />
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
                        <Chip label={`อายุ ${asset.age} ปี`} size="small" sx={{ height: 18, bgcolor: 'rgba(245,158,11,.1)', color: '#b45309', fontWeight: 600, fontSize: '10px' }} />
                      )}
                      {asset.serialNo && (
                        <Typography variant="caption" color="text.disabled">S/N: {asset.serialNo}</Typography>
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
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 3, pt: 2, borderTop: '1px solid rgba(99,102,241,0.08)' }}>
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

        {/* Quick stats strip */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Card sx={{
              background: 'rgba(255, 255, 255, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              borderRadius: '14px',
              boxShadow: '0 4px 24px rgba(99, 102, 241, 0.07), 0 1px 3px rgba(0, 0, 0, 0.04)',
              textAlign: 'center',
              p: 1
            }}>
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
            <Card sx={{
              background: 'rgba(255, 255, 255, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              borderRadius: '14px',
              boxShadow: '0 4px 24px rgba(99, 102, 241, 0.07), 0 1px 3px rgba(0, 0, 0, 0.04)',
              textAlign: 'center',
              p: 1
            }}>
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
            <Card sx={{
              background: 'rgba(255, 255, 255, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              borderRadius: '14px',
              boxShadow: '0 4px 24px rgba(99, 102, 241, 0.07), 0 1px 3px rgba(0, 0, 0, 0.04)',
              textAlign: 'center',
              p: 1
            }}>
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
            <Card sx={{
              background: 'rgba(255, 255, 255, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              borderRadius: '14px',
              boxShadow: '0 4px 24px rgba(99, 102, 241, 0.07), 0 1px 3px rgba(0, 0, 0, 0.04)',
              textAlign: 'center',
              p: 1
            }}>
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
          variant="fullWidth"
          sx={{
            mb: 2,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              fontWeight: 700,
              fontSize: '0.875rem',
            }
          }}
        >
          <Tab value="spec" label="🔧 สเปก" />
          <Tab value="history" label="📋 ประวัติ" />
          <Tab value="pm" label="🛠 PM" />
        </Tabs>

        {/* Tab panels */}
        {activeTab === 'spec' && <SpecTab asset={asset} />}
        {activeTab === 'history' && <HistoryTab asset={asset} />}
        {activeTab === 'pm' && <PMTab asset={asset} />}

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
              {similarAssets.slice(0, 4).map((a: any) => {
                const aStatusProps = getStatusChipProps(a.status);
                return (
                  <Grid item xs={12} key={a.id}>
                    <Box
                      onClick={() => navigate(`/assets/${a.id}`)}
                      sx={{
                        cursor: 'pointer',
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: 'rgba(248, 247, 255, 0.7)',
                        border: '1px solid rgba(99, 102, 241, 0.07)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: alpha('#6366f1', 0.04),
                          borderColor: alpha('#6366f1', 0.2),
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.05)'
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
                      <Chip label={aStatusProps.label} color={aStatusProps.color} size="small" sx={{ height: 20, fontSize: '10px', fontWeight: 600 }} />
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}
      </Container>

      {/* QR Modal */}
      <Dialog open={showQR} onClose={() => setShowQR(false)} maxWidth="xs" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: '16px', p: 1 } }}>
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
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
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
    </Box>
  );
}
