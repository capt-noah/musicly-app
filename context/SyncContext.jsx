import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

import * as mm from 'music-metadata-browser';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';

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

const STORAGE_KEY = 'musicly_downloaded_songs';
const MUSIC_DIR = `${FileSystem.documentDirectory}music/`;
const COVERS_DIR = `${FileSystem.documentDirectory}covers/`;
const PROFILE_DIR = `${FileSystem.documentDirectory}profile/`;

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
  const notificationIdRef = useRef(null);

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

  // Initialize storage directories
  useEffect(() => {
    async function init() {
      const musicInfo = await FileSystem.getInfoAsync(MUSIC_DIR);
      if (!musicInfo.exists) await FileSystem.makeDirectoryAsync(MUSIC_DIR, { recursive: true });
      
      const coversInfo = await FileSystem.getInfoAsync(COVERS_DIR);
      if (!coversInfo.exists) await FileSystem.makeDirectoryAsync(COVERS_DIR, { recursive: true });

      const profileInfo = await FileSystem.getInfoAsync(PROFILE_DIR);
      if (!profileInfo.exists) await FileSystem.makeDirectoryAsync(PROFILE_DIR, { recursive: true });

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setDownloadedSongs(JSON.parse(stored));

      const storedPlaylists = await AsyncStorage.getItem('musicly_playlists');
      if (storedPlaylists) setPlaylists(JSON.parse(storedPlaylists));

      const storedProfilePhoto = await AsyncStorage.getItem('musicly_profile_photo');
      if (storedProfilePhoto) setLocalProfilePhoto(storedProfilePhoto);

      const storedFailed = await AsyncStorage.getItem('musicly_failed_songs');
      if (storedFailed) setFailedSongs(JSON.parse(storedFailed));

      if (sessionId) {
        await syncLikedSongs();
      }

      setIsInitialized(true);
    }
    init();
  }, [sessionId]);

  const lastUpdateRef = useRef({});

  const updateFileProgress = (fileId, progressValue) => {
    const now = Date.now();
    const lastUpdate = lastUpdateRef.current[fileId] || 0;
    
    if (progressValue === 1 || now - lastUpdate > 150) {
      setFileProgresses(prev => ({
        ...prev,
        [fileId]: progressValue
      }));
      lastUpdateRef.current[fileId] = now;
    }
  };

  const updateSyncNotification = async (current, total) => {
    try {
      if (current === total) {
        if (notificationIdRef.current) {
          await Notifications.dismissNotificationAsync(notificationIdRef.current);
          notificationIdRef.current = null;
        }
        return;
      }

      const content = {
        title: 'Syncing Library',
        body: `Syncing ${current} of ${total} songs...`,
        priority: Notifications.AndroidPriority.LOW,
        sticky: true,
      };

      if (notificationIdRef.current) {
        // Updating existing notification if possible (Expo notifications doesn't have a direct 'update' with progress bar yet, but we can re-schedule)
        await Notifications.dismissNotificationAsync(notificationIdRef.current);
      }
      notificationIdRef.current = await Notifications.scheduleNotificationAsync({
        content,
        trigger: null, // show immediately
      });
    } catch (e) {}
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

      console.log(`[Metadata] Extracted for ${song.id}: "${realTitle}" | "${realArtist}" | "${realAlbum}"`);

      // Report real metadata back to server so grouping is accurate
      let updatedMetadata = null;
      try {
        const syncRes = await fetch(`${BASE_URL}/songs/${song.id}/metadata`, {
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
          console.log(`[Metadata] Server updated successfully for ${song.id}. New Album: ${updatedMetadata.albumTitle} (ID: ${updatedMetadata.albumId})`);
        }
      } catch (err) {
        console.warn('Failed to sync metadata back to server:', err);
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
      
      return { coverUri, updatedMetadata };
    } catch (err) {
      console.log(`No embedded art or error in ${song.id}:`, err);
      return { coverUri: null, updatedMetadata: null };
    }
  };

  const downloadFile = async (fileIdOrUrl, type = 'audio') => {
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
        const endpoint = `${BASE_URL}/songs/file/${fileIdOrUrl}`;
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
      const fileUri = `${folder}${targetFileId}.${extension}`;

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

  const syncLikedSongs = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await fetch(`${API_URL}/interactions/songs/liked`, {
        headers: { 'Authorization': `Bearer ${sessionId}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLikedSongs(data);
      }
    } catch (error) {
      console.error('Liked songs sync failed:', error);
    }
  }, [sessionId, API_URL]);

  const toggleLike = useCallback(async (songId) => {
    if (!sessionId) return;
    
    // Optimistic update
    const isCurrentlyLiked = likedSongs.some(s => s.id === songId);
    if (isCurrentlyLiked) {
      setLikedSongs(prev => prev.filter(s => s.id !== songId));
    } else {
      const songData = Object.values(downloadedSongs).find(s => s.id === songId);
      if (songData) setLikedSongs(prev => [songData, ...prev]);
    }

    try {
      const response = await fetch(`${API_URL}/interactions/songs/${songId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionId}` }
      });
      if (!response.ok) {
        // Revert on error
        await syncLikedSongs();
      }
    } catch (error) {
      console.error('Toggle like failed:', error);
      await syncLikedSongs();
    }
  }, [sessionId, API_URL, likedSongs, downloadedSongs, syncLikedSongs]);

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

  const syncMusic = useCallback(async (isBackground = false) => {
    if (!sessionId || syncing) return;
    setSyncing(true);
    const pendingEndpoint = `${BASE_URL}/songs/sync/pending`;

    try {
      const response = await fetch(pendingEndpoint, {
        headers: { 'Authorization': `Bearer ${sessionId}` }
      });
      if (!response.ok) return;

      const pendingSongs = await response.json();
      setSyncQueue(pendingSongs);
      setFileProgresses({});

      const newDownloads = { ...downloadedSongs };
      const currentFailed = { ...failedSongs };
      let updated = false;
      let failedUpdated = false;

      setProgress({ current: 0, total: pendingSongs.length });
      await updateSyncNotification(0, pendingSongs.length);

      for (let i = 0; i < pendingSongs.length; i++) {
        const song = pendingSongs[i];
        const existing = newDownloads[song.id];
        
        if (currentFailed[song.id] && !isBackground) continue;

        let needsDownload = !existing;
        if (existing?.localAudioUri) {
          try {
            const info = await FileSystem.getInfoAsync(resolveLocalPath(existing.localAudioUri));
            if (!info.exists) needsDownload = true;
          } catch (e) { needsDownload = true; }
        }

        if (needsDownload) {
          let audioUri = null;
          let lastError = null;
          let attempts = 0;
          while (!audioUri && attempts < 3) {
            attempts++;
            const res = await downloadFile(song.audioFileId, 'audio');
            audioUri = res.uri;
            lastError = res.error;
            if (!audioUri && attempts < 3) await new Promise(r => setTimeout(r, 1000));
          }

          if (audioUri) {
            const absoluteAudioPath = resolveLocalPath(audioUri);
            const { coverUri, updatedMetadata } = await extractCoverArt(absoluteAudioPath, song);
            let finalCoverUri = coverUri;
            if (!finalCoverUri && song.coverFileId) {
              const { uri: coverRes } = await downloadFile(song.coverFileId, 'cover');
              finalCoverUri = coverRes;
            }

            const finalSongData = updatedMetadata || song;
            newDownloads[song.id] = { ...finalSongData, localAudioUri: audioUri, localCoverUri: finalCoverUri, syncedAt: new Date().toISOString() };
            updated = true;
            if (currentFailed[song.id]) {
              delete currentFailed[song.id];
              failedUpdated = true;
            }
            updateFileProgress(song.audioFileId, 1);
          } else {
            currentFailed[song.id] = { ...song, error: lastError || 'Download failed', failedAt: new Date().toISOString() };
            failedUpdated = true;
          }
        } else {
          updateFileProgress(song.audioFileId, 1);
          if (existing.artistName !== song.artistName || existing.title !== song.title) {
            newDownloads[song.id] = { ...existing, ...song };
            updated = true;
          }
        }
        
        const newProgress = i + 1;
        setProgress({ current: newProgress, total: pendingSongs.length });
        if (i % 2 === 0) await updateSyncNotification(newProgress, pendingSongs.length);
        if (updated && (i % 5 === 0 || i === pendingSongs.length - 1)) setDownloadedSongs({ ...newDownloads });
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
      setSyncQueue([]);
    }
  }, [sessionId, downloadedSongs, syncing, failedSongs, BASE_URL, API_URL, syncPlaylists]);

  const deleteFailedSong = useCallback(async (songId) => {
    try {
      if (sessionId && API_URL) {
        const baseApiUrl = API_URL.replace(/\/api$/, '');
        await fetch(`${baseApiUrl}/songs/${songId}`, {
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
      syncLikedSongs();
      syncProfilePhoto();
      initBackgroundSync();
    }
  }, [sessionId, isInitialized, user?.profilePhoto]);

  // Define background task
  useEffect(() => {
    TaskManager.defineTask(SYNC_TASK_NAME, async () => {
      try {
        await syncMusic(true);
        return BackgroundTask.BackgroundTaskResult.Success;
      } catch (error) {
        return BackgroundTask.BackgroundTaskResult.Failed;
      }
    });
  }, [syncMusic]);

  return (
    <SyncContext.Provider
      value={{
        downloadedSongs,
        playlists,
        likedSongs,
        syncing,
        progress,
        syncQueue,
        fileProgresses,
        isInitialized,
        resolveLocalPath,
        syncMusic,
        syncPlaylists,
        syncLikedSongs,
        syncProfilePhoto,
        uploadProfilePhoto,
        toggleLike,
        deleteFailedSong,
        retryFailedSync,
        localProfilePhoto,
        failedSongs,
        API_URL
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => useContext(SyncContext);
