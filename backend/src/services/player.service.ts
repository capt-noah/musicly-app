import { db } from '../db';
import { playbackStates, music, albums, artists } from '../schema';
import { eq } from 'drizzle-orm';

export async function getPlaybackState(userId: string) {
  const [state] = await db.select({
    userId: playbackStates.userId,
    songId: playbackStates.songId,
    positionMs: playbackStates.positionMs,
    updatedAt: playbackStates.updatedAt,
    // Join with song info so the frontend has everything it needs to load the track
    song: {
       id: music.id,
       title: music.title,
       audioFileId: music.audioFileId,
       coverFileId: music.coverFileId,
       albumTitle: albums.title,
       artistName: artists.name,
    }
  })
  .from(playbackStates)
  .leftJoin(music, eq(playbackStates.songId, music.id))
  .leftJoin(albums, eq(music.albumId, albums.id))
  .leftJoin(artists, eq(albums.artistId, artists.id))
  .where(eq(playbackStates.userId, userId))
  .limit(1);

  return state;
}

export async function setPlaybackState(userId: string, songId: string, positionMs: number) {
  // Use onConflictUpdate equivalent (Upsert)
  const [existing] = await db.select().from(playbackStates).where(eq(playbackStates.userId, userId)).limit(1);

  if (existing) {
    await db.update(playbackStates)
      .set({ songId, positionMs, updatedAt: new Date() })
      .where(eq(playbackStates.userId, userId));
  } else {
    await db.insert(playbackStates).values({
      userId,
      songId,
      positionMs,
    });
  }
}
