import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export function startAutoBackup() {
  const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Check every hour. If it's 2 AM, run backup.
  setInterval(() => {
    const now = new Date();
    // Run backup at 2 AM
    if (now.getHours() === 2) {
      performBackup(BACKUP_DIR);
    }
  }, 60 * 60 * 1000);

  console.log('Database auto-backup scheduled (runs at 2:00 AM daily)');
}

export function performBackup(backupDir?: string) {
  const dir = backupDir || path.join(__dirname, '..', '..', 'backups');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
  const filename = `assethub_backup_${timestamp}.sql`;
  const filepath = path.join(dir, filename);
  
  // Clean up old backups (keep last 7 days)
  try {
    const files = fs.readdirSync(dir);
    const now = Date.now();
    files.forEach(f => {
      if (f.endsWith('.sql')) {
        const fullPath = path.join(dir, f);
        const stats = fs.statSync(fullPath);
        if (now - stats.mtimeMs > 7 * 24 * 60 * 60 * 1000) {
          fs.unlinkSync(fullPath);
          console.log(`Deleted old backup: ${f}`);
        }
      }
    });
  } catch (err) {
    console.error('Error cleaning old backups:', err);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Auto Backup failed: DATABASE_URL not set');
    return;
  }

  // Execute pg_dump
  const cmd = `pg_dump --dbname="${dbUrl}" -F p -f "${filepath}"`;
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Backup error: ${error.message}`);
      return;
    }
    console.log(`Successfully created backup: ${filename}`);
  });
}
