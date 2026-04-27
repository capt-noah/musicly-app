import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ChevronUp, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from "lucide-react-native";
import { TOKENS } from "./playerUtils";

const PlayerControls = React.memo(({ 
  toggleShuffleMode, 
  shuffleMode, 
  handlePrev, 
  handleNext, 
  togglePlayback, 
  isPlaying, 
  toggleRepeatMode, 
  repeatMode, 
  setLyricsOpen 
}) => {
  return (
    <>
      <View className="flex-row items-center justify-between mb-12 px-2">
        {/* Shuffle Button */}
        <TouchableOpacity 
          onPress={toggleShuffleMode}
          className="w-10 h-10 items-center justify-center rounded-full"
          style={{ backgroundColor: shuffleMode ? 'rgba(185, 203, 186, 0.15)' : 'transparent' }}
        >
          <Shuffle 
            size={24} 
            color={shuffleMode ? TOKENS.primary : "rgba(255,255,255,0.5)"} 
            strokeWidth={shuffleMode ? 3 : 2} 
          />
        </TouchableOpacity>
        
        {/* Playback Controls */}
        <View className="flex-row items-center gap-4 justify-center">
          <TouchableOpacity onPress={handlePrev} className="w-12 h-12 items-center justify-center">
            <SkipBack size={32} color="#ffffff" fill="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={togglePlayback}
            style={{ 
              backgroundColor: '#ffffff',
              shadowColor: '#ffffff',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 8
            }}
            className="w-20 h-20 rounded-full items-center justify-center mx-16"
          >
            {isPlaying ? (
              <Pause size={32} color="#000000" fill="#000000" />
            ) : (
              <Play size={32} color="#000000" fill="#000000" style={{ marginLeft: 4 }} />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext} className="w-12 h-12 items-center justify-center">
            <SkipForward size={32} color="#ffffff" fill="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Repeat Button */}
        <TouchableOpacity 
          onPress={toggleRepeatMode}
          className="w-10 h-10 items-center justify-center rounded-full"
          style={{ backgroundColor: repeatMode !== 'OFF' ? 'rgba(185, 203, 186, 0.15)' : 'transparent' }}
        >
          {repeatMode === 'ONE' ? (
            <Repeat1 size={24} color={TOKENS.primary} strokeWidth={3} />
          ) : (
            <Repeat 
              size={24} 
              color={repeatMode === 'ALL' ? TOKENS.primary : "rgba(255,255,255,0.5)"} 
              strokeWidth={repeatMode === 'ALL' ? 3 : 2} 
            />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => setLyricsOpen(true)} className="items-center">
        <ChevronUp size={16} color={TOKENS.onSurfaceVariant} strokeWidth={2.5} />
        <Text style={{ color: TOKENS.onSurfaceVariant, letterSpacing: 2 }} className="text-[10px] font-black uppercase mt-1.5">Lyrics</Text>
      </TouchableOpacity>
    </>
  );
});

export default PlayerControls;
