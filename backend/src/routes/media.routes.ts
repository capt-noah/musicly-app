import { Router } from 'express';
import { Readable } from 'stream';
import fetch from 'node-fetch';
import { bot } from '../config';

const router = Router();

router.get('/media/:file_id', async (req, res) => {
  try {
    const file = await bot.getFile(req.params.file_id);
    const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${encodeURIComponent(file.file_path!)}`;

    const response = await fetch(url);
    res.setHeader('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
    const nodeStream = Readable.fromWeb(response.body as any);
    nodeStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media' });
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
