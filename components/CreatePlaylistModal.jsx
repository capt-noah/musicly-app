import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { useAuth } from '../context/AuthContext';
import SonicSheet from './SonicSheet';

const TOKENS = {
  surface: '#0d0f0d',
  primary: '#b9cbba',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
};

export default function CreatePlaylistModal({ visible, onClose, onCreated }) {
  const { API_URL, sessionId } = useAuth();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || loading) return;
    setLoading(true);
    const endpoint = `${API_URL}/playlists`;
    
    console.log('Attempting to create playlist at:', endpoint);
    console.log('Session ID exists:', !!sessionId);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
        body: JSON.stringify({ title })
      });

      if (response.ok) {
        onCreated?.();
        handleClose();
      } else {
        const errData = await response.json();
        console.error('Playlist creation failed with status:', response.status, errData);
      }
    } catch (error) {
      console.error('Playlist creation failed. Full error:', error);
      console.log('Error message:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    onClose();
  };

  return (
    <SonicSheet 
      visible={visible} 
      onClose={handleClose} 
      title="New Playlist"
      heightPercent={0.7}
    >
      <View className="flex-1 px-10 justify-start items-center mt-10 pt-40">
        <TextInput
          placeholder="Name your playlist"
          placeholderTextColor={TOKENS.onSurfaceVariant + '40'}
          value={title}
          autoFocus
          onChangeText={setTitle}
          textAlign="center"
          style={{ color: TOKENS.onSurface }}
          className="text-4xl font-black mb-12 w-full"
        />

        <TouchableOpacity 
          onPress={handleCreate}
          disabled={!title.trim() || loading}
          style={{ 
            backgroundColor: TOKENS.primary,
            opacity: !title.trim() || loading ? 0.4 : 1,
            paddingHorizontal: 60,
            height: 64,
          }}
          className="rounded-full items-center justify-center flex-row shadow-2xl"
        >
            <Text style={{ color: TOKENS.surface }} className="font-black uppercase tracking-widest text-xs">Create Playlist</Text>
         </TouchableOpacity>
      </View>
    </SonicSheet>
  );
}
