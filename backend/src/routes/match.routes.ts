import { Router, Request, Response } from 'express';
import { recognizeAudioBuffer } from '../services/recognition.service';

const router = Router();

/**
 * Recognizes audio sent as either:
 * 1. Raw binary stream (Content-Type: application/octet-stream, audio/wav, audio/webm, etc.)
 * 2. JSON body with { audioBase64: "..." }
 */
router.post('/', async (req: Request, res: Response) => {
  const reqStart = Date.now();
  console.log(`[ToneMatch:Route] POST /api/match received from ${req.ip || 'client'} (Content-Type: ${req.headers['content-type']})`);

  let audioBuffer: Buffer | null = null;

  // Case 1: Raw binary buffer in req.body
  if (Buffer.isBuffer(req.body) && req.body.length > 0) {
    audioBuffer = req.body;
    console.log(`[ToneMatch:Route] Parsed raw binary audio buffer: ${audioBuffer.length} bytes`);
  }
  // Case 2: JSON payload with audioBase64
  else if (req.body && typeof req.body.audioBase64 === 'string') {
    const cleanBase64 = req.body.audioBase64.replace(/^data:audio\/[^;]+;base64,/, '');
    audioBuffer = Buffer.from(cleanBase64, 'base64');
    console.log(`[ToneMatch:Route] Parsed base64 audio payload: ${audioBuffer.length} bytes`);
  }
  // Case 3: Empty body
  else {
    console.warn(`[ToneMatch:Route:Warn] Missing audio payload in request body`);
    return res.status(400).json({
      error: 'Missing audio payload. Send raw binary audio (application/octet-stream) or JSON { audioBase64 }',
    });
  }

  try {
    const match = await recognizeAudioBuffer(audioBuffer);
    const durationMs = Date.now() - reqStart;

    if (match) {
      console.log(`[ToneMatch:Route] Successfully recognized "${match.artist} - ${match.title}" in ${durationMs}ms`);
      return res.json({
        success: true,
        match,
        durationMs,
      });
    } else {
      console.log(`[ToneMatch:Route] No match found in ${durationMs}ms`);
      return res.json({
        success: true,
        match: null,
        message: 'No match identified for provided audio',
        durationMs,
      });
    }
  } catch (error: any) {
    const durationMs = Date.now() - reqStart;
    console.error(`[ToneMatch:Route:Error] Recognition error after ${durationMs}ms:`, error?.message || error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Audio recognition failed',
      durationMs,
    });
  }
});

export default router;
