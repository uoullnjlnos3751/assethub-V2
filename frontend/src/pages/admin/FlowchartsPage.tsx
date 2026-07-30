import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  alpha,
  useTheme,
  IconButton,
  Tooltip,
  Fade,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CodeIcon from '@mui/icons-material/Code';
import DevicesIcon from '@mui/icons-material/Devices';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import InfoIcon from '@mui/icons-material/Info';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import DownloadIcon from '@mui/icons-material/Download';
import ListAltIcon from '@mui/icons-material/ListAlt';

// Steps data
const assetWorkflowSteps = [
  {
    label: '1. เพิ่มทรัพย์สินเข้าระบบ (Create / Import)',
    actor: 'IT ADMIN / SUPERADMIN',
    actorColor: 'primary',
    desc: 'เจ้าหน้าที่ป้อนข้อมูลเดี่ยวผ่านหน้าฟอร์ม หรือโหลดแบบฟอร์มคอลัมน์มาตรฐานแล้วทำการอัปโหลดไฟล์ Excel/CSV แบบกลุ่ม (Bulk)',
    systemAction: 'ระบบทำการตรวจสอบข้อมูลไม่ให้มี Serial No. ซ้ำ และบันทึกเข้าระบบหลัก'
  },
  {
    label: '2. ดึงสเปคเครื่องจริงและเปรียบเทียบ (GLPI Sync)',
    actor: 'IT ADMIN / SUPERADMIN',
    actorColor: 'secondary',
    desc: 'ระบบจะนำ Serial No. ไปดึงข้อมูลสเปคเครื่องจริงจากระบบ GLPI และนำมาเปรียบเทียบกับข้อมูลบนตู้ทะเบียน หากไม่ตรงกันระบบจะขึ้นแถบเตือนสีแดงให้เห็นความแตกต่าง',
    systemAction: 'เจ้าหน้าที่สามารถกดคลิก "ซิงค์สเปค GLPI" เพื่อดึงค่าแรม, ฮาร์ดดิสก์, ซีพียู และวินโดวส์ล่าสุดเข้าตู้ทะเบียนของระบบโดยอัตโนมัติ'
  },
  {
    label: '3. แจกจ่ายและถือครองเครื่อง (Available / InUse)',
    actor: 'IT STAFF / EMPLOYEES',
    actorColor: 'info',
    desc: 'อุปกรณ์พร้อมใช้งานจะถูกจัดเก็บเข้าคลังหรือนำไปแปะสติ๊กเกอร์ QR Code เพื่อรอยืม ส่วนเครื่องที่จ่ายไปแล้วจะมีข้อมูลผู้ถือครองและแผนกคอยบันทึกเป็นเจ้าของ',
    systemAction: 'ทุกครั้งที่มีการเปลี่ยนสถานะหรือผู้ถือครอง ระบบจะเขียนลงประวัติเครื่อง (Asset History) เพื่อเก็บเป็น Audit Trail'
  },
  {
    label: '4. งานซ่อมบำรุงเมื่อชำรุด (Maintenance)',
    actor: 'IT ADMIN / USER',
    actorColor: 'warning',
    desc: 'หากผู้ใช้แจ้งชำรุดหรือตรวจบำรุงรักษาแล้วพบปัญหา อุปกรณ์จะเปลี่ยนสถานะเป็น "ส่งซ่อม (Maintenance)" และส่งข้อมูลเข้าสู่กระบวนการส่งช่าง',
    systemAction: 'เมื่อซ่อมสำเร็จจะกลับมาเปลี่ยนสถานะเป็น "พร้อมใช้งาน" หากซ่อมไม่ได้จะเข้าสู่กระบวนการถัดไป'
  },
  {
    label: '5. ปลดระวางหรือส่งต่อบริจาค (Retire / Donate)',
    actor: 'IT ADMIN / SUPERADMIN',
    actorColor: 'error',
    desc: 'ครุภัณฑ์ที่มีอายุการใช้งานนานเกินรอบ หรือชำรุดซ่อมไม่คุ้มค่า จะถูกนำไป "ปลดระวาง (Retired)" หรือจัดตั้งใบคำขอเพื่อทำรายการส่งมอบบริจาคแก่องค์กรอื่น',
    systemAction: 'ระบบเปลี่ยนสถานะเป็นปลดระวางถาวร และประมวลรายงานค่าเสื่อมราคา'
  }
];

