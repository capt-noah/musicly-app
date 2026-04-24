import React from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { Heart, Grid } from 'lucide-react-native';
import { TRACKS } from '../constants';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

export function Library() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0d0f0d' }}>
      <StyledScrollView className="flex-1 px-6 pb-40">
        <StyledView className="py-4 mb-4">
           <StyledText className="text-[#fff8f2] text-xl font-bold tracking-tighter">Your Library</StyledText>
        </StyledView>

        <StyledScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-10 flex-row space-x-3">
           <StyledTouchableOpacity className="bg-[#b9cbba] px-6 py-2 rounded-full mr-2">
              <StyledText className="text-[#344437] font-bold text-xs uppercase">Playlists</StyledText>
           </StyledTouchableOpacity>
           <StyledTouchableOpacity className="bg-[#1c211d] px-6 py-2 rounded-full mr-2">
              <StyledText className="text-[#e1e7df] font-bold text-xs uppercase">Artists</StyledText>
           </StyledTouchableOpacity>
           <StyledTouchableOpacity className="bg-[#1c211d] px-6 py-2 rounded-full">
              <StyledText className="text-[#e1e7df] font-bold text-xs uppercase">Albums</StyledText>
           </StyledTouchableOpacity>
        </StyledScrollView>

        <StyledTouchableOpacity className="bg-[#111412] p-4 rounded-2xl flex-row items-center mb-10 border border-[#43494411]">
           <StyledView className="w-16 h-16 bg-[#3b4b3e] rounded-2xl items-center justify-center mr-4">
              <Heart size={24} color="#b9cbba" fill="#b9cbba" />
           </StyledView>
           <StyledView className="flex-1">
              <StyledText className="text-[#e1e7df] font-bold text-lg">Liked Songs</StyledText>
              <StyledText className="text-[#a6ada6] text-xs">Playlist • 1,248 songs</StyledText>
           </StyledView>
        </StyledTouchableOpacity>

        <StyledView className="flex-row justify-between items-center mb-6">
           <StyledText className="text-[#a6ada6] text-[10px] uppercase font-bold tracking-widest">Recently Played</StyledText>
           <Grid size={20} color="#a6ada6" />
        </StyledView>

        <StyledView className="space-y-4">
          {TRACKS.map(track => (
            <StyledTouchableOpacity key={track.id} className="flex-row items-center p-2 rounded-xl">
               <StyledImage source={{ uri: track.coverUrl }} className="w-14 h-14 rounded-xl mr-4" />
               <StyledView className="flex-1">
                  <StyledText className="text-[#e1e7df] font-bold text-sm" numberOfLines={1}>{track.title}</StyledText>
                  <StyledText className="text-[#a6ada6] text-xs" numberOfLines={1}>{track.artist}</StyledText>
               </StyledView>
            </StyledTouchableOpacity>
          ))}
        </StyledView>
      </StyledScrollView>
    </SafeAreaView>
  );
}
