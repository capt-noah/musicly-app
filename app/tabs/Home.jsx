import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Animated, RefreshControl, PanResponder } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, ChevronLeft, ChevronRight, Shuffle, CloudDownload, RefreshCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FEATURED_PLAYLIST } from '../../shared/constants';
import { useSync } from '../../context/SyncContext';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import SyncSheet from '../../components/SyncSheet';

const { width } = Dimensions.get('window');

// Sonic Atelier Design Tokens
const TOKENS = {
  surface: '#0d0f0d',
  surfaceLow: '#111412',
  surfaceHigh: '#1c211d',
  primary: '#b9cbba',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
  tertiary: '#fff8f2',
};

const ShuffleCarousel = ({ cards, featuredImageUrl, userName }) => {
  const router = useRouter();
  const [activeIdx, setActiveIdx] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const safeCards = cards && cards.length > 0 ? cards : [{ 
    id: 1, label: 'No Albums', artist: 'Sync music first', tag: '#1', imageUrl: 'https://picsum.photos/seed/empty/600/600' 
  }];

  const goTo = (newIdx) => {
    setActiveIdx(newIdx);
    scaleAnim.setValue(0.92);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 100,
    }).start();
  };

  const prev = () => goTo((activeIdx - 1 + safeCards.length) % safeCards.length);
  const next = () => goTo((activeIdx + 1) % safeCards.length);

  const active = safeCards[activeIdx];
  const getImage = (card) => {
    if (card.imageUrl) return card.imageUrl;
    if (card.tag === '#1' && featuredImageUrl) return featuredImageUrl;
    return `https://api.dicebear.com/7.x/shapes/png?seed=${card.id || 'album'}&backgroundColor=111412`;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, state) => Math.abs(state.dx) > 10,
      onPanResponderRelease: (_, state) => {
        if (state.dx > 50) {
          prev();
        } else if (state.dx < -50) {
          next();
        }
      },
    })
  ).current;

  const CARD_H = 220;
  const CARD_W = width - 48;

  return (
    <View style={{ marginBottom: 48 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ color: TOKENS.onSurfaceVariant, fontSize: 10, fontWeight: '900', letterSpacing: 2.5 }}>
          {userName ? `${userName}'s Choice` : "Curator's Choice"}
        </Text>
      </View>

      <View style={{ height: CARD_H, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View 
          {...panResponder.panHandlers}
          style={{
            width: CARD_W,
            height: CARD_H, 
            borderRadius: 40,
            overflow: 'hidden',
            backgroundColor: TOKENS.surfaceHigh,
            transform: [{ scale: scaleAnim }],
        }}>
          <TouchableOpacity 
             activeOpacity={0.95} 
             style={{ width: '100%', height: '100%' }}
             onPress={() => router.push({ pathname: '/playlist', params: { albumId: active.id, title: active.label, artist: active.artist, cover: active.imageUrl }})}
          >
            <Image source={{ uri: getImage(active) }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
            <LinearGradient colors={['transparent', 'rgba(13,15,13,0.85)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%' }} />
            
            <View style={{ position: 'absolute', top: 20, left: 24 }}>
              <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1.5 }}>
                {active.tag}
              </Text>
            </View>

            <View style={{ position: 'absolute', bottom: 24, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={{ color: TOKENS.onSurface, fontSize: 18, fontWeight: '900', letterSpacing: -0.5 }} numberOfLines={1}>{active.label}</Text>
                <Text style={{ color: TOKENS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 }} numberOfLines={1}>{active.artist}</Text>
              </View>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: TOKENS.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Play size={20} color={TOKENS.surface} fill={TOKENS.surface} />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 24 }}>
        {safeCards.map((_, i) => (
          <View key={i} style={{ width: i === activeIdx ? 16 : 4, height: 4, borderRadius: 2, backgroundColor: i === activeIdx ? TOKENS.primary : TOKENS.onSurfaceVariant, opacity: i === activeIdx ? 1 : 0.2 }} />
        ))}
      </View>
    </View>
  );
}

