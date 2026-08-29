import React from 'react';
import {  Pressable, View, StyleSheet, useWindowDimensions  } from 'react-native';
import {  useSafeAreaInsets  } from 'react-native-safe-area-context';
import {  Box  } from '@components/ui/box';
import {  Text  } from '@components/ui/text';
import {  Icon  } from '@components/ui/icon';
import {  useTutorial  } from '@store/TutorialContext';
import { C, FONT, RADIUS } from '../../pages/migrated/theme';
const SPOTLIGHT_PADDING = 6;

// Overlay global de coach-marks -- montado una vez en App.tsx (mismo patrón
// que WorkoutMinimizedBar/ScreenReviewFab). Recorta con 4 rectángulos
// oscuros alrededor del elemento activo (más simple y fiable que una
// máscara SVG) dejando ese hueco totalmente tocable -- el usuario interactúa
// con el elemento real de debajo, y el reto avanza solo cuando esa acción
// real tiene éxito (reportAction/navegación), nunca con un botón "Siguiente".
//
// Bug real corregido (reportado: tocar el hueco del spotlight no hacía
// nada, solo "Saltar tutorial" respondía): esto vivía dentro de un
// <Modal transparent>, que en iOS/Android se presenta en una ventana nativa
// aparte -- pointerEvents="box-none" solo controla el hit-testing DENTRO del
// propio árbol de ese Modal, no hace que la pantalla de debajo (una
// ventana/jerarquía nativa distinta) vuelva a ser interactiva. El toque en
// el "hueco" no llegaba nunca a la tarjeta real de Home, aunque se viera
// perfectamente. Sustituido por un <View> absoluto normal, hermano del
// resto de overlays globales (WorkoutMinimizedBar/ScreenReviewFab, que
// nunca usaron Modal por esto mismo) -- al vivir en el mismo árbol/ventana
// que la pantalla real, pointerEvents="box-none" sí funciona de verdad.
export default function TutorialOverlay() {
  const { activeChallenge, activeStep, activeStepIndex, activeTargetRect, skipChallenge } = useTutorial();
  const insets = useSafeAreaInsets();
  // useWindowDimensions (auditoría 2026-08-29, P2-3) en vez de
  // Dimensions.get('window') leído una vez en el cuerpo del componente --
  // ese valor no era reactivo a rotación/resize (split-screen Android/iPad),
  // así que el spotlight/máscara podían quedar calculados contra el tamaño
  // de pantalla anterior hasta el siguiente cambio de paso.
  const { height: screenH } = useWindowDimensions();

  if (!activeChallenge || !activeStep) return null;

  // Paso con targetId pero cuyo elemento todavía no se ha registrado (el
  // usuario no ha llegado a esa pantalla) -- no se muestra nada hasta que
  // TutorialTarget lo mida y aparezca.
  if (activeStep.targetId && !activeTargetRect) return null;

  // accessibilityLabel/Role (auditoría 2026-08-29, P2-4): antes no había
  // ninguna señal para un lector de pantalla, ni en "Saltar tutorial" ni en
  // el propio coach-mark -- indistinguible del resto de la pantalla
  // oscurecida.
  const skipBtn = (
    <Pressable
      onPress={skipChallenge}
      style={[styles.skipBtn, { top: insets.top + 10 }]}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Saltar tutorial"
    >
      <Text style={styles.skipText}>Saltar tutorial</Text>
    </Pressable>
  );

  // Paso sin elemento fijo que señalar (ej. "elige cualquier hábito de la
  // biblioteca") -- aviso flotante abajo, sin oscurecer la pantalla.
  if (!activeStep.targetId) {
    return (
      <View style={styles.root} pointerEvents="box-none">
        {skipBtn}
        <Box
          style={[styles.banner, { bottom: insets.bottom + 24 }]}
          accessibilityRole="text"
          accessibilityLabel={`${activeStep.title}. ${activeStep.text}`}
        >
          <Text style={styles.tooltipTitle}>{activeStep.title}</Text>
          <Text style={styles.tooltipText}>{activeStep.text}</Text>
        </Box>
      </View>
    );
  }

  const rect = activeTargetRect!;
  const padded = {
    x: Math.max(0, rect.x - SPOTLIGHT_PADDING),
    y: Math.max(0, rect.y - SPOTLIGHT_PADDING),
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  };
  const spaceBelow = screenH - (padded.y + padded.height);
  const tooltipBelow = spaceBelow > 160;

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Estas 4 franjas SÍ deben bloquear el toque (no llevan pointerEvents
          "none"): son la máscara oscura, y nada de lo que tapan debe poder
          tocarse. El propio hueco central, sin ninguna vista encima, deja
          pasar el toque gracias al pointerEvents="box-none" del root. */}
      <Box style={[styles.mask, { left: 0, top: 0, right: 0, height: padded.y }]} />
      <Box style={[styles.mask, { left: 0, top: padded.y + padded.height, right: 0, bottom: 0 }]} />
      <Box style={[styles.mask, { left: 0, top: padded.y, width: padded.x, height: padded.height }]} />
      <Box style={[styles.mask, { left: padded.x + padded.width, top: padded.y, right: 0, height: padded.height }]} />
      {/* Solo decorativo (borde alrededor del hueco) -- pointerEvents="none"
          para no bloquear el propio hueco que enmarca. */}
      <Box
        pointerEvents="none"
        style={[styles.spotlightBorder, { left: padded.x, top: padded.y, width: padded.width, height: padded.height }]}
      />

      {skipBtn}

      <Box
        style={[
          styles.tooltip,
          tooltipBelow ? { top: padded.y + padded.height + 12 } : { bottom: screenH - padded.y + 12 },
        ]}
        accessibilityRole="text"
        accessibilityLabel={`${activeChallenge.label}, paso ${activeStepIndex + 1} de ${activeChallenge.steps.length}. ${activeStep.title}. ${activeStep.text}. Tócalo para continuar.`}
      >
        <Text style={styles.stepCounter}>
          {activeChallenge.label} · {activeStepIndex + 1}/{activeChallenge.steps.length}
        </Text>
        <Text style={styles.tooltipTitle}>{activeStep.title}</Text>
        <Text style={styles.tooltipText}>{activeStep.text}</Text>
        <Box style={styles.tooltipHint}>
          <Icon name="hand-left-outline" size={14} color={C.orange} />
          <Text style={styles.tooltipHintText}>Tócalo para continuar</Text>
        </Box>
      </Box>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sin Modal, hay que fijar el stacking a mano -- mismo zIndex/elevation que
  // WorkoutMinimizedBar (ver ese archivo) para quedar por encima de la barra
  // de pestañas y el minimizador de workout, que también son overlays planos.
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, elevation: 60 },
  mask: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.72)' },
  spotlightBorder: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.orange,
  },
  skipBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  skipText: { fontSize: 12, fontFamily: FONT.semiBold, color: '#FFFFFF' },
  tooltip: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    padding: 16,
  },
  banner: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    padding: 16,
  },
  stepCounter: { fontSize: 11, fontFamily: FONT.semiBold, color: C.orange, marginBottom: 6 },
  tooltipTitle: { fontSize: 15, fontFamily: FONT.bold, color: C.textPrimary, marginBottom: 4 },
  tooltipText: { fontSize: 13.5, fontFamily: FONT.regular, color: C.textSecondary, lineHeight: 19 },
  tooltipHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  tooltipHintText: { fontSize: 12, fontFamily: FONT.medium, color: C.orange },
});
