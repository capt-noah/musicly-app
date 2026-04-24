import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Shield, Bell, Music, Sliders, Repeat, Database, Download, Info, ExternalLink, ChevronRight } from 'lucide-react-native';


export default function Settings({ onBack }) {
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
         <TouchableOpacity onPress={onBack} className="mr-4">
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
                  <TouchableOpacity key={idx} className="flex-row items-center justify-between px-5 py-5 border-b border-[#43494408]">
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
                        <Switch trackColor={{ false: '#1c211d', true: '#3b4b3e' }} thumbColor="#b9cbba" value={true} />
                     ) : (
                        <ChevronRight size={18} color="#434944" />
                     )}
                  </TouchableOpacity>
                ))}
             </View>
          </View>
        ))}

        <TouchableOpacity className="w-full py-5 bg-[#171b17] border border-[#ee7d7711] rounded-full items-center mb-8">
           <Text className="text-[#ee7d77] font-bold">Log Out</Text>
        </TouchableOpacity>
        
        <Text className="text-[#a6ada633] text-[10px] font-bold uppercase tracking-[0.4rem] text-center mb-20 italic">
          Musicly Atelier © 2024
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
