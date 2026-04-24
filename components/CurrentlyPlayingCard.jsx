import { Image } from "expo-image";
import { Heart, Menu } from "lucide-react-native";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { usePlayer } from "../context/PlayerContext";
import { useSync } from "../context/SyncContext";

/**
 * CurrentlyPlayingCard is the "landing zone" for the morphing album art.
 * It remains invisible until the queue is opened, at which point it fades in
 * to provide a compact summary of the current track at the top.
 */
const CurrentlyPlayingCard = ({ onLayout, opacity = 0, translateY = 0, onQueuePress }) => {
  const { currentTrack } = usePlayer();
  const { resolveLocalPath } = useSync();

  if (!currentTrack) return null;

  const rawCover = currentTrack?.localCoverUri || currentTrack?.coverUrl;
  const coverUri = resolveLocalPath(rawCover);

  return (
    <Animated.View
      pointerEvents={opacity === 0 ? "none" : "auto"}
      className="w-full py-3.5 rounded-[30px] flex-row items-center px-5"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderColor: "rgba(255, 255, 255, 0.12)",
        borderWidth: 1,
        opacity: opacity,
        transform: [{ translateY: translateY }],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 8,
      }}
    >
      <View
        onLayout={onLayout}
        className="w-[48px] h-[48px] rounded-md overflow-hidden mr-4"
        style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
      >
        {/* Placeholder for the morphing cover art */}
        <View style={{ width: "100%", height: "100%", opacity: 0 }} />
      </View>
      <View className="flex-1 justify-center pr-2">
        <Text
          className="font-bold text-base tracking-tight text-[#ffffff]"
          numberOfLines={1}
        >
          {currentTrack.title}
        </Text>
        <Text
          className="text-[11px] font-bold mt-0.5 tracking-widest text-[#a6ada6] uppercase opacity-60"
          numberOfLines={1}
        >
          {currentTrack.artistName || "Unknown Artist"}
        </Text>
      </View>
      <View className="flex-row items-center gap-x-4">
        <TouchableOpacity 
          className="w-9 h-9 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        >
          <Heart size={16} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={onQueuePress}
          className="w-9 h-9 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
        >
          <Menu size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default CurrentlyPlayingCard;
