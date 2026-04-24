import { View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Tabs } from "expo-router";
import { User, Home, Search, Library, Settings, Bell, Mic, Plus } from 'lucide-react-native';
import NavSpotifyHeader from "../../components/NavSpotifyHeader";

export default function TabsLayout() {
    return (
        <View style={{ flex: 1 }}>
            <Tabs screenOptions={{
                tabBarShowLabel: false,
                tabBarInactiveTintColor: '#8b8b8bff',
                tabBarActiveTintColor: '#e1e7df',
                headerShown: false,
                tabBarBackground: () => (
                    <BlurView 
                        tint="dark" 
                        intensity={95} 
                        style={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(13, 15, 13, 0.85)' 
                        }} 
                    />
                ),
                tabBarStyle: {
                    position: 'absolute',
                    backgroundColor: 'transparent',
                    borderTopWidth: 0,
                    height: 90,
                    paddingTop: 14,
                    elevation: 0,
                }
            }} >

                <Tabs.Screen name="Home" options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => (
                        <Home color={color} size={size} />
                    )
                }} />
                
                <Tabs.Screen name="Search" options={{
                    title: "Explore",
                    tabBarIcon: ({ color, size }) => (
                        <Search color={color} size={size} />
                    )
                }} />

                <Tabs.Screen name="Library" options={{
                    title: "Library",
                    tabBarIcon: ({ color, size }) => (
                        <Library color={color} size={size} />
                    )
                }} />

                <Tabs.Screen name="Profile" options={{
                    title: "Profile",
                    tabBarIcon: ({ color, size }) => (
                        <User color={color} size={size} />
                    )
                }} />

            </Tabs>
        </View>
    )
}