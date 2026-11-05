import { getNextBatch, updateSyncStatus } from './sync.service';
import { saveMusic, findOrCreateArtist, findOrCreateAlbum } from './songs.service';
import { bot } from '../config';
import fetch from 'node-fetch';
import { parseBuffer } from 'music-metadata';
import { logger } from '../utils/logger';

let isWorkerRunning = false;

/**
 * Triggers the worker to start processing if it's not already running.
 * This is the "Event-Driven" part of the pipeline.
 */
export async function notifyWorker() {
  if (isWorkerRunning) {
    logger.info('SYNC', 'worker already running | continuing queue drain');
    return;
  }
  
  logger.info('SYNC', 'starting queue worker loop');
  startWorkerLoop();
}

/**
 * The main worker loop that "drains" the queue.
 */
async function startWorkerLoop() {
  isWorkerRunning = true;
  
  try {
    while (true) {
      // 1. Fetch a batch of 10 songs
      const batch = await getNextBatch(10);
      
      if (batch.length === 0) {
        logger.info('SYNC', 'queue empty | worker standing by');
        break;
      }
      
      logger.info('SYNC', `processing batch of ${batch.length} tracks`);
      
      // 2. Process the batch in parallel
      for (const item of batch) {
        try {
          await updateSyncStatus(item.id, 'processing');
          
          const audioData = JSON.parse(item.audioData || '{}');
          
          let artistName = (audioData.performer || '').trim();
          let albumName = (audioData.album || '').trim();
          let songTitle = (audioData.title || '').trim();

          // Inspect the actual audio file stream from Telegram to extract embedded ID3 tags (TALB, TPE1, TIT2)
          try {
            const fileLink = await bot.getFileLink(item.fileId);
            const rangeRes = await fetch(fileLink, { headers: { Range: 'bytes=0-262143' } });
            if (rangeRes.ok || rangeRes.status === 206) {
              const audioBuf = await rangeRes.buffer();
              const parsed = await parseBuffer(audioBuf);
              if (parsed.common.album && parsed.common.album.trim().length > 0) {
                albumName = parsed.common.album.trim();
              }
              if (parsed.common.artist && parsed.common.artist.trim().length > 0 && !artistName) {
                artistName = parsed.common.artist.trim();
              }
              if (parsed.common.title && parsed.common.title.trim().length > 0 && !songTitle) {
                songTitle = parsed.common.title.trim();
              }
            }
          } catch (id3Err) {
            logger.warn('SYNC', `could not inspect ID3 tags for file=${item.fileId}`);
          }

          if (!artistName) artistName = 'Unknown Artist';
          if (!songTitle) songTitle = 'Untitled';
          audioData.title = songTitle;
          audioData.performer = artistName;

          const artistId = await findOrCreateArtist(artistName);
          let albumId: string | undefined = undefined;

          // Only assign an album if legitimate album metadata is present
          if (albumName && albumName.toLowerCase() !== 'standalone tracks' && albumName.toLowerCase() !== 'single') {
            albumId = await findOrCreateAlbum(albumName, artistId, item.coverId || undefined);
          }

          await saveMusic(
            item.userId!,
            item.fileId,
            item.coverId ?? null,
            audioData,
            albumId,
            artistId
          );
          
          await updateSyncStatus(item.id, 'completed');
          logger.success('SYNC', `track synced: "${songTitle}" by "${artistName}" (user_id: ${item.userId})`);
        } catch (error) {
          logger.error('SYNC', `failed to process track queue_id=${item.id}`, error);
          await updateSyncStatus(item.id, 'failed');
        }
      }
      
      // Small pause between batches to breathe
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    logger.error('SYNC', 'fatal worker error', error);
  } finally {
    isWorkerRunning = false;
  }
}
