import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Animated, PanResponder } from 'react-native';
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

// Design Tokens
const TOKENS = {
  surface: '#0d0f0d',
  surfaceLow: '#111412',
  surfaceHigh: '#1c211d',
  surfaceHighest: '#252a26',
  primary: '#b9cbba',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
  tertiary: '#fff8f2',
};

const ShuffleCarousel = ({ cards, featuredImageUrl, userName }) => {
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;

  const isEmpty = !cards || cards.length === 0;
  const safeCards = !isEmpty ? cards : [{ 
    id: 'empty', label: 'No albums found', artist: 'Sync your music to see them here', imageUrl: null 
  }];

  const CARD_W = width * 0.82;
  const SPACING = 16;
  const FULL_CARD_W = CARD_W + SPACING;

  const getImage = (card) => {
    if (card.imageUrl) return card.imageUrl;
    return null;
  };

  return (
    <View style={{ marginBottom: 48 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 32 }}>
        <Text style={{ color: TOKENS.onSurfaceVariant, fontSize: 10, fontWeight: '900', letterSpacing: 2.5 }}>
          {userName ? `${userName}'s Choice` : "Curator's Choice"}
        </Text>
      </View>

      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={FULL_CARD_W}
        disableIntervalMomentum={true}
        decelerationRate="fast"
        contentContainerStyle={{ 
          paddingHorizontal: (width - CARD_W) / 2,
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {safeCards.map((card, index) => {
          const inputRange = [
            (index - 1) * FULL_CARD_W,
            index * FULL_CARD_W,
            (index + 1) * FULL_CARD_W,
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.92, 1, 0.92],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={card.id || index}
              style={{
                width: CARD_W,
                height: 220,
                marginRight: SPACING,
                borderRadius: 40,
                overflow: 'hidden',
                backgroundColor: TOKENS.surfaceHigh,
                transform: [{ scale }],
                opacity,
                elevation: 5,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
              }}
            >
              <TouchableOpacity 
                activeOpacity={0.95} 
                style={{ width: '100%', height: '100%' }}
                onPress={() => router.push({ pathname: '/playlist', params: { albumId: card.id, title: card.label, artist: card.artist, cover: card.imageUrl }})}
              >
                {getImage(card) ? (
                  <Image source={{ uri: getImage(card) }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
                ) : (
                  <View style={{ flex: 1, backgroundColor: TOKENS.surfaceHigh, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <Shuffle size={48} color={TOKENS.primary} style={{ opacity: 0.2, marginBottom: 16 }} />
                  </View>
                )}
                
                <LinearGradient colors={['transparent', 'rgba(13,15,13,0.7)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80%' }} />

                <View style={{ position: 'absolute', bottom: 24, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <Text style={{ color: TOKENS.onSurface, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 }} numberOfLines={2}>{card.label}</Text>
                    <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 4 }} numberOfLines={1}>{card.artist}</Text>
                  </View>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: TOKENS.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={20} color={TOKENS.surface} fill={TOKENS.surface} />
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      {/* Pagination Indicator */}
      {!isEmpty && safeCards.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24 }}>
          {safeCards.map((_, i) => {
            const inputRange = [
              (i - 1) * FULL_CARD_W,
              i * FULL_CARD_W,
              (i + 1) * FULL_CARD_W,
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [6, 20, 6],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.2, 1, 0.2],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={i}
                style={{
                  width: dotWidth,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: TOKENS.primary,
                  opacity,
                }}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

export default function Home() {
  const { user, BASE_URL } = useAuth();
  const { downloadedSongs, syncing, progress, syncMusic, resolveLocalPath, localProfilePhoto } = useSync();
  const { playTrack } = usePlayer();
  const [topTracks, setTopTracks] = useState([]);
  const [featured, setFeatured] = useState(FEATURED_PLAYLIST);
  const [syncSheetVisible, setSyncSheetVisible] = useState(false);

  const syncedAlbums = React.useMemo(() => {
    const albumMap = {};
    Object.values(downloadedSongs).forEach(song => {
      const key = song.albumId || `unassigned-${song.id}`;
      if (!albumMap[key] || new Date(song.syncedAt) > new Date(albumMap[key].newestSyncedAt)) {
        albumMap[key] = {
          id: key,
          title: song.albumTitle || song.title,
          artist: song.artistName || 'Unknown Artist',
          cover: song.localCoverUri,
          newestSyncedAt: song.syncedAt,
          songs: [] // We'll fill this if we want to play all, but usually we navigate
        };
      }
    });
    return Object.values(albumMap).sort((a, b) => 
      new Date(b.newestSyncedAt) - new Date(a.newestSyncedAt)
    );
  }, [downloadedSongs]);

  const dynamicAlbums = React.useMemo(() => {
    const albumMap = {};
    Object.values(downloadedSongs).forEach(song => {
      const key = song.albumId || `unassigned-${song.id}`;
      if (!albumMap[key]) {
        albumMap[key] = {
          id: key,
          label: song.albumTitle || song.title,
          artist: song.artistName || 'Unknown Artist',
          imageUrl: resolveLocalPath(song.localCoverUri)
        };
      }
    });
    return Object.values(albumMap).map((album, index) => ({
      ...album,
      tag: `#${index + 1}`
    }));
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
                  {Math.floor(progress.current)}/{progress.total}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => syncMusic()} style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-10 h-10 rounded-full items-center justify-center mr-3">
              <RefreshCw size={18} color={TOKENS.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-10 h-10 rounded-full overflow-hidden">
              <Image 
                source={{ uri: localProfilePhoto ? resolveLocalPath(localProfilePhoto) : (user?.profilePhoto?.startsWith('/') ? `${BASE_URL}${user.profilePhoto}` : (user?.profilePhoto || `https://ui-avatars.com/api/?name=${user?.firstName || 'User'}&background=1c211d&color=b9cbba`)) }} 
                style={{ width: '100%', height: '100%' }} 
                contentFit="cover" 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }}
        className="flex-1"
      >
        <ShuffleCarousel 
          cards={dynamicAlbums.length > 5 ? dynamicAlbums.slice(0, 5) : dynamicAlbums} 
          featuredImageUrl={featured.imageUrl} 
          userName={user?.username || user?.firstName}
        />

        {/* Recently Synced Section */}
        <View className="mb-12 px-8">
          <View className="flex-row justify-between items-baseline mb-8">
            <Text style={{ color: TOKENS.tertiary, letterSpacing: -0.5 }} className="text-2xl font-black">Recently synced</Text>
            <Text style={{ color: TOKENS.primary }} className="text-[10px] font-bold tracking-widest">LIBRARY</Text>
          </View>
          {syncedAlbums.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {syncedAlbums.map((album) => (
                <TouchableOpacity 
                  key={album.id} 
                  className="mr-6 w-44" 
                  onPress={() => router.push({ pathname: '/playlist', params: { albumId: album.id, title: album.title, artist: album.artist, cover: album.cover }})}
                >
                  <View style={{ backgroundColor: TOKENS.surfaceLow }} className="aspect-square rounded-[40px] overflow-hidden mb-5">
                    <Image 
                      source={{ uri: resolveLocalPath(album.cover) || 'https://via.placeholder.com/600' }} 
                      style={{ width: '100%', height: '100%' }} 
                      contentFit="cover"
                    />
                  </View>
                  <Text style={{ color: TOKENS.onSurface }} className="font-black text-lg tracking-tight mb-1" numberOfLines={1}>{album.title}</Text>
                  <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[10px] font-black tracking-widest uppercase opacity-40" numberOfLines={1}>{album.artist}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={{ backgroundColor: TOKENS.surfaceHighest }} className="rounded-3xl p-8 items-center justify-center">
              <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-sm font-bold opacity-50">No recently synced songs</Text>
            </View>
          )}
        </View>

        {/* Top Tracks Section */}
        <View className="mb-12 px-8">
          <View className="flex-row justify-between items-baseline mb-8">
            <Text style={{ color: TOKENS.tertiary, letterSpacing: -0.5 }} className="text-2xl font-black">Top choice</Text>
          </View>

          {topTracks.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {topTracks.map((track) => (
                <TouchableOpacity key={track.id} className="mr-3 w-40">
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
          ) : (
            <View style={{ backgroundColor: TOKENS.surfaceHighest }} className="rounded-3xl p-8 items-center justify-center">
              <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-sm font-bold opacity-50">No top tracks found</Text>
            </View>
          )}
        </View>

        {/* Trending Section */}
        <View className="mb-12 px-8">
          <Text style={{ color: TOKENS.tertiary, letterSpacing: -0.5 }} className="text-2xl font-black mb-8">Sonic Trending</Text>
          <View style={{ backgroundColor: TOKENS.surfaceHighest }} className="rounded-[40px] p-6 flex-row items-center">
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
