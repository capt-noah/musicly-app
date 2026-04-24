import { db } from '../db';
import { likes, music, albums, artists, musicArtists } from '../schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

/**
 * Toggles a like for a song by a user.
 * Returns true if liked, false if unliked.
 */
export async function toggleLike(userId: string, songId: string): Promise<boolean> {
  // Check if already liked
  const [existing] = await db.select()
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.songId, songId)))
    .limit(1);

  if (existing) {
    // Unlike
    await db.delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.songId, songId)));
    return false;
  } else {
    // Like
    await db.insert(likes).values({ userId, songId });
    return true;
  }
}

/**
 * Gets all liked songs for a user.
 */
export async function getLikedSongs(userId: string): Promise<any[]> {
  const albumArtist = alias(artists, 'albumArtist');
  const directArtist = alias(artists, 'directArtist');

  const results = await db.select({
    id: music.id,
    audioFileId: music.audioFileId,
    coverFileId: music.coverFileId,
    title: music.title,
    durationSec: music.durationSec,
    albumId: music.albumId,
    albumTitle: albums.title,
    artistName: sql<string>`COALESCE(${albumArtist.name}, ${directArtist.name}, 'Unknown Artist')`,
    likedAt: likes.createdAt
  })
  .from(likes)
  .innerJoin(music, eq(likes.songId, music.id))
  .leftJoin(albums, eq(music.albumId, albums.id))
  .leftJoin(albumArtist, eq(albums.artistId, albumArtist.id))
  .leftJoin(musicArtists, and(eq(music.id, musicArtists.musicId), eq(musicArtists.isPrimary, true)))
  .leftJoin(directArtist, eq(musicArtists.artistId, directArtist.id))
  .where(eq(likes.userId, userId))
  .orderBy(desc(likes.createdAt));

  return results;
}
