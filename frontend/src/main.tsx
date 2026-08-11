import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/en-gb'; // en-gb uses DD/MM/YYYY format
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeContextProvider } from './contexts/ThemeContext';
import './styles/pm-theme.css';
import App from './App';

// Auto-reload on chunk load failures (SPA deployment sync) [build: 2026-07-19]
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('Failed to fetch dynamically imported module')) {
    window.location.reload();
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && String(e.reason).includes('Failed to fetch dynamically imported module')) {
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
        <ThemeContextProvider>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </ThemeContextProvider>
      </LocalizationProvider>
    </BrowserRouter>
  </React.StrictMode>
);
