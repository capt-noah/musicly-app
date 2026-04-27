import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Mic2, Disc, Music, Grid, Play, AudioLines, RefreshCw, PlusCircle, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSync } from '../../context/SyncContext';
import { usePlayer } from '../../context/PlayerContext';
import EditMetadataModal from '../../components/EditMetadataModal';
import CreatePlaylistModal from '../../components/CreatePlaylistModal';
import { PinchGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

// Sonic Atelier Design Tokens
const TOKENS = {
  surface: '#0d0f0d',
  surfaceLow: '#111412',
  surfaceHigh: '#1c211d',
  surfaceHighest: '#212722',
  primary: '#b9cbba',
  primaryContainer: '#2c352d',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
  tertiary: '#fff8f2',
};

export default function Library() {
  const { 
    downloadedSongs, syncMusic, playlists, likedSongs, syncing, progress, 
    resolveLocalPath, syncPlaylists, failedSongs, deleteFailedSong, retryFailedSync 
  } = useSync();
  const { playTrack, currentTrack, isPlaying, addToQueue } = usePlayer();
  const [filter, setFilter] = useState('songs'); // 'playlists' | 'artists' | 'albums' | 'songs'
  const [selectedSong, setSelectedSong] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [albumZoomLevel, setAlbumZoomLevel] = useState(2); // 2 = Grid, 1 = List
  const router = useRouter();

  const songsArray = useMemo(() => Object.values(downloadedSongs), [downloadedSongs]);
  const failedArray = useMemo(() => Object.values(failedSongs), [failedSongs]);

  const handleEditSong = (song) => {
    setSelectedSong(song);
    setEditModalVisible(true);
  };

  const artists = useMemo(() => {
    const artistMap = {};
    songsArray.forEach(song => {
      const name = song.artistName || 'Unknown Artist';
      if (!artistMap[name]) {
        artistMap[name] = { name, count: 0, cover: song.localCoverUri };
      }
      artistMap[name].count++;
    });
    return Object.values(artistMap);
  }, [songsArray]);

  const albums = useMemo(() => {
    const albumMap = {};
    songsArray.forEach(song => {
      // Create a stable key based on title and artist, normalized to handle casing inconsistencies
      const albumTitle = song.albumTitle || 'Unknown Album';
      const artistName = song.artistName || 'Unknown Artist';
      const groupingKey = `${albumTitle.toLowerCase().trim()}_${artistName.toLowerCase().trim()}`;
      
      if (!albumMap[groupingKey]) {
        albumMap[groupingKey] = { 
          id: song.albumId || groupingKey,
          title: albumTitle, 
          artist: artistName, 
          cover: song.localCoverUri, 
          count: 0 
        };
      }
      albumMap[groupingKey].count++;
    });
    return Object.values(albumMap);
  }, [songsArray]);

  const renderFilterButton = (id, label) => (
    <TouchableOpacity 
      onPress={() => setFilter(id)}
      style={{ 
        backgroundColor: filter === id ? TOKENS.primary : TOKENS.surfaceHigh,
      }}
      className="px-6 py-2.5 rounded-full mr-3"
    >
      <Text 
        style={{ color: filter === id ? TOKENS.surface : TOKENS.onSurfaceVariant }}
        className="font-black text-[10px] uppercase tracking-widest"
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const onPinchEvent = (event) => {
    if (event.nativeEvent.state === State.END) {
      if (event.nativeEvent.scale > 1.2 && albumZoomLevel === 2) {
        // Zooming IN sets it to max detail mode (List view)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setAlbumZoomLevel(1);
      } else if (event.nativeEvent.scale < 0.8 && albumZoomLevel === 1) {
        // Zooming OUT sets it to normal mode (Grid view)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setAlbumZoomLevel(2);
      }
    }
  };

  const handlePlayLiked = () => {
    if (likedSongs.length > 0) {
      playTrack(likedSongs[0], likedSongs);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: TOKENS.surface }}>
      <View className="flex-1 px-8">
        <View className="py-6 mb-2 flex-row justify-between items-center">
            <Text style={{ color: TOKENS.tertiary, letterSpacing: -1.5 }} className="text-4xl font-black">Library</Text>
            <View className="flex-row items-center">
              {syncing && (
                <View style={{ backgroundColor: TOKENS.primary + '15' }} className="px-4 py-2 rounded-full flex-row items-center mr-3">
                  <ActivityIndicator size="small" color={TOKENS.primary} style={{ marginRight: 8 }} />
                  <Text style={{ color: TOKENS.primary }} className="text-[10px] font-black uppercase tracking-widest">
                    {progress.current}/{progress.total}
                  </Text>
                </View>
              )}
              <TouchableOpacity onPress={() => syncMusic()} style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-10 h-10 rounded-full items-center justify-center">
                 <RefreshCw size={18} color={TOKENS.primary} />
              </TouchableOpacity>
            </View>
        </View>

        <View className="mb-10">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {renderFilterButton('songs', 'Songs')}
            {renderFilterButton('albums', 'Albums')}
            {renderFilterButton('artists', 'Artists')}
            {renderFilterButton('playlists', 'Playlists')}
          </ScrollView>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 180 }}>
          {filter === 'songs' && (
            <View>
              <TouchableOpacity 
                onPress={() => router.push('/favorites')}
                style={{ 
                  backgroundColor: TOKENS.surfaceLow,
                  borderWidth: 1,
                  borderColor: TOKENS.primary + '30'
                }}
                className="py-4 px-5 rounded-[40px] flex-row items-center mb-8"
              >
                <View style={{ backgroundColor: TOKENS.primaryContainer }} className="w-12 h-12 rounded-2xl items-center justify-center mr-4">
                  <Heart size={20} color={TOKENS.primary} fill={TOKENS.primary} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: TOKENS.onSurface }} className="font-black text-xl tracking-tight">Liked Songs</Text>
                  <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[11px] mt-1 font-bold uppercase tracking-widest opacity-60">
                    {likedSongs.length} {likedSongs.length === 1 ? 'track' : 'tracks'}
                  </Text>
                </View>
                <TouchableOpacity 
                   onPress={handlePlayLiked}
                   style={{ backgroundColor: TOKENS.surfaceHigh }} 
                   className="w-12 h-12 rounded-full items-center justify-center"
                >
                  <Play size={20} color={TOKENS.primary} fill={TOKENS.primary} />
                </TouchableOpacity>
              </TouchableOpacity>

              {/* FAILED SYNC SECTION */}
              {failedArray.length > 0 && (
                <View className="mb-10">
                  <View className="flex-row items-center mb-4">
                    <Text style={{ color: '#ff4b4b' }} className="text-xl font-black mr-2">Failed Syncs</Text>
                    <View style={{ backgroundColor: '#ff4b4b20' }} className="px-2 py-0.5 rounded-md">
                      <Text style={{ color: '#ff4b4b' }} className="text-[10px] font-black">{failedArray.length}</Text>
                    </View>
                  </View>
                  <View className="space-y-3">
                    {failedArray.map(song => (
                      <View 
                        key={song.id} 
                        style={{ backgroundColor: TOKENS.surfaceLow, borderColor: '#ff4b4b20', borderLeftWidth: 3 }}
                        className="p-4 rounded-2xl flex-row items-center"
                      >
                        <View className="flex-1 mr-4">
                          <Text style={{ color: TOKENS.onSurface }} className="font-black text-sm" numberOfLines={1}>{song.title}</Text>
                          <Text style={{ color: '#ff4b4b', opacity: 0.8 }} className="text-[10px] font-bold uppercase tracking-widest mt-0.5">
                            {song.error || 'Download error'}
                          </Text>
                        </View>
                        <View className="flex-row">
                          <TouchableOpacity 
                            onPress={() => retryFailedSync(song.id)}
                            style={{ backgroundColor: TOKENS.primary + '20' }}
                            className="w-9 h-9 rounded-full items-center justify-center mr-2"
                          >
                            <RefreshCw size={14} color={TOKENS.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => deleteFailedSong(song.id)}
                            style={{ backgroundColor: '#ff4b4b20' }}
                            className="w-9 h-9 rounded-full items-center justify-center"
                          >
                            <PlusCircle size={14} color="#ff4b4b" style={{ transform: [{ rotate: '45deg' }] }} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View className="flex-row justify-between items-baseline mb-3">
                 <Text style={{ color: TOKENS.tertiary, letterSpacing: -0.5 }} className="text-2xl font-black">All Tracks</Text>
              </View>

               {songsArray.length === 0 ? (
                <View className="items-center py-20 opacity-40">
                  <View style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-20 h-20 rounded-full items-center justify-center mb-6">
                    <Music size={40} color={TOKENS.primary} strokeWidth={1} />
                  </View>
                  <Text style={{ color: TOKENS.onSurfaceVariant, letterSpacing: 4 }} className="font-black uppercase text-[10px]">No tracks found</Text>
               </View>
              ) : (
                <View className="space-y-3">
                  {songsArray.map(song => (
                    <TouchableOpacity 
                      key={song.id} 
                      onPress={() => playTrack(song, songsArray)}
                      onLongPress={() => handleEditSong(song)}
                      style={{ 
                        backgroundColor: currentTrack?.id === song.id ? TOKENS.surfaceHighest : TOKENS.surfaceHigh,
                        marginBottom: 10,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                      }}
                      className="flex-row items-center py-3 px-5 rounded-[40px]"
                    >
                       <View className="relative bg-black rounded-xl mr-4 overflow-hidden">
                          <Image source={{ uri: resolveLocalPath(song.localCoverUri) }} style={{ width: 44, height: 44 }} contentFit="cover" transition={200} />
                          {currentTrack?.id === song.id && (
                            <View className="absolute inset-0 bg-black/40 items-center justify-center">
                              {isPlaying ? (
                                 <AudioLines size={24} color={TOKENS.primary} />
                              ) : (
                                 <Play size={24} color={TOKENS.primary} fill={TOKENS.primary} />
                              )}
                            </View>
                          )}
                       </View>
                       <View className="flex-1">
                          <Text 
                            style={{ color: currentTrack?.id === song.id ? TOKENS.primary : TOKENS.onSurface }}
                            className="font-black text-base tracking-tight" 
                            numberOfLines={1}
                          >
                            {song.title}
                          </Text>
                          <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-xs font-semibold opacity-60" numberOfLines={1}>
                            {song.artistName || 'Sonic Atelier'}
                          </Text>
                       </View>
                       <TouchableOpacity 
                          onPress={() => addToQueue(song)}
                          style={{ backgroundColor: TOKENS.surfaceHigh }}
                          className="w-10 h-10 items-center justify-center rounded-full"
                        >
                          <Music size={16} color={TOKENS.primary} />
                        </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {filter === 'artists' && (
            <View className="flex-row flex-wrap justify-between">
              {artists.length === 0 ? (
                <View className="w-full items-center py-20 opacity-40">
                   <Users size={48} color={TOKENS.onSurfaceVariant} strokeWidth={1} />
                   <Text style={{ color: TOKENS.onSurfaceVariant, letterSpacing: 4 }} className="font-black uppercase text-[10px] mt-6">No artists found</Text>
                </View>
              ) : (
                artists.map(artist => (
                  <TouchableOpacity key={artist.name} className="w-[45%] mb-10">
                    <View style={{ backgroundColor: TOKENS.surfaceLow }} className="w-full aspect-square rounded-full mb-4 overflow-hidden">
                      <Image source={{ uri: resolveLocalPath(artist.cover) }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                    </View>
                    <Text style={{ color: TOKENS.onSurface }} className="font-black text-base text-center tracking-tight" numberOfLines={1}>{artist.name}</Text>
                    <Text style={{ color: TOKENS.primary }} className="text-[10px] font-black uppercase text-center tracking-widest mt-0.5">{artist.count} Tracks</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {filter === 'albums' && (
            <PinchGestureHandler onHandlerStateChange={onPinchEvent}>
              <View>
                 {albums.length === 0 ? (
                   <View className="items-center py-20 opacity-40">
                      <Disc size={48} color={TOKENS.primary} strokeWidth={1} />
                      <Text style={{ color: TOKENS.primary, letterSpacing: 4 }} className="font-black uppercase text-[10px] mt-6">No albums found</Text>
                   </View>
                ) : (
                  albumZoomLevel === 2 ? (
                    <View className="flex-row flex-wrap justify-between">
                      {albums.map(album => (
                        <TouchableOpacity 
                          key={album.id} 
                          className="w-[45%] mb-10"
                          onPress={() => router.push({ pathname: '/playlist', params: { albumId: album.id, title: album.title, artist: album.artist, cover: album.cover }})}
                        >
                          <View style={{ backgroundColor: TOKENS.surfaceLow }} className="w-full aspect-square rounded-[36px] mb-4 overflow-hidden">
                            <Image source={{ uri: resolveLocalPath(album.cover) || `https://api.dicebear.com/7.x/shapes/png?seed=${album.id}&backgroundColor=1c211d` }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                          </View>
                          <Text style={{ color: TOKENS.onSurface }} className="font-black text-base tracking-tight" numberOfLines={1}>{album.title}</Text>
                          <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-xs font-semibold opacity-60" numberOfLines={1}>{album.artist}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View className="space-y-4 pt-2">
                      {albums.map(album => (
                        <TouchableOpacity 
                          key={album.id} 
                          style={{ backgroundColor: TOKENS.surfaceLow }}
                          className="flex-row items-center p-3 rounded-[32px] mb-4"
                          onPress={() => router.push({ pathname: '/playlist', params: { albumId: album.id, title: album.title, artist: album.artist, cover: album.cover }})}
                        >
                          <View style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-20 h-20 rounded-[24px] mr-5 overflow-hidden">
                            <Image source={{ uri: resolveLocalPath(album.cover) || `https://api.dicebear.com/7.x/shapes/png?seed=${album.id}&backgroundColor=1c211d` }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                          </View>
                          <View className="flex-1 justify-center">
                            <Text style={{ color: TOKENS.onSurface }} className="font-black text-lg tracking-tight mb-0.5" numberOfLines={1}>{album.title}</Text>
                            <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-xs font-semibold opacity-60 mb-2" numberOfLines={1}>{album.artist}</Text>
                            <View className="flex-row items-center">
                              <Disc size={12} color={TOKENS.primary} opacity={0.8} />
                              <Text style={{ color: TOKENS.primary }} className="text-[10px] font-black tracking-widest ml-1.5 uppercase opacity-80">{album.count} Tracks</Text>
                            </View>
                          </View>
                          <View style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-12 h-12 rounded-full items-center justify-center mr-2">
                            <Play size={18} color={TOKENS.primary} fill={TOKENS.primary} />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )
                )}
              </View>
            </PinchGestureHandler>
          )}

          {filter === 'playlists' && (
            <View>
              {playlists.length === 0 ? (
                <View className="items-center py-20">
                   <View style={{ backgroundColor: TOKENS.surfaceLow }} className="w-24 h-24 rounded-full items-center justify-center mb-8 opacity-40">
                      <Music size={32} color={TOKENS.primary} />
                   </View>
                   <Text style={{ color: TOKENS.onSurface }} className="text-xl font-black mb-2">No playlists yet</Text>
                   <Text style={{ color: TOKENS.primary }} className="text-sm font-semibold opacity-60 text-center px-10 mb-10">Start building your sonic atelier by creating your first playlist.</Text>
                   
                   <TouchableOpacity 
                     onPress={() => setCreateModalVisible(true)}
                     style={{ backgroundColor: TOKENS.primary }}
                     className="px-10 py-5 rounded-full flex-row items-center"
                   >
                      <PlusCircle size={20} color={TOKENS.surface} style={{ marginRight: 10 }} />
                      <Text style={{ color: TOKENS.surface }} className="font-black uppercase text-xs tracking-widest">Create Playlist</Text>
                   </TouchableOpacity>
                </View>
              ) : (
                <View>
                   <TouchableOpacity 
                      onPress={() => setCreateModalVisible(true)}
                      style={{ backgroundColor: TOKENS.surfaceLow, borderStyle: 'dashed', borderWidth: 1, borderColor: TOKENS.primary + '40' }}
                      className="p-5 rounded-[40px] flex-row items-center mb-10"
                    >
                      <View style={{ backgroundColor: TOKENS.primaryContainer }} className="w-12 h-12 rounded-2xl items-center justify-center mr-5">
                         <PlusCircle size={24} color={TOKENS.primary} />
                      </View>
                      <View className="flex-1">
                        <Text style={{ color: TOKENS.primary }} className="font-black text-lg tracking-tight">New Playlist</Text>
                        <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-xs font-semibold opacity-60 uppercase tracking-widest">Build from your library</Text>
                      </View>
                    </TouchableOpacity>

                   {playlists.map(playlist => (
                    <TouchableOpacity 
                      key={playlist.id} 
                      onPress={() => router.push({ pathname: '/playlist', params: { playlistId: playlist.id, title: playlist.title, ownerId: playlist.ownerId }})}
                      style={{ backgroundColor: TOKENS.surfaceHigh }}
                      className="flex-row items-center py-4 px-6 rounded-[40px] mb-4"
                    >
                      <View style={{ backgroundColor: TOKENS.surfaceLow }} className="w-14 h-14 rounded-2xl overflow-hidden mr-5 items-center justify-center">
                        {playlist.coverArt ? (
                          <Image source={{ uri: resolveLocalPath(playlist.coverArt) }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                        ) : (
                          <View className="opacity-40">
                            <Music size={24} color={TOKENS.primary} />
                          </View>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text style={{ color: TOKENS.onSurface }} className="font-black text-lg tracking-tight mb-0.5">{playlist.title}</Text>
                        <Text style={{ color: TOKENS.primary }} className="text-[9px] font-black tracking-widest opacity-60">
                           @{playlist.ownerUsername || 'curator'} • {playlist.songCount || 0} Tracks
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={{ backgroundColor: TOKENS.surfaceLow }}
                        className="w-12 h-12 items-center justify-center rounded-full"
                      >
                        <PlusCircle size={20} color={TOKENS.primary} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      <EditMetadataModal 
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        song={selectedSong}
        onUpdate={() => syncMusic()} 
      />

      <CreatePlaylistModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={() => syncPlaylists()}
      />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
