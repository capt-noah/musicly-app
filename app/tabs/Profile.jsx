import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Settings as SettingsIcon, Send, ChevronRight, Bell, Speaker, Database, LogOut } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import ConnectTelegramModal from '../../components/ConnectTelegramModal';

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

export default function Profile() {
  const { user, logout } = useAuth();
  const { syncing, syncMusic } = useSync();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
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
           <Text style={{ color: TOKENS.tertiary, letterSpacing: -1.5 }} className="text-4xl font-black">Profile</Text>
           <TouchableOpacity 
             onPress={() => router.push('/settings')} 
             style={{ backgroundColor: TOKENS.surfaceHigh }}
             className="w-11 h-11 rounded-full items-center justify-center"
           >
              <SettingsIcon size={18} color={TOKENS.primary} strokeWidth={2} />
           </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 180 }}
        className="flex-1 px-8"
        refreshControl={<RefreshControl refreshing={isRefreshing || syncing} onRefresh={handleRefresh} tintColor={TOKENS.primary} />}
      >

        <View className="items-center mb-12 pt-4">
           <View style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-32 h-32 rounded-full overflow-hidden mb-6 shadow-2xl">
              <Image 
                source={{ uri: user?.profilePhoto || `https://ui-avatars.com/api/?name=${user?.firstName || 'User'}&background=1c211d&color=b9cbba` }} 
                className="w-full h-full" 
              />
           </View>
           <Text style={{ color: TOKENS.tertiary }} className="text-3xl font-black tracking-tight">{user?.firstName} {user?.lastName}</Text>
           <View style={{ backgroundColor: TOKENS.primary + '15' }} className="px-5 py-1.5 rounded-full mt-4">
              <Text style={{ color: TOKENS.primary }} className="text-[10px] font-black tracking-[0.2em]">@{user?.username || 'curator'}</Text>
           </View>
        </View>

        <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[10px] font-black uppercase tracking-[0.25rem] mb-6 opacity-60">Accounts</Text>
        <TouchableOpacity 
          onPress={() => setModalVisible(true)}
          style={{ backgroundColor: TOKENS.surfaceLow }}
          className="p-7 rounded-[40px] mb-12 flex-row items-center justify-between"
        >
          <View className="flex-row items-center">
            <View style={{ backgroundColor: TOKENS.surfaceHigh }} className="p-4 rounded-[22px] mr-5">
              <Send size={24} color={user?.telegramId ? TOKENS.primary : TOKENS.onSurfaceVariant} strokeWidth={1.5} />
            </View>
            <View>
              <Text style={{ color: TOKENS.onSurface }} className="text-lg font-black tracking-tight mb-0.5">Telegram Bot</Text>
              <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[11px] font-bold uppercase tracking-widest opacity-60">
                {user?.telegramId ? "Connected • Upload music" : "Connect @my_musicly_bot"}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={TOKENS.onSurfaceVariant} opacity={0.4} />
        </TouchableOpacity>

        <Text style={{ color: TOKENS.onSurfaceVariant }} className="text-[10px] font-black uppercase tracking-[0.25rem] mb-6 opacity-60">Settings</Text>
        <View style={{ backgroundColor: TOKENS.surfaceLow }} className="rounded-[40px] overflow-hidden mb-20">
           {[
             { icon: Bell, label: 'Notifications' },
             { icon: Speaker, label: 'Audio Quality', val: 'Lossless' },
             { icon: Database, label: 'Storage' },
             { icon: LogOut, label: 'Log Out', danger: true, action: logout },
           ].map((item, index) => (
             <TouchableOpacity 
               key={index} 
               onPress={item.action}
               className="flex-row items-center justify-between px-8 py-6"
             >
                <View className="flex-row items-center">
                   <item.icon size={20} color={item.danger ? '#ee7d77' : TOKENS.onSurfaceVariant} />
                   <Text className={`ml-5 text-[15px] font-bold tracking-tight ${item.danger ? 'text-[#ee7d77]' : 'text-[#e1e7df]'}`}>
                     {item.label}
                   </Text>
                </View>
                {item.val && <Text style={{ color: TOKENS.primary }} className="text-[10px] font-black uppercase tracking-widest">{item.val}</Text>}
                {!item.danger && <ChevronRight size={16} color={TOKENS.onSurfaceVariant} opacity={0.3} />}
             </TouchableOpacity>
           ))}
        </View>
      </ScrollView>

      <ConnectTelegramModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
      />
    </SafeAreaView>
  );
}
