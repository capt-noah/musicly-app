import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useSync } from './SyncContext';
import { useAuth } from './AuthContext';

import AsyncStorage from '@react-native-async-storage/async-storage';

const PlayerContext = createContext();
const STATE_STORAGE_KEY = 'musicly_player_state';

export function PlayerProvider({ children }) {
  const { downloadedSongs, resolveLocalPath } = useSync();
  const { API_URL, sessionId } = useAuth();
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [repeatMode, setRepeatMode] = useState('OFF'); // 'OFF', 'ONE', 'ALL'
  const [shuffleMode, setShuffleMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const expandPlayer = () => setIsExpanded(true);
  const collapsePlayer = () => setIsExpanded(false);

  // Initialize the player. We use useMemo to ensure it's created only once.
  const player = useMemo(() => createAudioPlayer(''), []);
  const status = useAudioPlayerStatus(player);

  // Persistence Logic: Load and sync state on mount
  useEffect(() => {
    const restoreState = async () => {
      try {
        const localState = await AsyncStorage.getItem(STATE_STORAGE_KEY);
        let lastState = localState ? JSON.parse(localState) : null;
        const baseApiUrl = API_URL.replace(/\/api$/, '');

        if (!lastState) {
          if (!sessionId) return;
          const response = await fetch(`${baseApiUrl}/api/player/state`, {
            headers: { Authorization: `Bearer ${sessionId}` }
          });
          if (response.ok) {
            lastState = await response.json();
          }
        }

        if (lastState && lastState.songId) {
          const track = downloadedSongs[lastState.songId];
          if (track) {
            setCurrentTrack(track);
            const resolvedUri = resolveLocalPath(track.localAudioUri);
            if (resolvedUri) player.replace(resolvedUri);
            
            // Re-populate the queue on mount so skip controls work immediately
            const allSongs = Object.values(downloadedSongs);
            setQueue(allSongs);
            const idx = allSongs.findIndex(t => t.id === track.id);
            setQueueIndex(idx !== -1 ? idx : 0);

            if (lastState.positionMs) {
              player.seekTo(lastState.positionMs / 1000); // expo-audio uses seconds
            }
          }
        }
      } catch (error) {
        console.error('Failed to restore playback state:', error);
      }
    };

    if (Object.keys(downloadedSongs).length > 0 && API_URL) {
      restoreState();
    }
  }, [downloadedSongs, player, API_URL, sessionId]);

  // Periodic persistence sync
  useEffect(() => {
    let interval;
    if (status.playing && currentTrack) {
      interval = setInterval(async () => {
        const state = { 
          songId: currentTrack.id, 
          positionMs: Math.floor(status.currentTime * 1000) 
        };
        await AsyncStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
        syncToServer(state);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [status.playing, currentTrack, status.currentTime]);

  // Keep currentTrack synchronized with updated metadata (e.g., high-res cover upgrades)
  useEffect(() => {
    if (currentTrack && downloadedSongs[currentTrack.id]) {
      const latestData = downloadedSongs[currentTrack.id];
      // Only update if the metadata has actually changed (e.g., localCoverUri upgraded to _high)
      if (latestData.localCoverUri !== currentTrack.localCoverUri || 
          latestData.localAudioUri !== currentTrack.localAudioUri) {
        setCurrentTrack(latestData);
      }
    }
  }, [downloadedSongs, currentTrack?.id]);

  const syncToServer = async (state) => {
    try {
      if (!sessionId || !API_URL) return;
      const baseApiUrl = API_URL.replace(/\/api$/, '');
      await fetch(`${baseApiUrl}/api/player/state`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionId}` 
        },
        body: JSON.stringify(state)
      });
    } catch (e) {
      // Just ignore sync errors
    }
  };
  
  // Tracks the ID of the song actually loaded/playing in the hardware player
  const playerTrackId = React.useRef(null);

  // Handle track finishing: Auto-advance queue or reset at end
  useEffect(() => {
    if (!currentTrack) return;

    // Update the ID of what's actually on deck when it starts/resumes
    if (status.playing && status.currentTime > 0) {
      playerTrackId.current = currentTrack.id;
    }

    const isFinished = status.playbackState === 'finished';
    const isActuallyAtEnd = status.duration > 0 && 
                           status.currentTime > 0 && 
                           status.currentTime >= status.duration - 0.5;

    // TRIPLE GUARD: 
    // 1. Must be finished or at end
    // 2. The hardware player must be currently tied to the same track ID as our state
    // 3. Prevent double-triggering by clearing the ID after advancing
    if ((isFinished || (isActuallyAtEnd && !status.playing)) && playerTrackId.current === currentTrack.id) {
      console.log(`[Queue] Track ${currentTrack.title} (${currentTrack.id}) completed cleanly. Advancing...`);
      playerTrackId.current = null; // Unbind immediately to prevent double-skipping
      playNext(true);
    }
  }, [status.playbackState, status.currentTime, status.duration, currentTrack?.id, status.playing]);

  const playTrack = async (track, newQueue = null, startPositionMs = 0, forcePlay = false) => {
    try {
      if (newQueue) {
        setQueue(newQueue);
        const idx = newQueue.findIndex(t => t.id === track.id);
        setQueueIndex(idx !== -1 ? idx : 0);
      } else {
        // Find index in existing queue to keep state consistent
        const idx = queue.findIndex(t => t.id === track.id);
        if (idx !== -1) setQueueIndex(idx);
      }

      if (currentTrack?.id === track.id && !forcePlay) {
        if (status.playing) {
          player.pause();
        } else {
          // If this track already ended, restart from the beginning before play.
          if (status.playbackState === 'finished') {
            player.seekTo(0);
          }
          player.play();
        }
        return;
      }

      const resolvedUri = resolveLocalPath(track.localAudioUri);
      if (resolvedUri) {
        player.replace(resolvedUri);
      }
      if (startPositionMs > 0) {
        player.seekTo(startPositionMs / 1000);
      }
      player.play();
      setCurrentTrack(track);
      
      const state = { songId: track.id, positionMs: startPositionMs };
      
      // Fire-and-forget storage to avoid blocking the UI thread during skips
      AsyncStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state))
        .then(() => syncToServer(state))
        .catch(err => console.error('Failed to save playback state:', err));
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const togglePlayback = () => {
    if (status.playing) {
      player.pause();
    } else {
      // Always restart when status reports finished/end-of-track.
      if (status.playbackState === 'finished') {
        player.seekTo(0);
      } else if (status.duration && status.currentTime >= status.duration - 0.15) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const playNext = (autoPlay = false) => {
    if (queue.length === 0) return;

    // Handle REPEAT_ONE
    if (repeatMode === 'ONE') {
      player.seekTo(0);
      player.play();
      return;
    }

    if (queue.length === 1) {
      player.seekTo(0);
      player.pause();
      return;
    }
    
    // Check if we are at the end of the queue
    if (queueIndex >= queue.length - 1) {
      if (repeatMode === 'ALL') {
        setQueueIndex(0);
        playTrack(queue[0], null, 0, true);
      } else {
        console.log('End of queue reached.');
        player.seekTo(0);
        player.pause();
      }
      return;
    }
    
    if (shuffleMode && queue.length > 1) {
      let nextIdx;
      do {
        nextIdx = Math.floor(Math.random() * queue.length);
      } while (nextIdx === queueIndex);
      setQueueIndex(nextIdx);
      playTrack(queue[nextIdx], null, 0, true);
      return;
    }

    const nextIdx = queueIndex + 1;
    setQueueIndex(nextIdx);
    playTrack(queue[nextIdx], null, 0, true);
  };

  const playPrevious = () => {
    if (status.currentTime > 3 || queue.length <= 1) {
      player.seekTo(0);
      player.play();
      return;
    }
    const prevIdx = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prevIdx);
    playTrack(queue[prevIdx], null, 0, true);
  };

  const seekTo = (positionMs) => {
    player.seekTo(positionMs / 1000);
  };

  const toggleRepeatMode = () => {
    const modes = ['OFF', 'ALL', 'ONE'];
    const nextIdx = (modes.indexOf(repeatMode) + 1) % modes.length;
    setRepeatMode(modes[nextIdx]);
  };

  const toggleShuffleMode = () => {
    setShuffleMode(!shuffleMode);
  };

  const addToQueue = (track) => {
    setQueue(prev => [...prev, track]);
  };

  const playNextTrack = (track) => {
    setQueue(prev => {
      const newQueue = [...prev];
      newQueue.splice(queueIndex + 1, 0, track);
      return newQueue;
    });
  };

  const removeFromQueue = (trackId) => {
    setQueue(prev => {
      const idx = prev.findIndex(t => t.id === trackId);
      if (idx === -1) return prev;
      
      const newQueue = prev.filter(t => t.id !== trackId);
      if (idx <= queueIndex) {
        setQueueIndex(Math.max(0, queueIndex - 1));
      }
      return newQueue;
    });
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying: status.playing,
      playbackStatus: status,
      playTrack,
      togglePlayback,
      playNext,
      playPrevious,
      seekTo,
      queue,
      repeatMode,
      toggleRepeatMode,
      shuffleMode,
      toggleShuffleMode,
      addToQueue,
      playNextTrack,
      removeFromQueue,
      isExpanded,
      expandPlayer,
      collapsePlayer
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
