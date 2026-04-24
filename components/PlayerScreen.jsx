import { Image } from "expo-image";
import {
    ChevronDown,
    ChevronUp,
    Heart,
    Menu,
    MoreHorizontal,
    Pause,
    Play,
    Repeat,
    Repeat1,
    Shuffle,
    SkipBack,
    SkipForward,
    X,
    Music,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    LayoutAnimation,
    PanResponder,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import ImageColors from "react-native-image-colors";
import MiniPlayer from "./MiniPlayer";
import CurrentlyPlayingCard from "./CurrentlyPlayingCard";
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

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

const ACTIVE_LINE = 3; // "Where the sage grows..."

// Sonic Atelier Design Tokens
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

const LyricsSheet = ({ visible, onClose }) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    if (visible) {
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
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
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
        <TouchableOpacity onPress={onClose}>
          <X size={22} color={TOKENS.onSurfaceVariant} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Lyrics Lines */}
      <ScrollView
        className="flex-1 px-8 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {LYRICS_LINES.map((line, i) => {
          const isActive = i === ACTIVE_LINE;

          return (
            <Text
              key={i}
              style={{
                fontSize: isActive ? 24 : 20,
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
};

import { useSync } from "../context/SyncContext";
import { usePlayer } from "../context/PlayerContext";

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secondsLeft = Math.floor(totalSeconds % 60);
  return `${minutes}:${secondsLeft < 10 ? "0" : ""}${secondsLeft}`;
};

// Helper to determine color brightness
const getLuminance = (hex) => {
  const rgb = hex.startsWith('#') ? hex.slice(1) : hex;
  if (rgb.length !== 6) return 0.5;
  const r = parseInt(rgb.substring(0, 2), 16) / 255;
  const g = parseInt(rgb.substring(2, 4), 16) / 255;
  const b = parseInt(rgb.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Helper to darken a hex color
const darkenColor = (hex, factor = 0.4) => {
  const rgb = hex.startsWith('#') ? hex.slice(1) : hex;
  if (rgb.length !== 6) return "#070807";
  let r = parseInt(rgb.substring(0, 2), 16);
  let g = parseInt(rgb.substring(2, 4), 16);
  let b = parseInt(rgb.substring(4, 6), 16);
  
  r = Math.floor(r * factor);
  g = Math.floor(g * factor);
  b = Math.floor(b * factor);
  
  const toHex = (c) => c.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Helper to lighten a color
const lightenColor = (hex, factor = 0.3) => {
  const rgb = hex.startsWith('#') ? hex.slice(1) : hex;
  if (rgb.length !== 6) return hex;
  let r = parseInt(rgb.substring(0, 2), 16);
  let g = parseInt(rgb.substring(2, 4), 16);
  let b = parseInt(rgb.substring(4, 6), 16);
  
  r = Math.floor(r + (255 - r) * factor);
  g = Math.floor(g + (255 - g) * factor);
  b = Math.floor(b + (255 - b) * factor);
  
  const toHex = (c) => c.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
const PlayerScreen = ({ onCollapse }) => {
  const {
    currentTrack,
    isPlaying,
    togglePlayback,
    playNext,
    playPrevious,
    playbackStatus,
    seekTo,
    queue,
    playTrack,
    repeatMode,
    toggleRepeatMode,
    shuffleMode,
    toggleShuffleMode,
    removeFromQueue,
    isExpanded,
    expandPlayer,
    collapsePlayer,
  } = usePlayer();
  const { resolveLocalPath } = useSync();
  const [currentColors, setCurrentColors] = useState(["#0d0f0d", "#070807", "#050505"]);
  const [nextColors, setNextColors] = useState(null);
  const ambianceFade = useRef(new Animated.Value(0)).current;
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const [queueMode, setQueueMode] = useState(false);
  const [artworkLayout, setArtworkLayout] = useState(null);
  const [miniCoverLayout, setMiniCoverLayout] = useState(null);
  const queueAnim = useRef(new Animated.Value(0)).current;
  const upNextAnim = useRef(new Animated.Value(1)).current;
  const queueShiftAnim = useRef(new Animated.Value(0)).current;
  const [isMoving, setIsMoving] = useState(false);
  const [lastTrackId, setLastTrackId] = useState(currentTrack?.id);
  const coverSwipeAnim = useRef(new Animated.Value(0)).current;
  const coverSwipeDir = useRef(1); // 1 = next, -1 = prev
  const wasSwipeRef = useRef(false); // true when a gesture triggered the skip
  const artworkPixelWidthRef = useRef(SCREEN_WIDTH * 0.92); // updated each render from artworkLayout
  // Live refs — updated every render so the once-created PanResponder never reads stale values
  const handleNextRef = useRef(null);
  const handlePrevRef = useRef(null);
  const queueModeRef = useRef(false);

  const duration = playbackStatus?.duration || 0;
  const position = playbackStatus?.currentTime || 0;
  const progress = duration > 0 ? (position / duration) * 100 : 0;
  
  // DRAG & SCRUB LOGIC
  const scrubAnim = useRef(new Animated.Value(0)).current;
  const scrubActiveAnim = useRef(new Animated.Value(0)).current;
  const [scrubPosition, setScrubPosition] = useState(null);
  const isScrubbing = useRef(false);
  const scrubStartOffsetX = useRef(0);
  const progressBarWidthRef = useRef(0);
  // Refs to avoid stale closures inside the PanResponder (created once at mount)
  const durationRef = useRef(0);
  const seekToRef = useRef(seekTo);

  const activateScrub = () => {
    Animated.spring(scrubActiveAnim, {
      toValue: 1,
      damping: 22,
      mass: 1,
      stiffness: 120,
      useNativeDriver: true,
    }).start();
  };
  const deactivateScrub = () => {
    Animated.spring(scrubActiveAnim, {
      toValue: 0,
      damping: 22,
      mass: 1,
      stiffness: 120,
      useNativeDriver: true,
    }).start();
  };

  // Keep refs fresh every render so PanResponder callbacks are never stale
  durationRef.current = duration;
  seekToRef.current = seekTo;
  queueModeRef.current = queueMode;

  // barScale: visual rail height inflates from 5→12px via scaleY
  const barScale = scrubActiveAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const textScale = scrubActiveAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });

  // Auto-fill while playing
  const lastProgressRef = useRef(progress);
  
  useEffect(() => {
    if (!isScrubbing.current) {
      // If progress dropped (meaning the track changed, restarted, or sought backwards),
      // we snap instantly. Otherwise, smooth forward flow.
      const isBackwardJump = progress < lastProgressRef.current - 1;
      
      Animated.timing(scrubAnim, {
        toValue: progress,
        duration: isBackwardJump ? 0 : 800,
        easing: Easing.linear,
        useNativeDriver: false, // String percent interpolation cannot use native driver
      }).start();
    }
    
    // Always update last progress trap
    lastProgressRef.current = progress;
  }, [progress]);

  const seekPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        isScrubbing.current = true;
        activateScrub();
        scrubStartOffsetX.current = e.nativeEvent.locationX;
        const percent = Math.max(0, Math.min(100, (scrubStartOffsetX.current / Math.max(1, progressBarWidthRef.current)) * 100));
        scrubAnim.setValue(percent);
        if (durationRef.current) setScrubPosition((percent / 100) * durationRef.current);
      },
      onPanResponderMove: (e, gestureState) => {
        const currentX = scrubStartOffsetX.current + gestureState.dx;
        const percent = Math.max(0, Math.min(100, (currentX / Math.max(1, progressBarWidthRef.current)) * 100));
        scrubAnim.setValue(percent);
        if (durationRef.current) setScrubPosition((percent / 100) * durationRef.current);
      },
      onPanResponderRelease: (e, gestureState) => {
        isScrubbing.current = false;
        setScrubPosition(null);
        deactivateScrub();
        const finalX = scrubStartOffsetX.current + gestureState.dx;
        const percent = Math.max(0, Math.min(100, (finalX / Math.max(1, progressBarWidthRef.current)) * 100));
        if (durationRef.current) seekToRef.current((percent / 100) * durationRef.current * 1000);
      },
      onPanResponderTerminate: () => {
        if (!isScrubbing.current) return;
        isScrubbing.current = false;
        setScrubPosition(null);
        deactivateScrub();
      },
    })
  ).current;

  const rawCover = currentTrack?.localCoverUri || currentTrack?.coverUrl;
  const coverUri = resolveLocalPath(rawCover) || "https://picsum.photos/seed/musicly-cover/600/600";

  useEffect(() => {
    let isMounted = true;
    if (!coverUri) return;

    ImageColors.getColors(coverUri, {
      fallback: "#0d0f0d",
      cache: true,
      key: currentTrack?.id?.toString() || coverUri,
    })
      .then((colors) => {
        if (!isMounted) return;
        let dominant;
        if (colors.platform === "android") {
          dominant = colors.vibrant || colors.dominant || "#0d0f0d";
        } else if (colors.platform === "ios") {
          dominant = colors.background || colors.primary || "#0d0f0d";
        } else {
          dominant = colors.dominant || "#0d0f0d";
        }

        const dominantColor = dominant;
        
        // Ambient base (lightened)
        const ambientColor = lightenColor(dominantColor, 0.2);
        const ambientDeep = darkenColor(dominantColor, 0.4); // For a color-matched shadow bottom

        // Multi-layered ambiance flow (Descending primary range)
        const c1 = ambientColor;
        const c2 = dominantColor;
        const c3 = darkenColor(dominantColor, 0.85);
        const c4 = ambientDeep;
        const newColors = [c1, c2, c3, c4];

        if (currentColors[0] !== ambientColor) {
          setNextColors(newColors);
          ambianceFade.setValue(0);
          Animated.timing(ambianceFade, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }).start(() => {
            // Update the base layer to the new colors
            setCurrentColors(newColors);
            
            // Wait slightly for the base layer to re-render before clearing the overlay
            // This prevents the "flash" of the old base layer.
            setTimeout(() => {
              if (isMounted) {
                setNextColors(null);
                ambianceFade.setValue(0);
              }
            }, 100);
          });
        }
      })
      .catch((err) => {
        console.warn("Failed to extract image color:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [coverUri, currentTrack?.id]);
  // Robust Stack Animation Sync
  useEffect(() => {
    if (currentTrack?.id !== lastTrackId) {
      queueShiftAnim.setValue(0);
      setIsMoving(false);
      setLastTrackId(currentTrack?.id);
      if (wasSwipeRef.current) {
        // Swipe animation already handled the visual exit — just snap back to center
        coverSwipeAnim.setValue(0);
        wasSwipeRef.current = false;
      } else {
        // External track change (queue tap, skip button): slide in from the correct edge
        const w = artworkPixelWidthRef.current;
        coverSwipeAnim.setValue(coverSwipeDir.current * w);
        Animated.spring(coverSwipeAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 9,
          tension: 80,
        }).start();
      }
    }
  }, [currentTrack?.id]);

  const currentQueueIndex = Math.max(
    queue.findIndex((track) => track.id === currentTrack.id),
    0,
  );
  const upcomingQueue = queue.slice(currentQueueIndex + 1);

  // Adjacent covers for the 3-slot carousel
  const prevQueueTrack = queue[currentQueueIndex - 1];
  const nextQueueTrack = queue[currentQueueIndex + 1];
  const prevCoverUri = prevQueueTrack
    ? (resolveLocalPath(prevQueueTrack.localCoverUri) || prevQueueTrack.coverUrl || coverUri)
    : coverUri;
  const nextCoverUri = nextQueueTrack
    ? (resolveLocalPath(nextQueueTrack.localCoverUri) || nextQueueTrack.coverUrl || coverUri)
    : coverUri;

  const handleQueuePress = (track, idx) => {
    if (isMoving) return;
    setIsMoving(true);

    const shiftDistance = -(idx + 1) * 84;
    
    Animated.timing(queueShiftAnim, {
      toValue: shiftDistance,
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      // LayoutAnimation helps the state-sync clean up after the physical move
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      playTrack(track, queue, 0, true);
    });
  };

  const handleNext = () => {
    if (isMoving || queue.length <= 1) return;
    setIsMoving(true);

    Animated.timing(queueShiftAnim, {
      toValue: -84,
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      playNext();
    });
  };

  const handlePrev = () => {
    if (isMoving || queue.length <= 1) return;
    setIsMoving(true);

    // Drop-in effect: Prepare the offset above, then animate down to 0
    queueShiftAnim.setValue(-84);
    
    // We call playPrevious first to update the data, then animate the drop-in
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    playPrevious();

    Animated.timing(queueShiftAnim, {
      toValue: 0,
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setIsMoving(false);
    });
  };

  // Update live refs every render so coverArtPanResponder is never stale
  handleNextRef.current = handleNext;
  handlePrevRef.current = handlePrev;

  // Cover art carousel — 1:1 drag, prev/next covers slide in from the appropriate edge
  const coverArtPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, state) =>
        !queueModeRef.current &&
        Math.abs(state.dx) > 8 &&
        Math.abs(state.dx) > Math.abs(state.dy) * 1.5,
      onPanResponderMove: (_, state) => {
        // 1:1 ratio so neighbour cover tracks finger precisely
        coverSwipeAnim.setValue(state.dx);
      },
      onPanResponderRelease: (_, state) => {
        const w = artworkPixelWidthRef.current;
        const threshold = w * 0.3; // 30% of artwork width to commit
        if (state.dx < -threshold) {
          coverSwipeDir.current = 1;
          wasSwipeRef.current = true;
          Animated.timing(coverSwipeAnim, {
            toValue: -w,
            duration: 200,
            easing: Easing.out(Easing.cubic || Easing.quad),
            useNativeDriver: true,
          }).start(() => handleNextRef.current?.());
        } else if (state.dx > threshold) {
          coverSwipeDir.current = -1;
          wasSwipeRef.current = true;
          Animated.timing(coverSwipeAnim, {
            toValue: w,
            duration: 200,
            easing: Easing.out(Easing.cubic || Easing.quad),
            useNativeDriver: true,
          }).start(() => handlePrevRef.current?.());
        } else {
          // Didn't pass threshold — spring back
          Animated.spring(coverSwipeAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 6,
            tension: 150,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(coverSwipeAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 6,
          tension: 150,
        }).start();
      },
    })
  ).current;

  // Removed duplicate legacy sizing references

  const handleSeekPress = (e) => {
    if (!duration || progressBarWidth <= 0) return;
    const pressedX = Math.max(
      0,
      Math.min(progressBarWidth, e.nativeEvent.locationX),
    );
    const nextSeconds = (pressedX / progressBarWidth) * duration;
    seekTo(nextSeconds * 1000);
  };

  const [artworkContainerLayout, setArtworkContainerLayout] = useState(null);
  const [bottomControlsLayout, setBottomControlsLayout] = useState(null);
  const [targetPlaceholderLayout, setTargetPlaceholderLayout] = useState(null);

  const toggleQueueMode = () => {
    const nextValue = queueMode ? 0 : 1;
    setQueueMode(!queueMode);
    
    Animated.timing(queueAnim, {
      toValue: nextValue,
      duration: 350,
      easing: Easing.bezier(0.33, 1, 0.68, 1), // Smooth easeOutQuart
      useNativeDriver: false, // width/margin cannot use native driver
    }).start();
  };

  const safeArtworkWidth = Math.max(artworkLayout?.width || 320, 1);
  artworkPixelWidthRef.current = safeArtworkWidth; // keep ref fresh for PanResponder callbacks
  const miniTargetWidth = 56; // 14 Tailwind units = 56px
  const miniTargetScale = Math.max(0.18, Math.min(0.32, miniTargetWidth / safeArtworkWidth));

  // Compute absolute Y coordinates inside the layout
  const targetAbsoluteY = (bottomControlsLayout?.y || 0) + (targetPlaceholderLayout?.y || 0) + (miniTargetWidth / 2);
  const artworkAbsoluteY = (artworkContainerLayout?.y || 0) + (artworkLayout?.y || 0) + (artworkLayout?.width || 0) / 2;

  const artworkTargetTranslateY = targetAbsoluteY - artworkAbsoluteY;
  
  const targetAbsoluteX = 0 + miniTargetWidth / 2;
  const artworkAbsoluteX = (artworkLayout?.x || 0) + (safeArtworkWidth / 2);
  
  const artworkTargetTranslateX = targetAbsoluteX - artworkAbsoluteX;

  const artworkTranslateY = queueAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, artworkTargetTranslateY],
  });

  const artworkTranslateX = queueAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, artworkTargetTranslateX],
  });

  // Dynamic border radius
  const artworkBorderRadius = queueAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 16 / miniTargetScale], 
  });

  const artworkScale = queueAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, miniTargetScale],
  });

  const artworkShadowOpacity = 0.35; 

  const queuePanelOpacity = queueAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const queuePanelTranslateY = queueAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  const placeholderWidth = queueAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 56],
  });
  const placeholderMargin = queueAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 16],
  });

  const upNextTranslateY = upNextAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  // Calculate dynamic bottom offset for Queue Panel so it sits right above the title row
  const QUEUE_BOTTOM_OFFSET = bottomControlsLayout ? bottomControlsLayout.height + 16 : 260;

  useEffect(() => {
    upNextAnim.setValue(0);
    Animated.timing(upNextAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [upcomingQueue[0]?.id]);

  if (!currentTrack) return null;

  return (
    <>
      {/* BASE BACKGROUND */}
      <View style={{ position: "absolute", width: "100%", height: "100%", zIndex: 0 }}>
        {/* Layer 1: Base Background */}
        <LinearGradient
          colors={currentColors}
          locations={[0, 0.35, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Layer 1.5: Diagonal Mesh Texture */}
        <LinearGradient
          colors={[currentColors[0], "transparent", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1.5 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 }}
        />
        {/* Layer 3: Color-Matched Ambient Bottom */}
        <LinearGradient
          colors={["rgba(0,0,0,0)", currentColors[3] + "40", currentColors[3] + "80"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </View>

      {/* CROSSFADING OVERLAY BACKGROUND */}
      {nextColors && (
        <Animated.View 
          style={{ 
            position: "absolute", 
            width: "100%", height: "100%",
            zIndex: 1,
            opacity: ambianceFade 
          }}
        >
          <LinearGradient
            colors={nextColors}
            locations={[0, 0.35, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <LinearGradient
            colors={[nextColors[0], "transparent", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1.5 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 }}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0)", nextColors[3] + "40", nextColors[3] + "80"]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
        </Animated.View>
      )}
      
      <SafeAreaView style={{ flex: 1, zIndex: 10 }}>
        <View className="flex-1 px-8 pt-4 pb-12 relative" style={{ zIndex: 10 }}>

          {/* Absolute Queue Panel (Up Next list) */}
          <Animated.View
            pointerEvents={queueMode ? "auto" : "none"}
            style={{
              position: "absolute",
              top: 80, // Shifted up closer to the header
              left: 24,
              right: 24,
              bottom: QUEUE_BOTTOM_OFFSET, // Sits precisely above the title row
              opacity: queuePanelOpacity,
              transform: [{ translateY: queuePanelTranslateY }],
              zIndex: 60,
            }}
          >
            <View className="flex-row items-center justify-between mb-4 px-2">
              <Text style={{ color: TOKENS.tertiary }} className="text-lg font-black tracking-tight">Up Next</Text>
              <View className="px-1 py-1">
                <Text style={{ color: "#ffffff" }} className="text-[10px] font-bold uppercase tracking-widest opacity-80">{upcomingQueue.length} Tracks</Text>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <Animated.View style={{ opacity: upNextAnim, transform: [{ translateY: upNextTranslateY }] }}>
                {upcomingQueue.length === 0 ? (
                  <View className="items-center py-20 opacity-60">
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} className="w-16 h-16 rounded-full items-center justify-center mb-6">
                      <Music size={32} color="#ffffff" strokeWidth={1.5} />
                    </View>
                    <Text style={{ color: '#ffffff' }} className="text-[11px] font-black uppercase tracking-[0.3em]">No song in queue</Text>
                  </View>
                ) : (
                  upcomingQueue.map((track, idx) => (
                    <TouchableOpacity
                      key={`${track.id}-${idx}`}
                      activeOpacity={0.7}
                      onPress={() => handleQueuePress(track, idx)}
                      style={{ 
                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                        borderColor: "rgba(255, 255, 255, 0.3)",
                        borderTopColor: "rgba(255, 255, 255, 0.4)", // Glossy specular highlight
                        borderWidth: 1,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.25, 
                        shadowRadius: 15, 
                        elevation: 8,
                      }}
                      className="flex-row items-center px-4 py-2 rounded-[28px] mb-3"
                    >
                      <View className="w-14 h-14 rounded-xl overflow-hidden mr-4 shadow-sm" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                        <Image source={{ uri: resolveLocalPath(track.localCoverUri) || track.coverUrl || coverUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
                      </View>
                      <View className="flex-1 pr-4">
                        <Text style={{ color: TOKENS.onSurface }} className="font-bold text-[17px] mb-0.5" numberOfLines={1}>{track.title}</Text>
                        <Text style={{ color: "rgba(255,255,255,0.7)" }} className="text-[12px] font-bold uppercase tracking-wide" numberOfLines={1}>{track.artistName || "Unknown Artist"}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeFromQueue(track.id)} className="w-10 h-10 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
                        <X size={16} color="#ffffff" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </Animated.View>
            </ScrollView>
          </Animated.View>

          {/* Header row (Navigation only) */}
          <View className="flex-row justify-between items-center mb-4 relative" style={{ zIndex: 10 }}>
            <TouchableOpacity onPress={onCollapse} className="w-12 h-12 items-center justify-center -ml-2">
              <ChevronDown size={32} color="#ffffff" strokeWidth={1.5} />
            </TouchableOpacity>
            
            <View className="flex-row items-center gap-x-4">
              <TouchableOpacity style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-10 h-10 rounded-full items-center justify-center">
                <MoreHorizontal size={20} color={TOKENS.onSurfaceVariant} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Central Artwork section */}
          <View 
            className="items-center justify-center flex-1" 
            style={{ zIndex: 200 }}
            pointerEvents="box-none"
            onLayout={(e) => setArtworkContainerLayout(e.nativeEvent.layout)}
          >
            <Animated.View
              pointerEvents={queueMode ? "none" : "auto"}
              onLayout={(e) => setArtworkLayout(e.nativeEvent.layout)}
              {...(queueMode ? {} : coverArtPanResponder.panHandlers)}
              style={{
                width: "92%",
                aspectRatio: 1,
                zIndex: 200,
                transform: [
                  { translateY: artworkTranslateY },
                  { translateX: artworkTranslateX },
                  { scale: artworkScale },
                ],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: artworkShadowOpacity,
                shadowRadius: 35,
                elevation: 15,
              }}
            >
              <Animated.View
                style={{
                  flex: 1,
                  width: "100%",
                  height: "100%",
                  borderRadius: artworkBorderRadius,
                  overflow: "hidden",
                }}
              >
                {/* 3 covers slide as one unit — shadow stays fixed, images sweep through */}
                {[
                  { uri: prevCoverUri, side: -1 },
                  { uri: coverUri,     side:  0 },
                  { uri: nextCoverUri, side:  1 },
                ].map(({ uri, side }) => (
                  <Animated.View
                    key={side}
                    style={{
                      position: 'absolute',
                      width: safeArtworkWidth,
                      height: safeArtworkWidth,
                      left: side * safeArtworkWidth,
                      transform: [{ translateX: coverSwipeAnim }],
                    }}
                  >
                    <Image
                      source={{ uri }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </Animated.View>
                ))}
              </Animated.View>
            </Animated.View>
          </View>

          {/* Footer Controls (Always visible, does not move) */}
          <View className="mt-8" onLayout={(e) => setBottomControlsLayout(e.nativeEvent.layout)}>
            <View className="flex-row items-center justify-between mb-10">
              
              {/* Dynamic Target Placeholder for Morphing Cover Art */}
              <Animated.View 
                onLayout={(e) => setTargetPlaceholderLayout(e.nativeEvent.layout)}
                style={{
                  height: 56,
                  width: placeholderWidth,
                  marginRight: placeholderMargin,
                  opacity: queueAnim
                }}
              />

              <View className="flex-1 mr-4">
                <Text style={{ color: TOKENS.tertiary, letterSpacing: -1.5 }} className="text-3xl font-black mb-1.5" numberOfLines={1}>{currentTrack.title}</Text>
                <Text style={{ color: "#ffffff", letterSpacing: -0.5 }} className="text-[17px] font-bold opacity-90" numberOfLines={1}>{currentTrack.artistName || "Unknown Artist"}</Text>
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

            {/* Progress Slider */}
            <View className="mb-12">
              {/* 44px invisible touch target - gesture captured here, no transform so coordinates are reliable */}
              <View
                {...seekPanResponder.panHandlers}
                onLayout={(e) => {
                  setProgressBarWidth(e.nativeEvent.layout.width);
                  progressBarWidthRef.current = e.nativeEvent.layout.width;
                }}
                style={{ height: 44, justifyContent: "center" }}
              >
                {/* Visual rail - scaleY only so borderRadius:99 stays fully round at any height */}
                <Animated.View
                  style={{
                    height: 5,
                    borderRadius: 99,
                    overflow: "hidden",
                    backgroundColor: "rgba(255,255,255,0.2)",
                    transform: [{ scaleY: barScale }],
                  }}
                >
                  <Animated.View
                    style={{
                      width: scrubAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
                      height: "100%",
                      borderRadius: 99,
                      backgroundColor: TOKENS.onSurface,
                      shadowColor: "#fff",
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.4,
                      shadowRadius: 6,
                    }}
                  />
                </Animated.View>
              </View>
              <View className="flex-row justify-between">
                <Animated.View style={{ transform: [{ scale: textScale }], transformOrigin: "left" }}>
                  <Text style={{
                    color: scrubPosition !== null ? "#ffffff" : "rgba(255,255,255,0.6)",
                    fontSize: 11, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase",
                  }}>
                    {formatTime(scrubPosition !== null ? scrubPosition : position)}
                  </Text>
                </Animated.View>
                <Animated.View style={{ transform: [{ scale: textScale }], transformOrigin: "right" }}>
                  <Text style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 11, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase",
                  }}>
                    {formatTime(duration)}
                  </Text>
                </Animated.View>
              </View>
            </View>

            <View className="flex-row items-center justify-between mb-12">
              <TouchableOpacity onPress={toggleShuffleMode}>
                <Shuffle size={20} color={shuffleMode ? TOKENS.primary : "#ffffff"} strokeWidth={2.5} />
              </TouchableOpacity>
              
              <View className="flex-row items-center justify-center">
                <TouchableOpacity onPress={handlePrev} className="w-12 h-12 items-center justify-center">
                  <SkipBack size={32} color="#ffffff" fill="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={togglePlayback}
                  style={{ backgroundColor: TOKENS.surfaceHigh }}
                  className="w-20 h-20 rounded-full items-center justify-center mx-8 shadow-2xl"
                >
                  {isPlaying ? <Pause size={32} color="#ffffff" fill="#ffffff" /> : <Play size={32} color="#ffffff" fill="#ffffff" style={{ marginLeft: 4 }} />}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleNext} className="w-12 h-12 items-center justify-center">
                  <SkipForward size={32} color="#ffffff" fill="#ffffff" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={toggleRepeatMode}>
                <Repeat size={20} color={repeatMode !== 'OFF' ? TOKENS.primary : "#ffffff"} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setLyricsOpen(true)} className="items-center">
              <ChevronUp size={16} color={TOKENS.onSurfaceVariant} strokeWidth={2.5} />
              <Text style={{ color: TOKENS.onSurfaceVariant, letterSpacing: 2 }} className="text-[10px] font-black uppercase mt-1.5">Lyrics</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <LyricsSheet visible={lyricsOpen} onClose={() => setLyricsOpen(false)} />
    </>
  );
};

const Player = () => {
  const { currentTrack, isExpanded, expandPlayer, collapsePlayer } = usePlayer();
  const [hasExpandedOnce, setHasExpandedOnce] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // React to external global isExpanded changes
  useEffect(() => {
    if (isExpanded) {
      setHasExpandedOnce(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isExpanded]);

  if (!currentTrack) return null;

  return (
    <>
      <MiniPlayer onPress={expandPlayer} />

      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: SCREEN_HEIGHT,
          transform: [{ translateY: slideAnim }],
        }}
        pointerEvents={isExpanded ? "auto" : "none"}
      >
        {hasExpandedOnce && <PlayerScreen onCollapse={collapsePlayer} />}
      </Animated.View>
    </>
  );
};

export default Player;
