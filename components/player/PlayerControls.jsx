import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ChevronUp, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from "lucide-react-native";
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
    </>
  );
});

export default PlayerControls;
