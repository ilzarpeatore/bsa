import React from 'react';
import { Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Heading } from '@components/ui/heading';
import { Text } from '@components/ui/text';
import { Button, ButtonText } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { useAppColorMode } from '@helper/useAppColorMode';

interface Props {
  // Título del entrenamiento que YA está en curso (el de la barra flotante).
  activeTitle?: string;
  // Abre el entrenamiento en curso.
  onContinue: () => void;
  // Pide confirmación para descartar el entrenamiento en curso y empezar
  // el que se acaba de abrir.
  onCancelActive: () => void;
  // Salir sin hacer nada (X de arriba y "Volver").
  onBack: () => void;
}

/**
 * Pantalla "Ya tienes un entrenamiento en curso" (2026-09-24, extraída de
 * workout_session_screen.tsx para poder testearla). Solo pinta y avisa --
 * qué hace cada botón lo decide la pantalla de sesión (ver
 * continueActiveSession / discardActiveAndStartThis allí).
 */
export default function WorkoutInProgressConflict({ activeTitle, onContinue, onCancelActive, onBack }: Props) {
  const { colors: C } = useAppColorMode();
  const title = activeTitle || 'tu entrenamiento';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Box
        className="flex-row items-center px-5"
        style={{ paddingTop: Platform.OS === 'ios' ? 12 : 16, paddingBottom: 12 }}
      >
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar">
          <Icon name="close" size={26} color={C.textPrimary} />
        </Pressable>
      </Box>
      <Box className="flex-1 items-center justify-center px-8">
        <Icon name="alert-circle-outline" size={44} color={C.warning60} />
        <Heading size="md" className="text-center" style={{ marginTop: 16 }}>
          Ya tienes un entrenamiento en curso
        </Heading>
        <Text muted className="text-center" style={{ marginTop: 8, fontSize: 14, lineHeight: 20 }}>
          Tienes &ldquo;{title}&rdquo; sin terminar. Continúalo o cancélalo para empezar este.
        </Text>
        <Button
          radius="pill"
          style={{ marginTop: 24, alignSelf: 'stretch' }}
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel={`Continuar entrenamiento en curso: ${title}`}
        >
          <ButtonText>Continuar entrenamiento en curso</ButtonText>
        </Button>
        <Button
          radius="pill"
          variant="outline"
          style={{ marginTop: 12, alignSelf: 'stretch' }}
          onPress={onCancelActive}
          accessibilityRole="button"
          accessibilityLabel={`Cancelar entrenamiento en curso: ${title}`}
        >
          <ButtonText>Cancelar entrenamiento en curso</ButtonText>
        </Button>
        <Pressable
          style={{ marginTop: 16 }}
          hitSlop={12}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Volver sin hacer nada"
        >
          <Text muted style={{ fontSize: 13, lineHeight: 18 }}>
            Volver
          </Text>
        </Pressable>
      </Box>
    </SafeAreaView>
  );
}
