import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth } from './middleware.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_for_development';

// Bridge Endpoint: Mints a JWT for users validated by the frontend (Firebase/Local)
router.post('/sync-session', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, email, role, name, uid } = req.body;
    
    if (!id || !role) {
      res.status(400).json({ success: false, message: 'Missing user data' });
      return;
    }

    const token = jwt.sign(
      { id, uid: uid || id, role, email: email || id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, token });
  } catch (error: any) {
    console.error('Sync session error:', error?.message || error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/me', requireAuth, async (req: any, res: Response) => {
  res.json({ success: true, user: req.user });
});

export default router;
