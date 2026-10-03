import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@components/ui/text';
import { Icon } from '@components/ui/icon';

// Antes/después con deslizador: la foto "después" ocupa todo el marco y la
// "antes" se ve a la izquierda del tirador. Se arrastra en cualquier punto
// de la imagen, no solo en el tirador.
interface Props {
  beforeUri: string;
  afterUri: string;
  beforeLabel: string;
  afterLabel: string;
  aspectRatio?: number;
}

export default function BeforeAfterSlider({
  beforeUri,
  afterUri,
  beforeLabel,
  afterLabel,
  aspectRatio = 3 / 4,
}: Props) {
  const [width, setWidth] = useState(0);
  const [pos, setPos] = useState(0.5);
  const widthRef = useRef(0);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Que el ScrollView padre no robe el gesto horizontal.
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => move(e.nativeEvent.locationX),
        onPanResponderMove: (e) => move(e.nativeEvent.locationX),
      }),
    [],
  );

  function move(x: number) {
    const w = widthRef.current;
    if (!w) return;
    setPos(Math.min(1, Math.max(0, x / w)));
  }

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    setWidth(e.nativeEvent.layout.width);
  };

  const split = width * pos;

  return (
    <View
      onLayout={onLayout}
      style={{
        width: '100%',
        aspectRatio,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#111',
      }}
      {...responder.panHandlers}>
      <Image
        source={{ uri: afterUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        pointerEvents="none"
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: split,
          overflow: 'hidden',
        }}>
        <Image source={{ uri: beforeUri }} style={{ width, height: '100%' }} contentFit="cover" />
      </View>

      <View pointerEvents="none" style={[styles.line, { left: split - 1 }]} />
      <View pointerEvents="none" style={[styles.handle, { left: split - 18 }]}>
        <Icon name="code-outline" size={18} color="#111" />
      </View>

      <View pointerEvents="none" style={[styles.tag, { left: 10 }]}>
        <Text size="xs" weight="bold" style={{ color: '#fff' }}>
          {beforeLabel}
        </Text>
      </View>
      <View pointerEvents="none" style={[styles.tag, { right: 10 }]}>
        <Text size="xs" weight="bold" style={{ color: '#fff' }}>
          {afterLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#fff' },
  handle: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    position: 'absolute',
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
