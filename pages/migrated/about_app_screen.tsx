import React, { useState, useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Divider } from '@components/ui/divider';
import ScreenHeader from '@components/ScreenHeader';
import logger from '@helper/logger';
import { useAppColorMode } from '@helper/useAppColorMode';

const mOption = (icon: string, title: string, onPress: () => void) => (
  <Pressable
    className="flex-row items-center gap-3 px-4 py-4 bg-card"
    onPress={onPress}
  >
    <Box className="w-9 h-9 rounded-md bg-secondary items-center justify-center">
      <Icon name={icon as any} size={20} className="text-foreground" />
    </Box>
    <Text className="flex-1">{title}</Text>
    <Icon name="chevron-forward" size={18} className="text-muted-foreground" />
  </Pressable>
);

export default function AboutAppScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const [aboutPages, setAboutPages] = useState<any[]>([]);
  const loadingRef = useRef(true);

  useEffect(() => {
    loadAppSettings();
  }, []);

  async function loadAppSettings() {
    try {
      // TODO: Replace with actual API call
      // const response = await getAppSettingApi();
      // let pages = response.pages ?? [];
      // pages.sort((a: any, b: any) => (a.title ?? '').localeCompare(b.title ?? ''));
      // setAboutPages(pages);
      loadingRef.current = false;
    } catch (e) {
      logger.error('Error loading settings:', e);
      loadingRef.current = false;
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="About App" onBack={() => navigation.goBack()} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        {mOption('document-text-outline', 'Privacy Policy', () => {
          // TODO: navigation.navigate('PrivacyPolicyScreen')
        })}
        <Divider />
        {mOption('document-text-outline', 'Terms of Services', () => {
          // TODO: navigation.navigate('TermsAndConditionScreen')
        })}
        <Divider />
        {mOption('information-circle-outline', 'About Us', () => {
          navigation.navigate('MigratedAboutUs');
        })}
        <Divider />
        {aboutPages.map((page: any, index: number) => (
          <Box key={index}>
            {mOption('information-circle-outline', page.title ?? '', () => {
              // TODO: navigation.navigate('InAppWebPage', { url: page.url, title: page.title })
            })}
            <Divider />
          </Box>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
