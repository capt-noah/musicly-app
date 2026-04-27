import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  FlatList,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  PanResponder
} from "react-native";
import { X } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { SCREEN_HEIGHT } from "./playerUtils";

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
  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture vertical drag down
        return gestureState.dy > 5 && Math.abs(gestureState.dx) < 20;
      },
      onPanResponderMove: Animated.event([null, { dy: panY }], {
        useNativeDriver: false, // PanResponder requires false, but bypasses React state
      }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.8) {
          onClose(); // Parent handles hiding which triggers the useEffect down animation
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      panY.setValue(0);
      Animated.spring(slideAnim, {
        toValue: SCREEN_HEIGHT * 0.2,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(panY, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        })
      ]).start(() => {
        setIsRendered(false);
      });
    }
  }, [visible]);

  if (!isRendered) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT * 0.82,
        transform: [
          { translateY: slideAnim },
          { 
            translateY: panY.interpolate({
              inputRange: [0, SCREEN_HEIGHT],
              outputRange: [0, SCREEN_HEIGHT],
              extrapolate: 'clamp'
            }) 
          }
        ],
        zIndex: 200,
        elevation: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      }}
    >
      {/* Glossy Translucent Background (Glassmorphism) */}
      <View style={[
        StyleSheet.absoluteFillObject, 
        { 
          borderTopLeftRadius: 40, 
          borderTopRightRadius: 40, 
          overflow: 'hidden',
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          borderColor: "rgba(255, 255, 255, 0.2)",
          borderWidth: 1,
          borderBottomWidth: 0,
        }
      ]}>
        <BlurView intensity={70} tint="default" style={StyleSheet.absoluteFillObject} />
        {/* Subtle dark overlay to ensure the stark white text stays readable */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
      </View>

      {/* Draggable Header Area */}
      <View {...panResponder.panHandlers}>
        {/* Handle with extra top gap */}
        <View className="items-center pt-5 pb-2">
          <View style={{ backgroundColor: 'rgba(255,255,255,0.4)' }} className="w-12 h-1.5 rounded-full" />
        </View>

        {/* Header */}
        <View className="flex-row justify-between items-center px-8 pb-4">
          <Text style={{ color: '#FFFFFF', letterSpacing: -0.5 }} className="text-xl font-black tracking-tight">
            Lyrics
          </Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 6, borderRadius: 20 }}>
            <X size={20} color={'#FFFFFF'} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Lyrics List */}
      <FlatList
        data={LYRICS_LINES}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 8, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const isActive = index === ACTIVE_LINE;

          return (
            <Text
              style={{
                fontSize: isActive ? 28 : 22,
                fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
                fontWeight: isActive ? "900" : "600",
                color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)",
                lineHeight: isActive ? 38 : 32,
                marginBottom: 32,
                letterSpacing: -0.5,
              }}
            >
              {item}
            </Text>
          );
        }}
      />
    </Animated.View>
  );
});

export default LyricsSheet;
