import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

import * as mm from 'music-metadata-browser';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { LiveActivity } from 'expo-widgets';

const SYNC_TASK_NAME = 'BACKGROUND_MUSIC_SYNC';

// Notification configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const SyncContext = createContext();

// Define background task at the top level
TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    // In background task, we can't use hooks, so we need to trigger sync differently
    // For now, we'll rely on the app being in a state where it can sync, 
    // or we can implement a standalone sync function if needed.
    console.log('[Background] Sync task triggered');
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error('[Background] Sync task failed:', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

const STORAGE_KEY = 'musicly_downloaded_songs';
const PENDING_PLAYS_KEY = 'musicly_pending_plays';
const MUSIC_DIR = `${FileSystem.documentDirectory}Music/`;
const LOCALS_DIR = `${MUSIC_DIR}Locals/`;
const COVERS_DIR = `${FileSystem.documentDirectory}Artwork/`;
const PROFILE_DIR = `${FileSystem.documentDirectory}profile/`;
const OLD_MUSIC_DIR = `${FileSystem.documentDirectory}music/`;
const OLD_COVERS_DIR = `${FileSystem.documentDirectory}covers/`;
const SYNC_CHANNEL_ID = 'sync-progress';

export function SyncProvider({ children }) {
  const { sessionId, user, API_URL } = useAuth();
  const [downloadedSongs, setDownloadedSongs] = useState({});
  const [playlists, setPlaylists] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [syncQueue, setSyncQueue] = useState([]);
  const [fileProgresses, setFileProgresses] = useState({});
  const [likedSongs, setLikedSongs] = useState([]);
  const [failedSongs, setFailedSongs] = useState({});
  const [localProfilePhoto, setLocalProfilePhoto] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingPlays, setPendingPlays] = useState([]);
  const notificationIdRef = useRef(null);
  const syncingRef = useRef(false);
  const totalRef = useRef(0);
  const currentTrackIndexRef = useRef(0);
  const successCountRef = useRef(0);
  const failCountRef = useRef(0);
  const lastNotificationUpdateRef = useRef(0);
  const lastUpdateRef = useRef({});

  // Get base URL (stripping /api if it exists for routes like /songs)
  const BASE_URL = API_URL.replace(/\/api$/, '');

  /**
   * Resolves a local relative URI to an absolute file URI valid for the current session.
   * Prepends the current document directory to fixed relative paths.
   */
  const resolveLocalPath = useCallback((path) => {
    if (!path) return null;
    if (path.startsWith('file:///')) return path;
    return `${FileSystem.documentDirectory}${path}`;
  }, []);

  // Initialize storage, permissions and notifications
  useEffect(() => {
    async function init() {
      // 1. Storage Directories & Migration
      try {
        // Migrate music folder
        const oldMusicInfo = await FileSystem.getInfoAsync(OLD_MUSIC_DIR);
        const newMusicInfo = await FileSystem.getInfoAsync(MUSIC_DIR);
        if (oldMusicInfo.exists && !newMusicInfo.exists) {
          await FileSystem.moveAsync({ from: OLD_MUSIC_DIR, to: MUSIC_DIR });
        } else if (!newMusicInfo.exists) {
          await FileSystem.makeDirectoryAsync(MUSIC_DIR, { recursive: true });
        }

        // Migrate covers folder
        const oldCoversInfo = await FileSystem.getInfoAsync(OLD_COVERS_DIR);
        const newCoversInfo = await FileSystem.getInfoAsync(COVERS_DIR);
        if (oldCoversInfo.exists && !newCoversInfo.exists) {
          await FileSystem.moveAsync({ from: OLD_COVERS_DIR, to: COVERS_DIR });
        } else if (!newCoversInfo.exists) {
          await FileSystem.makeDirectoryAsync(COVERS_DIR, { recursive: true });
        }

        const profileInfo = await FileSystem.getInfoAsync(PROFILE_DIR);
        if (!profileInfo.exists) await FileSystem.makeDirectoryAsync(PROFILE_DIR, { recursive: true });

        // Ensure Locals folder exists for manual sideloading
        const localsInfo = await FileSystem.getInfoAsync(LOCALS_DIR);
        if (!localsInfo.exists) await FileSystem.makeDirectoryAsync(LOCALS_DIR, { recursive: true });
      } catch (e) {
        console.warn('Directory init/migration failed:', e);
      }

      // 2. Notification Permissions & Channel
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync(SYNC_CHANNEL_ID, {
            name: 'Sync Progress',
            importance: Notifications.AndroidImportance.LOW,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#b9cbba',
          });
        }
      } catch (e) {
        console.warn('Notification init failed:', e);
      }

      // 3. Load State
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let currentDownloads = {};
      if (stored) {
        currentDownloads = JSON.parse(stored);
        
        // Path Migration: Update internal paths if we moved folders
        let stateNeedsUpdate = false;
        const migratedDownloads = { ...currentDownloads };
        
        Object.keys(migratedDownloads).forEach(id => {
          const song = migratedDownloads[id];
          let updated = false;
          if (song.localAudioUri && song.localAudioUri.toLowerCase().startsWith('music/')) {
            song.localAudioUri = song.localAudioUri.replace(/music\//i, 'Music/');
            updated = true;
          }
          if (song.localCoverUri && song.localCoverUri.toLowerCase().startsWith('covers/')) {
            song.localCoverUri = song.localCoverUri.replace(/covers\//i, 'Artwork/');
            updated = true;
          }
          if (updated) stateNeedsUpdate = true;
        });

        if (stateNeedsUpdate) {
          console.log('[Migration] Updating paths in stored state');
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migratedDownloads));
          currentDownloads = migratedDownloads;
        }
        
        setDownloadedSongs(currentDownloads);
      }
      
      const storedPlaylists = await AsyncStorage.getItem('musicly_playlists');
      if (storedPlaylists) setPlaylists(JSON.parse(storedPlaylists));
      const storedProfilePhoto = await AsyncStorage.getItem('musicly_profile_photo');
      if (storedProfilePhoto) setLocalProfilePhoto(storedProfilePhoto);
      const storedFailed = await AsyncStorage.getItem('musicly_failed_songs');
      if (storedFailed) setFailedSongs(JSON.parse(storedFailed));

      const storedPendingPlays = await AsyncStorage.getItem(PENDING_PLAYS_KEY);
      if (storedPendingPlays) setPendingPlays(JSON.parse(storedPendingPlays));

      if (sessionId) {
        await syncLikes();
      }

      // 4. Scan for local files added manually
      await scanLocalFiles(currentDownloads);

      setIsInitialized(true);
    }
    init();
  }, [sessionId, scanLocalFiles]);


  const scanLocalFiles = useCallback(async (currentDownloads) => {
    try {
      // Create Locals directory if it somehow doesn't exist
      const localsInfo = await FileSystem.getInfoAsync(LOCALS_DIR);
      if (!localsInfo.exists) {
        await FileSystem.makeDirectoryAsync(LOCALS_DIR, { recursive: true });
      }

      const files = await FileSystem.readDirectoryAsync(LOCALS_DIR);
      const audioFiles = files.filter(f => f.toLowerCase().endsWith('.mp3') || f.toLowerCase().endsWith('.m4a'));
      
      let updated = false;
      const newDownloads = { ...currentDownloads };

      for (const filename of audioFiles) {
        // Now that it's in a separate folder, we only check if it's already in our state
        const relPath = `Music/Locals/${filename}`;
        const isTracked = Object.values(newDownloads).some(s => s.localAudioUri === relPath);

        if (!isTracked) {
          console.log(`[Scanner] Found new sideloaded file: ${filename}`);
          const fullPath = `${LOCALS_DIR}${filename}`;
          
          try {
            const encodedPath = fullPath.replace(/ /g, '%20');
            const response = await fetch(encodedPath);
            const blob = await response.blob();
            const metadata = await mm.parseBlob(blob);
            
            const rawLyrics = metadata.common.lyrics;
            const lyrics = rawLyrics && rawLyrics.length > 0 ? (typeof rawLyrics[0] === 'string' ? rawLyrics[0] : rawLyrics[0].text) : null;
            
            // Extract cover art if available
            let localCoverUri = null;
            if (metadata.common.picture && metadata.common.picture.length > 0) {
              try {
                const pic = metadata.common.picture[0];
                const coverFilename = `local_${filename.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_")}.jpg`;
                const coverPath = `${COVERS_DIR}${coverFilename}`;
                
                const base64Data = Buffer.from(pic.data).toString('base64');
                await FileSystem.writeAsStringAsync(coverPath, base64Data, { encoding: FileSystem.EncodingType.Base64 });
                localCoverUri = `Artwork/${coverFilename}`;
              } catch (picErr) {
                console.warn(`[Scanner] Cover extraction failed for ${filename}:`, picErr);
              }
            }

            const songId = `local_${filename.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_")}`;
            newDownloads[songId] = {
              id: songId,
              title: metadata.common.title || filename.replace(/\.[^/.]+$/, ""),
              artistName: metadata.common.artist || 'Local Artist',
              albumTitle: metadata.common.album || 'Local Files',
              localAudioUri: relPath,
              localCoverUri: localCoverUri,
              isLocalOnly: true,
              syncedAt: new Date().toISOString(),
              duration: metadata.format.duration || 0,
              lyrics: lyrics || null,
            };
            updated = true;
          } catch (err) {
            console.warn(`[Scanner] Metadata extraction failed for ${filename}:`, err);
          }
        }
      }

      if (updated) {
        setDownloadedSongs(newDownloads);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newDownloads));
      }
    } catch (e) {
      console.warn('[Scanner] Local scan failed:', e);
    }
  }, []);

  const updateFileProgress = (fileId, progressValue) => {
    const now = Date.now();
    const lastUpdate = lastUpdateRef.current[fileId] || 0;
    
    if (progressValue === 1 || now - lastUpdate > 150) {
      setFileProgresses(prev => ({
        ...prev,
        [fileId]: progressValue
      }));
      lastUpdateRef.current[fileId] = now;

      // Update global progress state for the UI, but DO NOT update notification here to avoid spam
      if (syncingRef.current && totalRef.current > 0) {
        const floatProgress = currentTrackIndexRef.current + progressValue;
        setProgress({ current: floatProgress, total: totalRef.current });
      }
    }
  };

  const liveActivityRef = useRef(null);

  const updateSyncNotification = async (current, total, successCount = 0, failCount = 0) => {
    try {
      const isFinished = current >= total && total > 0;
      const progressInt = Math.floor(current);
      
      let title = 'Musicly Sync';
      let body = '';

      if (isFinished) {
        title = failCount > 0 ? 'Sync Finished with Issues' : 'Sync Complete';
        body = failCount > 0 
          ? `Synced ${successCount} tracks, ${failCount} failed.` 
          : `Successfully synced ${total} tracks.`;
        
        // End Live Activity if it exists
        if (liveActivityRef.current) {
          await liveActivityRef.current.end();
          liveActivityRef.current = null;
        }
      } else {
        body = `Processing track ${progressInt + 1} of ${total}`;
        
        // Handle Live Activity for Dynamic Island
        if (Platform.OS === 'ios') {
          try {
            if (!liveActivityRef.current && total > 0) {
              liveActivityRef.current = await LiveActivity.start('sync-progress', {
                progress: progressInt,
                total: total,
                title: 'Syncing Music...'
              });
            } else if (liveActivityRef.current) {
              await liveActivityRef.current.update({
                progress: progressInt,
                total: total,
                title: 'Syncing Music...'
              });
            }
          } catch (err) {
            console.warn('Live Activity failed:', err);
          }
        }
      }

      await Notifications.scheduleNotificationAsync({
        identifier: 'musicly-sync-progress',
        content: {
          title,
          body,
          sticky: !isFinished,
          priority: isFinished 
            ? Notifications.AndroidNotificationPriority.HIGH 
            : Notifications.AndroidNotificationPriority.LOW,
          sound: isFinished,
          vibrate: isFinished ? [0, 250, 250, 250] : null,
          android: {
            channelId: SYNC_CHANNEL_ID,
            ongoing: !isFinished,
          },
          ios: {
            interruptionLevel: isFinished ? 'active' : 'passive',
          }
        },
        trigger: null,
      });

      if (isFinished && failCount === 0) {
        setTimeout(() => {
          Notifications.dismissNotificationAsync('musicly-sync-progress');
        }, 5000);
      }
    } catch (e) {
      console.warn('Notification update failed:', e);
    }
  };

  /**
   * Extracts embedded album art from a local audio file and saves it to COVERS_DIR.
   */
  const extractCoverArt = async (audioUri, song) => {
    try {
      const response = await fetch(audioUri);
      const blob = await response.blob();
      const metadata = await mm.parseBlob(blob);
      
      const realAlbum = metadata.common.album;
      const realArtist = metadata.common.artist;
      const realTitle = metadata.common.title;
      const rawLyrics = metadata.common.lyrics;
      const lyrics = rawLyrics && rawLyrics.length > 0 ? rawLyrics[0] : null;


      // Report real metadata back to server so grouping is accurate
      let updatedMetadata = null;
      try {
        const syncRes = await fetch(`${BASE_URL}/music/${song.id}/metadata`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionId}`
          },
          body: JSON.stringify({
            title: realTitle || song.title,
            artistName: realArtist || song.artistName,
            albumTitle: realAlbum || null
          })
        });

        if (syncRes.ok) {
          updatedMetadata = await syncRes.json();
        }
      } catch (err) {
      }
      
      let coverUri = null;
      if (metadata.common && metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        const base64String = Buffer.from(picture.data).toString('base64');
        const extension = picture.format.includes('png') ? 'png' : 'jpg';
        const absoluteCoverUri = `${COVERS_DIR}${song.id}_high.${extension}`;

        await FileSystem.writeAsStringAsync(absoluteCoverUri, base64String, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        coverUri = absoluteCoverUri.split('/Documents/')[1] || absoluteCoverUri;
      }
      
      return { coverUri, updatedMetadata, lyrics };
    } catch (err) {
      return { coverUri: null, updatedMetadata: null, lyrics: null };
    }
  };

  const downloadFile = async (fileIdOrUrl, type = 'audio', filenameHint = null) => {
    if (!sessionId) return { uri: null, error: 'No session' };
    try {
      let url = null;
      let targetFileId = fileIdOrUrl;

      if (type === 'profile') {
        if (fileIdOrUrl.startsWith('data:image')) {
          const folder = PROFILE_DIR;
          const fileUri = `${folder}user_avatar.jpg`;
          const base64Data = fileIdOrUrl.replace(/^data:image\/\w+;base64,/, '');
          await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
          const relPath = fileUri.split('/Documents/')[1];
          return { uri: relPath || fileUri };
        }
        url = fileIdOrUrl.startsWith('/') ? `${BASE_URL}${fileIdOrUrl}` : fileIdOrUrl;
        targetFileId = 'user_avatar';
      } else {
        const endpoint = `${BASE_URL}/music/file/${fileIdOrUrl}`;
        const response = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${sessionId}` }
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Status ${response.status}`);
        }
        
        const data = await response.json();
        url = data.url;
      }

      const extension = type === 'audio' ? 'mp3' : 'jpg';
      const folder = type === 'audio' ? MUSIC_DIR : (type === 'profile' ? PROFILE_DIR : COVERS_DIR);
      
      let finalFilename = `${targetFileId}.${extension}`;
      if (filenameHint && type === 'audio') {
        // Sanitize filename: remove characters that are invalid in filesystems (including Windows/Linux/Mac)
        const sanitized = filenameHint.replace(/[<>:"/\\|?*#%]/g, '').trim();
        if (sanitized) {
          finalFilename = `${sanitized}.${extension}`;
        }
      }
      
      const fileUri = `${folder}${finalFilename}`;

      const callback = downloadProgress => {
        if (!downloadProgress || !downloadProgress.totalBytesExpectedToWrite) return;
        const currentProgress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 0.95;
        if (type === 'audio') updateFileProgress(targetFileId, Math.max(0, Math.min(0.95, currentProgress)));
      };

      const downloadResumable = FileSystem.createDownloadResumable(url, fileUri, {}, callback);
      const downloadRes = await downloadResumable.downloadAsync();
      
      if (!downloadRes || downloadRes.status < 200 || downloadRes.status >= 300) {
        if (await FileSystem.getInfoAsync(fileUri).then(i => i.exists)) {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        }
        return { uri: null, error: 'File system download failed' };
      }

      const relPath = downloadRes.uri.split('/Documents/')[1];
      return { uri: relPath || downloadRes.uri };
    } catch (error) {
      console.error(`Download failed for ${fileIdOrUrl}:`, error.message);
      return { uri: null, error: error.message };
    }
  };

  const syncPlaylists = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await fetch(`${API_URL}/playlists`, {
        headers: { 'Authorization': `Bearer ${sessionId}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPlaylists(data);
        await AsyncStorage.setItem('musicly_playlists', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Playlist sync failed:', error);
    }
  }, [sessionId, API_URL]);


