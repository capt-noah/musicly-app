import React from "react";
import { View, TouchableOpacity } from "react-native";
import { ChevronDown, MoreHorizontal } from "lucide-react-native";
import { TOKENS } from "./playerUtils";

const PlayerHeader = React.memo(({ onCollapse }) => {
  return (
    <View className="flex-row justify-between items-center mb-4 relative" style={{ zIndex: 10 }}>
      <TouchableOpacity onPress={onCollapse} className="w-12 h-12 items-center justify-center -ml-2">
        <ChevronDown size={32} color="#ffffff" strokeWidth={1.5} />
      </TouchableOpacity>
      
      <View className="flex-row items-center gap-x-4">
        <TouchableOpacity style={{ backgroundColor: TOKENS.surfaceHigh }} className="w-10 h-10 rounded-full items-center justify-center">
          <MoreHorizontal size={20} color={TOKENS.onSurfaceVariant} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default PlayerHeader;
