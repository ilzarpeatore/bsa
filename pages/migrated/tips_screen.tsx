import React, { useState } from 'react';
import { ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { VStack } from '@components/ui/vstack';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TipsScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const {
    mTips = '',
    mExerciseImage = '',
    mExerciseVideo = '',
    mExerciseInstruction = '',
  } = props.route?.params || {};

  const [select, setSelect] = useState(false);

  const isYouTube = mExerciseVideo?.includes('https://youtu');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="Tips & Instructions" onBack={() => props.navigation.goBack()} />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 + WORKOUT_MINIBAR_CLEARANCE }} showsVerticalScrollIndicator={false}>
        {isYouTube ? (
          <Box style={{ width: SCREEN_WIDTH, aspectRatio: 12 / 7 }}>
            {mExerciseImage ? (
              <Image
                source={{ uri: mExerciseImage }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <Box style={{ width: '100%', height: '100%' }} className="bg-card items-center justify-center">
                <Icon name="logo-youtube" size={48} className="text-destructive" />
              </Box>
            )}
          </Box>
        ) : mExerciseVideo ? (
          <Box style={{ width: SCREEN_WIDTH, aspectRatio: 12 / 7 }}>
            {mExerciseImage ? (
              <Image
                source={{ uri: mExerciseImage }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <Box style={{ width: '100%', height: '100%' }} className="bg-card items-center justify-center">
                <Icon name="play-circle" size={48} className="text-warning" />
              </Box>
            )}
          </Box>
        ) : null}

        <VStack space="lg" className="p-4">
          <Pressable
            className="bg-card rounded-sm p-4"
            onPress={() => setSelect(!select)}
          >
            <VStack space="sm">
              <Box className="flex-row justify-between items-center">
                <Box className="flex-row items-center gap-2.5 flex-1">
                  <Icon name="information-circle-outline" size={25} className="text-foreground" />
                  <Text size="lg" className="text-foreground">Tips</Text>
                </Box>
                <Icon
                  name={select ? 'chevron-down' : 'chevron-up'}
                  size={30}
                  className="text-foreground"
                />
              </Box>
              {!select && mTips ? (
                <Text size="sm" muted className="leading-[22px]">{mTips}</Text>
              ) : null}
            </VStack>
          </Pressable>

          {mExerciseInstruction ? (
            <VStack space="sm">
              <Text weight="bold">Instructions</Text>
              <Box className="bg-card rounded-sm p-4">
                <Text size="sm" muted className="leading-[22px]">{mExerciseInstruction}</Text>
              </Box>
            </VStack>
          ) : null}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
