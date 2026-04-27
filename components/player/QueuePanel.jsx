import React from "react";
import { Animated, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Music, X } from "lucide-react-native";
import { Image } from "expo-image";
import { TOKENS } from "./playerUtils";

const QueuePanel = React.memo(({ 
  queueMode, 
  queuePanelOpacity, 
  queuePanelTranslateY, 
  upNextAnim, 
  upNextTranslateY, 
  queueShiftAnim, 
  upcomingQueue, 
  handleQueuePress, 
  removeFromQueue, 
  resolveLocalPath, 
  coverUri,
  bottomOffset
}) => {
  return (
    <Animated.View
      pointerEvents={queueMode ? "auto" : "none"}
      style={{
        position: "absolute",
        top: 80, 
        left: 24,
        right: 24,
        bottom: bottomOffset, 
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
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 40 }}
        removeClippedSubviews={Platform.OS === 'android'}
      >
        <Animated.View style={{ 
          opacity: upNextAnim, 
          transform: [
            { translateY: upNextTranslateY },
            { translateY: queueShiftAnim }
          ] 
        }}>
          {upcomingQueue.length === 0 ? (
            <View className="items-center py-20 opacity-60">
              <View style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} className="w-16 h-16 rounded-full items-center justify-center mb-6">
                <Music size={32} color="#ffffff" strokeWidth={1.5} />
              </View>
              <Text style={{ color: '#ffffff' }} className="text-[11px] font-black uppercase tracking-[0.3em]">No song in queue</Text>
            </View>
          ) : (
            upcomingQueue.map((track, idx) => {
              // Only animate the first few for performance
              const isStackTop = idx < 3;
              return (
                <Animated.View
                  key={`${track.id}-${idx}`}
                  style={{
                    opacity: upNextAnim.interpolate({
                      inputRange: [0, Math.min(1, 0.1 + idx * 0.1), Math.min(1, 0.3 + idx * 0.1)],
                      outputRange: [0, 0, 1],
                      extrapolate: 'clamp'
                    }),
                    transform: [
                      { translateY: upNextAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20 * (idx + 1), 0],
                          extrapolate: 'clamp'
                        })
                      },
                      { scale: isStackTop ? upNextAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.9, 1],
                          extrapolate: 'clamp'
                        }) : 1
                      }
                    ],
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleQueuePress(track, idx)}
                    style={{ 
                      backgroundColor: "rgba(255, 255, 255, 0.12)",
                      borderColor: "rgba(255, 255, 255, 0.2)",
                      borderWidth: 1,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2, 
                      shadowRadius: 8, 
                      elevation: 4,
                    }}
                    className="flex-row items-center px-4 py-2 rounded-[24px] mb-3"
                  >
                    <View className="w-12 h-12 rounded-xl overflow-hidden mr-4 shadow-sm" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                      <Image 
                        source={{ uri: resolveLocalPath(track.localCoverUri) || track.coverUrl || coverUri }} 
                        style={{ width: "100%", height: "100%" }} 
                        contentFit="cover" 
                        transition={200} 
                      />
                    </View>
                    <View className="flex-1 pr-4">
                      <Text style={{ color: TOKENS.onSurface }} className="font-bold text-[16px] mb-0.5" numberOfLines={1}>{track.title}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.6)" }} className="text-[11px] font-bold uppercase tracking-wide" numberOfLines={1}>{track.artistName || "Unknown Artist"}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => removeFromQueue(track.id)} 
                      className="items-center justify-center" 
                      style={{ backgroundColor: "rgba(255,255,255,0.1)", width: 32, height: 32, borderRadius: 16 }}
                    >
                      <X size={14} color="#ffffff" strokeWidth={2.5} opacity={0.6} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
});

export default QueuePanel;
