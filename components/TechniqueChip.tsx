import React, { useState } from 'react';

import { HStack } from '@components/ui/hstack';
import { Text } from '@components/ui/text';
import { Icon } from '@components/ui/icon';
import { Pressable } from '@components/ui/pressable';
import { useAppColorMode } from '@helper/useAppColorMode';
import { formatTechnique, type TechniqueInfo } from '../pages/migrated/workoutTechnique';
import TechniqueSheet from './TechniqueSheet';

type Variant =
  /** Bajo el subtítulo del ejercicio abierto: llamativa, con fondo. */
  | 'chip'
  /** Filas plegadas y vista previa: una línea pequeña. */
  | 'compact'
  /** Debajo de la serie concreta en la que va la técnica. */
  | 'row';

/**
 * Aviso de técnica especial que el coach ha marcado en el ejercicio
 * (⚡ Rest-pause · última serie). Al pulsarlo abre la ficha completa
 * (TechniqueSheet) con el paso a paso. Lleva su propio estado de apertura,
 * así cada pantalla solo tiene que pintarlo.
 */
export default function TechniqueChip({
  info,
  variant = 'chip',
  exerciseTitle,
  style,
}: {
  info: TechniqueInfo | null;
  variant?: Variant;
  exerciseTitle?: string;
  style?: object;
}) {
  const { colors: C } = useAppColorMode();
  const [open, setOpen] = useState(false);
  if (!info) return null;

  const text = variant === 'row' ? `${info.label} en esta serie` : formatTechnique(info);
  const small = variant !== 'chip';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel={`Técnica especial: ${formatTechnique(info)}. Ver cómo hacerla`}
        style={[
          { alignSelf: 'flex-start', marginTop: small ? 4 : 8 },
          variant === 'chip' && { backgroundColor: C.orange10, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
          variant === 'row' && { marginTop: -2, marginBottom: 8, marginLeft: 4 },
          style,
        ]}
      >
        <HStack space="xs" className="items-center">
          <Icon name="flash" size={small ? 12 : 14} color={C.orange60} />
          <Text weight="semibold" style={{ fontSize: small ? 12 : 13, color: C.orange60 }} numberOfLines={1}>
            {text}
          </Text>
          <Icon name="chevron-forward" size={small ? 11 : 13} color={C.orange60} />
        </HStack>
      </Pressable>
      <TechniqueSheet visible={open} onClose={() => setOpen(false)} info={info} exerciseTitle={exerciseTitle} />
    </>
  );
}
