import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Package, AlertCircle, Loader, Calendar, Clock, Laptop, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { extractApiError } from '../utils/errorHandler';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, systemSettings } = useAuth();
  
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingExpiry, setCheckingExpiry] = useState(false);
  const [error, setError] = useState('');
  const [expiryInfo, setExpiryInfo] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showExpiryPassword, setShowExpiryPassword] = useState(false);

  const [signInData, setSignInData] = useState({ username: '', password: '' });
  const [expiryData, setExpiryData] = useState({ username: '', password: '' });

  const handleSignInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignInData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setExpiryData(prev => ({ ...prev, [name]: value }));
    setError('');
    setExpiryInfo(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInData.username || !signInData.password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(signInData.username, signInData.password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(extractApiError(err, 'ล้มเหลว กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckExpiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expiryData.username || !expiryData.password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    setCheckingExpiry(true);
    setError('');
    setExpiryInfo(null);
    try {
      const res = await authAPI.checkExpiry(expiryData.username, expiryData.password);
      setExpiryInfo(res.data);
    } catch (err: any) {
      console.error('Check expiry error:', err);
      setError(extractApiError(err, 'การตรวจสอบล้มเหลว'));
    } finally {
      setCheckingExpiry(false);
    }
  };

  const toggleForm = (expiry: boolean) => {
    setIsActive(expiry);
    setError('');
    setExpiryInfo(null);
  };

  return (
    <div className="login-wrapper">
      {/* ── HERO (desktop only) ─────────────────────────────────────── */}
      <aside className="hero-banner">
        <div className="hero-grid"></div>

        <div className="brand">
          <div className="brand-mark">
            <Laptop size={18} />
          </div>
          <div>
            <span className="brand-word">{systemSettings?.systemName || 'ITAM'}</span>
            <span className="brand-eyebrow">TRR Group · IT Asset Management</span>
          </div>
        </div>

        <div className="hero-body">
          <p className="hero-kicker">ระบบยืม–คืนอุปกรณ์ไอที</p>
          <h1 className="hero-title">ดูแลทุกชิ้นส่วนไอที<br />ให้เป็นระเบียบ <em>อย่างมืออาชีพ</em></h1>
          <p className="hero-desc">
            ขอยืม ติดตาม และคืนอุปกรณ์ไอทีของพนักงาน TRR Group ได้ในที่เดียว
            เชื่อมต่อบัญชี Office 365 ของบริษัท พร้อมระบบอนุมัติและแจ้งเตือนแบบเรียลไทม์
          </p>

          <div className="hero-features">
            <div className="hero-feature">
              <div className="hero-feature-icon">
                <Laptop size={16} />
              </div>
              <div>
                <div className="hero-feature-title">ขอยืมอุปกรณ์ใน 3 ขั้นตอน</div>
                <div className="hero-feature-desc">เลือกอุปกรณ์ ระบุเหตุผล รออนุมัติ — จบในหน้าเดียว</div>
              </div>
            </div>
            <div className="hero-feature">
              <div className="hero-feature-icon">
                <ShieldCheck size={16} />
              </div>
              <div>
                <div className="hero-feature-title">ใช้งานได้ทุกอุปกรณ์</div>
                <div className="hero-feature-desc">ออกแบบให้ใช้งานลื่นไหลทั้งบนมือถือและคอมพิวเตอร์</div>
              </div>
            </div>
            <div className="hero-feature">
              <div className="hero-feature-icon">
                <Clock size={16} />
              </div>
              <div>
                <div className="hero-feature-title">เช็ควันหมดอายุรหัสผ่าน AD</div>
                <div className="hero-feature-desc">รู้ล่วงหน้าก่อนบัญชีจะถูกล็อก ไม่ต้องรอ IT แจ้ง</div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-footer">&copy; {new Date().getFullYear() + 543} TRR Group IT Support · สงวนลิขสิทธิ์ทุกประการ</div>
      </aside>

      {/* ── FORM PANEL ─────────────────────────────────────────── */}
      <main className="form-wrapper-panel">
        <div className="card-wrap">

          <div className="mobile-brand">
            <div className="brand-mark">
              <Laptop size={16} />
            </div>
            <span className="brand-word">{systemSettings?.systemName || 'ITAM'}</span>
          </div>

          <div className="form-main-card">
            <div className="segmented" role="tablist">
              <button 
                type="button" 
                className={!isActive ? 'active' : ''} 
                role="tab" 
                aria-selected={!isActive}
                onClick={() => toggleForm(false)}
              >
                เข้าสู่ระบบ
              </button>
              <button 
                type="button" 
                className={isActive ? 'active' : ''} 
                role="tab" 
                aria-selected={isActive}
                onClick={() => toggleForm(true)}
              >
                เช็ควันหมดอายุรหัสผ่าน
              </button>
            </div>

            {/* SIGN IN VIEW */}
            {!isActive && (
              <div id="view-signin" className="animate-fade-in">
                <div className="card-head">
                  {systemSettings?.logoUrl ? (
                    <div className="card-logo-wrap" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.2rem' }}>
                      <img src={systemSettings.logoUrl} alt="Logo" style={{ height: '48px', maxWidth: '200px', objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <div className="card-icon">
                      <Lock size={18} />
                    </div>
                  )}
                  <h2 className="card-title">ยินดีต้อนรับกลับมา</h2>
                  <p className="card-sub">{systemSettings?.organizationName || 'เข้าสู่ระบบด้วยบัญชี AD (Office 365) ของบริษัท'}</p>
                </div>

                {error && (
                  <div className="error-alert">
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSignIn} className="login-form">
                  <div className="field">
                    <label htmlFor="si-user">ชื่อผู้ใช้ (AD Username)</label>
                    <input 
                      type="text" 
                      id="si-user" 
                      name="username"
                      placeholder="somchai.jai" 
                      value={signInData.username}
                      onChange={handleSignInChange}
                      required 
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="si-pass">รหัสผ่าน</label>
                    <div className="field-input-wrap">
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        id="si-pass" 
                        name="password"
                        placeholder="••••••••" 
                        value={signInData.password}
                        onChange={handleSignInChange}
                        required 
                      />
                      <button 
                        type="button" 
                        className="eye-btn" 
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="premium-btn">
                    {loading && <Loader size={15} className="spin" />}
                    <span className="btn-label">{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</span>
                  </button>
                </form>
              </div>
            )}

            {/* EXPIRY CHECK VIEW */}
            {isActive && (
              <div id="view-expiry" className="animate-fade-in">
                <div className="card-head">
                  <div className="card-icon">
                    <Clock size={18} />
                  </div>
                  <h2 className="card-title">เช็ควันหมดอายุรหัสผ่าน</h2>
                  <p className="card-sub">กรอกบัญชี AD เพื่อตรวจสอบว่ารหัสผ่านจะหมดอายุเมื่อใด</p>
                </div>

                {expiryInfo && (
                  <div className={`status-box ${expiryInfo.daysRemaining < 7 ? 'danger' : 'success'}`}>
                    {expiryInfo.daysRemaining < 7 ? <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} /> : <Clock size={16} style={{ flexShrink: 0, marginTop: '2px' }} />}
                    <div>
                      <strong>
                        {expiryInfo.daysRemaining > 0 
                          ? `เหลืออีก ${expiryInfo.daysRemaining} วัน` 
                          : 'หมดอายุแล้ว'}
                      </strong>
                      {expiryInfo.message}
                    </div>
                  </div>
                )}

                {error && !expiryInfo && (
                  <div className="error-alert">
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    {error}
                  </div>
                )}

                <form onSubmit={handleCheckExpiry} className="login-form">
                  <div className="field">
                    <label htmlFor="ex-user">ชื่อผู้ใช้ (AD Username)</label>
                    <input 
                      type="text" 
                      id="ex-user" 
                      name="username"
                      placeholder="somchai.jai" 
                      value={expiryData.username}
                      onChange={handleExpiryChange}
                      required 
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="ex-pass">รหัสผ่าน</label>
                    <div className="field-input-wrap">
                      <input 
                        type={showExpiryPassword ? 'text' : 'password'} 
                        id="ex-pass" 
                        name="password"
                        placeholder="••••••••" 
                        value={expiryData.password}
                        onChange={handleExpiryChange}
                        required 
                      />
                      <button 
                        type="button" 
                        className="eye-btn" 
                        onClick={() => setShowExpiryPassword(!showExpiryPassword)}
                      >
                        {showExpiryPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={checkingExpiry} className="premium-btn">
                    {checkingExpiry && <Loader size={15} className="spin" />}
                    <span className="btn-label">{checkingExpiry ? 'กำลังตรวจสอบ...' : 'ตรวจสอบวันหมดอายุ'}</span>
                  </button>
                </form>
              </div>
            )}

            <div className="info-box">
              <div className="info-head">
                <Lock size={14} />
                คำแนะนำในการเข้าใช้งาน
              </div>
              กรุณาใช้บัญชี Office 365 ของบริษัทเท่านั้น เช่น <code>somchai.jai</code> (ชื่อ.นามสกุล 3 ตัวอักษร)
            </div>

            <div className="form-card-footer">
              พบปัญหาการเข้าใช้งาน? ติดต่อ <a href="mailto:HQITSupport@trrgroup.com">IT Support</a>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
