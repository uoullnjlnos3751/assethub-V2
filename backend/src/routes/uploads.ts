import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { allowQueryToken } from '../middleware/allowQueryToken';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const UPLOAD_ROOT = path.resolve(__dirname, '..', '..', 'uploads');

const router = Router();

router.use(allowQueryToken);
router.use(authenticate);

router.use((req: Request, res: Response, next: NextFunction) => {
  try {
    const relPath = req.path.replace(/^\/+/, '');
    if (!relPath || relPath.includes('..')) {
      return next(new AppError('เส้นทางไฟล์ไม่ถูกต้อง', 400));
    }

    const filePath = path.normalize(path.join(UPLOAD_ROOT, relPath));
    if (!filePath.startsWith(UPLOAD_ROOT)) {
      return next(new AppError('เส้นทางไฟล์ไม่ถูกต้อง', 400));
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return next(new AppError('ไม่พบไฟล์', 404));
    }

    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

export default router;
