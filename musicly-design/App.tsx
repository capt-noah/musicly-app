import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Discover } from './src/pages/Discover';
import { Explore } from './src/pages/Explore';
import { Library } from './src/pages/Library';
import { Profile } from './src/pages/Profile';
import { Settings } from './src/pages/Settings';
import { AuthPage } from './src/pages/AuthPage';
import { PlaylistDetail } from './src/pages/PlaylistDetail';
import { NowPlaying } from './src/pages/NowPlaying';
import { BottomNav } from './src/components/BottomNav';
import { PlayerBar } from './src/components/PlayerBar';
import { styled } from 'nativewind';

const StyledView = styled(View);

export default function App() {
  const [currentRoute, setCurrentRoute] = useState('Discover');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  if (!isAuthenticated) {
    return (
      <AuthPage 
        isSignUp={isSignUp} 
        onToggleMode={() => setIsSignUp(!isSignUp)} 
        onFinish={() => setIsAuthenticated(true)} 
      />
    );
  }

  const handleNavigate = (route: string) => {
    setCurrentRoute(route);
    setSelectedPlaylistId(null);
    setShowSettings(false);
  };

  const handleOpenPlaylist = (id: string) => {
    setSelectedPlaylistId(id);
  };

  if (showPlayer) {
    return <NowPlaying onClose={() => setShowPlayer(false)} />;
  }

  if (showSettings) {
    return <Settings onBack={() => setShowSettings(false)} />;
  }

  if (selectedPlaylistId) {
    return <PlaylistDetail onBack={() => setSelectedPlaylistId(null)} />;
  }

  return (
    <StyledView className="flex-1 bg-[#0d0f0d]">
      <StatusBar barStyle="light-content" />
      
      {currentRoute === 'Discover' && <Discover onNavigateToPlaylist={handleOpenPlaylist} />}
      {currentRoute === 'Explore' && <Explore />}
      {currentRoute === 'Library' && <Library />}
      {currentRoute === 'Profile' && <Profile onNavigateToSettings={() => setShowSettings(true)} />}
      
      {/* Footer components */}
      <PlayerBar onOpenPlayer={() => setShowPlayer(true)} />
      <BottomNav currentRoute={currentRoute} onNavigate={handleNavigate} />
    </StyledView>
  );
}
