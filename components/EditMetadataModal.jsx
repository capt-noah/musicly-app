import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Image, ActivityIndicator, Alert } from 'react-native';
import { X, Camera, Save, Music, Mic2, Disc } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';

export default function EditMetadataModal({ visible, onClose, song, onUpdate }) {
  const { BASE_URL, sessionId } = useAuth();
  const [title, setTitle] = useState(song?.title || '');
  const [artist, setArtist] = useState(song?.artistName || '');
  const [album, setAlbum] = useState(song?.albumTitle || '');
  const [loading, setLoading] = useState(false);
  const [newCover, setNewCover] = useState(null);

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

      Alert.alert('Success', 'Metadata updated successfully! Regrouping library...');
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
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-[#111412] rounded-t-[40px] px-8 pt-6 pb-12 border-t border-white/10">
          <View className="flex-row justify-between items-center mb-8">
            <Text className="text-[#e1e7df] text-2xl font-black tracking-tighter">Edit Metadata</Text>
            <TouchableOpacity onPress={onClose} className="bg-white/5 p-2 rounded-full">
              <X size={20} color="#a6ada6" />
            </TouchableOpacity>
          </View>

          {/* Cover Art Picker */}
          <View className="items-center mb-10">
            <TouchableOpacity onPress={handlePickImage} className="relative">
              <Image 
                source={{ uri: newCover?.uri || song?.localCoverUri }} 
                className="w-40 h-40 rounded-[32px] border border-white/10"
              />
              <View className="absolute bottom-[-10] right-[-10] bg-[#b9cbba] p-3 rounded-2xl shadow-xl">
                <Camera size={20} color="#344437" />
              </View>
            </TouchableOpacity>
            <Text className="text-[#a6ada6] text-[10px] uppercase font-bold tracking-widest mt-6">Change Album Cover</Text>
          </View>

          {/* Inputs */}
          <View className="space-y-6">
            <View>
              <View className="flex-row items-center mb-2 px-1">
                <Music size={12} color="#b9cbba" className="mr-2" />
                <Text className="text-[#a6ada6] text-[10px] uppercase font-bold tracking-widest">Song Title</Text>
              </View>
              <TextInput 
                value={title}
                onChangeText={setTitle}
                className="bg-white/5 text-[#e1e7df] px-5 py-4 rounded-2xl font-bold text-base border border-white/5"
                placeholder="Enter title..."
                placeholderTextColor="#434944"
              />
            </View>

            <View>
              <View className="flex-row items-center mb-2 px-1">
                <Mic2 size={12} color="#b9cbba" className="mr-2" />
                <Text className="text-[#a6ada6] text-[10px] uppercase font-bold tracking-widest">Artist Name</Text>
              </View>
              <TextInput 
                value={artist}
                onChangeText={setArtist}
                className="bg-white/5 text-[#e1e7df] px-5 py-4 rounded-2xl font-bold text-base border border-white/5"
                placeholder="Enter artist..."
                placeholderTextColor="#434944"
              />
            </View>

            <View>
              <View className="flex-row items-center mb-2 px-1">
                <Disc size={12} color="#b9cbba" className="mr-2" />
                <Text className="text-[#a6ada6] text-[10px] uppercase font-bold tracking-widest">Album Title</Text>
              </View>
              <TextInput 
                value={album}
                onChangeText={setAlbum}
                className="bg-white/5 text-[#e1e7df] px-5 py-4 rounded-2xl font-bold text-base border border-white/5"
                placeholder="Enter album..."
                placeholderTextColor="#434944"
              />
            </View>
          </View>

          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading}
            className="bg-[#b9cbba] mt-10 py-5 rounded-[24px] flex-row items-center justify-center shadow-2xl shadow-[#b9cbba]/20"
          >
            {loading ? (
              <ActivityIndicator color="#344437" />
            ) : (
              <>
                <Save size={20} color="#344437" className="mr-3" />
                <Text className="text-[#344437] font-black text-base uppercase tracking-widest">Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