const borrowWorkflowSteps = [
  {
    label: '1. ตรวจสอบคลังและเลือกยืม (Check Available)',
    actor: 'EMPLOYEES (USER)',
    actorColor: 'info',
    desc: 'พนักงานตรวจสอบอุปกรณ์ที่พร้อมให้ขอยืมได้ในระบบ (สถานะ Available) และกดเลือกอุปกรณ์เพื่อยื่นความประสงค์',
    systemAction: 'ระบบกรองข้อมูลเฉพาะอุปกรณ์ที่มีค่าสถานะพร้อมใช้งานเท่านั้นมาแสดงให้แก่พนักงานทั่วไป'
  },
  {
    label: '2. ยื่นคำขอยืมพร้อมระบบป้องกัน (Borrow Request)',
    actor: 'EMPLOYEES (USER)',
    actorColor: 'info',
    desc: 'ผู้ใช้ระบุเหตุผลในการยืมและกำหนดวันที่ต้องการนำมาส่งคืน โดยระบบมีตัวควบคุมวันที่ล็อกปฏิทินอัจฉริยะ (Smart Date Picker) จำกัดระยะเวลาการยืมไม่เกิน 30 วันโดยอัตโนมัติ',
    systemAction: 'ระบบบันทึกรายการเป็นคำขอรอดำเนินการ (Pending) และสร้าง Notification ประวัติการขอส่งหาแอดมิน'
  },
  {
    label: '3. อนุมัติการยืม (IT Admin Review)',
    actor: 'IT ADMIN / SUPERADMIN',
    actorColor: 'primary',
    desc: 'เจ้าหน้าที่ IT ตรวจสอบคำขอความประสงค์ หากไม่สมเหตุสมผลหรืออุปกรณ์ติดขัดจะกดปฏิเสธ (Rejected) หากพร้อมจะอนุมัติใบคำขอ (Approved)',
    systemAction: 'ส่งประวัติเตือน (Notification) ไปแจ้งพนักงานแบบเรียลไทม์ และเปลี่ยนสถานะคำขอ'
  },
  {
    label: '4. ส่งมอบอุปกรณ์และนำไปใช้งาน (Check-out)',
    actor: 'IT ADMIN & USER',
    actorColor: 'warning',
    desc: 'พนักงานติดต่อรับอุปกรณ์ที่ห้องไอที โดยเจ้าหน้าที่ IT จะส่งมอบและทำรายการสแกนใบเบิก จากนั้นเปลี่ยนสถานะทรัพย์สินเครื่องดังกล่าวเป็น "กำลังยืม (Borrowed)"',
    systemAction: 'อัปเดตสถานะทรัพย์สินและเขียนประวัติการส่งมอบลงตู้ฐานข้อมูลหลัก'
  },
  {
    label: '5. ติดตามเครื่องเกินกำหนดและแจ้งส่งคืน (Overdue / Return)',
    actor: 'IT ADMIN & USER',
    actorColor: 'error',
    desc: 'ผู้ใช้นำเครื่องมาคืนเมื่อถึงกำหนด หากพนักงานไม่คืนตามเวลา ระบบจะขึ้นสัญลักษณ์แจ้งเตือน "อุปกรณ์เกินกำหนด (Overdue)" บนแถบเมนู เพื่อให้ไอทีติดตามส่งคืน',
    systemAction: 'หากพนักงานส่งคำขอขยายวัน (Extension) และไอทีอนุมัติ ระบบจะเลื่อนกำหนดส่งคืนใหม่ แต่หากพนักงานส่งคืนปกติ ไอทีจะตรวจสภาพเครื่องและกดปุ่ม "รับคืน (Return)" เพื่อนำทรัพย์สินกลับเข้าสต๊อก Available'
  }
];

