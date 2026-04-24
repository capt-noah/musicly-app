import { db } from '../db';
import { syncQueue } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function enqueueMusic(
  userId: string,
  fileId: string,
  coverId: string | null,
  title: string | null,
  audioData: any
) {
  const [record] = await db.insert(syncQueue).values({
    userId,
    fileId,
    coverId,
    title,
    audioData: JSON.stringify(audioData),
    status: 'pending',
  }).returning();
  
  return record;
}

export async function getNextBatch(limit = 10) {
  return await db.select()
    .from(syncQueue)
    .where(eq(syncQueue.status, 'pending'))
    .limit(limit);
}

export async function updateSyncStatus(id: string, status: 'pending' | 'processing' | 'completed' | 'failed') {
  await db.update(syncQueue)
    .set({ status })
    .where(eq(syncQueue.id, id));
}

export async function clearCompletedSyncs() {
  await db.delete(syncQueue).where(eq(syncQueue.status, 'completed'));
}
