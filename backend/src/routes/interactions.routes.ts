import { Router } from 'express';
import { authenticateSession } from '../middleware/auth.middleware';
import { toggleLike, getLikedSongs } from '../services/interactions.service';

const router = Router();

// Toggle a like for a song
router.post('/songs/:id/like', authenticateSession, async (req: any, res) => {
  try {
    const isLiked = await toggleLike(req.user.id, req.params.id);
    res.json({ liked: isLiked });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all liked songs
router.get('/songs/liked', authenticateSession, async (req: any, res) => {
  try {
    const tracks = await getLikedSongs(req.user.id);
    res.json(tracks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
