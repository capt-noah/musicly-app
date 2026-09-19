import React, { useCallback, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Play, ArrowLeft, MoreVertical, Music, AudioLines } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSync } from '../context/SyncContext';
import { usePlayer } from '../context/PlayerContext';
import { BlurView } from 'expo-blur';
import { haptics } from '../utils/haptics';

const TOKENS = {
  surface: '#0d0f0d',
  surfaceLow: '#111412',
  surfaceHigh: '#1c211d',
  primary: '#b9cbba',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
  tertiary: '#fff8f2',
};

const FAVORITE_ITEM_HEIGHT = 72;

const FavoriteItem = memo(function FavoriteItem({ 
  song, 
  index, 
  isActive, 
  onPress, 
  onToggleLike, 
  resolveLocalPath 
}) {
  return (
    <TouchableOpacity 
      onPress={() => onPress(song)}
      activeOpacity={0.7}
      style={{ height: FAVORITE_ITEM_HEIGHT - 12, marginBottom: 12 }}
      className="flex-row items-center"
    >
      <View className="w-8">
        <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-xs font-black opacity-30">{index + 1}</Text>
      </View>
      <View style={{ backgroundColor: TOKENS.surfaceLow }} className="w-12 h-12 rounded-xl overflow-hidden mr-4">
        <Image 
          source={{ uri: resolveLocalPath(song.localCoverUri) }} 
          style={{ width: '100%', height: '100%' }}
          cachePolicy="memory-disk"
          transition={200}
        />
        {isActive && (
          <View className="absolute inset-0 bg-black/40 items-center justify-center">
            <AudioLines size={20} color={TOKENS.primary} />
          </View>
        )}
      </View>
      <View className="flex-1 pr-2">
        <Text 
          style={{ color: isActive ? TOKENS.primary : TOKENS.onSurface }} 
          className="font-black text-base tracking-tight"
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-xs font-semibold opacity-60" numberOfLines={1}>
          {song.artistName || 'Sonic Atelier'}
        </Text>
      </View>
      <TouchableOpacity 
        onPress={() => onToggleLike(song.id)} 
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        className="p-2"
      >
        <Heart size={20} color={TOKENS.primary} fill={TOKENS.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

export default function Favorites() {
  const router = useRouter();
  const { likedSongs, resolveLocalPath, toggleLike } = useSync();
  const { playTrack, currentTrack } = usePlayer();

  const handlePlayAll = () => {
    if (likedSongs.length > 0) {
      haptics.impactMedium();
      playTrack(likedSongs[0], likedSongs);
    }
  };

  const handleSongPress = useCallback((song) => {
    haptics.impactLight();
    playTrack(song, likedSongs);
  }, [likedSongs, playTrack]);

  const handleToggleLike = useCallback((songId) => {
    haptics.notificationSuccess();
    toggleLike(songId);
  }, [toggleLike]);

  const getItemLayout = useCallback((_, index) => ({
    length: FAVORITE_ITEM_HEIGHT,
    offset: FAVORITE_ITEM_HEIGHT * index,
    index,
  }), []);

  const renderItem = useCallback(({ item, index }) => (
    <FavoriteItem
      song={item}
      index={index}
      isActive={currentTrack?.id === item.id}
      onPress={handleSongPress}
      onToggleLike={handleToggleLike}
      resolveLocalPath={resolveLocalPath}
    />
  ), [currentTrack?.id, handleSongPress, handleToggleLike, resolveLocalPath]);

  return (
    <View style={{ flex: 1, backgroundColor: TOKENS.surface }}>
      <StatusBar barStyle="light-content" />
      
      {/* Header Image/Gradient Area */}
      <View style={{ height: 400, position: 'absolute', top: 0, left: 0, right: 0 }}>
        <View style={{ flex: 1, backgroundColor: TOKENS.surfaceHigh }}>
          {likedSongs.length > 0 ? (
            <Image 
              source={{ uri: resolveLocalPath(likedSongs[0].localCoverUri) }} 
              style={{ width: '100%', height: '100%', opacity: 0.4 }}
              contentFit="cover"
              blurRadius={50}
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: TOKENS.surfaceLow }} />
          )}
        </View>
        <BlurView intensity={80} tint="dark" style={{ position: 'absolute', inset: 0 }} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {/* Navigation Bar */}
        <View className="px-8 py-4 flex-row justify-between items-center z-10">
          <TouchableOpacity 
            onPress={() => {
              haptics.impactLight();
              router.back();
            }}
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
            className="w-11 h-11 rounded-full items-center justify-center"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={20} color={TOKENS.onSurface} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => haptics.selection()}
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
            className="w-11 h-11 rounded-full items-center justify-center"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical size={20} color={TOKENS.onSurface} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={likedSongs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 120 }}
          ListHeaderComponent={
            <View className="pt-6 pb-10 items-center">
              <View 
                style={{ 
                  width: 220, 
                  height: 220, 
                  backgroundColor: TOKENS.surfaceHigh,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.5,
                  shadowRadius: 30,
                }} 
                className="rounded-[50px] overflow-hidden mb-8"
              >
                {likedSongs.length > 0 ? (
                  <Image 
                    source={{ uri: resolveLocalPath(likedSongs[0].localCoverUri) }} 
                    style={{ width: '100%', height: '100%' }}
                    cachePolicy="memory-disk"
                    transition={200}
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Heart size={80} color={TOKENS.primary} fill={TOKENS.primary} opacity={0.2} />
                  </View>
                )}
              </View>
              
              <Text style={{ color: TOKENS.tertiary, letterSpacing: -1 }} className="text-4xl font-black mb-2">Liked Songs</Text>
              <Text style={{ color: TOKENS.primary }} className="text-[11px] font-black uppercase tracking-[0.3em] opacity-80">
                {likedSongs.length} {likedSongs.length === 1 ? 'TRACK' : 'TRACKS'} • COLLECTION
              </Text>

              {likedSongs.length > 0 && (
                <TouchableOpacity 
                  onPress={handlePlayAll}
                  activeOpacity={0.85}
                  style={{ 
                    backgroundColor: TOKENS.primary,
                    paddingHorizontal: 40,
                    paddingVertical: 18,
                    borderRadius: 100,
                    marginTop: 32,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: TOKENS.primary,
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.3,
                    shadowRadius: 20,
                  }}
                >
                  <Play size={20} color={TOKENS.surface} fill={TOKENS.surface} style={{ marginRight: 12 }} />
                  <Text style={{ color: TOKENS.surface }} className="font-black uppercase text-xs tracking-widest">Play Collection</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListEmptyComponent={
            <View className="items-center py-20 opacity-20">
              <Music size={48} color={TOKENS.onSurfaceVariant} strokeWidth={1} />
              <Text style={{ color: TOKENS.onSurfaceVariant, letterSpacing: 4 }} className="font-black uppercase text-[10px] mt-6">No liked songs found</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

