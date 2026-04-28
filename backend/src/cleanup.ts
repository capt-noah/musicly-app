import { db } from './db';
import { albums, music } from './schema';
import { eq, and, sql } from 'drizzle-orm';

async function cleanupDuplicateAlbums() {
  console.log('[Cleanup] Starting album deduplication...');
  
  // 1. Find all albums grouped by artistId and title
  const results = await db.select({
    artistId: albums.artistId,
    title: albums.title,
    count: sql<number>`count(*)`,
    ids: sql<string[]>`array_agg(${albums.id})`
  })
  .from(albums)
  .groupBy(albums.artistId, albums.title)
  .where(sql`true`);

  const duplicates = results.filter(r => r.count > 1);
  console.log(`[Cleanup] Found ${duplicates.length} sets of duplicate albums.`);

  for (const dup of duplicates) {
    const [keepId, ...removeIds] = dup.ids;
    console.log(`[Cleanup] Merging duplicates for "${dup.title}" (Artist: ${dup.artistId}). Keeping ${keepId}, removing ${removeIds.join(', ')}`);

    // Update all music records to point to the keepId
    for (const removeId of removeIds) {
      await db.update(music)
        .set({ albumId: keepId })
        .where(eq(music.albumId, removeId));
      
      // Delete the duplicate album
      await db.delete(albums).where(eq(albums.id, removeId));
    }
  }

  console.log('[Cleanup] Album deduplication complete.');

  // 2. Remove empty albums
  console.log('[Cleanup] Starting empty album cleanup...');
  const allAlbums = await db.select({ id: albums.id, title: albums.title }).from(albums);
  for (const album of allAlbums) {
    const [countRes] = await db.select({ count: sql<number>`count(*)` })
      .from(music)
      .where(eq(music.albumId, album.id));
    
    if (Number(countRes?.count || 0) === 0) {
      console.log(`[Cleanup] Removing empty album: "${album.title}" (${album.id})`);
      await db.delete(albums).where(eq(albums.id, album.id));
    }
  }
  console.log('[Cleanup] Empty album cleanup complete.');
}

cleanupDuplicateAlbums().catch(console.error);
