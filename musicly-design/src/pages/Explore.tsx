import React from 'react';
import { View, Text, ScrollView, SafeAreaView, TextInput, TouchableOpacity, Image } from 'react-native';
import { Search as SearchIcon } from 'lucide-react-native';
import { CATEGORIES, ARTISTS } from '../constants';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

export function Explore() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0d0f0d' }}>
      <StyledScrollView className="flex-1 px-6 pb-40">
        <StyledView className="py-4">
           <StyledText className="text-[#fff8f2] text-xl font-bold tracking-tighter">Explore</StyledText>
        </StyledView>

        <StyledView className="relative mb-8">
           <StyledView className="absolute inset-y-0 left-4 z-10 flex items-center justify-center pointer-events-none">
              <SearchIcon size={20} color="#a6ada6" />
           </StyledView>
           <StyledTextInput 
              placeholder="Artists, songs, or podcasts"
              placeholderTextColor="#a6ada666"
              className="bg-[#111412] rounded-full py-4 pl-12 pr-4 text-[#e1e7df] text-sm font-medium"
           />
        </StyledView>

        <StyledView className="mb-10">
          <StyledView className="flex-row justify-between items-end mb-6">
            <StyledText className="text-xl font-bold text-[#fff8f2]">Recent Searches</StyledText>
            <StyledText className="text-[#b9cbba] text-xs font-bold uppercase">Clear all</StyledText>
          </StyledView>
          <StyledScrollView horizontal showsHorizontalScrollIndicator={false}>
            {ARTISTS.map(artist => (
              <StyledTouchableOpacity key={artist.id} className="items-center mr-6">
                <StyledImage source={{ uri: artist.imageUrl }} className="w-20 h-20 rounded-full grayscale mb-2 border border-[#43494433]" />
                <StyledText className="text-[#a6ada6] text-[10px] font-medium tracking-wide">{artist.name}</StyledText>
              </StyledTouchableOpacity>
            ))}
          </StyledScrollView>
        </StyledView>

        <StyledView className="mb-12">
          <StyledText className="text-xl font-bold text-[#fff8f2] mb-6">Browse All</StyledText>
          <StyledView className="flex-row flex-wrap justify-between">
            {CATEGORIES.map(category => (
              <StyledTouchableOpacity 
                key={category.id}
                className={`w-[48%] aspect-square rounded-[2rem] p-5 mb-4 overflow-hidden ${category.gradient}`}
              >
                <StyledText className="text-[#fff8f2] text-base font-extrabold">{category.title}</StyledText>
                <StyledImage source={{ uri: category.imageUrl }} className="absolute -right-4 -bottom-4 w-24 h-24 rotate-12 opacity-80" />
              </StyledTouchableOpacity>
            ))}
          </StyledView>
        </StyledView>
      </StyledScrollView>
    </SafeAreaView>
  );
}
