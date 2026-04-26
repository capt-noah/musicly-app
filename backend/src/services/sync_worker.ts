import { getNextBatch, updateSyncStatus } from './sync.service';
import { saveMusic, findOrCreateArtist, findOrCreateAlbum } from './songs.service';

let isWorkerRunning = false;

/**
 * Triggers the worker to start processing if it's not already running.
 * This is the "Event-Driven" part of the pipeline.
 */
export async function notifyWorker() {
  if (isWorkerRunning) {
    console.log('Worker is already running. New item will be picked up in current loop.');
    return;
  }
  
  console.log('Starting Sync Worker...');
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
        console.log('Queue empty. Worker shutting down...');
        break;
      }
      
      console.log(`Processing batch of ${batch.length} songs...`);
      
      // 2. Process the batch in parallel
      for (const item of batch) {
        try {
          await updateSyncStatus(item.id, 'processing');
          
          const audioData = JSON.parse(item.audioData || '{}');
          
          // --- Metadata Classification ---
          let albumId: string | undefined = undefined;
          let artistId: string | undefined = undefined;
          
          if (audioData.performer || audioData.album || audioData.title) {
            const artistName = audioData.performer || 'Unknown Artist';
            artistId = await findOrCreateArtist(artistName);
            
            // If no album metadata, group under 'Standalone Tracks' to avoid creating unique albums for every track
            const albumName = audioData.album || 'Standalone Tracks';
            albumId = await findOrCreateAlbum(albumName, artistId, item.coverId || undefined);
          }
          // -------------------------------

          await saveMusic(
            item.userId!,
            item.fileId,
            item.coverId ?? null,
            audioData,
            albumId,
            artistId
          );
          
          await updateSyncStatus(item.id, 'completed');
        } catch (error) {
          console.error(`Failed to process song ${item.id}:`, error);
          await updateSyncStatus(item.id, 'failed');
        }
      }
      
      // Small pause between batches to breathe
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('Fatal Worker Error:', error);
  } finally {
    isWorkerRunning = false;
  }
}
