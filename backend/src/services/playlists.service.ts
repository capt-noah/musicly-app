import { db } from '../db';
import { playlists, playlistSongs, music, albums, artists, users } from '../schema';
import { eq, and, asc } from 'drizzle-orm';

export async function getUserPlaylists(userId: string) {
  return await db.select({
    id: playlists.id,
    title: playlists.title,
    description: playlists.description,
    coverArt: playlists.coverArt,
    ownerId: playlists.ownerId,
    createdAt: playlists.createdAt,
    ownerUsername: users.username,
  })
    .from(playlists)
    .innerJoin(users, eq(playlists.ownerId, users.id))
    .where(eq(playlists.ownerId, userId))
    .orderBy(playlists.createdAt);
}

export async function createPlaylist(userId: string, title: string, description?: string) {
  const result = await db.insert(playlists).values({
    ownerId: userId,
    title,
    description,
  }).returning({ id: playlists.id });
  
  return result[0];
}

export async function getPlaylistWithSongs(playlistId: string) {
  const info = await db.select({
    id: playlists.id,
    title: playlists.title,
    description: playlists.description,
    coverArt: playlists.coverArt,
    ownerId: playlists.ownerId,
    createdAt: playlists.createdAt,
    ownerUsername: users.username,
  })
  .from(playlists)
  .innerJoin(users, eq(playlists.ownerId, users.id))
  .where(eq(playlists.id, playlistId))
  .limit(1);

  if (!info.length) return null;

  const songs = await db.select({
    id: music.id,
    title: music.title,
    audioFileId: music.audioFileId,
    coverFileId: music.coverFileId,
    albumTitle: albums.title,
    artistName: artists.name,
  })
  .from(playlistSongs)
  .innerJoin(music, eq(playlistSongs.songId, music.id))
  .leftJoin(albums, eq(music.albumId, albums.id))
  .leftJoin(artists, eq(albums.artistId, artists.id))
  .where(eq(playlistSongs.playlistId, playlistId))
  .orderBy(playlistSongs.addedAt);

  return {
    ...info[0],
    songs
  };
}

export async function addSongToPlaylist(playlistId: string, songId: string) {
  // Check if already in playlist
  const [exists] = await db.select()
    .from(playlistSongs)
    .where(and(eq(playlistSongs.playlistId, playlistId), eq(playlistSongs.songId, songId)))
    .limit(1);
  
  if (exists) return exists;

  const [added] = await db.insert(playlistSongs).values({
    playlistId,
    songId,
  }).returning();
  return added;
}

export async function removeSongFromPlaylist(playlistId: string, songId: string) {
  await db.delete(playlistSongs)
    .where(and(eq(playlistSongs.playlistId, playlistId), eq(playlistSongs.songId, songId)));
}

export async function createPlaylistWithSongs(userId: string, title: string, description: string | undefined, songIds: string[]) {
  const playlist = await createPlaylist(userId, title, description);
  
  if (songIds.length > 0) {
    const values = songIds.map((songId, index) => ({
      playlistId: playlist.id,
      songId: songId,
      rank: index,
    }));
    await db.insert(playlistSongs).values(values);
  }
  
  return await getPlaylistWithSongs(playlist.id);
}
