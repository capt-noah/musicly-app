import { pgTable, uuid, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { music } from "./music";

export const likedSongs = pgTable("liked_songs", {
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  songId: uuid("song_id").references(() => music.id, { onDelete: "cascade" }),
  likedAt: timestamp("liked_at", { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.songId] }),
    userIdx: index("idx_likes_user").on(table.userId),
  };
});
