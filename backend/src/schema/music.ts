import { pgTable, uuid, text, timestamp, integer, boolean, index, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";
import { albums } from "./albums";
import { artists } from "./artists";

export const music = pgTable("music", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploaderId: uuid("uploader_id").references(() => users.id, { onDelete: "cascade" }),
  albumId: uuid("album_id").references(() => albums.id, { onDelete: "set null" }),
  audioFileId: text("audio_file_id").notNull(),
  coverFileId: text("cover_file_id"),
  title: text("title").notNull(),
  durationSec: integer("duration_sec").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    albumIdx: index("idx_music_album").on(table.albumId),
  };
});

export const musicArtists = pgTable("music_artists", {
  musicId: uuid("music_id").references(() => music.id, { onDelete: "cascade" }),
  artistId: uuid("artist_id").references(() => artists.id, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").default(false),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.musicId, table.artistId] }),
  };
});
