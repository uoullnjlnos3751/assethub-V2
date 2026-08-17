import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Avatar, TextField, Select, MenuItem, FormControl, InputLabel, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Snackbar, Alert,
  alpha, useTheme,
} from '@mui/material';
import { Users, Shield, ServerCog, Search, Download, Settings2 } from 'lucide-react';
import * as XLSX from 'xlsx';
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

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [roleDialog, setRoleDialog] = useState<{ open: boolean; user: AppUser | null }>({ open: false, user: null });
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    adminAPI.users({ limit: 500 }).then(r => setUsers(r.data?.data || [])).finally(() => setLoading(false));
  };
  useEffect(() => { fetchUsers(); }, []);

  const activeCount = users.filter(u => u.isActive).length;
  const adCount = users.filter(u => u.authType === 'AD').length;
  const roleCounts: Record<string, number> = {};
  users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

  const departmentOptions = useMemo(
    () => Array.from(new Set(users.map(u => u.department).filter((d): d is string => !!d))).sort(),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      const matchesSearch = !q
        || (u.displayName || '').toLowerCase().includes(q)
        || u.adUsername.toLowerCase().includes(q)
        || (u.email || '').toLowerCase().includes(q);
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesDept = deptFilter === 'ALL' || u.department === deptFilter;
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? u.isActive : !u.isActive);
      return matchesSearch && matchesRole && matchesDept && matchesStatus;
    });
  }, [users, search, roleFilter, deptFilter, statusFilter]);

  const handleOpenRoleDialog = (u: AppUser) => { setRoleDialog({ open: true, user: u }); setNewRole(u.role); };

  const handleUpdateRole = async () => {
    if (!roleDialog.user) return;
    setSaving(true);
    try {
      await adminAPI.updateRole(roleDialog.user.id, newRole);
      setRoleDialog({ open: false, user: null });
      setToast({ msg: `เปลี่ยนบทบาทของ ${roleDialog.user.displayName || roleDialog.user.adUsername} เรียบร้อยแล้ว`, severity: 'success' });
      fetchUsers();
    } catch (err: any) {
      setToast({ msg: err.response?.data?.error || 'เกิดข้อผิดพลาด', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const rows = filteredUsers.map(u => ({
      Username: u.adUsername,
      'ชื่อ - นามสกุล': u.displayName || '',
      อีเมล: u.email || '',
      แผนก: u.department || '',
      บริษัท: u.company || '',
      บทบาท: u.role,
      ที่มา: u.authType,
      สถานะ: u.isActive ? 'ใช้งาน' : 'ปิด',
      เข้าใช้ล่าสุด: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('th-TH') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, `รายชื่อผู้ใช้_${new Date().getTime()}.xlsx`);
  };

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

      {/* Users table — real data, with search/filter and a working permission action */}
      <SectionCard title="รายชื่อผู้ใช้" icon={Users}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.75 }}>
          <TextField
            size="small"
            placeholder="ค้นหาชื่อ, Username หรืออีเมล..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <Search size={15} style={{ marginRight: 8, opacity: 0.6 }} /> }}
            sx={{ flex: '1 1 240px', minWidth: 200, '& .MuiOutlinedInput-root': { fontSize: '0.8rem' } }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} sx={{ fontSize: '0.8rem' }}>
              <MenuItem value="ALL" sx={{ fontSize: '0.8rem' }}>ทุกบทบาท</MenuItem>
              {CANONICAL_ROLES.map(r => <MenuItem key={r.code} value={r.code} sx={{ fontSize: '0.8rem' }}>{r.code}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} sx={{ fontSize: '0.8rem' }}>
              <MenuItem value="ALL" sx={{ fontSize: '0.8rem' }}>ทุกแผนก</MenuItem>
              {departmentOptions.map(d => <MenuItem key={d} value={d} sx={{ fontSize: '0.8rem' }}>{d}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ fontSize: '0.8rem' }}>
              <MenuItem value="ALL" sx={{ fontSize: '0.8rem' }}>ทุกสถานะ</MenuItem>
              <MenuItem value="ACTIVE" sx={{ fontSize: '0.8rem' }}>ใช้งาน</MenuItem>
              <MenuItem value="INACTIVE" sx={{ fontSize: '0.8rem' }}>ปิด</MenuItem>
            </Select>
          </FormControl>
          <Button size="small" variant="outlined" startIcon={<Download size={14} />} onClick={handleExport} sx={{ fontSize: '0.75rem', textTransform: 'none' }}>
            ส่งออกรายชื่อ
          </Button>
        </Box>

        <TableContainer>
          {loading ? (
            <Box sx={{ py: 4, textAlign: 'center', fontSize: 13, color: theme.palette.text.disabled }}>⏳ กำลังโหลด...</Box>
          ) : filteredUsers.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', fontSize: 13, color: theme.palette.text.disabled }}>ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข</Box>
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
                  <TableCell align="right">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.slice(0, 30).map(u => (
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
                    <TableCell align="right">
                      <Button
                        size="small" variant="outlined" startIcon={<Settings2 size={13} />}
                        onClick={() => handleOpenRoleDialog(u)}
                        sx={{ fontSize: '0.68rem', textTransform: 'none', minWidth: 0, px: 1.2, borderColor: 'divider', color: 'text.secondary' }}
                      >
                        ตั้งค่าสิทธิ์
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
        {filteredUsers.length > 30 && (
          <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.disabled, mt: 1, textAlign: 'right' }}>
            แสดง 30/{filteredUsers.length} รายการที่ตรงเงื่อนไข — จัดการผู้ใช้ทั้งหมดได้ที่เมนู "จัดการผู้ใช้งาน"
          </Typography>
        )}
      </SectionCard>

      {/* Role change dialog — real, calls the same API as จัดการผู้ใช้งาน */}
      <Dialog open={roleDialog.open} onClose={() => setRoleDialog({ open: false, user: null })} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
          ตั้งค่าสิทธิ์: {roleDialog.user?.displayName || roleDialog.user?.adUsername}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>บทบาท</InputLabel>
            <Select value={newRole} label="บทบาท" onChange={e => setNewRole(e.target.value)}>
              {CANONICAL_ROLES.filter(r => r.live).map(r => (
                <MenuItem key={r.code} value={r.code}>{r.code} — {r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRoleDialog({ open: false, user: null })} sx={{ borderRadius: '8px', textTransform: 'none' }}>ยกเลิก</Button>
          <Button
            variant="contained" onClick={handleUpdateRole} disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast?.severity} variant="filled" onClose={() => setToast(null)}>{toast?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
