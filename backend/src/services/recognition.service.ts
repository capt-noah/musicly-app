import { recognizeBytes } from 'shazamio-core';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { db } from '../db';
import { music } from '../schema';
import { ilike } from 'drizzle-orm';

export interface MatchResult {
  id: string;
  title: string;
  artist: string;
  albumTitle?: string;
  artworkURL?: string;
  previewAudioURL?: string;
  appleMusicURL?: string;
  duration?: number;
  shazamKey?: string;
  isAlreadyInLibrary?: boolean;
  localTrackId?: string;
}

/**
 * Recognizes audio from a raw buffer (WAV, MP3, WebM, OGG, AAC)
 * using shazamio-core audio fingerprinting and Shazam v5 discovery API.
 */
export async function recognizeAudioBuffer(buffer: Buffer): Promise<MatchResult | null> {
  const startTime = Date.now();
  console.log(`[ToneMatch:Backend] [1/4] [Capture] Received audio buffer: ${buffer.length} bytes (${(buffer.length / 1024).toFixed(1)} KB)`);

  if (!buffer || buffer.length < 1000) {
    console.warn(`[ToneMatch:Backend:Warn] Audio buffer too small: ${buffer?.length || 0} bytes`);
    throw new Error('Audio sample too short or empty');
  }

  // 1. Audio Fingerprinting via shazamio-core WASM
  let sigs;
  try {
    sigs = recognizeBytes(new Uint8Array(buffer));
    console.log(`[ToneMatch:Backend] [2/4] [Fingerprint] Generated ${sigs.length} signature(s) in ${Date.now() - startTime}ms`);
  } catch (err: any) {
    console.error(`[ToneMatch:Backend:Error] [Fingerprint] Failed to extract acoustic signature:`, err?.message || err);
    throw new Error(`Acoustic fingerprinting failed: ${err?.message || 'Unsupported audio format'}`);
  }

  if (!sigs || sigs.length === 0) {
    console.warn(`[ToneMatch:Backend:Warn] shazamio-core produced 0 signatures from provided audio`);
    return null;
  }

  const sig = sigs[0];
  const sampleMs = Math.max(3000, sig.samplems || 4000);
  console.log(`[ToneMatch:Backend] Selected primary signature: samplems=${sampleMs}, uriLength=${sig.uri.length}`);

  // 2. Query Shazam Discovery v5
  const tag1 = crypto.randomUUID();
  const tag2 = crypto.randomUUID();
  const url = `https://amp.shazam.com/discovery/v5/en/US/iphone/-/tag/${tag1}/${tag2}?sync=true`;
  console.log(`[ToneMatch:Backend] [3/4] [ShazamAPI] Querying discovery endpoint with tag ${tag2}...`);

  let shazamRes;
  try {
    shazamRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Shazam/3685 CFNetwork/1408.0.4 Darwin/22.5.0',
      },
      body: JSON.stringify({
        signature: {
          uri: sig.uri,
          samplems: sampleMs,
        },
        timestamp: Date.now(),
        timezone: 'UTC',
      }),
    });
  } catch (networkErr: any) {
    console.error(`[ToneMatch:Backend:Error] [ShazamAPI] Network error querying Shazam:`, networkErr?.message || networkErr);
    throw new Error(`Shazam discovery network failure: ${networkErr?.message}`);
  }

  if (!shazamRes.ok) {
    console.error(`[ToneMatch:Backend:Error] [ShazamAPI] Endpoint returned HTTP ${shazamRes.status} ${shazamRes.statusText}`);
    throw new Error(`Shazam discovery API failed with HTTP ${shazamRes.status}`);
  }

  let json: any;
  try {
    json = await shazamRes.json();
  } catch (jsonErr: any) {
    console.error(`[ToneMatch:Backend:Error] [ShazamAPI] Could not parse JSON response:`, jsonErr?.message || jsonErr);
    throw new Error('Invalid JSON response from Shazam discovery API');
  }

  const matchesCount = Array.isArray(json.matches) ? json.matches.length : 0;
  console.log(`[ToneMatch:Backend] Shazam API response: status=200, matches=${matchesCount}, hasTrack=${Boolean(json.track)}`);

  if (!json.track || !json.track.title || !json.track.subtitle) {
    console.log(`[ToneMatch:Backend] No track identified for audio sample (matches count: ${matchesCount})`);
    return null;
  }

  const rawTitle = json.track.title.trim();
  const rawArtist = json.track.subtitle.trim();
  const shazamKey = json.track.key;
  let artworkURL = json.track.images?.coverarthq || json.track.images?.coverart || undefined;
  let appleMusicURL = json.track.url || json.track.share?.href || undefined;
  let previewAudioURL: string | undefined = undefined;

  // Extract preview URL from Shazam hub actions if available
  if (json.track.hub?.actions) {
    for (const act of json.track.hub.actions) {
      if (act.type === 'uri' && act.uri) {
        previewAudioURL = act.uri;
        break;
      }
    }
  }

  console.log(`[ToneMatch:Backend] [4/4] [Enrichment] Track identified: "${rawArtist} - ${rawTitle}" (Key: ${shazamKey})`);

  // 3. Metadata Enrichment via iTunes Search API
  let albumTitle: string | undefined = undefined;
  let duration: number = 30;

  try {
    const cleanQuery = `${rawArtist} ${rawTitle}`
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&media=music&entity=song&limit=1`;
    console.log(`[ToneMatch:Backend] Querying iTunes enrichment: ${itunesUrl}`);

    const itunesRes = await fetch(itunesUrl);
    if (itunesRes.ok) {
      const itunesData: any = await itunesRes.json();
      if (itunesData.results && itunesData.results.length > 0) {
        const item = itunesData.results[0];
        if (item.previewUrl) previewAudioURL = item.previewUrl;
        if (item.collectionName) albumTitle = item.collectionName;
        if (item.artworkUrl100) {
          artworkURL = item.artworkUrl100.replace('100x100bb', '1000x1000bb');
        }
        if (item.trackTimeMillis) {
          duration = Math.round(item.trackTimeMillis / 1000);
        }
        console.log(`[ToneMatch:Backend] iTunes enriched: album="${albumTitle}", previewUrl=${Boolean(previewAudioURL)}`);
      }
    }
  } catch (enrichErr: any) {
    console.warn(`[ToneMatch:Backend:Warn] iTunes enrichment non-fatal failure:`, enrichErr?.message || enrichErr);
  }

  // 4. Check if track already exists in Tone library
  let isAlreadyInLibrary = false;
  let localTrackId: string | undefined = undefined;

  try {
    const existing = await db.select({ id: music.id })
      .from(music)
      .where(ilike(music.title, `%${rawTitle}%`))
      .limit(1);

    if (existing && existing.length > 0) {
      isAlreadyInLibrary = true;
      localTrackId = existing[0].id;
      console.log(`[ToneMatch:Backend] Track already in Tone library (ID: ${localTrackId})`);
    }
  } catch (dbErr: any) {
    console.warn(`[ToneMatch:Backend:Warn] Library lookup error (ignored):`, dbErr?.message || dbErr);
  }

  const result: MatchResult = {
    id: crypto.randomUUID(),
    title: rawTitle,
    artist: rawArtist,
    albumTitle,
    artworkURL,
    previewAudioURL,
    appleMusicURL,
    duration,
    shazamKey,
    isAlreadyInLibrary,
    localTrackId,
  };

  console.log(`[ToneMatch:Backend] Recognition complete in ${Date.now() - startTime}ms:`, {
    title: result.title,
    artist: result.artist,
    hasPreview: Boolean(result.previewAudioURL),
    isAlreadyInLibrary: result.isAlreadyInLibrary,
  });

  return result;
}
