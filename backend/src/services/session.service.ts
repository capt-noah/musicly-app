import { db } from '../db';
import { sessions, users } from '../schema';
import { eq, and, gt, lte } from 'drizzle-orm';

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
 * Validates if a session ID exists, is not expired, and returns the joined user record.
 * SINGLE round-trip to database instead of two sequential queries.
 */
export async function validateSessionWithUser(sessionId: string) {
  if (!sessionId || typeof sessionId !== 'string') return null;

  const [result] = await db.select({
    session: sessions,
    user: users,
  })
  .from(sessions)
  .innerJoin(users, eq(sessions.userId, users.id))
  .where(
    and(
      eq(sessions.id, sessionId),
      gt(sessions.expiresAt, new Date())
    )
  )
  .limit(1);

  if (!result) return null;
  return result;
}

/**
 * Validates if a session ID exists and is not expired (legacy compatibility).
 */
export async function validateSession(sessionId: string): Promise<string | null> {
  if (!sessionId || typeof sessionId !== 'string') return null;

  const [session] = await db.select({ userId: sessions.userId })
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
 * Deletes a session record (Logout).
 */
export async function destroySession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/**
 * Deletes all sessions for a specific user (Logout everywhere / Password change).
 */
export async function destroyAllUserSessions(userId: string): Promise<void> {
  if (!userId) return;
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Cleanup expired sessions from the database.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await db.delete(sessions).where(lte(sessions.expiresAt, new Date()));
  return (result as any)?.count ?? 0;
}
