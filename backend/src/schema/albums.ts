import { pgTable, uuid, text, timestamp, date, uniqueIndex } from "drizzle-orm/pg-core";
import { artists } from "./artists";

export const albums = pgTable("albums", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id").references(() => artists.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  coverArt: text("cover_art"),
  releaseDate: date("release_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    unq: uniqueIndex("idx_album_artist_title").on(table.artistId, table.title),
  };
});
