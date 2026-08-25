import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColorMode } from '@helper/useAppColorMode';

export const HEADER_HEIGHT_RATIO = 0.45;

interface Props {
  headerHeight: number;
  thumbnailUrl: string | null;
  /** Si hay vídeo real reproducible, se pinta un botón de play encima de la miniatura. */
  onPlayPress?: () => void;
}

/**
 * Cabecera con media. Es un hijo normal (no animado) del ScrollView, con
 * altura fija — el scroll nativo ya la "colapsa" 1:1 sin remanente al
 * desplazarse por encima de ella, sin ningún cálculo por frame en JS.
 * Una versión anterior animaba `height` vía interpolate() en cada evento
 * de scroll (useNativeDriver:false) para lograr el mismo efecto, pero
 * forzaba un re-layout nativo en cada frame y producía vibración/jank
 * visible al hacer scroll — esta versión es más simple y no tiene ese
 * problema porque no anima nada.
 * Los iconos flotantes van fuera de este componente (posicionados
 * respecto a toda la pantalla, no a la media) para que sigan visibles
 * incluso cuando la media ya se desplazó fuera de la vista.
 */
function ExerciseMediaHeader({ headerHeight, thumbnailUrl, onPlayPress }: Props) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const media = thumbnailUrl ? (
    <Image source={{ uri: thumbnailUrl }} style={styles.image} contentFit="cover" />
  ) : (
    <View style={[styles.image, styles.imageFallback]}>
      <Ionicons name="barbell-outline" size={72} color={C.gray30} />
    </View>
  );

  return (
    <View style={[styles.wrap, { height: headerHeight }]}>
      {media}
      {onPlayPress ? (
        <Pressable
          style={({ pressed }) => [styles.playOverlay, pressed && { opacity: 0.8 }]}
          onPress={onPlayPress}
          accessibilityLabel="Reproducir vídeo del ejercicio"
        >
          <View style={styles.playButton}>
            <Ionicons name="play" size={30} color={C.white} style={styles.playIcon} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

export const ExerciseMediaHeaderMem = React.memo(ExerciseMediaHeader);

interface FloatingIconsProps {
  onBack: () => void;
  isFavourite: boolean;
  onToggleFavourite: () => void;
}

export function ExerciseHeaderFloatingIcons({ onBack, isFavourite, onToggleFavourite }: FloatingIconsProps) {
  // insets.top en vez del offset fijo que llevaba esto antes (50/40 segun
  // plataforma) -- ese numero solo era correcto en dispositivos sin Dynamic
  // Island; en iPhone 14 Pro+/15/16 el inset real de status bar es mayor,
  // así que los botones flotantes quedaban demasiado arriba, pegados o
  // tapados por la isla.
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const top = insets.top + 8;
  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.floatingBtn, styles.backBtn, { top }, pressed && { opacity: 0.2 }]}
        onPress={onBack}
      >
        <Ionicons name="chevron-back" size={22} color={C.white} />
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.floatingBtn, styles.favBtn, { top }, pressed && { opacity: 0.2 }]}
        onPress={onToggleFavourite}
      >
        <Ionicons name={isFavourite ? 'star' : 'star-outline'} size={20} color={C.white} />
      </Pressable>
    </>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: C.surfaceLight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    marginLeft: 4,
  },
  floatingBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backBtn: {
    left: 16,
  },
  favBtn: {
    right: 16,
  },
  });
}
