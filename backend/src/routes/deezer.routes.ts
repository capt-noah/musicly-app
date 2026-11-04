import { Router } from 'express';
import { downloadFullSongForUser } from '../services/deezer.service';
import { validateSessionWithUser } from '../services/session.service';

const router = Router();

// Optional authentication: extracts user if token provided, but doesn't block unauthenticated queries
const optionalAuth = async (req: any, res: any, next: any) => {
  let sessionId = req.cookies?.session_id;
  if (!sessionId) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionId = authHeader.substring(7).trim();
    }
  }
  if (sessionId) {
    try {
      const authResult = await validateSessionWithUser(sessionId);
      if (authResult) req.user = authResult.user;
    } catch (e) {}
  }
  next();
};

/**
 * POST /api/music/download-deezer
 * Body: { title: string, artist: string, albumTitle?: string }
 */
router.post('/download-deezer', optionalAuth, async (req: any, res: any) => {
  const { title, artist } = req.body;

  if (!title || !artist) {
    return res.status(400).json({ error: 'Title and artist are required' });
  }

  const userId = req.user?.id || null;
  console.log(`[DeezerRoute] Incoming full-track download request for "${artist} - ${title}" (User: ${userId || 'guest'})...`);

  try {
    const result = await downloadFullSongForUser(userId, title, artist);
    return res.json(result);
  } catch (error: any) {
    console.error('[DeezerRoute] Download pipeline exception:', error);
    return res.json({
      success: false,
      fallback: 'deezer_telegram',
      query: `${artist} - ${title}`,
      error: error?.message || 'Download failed'
    });
  }
});

export default router;
