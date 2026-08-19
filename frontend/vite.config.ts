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

// Total commit count on the current branch — a running "build number" that
// climbs by 1 on every deploy, unlike package.json's version (bumped by hand,
// rarely) or the commit hash (unique but not orderable at a glance). Answers
// "how many updates so far" directly. Falls back to '0' outside a git checkout.
function getGitCommitCount(): string {
  try {
    return execSync('git rev-list --count HEAD', { cwd: projectRoot }).toString().trim();
  } catch {
    return '0';
  }
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

// The API's CORS allowlist is pinned to the deployed origins plus :5173, so a
// dev server on any other port (e.g. a second one for design review) gets
// rejected. Present the canonical dev origin to the API instead of widening
// the server's allowlist for a local-only concern. Dev proxy only — `vite
// preview`, which is what production serves, has no proxy and is unaffected.
const DEV_ORIGIN = 'http://localhost:5173';
const devProxyOrigin = (proxy: { on: (e: string, cb: (r: { setHeader: (k: string, v: string) => void }) => void) => void }) => {
  proxy.on('proxyReq', (proxyReq) => proxyReq.setHeader('origin', DEV_ORIGIN));
};

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
      __BUILD_NUMBER__: JSON.stringify(getGitCommitCount()),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    server: {
      // 5173 is the deployment's port (pm2 serves the built app there), so a
      // second dev server started alongside it must be able to take another.
      // Honouring PORT lets the launcher assign one instead of vite silently
      // sliding to the next free number, which is how a stale server ended up
      // squatting on 5174 for two days.
      port: Number(process.env.PORT) || 5173,
      allowedHosts: ['itsm.trrgroup.com', 'itam.trrgroup.com'],
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          configure: devProxyOrigin,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
          configure: devProxyOrigin,
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
