import { createApp } from './app';
import { startNotificationWorker } from './services/notification';
import { startOverdueChecker } from './jobs/overdueChecker';
import { startAutoBackup } from './services/backup';
import { validateProductionEnv } from './config/env';

validateProductionEnv();

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startNotificationWorker();
  startOverdueChecker();
  startAutoBackup();
});
