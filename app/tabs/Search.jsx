import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Search as SearchIcon, SlidersHorizontal, X, Music, AudioLines } from 'lucide-react-native';
import { useSync } from '../../context/SyncContext';
import { usePlayer } from '../../context/PlayerContext';
import { haptics } from '../../utils/haptics';

// Sonic Atelier Design Tokens
const TOKENS = {
  surface: '#0d0f0d',
  surfaceLow: '#111412',
  surfaceHigh: '#1c211d',
  surfaceHighest: '#212722',
  primary: '#b9cbba',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
  tertiary: '#fff8f2',
};

// Mock data for search
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
  const { syncing, syncMusic, downloadedSongs, resolveLocalPath } = useSync();
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    haptics.impactLight();
    setIsRefreshing(true);
    try {
      await syncMusic();
    } finally {
      setTimeout(() => setIsRefreshing(false), 450);
    }
  };

  const filteredSongs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return Object.values(downloadedSongs || {}).filter(song =>
      (song.title || '').toLowerCase().includes(q) ||
      (song.artistName || '').toLowerCase().includes(q) ||
      (song.album || '').toLowerCase().includes(q)
    );
  }, [searchQuery, downloadedSongs]);

  const handleSongPress = (song) => {
    haptics.impactLight();
    playTrack(song, filteredSongs);
  };

  const handleClearSearch = () => {
    haptics.impactLight();
    setSearchQuery('');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: TOKENS.surface }}>
      <View className="px-8">
        <View className="py-6 mb-2 flex-row justify-between items-center">
          <Text style={{ color: TOKENS.tertiary, letterSpacing: -1.5 }} className="text-4xl font-black">Search</Text>
          <TouchableOpacity 
            onPress={() => haptics.selection()}
            style={{ backgroundColor: TOKENS.surfaceHigh }} 
            className="w-11 h-11 rounded-full items-center justify-center"
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <SlidersHorizontal size={18} color={TOKENS.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-8 mb-6">
        <View className="relative">
          <View className="absolute inset-y-0 left-5 z-10 flex items-center justify-center pointer-events-none">
            <SearchIcon size={18} color={TOKENS.onSurfaceVariant} opacity={0.6} />
          </View>
          <TextInput 
            placeholder="Artists, songs, or curators"
            placeholderTextColor={`${TOKENS.onSurfaceVariant}55`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCorrect={false}
            style={{ backgroundColor: TOKENS.surfaceLow, color: TOKENS.onSurface }}
            className="rounded-[28px] py-4.5 pl-14 pr-12 text-sm font-bold tracking-tight"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={handleClearSearch}
              className="absolute inset-y-0 right-4 z-10 justify-center px-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View className="w-6 h-6 rounded-full bg-white/10 items-center justify-center">
                <X size={13} color={TOKENS.onSurfaceVariant} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searchQuery.trim().length > 0 ? (
        <FlatList
          data={filteredSongs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 180 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="items-center py-20 opacity-40">
              <Music size={44} color={TOKENS.onSurfaceVariant} strokeWidth={1} />
              <Text style={{ color: TOKENS.onSurfaceVariant, letterSpacing: 2 }} className="font-bold text-xs uppercase mt-4">
                No matching tracks found
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isActive = currentTrack?.id === item.id;
            return (
              <TouchableOpacity
                onPress={() => handleSongPress(item)}
                activeOpacity={0.7}
                style={{
                  backgroundColor: isActive ? TOKENS.surfaceHighest : TOKENS.surfaceLow,
                  marginBottom: 10,
                }}
                className="flex-row items-center p-3.5 rounded-[24px]"
              >
                <View style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-12 h-12 rounded-xl overflow-hidden mr-4">
                  {item.localCoverUri ? (
                    <Image 
                      source={{ uri: resolveLocalPath(item.localCoverUri) }} 
                      style={{ width: '100%', height: '100%' }}
                      cachePolicy="memory-disk"
                      transition={200}
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Music size={18} color={TOKENS.primary} opacity={0.4} />
                    </View>
                  )}
                  {isActive && (
                    <View className="absolute inset-0 bg-black/50 items-center justify-center">
                      <AudioLines size={18} color={TOKENS.primary} />
                    </View>
                  )}
                </View>
                <View className="flex-1 pr-2">
                  <Text 
                    style={{ color: isActive ? TOKENS.primary : TOKENS.onSurface }} 
                    className="font-bold text-sm tracking-tight mb-0.5" 
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text 
                    style={{ color: TOKENS.onSurfaceVariant }} 
                    className="text-xs font-semibold opacity-60" 
                    numberOfLines={1}
                  >
                    {item.artistName || 'Sonic Atelier'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 180 }}
          className="flex-1 px-8"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefreshing || syncing} onRefresh={handleRefresh} tintColor={TOKENS.primary} />}
        >
          <View className="mb-12">
            <View className="flex-row justify-between items-baseline mb-6">
              <Text style={{ color: TOKENS.tertiary, letterSpacing: -0.5 }} className="text-2xl font-black">Recent Searches</Text>
              <TouchableOpacity onPress={() => haptics.impactLight()}>
                <Text style={{ color: TOKENS.primary }} className="text-[10px] font-black uppercase tracking-widest">Clear</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {ARTISTS.map(artist => (
                <TouchableOpacity 
                  key={artist.id} 
                  onPress={() => {
                    haptics.impactLight();
                    setSearchQuery(artist.name);
                  }}
                  activeOpacity={0.8}
                  className="items-center mr-8"
                >
                  <View style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-20 h-20 rounded-full mb-3 overflow-hidden">
                    <Image 
                      source={{ uri: artist.imageUrl }} 
                      style={{ width: '100%', height: '100%' }} 
                      cachePolicy="memory-disk"
                      transition={200}
                      className="grayscale opacity-80" 
                    />
                  </View>
                  <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[10px] font-black uppercase tracking-widest opacity-60 text-center">{artist.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View className="mb-12">
            <Text style={{ color: TOKENS.tertiary, letterSpacing: -0.5 }} className="text-2xl font-black mb-6">Browse All</Text>
            <View className="flex-row flex-wrap justify-between">
              {CATEGORIES.map(category => (
                <TouchableOpacity 
                  key={category.id}
                  onPress={() => {
                    haptics.impactLight();
                    setSearchQuery(category.title);
                  }}
                  activeOpacity={0.85}
                  style={{ backgroundColor: TOKENS.surfaceLow }}
                  className="w-[47%] aspect-square rounded-[36px] p-6 mb-6 overflow-hidden justify-between"
                >
                  <Text style={{ color: TOKENS.tertiary }} className="text-base font-black tracking-tight">{category.title}</Text>
                  <View className="absolute -right-4 -bottom-4 w-24 h-24 rotate-12 opacity-40 pointer-events-none">
                    <Image 
                      source={{ uri: category.imageUrl }} 
                      style={{ width: '100%', height: '100%' }}
                      cachePolicy="memory-disk"
                      transition={200}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

