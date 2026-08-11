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
  loading: boolean;
  systemSettings: SystemSettings | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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

  // Auth now rides on an httpOnly session cookie instead of a token kept in
  // localStorage (closes the XSS path where a script could read the token
  // directly). There is nothing left in JS to check for a session, so this
  // asks the backend directly on every load; the browser sends the cookie
  // automatically if one exists. A 401 here just means "not logged in" — see
  // SILENT_401_PATHS in services/api.ts, which keeps this call from
  // triggering the global redirect-to-login or error toast.
  useEffect(() => {
    authAPI.me()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await authAPI.login(username, password);
    // The backend also sets the session cookie on this response (Set-Cookie);
    // the browser stores it, nothing to do here beyond updating UI state.
    setUser(res.data.user);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      // Clear local UI state regardless — worst case the cookie outlives the
      // React state until it expires on its own, but the user is logged out
      // of this tab either way.
      console.error('Logout request failed:', err);
    }
    setUser(null);
  };

  // Auto Logout after 30 minutes of inactivity
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      if (user) {
        timeoutId = setTimeout(() => {
          logout();
          alert('หมดเวลาการใช้งานในระบบ (Session Expired) กรุณาเข้าสู่ระบบใหม่');
        }, 30 * 60 * 1000); // 30 minutes
      }
    };

    if (user) {
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
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, systemSettings, login, logout, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
