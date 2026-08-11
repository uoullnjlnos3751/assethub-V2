import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

const BACKUP_DIR = path.join(__dirname, '../../backups');
const PG_DUMP = process.env.PG_DUMP_PATH || 'pg_dump';
const PSQL = process.env.PSQL_PATH || 'psql';

export class BackupController {
  static async getBackups(req: Request, res: Response, next: NextFunction) {
    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      const files = await fs.readdir(BACKUP_DIR);
      const backups = await Promise.all(
        files.filter(f => f.endsWith('.sql')).map(async f => {
          const stats = await fs.stat(path.join(BACKUP_DIR, f));
          return {
            filename: f,
            size: stats.size,
            createdAt: stats.birthtime,
          };
        })
      );
      backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      res.json(backups);
    } catch (err) {
      next(err);
    }
  }

  static async createBackup(req: Request, res: Response, next: NextFunction) {
    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${timestamp}.sql`;
      const filepath = path.join(BACKUP_DIR, filename);
      let dbUrl = process.env.DATABASE_URL;

      if (!dbUrl) {
        throw new AppError('DATABASE_URL is not set', 500);
      }
      
      // pg_dump doesn't support URI query params like ?schema=public
      if (dbUrl.includes('?')) {
        dbUrl = dbUrl.split('?')[0];
      }

      // Create backup using execFile to prevent injection
      execFile(PG_DUMP, ['--dbname', dbUrl, '--clean', '--if-exists', '--file', filepath], (error, stdout, stderr) => {
        if (error) {
          console.error('Backup error:', error);
          return next(new AppError('Backup failed: ' + error.message, 500));
        }
        res.json({ message: 'สร้างไฟล์สำรองข้อมูลสำเร็จ', filename });
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename } = req.params;
      const filepath = path.join(BACKUP_DIR, filename);
      await fs.unlink(filepath);
      res.json({ message: 'ลบไฟล์แบ็คอัพสำเร็จ' });
    } catch (err) {
      next(err);
    }
  }

  static async downloadBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename } = req.params;
      const filepath = path.join(BACKUP_DIR, filename);
      res.download(filepath);
    } catch (err) {
      next(err);
    }
  }

  static async restoreBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename } = req.params;
      const filepath = path.join(BACKUP_DIR, filename);
      const dbUrl = process.env.DATABASE_URL;

      if (!dbUrl) {
        throw new AppError('DATABASE_URL is not set', 500);
      }

      // Restore using psql and execFile
      execFile(PSQL, ['--dbname', dbUrl, '--file', filepath], (error, stdout, stderr) => {
        if (error) {
          console.error('Restore error:', error);
          return next(new AppError('กู้คืนข้อมูลล้มเหลว: ' + error.message, 500));
        }
        res.json({ message: 'กู้คืนข้อมูลสำเร็จ' });
      });
    } catch (err) {
      next(err);
    }
  }
}
