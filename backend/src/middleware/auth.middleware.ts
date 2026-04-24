import { Response, NextFunction } from 'express';
import { findUserById } from '../services/auth.service';
import { validateSession } from '../services/session.service';

/**
 * Middleware to authenticate requests using a custom session ID.
 * The session ID can be sent via:
 * 1. HttpOnly Cookie (session_id)
 * 2. Authorization Header (Bearer sessionId)
 */
export const authenticateSession = async (req: any, res: Response, next: NextFunction) => {
  let sessionId = req.cookies?.session_id;

  if (!sessionId) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionId = authHeader.split(' ')[1];
    }
  }

  // Handle case where multiple cookies/headers might be combined (some platforms join with commas)
  if (typeof sessionId === 'string' && sessionId.includes(',')) {
    sessionId = sessionId.split(',')[0].trim();
  }

  if (!sessionId) {
    return res.status(401).json({ error: 'Unauthorized: Session required' });
  }

  try {
    const userId = await validateSession(sessionId);

    if (!userId) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = user;
    req.sessionId = sessionId; // Attach session ID for logout etc.
    next();
  } catch (error: any) {
    console.error('Auth Middleware Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
