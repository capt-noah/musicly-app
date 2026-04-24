import React from 'react';
import { View, Text, Image, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { ChevronDown, Shuffle, SkipBack, SkipForward, Repeat, Pause, Speaker, Share2, ListMusic } from 'lucide-react-native';
import { TRACKS } from '../constants';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = styled(Image);
const StyledTouchableOpacity = styled(TouchableOpacity);

const { width } = Dimensions.get('window');

export function NowPlaying({ onClose }: { onClose: () => void }) {
  const track = TRACKS[2];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0d0f0d' }}>
      <StyledView className="flex-1 px-8 pt-4 pb-10">
        <StyledView className="flex-row justify-between items-center mb-10">
          <StyledTouchableOpacity onPress={onClose}>
            <ChevronDown size={32} color="#b9cbba" />
          </StyledTouchableOpacity>
          <StyledView className="items-center">
             <StyledText className="text-[#a6ada6] text-[10px] uppercase font-bold tracking-widest">Now Playing</StyledText>
             <StyledText className="text-[#b9cbba] text-xs font-bold uppercase mt-0.5">Musicly</StyledText>
          </StyledView>
          <StyledView className="w-8 h-8 rounded-full border border-[#43494433] overflow-hidden">
             <StyledImage source={{ uri: 'https://picsum.photos/seed/user/100/100' }} className="w-full h-full" />
          </StyledView>
        </StyledView>

        <StyledView className="items-center justify-center flex-1">
          <StyledView className="w-full aspect-square bg-[#171b17] rounded-[3rem] shadow-2xl overflow-hidden mb-12 border border-[#43494433]">
             <StyledImage source={{ uri: track.coverUrl }} className="w-full h-full" />
          </StyledView>

          <StyledView className="w-full items-start mb-10">
             <StyledText className="text-[#fff8f2] text-4xl font-extrabold tracking-tighter mb-1">{track.title}</StyledText>
             <StyledText className="text-[#b9cbba] text-xl font-medium tracking-tight">{track.artist}</StyledText>
          </StyledView>

          {/* Progress Slider Mock */}
          <StyledView className="w-full mb-10">
             <StyledView className="w-full h-1.5 bg-[#43494433] rounded-full overflow-hidden">
                <StyledView className="w-[45%] h-full bg-[#b9cbba] rounded-full" />
             </StyledView>
             <StyledView className="flex-row justify-between mt-3">
                <StyledText className="text-[#a6ada6] text-[11px] font-mono">2:14</StyledText>
                <StyledText className="text-[#a6ada6] text-[11px] font-mono">{track.duration}</StyledText>
             </StyledView>
          </StyledView>

          <StyledView className="flex-row w-full items-center justify-between mb-12">
            <Shuffle size={20} color="#a6ada6" />
            <StyledView className="flex-row items-center space-x-10">
               <SkipBack size={36} color="#e1e7df" fill="#e1e7df" />
               <StyledTouchableOpacity className="w-20 h-20 bg-[#b9cbba] rounded-full items-center justify-center shadow-xl">
                 <Pause size={40} color="#344437" fill="#344437" />
               </StyledTouchableOpacity>
               <SkipForward size={36} color="#e1e7df" fill="#e1e7df" />
            </StyledView>
            <Repeat size={20} color="#a6ada6" />
          </StyledView>

          <StyledTouchableOpacity className="items-center space-y-2 mt-4">
             <StyledView className="space-y-1">
                <StyledView className="w-6 h-1 bg-[#a6ada633] rounded-full" />
                <StyledView className="w-10 h-1 bg-[#a6ada655] rounded-full" />
             </StyledView>
             <StyledText className="text-[#a6ada6] text-[10px] font-black uppercase tracking-widest">Lyrics</StyledText>
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>

      <StyledView className="bg-[#111412]/60 px-8 py-6 flex-row justify-between items-center border-t border-[#43494422]">
        <StyledTouchableOpacity className="flex-row items-center space-x-2">
           <Speaker size={18} color="#a6ada6" />
           <StyledText className="text-[#a6ada6] text-[10px] font-black uppercase tracking-widest">Studio Speakers</StyledText>
        </StyledTouchableOpacity>
        <StyledView className="flex-row items-center space-x-8">
           <Share2 size={20} color="#a6ada6" />
           <ListMusic size={20} color="#a6ada6" />
        </StyledView>
      </StyledView>
    </SafeAreaView>
  );
}
