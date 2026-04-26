import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { Send, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import SonicSheet from './SonicSheet';

export default function ConnectTelegramModal({ visible, onClose }) {
  const { API_URL } = useAuth();
  const [token, setToken] = useState(null);
  const [botUsername, setBotUsername] = useState('my_musicly_bot');
  const [loading, setLoading] = useState(true);
  const [isLinked, setIsLinked] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      handleInitialCheck();
    }
  }, [visible]);

  const handleInitialCheck = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/telegram/link-status`);
      const data = await response.json();
      
      if (data.linked) {
        setIsLinked(true);
        setTimeout(() => setLoading(false), 1500);
      } else {
        await fetchToken();
        setLoading(false);
      }
    } catch (e) {
      setError("Connection failed");
      setLoading(false);
    }
  };

  const fetchToken = async () => {
    try {
      const response = await fetch(`${API_URL}/telegram/link-token`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.token) {
        setToken(data.token);
        if (data.botUsername) setBotUsername(data.botUsername);
      }
    } catch (e) {}
  };

  const checkStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/telegram/link-status`);
      const data = await response.json();
      if (data.linked) {
        setIsLinked(true);
      }
    } catch (e) {}
  };

  useEffect(() => {
    let interval;
    if (visible && !isLinked && !loading) {
      interval = setInterval(checkStatus, 3000);
    }
    return () => clearInterval(interval);
  }, [visible, isLinked, loading]);

  const handleOpenTelegram = () => {
    if (token) {
      const url = `https://t.me/${botUsername}?start=${token}`;
      Linking.openURL(url);
    }
  };

  return (
    <SonicSheet 
      visible={visible} 
      onClose={onClose} 
      title="Telegram Bot"
      heightPercent={0.65}
    >
      <View className="px-10 mt-6 flex-1">
        <Text style={{ color: '#b9cbba', fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20, marginTop: 10 }}>
          Status: {loading ? 'Checking...' : isLinked ? 'Connected' : 'Disconnected'}
        </Text>

        {loading ? (
          <View className="flex-1 items-center gap-4 mt-4">
            <ActivityIndicator color="#b9cbba" size="large" />
            <Text style={{ color: '#a6ada6' }} className="text-[10px] uppercase font-black tracking-[0.3rem] mt-4">Securing Session...</Text>
          </View>
        ) : isLinked ? (
          <View className="items-center pt-6">
            <View className="bg-[#b9cbba22] p-8 rounded-full mb-8">
              <CheckCircle2 size={72} color="#b9cbba" />
            </View>
            <Text style={{ color: '#b9cbba' }} className="text-3xl font-black mb-3 text-center">Linked Successfully</Text>
            <Text style={{ color: '#a6ada6' }} className="text-center mb-12 leading-6 px-4 font-medium">
              Your account is verified. You can now send audio files directly to @{botUsername}.
            </Text>
            <TouchableOpacity 
              onPress={onClose}
              style={{ backgroundColor: '#b9cbba' }}
              className="w-full py-5 rounded-3xl items-center shadow-lg"
            >
              <Text style={{ color: '#101211' }} className="font-black text-lg uppercase tracking-widest">Perfect</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
          <View className="mb-10">
            <View className="flex-row">
              <View className="items-center mr-8">
                <View style={{ borderColor: '#b9cbba', borderWidth: 1.5 }} className="w-10 h-10 rounded-full items-center justify-center">
                  <Text style={{ color: '#b9cbba', fontSize: 13, fontWeight: '900' }}>1</Text>
                </View>
                <View style={{ backgroundColor: '#43494444' }} className="w-[1.5px] flex-1 my-3" />
              </View>
              <View className="flex-1 pb-24">
                <Text style={{ color: '#fff8f2' }} className="font-black text-xl mb-2.5 tracking-tight">Connect to our Bot</Text>
                <Text style={{ color: '#a6ada6' }} className="text-[14px] leading-6 opacity-80">
                  Tap the button below to link your account via our secure Telegram bot.
                </Text>
              </View>
            </View>

            <View className="flex-row mt-4">
              <View className="items-center mr-8">
                <View style={{ borderColor: '#b9cbba', borderWidth: 1.5 }} className="w-10 h-10 rounded-full items-center justify-center">
                  <Text style={{ color: '#b9cbba', fontSize: 13, fontWeight: '900' }}>2</Text>
                </View>
              </View>
              <View className="flex-1">
                <Text style={{ color: '#fff8f2' }} className="font-black text-xl mb-2.5 tracking-tight">Send Music</Text>
                <Text style={{ color: '#a6ada6' }} className="text-[14px] leading-6 opacity-80">
                  Once linked, you can sync your library by forwarding songs directly to the bot.
                </Text>
              </View>
            </View>
          </View>

            <TouchableOpacity 
              onPress={handleOpenTelegram}
              style={{ backgroundColor: '#b9cbba' }}
              className="w-full py-5 rounded-3xl flex-row justify-center items-center shadow-xl"
            >
              <Send size={22} color="#101211" strokeWidth={2.5} />
              <Text style={{ color: '#101211' }} className="font-black ml-3 text-lg uppercase tracking-widest">Connect to Bot</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SonicSheet>
  );
}
