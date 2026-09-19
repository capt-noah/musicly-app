import React from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react-native";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "../context/PlayerContext";
import { useSync } from "../context/SyncContext";
import { haptics } from "../utils/haptics";

// Isolated progress bar to prevent parent re-renders on high-frequency status updates
const MiniProgressBar = React.memo(({ playbackStatus }) => {
  const percent = playbackStatus?.duration > 0 
    ? Math.min(100, Math.max(0, (playbackStatus.currentTime / playbackStatus.duration) * 100))
    : 0;

  return (
    <View style={{ position: 'absolute', bottom: 0, left: 16, right: 16, height: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
      <View style={{
         height: '100%', 
         backgroundColor: '#b9cbba', 
         width: `${percent}%` 
      }} />
    </View>
  );
});

const MiniPlayer = React.memo(({ onPress }) => {
  const { currentTrack, isPlaying, togglePlayback, playNext, playPrevious, playbackStatus } =
    usePlayer();
  const { resolveLocalPath } = useSync();
  const insets = useSafeAreaInsets();

  if (!currentTrack) return null;

  const primary = "#262a26";
  const secondary = "#e1e7df";

  // Tab bar height is exactly 90 from TabsLayout
  const bottomOffset = 90;

  const rawCover = currentTrack?.localCoverUri || currentTrack?.coverUrl;
  const coverUri = resolveLocalPath(rawCover) || "https://picsum.photos/seed/musicly-cover/600/600";

  const handlePlayPause = (e) => {
    e.stopPropagation?.();
    haptics.impactMedium();
    togglePlayback();
  };

  const handlePrev = (e) => {
    e.stopPropagation?.();
    haptics.impactLight();
    playPrevious();
  };

  const handleNext = (e) => {
    e.stopPropagation?.();
    haptics.impactLight();
    playNext();
  };

  const handlePress = () => {
    haptics.impactLight();
    onPress?.();
  };

  return (
    <Pressable
      style={{ bottom: bottomOffset, left: 0, right: 0, height: 64 }}
      className="w-full px-4 absolute flex justify-center items-center"
      onPress={handlePress}
    >
      <View
        className="w-full h-full rounded-xl flex flex-row items-center px-4"
        style={{
          backgroundColor: primary,
          shadowColor: "rgba(255, 255, 255, 0.14)",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 15,
          elevation: 8,
        }}
      >
        <Image
          source={{ uri: coverUri }}
          style={{ width: 52, height: 52, borderRadius: 8, marginRight: 10 }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />

        <View className="flex-1 justify-center mr-8">
          <Text
            className="font-bold text-[15px] tracking-tight"
            style={{ color: secondary }}
            numberOfLines={1}
          >
            {currentTrack.title}
          </Text>
          <Text
            className="text-[11px] font-bold mt-0.5 opacity-60 uppercase tracking-widest"
            style={{ color: secondary }}
            numberOfLines={1}
          >
            {currentTrack.artistName || "Unknown Artist"}
          </Text>
        </View>

        <View className="flex flex-row items-center justify-end flex-initial">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePrev}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 10 }}
          >
            <SkipBack
              size={20}
              color={secondary}
              strokeWidth={2.5}
              fill={secondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePlayPause}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            style={{ marginHorizontal: 10 }}
          >
            {isPlaying ? (
              <Pause
                size={24}
                color={secondary}
                strokeWidth={2.5}
                fill={secondary}
              />
            ) : (
              <Play
                size={24}
                color={secondary}
                strokeWidth={2.5}
                fill={secondary}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleNext}
            hitSlop={{ top: 15, bottom: 15, left: 10, right: 15 }}
          >
            <SkipForward
              size={20}
              color={secondary}
              strokeWidth={2.5}
              fill={secondary}
            />
          </TouchableOpacity>
        </View>

        {/* Global Progress Edge */}
        <MiniProgressBar playbackStatus={playbackStatus} />
      </View>
    </Pressable>
  );
});

export default MiniPlayer;

