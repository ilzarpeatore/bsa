import React, { useState, useEffect, useRef } from 'react';
import { Alert, Linking, ScrollView } from 'react-native';
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
      <ScreenHeader title="Sobre nosotros" onBack={() => navigation.goBack()} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        {mOption('document-text-outline', 'Política de privacidad', () => {
          navigation.navigate('MigratedPrivacyPolicy');
        })}
        <Divider />
        {/* Abre la web real (pedido explícito) en vez de navegar a
            MigratedTermsAndConditions -- esa pantalla interna solo tenía un
            texto placeholder en inglés sin actualizar, la web es la fuente
            real. Mismo cambio en home_screen_modern_v2.tsx (menú de
            Ajustes desde Home v2). */}
        {mOption('document-text-outline', 'Términos y condiciones', () => {
          Linking.openURL('https://bestronger.es/terms-and-conditions/');
        })}
        <Divider />
        {mOption('information-circle-outline', 'Sobre nosotros', () => {
          navigation.navigate('MigratedAboutUs');
        })}
        <Divider />
        {/* Requisito de atribución de la licencia Apache 2.0 del mapa
            muscular (github.com/vulovix/body-muscles, ver
            LICENSE-body-muscles.txt en el repo) -- esa licencia exige que el
            aviso de copyright llegue también al usuario final de la app
            compilada, no solo a quien lea el código fuente. Un Alert basta
            (no hace falta pantalla propia): reproduce el aviso íntegro del
            NOTICE. */}
        {mOption('ribbon-outline', 'Licencias de terceros', () => {
          Alert.alert(
            'Licencias de terceros',
            'Mapa muscular (Body Muscles)\n' +
              'Copyright 2024 Ivan Vulović\n' +
              'https://github.com/vulovix/body-muscles\n' +
              'Licenciado bajo Apache License, Version 2.0.',
          );
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
