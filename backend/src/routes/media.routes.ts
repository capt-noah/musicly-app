import { Router } from 'express';
import fetch from 'node-fetch';
import { parseBuffer, selectCover } from 'music-metadata';
import { bot } from '../config';
import { db } from '../db';
import { music } from '../schema';
import { eq } from 'drizzle-orm';

const router = Router();

// In-memory LRU cover cache (holds extracted high-res covers in memory)
const coverCache = new Map<string, { buffer: Buffer; contentType: string }>();
const MAX_CACHE_ITEMS = 600;

function setCoverCache(key: string, value: { buffer: Buffer; contentType: string }) {
  if (coverCache.size >= MAX_CACHE_ITEMS) {
    const firstKey = coverCache.keys().next().value;
    if (firstKey) coverCache.delete(firstKey);
  }
  coverCache.set(key, value);
}

// Proxy profile photos and standard images with 1-year browser caching
router.get('/media/:file_id', async (req, res) => {
  const fileId = req.params.file_id;
  if (!fileId) return res.status(400).json({ error: 'Missing file_id' });

  if (coverCache.has(fileId)) {
    const cached = coverCache.get(fileId)!;
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(cached.buffer);
  }

  try {
    const url = await bot.getFileLink(fileId);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[MediaProxy] Telegram download failed: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ error: 'Telegram download failed' });
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    const buffer = await response.buffer();
    setCoverCache(fileId, { buffer, contentType });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buffer);
  } catch (error: any) {
    console.error('[MediaProxy] Critical error:', error?.message || error);
    res.status(500).json({ error: 'Failed to fetch media', details: error?.message });
  }
});

// Extract and serve original high-resolution embedded album art from audio file ID
const handleCoverExtraction = async (req: any, res: any) => {
  const fileId = req.params.file_id;
  if (!fileId) return res.status(400).json({ error: 'Missing file_id' });

  // 1. Check in-memory cache
  if (coverCache.has(fileId)) {
    const cached = coverCache.get(fileId)!;
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(cached.buffer);
  }

  try {
    const file = await bot.getFile(fileId);
    if (!file.file_path) {
      return res.status(404).json({ error: 'File path not found on Telegram' });
    }

    const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const filePath = file.file_path.toLowerCase();

    // If it's directly an image file, download and return
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.png') || filePath.endsWith('.webp')) {
      const imgRes = await fetch(url);
      if (!imgRes.ok) {
        return res.status(imgRes.status).json({ error: 'Telegram image download failed' });
      }
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      const buffer = await imgRes.buffer();
      setCoverCache(fileId, { buffer, contentType });

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(buffer);
    }

    // It's an audio file -> Extract embedded high-resolution APIC/ID3 album art
    // First, fetch the header range (first 2.5MB) to avoid downloading entire song
    let audioBuffer: Buffer;
    const rangeRes = await fetch(url, { headers: { Range: 'bytes=0-2621439' } });
    if (rangeRes.ok || rangeRes.status === 206) {
      audioBuffer = await rangeRes.buffer();
    } else {
      const fullRes = await fetch(url);
      audioBuffer = await fullRes.buffer();
    }

    try {
      const metadata = await parseBuffer(audioBuffer);
      const cover = selectCover(metadata.common.picture);
      if (cover && cover.data && cover.data.length > 0) {
        const buffer = Buffer.from(cover.data);
        const contentType = cover.format || 'image/jpeg';
        setCoverCache(fileId, { buffer, contentType });

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(buffer);
      }
    } catch (parseErr) {
      // If 2.5MB range parse didn't find picture, try full audio buffer
      if (rangeRes.status === 206) {
        const fullRes = await fetch(url);
        if (fullRes.ok) {
          const fullBuffer = await fullRes.buffer();
          const fullMeta = await parseBuffer(fullBuffer);
          const fullCover = selectCover(fullMeta.common.picture);
          if (fullCover && fullCover.data && fullCover.data.length > 0) {
            const buffer = Buffer.from(fullCover.data);
            const contentType = fullCover.format || 'image/jpeg';
            setCoverCache(fileId, { buffer, contentType });

            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return res.send(buffer);
          }
        }
      }
    }

    // If audio file has no embedded artwork, check if song has a Telegram thumbnail fallback in DB
    try {
      const [songRecord] = await db
        .select({ coverFileId: music.coverFileId })
        .from(music)
        .where(eq(music.audioFileId, fileId))
        .limit(1);

      if (songRecord?.coverFileId && songRecord.coverFileId !== fileId) {
        const thumbUrl = await bot.getFileLink(songRecord.coverFileId);
        const thumbRes = await fetch(thumbUrl);
        if (thumbRes.ok) {
          const contentType = thumbRes.headers.get('content-type') || 'image/jpeg';
          const buffer = await thumbRes.buffer();
          setCoverCache(fileId, { buffer, contentType });

          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return res.send(buffer);
        }
      }
    } catch (dbErr) {
      console.warn('[CoverProxy] Fallback DB check error:', dbErr);
    }

    return res.status(404).json({ error: 'No embedded cover art found' });
  } catch (error: any) {
    console.error('[CoverProxy] Error extracting high-res cover:', error?.message || error);
    res.status(500).json({ error: 'Failed to extract cover', details: error?.message });
  }
};

router.get('/media/cover/:file_id', handleCoverExtraction);
router.get('/cover/:file_id', handleCoverExtraction);

// Stream audio directly from Telegram to client with HTTP Range support
const handleAudioStream = async (req: any, res: any) => {
  try {
    const file = await bot.getFile(req.params.file_id);
    if (!file.file_path) {
      return res.status(404).json({ error: 'Audio file path not found on Telegram' });
    }

    const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const headers: Record<string, string> = {};
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const response = await fetch(url, { headers });
    if (!response.ok && response.status !== 206) {
      console.error(`[AudioProxy] Telegram audio fetch failed: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ error: 'Failed to fetch audio stream from Telegram' });
    }

    res.status(response.status);

    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges') || 'bytes';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', acceptRanges);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);

    // node-fetch v2 response.body is already a Node stream.Readable
    response.body.pipe(res);
  } catch (error: any) {
    console.error('[AudioProxy] Error streaming audio:', error?.message || error);
    res.status(500).json({ error: 'Failed to fetch audio', details: error?.message });
  }
};

router.get('/audio/:file_id', handleAudioStream);
router.get('/media/audio/:file_id', handleAudioStream);

export default router;
