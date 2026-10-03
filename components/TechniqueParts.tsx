import React, { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';

import { HStack } from '@components/ui/hstack';
import { Text } from '@components/ui/text';
import { Icon } from '@components/ui/icon';
import { Pressable } from '@components/ui/pressable';
import { useAppColorMode } from '@helper/useAppColorMode';
import { hapticLight, hapticSuccess } from '@helper/haptics';
import { FONT } from '../pages/migrated/theme';
import {
  MAX_TECHNIQUE_PARTS,
  totalReps,
  type TechniquePart,
  type TechniquePartsConfig,
} from '../pages/migrated/workoutTechnique';

/**
 * Tramos extra de una serie con técnica (bajadas de un drop set, mini-series
 * de rest-pause / cluster / myo-reps). La serie principal guarda el primer
 * tramo; cada tramo de aquí se envía en `partes` (ver bckbs LoggedSetMath),
 * así el 1RM y los récords solo cuentan el primero.
 *
 * Si la técnica lleva pausa (15 s), al añadir el tramo arranca una cuenta
 * atrás con barra y vibra al terminar.
 */
export default function TechniqueParts({
  config,
  parts,
  mainCarga,
  mainReps,
  onChange,
}: {
  config: TechniquePartsConfig;
  parts: TechniquePart[];
  mainCarga?: string;
  mainReps?: string;
  onChange: (parts: TechniquePart[]) => void;
}) {
  const { colors: C } = useAppColorMode();
  const [pauseLeft, setPauseLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = useSharedValue(0);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    []
  );

  const stopPause = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPauseLeft(null);
  };

  const startPause = (seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const endsAt = Date.now() + seconds * 1000;
    setPauseLeft(seconds);
    progress.value = 1;
    progress.value = withTiming(0, { duration: seconds * 1000, easing: Easing.linear });
    timerRef.current = setInterval(() => {
      const left = Math.ceil((endsAt - Date.now()) / 1000);
      if (left <= 0) {
        stopPause();
        hapticSuccess();
        return;
      }
      setPauseLeft(left);
    }, 250);
  };

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const add = () => {
    if (parts.length >= MAX_TECHNIQUE_PARTS) return;
    const prev = parts.length ? parts[parts.length - 1].carga : mainCarga;
    const prevNum = parseFloat(prev ?? '');
    const next = config.nextWeight(Number.isFinite(prevNum) ? prevNum : null);
    hapticLight();
    onChange([...parts, { carga: next != null ? String(next) : '', reps: '' }]);
    if (config.pauseSeconds) startPause(config.pauseSeconds);
  };

  const update = (i: number, key: keyof TechniquePart, value: string) =>
    onChange(parts.map((p, j) => (j === i ? { ...p, [key]: value } : p)));

  const remove = (i: number) => {
    hapticLight();
    if (i === parts.length - 1) stopPause();
    onChange(parts.filter((_, j) => j !== i));
  };

  const total = totalReps(mainReps, parts);
  const inputStyle = {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontFamily: FONT.regular,
    fontSize: 13,
    textAlign: 'center' as const,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    color: C.textPrimary,
    backgroundColor: C.card,
  };

  return (
    <Animated.View layout={LinearTransition.springify().damping(18)} style={{ marginLeft: 28, marginBottom: 8 }}>
      {parts.map((p, i) => (
        <Animated.View key={i} entering={FadeInDown.springify().damping(16)} exiting={FadeOut.duration(150)} layout={LinearTransition}>
          <HStack className="items-center" space="xs" style={{ marginBottom: 6 }}>
            <View style={{ width: 2, alignSelf: 'stretch', backgroundColor: C.orange60, borderRadius: 1, marginRight: 4 }} />
            <Text style={{ fontSize: 11.5, color: C.orange60, fontFamily: FONT.semiBold, width: 74 }} numberOfLines={1}>
              {config.partLabel} {i + 1}
            </Text>
            <TextInput
              style={inputStyle}
              value={p.carga}
              onChangeText={(t) => update(i, 'carga', t)}
              keyboardType="numeric"
              placeholder="kg"
              placeholderTextColor={C.textSecondary}
              accessibilityLabel={`Carga de ${config.partLabel.toLowerCase()} ${i + 1}`}
            />
            <Text muted style={{ fontSize: 12 }}>
              ×
            </Text>
            <TextInput
              style={inputStyle}
              value={p.reps}
              onChangeText={(t) => update(i, 'reps', t)}
              keyboardType="numeric"
              placeholder="reps"
              placeholderTextColor={C.textSecondary}
              accessibilityLabel={`Repeticiones de ${config.partLabel.toLowerCase()} ${i + 1}`}
            />
            <Pressable onPress={() => remove(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Quitar ${config.partLabel.toLowerCase()} ${i + 1}`}>
              <Icon name="close" size={16} color={C.textSecondary} />
            </Pressable>
          </HStack>
        </Animated.View>
      ))}

      {pauseLeft != null ? (
        <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOut.duration(150)} style={{ marginBottom: 6 }}>
          <Pressable onPress={stopPause} accessibilityRole="button" accessibilityLabel={`Pausa, quedan ${pauseLeft} segundos. Pulsa para saltarla`}>
            <View style={{ backgroundColor: C.orange10, borderRadius: 8, overflow: 'hidden' }}>
              <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.orange60, opacity: 0.25 }, barStyle]} />
              <HStack className="items-center justify-between" style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12.5, fontFamily: FONT.semiBold, color: C.orange60 }}>Pausa · respira</Text>
                <Text style={{ fontSize: 15, fontFamily: FONT.bold, color: C.orange60, fontVariant: ['tabular-nums'] }}>{pauseLeft} s</Text>
              </HStack>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}

      <HStack className="items-center justify-between">
        {parts.length < MAX_TECHNIQUE_PARTS ? (
          <Pressable
            onPress={add}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Añadir ${config.addLabel.toLowerCase()}`}
            style={{ borderWidth: 1, borderColor: C.orange60, borderStyle: 'dashed', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 }}
          >
            <HStack className="items-center" space="xs">
              <Icon name="add" size={14} color={C.orange60} />
              <Text style={{ fontSize: 12, fontFamily: FONT.semiBold, color: C.orange60 }}>
                {config.addLabel}
                {config.pauseSeconds ? ` (pausa ${config.pauseSeconds} s)` : ''}
              </Text>
            </HStack>
          </Pressable>
        ) : (
          <View />
        )}
        {parts.length > 0 ? (
          <Text muted style={{ fontSize: 11.5 }}>
            Total {total} reps
          </Text>
        ) : null}
      </HStack>
    </Animated.View>
  );
}
