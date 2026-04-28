import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, ScrollView } from 'react-native';
import { CheckCircle2, Clock, RefreshCw } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useSync } from '../context/SyncContext';
import SonicSheet from './SonicSheet';

const TOKENS = {
  surface: '#0d0f0d',
  surfaceLow: '#111412',
  surfaceHigh: '#1c211d',
  surfaceHighest: '#212722',
  primary: '#b9cbba',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
  tertiary: '#fff8f2',
};

const SyncItem = ({ song, progress }) => {
  const { downloadedSongs, resolveLocalPath } = useSync();
  const isDone = progress === 1;
  const isProcessing = progress > 0 && progress < 1;
  const isPending = progress === 0;

  // Try to get the local song data if it's already synced
  const localSong = downloadedSongs[song.id];
  const coverUri = localSong?.localCoverUri;
  
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 300,
      useNativeDriver: true, // Optimized for performance
    }).start();
  }, [progress]);

  const translateX = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-400, 0], // Approximate width, using a large enough negative to hide
  });

  return (
    <View 
      style={{ 
        backgroundColor: TOKENS.surfaceHigh,
        marginBottom: 12,
        overflow: 'hidden',
      }}
      className="flex-row items-center py-3 px-5 rounded-[40px] relative"
    >
      {/* Progress Overlay (GPU Accelerated) */}
      <Animated.View 
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: TOKENS.primary + '25',
          transform: [{ translateX }],
          opacity: animatedProgress.interpolate({
            inputRange: [0, 0.05],
            outputRange: [0, 1],
            extrapolate: 'clamp'
          })
        }}
      />

      {/* Track Info Placeholder / Cover Art */}
      <View style={{ backgroundColor: TOKENS.surfaceLow }} className="w-11 h-11 rounded-xl mr-4 items-center justify-center overflow-hidden">
        {coverUri ? (
          <Image 
            source={{ uri: resolveLocalPath(coverUri) }} 
            style={{ width: '100%', height: '100%' }} 
            contentFit="cover" 
          />
        ) : (
          <RefreshCw size={20} color={TOKENS.primary} opacity={0.3} />
        )}
      </View>

      <View className="flex-1">
        <Text style={{ color: TOKENS.onSurface }} className="font-black text-base tracking-tight" numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[10px] font-black uppercase tracking-widest opacity-60" numberOfLines={1}>
          {isDone ? 'Synced' : isProcessing ? `Syncing ${Math.round(progress * 100)}%` : 'Waiting in Queue'}
        </Text>
      </View>

      {/* Status Icon */}
      <View className="ml-3">
        {isDone ? (
          <CheckCircle2 size={20} color="#4ade80" />
        ) : isProcessing ? (
          <RefreshCw size={18} color={TOKENS.primary} />
        ) : (
          <Clock size={18} color={TOKENS.onSurfaceVariant} opacity={0.4} />
        )}
      </View>
    </View>
  );
};

export default function SyncSheet({ visible, onClose }) {
  const { syncQueue, fileProgresses } = useSync();

  return (
    <SonicSheet 
      visible={visible} 
      onClose={onClose} 
      title="Sync"
      heightPercent={0.75}
    >
      <View className="px-8 mt-6 flex-1">
        <View className="mb-10 flex-row justify-between items-center px-2">
          <Text style={{ color: TOKENS.onSurfaceVariant, fontSize: 10, fontWeight: '900', letterSpacing: 2.5, textTransform: 'uppercase' }}>
            {syncQueue.length === 0 ? 'Queue Empty' : `${syncQueue.length} Tracks Processing`}
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {syncQueue.map((song) => (
        <SyncItem 
          key={song.id} 
          song={song} 
          progress={fileProgresses[song.audioFileId] || 0} 
        />
          ))}

          {syncQueue.length === 0 && (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, opacity: 0.5 }}>
              <View style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-20 h-20 rounded-full items-center justify-center mb-6">
                <CheckCircle2 size={40} color={TOKENS.primary} strokeWidth={1} />
              </View>
              <Text style={{ color: TOKENS.onSurface, fontSize: 16, fontWeight: '900', tracking: -0.5 }}>All tracks are synced</Text>
              <Text style={{ color: TOKENS.onSurfaceVariant, fontSize: 12, marginTop: 4, fontWeight: '600' }}>Your library is up to date</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SonicSheet>
  );
}
