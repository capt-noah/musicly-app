import { db } from '../db';
import { music, topTracks, albums, musicArtists, artists, users } from '../schema';
import { bot } from '../config';
import { eq, desc, and, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export async function getTopTracks(): Promise<any[]> {
  const albumArtist = alias(artists, 'albumArtist');
  const directArtist = alias(artists, 'directArtist');

  const results = await db.select({
    id: music.id,
    audioFileId: music.audioFileId,
    coverFileId: music.coverFileId,
    title: music.title,
    rank: topTracks.rank,
    albumTitle: albums.title,
    artistName: sql<string>`COALESCE(${albumArtist.name}, ${directArtist.name}, 'Unknown Artist')`,
  })
  .from(topTracks)
  .innerJoin(music, eq(music.id, topTracks.songId))
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
  .orderBy(topTracks.rank);

  return results;
}

export async function getSongsByUser(userId: string): Promise<any[]> {
  const albumArtist = alias(artists, 'albumArtist');
  const directArtist = alias(artists, 'directArtist');

  const results = await db.select({
    id: music.id,
    title: music.title,
    audioFileId: music.audioFileId,
    coverFileId: music.coverFileId,
    durationSec: music.durationSec,
    fileSize: music.fileSize,
    uploadedAt: music.uploadedAt,
    albumTitle: albums.title,
    artistName: sql<string>`COALESCE(${albumArtist.name}, ${directArtist.name}, 'Unknown Artist')`,
    albumId: music.albumId,
  })
  .from(music)
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
  .where(eq(music.uploaderId, userId));
  
  return results;
}

export async function getSongsByTelegramId(telegramId: string): Promise<any[]> {
  const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
  if (!user) return [];

  const results = await db.select().from(music).where(eq(music.uploaderId, user.id));
  return results;
}

export async function saveMusic(
  uploaderId: string, 
  audioFileId: string,
  coverFileId: string | null,
  audioInfo: any,
  albumId?: string,
  artistId?: string
): Promise<void> {
  // Deduplication: Check if this file is already in the user's library
  const [existing] = await db.select()
    .from(music)
    .where(and(eq(music.uploaderId, uploaderId), eq(music.audioFileId, audioFileId)))
    .limit(1);

  if (existing) {
    console.log(`[Service] Song ${audioFileId} already exists for user ${uploaderId}. Skipping.`);
    return;
  }

  const [inserted] = await db.insert(music).values({
    uploaderId,
    albumId,
    audioFileId,
    coverFileId,
    title: audioInfo.title || 'Untitled',
    durationSec: Math.floor(audioInfo.duration || 0),
    mimeType: audioInfo.mime_type,
    fileSize: audioInfo.file_size || 0,
  }).returning({ id: music.id });

  // If we have a direct artist (e.g. standalone track with no album), record it
  if (artistId && inserted?.id) {
    await db.insert(musicArtists)
      .values({ musicId: inserted.id, artistId, isPrimary: true })
      .onConflictDoNothing();
  }
}

/**
 * Helper to find or create an artist by name.
 */
export async function findOrCreateArtist(name: string): Promise<string> {
  const trimmedName = name.trim();
  
  // Atomic Upsert: Try to insert, if name exists, return existing
  const [result] = await db.insert(artists)
    .values({ name: trimmedName })
    .onConflictDoUpdate({
      target: artists.name,
      set: { name: trimmedName } // dummy update to satisfy syntax
    })
    .returning();
    
  if (result) return result.id;

  // Final safety fallback
  const [existing] = await db.select().from(artists).where(eq(artists.name, trimmedName)).limit(1);
  return existing.id;
}

/**
 * Helper to find or create an album by title and artist.
 */
export async function findOrCreateAlbum(title: string, artistId: string, coverFileId?: string): Promise<string> {
  const trimmedTitle = title.trim();
  
  // Atomic Upsert: Unique on (artistId, title)
  const [result] = await db.insert(albums)
    .values({
      title: trimmedTitle,
      artistId,
      coverArt: coverFileId
    })
    .onConflictDoUpdate({
      target: [albums.artistId, albums.title],
      set: { title: trimmedTitle } // dummy update
    })
    .returning();

  if (result) return result.id;

  // Final safety fallback
  const [existing] = await db.select()
    .from(albums)
    .where(and(eq(albums.title, trimmedTitle), eq(albums.artistId, artistId)))
    .limit(1);
  
  return existing.id;
}

/**
 * Updates a song's metadata and handles hierarchical regrouping.
 */
export async function updateSongMetadata(
  songId: string, 
  userId: string, 
  data: { title?: string, artistName?: string, albumTitle?: string }
) {
  // 1. Verify ownership and get current state
  console.log(`[Service] Updating metadata for ${songId}:`, data);
  const [song] = await db.select()
    .from(music)
    .where(and(eq(music.id, songId), eq(music.uploaderId, userId)))
    .limit(1);
    
  if (!song) throw new Error('Song not found or unauthorized');

  let albumId = song.albumId;

  // 2. Handle metadata updates and regrouping
  if (data.artistName || data.albumTitle) {
    const currentArtist = await db.select({
      name: artists.name,
      title: albums.title
    })
    .from(albums)
    .innerJoin(artists, eq(albums.artistId, artists.id))
    .where(eq(albums.id, song.albumId!))
    .limit(1);
    
    const artistName = data.artistName || currentArtist[0]?.name || 'Unknown Artist';
    
    // If no album title is provided, group under 'Standalone Tracks' to avoid generic 'Single' rows
    const albumTitle = (data.albumTitle && data.albumTitle.trim() !== '') 
      ? data.albumTitle 
      : 'Standalone Tracks';

    const artistId = await findOrCreateArtist(artistName);
    albumId = await findOrCreateAlbum(albumTitle, artistId, song.coverFileId || undefined);
  }

  // 3. Apply updates
  const [updated] = await db.update(music)
    .set({ 
      title: data.title || song.title,
      albumId: albumId
    })
    .where(eq(music.id, songId))
    .returning();

  return {
    ...updated,
    albumTitle: data.albumTitle || (await db.select({ title: albums.title }).from(albums).where(eq(albums.id, albumId!)).limit(1))[0]?.title,
    artistName: data.artistName || (await db.select({ name: artists.name }).from(artists).innerJoin(albums, eq(albums.artistId, artists.id)).where(eq(albums.id, albumId!)).limit(1))[0]?.name,
  };
}

/**
 * Updates an album's cover art.
 */
export async function updateAlbumCover(albumId: string, coverArt: string) {
  await db.update(albums)
    .set({ coverArt })
    .where(eq(albums.id, albumId));
}

/**
 * Permanently deletes a song from the library.
 */
export async function deleteSong(songId: string, userId: string): Promise<void> {
  console.log(`[Service] Deleting song ${songId} for user ${userId}`);
  
  // 1. Delete from musicArtists (junction table)
  await db.delete(musicArtists).where(eq(musicArtists.musicId, songId));
  
  // 2. Delete from topTracks if it exists
  await db.delete(topTracks).where(eq(topTracks.songId, songId));
  
  // 3. Delete from the main music table
  await db.delete(music)
    .where(and(eq(music.id, songId), eq(music.uploaderId, userId)));
}
