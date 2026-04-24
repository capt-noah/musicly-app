import React from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { Settings as SettingsIcon, Timer, Waves, UserPlus, ChevronRight, LogOut, Bell, Database, Speaker } from 'lucide-react-native';
import { ARTISTS } from '../constants';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

export function Profile({ onNavigateToSettings }: { onNavigateToSettings: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0d0f0d' }}>
      <StyledScrollView className="flex-1 px-6 pb-40">
        <StyledView className="py-4 flex-row justify-between items-center mb-8">
           <StyledText className="text-[#fff8f2] text-xl font-bold tracking-tighter">Profile</StyledText>
           <StyledTouchableOpacity onPress={onNavigateToSettings} className="p-2">
              <SettingsIcon size={22} color="#a6ada6" />
           </StyledTouchableOpacity>
        </StyledView>

        <StyledView className="items-center mb-12">
           <StyledView className="w-32 h-32 rounded-full overflow-hidden border-2 border-[#1c211d] mb-6">
              <StyledImage source={{ uri: 'https://picsum.photos/seed/user/200/200' }} className="w-full h-full" />
           </StyledView>
           <StyledText className="text-[#fff8f2] text-3xl font-bold">Julian Vane</StyledText>
           <StyledView className="bg-[#3b4b3e] px-4 py-1 rounded-full mt-3">
              <StyledText className="text-[#b9cbba] text-[10px] font-bold uppercase tracking-widest">Pro Member</StyledText>
           </StyledView>
        </StyledView>

        <StyledText className="text-[#a6ada6] text-[10px] font-bold uppercase tracking-[0.2rem] mb-6">Listening Stats</StyledText>
        <StyledView className="flex-row space-x-3 mb-12">
           <StyledView className="flex-1 aspect-square bg-[#111412] p-6 rounded-[2rem] justify-between border border-[#43494411]">
              <Timer size={32} color="#b9cbba" />
              <StyledView>
                 <StyledText className="text-[#fff8f2] text-2xl font-bold">14,240</StyledText>
                 <StyledText className="text-[#a6ada6] text-[10px] lowercase">minutes listened</StyledText>
              </StyledView>
           </StyledView>
           <StyledView className="flex-1 space-y-3">
              <StyledView className="bg-[#1c211d] p-4 rounded-2xl flex-row items-center border border-[#43494411]">
                 <Waves size={20} color="#b9cbba" />
                 <StyledView className="ml-3">
                    <StyledText className="text-[#e1e7df] text-sm font-bold">Ambient</StyledText>
                    <StyledText className="text-[#a6ada6] text-[10px]">top genre</StyledText>
                 </StyledView>
              </StyledView>
              <StyledView className="bg-[#1c211d] p-4 rounded-2xl flex-row items-center border border-[#43494411]">
                 <UserPlus size={20} color="#b9cbba" />
                 <StyledView className="ml-3">
                    <StyledText className="text-[#e1e7df] text-sm font-bold">42</StyledText>
                    <StyledText className="text-[#a6ada6] text-[10px]">new artists</StyledText>
                 </StyledView>
              </StyledView>
           </StyledView>
        </StyledView>

        <StyledView className="bg-[#111412] rounded-[2rem] overflow-hidden border border-[#43494411] mb-20">
           {[
             { icon: UserPlus, label: 'Profile' },
             { icon: Bell, label: 'Notifications' },
             { icon: Speaker, label: 'Audio Quality', val: 'Lossless' },
             { icon: Database, label: 'Storage' },
             { icon: LogOut, label: 'Log Out', danger: true },
           ].map((item, index) => (
             <StyledTouchableOpacity key={index} className="flex-row items-center justify-between px-6 py-5 border-b border-[#43494411]">
                <StyledView className="flex-row items-center">
                   <item.icon size={20} color={item.danger ? '#ee7d77' : '#a6ada6'} />
                   <StyledText className={`ml-4 text-sm font-medium ${item.danger ? 'text-[#ee7d77]' : 'text-[#e1e7df]'}`}>
                     {item.label}
                   </StyledText>
                </StyledView>
                {item.val && <StyledText className="text-[#b9cbba] text-[10px] font-bold tracking-widest">{item.val}</StyledText>}
                {!item.danger && <ChevronRight size={16} color="#a6ada6" />}
             </StyledTouchableOpacity>
           ))}
        </StyledView>
      </StyledScrollView>
    </SafeAreaView>
  );
}
