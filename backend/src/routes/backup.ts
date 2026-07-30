import { Router } from 'express';
import { BackupController } from '../controllers/backup.controller';
import { authenticate, authorize } from '../middleware/auth';
import { allowQueryToken } from '../middleware/allowQueryToken';

const router = Router();

// Read-only: viewing what backups exist and downloading one to inspect it is
// not destructive, so IT_ADMIN is enough here — consistent with IT_ADMIN
// having read access elsewhere (e.g. GET /api/admin/backup).
router.get('/:filename/download', allowQueryToken, authenticate, authorize('SUPERADMIN', 'IT_ADMIN'), BackupController.downloadBackup);
router.get('/', authenticate, authorize('SUPERADMIN', 'IT_ADMIN'), BackupController.getBackups);
router.post('/', authenticate, authorize('SUPERADMIN', 'IT_ADMIN'), BackupController.createBackup);

// Destructive: deleting a backup or restoring one overwrites the entire
// production database. Every other destructive admin action (user
// management, settings, clear-data, notification templates in admin.ts) is
// SUPERADMIN-only; these previously allowed IT_ADMIN too, which was the one
// inconsistency found while auditing role guards. admin.ts's own /restore
// endpoint already required SUPERADMIN — this makes the two paths agree.
router.delete('/:filename', authenticate, authorize('SUPERADMIN'), BackupController.deleteBackup);
router.post('/:filename/restore', authenticate, authorize('SUPERADMIN'), BackupController.restoreBackup);

export default router;
