import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Animated, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Play, Heart, MoreHorizontal, AudioLines, Shuffle, Home, Search, Library, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSync } from '../context/SyncContext';
import { usePlayer } from '../context/PlayerContext';
import MiniPlayer from './MiniPlayer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Sonic Atelier Design Tokens
const TOKENS = {
  surface: '#0d0f0d',
  surfaceLow: '#111412',
  surfaceHigh: '#1c211d',
  surfaceHighest: '#212722',
  primary: '#b9cbba',
  primaryContainer: '#3b4b3e',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
  tertiary: '#fff8f2',
};

export default function AlbumView({ playlist, playTrack, currentTrack, isPlaying, router }) {
  const { resolveLocalPath } = useSync();
  const { repeatMode, toggleRepeatMode, addToQueue, shuffleMode, toggleShuffleMode, expandPlayer } = usePlayer();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Header image opacity based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, 200],
    outputRange: [0, 0, -50],
    extrapolate: 'clamp',
  });

  const resolvedCover = resolveLocalPath(playlist.imageUrl);

  return (
    <View style={{ flex: 1, backgroundColor: TOKENS.surface }}>
      {/* Panoramic Header Background - Fixed Sleek Profile */}
      <Animated.View 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          height: 400,
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslateY }],
          zIndex: 0,
        }}
      >
        <Image 
           source={{ uri: resolvedCover }} 
           style={{ width: '100%', height: '100%' }}
           contentFit="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(13, 15, 13, 0.1)', TOKENS.surface]}
          locations={[0, 0.5, 0.95]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </Animated.View>

      <SafeAreaView style={{ flex: 1 }}>
        {/* Navigation Bar */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 }}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={22} color={TOKENS.onSurface} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
          >
            <MoreHorizontal size={22} color={TOKENS.onSurface} />
          </TouchableOpacity>
        </View>

        <Animated.ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: 220 }}
          style={{ flex: 1 }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {/* Editorial Meta Section - Adjusted for smaller header */}
          <View style={{ 
            paddingHorizontal: 32, 
            marginTop: 110, 
            marginBottom: 24, 
            flexDirection: 'row', 
            alignItems: 'flex-end', 
            justifyContent: 'space-between' 
          }}>
            <View style={{ flex: 1, marginRight: 24 }}>
              <Text 
                style={{ 
                  color: TOKENS.tertiary,
                  letterSpacing: -1.5,
                  fontSize: 32,
                  fontWeight: '900',
                  marginBottom: 6,
                }}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.5}
              >
                {playlist.title}
              </Text>
              <Text 
                style={{ 
                  color: TOKENS.primary,
                  fontSize: 11,
                  fontWeight: '800',
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  opacity: 0.8
                }}
              >
                {playlist.description}
              </Text>
            </View>

            {/* High-Impact Atelier Controls */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <TouchableOpacity 
                onPress={toggleShuffleMode}
                style={{ 
                  width: 42, 
                  height: 42, 
                  borderRadius: 26, 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: shuffleMode ? TOKENS.primaryContainer : TOKENS.surfaceHigh 
                }}
              >
                <Shuffle size={20} color={shuffleMode ? TOKENS.primary : TOKENS.onSurface} strokeWidth={1.5} />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => playlist.tracks.length > 0 && playTrack(playlist.tracks[0], playlist.tracks)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 34,
                  backgroundColor: TOKENS.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: TOKENS.primary,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <Play size={28} color="#0d0f0d" fill="#0d0f0d" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tracklist Surface */}
          <View style={{ backgroundColor: TOKENS.surfaceLow, borderTopLeftRadius: 40, borderTopRightRadius: 40 }}>
            <View className="px-8 pt-8 pb-10 flex-row items-center justify-between">
              <Text 
                style={{ color: TOKENS.onSurfaceVariant, letterSpacing: 2 }}
                className="text-[10px] font-black uppercase"
              >
                Track List
              </Text>

            </View>

            <View className="px-4">
              {playlist.tracks.map((track, index) => {
                const isActive = currentTrack?.id === track.id;
                
                return (
                  <TouchableOpacity 
                    key={track.id} 
                    onPress={() => playTrack(track, playlist.tracks)}
                    style={{
                      backgroundColor: isActive ? TOKENS.surfaceHighest : TOKENS.surfaceHigh,
                      marginBottom: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                    }}
                    className="flex-row items-center py-4 px-6 rounded-[40px]"
                  >
                    <View className="w-10 items-center mr-4">
                      {isActive && isPlaying ? (
                         <AudioLines size={18} color={TOKENS.primary} />
                      ) : (
                         <Text 
                           style={{ color: TOKENS.onSurface, opacity: 0.7 }}
                           className="text-[12px] font-black italic"
                         >
                           {(index + 1).toString().padStart(2, '0')}
                         </Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text 
                        style={{ color: isActive ? TOKENS.primary : TOKENS.onSurface }}
                        className="font-bold text-base tracking-tight mb-0.5" 
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.65}
                      >
                        {track.title}
                      </Text>
                      <Text 
                        style={{ color: TOKENS.onSurfaceVariant }}
                        className="text-[11px] font-medium uppercase tracking-[0.1em] opacity-60" 
                        numberOfLines={1}
                      >
                        {track.artistName || 'Unknown Artist'}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => addToQueue(track)}
                      className="w-10 h-10 items-center justify-center rounded-full bg-black/10"
                    >
                      <MoreHorizontal size={20} color={TOKENS.onSurfaceVariant} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}

              {playlist.tracks.length === 0 && (
                <View className="items-center py-20">
                   <Text style={{ color: TOKENS.onSurfaceVariant, letterSpacing: 4 }} className="font-black uppercase text-[10px] opacity-20">This album is empty</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>

      {/* MiniPlayer & Navigation Layer (Sonic Glass) */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
        <MiniPlayer onPress={expandPlayer} />
        
        <BlurView 
            tint="dark" 
            intensity={95} 
            style={{ 
                height: 90,
                backgroundColor: 'rgba(13, 15, 13, 0.85)',
                flexDirection: 'row',
                justifyContent: 'space-around',
                alignItems: 'center',
                paddingBottom: 24,
            }} 
        >
            <TouchableOpacity onPress={() => router.push('/tabs/Home')}>
                <Home color={TOKENS.onSurface} size={24} strokeWidth={1.5} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/tabs/Search')}>
                <Search color={TOKENS.onSurfaceVariant} size={24} strokeWidth={1.5} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/tabs/Library')}>
                <Library color={TOKENS.onSurfaceVariant} size={24} strokeWidth={1.5} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/tabs/Profile')}>
                <User color={TOKENS.onSurfaceVariant} size={24} strokeWidth={1.5} />
            </TouchableOpacity>
        </BlurView>
      </View>
    </View>
  );
}
