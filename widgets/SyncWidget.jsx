import React from 'react';
import { VStack, HStack, Text, ZStack, Spacer, Circle } from '@expo/ui';

const TOKENS = {
  primary: '#b9cbba',
  surface: '#0d0f0d',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
};

export default function SyncWidget({ progress = 0, total = 0, title = 'Syncing Music...' }) {
  const percentage = total > 0 ? Math.floor((progress / total) * 100) : 0;
  const remaining = 100 - percentage;
  const isFinished = progress >= total && total > 0;

  return (
    <VStack 
      style={{ flex: 1 }}
      backgroundColor={TOKENS.surface}
    >
      <VStack 
        style={{ 
          flex: 1, 
          padding: 16,
        }}
      >
      <HStack alignment="center">
        <ZStack style={{ width: 44, height: 44 }}>
           <Circle 
             style={{ 
               width: 44, 
               height: 44, 
               borderWidth: 2, 
               borderColor: TOKENS.primary + '30' 
             }} 
           />
           <VStack alignment="center" style={{ width: 44, height: 44, justifyContent: 'center' }}>
             <Text style={{ color: TOKENS.primary, fontSize: 10, fontWeight: 'bold' }}>
               {percentage}%
             </Text>
           </VStack>
        </ZStack>
        
        <VStack style={{ marginLeft: 12 }}>
          <Text style={{ color: TOKENS.onSurface, fontSize: 14, fontWeight: 'bold' }}>
            {isFinished ? 'Sync Complete' : title}
          </Text>
          <Text style={{ color: TOKENS.onSurfaceVariant, fontSize: 11, opacity: 0.8 }}>
            {isFinished ? `Synced ${total} tracks` : `${progress} of ${total} tracks`}
          </Text>
        </VStack>
      </HStack>

      <Spacer />

      {/* Progress Bar using Flex for maximum stability */}
      <HStack style={{ height: 6, backgroundColor: TOKENS.primary + '20', borderRadius: 3, overflow: 'hidden' }}>
        {percentage > 0 && <VStack style={{ flex: percentage, height: 6, backgroundColor: TOKENS.primary }} />}
        {remaining > 0 && <Spacer style={{ flex: remaining }} />}
      </HStack>
      </VStack>
    </VStack>
  );
}

// Live Activity configurations
SyncWidget.kind = 'sync-progress';

SyncWidget.dynamicIsland = ({ progress, total, title }) => {
  const percentage = total > 0 ? Math.floor((progress / total) * 100) : 0;
  const remaining = 100 - percentage;

  return {
    compactLeading: (
      <HStack alignment="center" style={{ paddingLeft: 4 }}>
        <Text style={{ color: TOKENS.primary, fontWeight: 'bold', fontSize: 12 }}>{percentage}%</Text>
      </HStack>
    ),
    compactTrailing: (
      <HStack alignment="center" style={{ paddingRight: 4 }}>
        <Circle style={{ width: 14, height: 14, backgroundColor: TOKENS.primary }} />
      </HStack>
    ),
    expanded: (
      <VStack style={{ padding: 16 }}>
        <HStack alignment="center">
          <VStack>
            <Text style={{ color: TOKENS.onSurface, fontSize: 18, fontWeight: 'bold' }}>{title}</Text>
            <Text style={{ color: TOKENS.onSurfaceVariant, fontSize: 13 }}>{progress} / {total} tracks synced</Text>
          </VStack>
          <Spacer />
          <Text style={{ color: TOKENS.primary, fontSize: 28, fontWeight: 'black' }}>{percentage}%</Text>
        </HStack>
        
        <Spacer style={{ height: 16 }} />

        {/* Progress Bar using Flex */}
        <HStack style={{ height: 8, backgroundColor: TOKENS.primary + '20', borderRadius: 4, overflow: 'hidden' }}>
          {percentage > 0 && <VStack style={{ flex: percentage, height: 8, backgroundColor: TOKENS.primary }} />}
          {remaining > 0 && <Spacer style={{ flex: remaining }} />}
        </HStack>
      </VStack>
    ),
    minimal: (
      <VStack alignment="center" style={{ justifyContent: 'center' }}>
        <Circle style={{ width: 18, height: 18, backgroundColor: TOKENS.primary }} />
      </VStack>
    )
  };
};
