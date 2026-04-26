import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { X } from "lucide-react-native";
import { TOKENS, SCREEN_HEIGHT } from "./playerUtils";

const LYRICS_LINES = [
  "Deep within the velvet silence",
  "The echoes of the morning light",
  "Caught inside a fleeting cadence",
  "Where the sage grows in the wild dark",
  "Finding rhythm in the shadows",
  "Between the beats of heavy hearts",
  "A sanctuary made of sound",
  "The atelier of the soul",
  "Drifting further from the shore",
  "Into frequencies unknown",
  "Where the music holds you close",
  "And never lets you go alone",
];

const ACTIVE_LINE = 3;

const LyricsSheet = React.memo(({ visible, onClose }) => {
  const [isRendered, setIsRendered] = useState(visible);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      Animated.spring(slideAnim, {
        toValue: SCREEN_HEIGHT * 0.2,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 280,
        useNativeDriver: true,
      }).start(() => {
        setIsRendered(false);
      });
    }
  }, [visible]);

  if (!isRendered) return null;

  return (
    <Animated.View
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT * 0.82,
        transform: [{ translateY: slideAnim }],
        backgroundColor: TOKENS.surfaceLow,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        zIndex: 200,
        elevation: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      }}
    >
      {/* Handle */}
      <View className="items-center pt-3 pb-2">
        <View style={{ backgroundColor: TOKENS.onSurfaceVariant, opacity: 0.2 }} className="w-10 h-1 rounded-full" />
      </View>

      {/* Header */}
      <View className="flex-row justify-between items-center px-8 py-5">
        <Text style={{ color: TOKENS.tertiary, letterSpacing: -0.5 }} className="text-lg font-black tracking-tight">
          Lyrics
        </Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <X size={22} color={TOKENS.onSurfaceVariant} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Lyrics Lines */}
      <ScrollView
        className="flex-1 px-8 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        removeClippedSubviews={true}
      >
        {LYRICS_LINES.map((line, i) => {
          const isActive = i === ACTIVE_LINE;

          return (
            <Text
              key={i}
              style={{
                fontSize: isActive ? 24 : 20,
                fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
                fontWeight: isActive ? "900" : "700",
                color: isActive ? TOKENS.primary : TOKENS.surfaceHigh,
                lineHeight: isActive ? 34 : 28,
                marginBottom: 32,
                letterSpacing: -0.5,
              }}
            >
              {line}
            </Text>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
});

export default LyricsSheet;
