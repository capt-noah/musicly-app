import { pgTable, uuid, timestamp, integer, index, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";
import { music } from "./music";

export const likes = pgTable("likes", {
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  songId: uuid("song_id").references(() => music.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.songId] }),
    userIdIdx: index("idx_likes_user").on(table.userId),
  };
});

export const listeningHistory = pgTable("listening_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  songId: uuid("song_id").references(() => music.id, { onDelete: "cascade" }),
  playedAt: timestamp("played_at", { withTimezone: true }).defaultNow(),
  durationListenedSec: integer("duration_listened_sec"),
}, (table) => {
  return {
    userIdIdx: index("idx_history_user").on(table.userId),
  };
});

export const topTracks = pgTable("top_tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  songId: uuid("song_id").references(() => music.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(),
  asOf: timestamp("as_of", { withTimezone: true }).defaultNow(),
});
