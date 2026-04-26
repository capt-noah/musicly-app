import { Router } from 'express';
import { Readable } from 'stream';
import fetch from 'node-fetch';
import { bot } from '../config';

const router = Router();

router.get('/media/:file_id', async (req, res) => {
  console.log(`[MediaProxy] Fetching file_id: ${req.params.file_id}`);
  try {
    const url = await bot.getFileLink(req.params.file_id);
    console.log(`[MediaProxy] Downloading from Telegram: ${url.replace(process.env.TELEGRAM_BOT_TOKEN || '', '***')}`);

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[MediaProxy] Telegram download failed: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ error: 'Telegram download failed' });
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    
    // For profile photos, buffering is safer and avoids stream type conflicts
    const buffer = await response.buffer();
    res.send(buffer);
  } catch (error: any) {
    console.error('[MediaProxy] Critical error:', error.message || error);
    res.status(500).json({ error: 'Failed to fetch media', details: error.message });
  }
});

router.get('/audio/:file_id', async (req, res) => {
  try {
    const file = await bot.getFile(req.params.file_id);
    const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const response = await fetch(url);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
    const nodeStream = Readable.fromWeb(response.body as any);
    nodeStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audio' });
  }
});

export default router;
