import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { HStack } from '@components/ui/hstack';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode, ThemePreference } from '@helper/useAppColorMode';
import { FONT } from './theme';

// Pantalla nueva (pedido explícito, captura de referencia de Bevel: "Aspecto"
// con tarjetas de vista previa en miniatura) -- solo se implementa la
// sección "Tema de la aplicación" (Sistema/Leve/Oscuro de la referencia),
// porque es la única con una función real detrás en esta app
// (useAppColorMode). Las otras 3 secciones de la referencia (tema del fondo
// de iOS, tema de los widgets, tema de icono de aplicación) son ajustes a
// nivel de sistema operativo o requieren capacidades nativas que este
// proyecto no tiene todavía (widgets de verdad, iconos alternativos
// empaquetados) -- construir esas tarjetas sin nada real detrás sería una UI
// que no hace nada al tocarla, así que se deja fuera a propósito en vez de
// simularlas.
const THEME_OPTIONS: { key: ThemePreference; label: string; icon: 'contrast-outline' | 'sunny-outline' | 'moon-outline' }[] = [
  { key: 'auto', label: 'Automático', icon: 'contrast-outline' },
  { key: 'light', label: 'Leve', icon: 'sunny-outline' },
  { key: 'dark', label: 'Oscuro', icon: 'moon-outline' },
];

// Mockup en miniatura (sin captura real) -- 3 puntos de color imitando los
// anillos de la tarjeta de referencia, sobre un fondo claro/oscuro/mitad y
// mitad según la opción, solo para que cada tarjeta se lea como "vista
// previa" real en vez de un simple botón de texto.
function ThemePreviewMock({ variant }: { variant: ThemePreference }) {
  return (
    <View
      style={[
        s.previewBox,
        variant === 'dark' && s.previewDark,
        variant === 'light' && s.previewLight,
        variant === 'auto' && s.previewAuto,
      ]}
    >
      {variant === 'auto' && <View style={s.previewAutoDarkHalf} />}
      <HStack space="xs" style={s.previewDots}>
        <View style={[s.dot, { borderColor: '#FF9500' }]} />
        <View style={[s.dot, { borderColor: '#34C759' }]} />
        <View style={[s.dot, { borderColor: '#0A84FF' }]} />
      </HStack>
    </View>
  );
}

export default function AppearanceScreen(props: any) {
  const { preference, setPreference, colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Aspecto" onBack={() => props.navigation.goBack()} />
      <Box style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <Text style={styles.sectionLabel}>Tema de la aplicación</Text>
        <Box style={styles.groupCard}>
          <HStack space="sm">
            {THEME_OPTIONS.map((opt) => {
              const active = preference === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[styles.optionCell, active && styles.optionCellActive]}
                  onPress={() => setPreference(opt.key)}
                >
                  <ThemePreviewMock variant={opt.key} />
                  <HStack space="xs" style={{ alignItems: 'center', marginTop: 10 }}>
                    <Icon name={opt.icon} size={14} color={active ? C.textPrimary : C.textSecondary} />
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{opt.label}</Text>
                  </HStack>
                </Pressable>
              );
            })}
          </HStack>
        </Box>
        <Text style={styles.hint}>
          &quot;Automático&quot; sigue la hora del dispositivo (amanece claro, anochece oscuro) — no el ajuste de tema del
          sistema operativo.
        </Text>
      </Box>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  previewBox: {
    width: '100%',
    aspectRatio: 0.72,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLight: { backgroundColor: '#FFFFFF' },
  previewDark: { backgroundColor: '#1C1C1E' },
  previewAuto: { backgroundColor: '#FFFFFF' },
  previewAutoDarkHalf: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '50%', backgroundColor: '#1C1C1E' },
  previewDots: { zIndex: 1 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, backgroundColor: 'transparent' },
});

// Estilos que dependen del tema actual (la propia pantalla de "Aspecto"
// también sigue el tema en vivo -- mismo patrón useMemo que
// home_screen_modern_v2.tsx, ya que aquí sí tiene sentido que responda al
// cambio en cuanto se toca una tarjeta, sin esperar a nada). Nombrada
// createStyles, no useStyle -- un nombre que empiece por "use" hace que
// ESLint la trate como si fuera un hook y bloquee llamarla dentro del
// useMemo de arriba (react-hooks/rules-of-hooks), aunque no lo sea.
function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    sectionLabel: { fontSize: 15, fontFamily: FONT.bold, color: C.textPrimary, marginBottom: 12 },
    groupCard: { backgroundColor: C.surface, borderRadius: 20, padding: 12 },
    optionCell: {
      flex: 1,
      borderRadius: 16,
      padding: 6,
      borderWidth: 2,
      borderColor: 'transparent',
      alignItems: 'center',
    },
    optionCellActive: { borderColor: C.textPrimary },
    optionLabel: { fontSize: 12, fontFamily: FONT.semiBold, color: C.textSecondary },
    optionLabelActive: { color: C.textPrimary },
    hint: { fontSize: 12, color: C.textSecondary, marginTop: 12, lineHeight: 17 },
  });
}
