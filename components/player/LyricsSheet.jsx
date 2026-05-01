import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Animated,
  ActivityIndicator,
  Platform,
  FlatList,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  PanResponder,
} from "react-native";
import { Search, CheckCircle, Music } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { Lrc } from "react-native-lrc";
import { usePlayer } from "../../context/PlayerContext";
import * as mm from 'music-metadata-browser';
import { useSync } from "../../context/SyncContext";

import SonicSheet from "../SonicSheet";

const LRCLIB_URL = 'https://lrclib.net/api';

const LyricsSheet = React.memo(({ visible, onClose, onDragUpdate, externalPanY }) => {
  const { currentTrack, playbackStatus } = usePlayer();
  const { resolveLocalPath, updateSongMetadataLocally } = useSync();

  const [livelyrics, setLiveLyrics] = useState(null);

  // Phase 2 state
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [saved, setSaved] = useState(false);

  // Lazy-load lyrics from the audio file for already-downloaded tracks
  useEffect(() => {
    if (!currentTrack) return;
    setLiveLyrics(null);
    setSaved(false);
    setSearchError(null);
    if (currentTrack.lyrics) return;
    const audioPath = resolveLocalPath(currentTrack.localAudioUri);
    if (!audioPath) return;
    (async () => {
      try {
        const response = await fetch(audioPath);
        const blob = await response.blob();
        const metadata = await mm.parseBlob(blob);
        const rawLyrics = metadata.common.lyrics;
        const extracted = rawLyrics && rawLyrics.length > 0 ? rawLyrics[0] : null;
        setLiveLyrics(extracted);
      } catch (e) {
        console.warn('[LyricsSheet] Lazy lyrics extraction failed:', e.message);
      }
    })();
  }, [currentTrack?.id]);

  // Phase 2: Search LRCLIB for lyrics
  const searchLrclib = useCallback(async () => {
    if (!currentTrack) return;
    setSearching(true);
    setSearchError(null);

    try {
      const params = new URLSearchParams({
        track_name: currentTrack.title || '',
        artist_name: currentTrack.artistName || '',
        album_name: currentTrack.albumTitle || '',
      });
      if (playbackStatus?.duration) {
        params.set('duration', Math.round(playbackStatus.duration).toString());
      }

      const res = await fetch(`${LRCLIB_URL}/get?${params.toString()}`);

      if (res.status === 404) {
        const searchParams = new URLSearchParams({
          track_name: currentTrack.title || '',
          artist_name: currentTrack.artistName || '',
        });
        const searchRes = await fetch(`${LRCLIB_URL}/search?${searchParams.toString()}`);
        const results = await searchRes.json();
        if (!results || results.length === 0) {
          setSearchError('No lyrics found on LRCLIB for this track.');
          return;
        }
        const best = results.find(r => r.syncedLyrics) || results[0];
        const foundLyrics = best.syncedLyrics || best.plainLyrics;
        if (!foundLyrics) {
          setSearchError('No lyrics found on LRCLIB for this track.');
          return;
        }
        setLiveLyrics(foundLyrics);
        
        // Auto-save the found lyrics to local metadata
        await updateSongMetadataLocally(currentTrack.id, { lyrics: foundLyrics });
        setSaved(true);
      } else {
        const data = await res.json();
        const foundLyrics = data.syncedLyrics || data.plainLyrics;
        if (foundLyrics) {
          setLiveLyrics(foundLyrics);
          await updateSongMetadataLocally(currentTrack.id, { lyrics: foundLyrics });
          setSaved(true);
        }
      }
    } catch (error) {
      console.error('[LyricsSheet] Search failed:', error);
      setSearchError('Failed to fetch lyrics. Please try again.');
    } finally {
      setSearching(false);
    }
  }, [currentTrack, playbackStatus?.duration]);

  const lyrics = (currentTrack?.lyrics || livelyrics || '').trim();

  // Search Button Component for the Header
  const SearchButton = (
    (!lyrics || searching || saved) && (
      <TouchableOpacity
        onPress={searchLrclib}
        disabled={searching}
        activeOpacity={0.7}
        style={{
          backgroundColor: saved ? 'rgba(52, 199, 89, 0.25)' : 'rgba(255,255,255,0.1)',
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {searching ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : saved ? (
          <CheckCircle size={14} color="#34c759" strokeWidth={2.5} />
        ) : (
          <Search size={14} color="#FFFFFF" strokeWidth={2.5} />
        )}
        <Text style={{ color: saved ? '#34c759' : '#FFFFFF', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
          {searching ? 'Search…' : saved ? 'Saved' : 'Find'}
        </Text>
      </TouchableOpacity>
    )
  );

  return (
    <SonicSheet
      visible={visible}
      onClose={onClose}
      heightPercent={0.70}
      glossy={true}
      onDragUpdate={onDragUpdate}
      extraHeader={lyrics ? SearchButton : null}
      externalPanY={externalPanY}
    >
      <View style={{ flex: 1 }}>
        {searchError ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 28, paddingHorizontal: 32, paddingBottom: 120 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 28, borderRadius: 100 }}>
              <Music size={54} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />
            </View>
            <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 18, textAlign: 'center', fontWeight: '600' }}>
              Lyrics not found
            </Text>
            <TouchableOpacity 
              onPress={searchLrclib}
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28 }}
            >
              <Text style={{ color: '#FFF', fontWeight: '800', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1.2 }}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : !lyrics ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 28, paddingHorizontal: 32, paddingBottom: 120 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 28, borderRadius: 100 }}>
              <Music size={54} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />
            </View>
            <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 18, textAlign: 'center', fontWeight: '600' }}>
              No lyrics available
            </Text>
            <TouchableOpacity
              onPress={searchLrclib}
              disabled={searching}
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 36, paddingVertical: 16, borderRadius: 32 }}
            >
              {searching ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={{ color: '#FFF', fontWeight: '800', textTransform: 'uppercase', fontSize: 13, letterSpacing: 1.5 }}>Find Lyrics</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : lyrics.includes("[00:") ? (
          <Lrc
            key={`${currentTrack?.id}-${lyrics.length}`}
            lrc={lyrics}
            currentTime={(playbackStatus?.currentTime || 0) * 1000}
            lineHeight={100} 
            style={{ flex: 1, marginTop: -60 }}
            lineRenderer={({ lrcLine: { content }, active }) => (
              <View style={{ height: 100, justifyContent: 'center', width: '100%' }}>
                <Text
                  style={{
                    fontSize: active ? 26 : 20,
                    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
                    fontWeight: active ? "900" : "600",
                    color: active ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)",
                    textAlign: 'center',
                    paddingHorizontal: 30,
                  }}
                  numberOfLines={3}
                >
                  {content}
                </Text>
              </View>
            )}
          />
        ) : (
          <FlatList
            data={lyrics.split('\n').filter(l => l.trim() !== '')}
            keyExtractor={(item, index) => index.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 100 }}
            renderItem={({ item }) => (
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
                  fontWeight: "600",
                  color: "#FFFFFF",
                  lineHeight: 32,
                  marginBottom: 32,
                  letterSpacing: -0.5,
                  textAlign: 'center'
                }}
              >
                {item}
              </Text>
            )}
          />
        )}
      </View>
    </SonicSheet>
  );
});

export default LyricsSheet;
