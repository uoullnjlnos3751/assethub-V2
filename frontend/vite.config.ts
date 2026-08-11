import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

// Short git commit hash at build time — falls back to 'unknown' outside a git
// checkout (e.g. a source-only artifact) so the build never fails because of this.
function getGitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: projectRoot }).toString().trim();
  } catch {
    return 'unknown';
  }
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3000';

  return {
    root: projectRoot,
    plugins: [react()],
    // Baked into the bundle at build time so the running app can always show
    // exactly which build is live — see src/utils/buildInfo.ts.
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __GIT_COMMIT__: JSON.stringify(getGitCommit()),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
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
