import { Router } from 'express';
import { BackupController } from '../controllers/backup.controller';
import { authenticate, authorize } from '../middleware/auth';
import { allowQueryToken } from '../middleware/allowQueryToken';

const router = Router();

router.get('/:filename/download', allowQueryToken, authenticate, authorize('SUPERADMIN', 'IT_ADMIN'), BackupController.downloadBackup);

// Protect all other backup routes for SUPERADMIN and IT_ADMIN only
router.use(authenticate);
router.use(authorize('SUPERADMIN', 'IT_ADMIN'));

router.get('/', BackupController.getBackups);
router.post('/', BackupController.createBackup);
router.delete('/:filename', BackupController.deleteBackup);
router.post('/:filename/restore', BackupController.restoreBackup);

export default router;
