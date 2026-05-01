import React, { useRef, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Dimensions, Alert, Animated, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Music, Clock, Play, ChevronRight, TrendingUp, Share2, Sparkles, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import SonicSheet from './SonicSheet';

const TOKENS = {
  surface: '#0d0f0d',
  surfaceLow: '#111412',
  surfaceHigh: '#1c211d',
  primary: '#b9cbba',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
  tertiary: '#fff8f2',
};

export default function WrapSheet({ visible, onClose, downloadedSongs, resolveLocalPath }) {
  const [range, setRange] = useState('Weekly'); // 'Daily' | 'Weekly' | 'Monthly'

  const stats = useMemo(() => {
    const songs = Object.values(downloadedSongs);
    if (songs.length === 0) {
      return null;
    }

    // In a real app, we would filter based on playHistory timestamps
    // For now, we'll use the aggregate 'plays' but label it by range
    const sorted = [...songs].sort((a, b) => (b.plays || 0) - (a.plays || 0));
    const topTracks = sorted.slice(0, 10);
    const totalPlays = songs.reduce((acc, s) => acc + (s.plays || 0), 0);
    const totalMinutes = Math.floor(songs.reduce((acc, s) => acc + (s.plays || 0) * (s.duration || s.durationSec || 180), 0) / 60);

    // Top 5 Artists
    const artistMap = {};
    songs.forEach(s => {
      const name = s.artistName || 'Unknown Artist';
      artistMap[name] = (artistMap[name] || 0) + (s.plays || 0);
    });
    const topArtists = Object.entries(artistMap)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, plays]) => ({ name, plays }));

    return { topTracks, topArtists, totalPlays, totalMinutes };
  }, [downloadedSongs, range]);

  const [showShareCard, setShowShareCard] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const viewShotRef = useRef();

  // Animation values for the Share Card
  const shareFadeAnim = useRef(new Animated.Value(0)).current;
  const shareScaleAnim = useRef(new Animated.Value(0.9)).current;

  const openShareCard = () => {
    setShowShareCard(true);
    Animated.parallel([
      Animated.timing(shareFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(shareScaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  };

  const closeShareCard = () => {
    Animated.parallel([
      Animated.timing(shareFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(shareScaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowShareCard(false);
    });
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const uri = await captureRef(viewShotRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your Musicly Wrap',
          UTI: 'public.png',
        });
      } else {
        Alert.alert('Sharing Unavailable', 'Sharing is not supported on this device.');
      }
    } catch (err) {
      console.error('[Sharing] Error capturing or sharing:', err);
      Alert.alert('Sharing Failed', 'Could not generate the sharing image.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const uri = await captureRef(viewShotRef, { format: 'png', quality: 1 });
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert('Saved! 🎉', 'Your Musicly Wrap has been saved to your Photos.');
          return;
        }
      } catch (_) {}
      // Fallback: open share sheet so user can save manually
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Save your Musicly Wrap',
        UTI: 'public.png',
      });
    } catch (err) {
      console.error('[Download] Error saving image:', err);
      Alert.alert('Download Failed', 'Could not save the image.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <SonicSheet 
      visible={visible} 
      onClose={onClose} 
      title="Musicly Wrap"
      heightPercent={0.95}
      glossy
      overlay={
        showShareCard && (
          <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 9999, opacity: shareFadeAnim }}>
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={closeShareCard} 
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} 
            />
            
            <Animated.View style={{ width: '100%', maxHeight: '95%', transform: [{ scale: shareScaleAnim }] }}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 16 }}
                bounces={false}
              >
              {!stats ? (
                <View style={{ borderRadius: 40, overflow: 'hidden', backgroundColor: '#0d0f0d' }} className="p-10 items-center justify-center">
                  <Music size={48} color={TOKENS.primary} />
                  <Text style={{ color: TOKENS.onSurface }} className="text-center font-black mt-4">No stats available yet</Text>
                  <TouchableOpacity onPress={closeShareCard} className="mt-6 bg-white/10 px-6 py-2 rounded-full">
                    <Text style={{ color: TOKENS.onSurface }} className="font-bold">Close</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={{ borderRadius: 40, overflow: 'hidden', backgroundColor: '#0d0f0d', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.8, shadowRadius: 40, elevation: 25 }}>
                    <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
                      <LinearGradient
                        colors={['#1e3a24', '#0d0f0d', '#14261a']}
                        style={{ padding: 24, paddingTop: 32, paddingBottom: 8, borderRadius: 40, overflow: 'hidden' }}
                      >
                        <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Branding — top of card */}
                        <View className="flex-row items-center mb-6">
                          <Image source={require('../assets/images/icon.png')} style={{ width: 28, height: 28, borderRadius: 8, marginRight: 10 }} />
                          <View>
                            <Text style={{ color: TOKENS.onSurface, letterSpacing: -0.5 }} className="text-base font-black italic">Musicly</Text>
                            <Text style={{ color: TOKENS.primary, letterSpacing: 1 }} className="text-[8px] font-black uppercase opacity-80">My {range} Wrap</Text>
                          </View>
                        </View>

                        {/* Artwork */}
                        <View className="items-center mb-6">
                           <View style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 10 }}>
                              <Image 
                                source={{ uri: resolveLocalPath(stats?.topTracks[0]?.localCoverUri) }} 
                                style={{ width: 120, height: 120, borderRadius: 24 }}
                              />
                           </View>
                        </View>

                      {/* Glassy Stats Container */}
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }} className="p-6 rounded-[32px] mb-4">
                         <Text style={{ color: TOKENS.primary, letterSpacing: 2 }} className="text-[8px] font-black uppercase mb-4 opacity-80">Top 5 Artists</Text>
                         {stats?.topArtists.map((artist, i) => (
                          <View key={i} className="flex-row items-center mb-2">
                             <Text style={{ color: TOKENS.primary }} className="text-[10px] font-black mr-3 opacity-40">{i+1}</Text>
                             <Text style={{ color: TOKENS.onSurface }} className="text-base font-black tracking-tight flex-1" numberOfLines={1}>{artist.name}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }} className="p-6 rounded-[32px] mb-4">
                         <Text style={{ color: TOKENS.primary, letterSpacing: 2 }} className="text-[8px] font-black uppercase mb-4 opacity-80">Top 5 Tracks</Text>
                         {stats?.topTracks.slice(0, 5).map((song, i) => (
                          <View key={i} className="flex-row items-center mb-2">
                             <Text style={{ color: TOKENS.primary }} className="text-[10px] font-black mr-3 opacity-40">{i+1}</Text>
                             <Text style={{ color: TOKENS.tertiary }} className="text-sm font-bold tracking-tight flex-1" numberOfLines={1}>{song.title}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Big Metric */}
                      <View className="items-center py-4">
                         <Text style={{ color: TOKENS.primary, letterSpacing: 4 }} className="text-[9px] font-black uppercase mb-1 opacity-60">Time Listened</Text>
                         <View className="flex-row items-baseline">
                            <Text style={{ color: TOKENS.onSurface, letterSpacing: -3, fontSize: 80, lineHeight: 80 }} className="font-black italic">{stats?.totalMinutes}</Text>
                            <Text style={{ color: TOKENS.primary }} className="text-sm font-black ml-2 uppercase tracking-widest">MIN</Text>
                         </View>
                      </View>
                    </ScrollView>
                  </LinearGradient>
                </ViewShot>
              </View>

              <View className="flex-row items-center justify-center mt-4">
                 <TouchableOpacity 
                    onPress={handleShare}
                    disabled={isSharing}
                    style={{ backgroundColor: TOKENS.primary, flex: 1, shadowColor: TOKENS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10 }}
                    className="py-4 rounded-full flex-row items-center justify-center"
                 >
                   {isSharing ? (
                      <ActivityIndicator size="small" color={TOKENS.surface} />
                   ) : (
                      <>
                         <Share2 size={15} color={TOKENS.surface} strokeWidth={2.5} style={{ marginRight: 8 }} />
                         <Text style={{ color: TOKENS.surface }} className="font-black uppercase text-[10px] tracking-widest">Share</Text>
                      </>
                   )}
                 </TouchableOpacity>
              </View>
            </>
          )}
              </ScrollView>
            </Animated.View>
          </Animated.View>
        )
      }
    >
      <View className="flex-1 px-8 pt-4">
        {/* Header Actions */}
        <View className="flex-row items-center justify-between mb-8">
          <TouchableOpacity 
            onPress={openShareCard}
            style={{ backgroundColor: TOKENS.primary + '20' }}
            className="w-10 h-10 rounded-full items-center justify-center"
          >
            <Sparkles size={18} color={TOKENS.primary} />
          </TouchableOpacity>

          <View className="flex-row bg-white/5 rounded-full p-1">
            {['Daily', 'Weekly', 'Monthly'].map(r => (
              <TouchableOpacity 
                key={r}
                onPress={() => setRange(r)}
                style={{ backgroundColor: range === r ? TOKENS.primary : 'transparent' }}
                className="px-4 py-1.5 rounded-full"
              >
                <Text style={{ color: range === r ? TOKENS.surface : TOKENS.onSurfaceVariant }} className="text-[9px] font-black uppercase tracking-widest">{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
          {/* Stats Overview */}
          <View className="flex-row justify-between mb-10">
            <View style={{ backgroundColor: TOKENS.surfaceHigh }} className="flex-1 p-6 rounded-[32px] mr-4 items-center">
              <Clock size={20} color={TOKENS.primary} style={{ marginBottom: 8 }} />
              <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Listened</Text>
              <Text style={{ color: TOKENS.onSurface }} className="text-2xl font-black italic">{stats?.totalMinutes || 0} <Text className="text-[10px] not-italic opacity-60">MIN</Text></Text>
            </View>
            <View style={{ backgroundColor: TOKENS.surfaceHigh }} className="flex-1 p-6 rounded-[32px] items-center">
              <TrendingUp size={20} color={TOKENS.primary} style={{ marginBottom: 8 }} />
              <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Total Plays</Text>
              <Text style={{ color: TOKENS.onSurface }} className="text-2xl font-black">{stats?.totalPlays || 0}</Text>
            </View>
          </View>

          <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[10px] font-black uppercase tracking-[0.25rem] mb-6 opacity-60">Top Tracks</Text>
          
          {stats?.topTracks.map((song, index) => (
            <View 
              key={song.id}
              style={{ backgroundColor: TOKENS.surfaceLow }}
              className="flex-row items-center p-4 rounded-[28px] mb-4"
            >
              <Text style={{ color: TOKENS.primary }} className="font-black text-xs w-8 opacity-40">{index + 1}</Text>
              <View className="w-12 h-12 rounded-xl bg-black mr-4 overflow-hidden">
                <Image 
                  source={{ uri: resolveLocalPath(song.localCoverUri) }} 
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
              <View className="flex-1">
                <Text style={{ color: TOKENS.onSurface }} className="font-black text-sm tracking-tight" numberOfLines={1}>{song.title}</Text>
                <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[10px] font-bold opacity-60" numberOfLines={1}>{song.artistName || 'Sonic Atelier'}</Text>
              </View>
              <View className="items-end">
                <Text style={{ color: TOKENS.primary }} className="text-[10px] font-black uppercase tracking-widest">{song.plays || 0} Plays</Text>
              </View>
            </View>
          ))}

          {stats?.topTracks.length === 0 && (
            <View className="items-center py-20 opacity-40">
              <Music size={48} color={TOKENS.onSurfaceVariant} />
              <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[10px] font-black uppercase tracking-widest mt-4">No playback data yet</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SonicSheet>
  );
}
