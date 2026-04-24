import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, TextInput } from 'react-native';
import { ChevronLeft, Play, Heart, Download, MoreHorizontal, Clock, ListFilter, Search } from 'lucide-react-native';
import { FEATURED_PLAYLIST } from '../constants';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = styled(Image);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);

const { height } = Dimensions.get('window');

export function PlaylistDetail({ onBack }: { onBack: () => void }) {
  const playlist = FEATURED_PLAYLIST;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0d0f0d' }}>
      <StyledScrollView className="flex-1">
        {/* Header Image */}
        <StyledView className="relative w-full h-80">
          <StyledImage 
            source={{ uri: playlist.imageUrl }} 
            className="w-full h-full opacity-40"
          />
          {/* Back Button */}
          <StyledTouchableOpacity 
            onPress={onBack}
            className="absolute top-12 left-6 w-10 h-10 bg-black/40 rounded-full items-center justify-center"
          >
            <ChevronLeft size={24} color="#b9cbba" />
          </StyledTouchableOpacity>
        </StyledView>

        <StyledView className="px-6 -mt-32">
          <StyledView className="flex-row items-end space-x-6 mb-8">
            <StyledImage 
              source={{ uri: playlist.imageUrl }} 
              className="w-48 h-48 rounded-[2rem] shadow-2xl bg-[#171b17]"
            />
          </StyledView>

          <StyledText className="text-[#b9cbba] text-xs font-bold tracking-widest uppercase mb-2">Curated Collection</StyledText>
          <StyledText className="text-[#fff8f2] text-5xl font-extrabold tracking-tight mb-4">{playlist.title}</StyledText>
          <StyledText className="text-[#a6ada6] text-base leading-snug mb-6">{playlist.description}</StyledText>
          
          <StyledView className="flex-row items-center space-x-3 mb-8">
            <StyledText className="text-[#e1e7df] text-xs font-bold">The Sonic Atelier</StyledText>
            <StyledView className="w-1 h-1 bg-[#434944] rounded-full" />
            <StyledText className="text-[#a6ada6] text-xs">{playlist.itemCount} tracks</StyledText>
            <StyledView className="w-1 h-1 bg-[#434944] rounded-full" />
            <StyledText className="text-[#a6ada6] text-xs font-mono">{playlist.duration}</StyledText>
          </StyledView>

          <StyledView className="flex-row items-center justify-between mb-8">
             <StyledView className="flex-row items-center space-x-6">
                <StyledTouchableOpacity className="w-16 h-16 bg-[#b9cbba] rounded-full items-center justify-center shadow-lg">
                  <Play size={32} color="#344437" fill="#344437" />
                </StyledTouchableOpacity>
                <Heart size={28} color="#a6ada6" />
                <Download size={28} color="#a6ada6" />
             </StyledView>
             <MoreHorizontal size={28} color="#a6ada6" />
          </StyledView>

          {/* Track List */}
          <StyledView className="mt-4 pb-32">
            {playlist.tracks.map((track, index) => (
              <StyledTouchableOpacity 
                key={track.id} 
                className={`flex-row items-center py-4 mb-2 rounded-2xl px-2 ${index === 2 ? 'bg-[#1c211d]' : ''}`}
              >
                <StyledView className="w-8 items-center mr-2">
                  <StyledText className={`text-xs font-bold ${index === 2 ? 'text-[#b9cbba]' : 'text-[#a6ada6]'}`}>
                    {index + 1}
                  </StyledText>
                </StyledView>
                <StyledImage source={{ uri: track.coverUrl }} className="w-12 h-12 rounded-xl mr-4" />
                <StyledView className="flex-1">
                  <StyledText className={`font-bold text-sm ${index === 2 ? 'text-[#b9cbba]' : 'text-[#e1e7df]'}`} numberOfLines={1}>{track.title}</StyledText>
                  <StyledText className="text-[#a6ada6] text-xs" numberOfLines={1}>{track.artist}</StyledText>
                </StyledView>
                <StyledText className="text-[#a6ada6] text-[10px] font-mono ml-4">{track.duration}</StyledText>
              </StyledTouchableOpacity>
            ))}
          </StyledView>
        </StyledView>
      </StyledScrollView>
    </SafeAreaView>
  );
}
