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
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="Sobre nosotros" onBack={() => navigation.goBack()} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <VStack space="md">
          <Box>
            <Heading size="md">Be Stronger</Heading>
            <Box style={{ marginTop: 4 }} className="w-28 h-0.5 bg-muted" />
          </Box>
          {/* Texto provisional -- sustitúyelo por la descripción real que
              quieras mostrar aquí (antes había un TODO literal visible en
              pantalla). */}
          <Text muted className="leading-6">
            {'Be Stronger es tu compañero de entrenamiento: planifica tus rutinas, sigue tu progreso y mantente en contacto con tu entrenador, todo desde un mismo sitio.'}
          </Text>

          <Pressable className="flex-row items-center gap-2" onPress={() => launchUrl('mailto:contacto@bestronger.es')}>
            <AppIcon name="mail-outline" size={18} color={C.blue} bg={C.blue10} containerSize={36} borderRadius={12} />
            <Text muted>{'contacto@bestronger.es'}</Text>
          </Pressable>

          <Pressable className="flex-row items-center gap-2" onPress={() => launchUrl('tel:+34643991086')}>
            <AppIcon name="call-outline" size={18} color={C.orange} bg="rgba(255,107,53,0.15)" containerSize={36} borderRadius={12} />
            <Text muted>{'+34 643 99 10 86'}</Text>
          </Pressable>
        </VStack>
      </ScrollView>

      <Box style={{ paddingBottom: 8 }} className="h-28 border-t border-border items-center justify-center">
        <Text muted size="sm">Síguenos</Text>
        {/* Sin cuenta real todavía a la que enlazar (pedido explícito) --
            iconos puramente decorativos por ahora, sin onPress. Cuando haya
            cuentas reales, enlázalas aquí igual que el email/teléfono de
            arriba. */}
        <Box style={{ marginTop: 10 }} className="flex-row items-center gap-6">
          <Pressable>
            <AppIcon name="logo-facebook" size={22} color={C.blue} bg={C.blue10} containerSize={48} borderRadius={16} />
          </Pressable>
          <Pressable>
            <AppIcon name="logo-instagram" size={22} color={C.destructive} bg={C.destructive10} containerSize={48} borderRadius={16} />
          </Pressable>
          <Pressable>
            <AppIcon name="logo-twitter" size={22} color={C.blue} bg={C.blue10} containerSize={48} borderRadius={16} />
          </Pressable>
          <Pressable>
            <AppIcon name="logo-linkedin" size={22} color={C.blue} bg={C.blue10} containerSize={48} borderRadius={16} />
          </Pressable>
        </Box>
        <Text muted size="xs" style={{ marginTop: 6 }}>{'© 2026 Be Stronger. Todos los derechos reservados.'}</Text>
      </Box>
    </SafeAreaView>
  );
}
