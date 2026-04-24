 import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Search, Plus, Minus, Disc } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useSync } from '../context/SyncContext';
import { useAuth } from '../context/AuthContext';
import SonicSheet from './SonicSheet';

const TOKENS = {
  surfaceLow: '#111412',
  surfaceHigh: '#1c211d',
  surfaceHighest: '#212722',
  primary: '#b9cbba',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
};

export default function AddSongsToPlaylistModal({ visible, onClose, playlistId, currentSongIds, onSongsUpdated }) {
  const { downloadedSongs, resolveLocalPath, API_URL } = useSync();
  const { sessionId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingIds, setLoadingIds] = useState(new Set());
  const [displayLimit, setDisplayLimit] = useState(10);

  const allSongs = Object.values(downloadedSongs).filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (song.artistName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleSongs = allSongs.slice(0, displayLimit);
  const hasMore = allSongs.length > displayLimit;

  const toggleSong = async (songId) => {
    if (loadingIds.has(songId)) return;
    
    setLoadingIds(prev => new Set(prev).add(songId));
    const isAdded = currentSongIds.includes(songId);
    
    try {
      const endpoint = `${API_URL}/playlists/${playlistId}/songs${isAdded ? `/${songId}` : ''}`;
      const method = isAdded ? 'DELETE' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
        body: isAdded ? undefined : JSON.stringify({ songId })
      });

      if (response.ok) {
        onSongsUpdated?.();
      }
    } catch (error) {
      console.error('Failed to toggle song in playlist:', error);
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + 10);
  };

  return (
    <SonicSheet 
      visible={visible} 
      onClose={onClose} 
      title="Add Tracks"
      heightPercent={0.85}
    >
      <View className="flex-1">
        {/* Search Bar */}
        <View className="px-10 mb-8">
           <View style={{ backgroundColor: TOKENS.surfaceHigh }} className="flex-row items-center px-6 py-4 rounded-[24px]">
              <Search size={18} color={TOKENS.onSurfaceVariant} />
              <TextInput
                placeholder="Search your library..."
                placeholderTextColor={TOKENS.onSurfaceVariant + '40'}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setDisplayLimit(10); // Reset pagination on search
                }}
                style={{ color: TOKENS.onSurface, marginLeft: 12 }}
                className="flex-1 text-sm font-bold"
              />
           </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-10">
          <View className="pb-10">
            {visibleSongs.map(song => {
              const isAdded = currentSongIds.includes(song.id);
              const isLoading = loadingIds.has(song.id);
              
              return (
                <View 
                  key={song.id}
                  className="flex-row items-center mb-6"
                >
                  <View style={{ backgroundColor: TOKENS.surfaceLow }} className="w-12 h-12 rounded-xl overflow-hidden mr-4 shadow-sm">
                    {song.localCoverUri ? (
                      <Image source={{ uri: resolveLocalPath(song.localCoverUri) }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <View className="flex-1 items-center justify-center opacity-20">
                        <Disc size={20} color={TOKENS.primary} />
                      </View>
                    )}
                  </View>
                  <View className="flex-1 pr-4">
                    <Text 
                      style={{ color: isAdded ? TOKENS.primary : TOKENS.onSurface }} 
                      className="font-black text-base tracking-tight" 
                      numberOfLines={1}
                    >
                      {song.title}
                    </Text>
                    <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[11px] font-bold opacity-60 uppercase tracking-widest" numberOfLines={1}>
                      {song.artistName || 'Sonic Atelier'}
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    onPress={() => toggleSong(song.id)}
                    disabled={isLoading}
                    style={{ 
                      backgroundColor: isAdded ? TOKENS.primary + '15' : TOKENS.surfaceHigh,
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={TOKENS.primary} />
                    ) : isAdded ? (
                      <Minus size={18} color={TOKENS.primary} strokeWidth={3} />
                    ) : (
                      <Plus size={18} color={TOKENS.onSurfaceVariant} strokeWidth={3} />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}

            {hasMore && (
              <TouchableOpacity 
                onPress={handleLoadMore}
                style={{ backgroundColor: TOKENS.surfaceHigh }}
                className="py-4 rounded-[20px] items-center justify-center mt-4 mb-20"
              >
                <Text style={{ color: TOKENS.primary }} className="font-black uppercase text-[10px] tracking-widest">Load More Music</Text>
              </TouchableOpacity>
            )}

            {!hasMore && allSongs.length > 0 && (
              <View className="items-center py-10 opacity-20 mb-20">
                <Text style={{ color: TOKENS.onSurfaceVariant }} className="font-black uppercase text-[8px] tracking-[0.3em]">End of Library</Text>
              </View>
            )}

            {allSongs.length === 0 && (
              <View className="items-center py-20 opacity-20">
                <Text style={{ color: TOKENS.onSurfaceVariant }} className="font-black uppercase text-[10px] tracking-widest text-center">No songs found in your library</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SonicSheet>
  );
}
