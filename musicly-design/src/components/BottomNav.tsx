import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Home, Compass, Library, User } from 'lucide-react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

export function BottomNav({ currentRoute, onNavigate }: { currentRoute: string, onNavigate: (route: string) => void }) {
  const navItems = [
    { icon: Home, label: 'home', path: 'Discover' },
    { icon: Compass, label: 'explore', path: 'Explore' },
    { icon: Library, label: 'library', path: 'Library' },
    { icon: User, label: 'profile', path: 'Profile' },
  ];

  return (
    <StyledView className="absolute bottom-0 left-0 w-full bg-[#0d0f0d]/90 py-4 px-4 flex-row justify-around items-center border-t border-[#43494422] rounded-t-[2rem]">
      {navItems.map(({ icon: Icon, label, path }) => {
        const isActive = currentRoute === path;
        return (
          <StyledTouchableOpacity
            key={path}
            onPress={() => onNavigate(path)}
            className="items-center justify-center"
          >
            <Icon size={24} color={isActive ? '#b9cbba' : '#a6ada6'} />
            <StyledText className={`text-[10px] mt-1 lowercase ${isActive ? 'text-[#b9cbba] font-bold' : 'text-[#a6ada6]'}`}>
              {label}
            </StyledText>
          </StyledTouchableOpacity>
        );
      })}
    </StyledView>
  );
}
