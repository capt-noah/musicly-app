import { Router } from 'express';
import {
  getTopTracks,
  getSongsByUser,
  getSongsByTelegramId,
  updateSongMetadata,
  deleteSong,
  updateAlbumCover,
  getLikedSongs,
  toggleLike,
  recordPlay,
  syncPlays,
} from '../services/songs.service';
import { authenticateSession } from '../middleware/auth.middleware';

const router = Router();

// ==========================================
// 1. Static Routes (Must be declared first)
// ==========================================

// Get top tracks
router.get('/top_track', async (req, res) => {
  try {
    const tracks = await getTopTracks();
    res.json(tracks);
  } catch (error) {
    console.error('[Songs] Error fetching top tracks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all songs for the authenticated user
router.get('/sync/pending', authenticateSession, async (req: any, res) => {
  try {
    const songs = await getSongsByUser(req.user.id);
    res.json(songs);
  } catch (error) {
    console.error('[Songs] Error fetching pending sync songs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's liked songs
router.get('/likes', authenticateSession, async (req: any, res) => {
  try {
    const liked = await getLikedSongs(req.user.id);
    res.json(liked);
  } catch (error) {
    console.error('[Songs] Error fetching liked songs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk sync plays
router.post('/plays/sync', authenticateSession, async (req: any, res) => {
  try {
    const { plays } = req.body;
    await syncPlays(req.user.id, plays || []);
    res.status(204).send();
  } catch (error: any) {
    console.error('[Songs] Error syncing plays:', error);
    res.status(500).json({ error: 'Failed to sync plays' });
  }
});

// Get audio stream/download link for a specific Telegram file (Proxied, no token leak)
router.get('/file/:file_id', authenticateSession, async (req: any, res) => {
  try {
    // Return the safe internal audio proxy route to avoid leaking the raw bot token
    res.json({ url: `/media/audio/${req.params.file_id}` });
  } catch (error: any) {
    console.error(`[Songs] Error generating file link for ${req.params.file_id}:`, error);
    res.status(500).json({ error: 'Failed to generate download link' });
  }
});

// Update album cover
router.post('/albums/:id/cover', authenticateSession, async (req: any, res) => {
  try {
    const { coverArt } = req.body;
    if (!coverArt) return res.status(400).json({ error: 'Cover art is required' });

    await updateAlbumCover(req.params.id, coverArt);
    res.status(204).send();
  } catch (error) {
    console.error('[Songs] Error updating album cover:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 2. Parameterized Routes
// ==========================================

// Legacy Telegram ID lookup (kept for backward compatibility)
router.get('/:telegram_id', async (req, res) => {
  try {
    const songs = await getSongsByTelegramId(req.params.telegram_id);
    res.json(songs);
  } catch (error) {
    console.error('[Songs] Error fetching songs by telegram_id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update song metadata
router.patch('/:id/metadata', authenticateSession, async (req: any, res) => {
  try {
    const { title, artistName, albumTitle } = req.body;
    const updated = await updateSongMetadata(req.params.id, req.user.id, { title, artistName, albumTitle });
    res.json(updated);
  } catch (error: any) {
    console.error('[Songs] Error updating song metadata:', error);
    res.status(error.message?.includes('not found') ? 404 : 500).json({ error: error.message });
  }
});

// Toggle like for a song
router.post('/:id/like', authenticateSession, async (req: any, res) => {
  try {
    const isLiked = await toggleLike(req.user.id, req.params.id);
    res.json({ liked: isLiked });
  } catch (error) {
    console.error('[Songs] Error toggling song like:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record a single play
router.post('/:id/play', authenticateSession, async (req: any, res) => {
  try {
    await recordPlay(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error: any) {
    console.error(`[Songs] Error recording play for ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to record play' });
  }
});

// Delete a song from user's library
router.delete('/:id', authenticateSession, async (req: any, res) => {
  try {
    await deleteSong(req.params.id, req.user.id);
    res.status(204).send();
  } catch (error: any) {
    console.error(`[Songs] Error deleting song ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

export default router;
