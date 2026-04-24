import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { Play, Heart } from 'lucide-react-native';
import { CATEGORIES, TRACKS, FEATURED_PLAYLIST } from '../constants';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = styled(Image);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);

const { width } = Dimensions.get('window');

export function Discover({ onNavigateToPlaylist }: { onNavigateToPlaylist: (id: string) => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0d0f0d' }}>
      <StyledScrollView className="flex-1 px-6 pt-4 pb-40">
        <StyledView className="flex-row justify-between items-center mb-10">
          <StyledView className="flex-row items-center">
             <StyledView className="w-8 h-8 border-2 border-[#b9cbba] rounded-lg items-center justify-center mr-2">
                <StyledView className="w-0.5 h-4 bg-[#b9cbba] rounded-full mx-px" />
             </StyledView>
             <StyledText className="text-[#fff8f2] text-xl font-bold tracking-tighter">Musicly</StyledText>
          </StyledView>
          <StyledTouchableOpacity className="w-10 h-10 rounded-full border border-[#43494433] overflow-hidden">
             <StyledImage source={{ uri: 'https://picsum.photos/seed/user/100/100' }} className="w-full h-full" />
          </StyledTouchableOpacity>
        </StyledView>

        <StyledView className="mb-8">
          <StyledText className="text-[#a6ada6] text-xs uppercase tracking-widest font-medium mb-1">Curated for you</StyledText>
          <StyledText className="text-[#fff8f2] text-4xl font-bold tracking-tight">Good evening, Julian</StyledText>
        </StyledView>

        {/* Hero Card */}
        <StyledTouchableOpacity 
          activeOpacity={0.9}
          onPress={() => onNavigateToPlaylist(FEATURED_PLAYLIST.id)}
          className="relative w-full aspect-[16/9] bg-[#3b4b3e] rounded-[2rem] overflow-hidden mb-12 shadow-xl"
        >
          <StyledImage 
            source={{ uri: FEATURED_PLAYLIST.imageUrl }} 
            className="absolute inset-0 w-full h-full opacity-60"
          />
          <StyledView className="absolute inset-x-0 bottom-0 p-8">
            <StyledView className="flex-row justify-between items-end">
              <StyledView>
                <StyledText className="text-[#b9cbba] text-[10px] font-black uppercase tracking-widest mb-1">#1 Editor's Choice</StyledText>
                <StyledText className="text-[#fff8f2] text-2xl font-extrabold">{FEATURED_PLAYLIST.title}</StyledText>
                <StyledText className="text-[#a6ada6] text-xs uppercase">Aris Thorne</StyledText>
              </StyledView>
              <StyledView className="bg-[#b9cbba] w-12 h-12 rounded-full items-center justify-center shadow-lg">
                <Play size={24} color="#344437" fill="#344437" />
              </StyledView>
            </StyledView>
          </StyledView>
        </StyledTouchableOpacity>

        {/* Recently Visited */}
        <StyledView className="mb-10">
          <StyledView className="flex-row justify-between items-center mb-6">
            <StyledText className="text-xl font-bold text-[#fff8f2]">Recently Visited</StyledText>
            <StyledText className="text-[#b9cbba] text-xs font-bold uppercase">View All</StyledText>
          </StyledView>
          
          <StyledScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {TRACKS.map((track) => (
              <StyledTouchableOpacity key={track.id} className="mr-6 w-40">
                <StyledView className="aspect-square bg-[#171b17] rounded-3xl overflow-hidden mb-3">
                   <StyledImage source={{ uri: track.coverUrl }} className="w-full h-full" />
                </StyledView>
                <StyledText className="text-[#e1e7df] font-bold text-sm" numberOfLines={1}>{track.title}</StyledText>
                <StyledText className="text-[#a6ada6] text-xs" numberOfLines={1}>{track.artist}</StyledText>
              </StyledTouchableOpacity>
            ))}
          </StyledScrollView>
        </StyledView>

        {/* Trending */}
        <StyledView className="mb-12">
          <StyledText className="text-xl font-bold text-[#fff8f2] mb-6">Trending in Musicly</StyledText>
          <StyledView className="bg-[#171b17] rounded-3xl p-6 flex-row items-center space-x-6 mb-4">
             <StyledImage source={{ uri: 'https://picsum.photos/seed/trending/200/200' }} className="w-24 h-24 rounded-2xl" />
             <StyledView className="flex-1">
                <StyledText className="text-[#acbdad] text-[10px] font-bold uppercase tracking-widest">Rising Artist</StyledText>
                <StyledText className="text-[#e1e7df] text-lg font-bold">Siren's Call</StyledText>
                <StyledText className="text-[#a6ada6] text-sm font-medium">Elena Voss</StyledText>
             </StyledView>
          </StyledView>
        </StyledView>
      </StyledScrollView>
    </SafeAreaView>
  );
}
