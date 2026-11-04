import bcrypt from 'bcrypt';
import { db } from '../db';
import { users } from '../schema';
import { eq, sql } from 'drizzle-orm';
import { destroyAllUserSessions } from './session.service';

const BCRYPT_ROUNDS = 12;

// Precomputed valid bcrypt hash with cost 12 used for dummy comparisons to defeat username enumeration timing attacks.
const DUMMY_TIMING_HASH = '$2b$12$e8Y6l8J1Qn6l4oZ1U2x3e.ZqG4kC1n9W2w9bZ7m6a8s1d2f3g4h5j';

// RFC 5322 compliant email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface SafeUser {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profilePhoto: string | null;
  telegramId: string | null;
  joinedAt: Date | null;
}

function toSafeUser(user: any): SafeUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email || null,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    profilePhoto: user.profilePhoto || null,
    telegramId: user.telegramId || null,
    joinedAt: user.joinedAt || null,
  };
}

/**
 * Registers a new user with strictly username and password.
 * Names and email are completely optional and default to null.
 */
export async function registerUser(
  username: string,
  password: string,
  options?: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    telegramId?: string | null;
    profilePhoto?: string | null;
  }
): Promise<SafeUser> {
  const cleanUsername = username.trim();

  // Validate bounds to prevent bcrypt DoS
  if (cleanUsername.length < 3 || cleanUsername.length > 32) {
    throw new Error('Username must be between 3 and 32 characters');
  }

  if (password.length < 6 || password.length > 128) {
    throw new Error('Password must be between 6 and 128 characters');
  }

  // Check case-insensitive username collision
  const [existingUser] = await db.select({ id: users.id })
    .from(users)
    .where(sql`LOWER(${users.username}) = LOWER(${cleanUsername})`)
    .limit(1);

  if (existingUser) {
    throw new Error('Username already exists');
  }

  let cleanEmail: string | null = null;
  if (options?.email && options.email.trim().length > 0) {
    const rawEmail = options.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(rawEmail)) {
      throw new Error('Invalid email format');
    }
    cleanEmail = rawEmail;
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const [inserted] = await db.insert(users).values({
    username: cleanUsername,
    hashedPassword,
    email: cleanEmail,
    firstName: options?.firstName?.trim() || null,
    lastName: options?.lastName?.trim() || null,
    telegramId: options?.telegramId || null,
    profilePhoto: options?.profilePhoto || null,
  }).returning();

  return toSafeUser(inserted);
}

/**
 * Authenticates user credentials with timing attack mitigation and bounded input checks.
 */
export async function loginUser(username: string, password: string): Promise<SafeUser | null> {
  const cleanUsername = (username || '').trim();

  if (!cleanUsername || !password || password.length > 128) {
    // Run dummy compare to maintain constant-time behavior
    await bcrypt.compare(password || '', DUMMY_TIMING_HASH);
    return null;
  }

  // Case-insensitive user lookup
  const [user] = await db.select()
    .from(users)
    .where(sql`LOWER(${users.username}) = LOWER(${cleanUsername})`)
    .limit(1);

  if (!user) {
    // Defeat username enumeration: run dummy bcrypt compare so response duration is identical
    await bcrypt.compare(password, DUMMY_TIMING_HASH);
    return null;
  }

  const isValid = await bcrypt.compare(password, user.hashedPassword);
  if (!isValid) {
    return null;
  }

  return toSafeUser(user);
}

/**
 * Updates a user's email address from their profile.
 * Supports setting or clearing email (null). Enforces RFC 5322 validation and uniqueness.
 */
export async function updateUserEmail(userId: string, email: string | null): Promise<SafeUser> {
  let cleanEmail: string | null = null;

  if (email && email.trim().length > 0) {
    const formatted = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(formatted)) {
      throw new Error('Invalid email address format');
    }

    // Check if another user is already using this email
    const [existing] = await db.select({ id: users.id })
      .from(users)
      .where(sql`LOWER(${users.email}) = ${formatted} AND ${users.id} != ${userId}`)
      .limit(1);

    if (existing) {
      throw new Error('This email address is already linked to another account');
    }

    cleanEmail = formatted;
  }

  const [updated] = await db.update(users)
    .set({ email: cleanEmail })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    throw new Error('User not found');
  }

  return toSafeUser(updated);
}

/**
 * Changes a user's password securely, verifying the old password first.
 * Revokes all previous sessions to prevent session hijacking.
 */
export async function changeUserPassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < 6 || newPassword.length > 128) {
    throw new Error('New password must be between 6 and 128 characters');
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error('User not found');

  const isValid = await bcrypt.compare(oldPassword, user.hashedPassword);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  const newHashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.update(users).set({ hashedPassword: newHashed }).where(eq(users.id, userId));

  // Revoke all existing sessions for security
  await destroyAllUserSessions(userId);
}

export async function findUserById(userId: string): Promise<SafeUser | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ? toSafeUser(user) : null;
}

export async function linkTelegramToUser(userId: string, telegramId: string, profilePhoto?: string | null): Promise<SafeUser> {
  const [user] = await db.update(users)
    .set({
      telegramId,
      profilePhoto: profilePhoto || undefined,
    })
    .where(eq(users.id, userId))
    .returning();
  return toSafeUser(user);
}

export async function unlinkTelegramFromUser(userId: string): Promise<SafeUser> {
  const [user] = await db.update(users)
    .set({
      telegramId: null,
      profilePhoto: null,
    })
    .where(eq(users.id, userId))
    .returning();
  return toSafeUser(user);
}

export async function updateUserProfilePhoto(userId: string, photoUrl: string): Promise<SafeUser> {
  const [user] = await db.update(users)
    .set({ profilePhoto: photoUrl })
    .where(eq(users.id, userId))
    .returning();
  return toSafeUser(user);
}
