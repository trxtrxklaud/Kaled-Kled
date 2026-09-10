import { Router, Request, Response } from 'express';
import { requireAuth } from './middleware.js';

const router = Router();

// NOTE (Phase 1 security fix): POST /sync-session was REMOVED. It minted JWTs
// from client-supplied {id, role, ...} with zero verification — anyone could
// mint an admin token. Auth moves to Laravel in Phase 2; until then the app
// uses Firebase client sessions directly. Email/Eduserv backend calls that
// required the cookie now fall back (EmailJS/manual, sync error toast).

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/me', requireAuth, async (req: any, res: Response) => {
  res.json({ success: true, user: req.user });
});

export default router;
