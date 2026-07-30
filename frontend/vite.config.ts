import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3000';

  return {
    root: projectRoot,
    plugins: [react()],
    server: {
      port: 5173,
      allowedHosts: ['itsm.trrgroup.com', 'itam.trrgroup.com'],
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      allowedHosts: ['itsm.trrgroup.com', 'itam.trrgroup.com'],
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
            charts: ['recharts'],
            spreadsheet: ['xlsx'],
            pdf: ['jspdf'],
            capture: ['html2canvas'],
            scanners: ['html5-qrcode', 'react-qr-code'],
          },
        },
      },
    },
  };
});
