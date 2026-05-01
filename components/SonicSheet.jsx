import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions, KeyboardAvoidingView, Platform, Animated, PanResponder, Keyboard, StyleSheet } from 'react-native';
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

export default function SonicSheet({ 
  visible, 
  onClose, 
  title, 
  children, 
  heightPercent = 0.75,
  glossy = false,
  onDragUpdate = null,
  extraHeader = null,
  externalPanY = null,
  overlay = null
}) {
  const [shouldRender, setShouldRender] = useState(visible);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const localPanY = useRef(new Animated.Value(0)).current;
  const panY = externalPanY || localPanY;
  const sheetHeight = SCREEN_HEIGHT * heightPercent;

  // Track dragging for external callbacks (like background blur)
  useEffect(() => {
    const listenerId = panY.addListener(({ value }) => {
      onDragUpdate?.(value);
    });
    return () => panY.removeListener(listenerId);
  }, [onDragUpdate, panY]);

  // Interpolate background opacity based on gesture
  const backgroundOpacity = panY.interpolate({
    inputRange: [0, 300],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      panY.setValue(0);
      translateY.setValue(SCREEN_HEIGHT);
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
        if (finished) setShouldRender(false);
      });
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: Animated.event([null, { dy: panY }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          onClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      }
    })
  ).current;

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  if (!shouldRender && !visible) return null;

  return (
    <Modal visible={shouldRender} transparent animationType="none" statusBarTranslucent>
      <View style={{ flex: 1 }}>
        {/* Backdrop */}
        <Animated.View style={{ 
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
          opacity: backgroundOpacity,
          backgroundColor: 'rgba(0,0,0,0.4)'
        }}>
          <TouchableOpacity activeOpacity={1} onPress={handleClose} style={{ flex: 1 }} />
        </Animated.View>
        
        {/* Sheet Container */}
        <Animated.View 
          style={{ 
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: sheetHeight,
            backgroundColor: glossy ? 'rgba(0,0,0,0.2)' : '#171b17', 
            borderTopLeftRadius: 40, 
            borderTopRightRadius: 40,
            overflow: 'hidden',
            transform: [
              { translateY: translateY },
              { translateY: panY.interpolate({
                  inputRange: [0, SCREEN_HEIGHT],
                  outputRange: [0, SCREEN_HEIGHT],
                  extrapolate: 'clamp'
                }) 
              }
            ],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {glossy && (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
          )}
          {glossy && (
             <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.15)', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]} />
          )}

          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1 }}
          >
            {/* Drag Handle Area */}
            <View {...panResponder.panHandlers} style={{ width: '100%', alignItems: 'center', paddingVertical: glossy ? 24 : 18 }}>
               <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 48, height: 5, borderRadius: 10 }} />
            </View>

            {/* Right Actions Area (Search + Close) */}
            <View style={{ 
              position: 'absolute', 
              top: 14, 
              right: 14, 
              zIndex: 30, 
              flexDirection: 'row', 
              alignItems: 'center', 
              gap: 8 
            }}>
              {extraHeader}
              <TouchableOpacity 
                onPress={handleClose} 
                style={{ 
                  padding: 8,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 20
                }}
              >
                <X color={TOKENS.onSurfaceVariant} size={22} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Header (Title Only) */}
            <View style={{ paddingHorizontal: 40, paddingBottom: glossy ? 0 : 8, flexDirection: 'row', alignItems: 'center', zIndex: 10, minHeight: 40 }}>
              {title && (
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: TOKENS.onSurface }} className="text-sm font-black uppercase tracking-[0.2em]">
                    {title}
                  </Text>
                </View>
              )}
            </View>

            {/* Content */}
            <View className="flex-1">
              {children}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
        
        {/* Top-level Overlay (for popups like the Wrap Card) */}
        {overlay}
      </View>
    </Modal>
  );
}
