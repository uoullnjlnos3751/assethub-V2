import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Avatar, alpha, useTheme,
} from '@mui/material';
import { Users, Shield, ServerCog } from 'lucide-react';
import { adminAPI } from '../../../services/api';
import { SectionCard } from '../../../components/SectionCard';

interface AppUser {
  id: number;
  adUsername: string;
  displayName?: string | null;
  email?: string | null;
  department?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  role: string;
  isActive: boolean;
  authType: string;
  lastLoginAt?: string | null;
}

const CANONICAL_ROLES = [
  { code: 'SUPERADMIN', label: 'ผู้ดูแลระบบ', desc: 'เข้าถึงทุกเมนูรวมการตั้งค่า', live: true },
  { code: 'IT_ADMIN', label: 'ผู้ดูแลทรัพย์สิน', desc: 'ทำงานได้ทุกเมนูยกเว้นตั้งค่า', live: true },
  { code: 'APPROVER', label: 'ผู้อนุมัติ', desc: 'อนุมัติคำขอยืมและตัดจำหน่าย', live: false },
  { code: 'VIEWER', label: 'ผู้ดูรายงาน', desc: 'อ่านอย่างเดียว ส่งออกได้', live: true },
  { code: 'USER', label: 'พนักงานทั่วไป', desc: 'ดูของตัวเองและแจ้งซ่อม', live: true },
  { code: 'VENDOR', label: 'ผู้ขาย/ผู้รับเหมา', desc: 'เห็นเฉพาะงานที่ได้รับมอบหมาย', live: false },
];

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  const theme = useTheme();
  return (
    <Box sx={{ flex: '1 1 130px', minWidth: 130, borderRadius: '14px', p: '12px 14px', bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
      <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color, lineHeight: 1.3 }}>{value}</Typography>
      <Typography sx={{ fontSize: '0.65rem', color: theme.palette.text.disabled }}>{sub}</Typography>
    </Box>
  );
}

