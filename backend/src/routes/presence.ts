import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { touch, listOnline, labelForPath } from '../services/presence';

const router = Router();

// Any logged-in user reports their own presence (frontend pings this on
// every route change + a ~25s interval while the tab is open).
router.post('/heartbeat', authenticate, (req: Request, res: Response) => {
  const path = typeof req.body?.path === 'string' ? req.body.path.slice(0, 200) : '/';
  touch(req.user!, path);
  res.json({ ok: true });
});

// Who's online right now — admin/viewer only, mirrors the dashboard's own
// role gate (regular USER accounts shouldn't see staff activity tracking).
router.get('/online', authenticate, authorize('IT_ADMIN', 'SUPERADMIN', 'VIEWER'), (_req: Request, res: Response) => {
  const online = listOnline().map((e) => ({
    userId: e.userId,
    displayName: e.displayName,
    adUsername: e.adUsername,
    role: e.role,
    avatarUrl: e.avatarUrl,
    activity: labelForPath(e.path),
    lastSeen: e.lastSeen,
  }));
  res.json(online);
});

export default router;
