import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const syncQueue = pgTable("sync_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  fileId: text("file_id").notNull(),
  coverId: text("cover_id"),
  title: text("title"),
  status: text("status").default("pending"),
  audioData: text("audio_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
