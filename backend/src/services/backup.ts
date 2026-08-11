import { execFile } from 'child_process';
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
        // Keep backups for 180 days (approx 6 months)
        if (now - stats.mtimeMs > 180 * 24 * 60 * 60 * 1000) {
          fs.unlinkSync(fullPath);
          console.log(`Deleted old backup: ${f}`);
        }
      }
    });
  } catch (err) {
    console.error('Error cleaning old backups:', err);
  }

  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Auto Backup failed: DATABASE_URL not set');
    return;
  }

  // pg_dump doesn't support URI query params like ?schema=public
  if (dbUrl.includes('?')) {
    dbUrl = dbUrl.split('?')[0];
  }

  // Execute pg_dump using execFile to prevent injection
  const pgDumpPath = process.env.PG_DUMP_PATH || 'pg_dump';
  
  execFile(pgDumpPath, ['--dbname', dbUrl, '--clean', '--if-exists', '--file', filepath], (error, stdout, stderr) => {
    if (error) {
      console.error(`Backup error: ${error.message}`);
      return;
    }
    console.log(`Successfully created backup: ${filename}`);
  });
}
