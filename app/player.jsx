import React from 'react';
import { View, Text, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, Shuffle, SkipBack, SkipForward, Repeat, Pause, Play, Speaker, Share2, ListMusic, Heart } from 'lucide-react-native';
import { usePlayer } from '../context/PlayerContext';
import { useSync } from '../context/SyncContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const TOKENS = {
  surface: '#0d0f0d',
  surfaceLow: '#111412',
  surfaceHigh: '#1c211d',
  primary: '#b9cbba',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
  tertiary: '#fff8f2',
};

export default function NowPlaying() {
  const router = useRouter();
  const { currentTrack, isPlaying, pauseTrack, resumeTrack, playNext, playPrevious, playbackStatus } = usePlayer();
  const { likedSongs, toggleLike, resolveLocalPath } = useSync();

  if (!currentTrack) {
    return (
      <View style={{ flex: 1, backgroundColor: TOKENS.surface, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: TOKENS.onSurfaceVariant }}>No track selected</Text>
      </View>
    );
  }

  const isLiked = likedSongs.some(s => s.id === currentTrack.id);

  const formatTime = (millis) => {
    if (!millis) return "0:00";
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TOKENS.surface }}>
      <StatusBar barStyle="light-content" />
      <View className="flex-1 px-8 pt-4 pb-10">
        <View className="flex-row justify-between items-center mb-10">
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronDown size={32} color={TOKENS.primary} />
          </TouchableOpacity>
          <View className="items-center">
             <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[10px] uppercase font-black tracking-widest">Now Playing</Text>
             <Text style={{ color: TOKENS.primary }} className="text-xs font-black uppercase mt-0.5 tracking-[0.2em]">SONIC ATELIER</Text>
          </View>
          <View style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-10 h-10 rounded-full items-center justify-center border border-white/5">
             <Music size={18} color={TOKENS.primary} />
          </View>
        </View>

        <View className="items-center justify-center flex-1">
          <View 
            style={{ 
              width: width * 0.8, 
              backgroundColor: TOKENS.surfaceHigh,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 25 },
              shadowOpacity: 0.5,
              shadowRadius: 40,
              elevation: 20
            }} 
            className="aspect-square rounded-[60px] overflow-hidden mb-12 border border-white/5"
          >
             <Image 
               source={{ uri: resolveLocalPath(currentTrack.localCoverUri) }} 
               className="w-full h-full" 
               contentFit="cover"
               transition={300}
             />
          </View>

          <View className="w-full flex-row justify-between items-center mb-10">
             <View className="flex-1 mr-4">
                <Text style={{ color: TOKENS.tertiary, letterSpacing: -1 }} className="text-3xl font-black mb-1" numberOfLines={1}>{currentTrack.title}</Text>
                <Text style={{ color: TOKENS.primary }} className="text-xl font-bold tracking-tight opacity-80">{currentTrack.artistName || 'Unknown Artist'}</Text>
             </View>
             <TouchableOpacity onPress={() => toggleLike(currentTrack.id)}>
                <Heart 
                  size={28} 
                  color={isLiked ? TOKENS.primary : TOKENS.onSurfaceVariant} 
                  fill={isLiked ? TOKENS.primary : 'transparent'} 
                />
             </TouchableOpacity>
          </View>

          <View className="w-full mb-10">
             <View style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-full h-1.5 rounded-full overflow-hidden">
                <View 
                  style={{ 
                    backgroundColor: TOKENS.primary,
                    width: `${playbackStatus?.duration > 0 ? (playbackStatus.currentTime / playbackStatus.duration) * 100 : 0}%` 
                  }} 
                  className="h-full rounded-full" 
                />
             </View>
             <View className="flex-row justify-between mt-3">
                <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[11px] font-black opacity-60 tracking-widest">{formatTime(playbackStatus?.currentTime)}</Text>
                <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[11px] font-black opacity-60 tracking-widest">{formatTime(playbackStatus?.duration)}</Text>
             </View>
          </View>

          <View className="flex-row w-full items-center justify-between mb-12">
            <Shuffle size={20} color={TOKENS.onSurfaceVariant} opacity={0.4} />
            <View className="flex-row items-center space-x-10">
               <TouchableOpacity onPress={playPrevious}>
                  <SkipBack size={36} color={TOKENS.tertiary} fill={TOKENS.tertiary} />
               </TouchableOpacity>
               <TouchableOpacity 
                 onPress={isPlaying ? pauseTrack : resumeTrack}
                 style={{ backgroundColor: TOKENS.primary, shadowColor: TOKENS.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }} 
                 className="w-20 h-20 rounded-full items-center justify-center"
               >
                 {isPlaying ? (
                   <Pause size={32} color={TOKENS.surface} fill={TOKENS.surface} />
                 ) : (
                   <Play size={32} color={TOKENS.surface} fill={TOKENS.surface} style={{ marginLeft: 4 }} />
                 )}
               </TouchableOpacity>
               <TouchableOpacity onPress={playNext}>
                  <SkipForward size={36} color={TOKENS.tertiary} fill={TOKENS.tertiary} />
               </TouchableOpacity>
            </View>
            <Repeat size={20} color={TOKENS.onSurfaceVariant} opacity={0.4} />
          </View>
        </View>
      </View>

      <View style={{ backgroundColor: TOKENS.surfaceLow }} className="px-8 py-6 flex-row justify-between items-center border-t border-white/5">
        <TouchableOpacity className="flex-row items-center space-x-2">
           <Speaker size={18} color={TOKENS.primary} />
           <Text style={{ color: TOKENS.primary }} className="text-[10px] font-black uppercase tracking-[0.2em] ml-2">Studio Sessions</Text>
        </TouchableOpacity>
        <View className="flex-row items-center space-x-8">
           <Share2 size={20} color={TOKENS.onSurfaceVariant} opacity={0.6} />
           <TouchableOpacity onPress={() => router.push('/playlist')}>
              <ListMusic size={20} color={TOKENS.onSurfaceVariant} opacity={0.6} />
           </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
