import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/en-gb'; // en-gb uses DD/MM/YYYY format
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { ThemeContextProvider } from './contexts/ThemeContext';
import './styles/pm-theme.css';
import App from './App';

// Auto-reload on chunk load failures (SPA deployment sync) [build: 2026-07-19]
//
// A tab left open across a deploy still has the old build's chunk filenames
// in memory; the next lazy import 404s against the new dist/ once the old
// hashed files are gone. Chrome phrases this "Failed to fetch dynamically
// imported module", Firefox "error loading dynamically imported module" —
// matching only the Chrome string (as this used to) left Firefox users
// stuck on the broken error instead of getting reloaded onto the current
// build. One shared case-insensitive check now covers both.
//
// Guarded against looping: if the reload itself lands on a build that still
// fails (a real outage, not a stale chunk), retrying forever would just
// hammer the server instead of surfacing the actual problem. The guard only
// needs to survive the few seconds a reload takes — cleared once the fresh
// load has been up a while, so a genuinely new stale-chunk failure hours or
// days later (another deploy, same tab still open) still gets its own reload.
const CHUNK_FAILURE = /dynamically imported module/i;
const reloadOnceForStaleChunk = () => {
  if (sessionStorage.getItem('chunkReload')) return;
  sessionStorage.setItem('chunkReload', '1');
  window.location.reload();
};
window.addEventListener('load', () => setTimeout(() => sessionStorage.removeItem('chunkReload'), 5000));

window.addEventListener('error', (e) => {
  if (e.message && CHUNK_FAILURE.test(e.message)) {
    reloadOnceForStaleChunk();
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && CHUNK_FAILURE.test(String(e.reason))) {
    reloadOnceForStaleChunk();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
        <ThemeContextProvider>
          <AuthProvider>
            <ToastProvider>
              <ConfirmProvider>
                <App />
              </ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeContextProvider>
      </LocalizationProvider>
    </BrowserRouter>
  </React.StrictMode>
);
