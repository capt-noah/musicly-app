import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

import * as mm from 'music-metadata-browser';

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
  const [localProfilePhoto, setLocalProfilePhoto] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

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

      if (sessionId) {
        await syncLikedSongs();
      }

      setIsInitialized(true);
    }
    init();
  }, [sessionId]);

  const updateFileProgress = (fileId, progressValue) => {
    setFileProgresses(prev => ({
      ...prev,
      [fileId]: progressValue
    }));
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
    if (!sessionId) return null;
    try {
      let url = null;
      let targetFileId = fileIdOrUrl;

      if (type === 'profile') {
        url = fileIdOrUrl;
        targetFileId = 'user_avatar';
      } else {
        const endpoint = `${BASE_URL}/songs/file/${fileIdOrUrl}`;
        const response = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${sessionId}` }
        });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = await response.json();
        url = data.url;
      }

      const extension = type === 'audio' ? 'mp3' : 'jpg';
      const folder = type === 'audio' ? MUSIC_DIR : (type === 'profile' ? PROFILE_DIR : COVERS_DIR);
      const fileUri = `${folder}${targetFileId}.${extension}`;

      const callback = downloadProgress => {
        if (!downloadProgress || !downloadProgress.totalBytesExpectedToWrite) return;
        const currentProgress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        if (type === 'audio') {
          updateFileProgress(targetFileId, Math.max(0, Math.min(1, currentProgress)));
        }
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        {},
        callback
      );

      const downloadRes = await downloadResumable.downloadAsync();
      
      if (type === 'audio') {
        updateFileProgress(targetFileId, 1);
      }

      const relPath = downloadRes.uri.split('/Documents/')[1];
      return relPath || downloadRes.uri;
    } catch (error) {
      console.error(`Download failed for ${fileIdOrUrl}:`, error);
      return null;
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
    
    // If we already have a local photo and the URL hasn't changed (or we just want to avoid re-downloading)
    // For now, let's check if it exists
    const storedUrl = await AsyncStorage.getItem('musicly_profile_photo_url');
    if (storedUrl === user.profilePhoto && localProfilePhoto) return;

    console.log('Syncing profile photo from:', user.profilePhoto);
    const localUri = await downloadFile(user.profilePhoto, 'profile');
    if (localUri) {
      setLocalProfilePhoto(localUri);
      await AsyncStorage.setItem('musicly_profile_photo', localUri);
      await AsyncStorage.setItem('musicly_profile_photo_url', user.profilePhoto);
    }
  }, [user?.profilePhoto, localProfilePhoto]);

  const syncMusic = useCallback(async () => {
    if (!sessionId || syncing) return;
    setSyncing(true);
    console.log('Syncing music started...');
    const pendingEndpoint = `${BASE_URL}/songs/sync/pending`;

    try {
      const response = await fetch(pendingEndpoint, {
        headers: { 'Authorization': `Bearer ${sessionId}` }
      });
      
      if (!response.ok) {
        console.error('Sync request failed:', response.status);
        return;
      }

      const pendingSongs = await response.json();
      console.log(`Found ${pendingSongs.length} songs for sync.`);

      setSyncQueue(pendingSongs);
      setFileProgresses({});

      const newDownloads = { ...downloadedSongs };
      let updated = false;

      setProgress({ current: 0, total: pendingSongs.length });

      for (let i = 0; i < pendingSongs.length; i++) {
        const song = pendingSongs[i];
        
        if (!newDownloads[song.id]) {
          console.log(`Syncing new song: ${song.title}`);
          
          // Step 1: Download audio
          const audioUri = await downloadFile(song.audioFileId, 'audio');
          let coverUri = null;

          if (audioUri) {
            // Step 2: Extract high-res art and real metadata from the local file
            const absoluteAudioPath = resolveLocalPath(audioUri);
            const { coverUri, updatedMetadata } = await extractCoverArt(absoluteAudioPath, song);

            // Step 3: Fallback to Telegram thumb if no art is embedded
            let finalCoverUri = coverUri;
            if (!finalCoverUri && song.coverFileId) {
              console.log(`Falling back to thumbnail for ${song.title}`);
              finalCoverUri = await downloadFile(song.coverFileId, 'cover');
            }

            // Use updated metadata from server if available, otherwise fallback to original
            const finalSongData = updatedMetadata || song;

            newDownloads[song.id] = {
              ...finalSongData,
              localAudioUri: audioUri,
              localCoverUri: finalCoverUri,
              syncedAt: new Date().toISOString()
            };
            updated = true;
          }
        } else {
          // If song exists, refresh its metadata (artistName, title, etc.) from the backend
          const existing = newDownloads[song.id];
          if (existing.artistName !== song.artistName || existing.title !== song.title || existing.albumTitle !== song.albumTitle) {
            newDownloads[song.id] = {
              ...existing,
              ...song, // This overwrites metadata but keeps localAudioUri/localCoverUri from 'existing' if not in 'song'
              localAudioUri: existing.localAudioUri,
              localCoverUri: existing.localCoverUri,
            };
            updated = true;
          }
        }
        setProgress(prev => ({ ...prev, current: i + 1 }));
      }

      if (updated) {
        setDownloadedSongs(newDownloads);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newDownloads));
      }

      await syncPlaylists();
    } catch (error) {
      console.error(`Sync error (${pendingEndpoint}):`, error);
    } finally {
      setSyncing(false);
      setSyncQueue([]);
      console.log('Syncing finished.');
    }
  }, [sessionId, downloadedSongs, syncing, BASE_URL, API_URL, syncPlaylists]);

  // Auto-sync when sessionId exists and local storage is initialized
  useEffect(() => {
    if (sessionId && isInitialized) {
      syncMusic();
      syncLikedSongs();
      syncProfilePhoto();
    }
  }, [sessionId, isInitialized, user?.profilePhoto]);

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
        toggleLike,
        localProfilePhoto,
        API_URL
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => useContext(SyncContext);
