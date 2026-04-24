import React from 'react';
import { View, Text, Animated, ScrollView } from 'react-native';
import { CheckCircle, Clock } from 'lucide-react-native';
import { useSync } from '../context/SyncContext';
import SonicSheet from './SonicSheet';

export default function SyncSheet({ visible, onClose }) {
  const { syncQueue, fileProgresses } = useSync();

  return (
    <SonicSheet 
      visible={visible} 
      onClose={onClose} 
      title="Sync Progress"
      heightPercent={0.75}
    >
      <View className="px-10 flex-1">
        <Text style={{ color: '#fff8f2', fontSize: 13, fontWeight: '500', marginBottom: 24, opacity: 0.6 }}>
          {syncQueue.length} items syncing
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {syncQueue.map((song, index) => {
            const progress = fileProgresses[song.id] || 0;
            const isDone = progress === 1;
            const isPending = progress === 0 && Object.keys(fileProgresses).length <= index;
            
            return (
              <View key={song.id} style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View style={{ flex: 1, paddingRight: 16 }}>
                    <Text style={{ color: '#fff8f2', fontSize: 16, fontWeight: '800' }} numberOfLines={1}>{song.title}</Text>
                    <Text style={{ color: '#a6ada6', fontSize: 12, marginTop: 2, fontWeight: '500' }}>{song.artistName || 'Unknown Artist'}</Text>
                  </View>
                  <View>
                    {isDone ? (
                      <CheckCircle size={18} color="#4ade80" />
                    ) : isPending ? (
                      <Clock size={16} color="#434944" />
                    ) : (
                      <Text style={{ color: '#b9cbba', fontSize: 12, fontWeight: '900' }}>
                        {Math.round(progress * 100)}%
                      </Text>
                    )}
                  </View>
                </View>

                {/* Progress Bar Container */}
                <View style={{ height: 6, backgroundColor: '#1c211d', borderRadius: 3, overflow: 'hidden' }}>
                  <Animated.View 
                    style={{
                      height: '100%',
                      width: `${progress * 100}%`,
                      backgroundColor: isDone ? '#4ade80' : '#b9cbba',
                      borderRadius: 3
                    }}
                  />
                </View>
              </View>
            );
          })}
          {syncQueue.length === 0 && (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, opacity: 0.5 }}>
              <CheckCircle size={40} color="#4ade80" style={{ marginBottom: 16 }} />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Everything is up to date.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SonicSheet>
  );
}
