import React from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, Switch } from 'react-native';
import { ArrowLeft, Shield, Bell, Music, Sliders, Repeat, Database, Download, Info, ExternalLink, ChevronRight } from 'lucide-react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);

export function Settings({ onBack }: { onBack: () => void }) {
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
      <StyledView className="flex-row items-center px-6 py-6 border-b border-[#43494411]">
         <StyledTouchableOpacity onPress={onBack} className="mr-4">
            <ArrowLeft size={24} color="#b9cbba" />
         </StyledTouchableOpacity>
         <StyledText className="text-[#b9cbba] text-lg font-bold tracking-tight">Settings</StyledText>
      </StyledView>

      <StyledScrollView className="flex-1 px-6 pt-8">
        {sections.map(section => (
          <StyledView key={section.title} className="mb-10">
             <StyledText className="text-[#a6ada6] text-[10px] font-bold uppercase tracking-[0.2rem] mb-4 ml-2">
               {section.title}
             </StyledText>
             <StyledView className="bg-[#111412] rounded-[2rem] overflow-hidden border border-[#43494411]">
                {section.items.map((item, idx) => (
                  <StyledTouchableOpacity key={idx} className="flex-row items-center justify-between px-5 py-5 border-b border-[#43494408]">
                     <StyledView className="flex-row items-center flex-1">
                        <StyledView className="w-10 h-10 rounded-full bg-[#1c211d] items-center justify-center mr-4">
                           <item.icon size={18} color="#b9cbba" />
                        </StyledView>
                        <StyledView>
                           <StyledText className="text-[#e1e7df] font-bold text-sm tracking-tight">{item.label}</StyledText>
                           <StyledText className={`text-[10px] ${item.color ? 'text-[#b9cbba]' : 'text-[#a6ada6]'}`}>{item.sub}</StyledText>
                        </StyledView>
                     </StyledView>
                     {item.isSwitch ? (
                        <Switch trackColor={{ false: '#1c211d', true: '#3b4b3e' }} thumbColor="#b9cbba" value={true} />
                     ) : (
                        <ChevronRight size={18} color="#434944" />
                     )}
                  </StyledTouchableOpacity>
                ))}
             </StyledView>
          </StyledView>
        ))}

        <StyledTouchableOpacity className="w-full py-5 bg-[#171b17] border border-[#ee7d7711] rounded-full items-center mb-8">
           <StyledText className="text-[#ee7d77] font-bold">Log Out</StyledText>
        </StyledTouchableOpacity>
        
        <StyledText className="text-[#a6ada633] text-[10px] font-bold uppercase tracking-[0.4rem] text-center mb-20 italic">
          Musicly Atelier © 2024
        </StyledText>
      </StyledScrollView>
    </SafeAreaView>
  );
}
