import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Package, AlertCircle, Loader, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
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
      setError(err.response?.data?.error || 'ล้มเหลว กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน');
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
      setError(err.response?.data?.error || 'การตรวจสอบล้มเหลว');
    } finally {
      setCheckingExpiry(false);
    }
  };

  const toggleForm = () => {
    setIsActive(!isActive);
    setError('');
    setExpiryInfo(null);
  };

  return (
    <div className="login-wrapper">
      {/* Background Elements */}
      <div className="bg-blobs">
        <div className="blob blob-blue" />
        <div className="blob blob-purple" />
      </div>

      <div className={`container-login ${isActive ? 'active' : ''}`} id="container">
        {/* Expiry Check Section (Sign Up Position) */}
        <div className="form-container sign-up">
          <form onSubmit={handleCheckExpiry}>
            <h1 className="form-title">Check Expiry</h1>
            <div className="icon-container">
              <Clock size={40} className="text-primary-dark" />
            </div>
            <span className="form-subtitle">
              Enter your AD credentials to check<br/>when your password expires.
            </span>

            {expiryInfo && (
              <div className={`status-box ${expiryInfo.daysRemaining < 7 ? 'danger' : 'success'}`}>
                <div className="status-title">
                  <Calendar size={18} />
                  {expiryInfo.daysRemaining > 0 ? `${expiryInfo.daysRemaining} Days Left` : 'Expired'}
                </div>
                <p className="status-msg">{expiryInfo.message}</p>
              </div>
            )}

            {error && !expiryInfo && isActive && (
              <div className="error-alert">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <input
              type="text"
              name="username"
              placeholder="AD Username"
              className="premium-input"
              value={expiryData.username}
              onChange={handleExpiryChange}
              required
            />
            <div className="input-group">
              <input
                type={showExpiryPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                className="premium-input"
                value={expiryData.password}
                onChange={handleExpiryChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowExpiryPassword(!showExpiryPassword)}
                className="input-icon-btn"
              >
                {showExpiryPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" disabled={checkingExpiry} className="premium-btn">
              {checkingExpiry ? <Loader size={16} className="spin" /> : 'Check Expiry'}
            </button>
          </form>
        </div>

        {/* Sign In Section */}
        <div className="form-container sign-in">
          <form onSubmit={handleSignIn}>
            <div className="icon-container" style={{ margin: '0.75rem 0' }}>
               {systemSettings?.logoUrl ? (
                 <img src={systemSettings.logoUrl} alt="Logo" style={{ height: '50px', maxWidth: '100%', objectFit: 'contain' }} />
               ) : (
                 <Package size={40} className="text-brand-blue" />
               )}
            </div>
            <h1 className="form-title-large" style={{ marginBottom: '0.25rem' }}>{systemSettings?.systemName || 'AssetHub'}</h1>
            <span className="form-subtitle">{systemSettings?.organizationName || 'Use your AD account to sign in'}</span>

            {error && !isActive && (
              <div className="error-alert">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <input
              type="text"
              name="username"
              placeholder="Username"
              className="premium-input"
              value={signInData.username}
              onChange={handleSignInChange}
              required
            />
            <div className="input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                className="premium-input"
                value={signInData.password}
                onChange={handleSignInChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="input-icon-btn"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" disabled={loading} className="premium-btn mt-large">
              {loading ? <Loader size={16} className="spin" /> : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Toggle Panels */}
        <div className="toggle-wrapper">
          <div className="toggle-main">
            <div className="toggle-panel-content panel-left">
              <h1 className="toggle-title">Need to Login?</h1>
              <p className="toggle-desc">
                Go back to the sign in page to access your assets.
              </p>
              <button className="btn-ghost" onClick={toggleForm}>Sign In</button>
            </div>
            <div className="toggle-panel-content panel-right">
              <h1 className="toggle-title">Check Expiry</h1>
              <p className="toggle-desc">
                Worried about your AD password? Check how many days are left.
              </p>
              <button className="btn-ghost" onClick={toggleForm}>Check Expiry</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
