import React from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import avatar from '../assets/images/profile.jpg'

// actions: [{ key: string, element: React.ReactNode, onPress?: () => void }]
const NavSpotifyHeader = ({ title, rightText, actions = [] }) => {
  const insets = useSafeAreaInsets()
  return (
    <View className="w-full bg-white" style={{ paddingTop: insets.top + 8, paddingBottom: 10, paddingHorizontal: 20 }}>
      <View className=" flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className="text-2xl font-extrabold mr-3">{title}</Text>
          {rightText ? <Text className="text-gray-600">{rightText}</Text> : null}
        </View>

        <View className=" gap-4 flex-row items-center">
          {actions.map((a) => (
            <Pressable key={a.key} onPress={a.onPress} >
              {a.element}
            </Pressable>
          ))}
          <Pressable className="w-12 h-12 rounded-full" >
            <Image source={avatar} className="w-full h-full rounded-full" />
          </Pressable>
        </View>
      </View>
    </View>
  )
}

export default NavSpotifyHeader

