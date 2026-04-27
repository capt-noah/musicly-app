import React from "react";
import { Animated, Text, View } from "react-native";
import { formatTime } from "./playerUtils";

const ProgressBar = React.memo(({ 
  seekPanResponder, 
  setProgressBarWidth, 
  progressBarWidthRef, 
  barScale, 
  scrubAnim, 
  progressBarWidth, 
  SCREEN_WIDTH, 
  TOKENS, 
  textScale, 
  scrubPosition, 
  position, 
  duration 
}) => {
  return (
    <View className="mb-6">
      <View
        {...seekPanResponder.panHandlers}
        onLayout={(e) => {
          setProgressBarWidth(e.nativeEvent.layout.width);
          progressBarWidthRef.current = e.nativeEvent.layout.width;
        }}
        style={{ height: 44, justifyContent: "center" }}
      >
        {/* pointerEvents="none" on children ensures touches always land
            on the outer container, making locationX consistently accurate */}
        <Animated.View
          pointerEvents="none"
          style={{
            height: 5,
            borderRadius: 99,
            overflow: "hidden",
            backgroundColor: "rgba(255,255,255,0.2)",
            transform: [{ scaleY: barScale }],
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 99,
              backgroundColor: TOKENS.onSurface,
              shadowColor: "#fff",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.4,
              shadowRadius: 6,
              transform: [{
                translateX: scrubAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: [-progressBarWidth || -SCREEN_WIDTH, 0],
                })
              }]
            }}
          />
        </Animated.View>
      </View>
      <View className="flex-row justify-between">
        <Animated.View style={{ transform: [{ scale: textScale }] }}>
          <Text style={{
            color: scrubPosition !== null ? "#ffffff" : "rgba(255,255,255,0.6)",
            fontSize: 11, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase",
          }}>
            {formatTime(scrubPosition !== null ? scrubPosition : position)}
          </Text>
        </Animated.View>
        <Animated.View style={{ transform: [{ scale: textScale }] }}>
          <Text style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 11, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase",
          }}>
            {formatTime(duration)}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
});

export default ProgressBar;
