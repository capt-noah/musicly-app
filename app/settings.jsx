import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Shield, Bell, Music, Sliders, Repeat, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { haptics } from '../utils/haptics';

export default function Settings({ onBack }) {
  const router = useRouter();
  const { logout } = useAuth();
  const handleBack = () => {
    haptics.impactLight();
    if (onBack) onBack();
    else router.back();
  };

  const sections = [
    {
      title: 'Account',
      items: [
        { icon: Shield, label: 'Profile', sub: 'Manage your public identity' },
        { icon: Bell, label: 'Notifications', sub: 'Emails, push notifications' },
        { icon: Shield, label: 'Security', sub: 'Passwords, 2FA, devices' },
      ]
    },
    {
      title: 'Playback',
      items: [
        { icon: Music, label: 'Audio Quality', sub: 'Lossless', color: '#b9cbba' },
        { icon: Sliders, label: 'Equalizer', sub: 'Customize your sound profile' },
        { icon: Repeat, label: 'Crossfade', sub: 'Smooth track transitions', isSwitch: true },
      ]
    }
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0d0f0d' }}>
      <View className="flex-row items-center px-6 py-6 border-b border-[#43494411]">
         <TouchableOpacity onPress={handleBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-4">
            <ArrowLeft size={24} color="#b9cbba" />
         </TouchableOpacity>
         <Text className="text-[#b9cbba] text-lg font-bold tracking-tight">Settings</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-8">
        {sections.map(section => (
          <View key={section.title} className="mb-10">
             <Text className="text-[#a6ada6] text-[10px] font-bold uppercase tracking-[0.2rem] mb-4 ml-2">
               {section.title}
             </Text>
             <View className="bg-[#111412] rounded-[2rem] overflow-hidden border border-[#43494411]">
                {section.items.map((item, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    onPress={() => haptics.selection()}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-between px-5 py-5 border-b border-[#43494408]"
                  >
                     <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 rounded-full bg-[#1c211d] items-center justify-center mr-4">
                           <item.icon size={18} color="#b9cbba" />
                        </View>
                        <View>
                           <Text className="text-[#e1e7df] font-bold text-sm tracking-tight">{item.label}</Text>
                           <Text className={`text-[10px] ${item.color ? 'text-[#b9cbba]' : 'text-[#a6ada6]'}`}>{item.sub}</Text>
                        </View>
                     </View>
                     {item.isSwitch ? (
                        <Switch 
                          trackColor={{ false: '#1c211d', true: '#3b4b3e' }} 
                          thumbColor="#b9cbba" 
                          value={true} 
                          onValueChange={() => haptics.selection()}
                        />
                     ) : (
                        <ChevronRight size={18} color="#434944" />
                     )}
                  </TouchableOpacity>
                ))}
             </View>
          </View>
        ))}

        <TouchableOpacity 
          onPress={() => {
            haptics.impactLight();
            logout();
          }}
          activeOpacity={0.8}
          className="w-full py-5 bg-[#171b17] border border-[#ee7d7711] rounded-full items-center mb-8"
        >
           <Text className="text-[#ee7d77] font-bold">Log Out</Text>
        </TouchableOpacity>
        
        <Text className="text-[#a6ada633] text-[10px] font-bold uppercase tracking-[0.4rem] text-center mb-20 italic">
          Musicly Atelier © 2024
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

