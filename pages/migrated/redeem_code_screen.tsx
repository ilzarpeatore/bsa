import React, { useMemo, useState } from 'react';
import { ScrollView, Keyboard, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { showToast } from '@helper/toast';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { HStack } from '@components/ui/hstack';
import { VStack } from '@components/ui/vstack';
import { Button, ButtonText } from '@components/ui/button';
import { Input, InputField } from '@components/ui/input';
import { Spinner } from '@components/ui/spinner';
import ScreenHeader from '@components/ScreenHeader';
import { DeviceIconBadge as FieldBadge } from '@components/DeviceIcon';
import { subscriptionApi } from '@api/subscription';
import { useAppColorMode } from '@helper/useAppColorMode';
import { FONT, RADIUS } from './theme';

// "Tengo un código" (2026-09-30): canjea el código de un programa (pack)
// conseguido fuera de la app -- Bckbs docs/PACKS_WEB.md. Lo normal es que el
// programa llegue solo al registrarse con el mismo email; esto es el plan B.
// Apple 3.1.1/3.1.3: la app NO menciona compras, precios ni enlaces a la web,
// solo "código" -- no añadir aquí ninguna de esas cosas.
export default function RedeemCodeScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const localStyles = useMemo(() => createStyles(C), [C]);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ pack: string | null; started: boolean } | null>(null);

  const redeem = async () => {
    Keyboard.dismiss();
    const clean = code.replace(/[\s-]/g, '').toUpperCase();
    if (clean.length < 6) {
      showToast('Error', { description: 'Introduce el código completo', variant: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await subscriptionApi.redeemCode(clean);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setResult(res.data.data);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showToast('Error', {
        description: e?.response?.data?.message ?? 'No se pudo canjear el código',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="Tengo un código" onBack={() => navigation.goBack()} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {result ? (
          <Box style={[localStyles.card, { padding: 20 }]}>
            <HStack space="md" className="items-center">
              <FieldBadge ios="checkmark.seal.fill" android="verified" bg={C.success} />
              <VStack className="flex-1">
                <Text weight="bold">¡Código canjeado!</Text>
                <Text size="sm" muted style={{ marginTop: 2 }}>
                  {result.pack ? `«${result.pack}» ya está en tu cuenta.` : 'El programa ya está en tu cuenta.'}
                </Text>
              </VStack>
            </HStack>
            <Text size="sm" style={{ marginTop: 16 }}>
              {result.started
                ? 'Tu entrenamiento, tu nutrición y tus hábitos ya están en tu calendario.'
                : 'Empezará en cuanto termines el cuestionario inicial.'}
            </Text>
            <Button size="lg" radius="pill" onPress={() => navigation.goBack()} className="w-full" style={{ marginTop: 20 }}>
              <ButtonText>Listo</ButtonText>
            </Button>
          </Box>
        ) : (
          <>
            <Text size="sm" muted style={{ marginBottom: 20 }}>
              Si tienes un código de programa, introdúcelo aquí y se añadirá a tu cuenta.
            </Text>

            <Text style={localStyles.sectionLabel}>Código</Text>
            <Box style={localStyles.card}>
              <Box style={localStyles.row}>
                <HStack space="md" className="items-center">
                  <FieldBadge ios="ticket.fill" android="confirmation_number" bg={C.blue} />
                  <VStack className="flex-1">
                    <Input style={localStyles.input}>
                      <InputField
                        style={localStyles.codeText}
                        placeholder="XXXXXXXXXX"
                        placeholderTextColor={C.gray40}
                        value={code}
                        onChangeText={(v) => setCode(v.toUpperCase())}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        autoComplete="off"
                        maxLength={20}
                        returnKeyType="done"
                        onSubmitEditing={redeem}
                      />
                    </Input>
                  </VStack>
                </HStack>
              </Box>
            </Box>

            <Button
              size="lg"
              radius="pill"
              onPress={redeem}
              isDisabled={!code.trim()}
              className="w-full"
              style={{ marginTop: 24 }}
            >
              <ButtonText>Canjear</ButtonText>
            </Button>
          </>
        )}
      </ScrollView>

      {loading && (
        <Box
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          className="items-center justify-center"
        >
          <Spinner size="large" color={C.orange} />
        </Box>
      )}
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.md,
    },
    sectionLabel: {
      fontFamily: FONT.semiBold,
      fontSize: 13,
      color: C.textSecondary,
      marginBottom: 8,
      marginLeft: 4,
    },
    row: {
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    input: {
      borderWidth: 0,
      height: 32,
      backgroundColor: 'transparent',
    },
    codeText: {
      fontFamily: FONT.semiBold,
      fontSize: 18,
      letterSpacing: 2,
      color: C.textPrimary,
    },
  });
}
