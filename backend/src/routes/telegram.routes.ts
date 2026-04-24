import { Router } from 'express';
import { generateLinkToken } from '../services/linking.service';
import { authenticateSession } from '../middleware/auth.middleware';
import { users } from '../schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Generates a linking token for the current user.
 */
router.post('/link-token', authenticateSession as any, (req: any, res) => {
  try {
    const token = generateLinkToken(req.user.id);
    res.json({ token, botUsername: 'my_musicly_bot' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

/**
 * Checks if the current user has a telegramId linked.
 */
router.get('/link-status', authenticateSession as any, async (req: any, res) => {
  try {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);
    
    res.json({ linked: !!user?.telegramId, telegramId: user?.telegramId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check link status' });
  }
});

export default router;