/**
* Toggles liked status for a song
*/
const toggleLike = useCallback(async (songId) => {
if (!sessionId) return;

// Optimistic UI update
setLikedSongs(prev => {
  const isLiked = prev.some(s => s.id === songId);
  if (isLiked) {
    return prev.filter(s => s.id !== songId);
  } else {
    // Find the song in downloadedSongs to get metadata
    const songData = downloadedSongs[songId];
    if (!songData) return prev;
    return [songData, ...prev];
  }
});

try {
  const response = await fetch(`${BASE_URL}/music/${songId}/like`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionId}`,
    }
  });
  
  if (!response.ok) throw new Error('Like toggle failed');
  
  const data = await response.json();
  // If the server says something different, we could correct here, 
  // but usually optimistic is fine.
} catch (error) {
  console.warn('Error toggling like:', error);
  // Revert if failed (optional, depends on UX preference)
}
}, [sessionId, BASE_URL, downloadedSongs]);

/**
* Fetch liked songs from server
*/
const syncLikes = useCallback(async () => {
if (!sessionId) return;
try {
  const response = await fetch(`${BASE_URL}/music/likes`, {
    headers: {
      'Authorization': `Bearer ${sessionId}`,
    }
  });
  if (response.ok) {
    const data = await response.json();
    setLikedSongs(data);
  }
} catch (error) {
  console.warn('Failed to sync likes:', error);
}
}, [sessionId, BASE_URL]);

  const syncProfilePhoto = useCallback(async () => {
    if (!user?.profilePhoto) return;
    const storedUrl = await AsyncStorage.getItem('musicly_profile_photo_url');
    let isFileValid = false;
    if (localProfilePhoto) {
      try {
        const info = await FileSystem.getInfoAsync(resolveLocalPath(localProfilePhoto));
        if (info.exists && info.size > 500) isFileValid = true;
      } catch (e) { isFileValid = false; }
    }

    if (storedUrl === user.profilePhoto && isFileValid) return;

    try {
      const { uri: localUri } = await downloadFile(user.profilePhoto, 'profile');
      if (localUri) {
        setLocalProfilePhoto(localUri);
        await AsyncStorage.setItem('musicly_profile_photo', localUri);
        await AsyncStorage.setItem('musicly_profile_photo_url', user.profilePhoto);
      } else if (localProfilePhoto) {
        try {
          await FileSystem.deleteAsync(resolveLocalPath(localProfilePhoto), { idempotent: true });
          setLocalProfilePhoto(null);
          await AsyncStorage.removeItem('musicly_profile_photo');
        } catch (e) {}
      }
    } catch (err) {}
  }, [user?.profilePhoto, localProfilePhoto, downloadFile, resolveLocalPath]);

  const uploadProfilePhoto = useCallback(async (localUri) => {
    if (!sessionId) return;
    try {
      const base64Data = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
      const dataUri = `data:image/jpeg;base64,${base64Data}`;
      const response = await fetch(`${API_URL}/me/profile-photo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionId}` },
        body: JSON.stringify({ base64: dataUri })
      });

      if (response.ok) {
        const data = await response.json();
        const { uri: savedUri } = await downloadFile(dataUri, 'profile');
        if (savedUri) {
          setLocalProfilePhoto(savedUri);
          await AsyncStorage.setItem('musicly_profile_photo', savedUri);
          await AsyncStorage.setItem('musicly_profile_photo_url', dataUri);
        }
        return data.user;
      }
    } catch (err) { throw err; }
  }, [sessionId, API_URL, downloadFile]);

  const syncPendingPlays = useCallback(async (playsToSync) => {
    if (!sessionId || playsToSync.length === 0) return;
    console.log(`[Sync] Attempting to sync ${playsToSync.length} pending plays...`);
    try {
      const response = await fetch(`${BASE_URL}/music/plays/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
        body: JSON.stringify({ plays: playsToSync })
      });
      if (response.ok) {
        console.log('[Sync] Successfully synced pending plays to server.');
        setPendingPlays([]);
        await AsyncStorage.removeItem(PENDING_PLAYS_KEY);
      } else {
        console.warn('[Sync] Failed to sync plays. Server responded with status:', response.status);
      }
    } catch (e) {
      console.error('[Sync] Network error during plays sync:', e);
    }
  }, [sessionId, BASE_URL]);

  const recordPlay = useCallback(async (songId) => {
    // 1. Optimistic update in downloadedSongs
    setDownloadedSongs(prev => {
      const song = prev[songId];
      if (!song) return prev;
      return {
        ...prev,
        [songId]: { ...song, plays: (song.plays || 0) + 1 }
      };
    });

    // 2. Add to pending plays
    const newPlay = { songId, playedAt: new Date().toISOString() };
    const updatedPending = [...pendingPlays, newPlay];
    setPendingPlays(updatedPending);
    await AsyncStorage.setItem(PENDING_PLAYS_KEY, JSON.stringify(updatedPending));

    // 3. Try immediate sync
    if (sessionId) {
      console.log(`[Sync] Attempting immediate server record for play: ${songId}`);
      try {
        const response = await fetch(`${BASE_URL}/music/${songId}/play`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sessionId}` }
        });
        if (response.ok) {
          console.log(`[Sync] Server confirmed play for ${songId}`);
          // If successful, remove this specific play from pending
          const filtered = updatedPending.filter(p => p !== newPlay);
          setPendingPlays(filtered);
          await AsyncStorage.setItem(PENDING_PLAYS_KEY, JSON.stringify(filtered));
        } else {
          console.warn(`[Sync] Server rejected play recording (Status: ${response.status}). Keep in pending.`);
        }
      } catch (e) {
        console.log('[Sync] Offline or server unreachable. Play saved locally for later sync.');
      }
    } else {
      console.log('[Sync] No session active. Play saved locally for later sync.');
    }
  }, [pendingPlays, sessionId, BASE_URL]);

  const syncMusic = useCallback(async (isBackground = false) => {
    if (!sessionId || syncing) return;
    
    // Sync plays first
    if (pendingPlays.length > 0) {
      await syncPendingPlays(pendingPlays);
    }

    setSyncing(true);
    const pendingEndpoint = `${BASE_URL}/music/sync/pending`;

    try {
      const response = await fetch(pendingEndpoint, {
        headers: { 'Authorization': `Bearer ${sessionId}` }
      });
      if (!response.ok) {
        setSyncing(false);
        syncingRef.current = false;
        return;
      }

      const pendingSongs = await response.json();
      
      // Pre-filter: Check which songs actually need downloading
      const actualDownloads = [];
      for (const song of pendingSongs) {
        const existing = downloadedSongs[song.id];
        let needsDownload = !existing;
        let needsCoverUpdate = false;

        if (existing) {
          // Check audio
          if (existing.localAudioUri) {
            try {
              const info = await FileSystem.getInfoAsync(resolveLocalPath(existing.localAudioUri));
              if (!info.exists) needsDownload = true;
            } catch (e) { needsDownload = true; }
          } else {
            needsDownload = true;
          }

          // Check if cover art was updated on server (compare IDs or check if local exists)
          if (!existing.localCoverUri) {
            needsCoverUpdate = true;
          } else if (song.coverFileId && existing.coverFileId !== song.coverFileId) {
            needsCoverUpdate = true;
          }
        }

        if (needsDownload || needsCoverUpdate) {
          if (!failedSongs[song.id] || isBackground) {
            actualDownloads.push(song);
          }
        }
      }

      const newDownloads = { ...downloadedSongs };
      const currentFailed = { ...failedSongs };
      let updated = false;
      let failedUpdated = false;
      let successCount = 0;
      let failCount = 0;

      setSyncQueue(actualDownloads);
      setFileProgresses({});

      // Only show notification if there are actual downloads to perform
      const totalToDownload = actualDownloads.length;
      let currentDownloadIndex = 0;

      if (totalToDownload > 0) {
        setProgress({ current: 0, total: totalToDownload });
        await updateSyncNotification(0, totalToDownload);
      }

      syncingRef.current = true;
      totalRef.current = actualDownloads.length;
      currentTrackIndexRef.current = 0;
      successCountRef.current = 0;
      failCountRef.current = 0;

      for (let i = 0; i < pendingSongs.length; i++) {
        const song = pendingSongs[i];
        const existing = newDownloads[song.id];
        
        // Check if this specific song was marked for download
        const needsDownload = actualDownloads.some(s => s.id === song.id);

        if (needsDownload) {
          let audioUri = null;
          let lastError = null;
          let attempts = 0;
          while (!audioUri && attempts < 3) {
            attempts++;
            const filenameHint = `${song.artistName || 'Unknown'} - ${song.title || 'Untitled'}`;
            const res = await downloadFile(song.audioFileId, 'audio', filenameHint);
            audioUri = res.uri;
            lastError = res.error;
            if (!audioUri && attempts < 3) await new Promise(r => setTimeout(r, 1000));
          }

          if (audioUri) {
            const absoluteAudioPath = resolveLocalPath(audioUri);
            const { coverUri, updatedMetadata, lyrics } = await extractCoverArt(absoluteAudioPath, song);
            let finalCoverUri = coverUri;
            
            // If no embedded cover, or if we explicitly need a cover update from server
            if (!finalCoverUri && song.coverFileId) {
              const { uri: coverRes } = await downloadFile(song.coverFileId, 'cover');
              finalCoverUri = coverRes;
            }

            const finalSongData = updatedMetadata || song;
            newDownloads[song.id] = { 
              ...finalSongData, 
              localAudioUri: audioUri, 
              localCoverUri: finalCoverUri, 
              syncedAt: new Date().toISOString(),
              coverFileId: song.coverFileId, // Store this to detect future changes
              lyrics: lyrics || null
            };
            updated = true;
            successCountRef.current++;
            if (currentFailed[song.id]) {
              delete currentFailed[song.id];
              failedUpdated = true;
            }
            updateFileProgress(song.audioFileId, 1);
          } else if (existing && existing.localAudioUri) {
            // Audio exists but maybe we just need a cover update
            let finalCoverUri = existing.localCoverUri;
            if (song.coverFileId && existing.coverFileId !== song.coverFileId) {
              const { uri: coverRes } = await downloadFile(song.coverFileId, 'cover');
              if (coverRes) finalCoverUri = coverRes;
            }
            
            newDownloads[song.id] = { 
              ...existing, 
              ...song, 
              localCoverUri: finalCoverUri, 
              coverFileId: song.coverFileId 
            };
            updated = true;
            successCountRef.current++;
            updateFileProgress(song.audioFileId, 1);
          } else {
            currentFailed[song.id] = { ...song, error: lastError || 'Download failed', failedAt: new Date().toISOString() };
            failedUpdated = true;
            failCountRef.current++;
          }
          
          currentTrackIndexRef.current++;
          if (totalRef.current > 0) {
            setProgress({ current: currentTrackIndexRef.current, total: totalRef.current });
            if (currentTrackIndexRef.current % 2 === 0 || currentTrackIndexRef.current === totalRef.current) {
              await updateSyncNotification(currentTrackIndexRef.current, totalRef.current, successCountRef.current, failCountRef.current);
            }
          }
        } else {
          // Song exists, just check for metadata updates silently
          if (existing) {
            const merged = { ...existing, ...song };
            // Stringify comparison ensures ANY new field from the server (like 'plays') updates the cache
            if (JSON.stringify(existing) !== JSON.stringify(merged)) {
              newDownloads[song.id] = merged;
              updated = true;
            }
          }
        }
        
        if (updated && (i % 5 === 0 || i === pendingSongs.length - 1)) {
          setDownloadedSongs({ ...newDownloads });
        }
      }

      if (updated) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newDownloads));
      if (failedUpdated) {
        setFailedSongs(currentFailed);
        await AsyncStorage.setItem('musicly_failed_songs', JSON.stringify(currentFailed));
      }
      await syncPlaylists();
      await updateSyncNotification(pendingSongs.length, pendingSongs.length);
    } catch (error) {
      console.error(`Sync error:`, error);
    } finally {
      setSyncing(false);
      syncingRef.current = false;
      setSyncQueue([]);
    }
  }, [sessionId, downloadedSongs, syncing, failedSongs, BASE_URL, API_URL, syncPlaylists]);

  const deleteFailedSong = useCallback(async (songId) => {
    try {
      if (sessionId && API_URL) {
        const baseApiUrl = API_URL.replace(/\/api$/, '');
        await fetch(`${baseApiUrl}/music/${songId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${sessionId}` }
        });
      }
    } catch (e) {
      console.error('[Sync] Failed to delete song from server:', e);
    }

    const updated = { ...failedSongs };
    delete updated[songId];
    setFailedSongs(updated);
    await AsyncStorage.setItem('musicly_failed_songs', JSON.stringify(updated));
  }, [failedSongs, sessionId, API_URL]);

  const retryFailedSync = useCallback(async (songId) => {
    const song = failedSongs[songId];
    if (!song) return;
    
    // Remove from failed first
    const updatedFailed = { ...failedSongs };
    delete updatedFailed[songId];
    setFailedSongs(updatedFailed);
    await AsyncStorage.setItem('musicly_failed_songs', JSON.stringify(updatedFailed));
    
    // Trigger sync
    syncMusic();
  }, [failedSongs, syncMusic]);

  // Auto-sync and Background Task Registration
  useEffect(() => {
    const initBackgroundSync = async () => {
      try {
        await BackgroundTask.registerTaskAsync(SYNC_TASK_NAME, {
          minimumInterval: 15 * 60, // 15 minutes
        });
      } catch (e) {}
    };

    if (sessionId && isInitialized) {
      syncMusic();
      syncLikes();
      syncProfilePhoto();
      initBackgroundSync();
    }
  }, [sessionId, isInitialized, user?.profilePhoto]);


  const updateSongMetadataLocally = useCallback(async (songId, metadata) => {
    setDownloadedSongs(prev => {
      const existing = prev[songId];
      if (!existing) return prev;
      const updated = { ...existing, ...metadata };
      const newSongs = { ...prev, [songId]: updated };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSongs)).catch(console.error);
      return newSongs;
    });
  }, []);

  return (
    <SyncContext.Provider value={{ 
      downloadedSongs, syncing, progress, syncMusic, resolveLocalPath, 
      localProfilePhoto, syncQueue, fileProgresses, playlists, syncPlaylists,
      likedSongs, toggleLike, syncLikes,
      failedSongs, deleteFailedSong, retryFailedSync,
      syncProfilePhoto, uploadProfilePhoto,
      API_URL, updateSongMetadataLocally,
      recordPlay, pendingPlays
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => useContext(SyncContext);
