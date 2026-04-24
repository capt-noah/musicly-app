import { pgTable, uuid, text, timestamp, boolean, index, primaryKey, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { music } from "./music";

export const playlists = pgTable("playlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(true),
  coverArt: text("cover_art"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    ownerIdx: index("idx_playlist_owner").on(table.ownerId),
  };
});

export const playlistSongs = pgTable("playlist_songs", {
  playlistId: uuid("playlist_id").references(() => playlists.id, { onDelete: "cascade" }),
  songId: uuid("song_id").references(() => music.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
  rank: integer("rank"),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.playlistId, table.songId] }),
  };
});
