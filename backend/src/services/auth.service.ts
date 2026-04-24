import bcrypt from 'bcrypt';
import { db } from '../db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';

export async function registerUser(
  telegramId: string | null,
  firstname: string,
  lastname: string,
  username: string,
  email: string | null,
  password: string,
  ppUrl: string | null
) {
  const hashedPass = await bcrypt.hash(password, 10);

  const [user] = await db.insert(users).values({
    telegramId,
    username,
    email,
    hashedPassword: hashedPass,
    firstName: firstname,
    lastName: lastname,
    profilePhoto: ppUrl,
  }).returning({
    id: users.id,
    username: users.username,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    profilePhoto: users.profilePhoto,
  });

  return user;
}

export async function linkTelegramToUser(userId: string, telegramId: string) {
  const [user] = await db.update(users)
    .set({ telegramId })
    .where(eq(users.id, userId))
    .returning();
  return user;
}

export async function loginUser(username: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (!user) return null;

  const validPass = await bcrypt.compare(password, user.hashedPassword);

  if (!validPass) return null;

  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    profilePhoto: user.profilePhoto,
  };
}

export async function findUserById(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user || null;
}
