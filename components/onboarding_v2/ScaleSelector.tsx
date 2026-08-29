import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, FONT } from '../../pages/migrated/theme';

interface Props {
  min: number;
  max: number;
  value: number | undefined;
  onChange: (value: number) => void;
}

const THUMB_SIZE = 44;
const TRACK_HEIGHT = 56;

// Bloque continuo arrastrable con degradado rojo→verde (pedido explícito:
// nivel bajo = rojo, nivel alto = verde) -- sustituye la cuadrícula de
// círculos 1-10 anterior (un tap por número) por un único slider. A
// diferencia de RulerPicker/NumberWheelPicker (misma carpeta, ambos ruedas
// horizontales por ScrollView) aquí la metáfora es un slider real -- pista
// fija con relleno de color + una única "bola" que se arrastra encima, así
// que se implementa con PanResponder (sin depender del Slider genérico de
// components/ui, que usa @react-stately/slider vía gluestack y no tiene
// ningún uso real todavía en la app para confiar en su gesto táctil en RN
// sin poder probarlo en dispositivo).
export default function ScaleSelector({ min, max, value, onChange }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [liveValue, setLiveValue] = useState<number | null>(null);
  const trackRef = useRef<View>(null);
  // pageX de la pista (coordenadas de pantalla, fijas mientras no cambie el
  // layout) -- necesario porque `nativeEvent.locationX` NO sirve aquí: en
  // eventos onPanResponderMove, locationX es la posición relativa a la
  // subvista que esté bajo el dedo en ESE frame (pista, thumb, etc.), y al
  // arrastrar rápido el dedo pasa de una subvista a otra entre frames, así
  // que el valor salta/resetea en cada evento (bug conocido de PanResponder
  // en RN). gestureState.moveX da coordenadas de página estables sea cual
  // sea la subvista tocada, así que restándole este offset fijo se obtiene
  // la posición real dentro de la pista sin saltos.
  const trackPageXRef = useRef(0);

  const valueFromX = useCallback(
    (x: number, width: number) => {
      if (width <= 0) return min;
      const ratio = Math.min(1, Math.max(0, x / width));
      return Math.min(max, Math.max(min, Math.round(min + ratio * (max - min))));
    },
    [min, max]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (_e, gestureState) =>
          setLiveValue(valueFromX(gestureState.moveX - trackPageXRef.current, trackWidth)),
        onPanResponderMove: (_e, gestureState) =>
          setLiveValue(valueFromX(gestureState.moveX - trackPageXRef.current, trackWidth)),
        onPanResponderRelease: (_e, gestureState) => {
          const v = valueFromX(gestureState.moveX - trackPageXRef.current, trackWidth);
          setLiveValue(null);
          onChange(v);
        },
        onPanResponderTerminate: () => setLiveValue(null),
      }),
    [valueFromX, trackWidth, onChange]
  );

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
    trackRef.current?.measure((_x, _y, _width, _height, pageX) => {
      trackPageXRef.current = pageX;
    });
  }, []);

  const displayValue = liveValue ?? value ?? min;
  const ratio = max > min ? (displayValue - min) / (max - min) : 0;
  const rawLeft = ratio * trackWidth - THUMB_SIZE / 2;
  const thumbLeft = trackWidth > 0 ? Math.min(trackWidth - THUMB_SIZE, Math.max(0, rawLeft)) : 0;

  return (
    <View>
      <View ref={trackRef} style={styles.track} onLayout={handleLayout} {...panResponder.panHandlers}>
        <LinearGradient
          colors={[C.destructive, C.warning, C.success]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {trackWidth > 0 && (
          <View style={[styles.thumb, { left: thumbLeft }]} pointerEvents="none">
            <Text style={styles.thumbText}>{displayValue}</Text>
          </View>
        )}
      </View>
      <View style={styles.captions}>
        <Text style={styles.captionText}>{min}</Text>
        <Text style={styles.captionText}>{max}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  thumbText: { fontSize: 17, fontFamily: FONT.bold, color: C.textPrimary },
  captions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 },
  captionText: { fontSize: 12, fontFamily: FONT.medium, color: C.gray40 },
});
