import React from 'react';
import { ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { VStack } from '@components/ui/vstack';
import { Text } from '@components/ui/text';
import { Heading } from '@components/ui/heading';
import { Pressable } from '@components/ui/pressable';
import AppIcon from '@components/AppIcon';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';

async function launchUrl(url: string) {
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  }
}

export default function AboutUsScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['bottom']}>
      <ScreenHeader title="About Us" onBack={() => navigation.goBack()} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <VStack space="md">
          <Box>
            <Heading size="md">MightyFitness</Heading>
            <Box style={{ marginTop: 4 }} className="w-28 h-0.5 bg-muted" />
          </Box>
          <Text muted className="leading-6">
            {'TODO: Replace with site description from stored settings'}
          </Text>

          <Pressable className="flex-row items-center gap-2">
            <AppIcon name="mail-outline" size={18} color={C.blue} bg={C.blue10} containerSize={36} borderRadius={12} />
            <Text muted>{'contact@example.com'}</Text>
          </Pressable>

          <Pressable className="flex-row items-center gap-2">
            <AppIcon name="chatbubble-ellipses-outline" size={18} color={C.success} bg={C.success10} containerSize={36} borderRadius={12} />
            <Text muted>{'support.example.com'}</Text>
          </Pressable>

          <Box className="flex-row items-center gap-2">
            <AppIcon name="call-outline" size={18} color={C.orange} bg="rgba(255,107,53,0.15)" containerSize={36} borderRadius={12} />
            <Text muted>{'+1 234 567 890'}</Text>
          </Box>
        </VStack>
      </ScrollView>

      <Box style={{ paddingBottom: 8 }} className="h-28 border-t border-border items-center justify-center">
        <Text muted size="sm">Follow Us</Text>
        <Box style={{ marginTop: 10 }} className="flex-row items-center gap-6">
          <Pressable onPress={() => launchUrl('https://facebook.com')}>
            <AppIcon name="logo-facebook" size={22} color={C.blue} bg={C.blue10} containerSize={48} borderRadius={16} />
          </Pressable>
          <Pressable onPress={() => launchUrl('https://instagram.com')}>
            <AppIcon name="logo-instagram" size={22} color={C.destructive} bg={C.destructive10} containerSize={48} borderRadius={16} />
          </Pressable>
          <Pressable onPress={() => launchUrl('https://twitter.com')}>
            <AppIcon name="logo-twitter" size={22} color={C.blue} bg={C.blue10} containerSize={48} borderRadius={16} />
          </Pressable>
          <Pressable onPress={() => launchUrl('https://linkedin.com')}>
            <AppIcon name="logo-linkedin" size={22} color={C.blue} bg={C.blue10} containerSize={48} borderRadius={16} />
          </Pressable>
        </Box>
        <Text muted size="xs" style={{ marginTop: 6 }}>{'© 2024 MightyFitness. All rights reserved.'}</Text>
      </Box>
    </SafeAreaView>
  );
}
