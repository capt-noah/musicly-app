import { db } from '../db';
import { playbackStates, music, albums, artists, musicArtists } from '../schema';
import { eq, and, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export async function getPlaybackState(userId: string) {
  const albumArtist = alias(artists, 'albumArtist');
  const directArtist = alias(artists, 'directArtist');

  const [state] = await db.select({
    userId: playbackStates.userId,
    songId: playbackStates.songId,
    positionMs: playbackStates.positionMs,
    updatedAt: playbackStates.updatedAt,
    song: {
       id: music.id,
       title: music.title,
       audioFileId: music.audioFileId,
       coverFileId: music.coverFileId,
       albumTitle: albums.title,
       artistName: sql<string>`COALESCE(${albumArtist.name}, ${directArtist.name}, 'Unknown Artist')`,
    }
  })
  .from(playbackStates)
  .leftJoin(music, eq(playbackStates.songId, music.id))
  .leftJoin(albums, eq(music.albumId, albums.id))
  .leftJoin(albumArtist, eq(albums.artistId, albumArtist.id))
  .leftJoin(
    musicArtists,
    and(
      eq(musicArtists.musicId, music.id),
      eq(musicArtists.isPrimary, true)
    )
  )
  .leftJoin(directArtist, eq(musicArtists.artistId, directArtist.id))
  .where(eq(playbackStates.userId, userId))
  .limit(1);

  return state || null;
}

export async function setPlaybackState(userId: string, songId: string, positionMs: number) {
  await db.insert(playbackStates)
    .values({
      userId,
      songId,
      positionMs: Math.max(0, Math.floor(positionMs || 0)),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: playbackStates.userId,
      set: {
        songId,
        positionMs: Math.max(0, Math.floor(positionMs || 0)),
        updatedAt: new Date(),
      }
    });
}

