import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, RefreshControl, TextInput, Image } from 'react-native';
import { Search as SearchIcon, SlidersHorizontal, User } from 'lucide-react-native';
import { useSync } from '../../context/SyncContext';

// Sonic Atelier Design Tokens
const TOKENS = {
  surface: '#0d0f0d',
  surfaceLow: '#111412',
  surfaceHigh: '#1c211d',
  primary: '#b9cbba',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
  tertiary: '#fff8f2',
};

// Mock data for search (previously lost)
const ARTISTS = [
  { id: '1', name: 'Sonn', imageUrl: 'https://picsum.photos/seed/sonn/200/200' },
  { id: '2', name: 'Luwten', imageUrl: 'https://picsum.photos/seed/luwten/200/200' },
  { id: '3', name: 'Jordan', imageUrl: 'https://picsum.photos/seed/jordan/200/200' },
];

const CATEGORIES = [
  { id: '1', title: 'Curated Playlists', imageUrl: 'https://picsum.photos/seed/curated/200/200' },
  { id: '2', title: 'New Releases', imageUrl: 'https://picsum.photos/seed/new/200/200' },
  { id: '3', title: 'Atmospheric', imageUrl: 'https://picsum.photos/seed/atmo/200/200' },
  { id: '4', title: 'Sonic Textures', imageUrl: 'https://picsum.photos/seed/sonic/200/200' },
];

export default function Explore() {
  const { syncing, syncMusic } = useSync();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await syncMusic();
    } finally {
      setTimeout(() => setIsRefreshing(false), 450);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TOKENS.surface }}>
      <View className="px-8">
        <View className="py-6 mb-2 flex-row justify-between items-center">
           <Text style={{ color: TOKENS.tertiary, letterSpacing: -1.5 }} className="text-4xl font-black">Search</Text>
           <TouchableOpacity style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-11 h-11 rounded-full items-center justify-center">
             <SlidersHorizontal size={18} color={TOKENS.primary} strokeWidth={2} />
           </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 180 }}
        className="flex-1 px-8 pt-2"
        refreshControl={<RefreshControl refreshing={isRefreshing || syncing} onRefresh={handleRefresh} tintColor={TOKENS.primary} />}
      >

        <View className="relative mb-10">
           <View className="absolute inset-y-0 left-5 z-10 flex items-center justify-center pointer-events-none">
              <SearchIcon size={18} color={TOKENS.onSurfaceVariant} opacity={0.5} />
           </View>
           <TextInput 
              placeholder="Artists, songs, or curators"
              placeholderTextColor={`${TOKENS.onSurfaceVariant}44`}
              style={{ backgroundColor: TOKENS.surfaceLow, color: TOKENS.onSurface }}
              className="rounded-[28px] py-4.5 pl-14 pr-6 text-sm font-bold tracking-tight"
           />
        </View>

        <View className="mb-12">
          <View className="flex-row justify-between items-baseline mb-8">
            <Text style={{ color: TOKENS.tertiary, letterSpacing: -0.5 }} className="text-2xl font-black">Recent Searches</Text>
            <Text style={{ color: TOKENS.primary }} className="text-[10px] font-black uppercase tracking-widest">Clear</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {ARTISTS.map(artist => (
              <TouchableOpacity key={artist.id} className="items-center mr-8">
                <View style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-20 h-20 rounded-full mb-3 overflow-hidden">
                  <Image source={{ uri: artist.imageUrl }} style={{ width: '100%', height: '100%' }} className="grayscale opacity-80" />
                </View>
                <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[10px] font-black uppercase tracking-widest opacity-60 text-center">{artist.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="mb-12">
          <Text style={{ color: TOKENS.tertiary, letterSpacing: -0.5 }} className="text-2xl font-black mb-8">Browse All</Text>
          <View className="flex-row flex-wrap justify-between">
            {CATEGORIES.map(category => (
              <TouchableOpacity 
                key={category.id}
                style={{ backgroundColor: TOKENS.surfaceLow }}
                className="w-[47%] aspect-square rounded-[40px] p-6 mb-6 overflow-hidden"
              >
                <Text style={{ color: TOKENS.tertiary }} className="text-base font-black tracking-tight">{category.title}</Text>
                <View className="absolute -right-4 -bottom-4 w-24 h-24 rotate-12 opacity-40">
                  <Image source={{ uri: category.imageUrl }} style={{ width: '100%', height: '100%' }} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
