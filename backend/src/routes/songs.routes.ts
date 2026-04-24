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
  } catch (error) {
    console.error('Error fetching file link:', error);
    res.status(500).json({ error: 'Failed to generate download link' });
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

export default router;
