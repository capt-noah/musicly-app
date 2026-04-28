import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
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
  const [repeatMode, setRepeatMode] = useState('OFF');
  const [shuffleMode, setShuffleMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Refs mirror state so callbacks are stable
  const queueRef = useRef([]);
  const queueIndexRef = useRef(0);
  const repeatModeRef = useRef('OFF');
  const shuffleModeRef = useRef(false);
  const currentTrackRef = useRef(null);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { shuffleModeRef.current = shuffleMode; }, [shuffleMode]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  // Configure Audio Mode for Background Playback
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      staysActiveInBackground: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
    }).catch(err => console.warn('Audio mode config failed:', err));
  }, []);

  const expandPlayer = () => setIsExpanded(true);
  const collapsePlayer = () => setIsExpanded(false);

  const player = useMemo(() => {
    const p = createAudioPlayer('');
    // expo-audio uses .metadata for lock screen info
    p.showNowPlayingControls = true;
    return p;
  }, []);

  // Cleanup player on unmount to prevent "JS runtime lost" errors
  useEffect(() => {
    return () => {
      player.pause();
    };
  }, [player]);
  const status = useAudioPlayerStatus(player);

  // Persistence: restore last state on mount
  useEffect(() => {
    const restoreState = async () => {
      try {
        const localState = await AsyncStorage.getItem(STATE_STORAGE_KEY);
        let lastState = localState ? JSON.parse(localState) : null;
        const baseApiUrl = API_URL.replace(/\/api$/, '');
        if (!lastState && sessionId) {
          const res = await fetch(`${baseApiUrl}/api/player/state`, { headers: { Authorization: `Bearer ${sessionId}` } });
          if (res.ok) lastState = await res.json();
        }
        if (lastState?.songId) {
          const track = downloadedSongs[lastState.songId];
          if (track) {
            setCurrentTrack(track);
            const uri = resolveLocalPath(track.localAudioUri);
            if (uri) player.replace(uri);
            const allSongs = Object.values(downloadedSongs);
            setQueue(allSongs);
            const idx = allSongs.findIndex(t => t.id === track.id);
            setQueueIndex(idx !== -1 ? idx : 0);
            if (lastState.positionMs) player.seekTo(lastState.positionMs / 1000);
          }
        }
      } catch (e) { console.error('Failed to restore playback state:', e); }
    };
    if (Object.keys(downloadedSongs).length > 0 && API_URL) restoreState();
  }, [downloadedSongs, player, API_URL, sessionId]);

  // Periodic persistence
  useEffect(() => {
    let interval;
    if (status.playing && currentTrack) {
      interval = setInterval(() => {
        const state = { songId: currentTrack.id, positionMs: Math.floor(player.currentTime * 1000) };
        AsyncStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state))
          .then(() => syncToServer(state)).catch(() => {});
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [status.playing, currentTrack?.id]);

  // Sync currentTrack with latest metadata
  useEffect(() => {
    if (currentTrack && downloadedSongs[currentTrack.id]) {
      const latest = downloadedSongs[currentTrack.id];
      if (latest.localCoverUri !== currentTrack.localCoverUri || latest.localAudioUri !== currentTrack.localAudioUri) {
        setCurrentTrack(latest);
      }
    }
  }, [downloadedSongs, currentTrack?.id]);

  const syncToServer = async (state) => {
    try {
      if (!sessionId || !API_URL) return;
      const baseApiUrl = API_URL.replace(/\/api$/, '');
      await fetch(`${baseApiUrl}/api/player/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionId}` },
        body: JSON.stringify(state),
      });
    } catch (e) {}
  };

  const playTrack = useCallback(async (track, newQueue = null, startPositionMs = 0, forcePlay = false) => {
    try {
      // Clear guards immediately when a track is manually or programmatically triggered
      advanceGuardRef.current = null;
      lastTimeRef.current = 0;
      wasPlayingRef.current = false;

      if (newQueue) {
        setQueue(newQueue);
        queueRef.current = newQueue;
        const idx = newQueue.findIndex(t => t.id === track.id);
        const resolvedIdx = idx !== -1 ? idx : 0;
        setQueueIndex(resolvedIdx);
        queueIndexRef.current = resolvedIdx;
      } else {
        const idx = queueRef.current.findIndex(t => t.id === track.id);
        if (idx !== -1) { setQueueIndex(idx); queueIndexRef.current = idx; }
      }

      const current = currentTrackRef.current;
      if (current?.id === track.id && !forcePlay) {
        // Optimization: If it's the same song and not a forced replay, just toggle
        if (player.playing) {
          player.pause();
        } else {
          player.play();
        }
        return;
      }

      const uri = resolveLocalPath(track.localAudioUri);
      if (uri) player.replace(uri);
      if (startPositionMs > 0) player.seekTo(startPositionMs / 1000);
      player.play();
      setCurrentTrack(track);
      currentTrackRef.current = track;

      const artworkUri = resolveLocalPath(track.localCoverUri) || track.coverUrl;
      
      player.metadata = {
        title: track.title,
        artist: track.artistName || 'Unknown Artist',
        album: track.albumTitle || 'Single',
        artwork: artworkUri,
      };

      const state = { songId: track.id, positionMs: startPositionMs };
      AsyncStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state))
        .then(() => syncToServer(state)).catch(() => {});
    } catch (e) { console.error('Error playing track:', e); }
  }, [player, resolveLocalPath]);

  const playNext = useCallback((isAuto = false) => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    const repeat = repeatModeRef.current;
    const shuffle = shuffleModeRef.current;

    if (q.length === 0) return;

    // Handle Repeat One (restarts current track)
    if (repeat === 'ONE') {
      playTrack(q[idx], null, 0, true);
      return;
    }

    // Determine the next index
    let nextIdx = idx + 1;
    if (shuffle && q.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * q.length);
      } while (nextIdx === idx);
    } else if (nextIdx >= q.length) {
      if (repeat === 'ALL') {
        nextIdx = 0;
      } else {
        // End of queue and no loop: stop at the end of the last song
        player.seekTo(0);
        player.pause();
        return;
      }
    }

    if (q[nextIdx]) {
      playTrack(q[nextIdx], null, 0, true);
    }
  }, [player, playTrack]);

  const playPrevious = useCallback(() => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    
    if (q.length === 0) return;

    // Standard music player behavior: 
    // If song is > 3 seconds in, restart the current song. 
    // If at the very beginning, go to the actual previous track.
    if (player.currentTime > 3) {
      playTrack(q[idx], null, 0, true);
      return;
    }

    const prevIdx = (idx - 1 + q.length) % q.length;
    if (q[prevIdx]) {
      playTrack(q[prevIdx], null, 0, true);
    }
  }, [player, playTrack]);

  // ─── AUTO-ADVANCE & LOGGING: bullet-proof track progression ───────────────────
  const wasPlayingRef = useRef(false);
  const lastTimeRef = useRef(0);
  const advanceGuardRef = useRef(null);
  const lastLoggedState = useRef('');

  useEffect(() => {
    
    // Using a direct listener on the player instance is more robust than monitoring hook state
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      // 1. Log state changes for diagnosis (throttled/filtered)
      const stateKey = `${status.playbackState}_${status.playing}`;
      if (stateKey !== lastLoggedState.current) {
        lastLoggedState.current = stateKey;
      }

      // 2. Completion Detection
      // didJustFinish is common, but we also check currentTime/duration for safety
      const dur = status.duration || player.duration;
      const cur = status.currentTime || player.currentTime;
      const isNearEnd = dur > 0 && cur >= dur - 0.3;
      const isFinished = status.playbackState === 'finished' || status.didJustFinish;

      if ((isFinished || isNearEnd) && status.playing === false && wasPlayingRef.current) {
        wasPlayingRef.current = false; // Reset immediately
        
        if (advanceGuardRef.current !== currentTrackRef.current?.id || repeatModeRef.current === 'ONE') {
          advanceGuardRef.current = currentTrackRef.current?.id;
          playNext(true);
        }
      }

      if (status.playing) {
        wasPlayingRef.current = true;
      }
    });

    return () => {
      sub.remove();
    };
  }, [player, playNext]);

  // Remote Control Sync (Lock Screen / Control Center)
  useEffect(() => {
    const playSub = player.addListener('play', () => {
      player.play();
    });
    const pauseSub = player.addListener('pause', () => {
      player.pause();
    });
    
    // In expo-audio, these events are triggered from Lock Screen / Control Center
    const nextSub = player.addListener('nextTrack', () => {
      playNext(true);
    });
    const prevSub = player.addListener('previousTrack', () => {
      playPrevious();
    });
    
    const seekSub = player.addListener('seek', (event) => {
      const position = typeof event === 'number' ? event : event.position;
      player.seekTo(position);
    });
    
    return () => { 
      playSub.remove(); 
      pauseSub.remove(); 
      nextSub.remove(); 
      prevSub.remove(); 
      seekSub.remove();
    };
  }, [player, playNext, playPrevious]);

  const togglePlayback = () => {
    if (player.playing) { 
      player.pause(); 
    } else { 
      // Only restart if we are at the very end
      if (player.duration > 0 && player.currentTime >= player.duration - 0.5) {
        player.seekTo(0);
      }
      player.play(); 
    }
  };

  const seekTo = (positionMs) => player.seekTo(positionMs / 1000);
  const toggleRepeatMode = () => {
    const modes = ['OFF', 'ALL', 'ONE'];
    const next = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    setRepeatMode(next); repeatModeRef.current = next;
  };
  const toggleShuffleMode = () => { setShuffleMode(p => !p); shuffleModeRef.current = !shuffleModeRef.current; };
  const addToQueue = (track) => setQueue(prev => [...prev, track]);
  const playNextTrack = (track) => setQueue(prev => { const q = [...prev]; q.splice(queueIndexRef.current + 1, 0, track); return q; });
  const removeFromQueue = (trackId) => {
    setQueue(prev => {
      const idx = prev.findIndex(t => t.id === trackId);
      if (idx === -1) return prev;
      const newQ = prev.filter(t => t.id !== trackId);
      if (idx <= queueIndexRef.current) { const ni = Math.max(0, queueIndexRef.current - 1); setQueueIndex(ni); queueIndexRef.current = ni; }
      return newQ;
    });
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack, isPlaying: status.playing, playbackStatus: status,
      playTrack, togglePlayback, playNext, playPrevious, seekTo,
      queue, repeatMode, toggleRepeatMode, shuffleMode, toggleShuffleMode,
      addToQueue, playNextTrack, removeFromQueue, isExpanded, expandPlayer, collapsePlayer,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
