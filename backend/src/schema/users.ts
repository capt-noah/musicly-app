import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramId: text("telegram_id").unique(),
  username: text("username").unique().notNull(),
  email: text("email").unique(),
  hashedPassword: text("hashed_password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  profilePhoto: text("profile_photo"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
});
