import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image as ExpoImage, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@components/ui/icon';
import { RADIUS } from '../pages/migrated/theme';

interface Props {
  image: ImageSource | number;
  height?: number;
  onBack: () => void;
}

// Cabecera con foto para las guías estáticas (Guía de Autogestión, Guía de
// Sobrentrenamiento...) -- mismo patrón que ExerciseMediaHeader (foto de
// altura fija + botón atrás flotante con su propio inset), extraído aparte
// porque las guías no tienen play/favorito, solo volver.
export default function GuidePhotoHeader({ image, height = 240, onBack }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ height }}>
      <ExpoImage source={image} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
      <Pressable
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={onBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="chevron-back" size={22} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
