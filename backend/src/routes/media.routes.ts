import { Router } from 'express';
import fetch from 'node-fetch';
import { bot } from '../config';

const router = Router();

// Proxy profile photos and images
router.get('/media/:file_id', async (req, res) => {
  console.log(`[MediaProxy] Fetching image file_id: ${req.params.file_id}`);
  try {
    const url = await bot.getFileLink(req.params.file_id);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[MediaProxy] Telegram download failed: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ error: 'Telegram download failed' });
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    
    const buffer = await response.buffer();
    res.send(buffer);
  } catch (error: any) {
    console.error('[MediaProxy] Critical error:', error?.message || error);
    res.status(500).json({ error: 'Failed to fetch media', details: error?.message });
  }
});

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
