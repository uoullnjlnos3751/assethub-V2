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
import { AgentSpecCard } from './AgentSpecCard';
import { WindowsCard } from '../components/WindowsCard';
import { OfficeCard } from '../components/OfficeCard';
import { InstalledSoftwareCard } from '../components/InstalledSoftwareCard';

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
export function SpecTab({ asset, glpiSpec, loadingGLPI, syncingGLPI, onSync, agent, agentSpec, syncingAgent, onAgentSync }: {
  asset: any;
  glpiSpec?: any;
  loadingGLPI?: boolean;
  syncingGLPI?: boolean;
  onSync?: (field?: string, label?: string) => void;
  agent?: any;
  agentSpec?: Record<string, string | null>;
  syncingAgent?: boolean;
  onAgentSync?: (field?: string, label?: string) => void;
}) {
  const t = (asset.type || '').toLowerCase();
  const cat = (asset.category?.name || '').toLowerCase();
  const detail = asset.detail || {};

  const isComputer = ['notebook', 'laptop', 'macbook', 'pc desktop', 'desktop', 'workstation', 'all-in-one', 'mini pc', 'thin client', 'computer'].some(k => t.includes(k)) || cat === 'คอมพิวเตอร์' || t === 'pc';
  const isMonitor = t.includes('monitor') || cat === 'จอภาพ';
  const isPhone = ['smartphone', 'tablet', 'ipad', 'mobile'].some(k => t.includes(k)) || cat === 'อุปกรณ์สื่อสาร';
  const isNetwork = ['switch', 'router', 'access point', 'firewall', 'modem'].some(k => t.includes(k)) || cat === 'อุปกรณ์เครือข่าย';
  const isPrinter = t.includes('printer') || cat === 'เครื่องพิมพ์';

  /**
   * One field of the GLPI comparison.
   *
   * `state` is decided by the server (services/glpiSpec.ts) rather than by
   * comparing strings here, because the two used to disagree: the page called
   * "Dell" against "Dell Inc." a mismatch and offered a sync button that then
   * wrote nothing. Whatever this row claims is now exactly what a click does.
   */
  const GLPI_STATE: Record<string, { label: string; color: 'success' | 'info' | 'primary' | 'warning' }> = {
    same:   { label: 'ตรงกัน', color: 'success' },
    fill:   { label: 'เติมช่องว่าง', color: 'info' },
    better: { label: 'GLPI ละเอียดกว่า', color: 'primary' },
    diff:   { label: 'ไม่ตรงกัน', color: 'warning' },
  };

  const renderGlpiField = (f: any) => {
    const st = GLPI_STATE[f.state] || GLPI_STATE.diff;
    return (
      <Box key={f.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', width: '25%', fontSize: '0.8rem' }}>{f.label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, color: f.current ? 'text.primary' : 'text.disabled', width: '35%', wordBreak: 'break-all', fontSize: '0.8rem', fontStyle: f.current ? 'normal' : 'italic' }}>
          {f.current || '(ว่าง)'}
        </Typography>
        <Box sx={{ width: '40%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
            <Chip label={st.label} color={st.color} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.7rem', fontWeight: 600, width: 'fit-content' }} />
            {f.state !== 'same' && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem', wordBreak: 'break-all' }}>
                ค่าจาก GLPI: {f.incoming}
              </Typography>
            )}
            {f.note && f.state !== 'same' && (
              <Typography variant="caption" sx={{ color: 'warning.main', fontSize: '0.68rem' }}>{f.note}</Typography>
            )}
          </Box>
          {f.state !== 'same' && onSync && (
            <IconButton size="small" onClick={() => onSync(f.key, f.label)} disabled={syncingGLPI}
              sx={{ color: 'primary.main', flex: 'none' }} title={`ปรับปรุงเฉพาะ ${f.label}`}>
              <SyncIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Agent first — unlike GLPI it is actually connected, so this is the card
          that carries real data for the machines the agent covers. */}
      {agent && agentSpec && (
        <AgentSpecCard
          agent={agent}
          spec={agentSpec}
          asset={asset}
          syncing={syncingAgent}
          onSync={onAgentSync}
        />
      )}

      {/* Windows / Office license & update status, and the installed-software
          list — all read live from the agent, none of it stored in the
          registry itself. Each card hides on its own when the agent has
          nothing to say (no record at all, or an older agent build that
          doesn't report the Office/Windows fields). */}
      {agent && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5, alignItems: 'start' }}>
          <WindowsCard agent={agent} />
          <OfficeCard agent={agent} />
        </Box>
      )}
      {agent && <InstalledSoftwareCard agent={agent} />}

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
                {/* Fields GLPI says nothing about are left out entirely — a row
                    reading "ค่าจริง: —" only invited a click that did nothing. */}
                {(glpiSpec.fields || []).map(renderGlpiField)}
                {!(glpiSpec.fields || []).length && (
                  <Typography sx={{ py: 2, textAlign: 'center', color: 'text.disabled', fontSize: '0.78rem' }}>
                    GLPI ไม่มีข้อมูลสเปคของเครื่องนี้
                  </Typography>
                )}
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

        {/* Computer OS/license — CPU/RAM/GPU/Storage moved to their own
            "ฮาร์ดแวร์" tab (per-component cards) so this accordion doesn't
            repeat the exact same fields in a second shape. */}
        {isComputer && !isMonitor && (
          <>
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
