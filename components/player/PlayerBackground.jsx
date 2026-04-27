import React from "react";
import { Animated, View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const PlayerBackground = React.memo(({ currentColors, nextColors, ambianceFade }) => {
  if (!currentColors) return null;
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* BASE BACKGROUND */}
      <View 
        renderToHardwareTextureAndroid
        shouldRasterizeIOS
        style={StyleSheet.absoluteFillObject}
      >
        <LinearGradient
          colors={currentColors}
          locations={[0, 0.35, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={[currentColors[0], "transparent", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1.5 }}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.6 }]}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0)", currentColors[3] + "40", currentColors[3] + "80"]}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* CROSSFADING OVERLAY BACKGROUND */}
      {nextColors && (
        <Animated.View 
          style={[StyleSheet.absoluteFillObject, { opacity: ambianceFade, zIndex: 1 }]}
        >
          <LinearGradient
            colors={nextColors}
            locations={[0, 0.35, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={[nextColors[0], "transparent", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1.5 }}
            style={[StyleSheet.absoluteFillObject, { opacity: 0.6 }]}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0)", nextColors[3] + "40", nextColors[3] + "80"]}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      )}
    </View>
  );
});

export default PlayerBackground;