export default function Home() {
  const { user, BASE_URL } = useAuth();
  const { downloadedSongs, syncing, progress, syncMusic, resolveLocalPath } = useSync();
  const { playTrack } = usePlayer();
  const [topTracks, setTopTracks] = useState([]);
  const [featured, setFeatured] = useState(FEATURED_PLAYLIST);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncSheetVisible, setSyncSheetVisible] = useState(false);

  const syncedList = Object.values(downloadedSongs).sort((a, b) => 
    new Date(b.syncedAt) - new Date(a.syncedAt)
  );

  const dynamicAlbums = React.useMemo(() => {
    const albumMap = {};
    Object.values(downloadedSongs).forEach(song => {
      const key = song.albumId || `unassigned-${song.id}`;
      if (!albumMap[key]) {
        albumMap[key] = {
          id: key,
          label: song.albumTitle || song.title,
          artist: song.artistName || 'Unknown Artist',
          tag: song.albumId ? 'Collection' : 'Single',
          imageUrl: resolveLocalPath(song.localCoverUri)
        };
      }
    });
    return Object.values(albumMap);
  }, [downloadedSongs, resolveLocalPath]);

  useEffect(() => {
    const fetchTopTracks = async () => {
      try {
        const response = await fetch(`${BASE_URL}/songs/top_track`);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setFeatured({
            id: data[0].id,
            title: data[0].title,
            artist: data[0].artistName || 'Unknown Artist',
            imageUrl: data[0].coverUrl,
          });
          setTopTracks(data.slice(1));
        }
      } catch (error) {
        console.warn('top tracks fetch failed');
      }
    };
    fetchTopTracks();
  }, [BASE_URL]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await syncMusic();
    } finally {
      setTimeout(() => setIsRefreshing(false), 450);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TOKENS.surface }}>
      <View className="px-8">
        <View className="py-6 mb-4 flex-row justify-between items-center">
          <Text style={{ color: TOKENS.tertiary, letterSpacing: -1.5 }} className="text-4xl font-black">Home</Text>
          <View className="flex-row items-center">
            {syncing && (
              <TouchableOpacity onPress={() => setSyncSheetVisible(true)} style={{ backgroundColor: TOKENS.primary + '15' }} className="px-4 py-2 rounded-full flex-row items-center mr-3">
                <CloudDownload size={14} color={TOKENS.primary} />
                <Text style={{ color: TOKENS.primary }} className="text-[10px] font-black tracking-widest ml-2">
                  {progress.current}/{progress.total}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => syncMusic()} style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-10 h-10 rounded-full items-center justify-center mr-3">
              <RefreshCw size={18} color={TOKENS.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-10 h-10 rounded-full overflow-hidden">
              <Image source={{ uri: 'https://picsum.photos/seed/user/400/400' }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 180 }}
        className="flex-1 px-8"
        refreshControl={<RefreshControl refreshing={isRefreshing || syncing} onRefresh={handleRefresh} tintColor={TOKENS.primary} />}
      >
        <ShuffleCarousel 
          cards={dynamicAlbums.length > 5 ? dynamicAlbums.slice(0, 5) : dynamicAlbums} 
          featuredImageUrl={featured.imageUrl} 
          userName={user?.firstName}
        />

        {/* Recently Synced Section */}
        {syncedList.length > 0 && (
          <View className="mb-12">
            <View className="flex-row justify-between items-baseline mb-8">
              <Text style={{ color: TOKENS.tertiary, letterSpacing: -0.5 }} className="text-2xl font-black">Recently synced</Text>
              <Text style={{ color: TOKENS.primary }} className="text-[10px] font-bold tracking-widest">LIBRARY</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {syncedList.map((song) => (
                <TouchableOpacity key={song.id} className="mr-8 w-44" onPress={() => playTrack(song, syncedList)}>
                  <View style={{ backgroundColor: TOKENS.surfaceLow }} className="aspect-square rounded-3xl overflow-hidden mb-4">
                    <Image 
                      source={{ uri: resolveLocalPath(song.localCoverUri) || 'https://via.placeholder.com/600' }} 
                      style={{ width: '100%', height: '100%' }} 
                      contentFit="cover"
                    />
                  </View>
                  <Text style={{ color: TOKENS.onSurface }} className="font-bold text-base tracking-tight mb-0.5" numberOfLines={1}>{song.title}</Text>
                  <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[10px] font-semibold tracking-[0.1em] opacity-50" numberOfLines={1}>{song.artistName || 'Unknown Artist'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Top Tracks Section */}
        <View className="mb-12">
          <View className="flex-row justify-between items-baseline mb-8">
            <Text style={{ color: TOKENS.tertiary, letterSpacing: -0.5 }} className="text-2xl font-black">Top choice</Text>
            <Text style={{ color: TOKENS.primary }} className="text-[10px] font-bold tracking-widest">ATELIER</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {topTracks.map((track) => (
              <TouchableOpacity key={track.id} className="mr-8 w-44">
                <View style={{ backgroundColor: TOKENS.surfaceLow }} className="aspect-square rounded-3xl overflow-hidden mb-4">
                  <Image source={{ uri: track.cover || 'https://via.placeholder.com/600' }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                </View>
                <Text style={{ color: TOKENS.onSurface }} className="font-bold text-base tracking-tight mb-0.5" numberOfLines={1}>{track.title}</Text>
                <Text
                  className="text-[11px] font-bold mt-0.5 tracking-widest text-[#a6ada6] opacity-60"
                  numberOfLines={1}
                >
                  {track.artistName || "Unknown Artist"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Trending Section */}
        <View className="mb-12">
          <Text style={{ color: TOKENS.tertiary, letterSpacing: -0.5 }} className="text-2xl font-black mb-8">Sonic Trending</Text>
          <View style={{ backgroundColor: TOKENS.surfaceLow }} className="rounded-[40px] p-6 flex-row items-center">
            <View style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-24 h-24 rounded-3xl overflow-hidden">
               <Image source={{ uri: 'https://picsum.photos/seed/trending/600/600' }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            </View>
            <View className="flex-1 ml-6">
              <Text style={{ color: TOKENS.primary }} className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">Rising Artist</Text>
              <Text style={{ color: TOKENS.onSurface }} className="text-xl font-black tracking-tight">Siren's Call</Text>
              <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-xs font-semibold opacity-60">Elena Voss</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <SyncSheet visible={syncSheetVisible} onClose={() => setSyncSheetVisible(false)} />
    </SafeAreaView>
  );
}
