import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
    Animated,
    Easing,
    LayoutAnimation,
    PanResponder,
    Platform,
    UIManager,
    View,
    InteractionManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ImageColors from "react-native-image-colors";

// Sub-components
import PlayerBackground from "./player/PlayerBackground";
import LyricsSheet from "./player/LyricsSheet";
import PlayerHeader from "./player/PlayerHeader";
import ArtworkCarousel from "./player/ArtworkCarousel";
import QueuePanel from "./player/QueuePanel";
import ProgressBar from "./player/ProgressBar";
import PlayerControls from "./player/PlayerControls";
import TrackInfo from "./player/TrackInfo";
import MiniPlayer from "./MiniPlayer";

// Context & Utils
import { useSync } from "../context/SyncContext";
import { usePlayer } from "../context/PlayerContext";
import { 
  TOKENS, 
  SCREEN_HEIGHT, 
  SCREEN_WIDTH, 
  lightenColor, 
  darkenColor 
} from "./player/playerUtils";

if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

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
  } = usePlayer();

  const { resolveLocalPath } = useSync();

  // Color State
  const [currentColors, setCurrentColors] = useState(["#0d0f0d", "#070807", "#050505", "#050505"]);
  const [nextColors, setNextColors] = useState(null);
  const ambianceFade = useRef(new Animated.Value(0)).current;

  // UI State
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const [queueMode, setQueueMode] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [lastTrackId, setLastTrackId] = useState(currentTrack?.id);
  const [scrubPosition, setScrubPosition] = useState(null);

  // Layout Refs & State
  const [artworkLayout, setArtworkLayout] = useState(null);
  const [artworkContainerLayout, setArtworkContainerLayout] = useState(null);
  const [bottomControlsLayout, setBottomControlsLayout] = useState(null);
  const [targetPlaceholderLayout, setTargetPlaceholderLayout] = useState(null);

  // Animation Refs
  const queueAnim = useRef(new Animated.Value(0)).current;
  const upNextAnim = useRef(new Animated.Value(1)).current;
  const queueShiftAnim = useRef(new Animated.Value(0)).current;
  const coverSwipeAnim = useRef(new Animated.Value(0)).current;
  const scrubAnim = useRef(new Animated.Value(0)).current;
  const scrubActiveAnim = useRef(new Animated.Value(0)).current;

  // Gesture State Refs
  const coverSwipeDir = useRef(1); 
  const wasSwipeRef = useRef(false);
  const artworkPixelWidthRef = useRef(SCREEN_WIDTH * 0.92);
  const progressBarWidthRef = useRef(0);
  const isScrubbing = useRef(false);
  const scrubStartOffsetX = useRef(0);
  const durationRef = useRef(0);
  const seekToRef = useRef(seekTo);
  const queueModeRef = useRef(false);
  const queueRef = useRef([]);
  const currentQueueIndexRef = useRef(0);
  const repeatModeRef = useRef('OFF');
  const handleNextRef = useRef(null);
  const handlePrevRef = useRef(null);

  const duration = playbackStatus?.duration || 0;
  const position = playbackStatus?.currentTime || 0;
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  // Sync Refs
  useEffect(() => {
    durationRef.current = duration;
    seekToRef.current = seekTo;
    queueModeRef.current = queueMode;
    queueRef.current = queue;
    repeatModeRef.current = repeatMode;
    currentQueueIndexRef.current = Math.max(queue.findIndex((t) => t.id === currentTrack?.id), 0);
  }, [duration, seekTo, queueMode, queue, repeatMode, currentTrack?.id]);

  // Color Extraction Logic
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

        const ambientColor = lightenColor(dominant, 0.2);
        const ambientDeep = darkenColor(dominant, 0.4);
        const newColors = [
          ambientColor,
          dominant,
          darkenColor(dominant, 0.85),
          ambientDeep
        ];

        if (currentColors[0] !== ambientColor) {
          setNextColors(newColors);
          ambianceFade.setValue(0);
          Animated.timing(ambianceFade, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }).start(() => {
            setCurrentColors(newColors);
            setTimeout(() => {
              if (isMounted) {
                setNextColors(null);
                ambianceFade.setValue(0);
              }
            }, 100);
          });
        }
      })
      .catch((err) => console.warn("Color extraction error:", err));

    return () => { isMounted = false; };
  }, [coverUri, currentTrack?.id]);

  // Scrubbing Animations
  const activateScrub = useCallback(() => {
    Animated.spring(scrubActiveAnim, {
      toValue: 1,
      damping: 22,
      useNativeDriver: true,
    }).start();
  }, []);

  const deactivateScrub = useCallback(() => {
    Animated.spring(scrubActiveAnim, {
      toValue: 0,
      damping: 22,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (!isScrubbing.current) {
      Animated.timing(scrubAnim, {
        toValue: progress,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [progress]);

  // PanResponders
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
        isScrubbing.current = false;
        setScrubPosition(null);
        deactivateScrub();
      },
    })
  ).current;

  // Track Transition Sync
  useEffect(() => {
    if (currentTrack?.id !== lastTrackId) {
      queueShiftAnim.setValue(0);
      setIsMoving(false);
      setLastTrackId(currentTrack?.id);
      
      if (wasSwipeRef.current) {
        // If it was a swipe, we finish the motion smoothly
        const w = artworkPixelWidthRef.current || SCREEN_WIDTH;
        const startPos = coverSwipeDir.current === 1 ? w : -w;
        coverSwipeAnim.setValue(startPos);
        Animated.spring(coverSwipeAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 9,
          tension: 60,
        }).start();
        wasSwipeRef.current = false;
      } else {
        // If it was a button press or auto-play, we use a distinct slide-in
        const w = artworkPixelWidthRef.current || SCREEN_WIDTH;
        coverSwipeAnim.setValue(coverSwipeDir.current * (w / 1.5));
        Animated.spring(coverSwipeAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 7,
          tension: 40,
        }).start();
      }
    }
  }, [currentTrack?.id, lastTrackId]);

  // Queue Handlers
  const handleNext = useCallback((isSwipe = false) => {
    if (isMoving || queue.length <= 1) return;
    setIsMoving(true);
    
    if (isSwipe) {
      // If swipe, skip the shift animation as the user already moved the cover
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      playNext();
      return;
    }

    Animated.parallel([
      Animated.timing(queueShiftAnim, {
        toValue: -84,
        duration: 300,
        easing: Easing.out(Easing.back(0.8)),
        useNativeDriver: false,
      }),
      Animated.timing(upNextAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      })
    ]).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      playNext();
    });
  }, [isMoving, queue.length, playNext, upNextAnim]);

  const handlePrev = useCallback((isSwipe = false) => {
    if (isMoving || queue.length <= 1) return;
    setIsMoving(true);

    if (isSwipe) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      // Pass true to force jumping to the previous track even if current track is > 3s
      playPrevious(true);
      return;
    }

    queueShiftAnim.setValue(-84);
    upNextAnim.setValue(0);
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    playPrevious(false);
    
    Animated.parallel([
      Animated.timing(queueShiftAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(upNextAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      })
    ]).start(() => setIsMoving(false));
  }, [isMoving, queue.length, playPrevious, upNextAnim]);

  useEffect(() => {
    handleNextRef.current = handleNext;
    handlePrevRef.current = handlePrev;
  }, [handleNext, handlePrev]);

  const coverArtPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, state) =>
        !queueModeRef.current &&
        Math.abs(state.dx) > 8 &&
        Math.abs(state.dx) > Math.abs(state.dy) * 1.5,
      onPanResponderMove: (_, state) => {
        coverSwipeAnim.setValue(state.dx);
      },
      onPanResponderRelease: (_, state) => {
        const w = artworkPixelWidthRef.current || SCREEN_WIDTH;
        const threshold = w * 0.15;
        
        const hasNext = repeatModeRef.current !== 'OFF' || currentQueueIndexRef.current < queueRef.current.length - 1;
        const hasPrev = repeatModeRef.current !== 'OFF' || currentQueueIndexRef.current > 0;

        if (state.dx < -threshold) {
          if (!hasNext) {
            // Bounce back if no next song
            Animated.spring(coverSwipeAnim, {
              toValue: 0,
              friction: 4,
              tension: 40,
              useNativeDriver: true,
            }).start();
            return;
          }
          
          coverSwipeDir.current = 1;
          wasSwipeRef.current = true;
          Animated.spring(coverSwipeAnim, {
            toValue: -w,
            velocity: state.vx,
            friction: 7,
            tension: 60,
            useNativeDriver: true,
          }).start();
          
          setTimeout(() => handleNextRef.current?.(true), 120);
        } else if (state.dx > threshold) {
          if (!hasPrev) {
            // Bounce back if no previous song
            Animated.spring(coverSwipeAnim, {
              toValue: 0,
              friction: 4,
              tension: 40,
              useNativeDriver: true,
            }).start();
            return;
          }

          coverSwipeDir.current = -1;
          wasSwipeRef.current = true;
          Animated.spring(coverSwipeAnim, {
            toValue: w,
            velocity: state.vx,
            friction: 7,
            tension: 60,
            useNativeDriver: true,
          }).start();
          
          setTimeout(() => handlePrevRef.current?.(true), 120);
        } else {
          Animated.spring(coverSwipeAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 6,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(coverSwipeAnim, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  // Layout Calculations
  const currentQueueIndex = useMemo(() => Math.max(queue.findIndex((t) => t.id === currentTrack.id), 0), [queue, currentTrack.id]);
  const upcomingQueue = useMemo(() => queue.slice(currentQueueIndex + 1), [queue, currentQueueIndex]);
  const prevQueueTrack = queue[currentQueueIndex - 1];
  const nextQueueTrack = queue[currentQueueIndex + 1];

  const prevCoverUri = resolveLocalPath(prevQueueTrack?.localCoverUri) || prevQueueTrack?.coverUrl || coverUri;
  const nextCoverUri = resolveLocalPath(nextQueueTrack?.localCoverUri) || nextQueueTrack?.coverUrl || coverUri;

  const toggleQueueMode = useCallback(() => {
    const nextValue = queueMode ? 0 : 1;
    setQueueMode(!queueMode);
    Animated.spring(queueAnim, {
      toValue: nextValue,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [queueMode]);

  // Interpolations
  const barScale = scrubActiveAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const textScale = scrubActiveAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  
  const safeArtworkWidth = Math.max(artworkLayout?.width || 320, 1);
  const miniTargetWidth = 56;
  const miniTargetScale = Math.max(0.18, Math.min(0.32, miniTargetWidth / safeArtworkWidth));

  const targetAbsoluteY = (bottomControlsLayout?.y || 0) + (targetPlaceholderLayout?.y || 0) + (miniTargetWidth / 2);
  const artworkAbsoluteY = (artworkContainerLayout?.y || 0) + (artworkLayout?.y || 0) + (artworkLayout?.width || 0) / 2;
  const artworkTargetTranslateY = targetAbsoluteY - artworkAbsoluteY;
  
  const targetAbsoluteX = miniTargetWidth / 2;
  const artworkAbsoluteX = (artworkLayout?.x || 0) + (safeArtworkWidth / 2);
  const artworkTargetTranslateX = targetAbsoluteX - artworkAbsoluteX;

  const artworkTranslateY = queueAnim.interpolate({ inputRange: [0, 1], outputRange: [0, artworkTargetTranslateY] });
  const artworkTranslateX = queueAnim.interpolate({ inputRange: [0, 1], outputRange: [0, artworkTargetTranslateX] });
  const artworkScale = queueAnim.interpolate({ inputRange: [0, 1], outputRange: [1, miniTargetScale] });
  const artworkBorderRadius = queueAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 16 / miniTargetScale] });
  const queuePanelOpacity = queueAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const queuePanelTranslateY = queueAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  const QUEUE_BOTTOM_OFFSET = bottomControlsLayout ? bottomControlsLayout.height + 16 : 260;

  useEffect(() => {
    // Only snap to 0 if we aren't already in a swipe transition to avoid flashing
    if (!wasSwipeRef.current) {
      upNextAnim.setValue(0);
      Animated.timing(upNextAnim, { toValue: 1, duration: 260, useNativeDriver: false }).start();
    } else {
      upNextAnim.setValue(1);
    }
  }, [upcomingQueue[0]?.id]);

  const handleQueuePress = useCallback((track, idx) => {
    if (isMoving) return;
    setIsMoving(true);
    Animated.timing(queueShiftAnim, {
      toValue: -(idx + 1) * 84,
      duration: 350,
      useNativeDriver: false,
    }).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      playTrack(track, queue, 0, true);
    });
  }, [isMoving, queue, playTrack]);

  if (!currentTrack) return null;

  return (
    <>
      <PlayerBackground 
        currentColors={currentColors} 
        nextColors={nextColors} 
        ambianceFade={ambianceFade} 
      />
      
      <SafeAreaView style={{ flex: 1, zIndex: 10 }}>
        <View className="flex-1 px-8 pt-4 pb-12 relative" style={{ zIndex: 10 }}>
          
          <QueuePanel 
            queueMode={queueMode}
            queuePanelOpacity={queuePanelOpacity}
            queuePanelTranslateY={queuePanelTranslateY}
            upNextAnim={upNextAnim}
            upNextTranslateY={queueAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] })}
            queueShiftAnim={queueShiftAnim}
            upcomingQueue={upcomingQueue}
            handleQueuePress={handleQueuePress}
            removeFromQueue={removeFromQueue}
            resolveLocalPath={resolveLocalPath}
            coverUri={coverUri}
            bottomOffset={QUEUE_BOTTOM_OFFSET}
          />

          <PlayerHeader onCollapse={onCollapse} />

          <ArtworkCarousel 
            queueMode={queueMode}
            setArtworkContainerLayout={setArtworkContainerLayout}
            setArtworkLayout={setArtworkLayout}
            coverArtPanResponder={coverArtPanResponder}
            artworkTranslateY={artworkTranslateY}
            artworkTranslateX={artworkTranslateX}
            artworkScale={artworkScale}
            artworkShadowOpacity={0.35}
            artworkBorderRadius={artworkBorderRadius}
            safeArtworkWidth={safeArtworkWidth}
            prevCoverUri={prevCoverUri}
            coverUri={coverUri}
            nextCoverUri={nextCoverUri}
            coverSwipeAnim={coverSwipeAnim}
          />

          <View className="mt-8" onLayout={(e) => setBottomControlsLayout(e.nativeEvent.layout)}>
            <TrackInfo 
              setTargetPlaceholderLayout={setTargetPlaceholderLayout}
              queueAnim={queueAnim}
              currentTrack={currentTrack}
              toggleQueueMode={toggleQueueMode}
              queueMode={queueMode}
            />

            <ProgressBar 
              seekPanResponder={seekPanResponder}
              setProgressBarWidth={setProgressBarWidth}
              progressBarWidthRef={progressBarWidthRef}
              barScale={barScale}
              scrubAnim={scrubAnim}
              progressBarWidth={progressBarWidth}
              SCREEN_WIDTH={SCREEN_WIDTH}
              TOKENS={TOKENS}
              textScale={textScale}
              scrubPosition={scrubPosition}
              position={position}
              duration={duration}
            />

            <PlayerControls 
              toggleShuffleMode={toggleShuffleMode}
              shuffleMode={shuffleMode}
              handlePrev={handlePrev}
              handleNext={handleNext}
              togglePlayback={togglePlayback}
              isPlaying={isPlaying}
              toggleRepeatMode={toggleRepeatMode}
              repeatMode={repeatMode}
              setLyricsOpen={setLyricsOpen}
            />
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

  useEffect(() => {
    if (isExpanded) {
      setHasExpandedOnce(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        stiffness: 220,
        damping: 22,
        mass: 0.8,
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
        renderToHardwareTextureAndroid
        shouldRasterizeIOS
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: SCREEN_HEIGHT,
          backgroundColor: TOKENS.surface,
          transform: [{ translateY: slideAnim }],
        }}
        pointerEvents={isExpanded ? "auto" : "none"}
      >
        {hasExpandedOnce && (
          <View style={{ flex: 1 }}>
            <PlayerScreen onCollapse={collapsePlayer} />
          </View>
        )}
      </Animated.View>
    </>
  );
};

export default Player;
