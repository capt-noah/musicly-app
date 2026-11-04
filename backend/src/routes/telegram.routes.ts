import { Router, Request, Response } from 'express';
import { generateLinkToken } from '../services/linking.service';
import { unlinkTelegramFromUser } from '../services/auth.service';
import { authenticateSession } from '../middleware/auth.middleware';
import { users } from '../schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { bot, botUsername } from '../config';

const router = Router();

/**
 * Generates a linking token for the current user.
 */
router.post('/link-token', authenticateSession as any, async (req: any, res: Response) => {
  try {
    const token = generateLinkToken(req.user.id);
    let resolvedUsername = botUsername;

    try {
      const botInfo = await bot.getMe();
      if (botInfo?.username) {
        resolvedUsername = botInfo.username;
      }
    } catch (botErr) {
      console.warn('[ToneBot] Could not fetch bot metadata from Telegram API, using configured bot username:', resolvedUsername);
    }

    return res.json({ token, botUsername: resolvedUsername });
  } catch (error: any) {
    console.error('[ToneBot] Error generating link token:', error?.message || error);
    return res.status(500).json({ error: 'Failed to generate linking token' });
  }
});

/**
 * Checks if the current user has a telegramId linked.
 */
router.get('/link-status', authenticateSession as any, async (req: any, res: Response) => {
  try {
    const [user] = await db.select({ telegramId: users.telegramId })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    return res.json({ linked: Boolean(user?.telegramId), telegramId: user?.telegramId || null });
  } catch (error: any) {
    console.error('[ToneBot] Error checking link status:', error?.message || error);
    return res.status(500).json({ error: 'Failed to check link status' });
  }
});

/**
 * Unlinks Telegram from the authenticated user and clears the profile photo.
 */
router.post('/unlink', authenticateSession as any, async (req: any, res: Response) => {
  try {
    const updatedUser = await unlinkTelegramFromUser(req.user.id);
    return res.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('[ToneBot] Error unlinking account:', error?.message || error);
    return res.status(500).json({ error: 'Failed to unlink Telegram account' });
  }
});

export default router;