export default function UsersPermissionsTab() {
  const theme = useTheme();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.users({ limit: 200 }).then(r => setUsers(r.data?.data || [])).finally(() => setLoading(false));
  }, []);

  const activeCount = users.filter(u => u.isActive).length;
  const adCount = users.filter(u => u.authType === 'AD').length;
  const roleCounts: Record<string, number> = {};
  users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

      {/* KPI strip — real data */}
      <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
        <KpiCard label="ผู้ใช้ทั้งหมด" value={users.length} sub="ในระบบ ITAM" color={theme.palette.primary.main} />
        <KpiCard label="ใช้งานอยู่" value={activeCount} sub={`${users.length ? Math.round(activeCount / users.length * 100) : 0}% ของทั้งหมด`} color={theme.palette.success.main} />
        <KpiCard label="เข้าสู่ระบบผ่าน AD" value={adCount} sub="บัญชี AD" color={theme.palette.info.main} />
        <KpiCard label="บัญชี Local" value={users.length - adCount} sub="ไม่ผูก AD" color={theme.palette.warning.main} />
      </Box>

      {/* AD connection card — clearly a preview, not live status */}
      <SectionCard title="การเชื่อมต่อ Active Directory" icon={ServerCog}>
        <Box sx={{
          borderRadius: '12px', p: 1.75,
          bgcolor: alpha(theme.palette.info.main, 0.05),
          border: `1px dashed ${alpha(theme.palette.info.main, 0.35)}`,
        }}>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: theme.palette.info.dark, mb: 0.5 }}>
            📘 ตัวอย่างการเชื่อมต่อ AD แบบเต็มรูปแบบ — ยังไม่เปิดใช้งานจริง
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: theme.palette.text.secondary, lineHeight: 1.7 }}>
            ปัจจุบันระบบดึงข้อมูลผู้ใช้จาก AD เฉพาะตอนล็อกอิน (6 ฟิลด์: ชื่อ-นามสกุล, อีเมล, แผนก, บริษัท, ชื่อไทย, รูปโปรไฟล์)
            และยังไม่มีการซิงก์ตามตารางเวลาอัตโนมัติ — ต้องกดปุ่มซิงก์เองในหน้าจัดการแผนก/บริษัท
            การจับคู่ฟิลด์ AD ครบ 12 ฟิลด์ + บทบาทผูกกลุ่ม AD อัตโนมัติ + ประวัติการซิงก์ ยังเป็นแผนงานในอนาคต
          </Typography>
        </Box>
      </SectionCard>

      {/* Roles — canonical 6, real counts where the role actually exists */}
      <SectionCard title="บทบาทในระบบ" icon={Shield}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>บทบาท</TableCell>
                <TableCell>คำอธิบาย</TableCell>
                <TableCell align="right">จำนวนผู้ใช้</TableCell>
                <TableCell align="center">สถานะ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {CANONICAL_ROLES.map(r => (
                <TableRow key={r.code} hover>
                  <TableCell>
                    <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: theme.palette.primary.dark, bgcolor: alpha(theme.palette.primary.main, 0.08), px: '7px', py: '2px', borderRadius: '5px' }}>
                      {r.code}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{r.label}</Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: theme.palette.text.disabled }}>{r.desc}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: r.live ? theme.palette.text.primary : theme.palette.text.disabled }}>
                      {r.live ? (roleCounts[r.code] || 0) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {r.live ? (
                      <Chip size="small" label="ใช้งานอยู่" sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.dark, border: `1px solid ${alpha(theme.palette.success.main, 0.3)}` }} />
                    ) : (
                      <Chip size="small" label="ยังไม่เปิดใช้งาน" sx={{ bgcolor: theme.palette.background.default, color: theme.palette.text.disabled, border: `1px solid ${theme.palette.divider}` }} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

      {/* Users table — real data */}
      <SectionCard title="รายชื่อผู้ใช้" icon={Users}>
        <TableContainer>
          {loading ? (
            <Box sx={{ py: 4, textAlign: 'center', fontSize: 13, color: theme.palette.text.disabled }}>⏳ กำลังโหลด...</Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ผู้ใช้</TableCell>
                  <TableCell>แผนก</TableCell>
                  <TableCell>บริษัท</TableCell>
                  <TableCell>บทบาท</TableCell>
                  <TableCell>ที่มา</TableCell>
                  <TableCell>เข้าใช้ล่าสุด</TableCell>
                  <TableCell align="center">สถานะ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.slice(0, 30).map(u => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar src={u.avatarUrl || undefined} sx={{ width: 26, height: 26, fontSize: '0.65rem' }}>
                          {(u.displayName || u.adUsername).charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{u.displayName || u.adUsername}</Typography>
                          <Typography sx={{ fontSize: '0.65rem', color: theme.palette.text.disabled }}>{u.adUsername}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.72rem' }}>{u.department || '—'}</Typography></TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.72rem' }}>{u.company || '—'}</Typography></TableCell>
                    <TableCell>
                      <Chip size="small" label={u.role} sx={{ fontSize: '0.65rem', fontFamily: 'monospace' }} />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary }}>
                        {u.authType === 'AD' ? '🔒 จาก AD' : 'Local'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary }}>
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('th-TH') : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={u.isActive ? 'ใช้งาน' : 'ปิด'} sx={u.isActive ? {
                        bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.dark,
                      } : {
                        bgcolor: theme.palette.background.default, color: theme.palette.text.disabled,
                      }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
        {users.length > 30 && (
          <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.disabled, mt: 1, textAlign: 'right' }}>
            แสดง 30/{users.length} รายการ — จัดการผู้ใช้ทั้งหมดได้ที่เมนู "จัดการผู้ใช้งาน"
          </Typography>
        )}
      </SectionCard>
    </Box>
  );
}
