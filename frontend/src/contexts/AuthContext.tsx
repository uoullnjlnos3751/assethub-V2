import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';

interface User {
  id: number;
  adUsername: string;
  displayName: string | null;
  email: string | null;
  department: string | null;
  company: string | null;
  companyThai: string | null;
  avatarUrl: string | null;
  role: string;
}

interface SystemSettings {
  systemName: string;
  organizationName: string;
  logoUrl: string | null;
  timezone: string;
  showWelcomeBanner: boolean;
  allowExtension: boolean;
  maxExtensionsPerRequest: number;
  maxBorrowDays: number;
  borrowDays: number;
  maxItemsPerRequest: number;
  overdueWarningDays: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  systemSettings: SystemSettings | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  const refreshSettings = async () => {
    try {
      const res = await authAPI.publicSettings();
      setSystemSettings(res.data);
    } catch (err) {
      console.error('Failed to load system settings:', err);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  useEffect(() => {
    if (token) {
      authAPI.me()
        .then((res) => setUser(res.data))
        .catch(() => { localStorage.removeItem('token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    const res = await authAPI.login(username, password);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // Auto Logout after 30 minutes of inactivity
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      if (token) {
        timeoutId = setTimeout(() => {
          logout();
          alert('หมดเวลาการใช้งานในระบบ (Session Expired) กรุณาเข้าสู่ระบบใหม่');
        }, 30 * 60 * 1000); // 30 minutes
      }
    };

    if (token) {
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('scroll', resetTimer);
      window.addEventListener('click', resetTimer);
      resetTimer();
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, systemSettings, login, logout, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
