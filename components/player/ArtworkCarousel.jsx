import React from "react";
import { Animated, View } from "react-native";
import { Image } from "expo-image";

const ArtworkCarousel = React.memo(({ 
  queueMode, 
  setArtworkContainerLayout, 
  setArtworkLayout, 
  coverArtPanResponder, 
  artworkTranslateY, 
  artworkTranslateX, 
  artworkScale, 
  artworkShadowOpacity, 
  artworkBorderRadius, 
  safeArtworkWidth, 
  prevCoverUri, 
  coverUri, 
  nextCoverUri, 
  coverSwipeAnim 
}) => {
  return (
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
                left: side * (safeArtworkWidth + 40), // Added gap between covers
                opacity: coverSwipeAnim.interpolate({
                  inputRange: [(side - 1) * safeArtworkWidth, side * safeArtworkWidth, (side + 1) * safeArtworkWidth],
                  outputRange: [0, 1, 0],
                  extrapolate: 'clamp'
                }),
                transform: [
                  { translateX: coverSwipeAnim },
                  { scale: coverSwipeAnim.interpolate({
                      inputRange: [(side - 1) * safeArtworkWidth, side * safeArtworkWidth, (side + 1) * safeArtworkWidth],
                      outputRange: [0.85, 1, 0.85],
                      extrapolate: 'clamp'
                    })
                  }
                ],
              }}
              renderToHardwareTextureAndroid={true}
              shouldRasterizeIOS={true}
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
  );
});

export default ArtworkCarousel;
