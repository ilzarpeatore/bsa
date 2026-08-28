import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Icon } from '@components/ui/icon';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';

export default function VideoDetailScreen(props: any) {
  const { colors: C } = useAppColorMode();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="" onBack={() => props.navigation.goBack()} />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 + WORKOUT_MINIBAR_CLEARANCE }} showsVerticalScrollIndicator={false}>
        <Box style={{ marginBottom: 16 }} className="w-full h-[200px] bg-secondary items-center justify-center">
          <Icon name="play-circle" size={64} className="text-warning" />
        </Box>

        <Box className="px-2 gap-2">
          <Text size="lg" weight="bold">Title</Text>
          <Text size="sm" muted className="px-2" style={{ lineHeight: 22 }}>
            Exercise instruction content will be displayed here. This section contains detailed
            instructions about the exercise, proper form, and safety guidelines.
          </Text>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
}
