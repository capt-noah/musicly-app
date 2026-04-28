import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { X, Camera, Save, Music, Mic2, Disc, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import SonicSheet from './SonicSheet';

export default function EditMetadataModal({ visible, onClose, song, onUpdate }) {
  const { BASE_URL, sessionId } = useAuth();
  const { resolveLocalPath, updateSongMetadataLocally } = useSync();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [loading, setLoading] = useState(false);
  const [newCover, setNewCover] = useState(null);

  useEffect(() => {
    if (song) {
      setTitle(song.title || '');
      setArtist(song.artistName || '');
      setAlbum(song.albumTitle || '');
      setNewCover(null);
    }
  }, [song, visible]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setNewCover(result.assets[0]);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Update Text Metadata
      const metaResponse = await fetch(`${BASE_URL}/songs/${song.id}/metadata`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}` 
        },
        body: JSON.stringify({ title, artistName: artist, albumTitle: album })
      });

      if (!metaResponse.ok) throw new Error('Failed to update metadata');
      const updatedData = await metaResponse.json();

      // 2. Update Album Cover if changed
      if (newCover && song.albumId) {
        const coverResponse = await fetch(`${BASE_URL}/songs/albums/${song.albumId}/cover`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionId}` 
          },
          body: JSON.stringify({ coverArt: `data:image/jpeg;base64,${newCover.base64}` })
        });
        if (!coverResponse.ok) throw new Error('Failed to update album cover');
      }

      Alert.alert('Success', 'Metadata updated successfully!');
      updateSongMetadataLocally(song.id, { 
        title: updatedData.title, 
        artistName: updatedData.artistName, 
        albumTitle: updatedData.albumTitle,
        albumId: updatedData.albumId
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SonicSheet 
      visible={visible} 
      onClose={onClose} 
      title="Edit Song"
      heightPercent={0.88}
    >
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 40, paddingTop: 24, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Art Picker */}
        <View className="items-center mb-12">
          <TouchableOpacity 
            onPress={handlePickImage} 
            activeOpacity={0.8}
            className="relative"
            style={{
              shadowColor: '#b9cbba',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
            }}
          >
            <Image 
              source={{ uri: newCover?.uri || resolveLocalPath(song?.localCoverUri) }} 
              style={{ width: 160, height: 160, marginBottom: 12, borderRadius: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
            />
          </TouchableOpacity>
          <Text style={{ color: '#a6ada6', letterSpacing: 2.5 }} className="text-[9px] uppercase font-black mt-8 opacity-40">
            Tap to change artwork
          </Text>
        </View>

        {/* Form Fields */}
        <View className="flex flex-col gap-6 mb-6">
          <View>
            <View className="flex-row gap-2 items-center mb-2 px-1">
              <Music size={12} color="#b9cbba" className=" opacity-60" />
              <Text style={{ color: '#a6ada6', letterSpacing: 1.5 }} className="text-[10px] uppercase font-black opacity-60">Title</Text>
            </View>
            <TextInput 
              value={title}
              onChangeText={setTitle}
              placeholder="Song Title"
              placeholderTextColor="rgba(255,255,255,0.15)"
              selectionColor="#b9cbba"
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.03)', 
                color: '#ffffff',
                fontSize: 17,
                letterSpacing: -0.5
              }}
              className="px-6 py-5 rounded-3xl font-black border border-white/5"
            />
          </View>

          <View>
            <View className="flex-row gap-2 items-center mb-2 px-1">
              <Mic2 size={12} color="#b9cbba" className="mr-2.5 opacity-60" />
              <Text style={{ color: '#a6ada6', letterSpacing: 1.5 }} className="text-[10px] uppercase font-black opacity-60">Artist</Text>
            </View>
            <TextInput 
              value={artist}
              onChangeText={setArtist}
              placeholder="Artist Name"
              placeholderTextColor="rgba(255,255,255,0.15)"
              selectionColor="#b9cbba"
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.03)', 
                color: '#ffffff',
                fontSize: 17,
                letterSpacing: -0.5
              }}
              className="px-6 py-5 rounded-3xl font-black border border-white/5"
            />
          </View>

          <View>
            <View className="flex-row gap-2 items-center mb-2 px-1">
              <Disc size={12} color="#b9cbba" className="mr-2.5 opacity-60" />
              <Text style={{ color: '#a6ada6', letterSpacing: 1.5 }} className="text-[10px] uppercase font-black opacity-60">Album</Text>
            </View>
            <TextInput 
              value={album}
              onChangeText={setAlbum}
              placeholder="Album Title"
              placeholderTextColor="rgba(255,255,255,0.15)"
              selectionColor="#b9cbba"
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.03)', 
                color: '#ffffff',
                fontSize: 17,
                letterSpacing: -0.5
              }}
              className="px-6 py-5 rounded-3xl font-black border border-white/5"
            />
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.7}
          style={{ 
            backgroundColor: '#b9cbba',
            shadowColor: '#b9cbba',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 15,
          }}
          className=" py-6 rounded-[32px] flex-row items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator color="#0d0f0d" />
          ) : (
            <View className="flex-row items-center">
              <Text style={{ color: '#0d0f0d', letterSpacing: 2 }} className="font-black text-sm uppercase">Save Changes</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SonicSheet>
  );
}
