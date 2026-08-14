import React from 'react';
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
  Grid,
  Button,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SyncIcon from '@mui/icons-material/Sync';
import { getStatusLabel } from '../../../config/statusConfig';

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
export function SpecTab({ asset, glpiSpec, loadingGLPI, syncingGLPI, onSync }: {
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
            <SectionHeader title="รหัสและการระบุตัวตน" />
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 1.5, pb: 0.5, px: 0 }}>
            {/* Only the identifiers the overview card at the top of the page
                does not already show. Asset code, type, brand, model, serial
                and company all live in the hero now, so repeating them here
                was pure duplication. */}
            <Grid container spacing={1}>
              <SpecItem label="ชื่อทรัพย์สิน / รหัสทรัพย์สิน (IT)" value={asset.assetName} mono />
              <SpecItem label="เลขครุภัณฑ์ (ฝ่ายบัญชี)" value={asset.accountingCode} mono />
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
