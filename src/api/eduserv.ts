import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from './middleware.js';

const router = Router();

router.post('/sync', requireAuth, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { apiKey } = req.body;
    
    const syncEndpoint = process.env.EDUSERV_SYNC_ENDPOINT;
    const apiSecret = process.env.EDUSERV_API_SECRET;

    if (!syncEndpoint || !apiSecret) {
      res.status(500).json({ success: false, message: 'Eduserv configuration is missing' });
      return;
    }

    const response = await fetch(syncEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-Eduserv-Api-Key': apiKey } : {}),
        'X-Eduserv-Api-Secret': apiSecret,
      },
      body: JSON.stringify({ apiKey, apiSecret }),
    });

    if (!response.ok) {
      throw new Error(`Eduserv sync failed with status ${response.status}`);
    }

    const payload = await response.json();
    res.json(payload);
  } catch (error: any) {
    console.error('Eduserv sync error:', error?.message || error);
    res.status(500).json({ success: false, message: 'Failed to sync with Eduserv' });
  }
});

export default router;
