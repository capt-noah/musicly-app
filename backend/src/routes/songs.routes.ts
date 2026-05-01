import { Router, Request, Response } from 'express';
import { getTopTracks, getSongsByUser } from '../services/songs.service';
import { authenticateSession } from '../middleware/auth.middleware';
import { bot } from '../config';

const router = Router();

router.get('/top_track', async (req, res) => {
  try {
    const tracks = await getTopTracks();
    res.json(tracks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all songs for the authenticated user
router.get('/sync/pending', authenticateSession, async (req: any, res) => {
  try {
    const songs = await getSongsByUser(req.user.id);
    res.json(songs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a fresh temporary download link for a specific file
router.get('/file/:file_id', authenticateSession, async (req: any, res) => {
  try {
    const file = await bot.getFile(req.params.file_id);
    const downloadUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    res.json({ url: downloadUrl });
  } catch (error: any) {
    const message = error?.message || '';
    console.error(`[Songs] Error fetching file link for ${req.params.file_id}:`, message);
    
    if (message.includes('wrong file_id') || message.includes('file is temporarily unavailable')) {
      return res.status(410).json({ 
        error: 'File expired or invalid',
        details: 'The Telegram file link has expired. Please send the song to the bot again to refresh the link.'
      });
    }

    res.status(500).json({ 
      error: 'Failed to generate download link',
      details: message || 'Unknown error'
    });
  }
});

router.get('/:telegram_id', async (req, res) => {
  try {
    // This is the old endpoint, keeping for compatibility momentarily
    // but preferred is the authenticated 'sync/pending'
    const { getSongsByTelegramId } = require('../services/songs.service');
    const songs = await getSongsByTelegramId(req.params.telegram_id);
    res.json(songs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update song metadata
router.patch('/:id/metadata', authenticateSession, async (req: any, res) => {
  try {
    const { title, artistName, albumTitle } = req.body;
    const { updateSongMetadata } = require('../services/songs.service');
    const updated = await updateSongMetadata(req.params.id, req.user.id, { title, artistName, albumTitle });
    res.json(updated);
  } catch (error: any) {
    console.error(error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ error: error.message });
  }
});

// Delete a song from user's library
router.delete('/:id', authenticateSession, async (req: any, res) => {
  try {
    const { deleteSong } = require('../services/songs.service');
    await deleteSong(req.params.id, req.user.id);
    res.status(204).send();
  } catch (error: any) {
    console.error(`[Songs] Error deleting song ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

// Update album cover
router.post('/albums/:id/cover', authenticateSession, async (req: any, res) => {
  try {
    const { coverArt } = req.body;
    if (!coverArt) return res.status(400).json({ error: 'Cover art is required' });
    
    const { updateAlbumCover } = require('../services/songs.service');
    await updateAlbumCover(req.params.id, coverArt);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's liked songs
router.get('/likes', authenticateSession, async (req: any, res) => {
  try {
    const { getLikedSongs } = require('../services/songs.service');
    const liked = await getLikedSongs(req.user.id);
    res.json(liked);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle like for a song
router.post('/:id/like', authenticateSession, async (req: any, res) => {
  try {
    const { toggleLike } = require('../services/songs.service');
    const isLiked = await toggleLike(req.user.id, req.params.id);
    res.json({ liked: isLiked });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record a single play
router.post('/:id/play', authenticateSession, async (req: any, res) => {
  try {
    const { recordPlay } = require('../services/songs.service');
    await recordPlay(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error: any) {
    console.error(`[Music] Error recording play for ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to record play' });
  }
});

// Bulk sync plays
router.post('/plays/sync', authenticateSession, async (req: any, res) => {
  try {
    const { plays } = req.body;
    const { syncPlays } = require('../services/songs.service');
    await syncPlays(req.user.id, plays);
    res.status(204).send();
  } catch (error: any) {
    console.error('[Music] Error syncing plays:', error);
    res.status(500).json({ error: 'Failed to sync plays' });
  }
});

export default router;
