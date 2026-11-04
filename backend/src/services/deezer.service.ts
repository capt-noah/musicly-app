import { Blowfish } from 'egoroof-blowfish';
import crypto from 'crypto';
import NodeID3 from 'node-id3';
import fetch from 'node-fetch';
import { bot } from '../config';
import { db } from '../db';
import { music, users } from '../schema';
import { eq, ilike, and } from 'drizzle-orm';
import { saveMusic, findOrCreateArtist, findOrCreateAlbum } from './songs.service';
import fs from 'fs';
import path from 'path';

export interface DeezerTrackMetadata {
  id: number;
  title: string;
  artist: string;
  albumTitle: string;
  duration: number;
  artworkURL?: string;
}

export interface DownloadResult {
  success: boolean;
  track?: any;
  fallback?: string;
  query?: string;
  error?: string;
}

const DEEZER_SECRET = 'g4el58wc0zvf9na1';
const STORAGE_DIR = path.resolve(__dirname, '../../storage/tracks');

// Ensure local tracks storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/**
 * Searches Deezer catalog for the best matching track.
 */
export async function searchDeezerTrack(title: string, artist: string): Promise<DeezerTrackMetadata | null> {
  const cleanTitle = title.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim();
  const cleanArtist = artist.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim();
  const query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);

  try {
    const res = await fetch(`https://api.deezer.com/search?q=${query}&limit=5`);
    if (!res.ok) return null;
    const data: any = await res.json();
    if (!data.data || data.data.length === 0) return null;

    const track = data.data[0];
    return {
      id: track.id,
      title: track.title,
      artist: track.artist?.name || cleanArtist,
      albumTitle: track.album?.title || 'Unknown Album',
      duration: track.duration || 0,
      artworkURL: track.album?.cover_xl || track.album?.cover_big || track.album?.cover_medium,
    };
  } catch (err) {
    console.error('[DeezerService] Search failed:', err);
    return null;
  }
}

/**
 * Downloads and decrypts the full track audio stream from Deezer CDN using Blowfish-CBC.
 */
