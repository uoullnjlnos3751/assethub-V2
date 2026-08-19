import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, alpha, useTheme } from '@mui/material';
import { Grid3x3 } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';

type Access = 'full' | 'read' | 'none';

interface MatrixRow {
  label: string;
  superadmin: Access;
  itAdmin: Access;
  viewer: Access;
  user: Access;
  hrCustody: Access;
}

// Hand-compiled from the real, current gates in frontend/src/navigation/nav.tsx
// (adminNav roles arrays + Layout.tsx's viewerVisiblePaths/Labels allowlist)
// and backend authorize() calls — not a stored/editable data model.
const ROWS: MatrixRow[] = [
  { label: 'ภาพรวม (Dashboard)', superadmin: 'full', itAdmin: 'full', viewer: 'read', user: 'none', hrCustody: 'none' },
  { label: 'ทะเบียนทรัพย์สิน IT', superadmin: 'full', itAdmin: 'full', viewer: 'none', user: 'none', hrCustody: 'none' },
  { label: 'เครื่องใหม่ & ส่งมอบ', superadmin: 'full', itAdmin: 'full', viewer: 'none', user: 'none', hrCustody: 'none' },
  { label: 'คลังวัสดุ', superadmin: 'full', itAdmin: 'full', viewer: 'none', user: 'none', hrCustody: 'none' },
  { label: 'ระบบยืม-คืน (คิว/อนุมัติ/ส่งมอบ/รับคืน)', superadmin: 'full', itAdmin: 'full', viewer: 'none', user: 'none', hrCustody: 'none' },
  { label: 'PM ทรัพย์สิน + ตู้ Switch/Hub', superadmin: 'full', itAdmin: 'full', viewer: 'none', user: 'none', hrCustody: 'none' },
  { label: 'จำหน่ายทรัพย์สินออก / บริจาค', superadmin: 'full', itAdmin: 'full', viewer: 'none', user: 'none', hrCustody: 'none' },
  { label: 'License & สัญญา', superadmin: 'full', itAdmin: 'full', viewer: 'read', user: 'none', hrCustody: 'none' },
  { label: 'รายงานระบบ', superadmin: 'full', itAdmin: 'full', viewer: 'read', user: 'none', hrCustody: 'none' },
  { label: 'ข้อมูลหลัก (Master Data)', superadmin: 'full', itAdmin: 'full', viewer: 'none', user: 'none', hrCustody: 'none' },
  { label: 'ตั้งค่าระบบ (ทั่วไป/Backup/Flowchart/Audit Log)', superadmin: 'full', itAdmin: 'full', viewer: 'none', user: 'none', hrCustody: 'none' },
  { label: 'ตั้งค่าระบบหลัก / จัดการผู้ใช้งาน / ประวัติแจ้งเตือน', superadmin: 'full', itAdmin: 'none', viewer: 'none', user: 'none', hrCustody: 'none' },
  { label: 'เครื่องที่รับฝาก (ฝ่ายบุคคล)', superadmin: 'full', itAdmin: 'full', viewer: 'none', user: 'none', hrCustody: 'full' },
];

function AccessCell({ v }: { v: Access }) {
  const theme = useTheme();
  if (v === 'full') return <Typography sx={{ fontWeight: 800, color: theme.palette.success.main }}>✓</Typography>;
  if (v === 'read') return <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: theme.palette.info.main }}>อ่าน</Typography>;
  return <Typography sx={{ color: theme.palette.text.disabled }}>—</Typography>;
}

export default function PermissionMatrixTab() {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{
        borderRadius: '12px', p: 1.75,
        bgcolor: alpha(theme.palette.info.main, 0.05),
        border: `1px dashed ${alpha(theme.palette.info.main, 0.35)}`,
      }}>
        <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, lineHeight: 1.7 }}>
          📘 ตารางนี้แสดงสิทธิ์ปัจจุบันของระบบ (อ่านอย่างเดียว) — คำนวณจากเงื่อนไข roles ที่เขียนไว้ในโค้ดจริง
          (frontend/src/navigation/nav.tsx และการตรวจสอบสิทธิ์ฝั่ง backend) ไม่ใช่ตารางที่แก้ไขได้ในหน้านี้
          เพราะระบบยังไม่มีฐานข้อมูลสิทธิ์แบบแยกตาราง (permission matrix) — การจะแก้สิทธิ์ต้องแก้โค้ดโดยตรง
        </Typography>
      </Box>

      <SectionCard title="ตารางสิทธิ์รายเมนู" icon={Grid3x3}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>เมนู</TableCell>
                <TableCell align="center">SUPERADMIN</TableCell>
                <TableCell align="center">IT_ADMIN</TableCell>
                <TableCell align="center">VIEWER</TableCell>
                <TableCell align="center">USER</TableCell>
                <TableCell align="center">HR_CUSTODY</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ROWS.map(r => (
                <TableRow key={r.label} hover>
                  <TableCell><Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{r.label}</Typography></TableCell>
                  <TableCell align="center"><AccessCell v={r.superadmin} /></TableCell>
                  <TableCell align="center"><AccessCell v={r.itAdmin} /></TableCell>
                  <TableCell align="center"><AccessCell v={r.viewer} /></TableCell>
                  <TableCell align="center"><AccessCell v={r.user} /></TableCell>
                  <TableCell align="center"><AccessCell v={r.hrCustody} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.disabled, mt: 1.5, lineHeight: 1.6 }}>
          ✓ = เข้าถึง/แก้ไขได้ · อ่าน = ดูอย่างเดียว (VIEWER เป็นบทบาทอ่านอย่างเดียวสำหรับผู้บริหาร) · — = ไม่เห็นเมนู<br />
          HR_CUSTODY เห็นเมนูเดียวคือ "เครื่องที่รับฝาก" — ค้นเครื่องได้ทุกบริษัทแต่ครั้งละไม่เกิน 25 รายการ และเปิดทะเบียนทรัพย์สินไม่ได้เลย<br />
          USER ไม่เห็นเมนูฝั่งดูแลระบบด้านบนเลย — จะเห็นเมนูของตัวเองแยกต่างหาก 6 รายการ (ยืมทรัพย์สิน, คำขอของฉัน, รายการที่ยืม, คำขอขยายวัน, ประวัติการยืม, ของพร้อมยืม)
        </Typography>
      </SectionCard>
    </Box>
  );
}
