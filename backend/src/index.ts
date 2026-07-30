import { createApp } from './app';
import { startNotificationWorker } from './services/notification';
import { startOverdueChecker } from './jobs/overdueChecker';
import { startAutoBackup } from './services/backup';
import { validateProductionEnv } from './config/env';
import { prisma } from './lib/prisma';

validateProductionEnv();

const app = createApp();
const PORT = process.env.PORT || 4000;

const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startNotificationWorker();
  startOverdueChecker();
  startAutoBackup();
});

let shuttingDown = false;

async function shutdown(reason: string, exitCode: number): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Shutting down (${reason})...`);

  // Stop accepting new connections, then drain in-flight requests.
  const closed = new Promise<void>((resolve) => server.close(() => resolve()));
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 10_000));
  await Promise.race([closed, timeout]);

  try {
    await prisma.$disconnect();
  } catch (err) {
    console.error('Error disconnecting Prisma:', err);
  }

  process.exit(exitCode);
}

// An uncaught exception leaves the process in an undefined state: the Prisma
// pool or a background job may be broken while /api/health still returns ok,
// so Docker would never restart it. Log, drain, and exit non-zero instead —
// `restart: unless-stopped` then brings up a clean process.
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  void shutdown('uncaughtException', 1);
});

// Kept log-only on purpose: a rejected promise in a background job should not
// take the whole server down and risk a restart loop. Revisit if these start
// showing up in logs — each one is a bug worth fixing at the source.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('SIGTERM', () => void shutdown('SIGTERM', 0));
process.on('SIGINT', () => void shutdown('SIGINT', 0));
