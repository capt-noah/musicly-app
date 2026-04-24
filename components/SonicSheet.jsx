import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions, KeyboardAvoidingView, Platform, Animated, PanResponder, Keyboard } from 'react-native';
import { X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const TOKENS = {
  surface: '#0d0f0d',
  surfaceLow: '#111412',
  surfaceHigh: '#1c211d',
  primary: '#b9cbba',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
  tertiary: '#fff8f2',
};

export default function SonicSheet({ visible, onClose, title, children, heightPercent = 0.75 }) {
  const [shouldRender, setShouldRender] = useState(visible);
  const [intensity, setIntensity] = useState(0);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const sheetHeight = SCREEN_HEIGHT * heightPercent;

  // We need a listener because intensity prop of BlurView isn't natively animatable 
  // when translateY uses native driver.
  useEffect(() => {
    const listenerId = translateY.addListener(({ value }) => {
      // Map SCREEN_HEIGHT (0 intensity) to 0 (40 intensity)
      const newIntensity = Math.max(0, Math.min(40, 40 * (1 - value / SCREEN_HEIGHT)));
      setIntensity(newIntensity);
    });
    return () => translateY.removeListener(listenerId);
  }, [translateY]);

  // Interpolate background opacity based on translateY
  const backgroundOpacity = translateY.interpolate({
    inputRange: [0, SCREEN_HEIGHT],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 12
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true
      }).start(({ finished }) => {
        if (finished) {
          setShouldRender(false);
        }
      });
    }
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to downward swipes
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8
          }).start();
        }
      }
    })
  ).current;

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  // Only return null if not visible AND animation finished
  if (!shouldRender && !visible) return null;

  return (
    <Modal visible={shouldRender} transparent animationType="none" statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: backgroundOpacity }}>
           <TouchableOpacity 
              activeOpacity={1} 
              onPress={handleClose} 
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              <BlurView intensity={intensity} tint="dark" style={{ flex: 1 }} />
            </TouchableOpacity>
        </Animated.View>
        
        <Animated.View 
          style={{ 
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: sheetHeight,
            backgroundColor: '#171b17', 
            borderTopLeftRadius: 36, 
            borderTopRightRadius: 36,
            borderWidth: 1,
            borderColor: '#43494420',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 10,
            transform: [{ translateY }]
          }}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1 }}
          >
            {/* Drag Handle */}
            <View {...panResponder.panHandlers} className="w-full items-center py-4">
               <View style={{ backgroundColor: TOKENS.onSurfaceVariant, opacity: 0.2 }} className="w-12 h-1 rounded-full" />
            </View>

            {/* Header */}
            <View className="px-10 pb-4 flex-row justify-between items-center">
              <View className="w-6" />
              {title && (
                <Text style={{ color: TOKENS.onSurface }} className="text-sm font-black uppercase tracking-[0.2em]">
                  {title}
                </Text>
              )}
              <TouchableOpacity onPress={handleClose}>
                <X color={TOKENS.onSurfaceVariant} size={24} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View className="flex-1">
              {children}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Create an Animated version of BlurView
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
