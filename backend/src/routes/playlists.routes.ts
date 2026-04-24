import { Router } from 'express';
import { authenticateSession } from '../middleware/auth.middleware';
import * as PlaylistService from '../services/playlists.service';

const router = Router();

// Get all playlists of the user
router.get('/', authenticateSession, async (req: any, res) => {
  try {
    const playlists = await PlaylistService.getUserPlaylists(req.user.id);
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new playlist
router.post('/', authenticateSession, async (req: any, res) => {
  try {
    const { title, description, songIds } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    
    if (songIds && Array.isArray(songIds)) {
      const playlist = await PlaylistService.createPlaylistWithSongs(req.user.id, title, description, songIds);
      res.status(201).json(playlist);
    } else {
      const playlist = await PlaylistService.createPlaylist(req.user.id, title, description);
      res.status(201).json(playlist);
    }
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get a specific playlist with its songs
router.get('/:id', authenticateSession, async (req: any, res) => {
  try {
    const playlist = await PlaylistService.getPlaylistWithSongs(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a song to a playlist
router.post('/:id/songs', authenticateSession, async (req: any, res) => {
  try {
    const { songId } = req.body;
    if (!songId) return res.status(400).json({ error: 'Song ID is required' });
    
    const entry = await PlaylistService.addSongToPlaylist(req.params.id, songId);
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a song from a playlist
router.delete('/:id/songs/:songId', authenticateSession, async (req: any, res) => {
  try {
    await PlaylistService.removeSongFromPlaylist(req.params.id, req.params.songId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
