import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, IconButton, Avatar, Chip, InputAdornment, alpha, useTheme } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, borrowAPI } from '../services/api';
import { Eye, EyeOff, Lock, User, Mail, Building2, Building, Shield, CheckCircle2, AlertCircle, Clock, Calendar, Briefcase, History } from 'lucide-react';
import { SectionCard } from '../components/SectionCard';

export default function ProfilePage() {
  const theme = useTheme();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [stats, setStats] = useState({ active: 0, total: 0 });

  useEffect(() => {
    borrowAPI.myItems()
      .then(res => {
        const items = res.data || [];
        const active = items.filter((item: any) => item.itemStatus === 'CheckedOut').length;
        setStats({ active, total: items.length });
      })
      .catch(err => console.error('Error fetching stats:', err));
  }, []);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const roleLabel: Record<string, { label: string; colorKey: 'secondary' | 'info' | 'success' }> = {
    SUPERADMIN: { label: 'Super Admin', colorKey: 'secondary' },
    IT_ADMIN:   { label: 'IT Admin',    colorKey: 'info' },
    USER:       { label: 'ผู้ใช้งาน',  colorKey: 'success' },
  };
  const roleInfo = roleLabel[user?.role || 'USER'];
  const roleColor = theme.palette[roleInfo.colorKey].main;
  const authTypeLabel = (user as any)?.authType === 'LOCAL' ? 'Local Account' : 'Active Directory (AD)';
  const isLocal = (user as any)?.authType === 'LOCAL';

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน', 'err');
      return;
    }
    if (newPassword.length < 8) {
      showToast('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร', 'err');
      return;
    }
    setLoading(true);
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      showToast('✅ เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่', 'err');
    } finally {
      setLoading(false);
    }
  };

  const infoItems = [
    { icon: <User size={16} />, label: 'ชื่อผู้ใช้', value: user?.adUsername || '-' },
    { icon: <User size={16} />, label: 'ชื่อ-สกุล (TH)', value: (user as any)?.thaiName || '-' },
    { icon: <Mail size={16} />, label: 'อีเมล', value: user?.email || '-' },
    { icon: <Building size={16} />, label: 'บริษัท', value: (user as any)?.companyThai || (user as any)?.company || '-' },
    { icon: <Building2 size={16} />, label: 'แผนก', value: user?.department || '-' },
    { icon: <Shield size={16} />, label: 'สิทธิ์การใช้งาน', value: roleInfo.label },
    { icon: <Clock size={16} />, label: 'เข้าสู่ระบบล่าสุด', value: (user as any)?.lastLoginAt ? new Date((user as any).lastLoginAt).toLocaleString('th-TH') : '-' },
    { icon: <Calendar size={16} />, label: 'วันที่สร้างบัญชี', value: (user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString('th-TH') : '-' },
  ];

  return (
    <Box sx={{ maxWidth: 700, margin: '0 auto', padding: '0 8px 80px' }}>

      {/* Toast */}
      {toast && (
        <Box sx={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          bgcolor: toast.type === 'ok' ? theme.palette.text.primary : theme.palette.error.main,
          color: '#fff', padding: '12px 20px', borderRadius: '12px',
          fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          {toast.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </Box>
      )}

      {/* Header */}
      <Box sx={{ mb: 3.5 }}>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: theme.palette.text.primary }}>
          โปรไฟล์ของฉัน
        </Typography>
        <Typography sx={{ mt: 0.5, color: theme.palette.text.secondary, fontSize: '0.875rem' }}>
          ข้อมูลบัญชีผู้ใช้และการตั้งค่า
        </Typography>
      </Box>

      {/* Profile Card */}
      <Box sx={{ mb: 2.5 }}>
        <SectionCard title="ข้อมูลบัญชี" icon={User}>
          {/* Avatar + Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
            <Avatar
              src={(user as any)?.avatarUrl && !imgError ? (user as any).avatarUrl : undefined}
              onError={() => setImgError(true)}
              sx={{
                width: 72, height: 72,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                fontSize: '2rem', fontWeight: 800,
                boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              {(user?.displayName || user?.adUsername || 'U')[0].toUpperCase()}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: theme.palette.text.primary, mb: 0.5 }}>
                {user?.displayName || user?.adUsername}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip label={roleInfo.label} size="small" sx={{ bgcolor: alpha(roleColor, 0.12), color: roleColor, fontWeight: 700 }} />
                <Chip
                  label={`🔑 ${authTypeLabel}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    bgcolor: isLocal ? alpha(theme.palette.warning.main, 0.06) : alpha(theme.palette.info.main, 0.06),
                    color: isLocal ? theme.palette.warning.dark : theme.palette.info.dark,
                    borderColor: isLocal ? alpha(theme.palette.warning.main, 0.3) : alpha(theme.palette.info.main, 0.3),
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Info Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 1.75 }}>
            {infoItems.map((item, i) => (
              <Box key={i} sx={{ bgcolor: theme.palette.background.default, borderRadius: '10px', p: '12px 14px', border: `1px solid ${theme.palette.divider}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: theme.palette.text.secondary, mb: 0.5, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  {item.icon} {item.label}
                </Box>
                <Typography sx={{ fontWeight: 700, color: theme.palette.text.primary, fontSize: '0.9rem', wordBreak: 'break-all' }}>
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Sync Info Note */}
          {!isLocal && (
            <Box sx={{
              mt: 2.5, p: '12px 16px', bgcolor: theme.palette.background.default,
              borderRadius: '10px', border: `1px dashed ${theme.palette.divider}`,
              display: 'flex', gap: 1.25, alignItems: 'flex-start',
            }}>
              <Box component="span" sx={{ fontSize: '1.2rem' }}>ℹ️</Box>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: theme.palette.text.primary, mb: 0.25 }}>การซิงค์ข้อมูลจาก AD</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, lineHeight: 1.5 }}>
                  ข้อมูลบัญชีของคุณจะถูกอัปเดตและดึงมาจากระบบ Active Directory ของบริษัทโดยอัตโนมัติ
                  (ดึงข้อมูลล่าสุด: {(user as any)?.lastLoginAt ? new Date((user as any).lastLoginAt).toLocaleString('th-TH') : '-'})
                </Typography>
              </Box>
            </Box>
          )}
        </SectionCard>
      </Box>

      {/* Stats Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2.5 }}>
        <Box sx={{
          bgcolor: theme.palette.background.paper, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`,
          p: 2, boxShadow: theme.palette.mode === 'dark' ? '0 6px 18px rgba(0,0,0,0.35)' : '0 6px 18px rgba(16,24,40,.06)',
          display: 'flex', alignItems: 'center', gap: 1.75,
        }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '12px',
            bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main, border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Briefcase size={20} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: theme.palette.text.disabled, textTransform: 'uppercase', letterSpacing: '0.05em' }}>กำลังยืมอยู่</Typography>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: theme.palette.text.primary, mt: 0.25 }}>{stats.active} รายการ</Typography>
          </Box>
        </Box>

        <Box sx={{
          bgcolor: theme.palette.background.paper, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`,
          p: 2, boxShadow: theme.palette.mode === 'dark' ? '0 6px 18px rgba(0,0,0,0.35)' : '0 6px 18px rgba(16,24,40,.06)',
          display: 'flex', alignItems: 'center', gap: 1.75,
        }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '12px',
            bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main, border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <History size={20} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: theme.palette.text.disabled, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ยืมทั้งหมด</Typography>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: theme.palette.text.primary, mt: 0.25 }}>{stats.total} รายการ</Typography>
          </Box>
        </Box>
      </Box>

      {/* Change Password Card */}
      <SectionCard title="เปลี่ยนรหัสผ่าน" icon={Lock}>
        <Typography sx={{ mb: 2.5, fontSize: '0.8rem', color: theme.palette.text.secondary }}>
          {isLocal
            ? 'เปลี่ยนรหัสผ่านสำหรับบัญชีนี้'
            : '⚠️ บัญชีของคุณเชื่อมต่อกับ Active Directory (AD) กรุณาเปลี่ยนรหัสผ่านผ่านระบบ AD ของบริษัทแทน'}
        </Typography>

        {isLocal ? (
          <Box component="form" onSubmit={handleChangePassword} sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            <TextField
              label="รหัสผ่านปัจจุบัน"
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              fullWidth
              size="small"
              placeholder="กรอกรหัสผ่านปัจจุบัน"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label="แสดง/ซ่อนรหัสผ่าน" size="small" onClick={() => setShowCurrent(!showCurrent)} edge="end">
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box>
              <TextField
                label="รหัสผ่านใหม่"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                inputProps={{ minLength: 8 }}
                fullWidth
                size="small"
                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 8 ตัว)"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton aria-label="แสดง/ซ่อนรหัสผ่าน" size="small" onClick={() => setShowNew(!showNew)} edge="end">
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Password Strength Meter */}
              {newPassword.length > 0 && (() => {
                let score = 0;
                if (newPassword.length >= 4) score++;
                if (newPassword.length >= 8) score++;
                if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++;
                if (/[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword)) score++;

                const colors = [theme.palette.divider, theme.palette.error.main, theme.palette.warning.main, theme.palette.info.main, theme.palette.success.main];
                const labels = ['อ่อนแอมาก', 'อ่อนแอ', 'ปานกลาง', 'ดี', 'แข็งแกร่ง'];
                const color = colors[score];
                const label = labels[score];

                return (
                  <Box sx={{ mt: 0.75 }}>
                    <Box sx={{ display: 'flex', gap: 0.5, height: 4, mb: 0.5 }}>
                      {[1, 2, 3, 4].map((level) => (
                        <Box key={level} sx={{ flex: 1, borderRadius: '2px', bgcolor: level <= score ? color : theme.palette.divider, transition: 'background 0.3s' }} />
                      ))}
                    </Box>
                    <Typography sx={{ fontSize: '0.7rem', color, fontWeight: 600, textAlign: 'right' }}>
                      ความปลอดภัย: {label}
                    </Typography>
                  </Box>
                );
              })()}
            </Box>

            <Box>
              <TextField
                label="ยืนยันรหัสผ่านใหม่"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                fullWidth
                size="small"
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                error={!!confirmPassword && confirmPassword !== newPassword}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton aria-label="แสดง/ซ่อนรหัสผ่าน" size="small" onClick={() => setShowConfirm(!showConfirm)} edge="end">
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: theme.palette.error.main }}>รหัสผ่านไม่ตรงกัน</Typography>
              )}
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading || !currentPassword || !newPassword || newPassword !== confirmPassword}
              sx={{ py: 1.5, fontWeight: 700, fontSize: '0.95rem' }}
            >
              {loading ? '⏳ กำลังบันทึก...' : '🔒 เปลี่ยนรหัสผ่าน'}
            </Button>
          </Box>
        ) : (
          <Box sx={{
            bgcolor: alpha(theme.palette.info.main, 0.06), border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`, borderRadius: '10px',
            p: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start',
          }}>
            <Box component="span" sx={{ fontSize: '1.5rem' }}>🏢</Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: theme.palette.info.dark, fontSize: '0.9rem', mb: 0.5 }}>
                บัญชี Active Directory (AD)
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary, lineHeight: 1.5 }}>
                รหัสผ่านของบัญชีนี้ถูกจัดการโดย Active Directory ของบริษัท หากต้องการเปลี่ยนรหัสผ่าน กรุณาติดต่อทีม IT หรือเปลี่ยนผ่านระบบ Windows ของบริษัท
              </Typography>
            </Box>
          </Box>
        )}
      </SectionCard>
    </Box>
  );
}
