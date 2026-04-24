import { pgTable, uuid, integer, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { music } from "./music";

export const playbackStates = pgTable("playback_states", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").unique().references(() => users.id, { onDelete: "cascade" }),
  songId: uuid("song_id").references(() => music.id, { onDelete: "set null" }),
  positionMs: integer("position_ms").default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    userIndex: index("idx_playback_states_user").on(table.userId),
  };
});
