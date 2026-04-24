import { db } from '../db';
import { sessions } from '../schema';
import { eq, and, gt } from 'drizzle-orm';

/**
 * Creates a new session record in the database.
 * Default expiration: 30 days.
 */
export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const [session] = await db.insert(sessions).values({
    userId,
    expiresAt,
  }).returning({ id: sessions.id });

  return session.id;
}

/**
 * Validates if a session ID exists and is not expired.
 */
export async function validateSession(sessionId: string): Promise<string | null> {
  const [session] = await db.select()
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  return session ? session.userId : null;
}

/**
 * Deletes a session record.
 */
export async function destroySession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/**
 * Cleanup expired sessions (optional, can be run on cron).
 */
export async function cleanupExpiredSessions(): Promise<void> {
  // Implementation for periodic cleanup
}
