import React from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { Heart, Menu } from "lucide-react-native";
import { useSync } from "../../context/SyncContext";
import { TOKENS } from "./playerUtils";

const TrackInfo = React.memo(({ 
  setTargetPlaceholderLayout, 
  queueAnim, 
  currentTrack, 
  toggleQueueMode, 
  queueMode 
}) => {
  const { toggleLike, likedSongs } = useSync();
  const isLiked = React.useMemo(() => likedSongs.some(s => s.id === currentTrack.id), [likedSongs, currentTrack.id]);

  return (
    <View className="flex-row items-center justify-between mb-6 overflow-hidden">
      {/* Invisible layout target for the artwork to fly into */}
      <View 
        onLayout={(e) => setTargetPlaceholderLayout(e.nativeEvent.layout)}
        style={{
          height: 56,
          width: 72,
          position: 'absolute',
          left: 0,
          zIndex: 10,
        }}
        pointerEvents="none"
      />

      {/* 
        flex:1 + overflow:hidden ensures the text is clipped at its own
        boundary and never bleeds over the right-side buttons.
        The inner Animated.View slides purely on the GPU via translateX.
      */}
      <View style={{ flex: 1, overflow: "hidden", marginRight: 10 }}>
        <Animated.View style={{
          width: '100%',
          transform: [{
            translateX: queueAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 72],
              extrapolate: 'clamp',
            })
          }]
        }}>
          <Text 
            style={{ color: TOKENS.tertiary, letterSpacing: -1, fontSize: 21 }} 
            className="font-black mb-1" 
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {currentTrack.title}
          </Text>
          <Text 
            style={{ color: "#ffffff", letterSpacing: -0.5 }} 
            className="text-[17px] font-bold opacity-90" 
            numberOfLines={1}
          >
            {currentTrack.artistName || "Unknown Artist"}
          </Text>
        </Animated.View>
      </View>

      <View className="flex-row items-center">
        <TouchableOpacity className="mr-3" onPress={() => toggleLike(currentTrack.id)}>
          <Heart 
            size={24} 
            color={isLiked ? TOKENS.primary : "#ffffff"} 
            fill={isLiked ? TOKENS.primary : "transparent"}
            strokeWidth={2} 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={toggleQueueMode}
          className="w-10 h-10 items-center justify-center rounded-full"
          style={{ backgroundColor: queueMode ? 'rgba(185, 203, 186, 0.15)' : 'transparent' }}
        >
          <Menu 
            size={24} 
            color={queueMode ? TOKENS.primary : "#ffffff"} 
            strokeWidth={queueMode ? 3 : 2} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default TrackInfo;
