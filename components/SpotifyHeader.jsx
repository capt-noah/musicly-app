import React from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import avatar from '../assets/images/alex.jpeg'

// actions: [{ key: string, icon: ReactNode, onPress?: () => void }]
const SpotifyHeader = ({ title, rightText, actions = [] }) => {
  return (
    <View className="px-5 pt-6">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className="text-3xl font-extrabold tracking-tight mr-3">{title}</Text>
          {rightText ? (
            <Text className="text-gray-600">{rightText}</Text>
          ) : null}
        </View>
        <View className="flex-row items-center">
          {actions.map((a) => (
            <Pressable key={a.key} onPress={a.onPress} className="mr-3">
              {a.icon}
            </Pressable>
          ))}
          <Pressable>
            <Image source={avatar} className="w-8 h-8 rounded-full" />
          </Pressable>
        </View>
      </View>
    </View>
  )
}

export default SpotifyHeader

