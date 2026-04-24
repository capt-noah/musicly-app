import { Router } from 'express';
import { authenticateSession } from '../middleware/auth.middleware';
import * as PlayerService from '../services/player.service';

const router = Router();

// Get the last played state
router.get('/state', authenticateSession, async (req: any, res) => {
  try {
    const state = await PlayerService.getPlaybackState(req.user.id);
    res.json(state || null);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update the playback state
router.put('/state', authenticateSession, async (req: any, res) => {
  try {
    const { songId, positionMs } = req.body;
    if (!songId) return res.status(400).json({ error: 'Song ID is required' });
    
    await PlayerService.setPlaybackState(req.user.id, songId, positionMs || 0);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