const pmWorkflowSteps = [
  {
    label: '1. สร้างแผนแม่แบบและกำหนดการ (Template & Plans)',
    actor: 'IT ADMIN / SUPERADMIN',
    actorColor: 'primary',
    desc: 'ไอทีจัดทำ Checklist แม่แบบในการตรวจประเมิน เช่น แม่แบบเช็คคอมพิวเตอร์ หรือตู้ Switch Hub Room จากนั้นสร้างแผนงาน PM ประจำปี/ประจำเดือน',
    systemAction: 'ระบบบันทึกคู่มือตรวจเช็คและสร้างตารางเวลานัดหมายลงปฏิทินกำหนดการ (Schedule)'
  },
  {
    label: '2. ดำเนินงานเข้าตรวจเช็คหน้างาน (PM Execution)',
    actor: 'IT ADMIN (TECHNICIAN)',
    actorColor: 'secondary',
    desc: 'ช่างเทคนิคหรือผู้ดูแลระบบ เข้าตรวจเช็คอุปกรณ์จริงตามหน้างาน และทำรายการบันทึกคะแนนประเมินผ่านมือถือหรืออุปกรณ์พกพาในเมนู "ทำ PM ทรัพย์สิน" หรือ "ตรวจ Hub Room"',
    systemAction: 'ระบบโหลดข้อมูลสเปคจริงและเช็คลิสต์ตรวจข้อกำหนดแบบตอบคำถามเรียงข้อตาม Template'
  },
  {
    label: '3. บันทึกผลและตรวจสอบความผิดปกติ (Condition & Fix)',
    actor: 'IT ADMIN (TECHNICIAN)',
    actorColor: 'warning',
    desc: 'หากการตรวจเช็คปกติ ระบบจะปิดงาน PM Run ของเครื่องนั้น หากพบสิ่งผิดปกติ ช่างเทคนิคจะทำเครื่องหมายแจ้งปัญหาและสร้างใบสั่งซ่อมบำรุง (Maintenance Ticket) เพื่อส่งช่างซ่อมต่อเนื่องทันที',
    systemAction: 'ระบบบันทึกคะแนนและผลตรวจแยกเป็นประวัติของอุปกรณ์ และเชื่อมตารางการซ่อมแซม'
  },
  {
    label: '4. ปิดรอบแผนงานและออกรายงานประจำเดือน (PM Reports)',
    actor: 'IT ADMIN / SUPERADMIN',
    actorColor: 'success',
    desc: 'เมื่อทำการตรวจเช็คครบถ้วนทุกอุปกรณ์ในกลุ่มเป้าหมาย เจ้าหน้าที่จะทำการปิดรอบแผน PM ประจำเดือนนั้นๆ เพื่อทำรายงาน',
    systemAction: 'ระบบประมวลผลดึงประวัติการ PM ออกมาเป็นรายงานภาพรวมและกราฟสถิติความสำเร็จประจำรอบ'
  }
];

const tabs = [
  { label: 'ทะเบียนทรัพย์สิน IT', icon: <DevicesIcon fontSize="small" />, color: '#0ea5e9', image: '/asset_lifecycle_flow.png', title: 'ทะเบียนและวงจรชีวิตทรัพย์สิน IT (Asset Lifecycle)', steps: assetWorkflowSteps },
  { label: 'ขั้นตอน ยืม-คืน', icon: <ShoppingCartIcon fontSize="small" />, color: '#f59e0b', image: '/borrow_return_flow.png', title: 'ขั้นตอนระบบงาน ยืม-คืน อุปกรณ์ (Borrow & Return)', steps: borrowWorkflowSteps },
  { label: 'งาน PM & ซ่อมบำรุง', icon: <BuildCircleIcon fontSize="small" />, color: '#10b981', image: '/pm_maintenance_flow.png', title: 'ขั้นตอนงานวางแผนและตรวจซ่อมบำรุง (PM & Maintenance)', steps: pmWorkflowSteps },
];

