import { Response, NextFunction } from 'express';
import { validateSessionWithUser } from '../services/session.service';

/**
 * Middleware to authenticate requests using a custom session ID.
 * The session ID can be sent via:
 * 1. Authorization Header (Bearer <sessionId>)
 * 2. HttpOnly Cookie (session_id)
 *
 * Optimized to use a single innerJoin query to fetch both session validity and user metadata.
 */
export const authenticateSession = async (req: any, res: Response, next: NextFunction) => {
  let sessionId = req.cookies?.session_id;

  if (!sessionId) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionId = authHeader.substring(7).trim();
    }
  }

  // Handle case where multiple cookies/headers might be combined (e.g. comma-delimited)
  if (typeof sessionId === 'string' && sessionId.includes(',')) {
    sessionId = sessionId.split(',')[0].trim();
  }

  if (!sessionId) {
    return res.status(401).json({ error: 'Unauthorized: Session required' });
  }

  try {
    const authResult = await validateSessionWithUser(sessionId);

    if (!authResult) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = authResult.user;
    req.sessionId = sessionId;
    next();
  } catch (error: any) {
    console.error('[AuthMiddleware] Error validating session:', error?.message || error);
    return res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};
