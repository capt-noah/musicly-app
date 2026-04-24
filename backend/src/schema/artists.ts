import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const artists = pgTable("artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  bio: text("bio"),
  profilePhoto: text("profile_photo"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
