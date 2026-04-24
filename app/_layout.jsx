import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { SyncProvider } from "../context/SyncContext";
import { PlayerProvider } from "../context/PlayerContext";
import Player from "../components/PlayerScreen";

export default function RootLayout() {
  return (
    <AuthProvider>
      <SyncProvider>
        <PlayerProvider>
          <>
            <Stack screenOptions={{
              headerShown: false
            }} />
            <Player />
          </>
        </PlayerProvider>
      </SyncProvider>
    </AuthProvider>
  );
}
