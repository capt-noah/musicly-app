import { db } from '../db';
import { music, topTracks, albums, musicArtists, artists, users, likedSongs } from '../schema';
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
  // Normalize: trim and handle casing for stability
  const trimmedName = name.trim();
  
  // Try to find exactly first (to avoid unnecessary inserts)
  const [existing] = await db.select().from(artists).where(sql`LOWER(${artists.name}) = LOWER(${trimmedName})`).limit(1);
  if (existing) return existing.id;

  // Atomic Upsert if not found
  const [result] = await db.insert(artists)
    .values({ name: trimmedName })
    .onConflictDoUpdate({
      target: artists.name,
      set: { name: trimmedName }
    })
    .returning();
    
  return result.id;
}

/**
 * Helper to find or create an album by title and artist.
 */
export async function findOrCreateAlbum(title: string, artistId: string, coverFileId?: string): Promise<string> {
  // Normalize "Standalone Tracks" to a consistent string
  let trimmedTitle = title.trim();
  if (trimmedTitle.toLowerCase() === 'standalone tracks') {
    trimmedTitle = 'Standalone Tracks';
  }
  
  // Try to find exactly first (case insensitive for title)
  const [existing] = await db.select()
    .from(albums)
    .where(and(
      sql`LOWER(${albums.title}) = LOWER(${trimmedTitle})`,
      eq(albums.artistId, artistId)
    ))
    .limit(1);
    
  if (existing) return existing.id;

  // Atomic Upsert: Unique on (artistId, title)
  const [result] = await db.insert(albums)
    .values({
      title: trimmedTitle,
      artistId,
      coverArt: coverFileId
    })
    .onConflictDoUpdate({
      target: [albums.artistId, albums.title],
      set: { title: trimmedTitle }
    })
    .returning();

  return result.id;
}

/**
 * Updates a song's metadata and handles hierarchical regrouping.
 */
export async function updateSongMetadata(
  songId: string, 
  userId: string, 
  data: { title?: string, artistName?: string, albumTitle?: string }
) {
  console.log(`[Service] Updating metadata for ${songId} (User: ${userId}):`, data);
  
  // 1. Verify ownership and get current state
  const [song] = await db.select()
    .from(music)
    .where(and(eq(music.id, songId), eq(music.uploaderId, userId)))
    .limit(1);
    
  if (!song) {
    console.error(`[Service] Song ${songId} not found or unauthorized for user ${userId}`);
    throw new Error('Song not found or unauthorized');
  }

  let albumId = song.albumId;
  let currentArtistName = 'Unknown Artist';

  // 2. Handle metadata updates and regrouping
  if (data.artistName !== undefined || data.albumTitle !== undefined) {
    
    if (song.albumId) {
      const currentArtist = await db.select({
        name: artists.name,
      })
      .from(albums)
      .innerJoin(artists, eq(albums.artistId, artists.id))
      .where(eq(albums.id, song.albumId))
      .limit(1);
      
      if (currentArtist[0]) currentArtistName = currentArtist[0].name;
    } else {
      // Check music_artists if no album
      const direct = await db.select({ name: artists.name })
        .from(musicArtists)
        .innerJoin(artists, eq(musicArtists.artistId, artists.id))
        .where(and(eq(musicArtists.musicId, songId), eq(musicArtists.isPrimary, true)))
        .limit(1);
      if (direct[0]) currentArtistName = direct[0].name;
    }
    
    const artistName = data.artistName || currentArtistName;
    
    // If no album title is provided, group under 'Standalone Tracks'
    const albumTitle = (data.albumTitle && data.albumTitle.trim() !== '') 
      ? data.albumTitle 
      : 'Standalone Tracks';

    console.log(`[Service] Regrouping: Artist="${artistName}", Album="${albumTitle}"`);
    const artistId = await findOrCreateArtist(artistName);
    albumId = await findOrCreateAlbum(albumTitle, artistId, song.coverFileId || undefined);
    console.log(`[Service] Assigned to Album ID: ${albumId}`);
  }

  // 3. Apply updates
  console.log(`[Service] Writing to DB: Title="${data.title || song.title}", AlbumID="${albumId}"`);
  const [updated] = await db.update(music)
    .set({ 
      title: data.title || song.title,
      albumId: albumId
    })
    .where(eq(music.id, songId))
    .returning();

  if (!updated) {
     console.error(`[Service] DB Update failed for song ${songId}`);
     throw new Error('Failed to update song in database');
  }

  // 4. Also update the primary artist in music_artists junction table for consistency
  if (data.artistName || data.albumTitle) {
    const artistId = await findOrCreateArtist(data.artistName || currentArtistName);
    await db.insert(musicArtists)
      .values({ musicId: songId, artistId, isPrimary: true })
      .onConflictDoUpdate({
        target: [musicArtists.musicId, musicArtists.artistId],
        set: { isPrimary: true }
      });
      
    // Ensure other artists are not primary anymore if we just set a new primary one
    // (Simplification: just ensure this one is the primary one for now)
  }

  console.log(`[Service] Successfully updated song ${songId}`);

  // 5. Cleanup: If the song moved to a new album, check if the old one is now empty
  if (song.albumId && song.albumId !== albumId) {
    const [remaining] = await db.select({ count: sql<number>`count(*)` })
      .from(music)
      .where(eq(music.albumId, song.albumId));
    
    if (Number(remaining?.count || 0) === 0) {
      console.log(`[Service] Cleaning up empty album: ${song.albumId}`);
      await db.delete(albums).where(eq(albums.id, song.albumId));
    }
  }

  return {
    ...updated,
    albumTitle: data.albumTitle || (albumId ? (await db.select({ title: albums.title }).from(albums).where(eq(albums.id, albumId)).limit(1))[0]?.title : null),
    artistName: data.artistName || (albumId ? (await db.select({ name: artists.name }).from(artists).innerJoin(albums, eq(albums.artistId, artists.id)).where(eq(albums.id, albumId)).limit(1))[0]?.name : null),
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
 * Toggles a song's liked status for a user.
 * Returns true if now liked, false if unliked.
 */
export async function toggleLike(userId: string, songId: string): Promise<boolean> {
  const [existing] = await db.select()
    .from(likedSongs)
    .where(and(eq(likedSongs.userId, userId), eq(likedSongs.songId, songId)))
    .limit(1);

  if (existing) {
    await db.delete(likedSongs)
      .where(and(eq(likedSongs.userId, userId), eq(likedSongs.songId, songId)));
    return false;
  } else {
    await db.insert(likedSongs)
      .values({ userId, songId });
    return true;
  }
}

/**
 * Gets all liked songs for a user with full metadata.
 */
export async function getLikedSongs(userId: string): Promise<any[]> {
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
    likedAt: likedSongs.likedAt,
  })
  .from(likedSongs)
  .innerJoin(music, eq(likedSongs.songId, music.id))
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
  .where(eq(likedSongs.userId, userId))
  .orderBy(desc(likedSongs.likedAt));
  
  return results;
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