export async function downloadAndDecryptTrack(trackId: number, arlOverride?: string): Promise<{ audioBuffer: Buffer; metadata: DeezerTrackMetadata } | null> {
  const arl = arlOverride || process.env.DEEZER_ARL;
  if (!arl) {
    console.warn('[DeezerService] DEEZER_ARL environment variable is not configured');
    return null;
  }

  try {
    // 1. Authenticate with Deezer gateway
    const userRes = await fetch('https://www.deezer.com/ajax/gw-light.php?method=deezer.getUserData&api_version=1.0&api_token=', {
      headers: {
        'Cookie': `arl=${arl}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    if (!userRes.ok) throw new Error(`User auth failed with status ${userRes.status}`);

    const userData: any = await userRes.json();
    const apiToken = userData.results?.checkForm;
    const licenseToken = userData.results?.USER?.OPTIONS?.license_token;

    // Collect response cookies for subsequent CSRF checks
    const cookiesList = [`arl=${arl}`];
    const rawHeaders: any = userRes.headers.raw ? userRes.headers.raw() : {};
    const setCookies = rawHeaders['set-cookie'] || [];
    for (const cookieStr of setCookies) {
      cookiesList.push(cookieStr.split(';')[0]);
    }
    const cookieHeader = cookiesList.join('; ');

    // 2. Fetch track token and detailed metadata
    const trackRes = await fetch(`https://www.deezer.com/ajax/gw-light.php?method=song.getData&api_version=1.0&api_token=${apiToken}`, {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      body: JSON.stringify({ sng_id: String(trackId) })
    });
    if (!trackRes.ok) throw new Error(`song.getData failed with status ${trackRes.status}`);

    const trackData: any = await trackRes.json();
    if (trackData.error && Object.keys(trackData.error).length > 0) {
      throw new Error(`song.getData error: ${JSON.stringify(trackData.error)}`);
    }

    const trackToken = trackData.results?.TRACK_TOKEN;
    if (!trackToken) throw new Error('No TRACK_TOKEN returned by Deezer gateway');

    const metadata: DeezerTrackMetadata = {
      id: trackId,
      title: trackData.results?.SNG_TITLE || 'Untitled',
      artist: trackData.results?.ART_NAME || 'Unknown Artist',
      albumTitle: trackData.results?.ALB_TITLE || 'Unknown Album',
      duration: parseInt(trackData.results?.DURATION || '0', 10),
      artworkURL: trackData.results?.ALB_PICTURE ? `https://e-cdns-images.dzcdn.net/images/cover/${trackData.results.ALB_PICTURE}/1000x1000-000000-80-0-0.jpg` : undefined
    };

    // 3. Obtain CDN streaming source from media.deezer.com
    const mediaRes = await fetch('https://media.deezer.com/v1/get_url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        license_token: licenseToken,
        media: [{
          type: 'FULL',
          formats: [
            { cipher: 'BF_CBC_STRIPE', format: 'MP3_320' },
            { cipher: 'BF_CBC_STRIPE', format: 'MP3_128' }
          ]
        }],
        track_tokens: [trackToken]
      })
    });
    if (!mediaRes.ok) throw new Error(`media.deezer.com returned status ${mediaRes.status}`);

    const mediaData: any = await mediaRes.json();
    const mediaSources = mediaData.data?.[0]?.media?.[0]?.sources;
    if (!mediaSources || mediaSources.length === 0) {
      throw new Error('No audio streaming sources available for track');
    }

    const streamUrl = mediaSources[0].url;
    console.log(`[DeezerService] Downloading audio stream from Deezer CDN (${mediaData.data[0].media[0].format})...`);

    // 4. Download encrypted audio buffer
    const streamRes = await fetch(streamUrl);
    if (!streamRes.ok) throw new Error(`Stream download failed with status ${streamRes.status}`);
    const encryptedBuf = Buffer.from(await streamRes.arrayBuffer());

    // 5. Blowfish decryption
    const idMd5 = crypto.createHash('md5').update(String(trackId)).digest('hex');
    const blowfishKey = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) {
      blowfishKey[i] = idMd5.charCodeAt(i) ^ idMd5.charCodeAt(i + 16) ^ DEEZER_SECRET.charCodeAt(i);
    }

    const bf = new Blowfish(blowfishKey, Blowfish.MODE.CBC, Blowfish.PADDING.NULL);
    bf.setIv(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));

    const decryptedBuf = Buffer.from(encryptedBuf);
    const CHUNK_SIZE = 2048;
    let chunkIdx = 0;
    for (let offset = 0; offset < decryptedBuf.length; offset += CHUNK_SIZE, chunkIdx++) {
      const chunkLen = Math.min(CHUNK_SIZE, decryptedBuf.length - offset);
      if (chunkIdx % 3 === 0 && chunkLen === CHUNK_SIZE) {
        const slice = decryptedBuf.subarray(offset, offset + CHUNK_SIZE);
        const dec = bf.decode(slice, Blowfish.TYPE.UINT8_ARRAY);
        Buffer.from(dec).copy(decryptedBuf, offset);
      }
    }

    // 6. Embed ID3 tags
    const tags: any = {
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.albumTitle,
    };

    if (metadata.artworkURL) {
      try {
        const imgRes = await fetch(metadata.artworkURL);
        if (imgRes.ok) {
          const imgBuf = Buffer.from(await imgRes.arrayBuffer());
          tags.image = {
            mime: 'image/jpeg',
            type: { id: 3, name: 'front cover' },
            description: 'Cover',
            imageBuffer: imgBuf
          };
        }
      } catch (imgErr) {
        console.warn('[DeezerService] Could not fetch cover art for ID3 tagging:', imgErr);
      }
    }

    const taggedBuffer = NodeID3.write(tags, decryptedBuf);
    const finalBuffer = Buffer.isBuffer(taggedBuffer) ? taggedBuffer : decryptedBuf;

    console.log(`[DeezerService] Successfully decrypted & tagged "${metadata.artist} - ${metadata.title}" (${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
    return { audioBuffer: finalBuffer, metadata };
  } catch (err: any) {
    console.error('[DeezerService] Decryption pipeline failed:', err?.message || err);
    return null;
  }
}

/**
 * Handles the complete in-app download and ingestion flow into Tone.
 */
export async function downloadFullSongForUser(
  userId: string | null,
  title: string,
  artist: string
): Promise<DownloadResult> {
  const fallbackQuery = `${artist} - ${title}`;

  // 1. Check if track already exists in Tone's cloud vault (Deduplication)
  try {
    const existingTracks = await db.select({
      id: music.id,
      title: music.title,
      audioFileId: music.audioFileId,
      coverFileId: music.coverFileId,
      durationSec: music.durationSec,
      fileSize: music.fileSize
    })
    .from(music)
    .where(ilike(music.title, `%${title.trim()}%`))
    .limit(5);

    if (existingTracks.length > 0) {
      const match = existingTracks[0];
      console.log(`[DeezerService] Track already exists in Tone Cloud Vault! (${match.title}, fileId: ${match.audioFileId})`);
      return {
        success: true,
        track: {
          id: match.id,
          title: match.title,
          artist,
          audioFileId: match.audioFileId,
          downloadUrl: `/media/audio/${match.audioFileId}`,
          duration: match.durationSec,
          fileSize: match.fileSize,
          isAlreadyInLibrary: true
        }
      };
    }
  } catch (dbErr) {
    console.warn('[DeezerService] Cloud vault lookup error:', dbErr);
  }

  // 2. Search Deezer
  console.log(`[DeezerService] Searching Deezer for "${artist} - ${title}"...`);
  const deezerTrack = await searchDeezerTrack(title, artist);
  if (!deezerTrack) {
    console.warn('[DeezerService] Track not found on Deezer catalog. Falling back to Path B.');
    return { success: false, fallback: 'deezer_telegram', query: fallbackQuery };
  }

  // 3. Download and decrypt from Deezer CDN (Path A)
  const downloadResult = await downloadAndDecryptTrack(deezerTrack.id);
  if (!downloadResult) {
    console.warn('[DeezerService] Path A download failed. Falling back to Path B.');
    return { success: false, fallback: 'deezer_telegram', query: fallbackQuery };
  }

  const { audioBuffer, metadata } = downloadResult;

  // 4. Ingest into Tone storage and database
  let audioFileId: string = '';
  let userTelegramId: string | null = null;

  if (userId) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      userTelegramId = user?.telegramId || null;
    } catch (e) {}
  }

  // If user is linked to Telegram, send audio to user chat via bot to get permanent Telegram file_id
  let sentViaBot = false;
  if (userTelegramId) {
    try {
      console.log(`[DeezerService] Uploading audio to Telegram for user ${userTelegramId}...`);
      const sentMsg = await bot.sendAudio(userTelegramId, audioBuffer, {
        title: metadata.title,
        performer: metadata.artist,
        duration: metadata.duration
      });
      if (sentMsg.audio?.file_id) {
        audioFileId = sentMsg.audio.file_id;
        sentViaBot = true;
      }
    } catch (tgErr) {
      console.warn('[DeezerService] Telegram audio upload failed, falling back to local server storage:', tgErr);
    }
  }

  // If not sent via bot or no telegram, save directly to local storage
  if (!sentViaBot) {
    const localId = `track-${crypto.randomUUID()}`;
    const localFilename = `${localId}.mp3`;
    const localPath = path.join(STORAGE_DIR, localFilename);
    fs.writeFileSync(localPath, audioBuffer);
    audioFileId = localId;
    console.log(`[DeezerService] Stored audio in server storage: ${localPath} (${audioFileId})`);
  }

  // Save to database
  try {
    const artistId = await findOrCreateArtist(metadata.artist);
    let albumId: string | undefined = undefined;
    if (metadata.albumTitle && metadata.albumTitle.toLowerCase() !== 'single') {
      albumId = await findOrCreateAlbum(metadata.albumTitle, artistId);
    }

    const effectiveUserId = userId || '00000000-0000-0000-0000-000000000000';
    await saveMusic(
      effectiveUserId,
      audioFileId!,
      null,
      {
        title: metadata.title,
        duration: metadata.duration,
        mime_type: 'audio/mpeg',
        file_size: audioBuffer.length
      },
      albumId,
      artistId
    );

    const [savedRecord] = await db.select().from(music).where(eq(music.audioFileId, audioFileId!)).limit(1);

    return {
      success: true,
      track: {
        id: savedRecord?.id || crypto.randomUUID(),
        title: metadata.title,
        artist: metadata.artist,
        albumTitle: metadata.albumTitle,
        artworkURL: metadata.artworkURL,
        audioFileId,
        downloadUrl: `/media/audio/${audioFileId}`,
        duration: metadata.duration,
        fileSize: audioBuffer.length,
        isAlreadyInLibrary: true
      }
    };
  } catch (saveErr: any) {
    console.error('[DeezerService] Database save error:', saveErr);
    return {
      success: true,
      track: {
        id: crypto.randomUUID(),
        title: metadata.title,
        artist: metadata.artist,
        audioFileId: audioFileId!,
        downloadUrl: `/media/audio/${audioFileId!}`,
        duration: metadata.duration,
        fileSize: audioBuffer.length
      }
    };
  }
}