export default function FlowchartsPage() {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showSteps, setShowSteps] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const active = tabs[tabValue];

  const handleTabChange = (_: React.SyntheticEvent, v: number) => {
    setTabValue(v);
    setZoom(1);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = active.image;
    a.download = `flowchart_${tabValue + 1}.png`;
    a.click();
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, fontFamily: 'Sarabun, sans-serif', maxWidth: '100%' }}>

      {/* Header */}
      <Card elevation={0} sx={{
        mb: 3, borderRadius: '16px',
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
          : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 60%, #f0fdf4 100%)',
        border: '1px solid',
        borderColor: theme.palette.mode === 'dark' ? '#334155' : '#bae6fd',
        overflow: 'hidden', position: 'relative'
      }}>
        <Box sx={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: alpha('#0ea5e9', 0.07) }} />
        <Box sx={{ position: 'absolute', bottom: -20, left: 60, width: 100, height: 100, borderRadius: '50%', background: alpha('#10b981', 0.07) }} />
        <CardContent sx={{ p: { xs: 2.5, md: 4 }, position: 'relative', zIndex: 1 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{
              width: 56, height: 56, borderRadius: '14px',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(14,165,233,0.3)', fontSize: 26
            }}>📊</Box>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{
                fontSize: { xs: '1.1rem', md: '1.5rem' },
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                แผนผังขั้นตอนการทำงานระบบ (System Flowcharts)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
                ภาพรวมกระบวนการทำงานทั้งหมดของระบบ AssetHub V2 — ทะเบียนทรัพย์สิน | ยืม-คืน | PM & ซ่อมบำรุง
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card elevation={0} sx={{
        borderRadius: '14px', mb: 0,
        border: '1px solid', borderColor: theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0',
        overflow: 'hidden'
      }}>
        <Box sx={{
          borderBottom: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0',
          bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
          px: 1
        }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTabs-indicator': { backgroundColor: active.color, height: 3, borderRadius: '3px' },
              '& .MuiTab-root': {
                fontSize: '0.82rem', fontWeight: 600, minHeight: 52,
                fontFamily: 'Sarabun, sans-serif', color: 'text.secondary',
                '&.Mui-selected': { color: active.color }
              }
            }}
          >
            {tabs.map((t, i) => (
              <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} />
            ))}
          </Tabs>
        </Box>

        {/* Title bar */}
        <Box sx={{
          px: { xs: 2, md: 3 }, py: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1,
          borderBottom: '1px solid', borderColor: theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0',
          bgcolor: theme.palette.mode === 'dark' ? '#1e293b' : '#fff'
        }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ color: active.color, display: 'flex' }}>{active.icon}</Box>
            <Typography fontWeight={700} sx={{ fontSize: { xs: '0.82rem', md: '0.95rem' }, color: 'text.primary' }}>
              {active.title}
            </Typography>
          </Box>
          {/* Toolbar */}
          <Box display="flex" alignItems="center" gap={0.5}>
            <Tooltip title="ย่อภาพ"><span><IconButton size="small" onClick={() => setZoom(z => Math.max(0.5, z - 0.15))} disabled={zoom <= 0.5}><ZoomOutIcon fontSize="small" /></IconButton></span></Tooltip>
            <Chip label={`${Math.round(zoom * 100)}%`} size="small" sx={{ fontSize: '0.7rem', height: 24, minWidth: 48, bgcolor: alpha(active.color, 0.1), color: active.color, fontWeight: 700 }} />
            <Tooltip title="ขยายภาพ"><span><IconButton size="small" onClick={() => setZoom(z => Math.min(3, z + 0.15))} disabled={zoom >= 3}><ZoomInIcon fontSize="small" /></IconButton></span></Tooltip>
            <Tooltip title="เต็มจอ">
              <IconButton size="small" onClick={() => setFullscreen(f => !f)} sx={{ color: fullscreen ? active.color : 'inherit' }}>
                <FullscreenIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="ดาวน์โหลดรูป">
              <IconButton size="small" onClick={handleDownload}><DownloadIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Image Viewer - LARGE */}
        <Box
          sx={{
            width: '100%',
            bgcolor: theme.palette.mode === 'dark' ? '#070d1a' : '#f1f5f9',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            overflow: 'auto',
            minHeight: fullscreen ? 'calc(100vh - 260px)' : { xs: 300, md: 520 },
            maxHeight: fullscreen ? 'calc(100vh - 200px)' : { xs: 400, md: 680 },
            p: 2,
            cursor: zoom > 1 ? 'grab' : 'default',
            position: 'relative'
          }}
        >
          <Fade in key={tabValue}>
            <img
              src={active.image}
              alt={active.title}
              style={{
                width: `${zoom * 100}%`,
                maxWidth: zoom === 1 ? '100%' : 'none',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '10px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                display: 'block',
              }}
            />
          </Fade>
        </Box>

        {/* Steps Accordion */}
        <Accordion
          expanded={showSteps}
          onChange={() => setShowSteps(s => !s)}
          elevation={0}
          disableGutters
          sx={{
            borderTop: '1px solid',
            borderColor: theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0',
            '&:before': { display: 'none' }
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
              px: { xs: 2, md: 3 }, minHeight: 48,
              '& .MuiAccordionSummary-content': { my: 1 }
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <ListAltIcon sx={{ fontSize: 18, color: active.color }} />
              <Typography fontWeight={600} sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                คำอธิบายขั้นตอน ({active.steps.length} ขั้นตอน) — คลิกเพื่อ{showSteps ? 'ซ่อน' : 'แสดง'}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: { xs: 2, md: 3 }, bgcolor: theme.palette.mode === 'dark' ? '#111827' : '#fff' }}>
            <Stepper orientation="vertical" sx={{ '& .MuiStepConnector-line': { minHeight: 28, borderColor: '#cbd5e1' } }}>
              {active.steps.map((step, index) => (
                <Step key={index} active={true}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Box sx={{
                        width: 30, height: 30, borderRadius: '50%',
                        bgcolor: active.color, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', fontSize: '0.82rem',
                        boxShadow: `0 4px 12px ${alpha(active.color, 0.4)}`
                      }}>
                        {index + 1}
                      </Box>
                    )}
                  >
                    <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                      <Typography fontWeight={700} sx={{ fontSize: '0.88rem', color: 'text.primary' }}>
                        {step.label}
                      </Typography>
                      <Chip
                        label={step.actor}
                        size="small"
                        color={step.actorColor as any}
                        sx={{ fontSize: '0.62rem', height: 18, fontWeight: 700, borderRadius: '4px' }}
                      />
                    </Box>
                  </StepLabel>
                  <StepContent sx={{ borderLeft: `2px solid ${alpha(active.color, 0.25)}`, ml: '14px', pl: 3.5, pb: 2.5 }}>
                    <Paper elevation={0} sx={{
                      p: 2,
                      bgcolor: theme.palette.mode === 'dark' ? '#1e293b' : alpha(active.color, 0.03),
                      border: '1px solid',
                      borderColor: theme.palette.mode === 'dark' ? '#334155' : alpha(active.color, 0.15),
                      borderRadius: '10px', mt: 1
                    }}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.7 }}>
                        {step.desc}
                      </Typography>
                      {step.systemAction && (
                        <Box sx={{
                          mt: 1.5, pt: 1.5,
                          borderTop: '1px dashed',
                          borderColor: theme.palette.mode === 'dark' ? '#475569' : '#cbd5e1',
                          display: 'flex', alignItems: 'flex-start', gap: 1
                        }}>
                          <InfoIcon sx={{ fontSize: 15, color: active.color, mt: 0.25 }} />
                          <Typography variant="body2" sx={{ fontSize: '0.76rem', color: 'text.secondary', lineHeight: 1.6 }}>
                            <b>ระบบอัตโนมัติ:</b> {step.systemAction}
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </AccordionDetails>
        </Accordion>
      </Card>

      {/* Quick Download All */}
      <Box sx={{ mt: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {tabs.map((t, i) => (
          <Button
            key={i}
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => {
              const a = document.createElement('a');
              a.href = t.image;
              a.download = `flowchart_${i + 1}.png`;
              a.click();
            }}
            sx={{
              fontSize: '0.75rem', borderRadius: '8px',
              borderColor: t.color, color: t.color,
              '&:hover': { bgcolor: alpha(t.color, 0.06), borderColor: t.color }
            }}
          >
            {t.label}
          </Button>
        ))}
        <Button
          variant="outlined"
          size="small"
          startIcon={<CodeIcon />}
          onClick={() => {
            const link = document.createElement('a');
            link.href = '#';
            alert('เปิด Accordion "คำอธิบายขั้นตอน" ด้านล่างรูปภาพเพื่อดูรายละเอียด');
          }}
          sx={{ fontSize: '0.75rem', borderRadius: '8px', borderColor: '#94a3b8', color: 'text.secondary' }}
        >
          คำอธิบาย
        </Button>
      </Box>

    </Box>
  );
}
