import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Play, ArrowLeft, MoreVertical, Music, AudioLines } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSync } from '../context/SyncContext';
import { usePlayer } from '../context/PlayerContext';
import { BlurView } from 'expo-blur';

const TOKENS = {
  surface: '#0d0f0d',
  surfaceLow: '#111412',
  surfaceHigh: '#1c211d',
  primary: '#b9cbba',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
  tertiary: '#fff8f2',
};

export default function Favorites() {
  const router = useRouter();
  const { likedSongs, resolveLocalPath, toggleLike } = useSync();
  const { playTrack, currentTrack, isPlaying } = usePlayer();

  const handlePlayAll = () => {
    if (likedSongs.length > 0) {
      playTrack(likedSongs[0], likedSongs);
    }
  };

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
            onPress={() => router.back()}
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
            className="w-11 h-11 rounded-full items-center justify-center"
          >
            <ArrowLeft size={20} color={TOKENS.onSurface} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity 
             style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
             className="w-11 h-11 rounded-full items-center justify-center"
          >
            <MoreVertical size={20} color={TOKENS.onSurface} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Collection Header */}
          <View className="px-8 pt-6 pb-10 items-center">
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

             <TouchableOpacity 
               onPress={handlePlayAll}
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
          </View>

          {/* Song List */}
          <View className="px-8 pt-4">
             {likedSongs.length === 0 ? (
               <View className="items-center py-20 opacity-20">
                  <Music size={48} color={TOKENS.onSurfaceVariant} strokeWidth={1} />
                  <Text style={{ color: TOKENS.onSurfaceVariant, letterSpacing: 4 }} className="font-black uppercase text-[10px] mt-6">No liked songs found</Text>
               </View>
             ) : (
               likedSongs.map((song, index) => (
                 <TouchableOpacity 
                   key={song.id}
                   onPress={() => playTrack(song, likedSongs)}
                   className="flex-row items-center mb-6"
                 >
                    <View className="w-8">
                       <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-xs font-black opacity-30">{index + 1}</Text>
                    </View>
                    <View style={{ backgroundColor: TOKENS.surfaceLow }} className="w-12 h-12 rounded-xl overflow-hidden mr-4">
                       <Image source={{ uri: resolveLocalPath(song.localCoverUri) }} style={{ width: '100%', height: '100%' }} />
                       {currentTrack?.id === song.id && (
                          <View className="absolute inset-0 bg-black/40 items-center justify-center">
                             <AudioLines size={20} color={TOKENS.primary} />
                          </View>
                       )}
                    </View>
                    <View className="flex-1">
                       <Text 
                         style={{ color: currentTrack?.id === song.id ? TOKENS.primary : TOKENS.onSurface }} 
                         className="font-black text-base tracking-tight"
                         numberOfLines={1}
                       >
                         {song.title}
                       </Text>
                       <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-xs font-semibold opacity-60" numberOfLines={1}>
                          {song.artistName || 'Sonic Atelier'}
                       </Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleLike(song.id)} className="p-2">
                       <Heart size={20} color={TOKENS.primary} fill={TOKENS.primary} />
                    </TouchableOpacity>
                 </TouchableOpacity>
               ))
             )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
