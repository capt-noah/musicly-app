import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ViewProps, TextInputProps } from 'react-native';
import { LucideIcon } from 'lucide-react-native';


interface InputProps extends TextInputProps {
  label: string;
  icon: LucideIcon;
}

export function Input({ label, icon: Icon, ...props }: InputProps) {
  return (
    <View className="space-y-1.5 w-full">
      <Text className="text-[10px] font-bold tracking-widest text-[#a6ada6] uppercase ml-1">
        {label}
      </Text>
      <View className="relative">
        <View className="absolute inset-y-0 left-4 z-10 flex items-center justify-center pointer-events-none">
          <Icon size={20} color="#a6ada6" />
        </View>
        <TextInput
          {...props}
          placeholderTextColor="#a6ada666"
          className="w-full bg-[#111412] border border-[#43494411] rounded-full py-4 pl-12 pr-6 text-[#e1e7df] text-sm font-medium"
        />
      </View>
    </View>
  );
}

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'surface';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children?: React.ReactNode;
  onPress?: () => void;
  className?: string;
}

export function Button({ variant = 'primary', size = 'md', className = '', children, onPress }: ButtonProps) {
  const variants = {
    primary: 'bg-[#b9cbba]',
    secondary: 'bg-[#3b4b3e]',
    ghost: 'bg-transparent',
    surface: 'bg-[#1c211d] border border-[#43494455]',
  };

  const textVariants = {
    primary: 'text-[#344437]',
    secondary: 'text-[#b9cbba]',
    ghost: 'text-[#b9cbba]',
    surface: 'text-[#e1e7df]',
  };

  const sizes = {
    sm: 'py-2 px-4',
    md: 'py-4 px-8',
    lg: 'py-5 px-10',
    icon: 'p-3',
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className={`rounded-full flex-row items-center justify-center gap-3 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      <Text className={`font-bold ${size === 'sm' ? 'text-xs' : 'text-sm'} ${textVariants[variant]}`}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}
