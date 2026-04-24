import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Play, SkipBack, SkipForward, Pause } from 'lucide-react-native';
import { TRACKS } from '../constants';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = styled(Image);
const StyledTouchableOpacity = styled(TouchableOpacity);

export function PlayerBar({ onOpenPlayer }: { onOpenPlayer: () => void }) {
  const track = TRACKS[2];

  return (
    <StyledTouchableOpacity
      onPress={onOpenPlayer}
      activeOpacity={0.9}
      className="absolute bottom-24 left-4 right-4 bg-[#1c211d]/95 p-2 rounded-full flex-row items-center space-x-4 border border-[#43494433] shadow-lg"
    >
      <StyledImage 
        source={{ uri: track.coverUrl }} 
        className="w-12 h-12 rounded-full"
      />
      
      <StyledView className="flex-1">
        <StyledText className="text-[#e1e7df] text-xs font-bold" numberOfLines={1}>
          {track.title}
        </StyledText>
        <StyledText className="text-[#a6ada6] text-[10px] uppercase tracking-widest font-semibold">
          {track.artist}
        </StyledText>
      </StyledView>

      <StyledView className="flex-row items-center space-x-4 pr-2">
        <StyledTouchableOpacity>
          <SkipBack size={20} color="#a6ada6" />
        </StyledTouchableOpacity>
        <StyledView className="w-10 h-10 bg-[#b9cbba] rounded-full items-center justify-center">
          <Pause size={18} color="#344437" fill="#344437" />
        </StyledView>
        <StyledTouchableOpacity>
          <SkipForward size={20} color="#a6ada6" />
        </StyledTouchableOpacity>
      </StyledView>
    </StyledTouchableOpacity>
  );
}
