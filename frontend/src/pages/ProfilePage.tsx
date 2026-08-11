import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, borrowAPI } from '../services/api';
import { Eye, EyeOff, Lock, User, Mail, Building2, Building, Shield, CheckCircle2, AlertCircle, Clock, Calendar, Briefcase, History } from 'lucide-react';

export default function ProfilePage() {
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

  const roleLabel: Record<string, { label: string; color: string; bg: string }> = {
    SUPERADMIN: { label: 'Super Admin', color: '#7c3aed', bg: '#f3e8ff' },
    IT_ADMIN:   { label: 'IT Admin',    color: '#0369a1', bg: '#e0f2fe' },
    USER:       { label: 'ผู้ใช้งาน',  color: '#065f46', bg: '#d1fae5' },
  };
  const roleInfo = roleLabel[user?.role || 'USER'];
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

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 8px 80px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.type === 'ok' ? '#0f172a' : '#dc2626',
          color: '#fff', padding: '12px 20px', borderRadius: 12,
          fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 10
        }}>
          {toast.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
          โปรไฟล์ของฉัน
        </h2>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>
          ข้อมูลบัญชีผู้ใช้และการตั้งค่า
        </p>
      </div>

      {/* Profile Card */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
        padding: '28px 28px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: 20
      }}>
        {/* Avatar + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 800, color: '#fff', flexShrink: 0,
            boxShadow: '0 4px 16px rgba(14,165,233,0.3)',
            overflow: 'hidden'
          }}>
            {((user as any)?.avatarUrl && !imgError) ? (
              <img 
                src={(user as any).avatarUrl} 
                alt="Profile" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setImgError(true)}
              />
            ) : (
              (user?.displayName || user?.adUsername || 'U')[0].toUpperCase()
            )}
          </div>
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
              {user?.displayName || user?.adUsername}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                background: roleInfo.bg, color: roleInfo.color,
                borderRadius: 20, padding: '3px 12px', fontSize: '0.78rem', fontWeight: 700
              }}>{roleInfo.label}</span>
              <span style={{
                background: isLocal ? '#fff7ed' : '#f0f9ff',
                color: isLocal ? '#c2410c' : '#0369a1',
                borderRadius: 20, padding: '3px 12px', fontSize: '0.78rem', fontWeight: 600,
                border: `1px solid ${isLocal ? '#fed7aa' : '#bae6fd'}`
              }}>🔑 {authTypeLabel}</span>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
          {[
            { icon: <User size={16} />, label: 'ชื่อผู้ใช้', value: user?.adUsername || '-' },
            { icon: <User size={16} />, label: 'ชื่อ-สกุล (TH)', value: (user as any)?.thaiName || '-' },
            { icon: <Mail size={16} />, label: 'อีเมล', value: user?.email || '-' },
            { icon: <Building size={16} />, label: 'บริษัท', value: (user as any)?.companyThai || (user as any)?.company || '-' },
            { icon: <Building2 size={16} />, label: 'แผนก', value: user?.department || '-' },
            { icon: <Shield size={16} />, label: 'สิทธิ์การใช้งาน', value: roleInfo.label },
            { icon: <Clock size={16} />, label: 'เข้าสู่ระบบล่าสุด', value: (user as any)?.lastLoginAt ? new Date((user as any).lastLoginAt).toLocaleString('th-TH') : '-' },
            { icon: <Calendar size={16} />, label: 'วันที่สร้างบัญชี', value: (user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString('th-TH') : '-' },
          ].map((item, i) => (
            <div key={i} style={{
              background: '#f8fafc', borderRadius: 10, padding: '12px 14px',
              border: '1px solid #f1f5f9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', marginBottom: 4, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                {item.icon} {item.label}
              </div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Sync Info Note */}
        {!isLocal && (
          <div style={{
            marginTop: 20, padding: '12px 16px', background: '#f8fafc',
            borderRadius: 10, border: '1px dashed #cbd5e1',
            display: 'flex', gap: 10, alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 2 }}>การซิงค์ข้อมูลจาก AD</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
                ข้อมูลบัญชีของคุณจะถูกอัปเดตและดึงมาจากระบบ Active Directory ของบริษัทโดยอัตโนมัติ 
                (ดึงข้อมูลล่าสุด: {(user as any)?.lastLoginAt ? new Date((user as any).lastLoginAt).toLocaleString('th-TH') : '-'})
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
        marginBottom: 20
      }}>
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
          display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Briefcase size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>กำลังยืมอยู่</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginTop: 2 }}>{stats.active} รายการ</div>
          </div>
        </div>

        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
          display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <History size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ยืมทั้งหมด</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginTop: 2 }}>{stats.total} รายการ</div>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
        padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock size={18} style={{ color: '#0ea5e9' }} /> เปลี่ยนรหัสผ่าน
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: '#64748b' }}>
          {isLocal
            ? 'เปลี่ยนรหัสผ่านสำหรับบัญชีนี้'
            : '⚠️ บัญชีของคุณเชื่อมต่อกับ Active Directory (AD) กรุณาเปลี่ยนรหัสผ่านผ่านระบบ AD ของบริษัทแทน'}
        </p>

        {isLocal ? (
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Current Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                รหัสผ่านปัจจุบัน
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  placeholder="กรอกรหัสผ่านปัจจุบัน"
                  style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                รหัสผ่านใหม่
              </label>
              <div style={{ position: 'relative', marginBottom: 6 }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 8 ตัว)"
                  style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
                <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {/* Password Strength Meter */}
              {newPassword.length > 0 && (() => {
                let score = 0;
                if (newPassword.length >= 4) score++;
                if (newPassword.length >= 8) score++;
                if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++;
                if (/[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword)) score++;
                
                const colors = ['#e2e8f0', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
                const labels = ['อ่อนแอมาก', 'อ่อนแอ', 'ปานกลาง', 'ดี', 'แข็งแกร่ง'];
                const color = colors[score];
                const label = labels[score];

                return (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 4, height: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4].map((level) => (
                        <div key={level} style={{ flex: 1, borderRadius: 2, background: level <= score ? color : '#e2e8f0', transition: 'background 0.3s' }} />
                      ))}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: color, fontWeight: 600, textAlign: 'right' }}>
                      ความปลอดภัย: {label}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                ยืนยันรหัสผ่านใหม่
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  style={{
                    width: '100%', padding: '10px 40px 10px 12px', borderRadius: 8,
                    border: `1px solid ${confirmPassword && confirmPassword !== newPassword ? '#ef4444' : '#e2e8f0'}`,
                    fontSize: '0.9rem', boxSizing: 'border-box'
                  }}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#ef4444' }}>รหัสผ่านไม่ตรงกัน</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !currentPassword || !newPassword || newPassword !== confirmPassword}
              style={{
                padding: '12px', borderRadius: 10, border: 'none',
                background: loading || !currentPassword || !newPassword || newPassword !== confirmPassword
                  ? '#e2e8f0' : 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                color: loading || !currentPassword || !newPassword || newPassword !== confirmPassword ? '#94a3b8' : '#fff',
                fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              {loading ? '⏳ กำลังบันทึก...' : '🔒 เปลี่ยนรหัสผ่าน'}
            </button>
          </form>
        ) : (
          <div style={{
            background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10,
            padding: '16px', display: 'flex', gap: 12, alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: '1.5rem' }}>🏢</span>
            <div>
              <div style={{ fontWeight: 700, color: '#0369a1', fontSize: '0.9rem', marginBottom: 4 }}>
                บัญชี Active Directory (AD)
              </div>
              <div style={{ fontSize: '0.8rem', color: '#0c4a6e', lineHeight: 1.5 }}>
                รหัสผ่านของบัญชีนี้ถูกจัดการโดย Active Directory ของบริษัท หากต้องการเปลี่ยนรหัสผ่าน กรุณาติดต่อทีม IT หรือเปลี่ยนผ่านระบบ Windows ของบริษัท
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
