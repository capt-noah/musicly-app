import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Play, MoreVertical, Music, Plus, AudioLines, Disc, Shuffle } from 'lucide-react-native';
import { useSync } from '../context/SyncContext';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AddSongsToPlaylistModal from '../components/AddSongsToPlaylistModal';
import AlbumView from '../components/AlbumView';

const TOKENS = {
  surface: '#0d0f0d',
  surfaceLow: '#111412',
  surfaceHigh: '#1c211d',
  primary: '#b9cbba',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
  tertiary: '#fff8f2',
};

export default function PlaylistDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, sessionId, API_URL, BASE_URL } = useAuth();
  const { downloadedSongs, resolveLocalPath, localProfilePhoto } = useSync();
  const { playTrack, currentTrack, isPlaying, toggleShuffleMode, shuffleMode } = usePlayer();
  
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const isAlbumMode = !!params.albumId;

  const fetchPlaylistDetails = useCallback(async () => {
    if (isAlbumMode || !params.playlistId) return;
    console.log(`Fetching playlist from: ${API_URL}/playlists/${params.playlistId}`);
    
    try {
      const response = await fetch(`${API_URL}/playlists/${params.playlistId}`, {
        headers: { 'Authorization': `Bearer ${sessionId}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPlaylistInfo(data);
        // Map the songs from database to include local URIs from downloadedSongs
        const enrichedSongs = data.songs.map(s => {
          const local = downloadedSongs[s.id];
          return local ? { ...s, localCoverUri: local.localCoverUri } : s;
        });
        setPlaylistSongs(enrichedSongs);
      }
    } catch (error) {
      console.error('Failed to fetch playlist details:', error);
    } finally {
      setLoading(false);
    }
  }, [params.playlistId, sessionId, API_URL, downloadedSongs, isAlbumMode]);

  useEffect(() => {
    if (!isAlbumMode) {
      fetchPlaylistDetails();
    }
  }, [fetchPlaylistDetails, isAlbumMode]);

  // Handle Album Mode delegation
  const albumPlaylistData = useMemo(() => {
    if (!isAlbumMode) return null;
    const songs = Object.values(downloadedSongs).filter(song => song.albumId === params.albumId);
    return {
      title: params.title || "Unknown Album",
      description: params.artist || "Unknown Artist",
      imageUrl: params.cover || "https://api.dicebear.com/7.x/shapes/png?seed=album&backgroundColor=171b17",
      itemCount: songs.length,
      duration: "Album Collection",
      tracks: songs
    };
  }, [downloadedSongs, params.albumId, params.title, params.artist, params.cover, isAlbumMode]);

  if (isAlbumMode) {
    return (
      <AlbumView 
        playlist={albumPlaylistData}
        playTrack={playTrack}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        router={router}
        handleShufflePlay={handleShufflePlay}
      />
    );
  }

  if (loading && !isAlbumMode) {
    return (
      <View style={{ flex: 1, backgroundColor: TOKENS.surface, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={TOKENS.primary} />
      </View>
    );
  }

  const handlePlayAll = () => {
    if (playlistSongs.length > 0) {
      playTrack(playlistSongs[0], playlistSongs);
    }
  };

  const handleShufflePlay = () => {
    const tracksToPlay = isAlbumMode ? albumPlaylistData.tracks : playlistSongs;
    if (tracksToPlay && tracksToPlay.length > 0) {
      if (!shuffleMode) toggleShuffleMode();
      const randomIndex = Math.floor(Math.random() * tracksToPlay.length);
      playTrack(tracksToPlay[randomIndex], tracksToPlay);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: TOKENS.surface }}>
      <StatusBar barStyle="light-content" />
      
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
         <View className="px-8 py-4 flex-row justify-between items-center">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{ backgroundColor: TOKENS.surfaceHigh }}
              className="w-10 h-10 rounded-full items-center justify-center mr-4"
            >
              <ChevronLeft size={18} color={TOKENS.onSurface} strokeWidth={2.5} />
            </TouchableOpacity>
            
            <View className="flex-row items-center px-3 py-1.5 rounded-full" style={{ backgroundColor: TOKENS.surfaceHigh }}>
              <View style={{ backgroundColor: TOKENS.surfaceHighest }} className="w-6 h-6 rounded-full overflow-hidden mr-2 items-center justify-center border border-white/5">
                <Image 
                  source={{ uri: localProfilePhoto ? resolveLocalPath(localProfilePhoto) : (user?.profilePhoto?.startsWith('/') ? `${BASE_URL}${user.profilePhoto}` : (user?.profilePhoto || `https://ui-avatars.com/api/?name=${user?.firstName || 'User'}&background=1c211d&color=b9cbba`)) }} 
                  style={{ width: '100%', height: '100%' }} 
                  contentFit="cover"
                />
              </View>
              <Text style={{ color: TOKENS.primary }} className="text-[9px] font-black uppercase tracking-widest opacity-80">
                {playlistSongs.length} Tracks
              </Text>
            </View>
          </View>

          <TouchableOpacity 
             style={{ backgroundColor: TOKENS.surfaceHigh }}
             className="w-10 h-10 rounded-full items-center justify-center"
          >
            <MoreVertical size={18} color={TOKENS.onSurface} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Playlist Info */}
           <View className="px-8 pt-4 pb-2 items-center">
             <View 
               style={{ 
                 width: 160, 
                 height: 160, 
                 backgroundColor: TOKENS.surfaceHigh,
                 shadowColor: '#000',
                 shadowOffset: { width: 0, height: 10 },
                 shadowOpacity: 0.3,
                 shadowRadius: 15,
               }} 
               className="rounded-[36px] overflow-hidden mb-4 items-center justify-center"
             >
                {playlistSongs.length > 0 ? (
                  <Image 
                    source={{ uri: resolveLocalPath(playlistSongs[0].localCoverUri) }} 
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                   <Music size={40} color={TOKENS.primary} opacity={0.3} />
                )}
             </View>
             
             <Text style={{ color: TOKENS.tertiary, letterSpacing: -1 }} className="text-3xl font-black mb-4 text-center">{playlistInfo?.title}</Text>

             <View className="flex-row items-center justify-between w-full mt-2">
                <TouchableOpacity 
                  onPress={() => setAddModalVisible(true)}
                  style={{ backgroundColor: TOKENS.surfaceHigh, height: 40, paddingHorizontal: 16, borderRadius: 20 }}
                  className="flex-row items-center"
                >
                   <Plus size={14} color={TOKENS.primary} style={{ marginRight: 6 }} />
                   <Text style={{ color: TOKENS.primary }} className="font-black uppercase text-[9px] tracking-widest">Add</Text>
                </TouchableOpacity>

                 <View className="flex-row items-center gap-2">
                    <TouchableOpacity 
                      onPress={handlePlayAll}
                      style={{ 
                        backgroundColor: TOKENS.primary,
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                        <Play size={16} color={TOKENS.surface} fill={TOKENS.surface} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={handleShufflePlay}
                      style={{ 
                        backgroundColor: TOKENS.surfaceHigh,
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                        <Shuffle size={16} color={shuffleMode ? TOKENS.primary : TOKENS.onSurfaceVariant} />
                    </TouchableOpacity>
                </View>
             </View>
          </View>

          {/* Song List */}
          <View className="px-8 pt-4">
             {playlistSongs.length === 0 ? (
               <View className="items-center py-20 opacity-60">
                  <View style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-20 h-20 rounded-full items-center justify-center mb-6">
                    <Disc size={40} color={TOKENS.primary} strokeWidth={1} />
                  </View>
                  <Text style={{ color: TOKENS.onSurfaceVariant, letterSpacing: 4 }} className="font-black uppercase text-[10px] mb-8">Empty Playlist</Text>
                  
                  <TouchableOpacity 
                    onPress={() => setAddModalVisible(true)}
                    style={{ borderWidth: 2, borderColor: TOKENS.primary + '20' }}
                    className="px-8 py-4 rounded-full"
                  >
                    <Text style={{ color: TOKENS.primary }} className="font-black uppercase text-[10px] tracking-widest">Add your first song</Text>
                  </TouchableOpacity>
               </View>
             ) : (
               playlistSongs.map((track, index) => {
                 const isActive = currentTrack?.id === track.id;
                 return (
                   <TouchableOpacity 
                     key={track.id}
                     onPress={() => playTrack(track, playlistSongs)}
                     className="flex-row items-center mb-6"
                   >
                      <View className="w-8">
                         <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-xs font-black opacity-30">{index + 1}</Text>
                      </View>
                      <View style={{ backgroundColor: TOKENS.surfaceLow }} className="w-12 h-12 rounded-xl overflow-hidden mr-4">
                         <Image source={{ uri: resolveLocalPath(track.localCoverUri) }} style={{ width: '100%', height: '100%' }} />
                         {isActive && (
                            <View className="absolute inset-0 bg-black/40 items-center justify-center">
                               <AudioLines size={20} color={TOKENS.primary} />
                            </View>
                         )}
                      </View>
                      <View className="flex-1">
                         <Text 
                           style={{ color: isActive ? TOKENS.primary : TOKENS.onSurface }} 
                           className="font-black text-base tracking-tight"
                           numberOfLines={1}
                         >
                           {track.title}
                         </Text>
                         <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-xs font-semibold opacity-60" numberOfLines={1}>
                            {track.artistName || 'Sonic Atelier'}
                         </Text>
                      </View>
                   </TouchableOpacity>
                 );
               })
             )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <AddSongsToPlaylistModal 
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        playlistId={params.playlistId}
        currentSongIds={playlistSongs.map(s => s.id)}
        onSongsUpdated={fetchPlaylistDetails}
      />
    </View>
  );
}
