import React from "react";
import { Animated, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const PlayerBackground = React.memo(({ currentColors, nextColors, ambianceFade }) => {
  return (
    <>
      {/* BASE BACKGROUND */}
      <View 
        renderToHardwareTextureAndroid
        shouldRasterizeIOS
        style={{ position: "absolute", width: "100%", height: "100%", zIndex: 0 }}
      >
        <LinearGradient
          colors={currentColors}
          locations={[0, 0.35, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <LinearGradient
          colors={[currentColors[0], "transparent", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1.5 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 }}
        />
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
    </>
  );
});

export default PlayerBackground;
