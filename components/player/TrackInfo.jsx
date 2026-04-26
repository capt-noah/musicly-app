import React from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { Heart, Menu } from "lucide-react-native";
import { TOKENS } from "./playerUtils";

const TrackInfo = React.memo(({ 
  setTargetPlaceholderLayout, 
  queueAnim, 
  currentTrack, 
  toggleQueueMode, 
  queueMode 
}) => {
  return (
    <View className="flex-row items-center justify-between mb-10 overflow-hidden">
      {/* Mini-cover placeholder that pushes the text when queue is open */}
      <Animated.View 
        onLayout={(e) => setTargetPlaceholderLayout(e.nativeEvent.layout)}
        style={{
          height: 56,
          width: queueAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 72] // 56px cover + 16px margin
          }),
          opacity: queueAnim,
          transform: [
            { scale: queueAnim },
          ],
          zIndex: 10,
        }}
      />

      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text 
          style={{ color: TOKENS.tertiary, letterSpacing: -1.5 }} 
          className="text-3xl font-black mb-1.5" 
          numberOfLines={1}
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
      </View>

      <View className="flex-row items-center">
        <TouchableOpacity className="mr-3">
          <Heart size={26} color="#ffffff" strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleQueueMode}>
          <Menu size={26} color={queueMode ? TOKENS.primary : "#ffffff"} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default TrackInfo;
