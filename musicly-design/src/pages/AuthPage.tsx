import React from 'react';
import { View, Text, Image, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Mail, Lock, User, Badge } from 'lucide-react-native';
import { Button, Input } from '../components/UI';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = styled(Image);
const StyledScrollView = styled(ScrollView);

export function AuthPage({ isSignUp = false, onToggleMode, onFinish }: { isSignUp?: boolean, onToggleMode: () => void, onFinish: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0d0f0d' }}>
      <StyledScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="px-6 py-12">
        <StyledView className="items-center mb-10">
          <StyledView className="w-16 h-16 bg-[#171b17] p-3 rounded-2xl items-center justify-center mb-6">
             <StyledView className="w-full h-full border-2 border-[#b9cbba] rounded-lg items-center justify-center" />
          </StyledView>
          <StyledText className="text-[#fff8f2] text-lg font-bold tracking-[0.4rem] uppercase mb-4">MUSICLY</StyledText>
          <StyledText className="text-[#e1e7df] text-4xl font-extrabold tracking-tight mb-2">
            {isSignUp ? 'Create Account' : 'Sign in'}
          </StyledText>
          <StyledText className="text-[#a6ada6] text-center text-sm max-w-[280px]">
            {isSignUp ? 'Join the Musicly high-fidelity audio community.' : 'Step back into the digital workshop.'}
          </StyledText>
        </StyledView>

        <StyledView className="bg-[#0d0f0d]/70 p-8 rounded-[2rem] border border-[#43494411] space-y-6">
          <StyledView className="space-y-4">
            {isSignUp && <Input label="Full Name" icon={Badge} placeholder="Julian Vane" />}
            <Input label={isSignUp ? "Email Address" : "Username"} icon={isSignUp ? Mail : User} placeholder={isSignUp ? "name@musicly.com" : "Curator ID"} />
            <Input label="Password" icon={Lock} secureTextEntry placeholder="••••••••" />
          </StyledView>

          {!isSignUp && (
            <TouchableOpacity className="items-end">
              <StyledText className="text-[#b9cbba] text-xs font-semibold">Forgot credentials?</StyledText>
            </TouchableOpacity>
          )}

          <Button onPress={onFinish} className="w-full">
            {isSignUp ? 'Join Musicly' : 'Continue to Atelier'}
          </Button>

          <StyledView className="flex-row items-center space-x-4 my-2">
             <StyledView className="flex-1 h-[1px] bg-[#43494422]" />
             <StyledText className="text-[#a6ada666] text-[10px] font-bold uppercase tracking-widest">OR</StyledText>
             <StyledView className="flex-1 h-[1px] bg-[#43494422]" />
          </StyledView>

          <StyledView className="flex-row space-x-4">
             <Button variant="surface" className="flex-1 py-3" size="sm">
                <StyledText className="text-[#e1e7df] text-sm font-bold">Google</StyledText>
             </Button>
             <Button variant="surface" className="flex-1 py-3" size="sm">
                <StyledText className="text-[#e1e7df] text-sm font-bold">Apple</StyledText>
             </Button>
          </StyledView>

          <StyledView className="pt-6 border-t border-[#43494411] items-center">
             <TouchableOpacity onPress={onToggleMode} className="flex-row items-center">
                <StyledText className="text-[#a6ada6] text-xs font-medium">
                  {isSignUp ? 'Already part of Musicly?' : 'New to the digital workshop?'}
                </StyledText>
                <StyledText className="text-[#b9cbba] text-xs font-bold ml-1">
                  {isSignUp ? 'Sign in' : 'Create Account'}
                </StyledText>
             </TouchableOpacity>
          </StyledView>
        </StyledView>
      </StyledScrollView>
    </SafeAreaView>
  );
}
