import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Toast, ToastTitle, ToastDescription } from '@components/ui/toast';
import { subscribeToasts, dismissToast, ToastItem } from '@helper/toast';

// Host global de toasts (ver helper/toast.ts) -- montado una sola vez cerca
// de la raiz en App.tsx, mismo criterio que WorkoutMinimizedBar/TutorialOverlay:
// un componente de UI global fuera del stack de navegacion, alimentado por un
// pub/sub a nivel de modulo en vez de props/Context.
export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <Box
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: insets.bottom + 24,
        zIndex: 100,
        elevation: 100,
        gap: 8,
        paddingHorizontal: 0,
      }}
    >
      {items.map((item) => (
        <Pressable key={item.id} onPress={() => dismissToast(item.id)}>
          <Toast action={item.variant}>
            <ToastTitle>{item.title}</ToastTitle>
            {item.description ? <ToastDescription>{item.description}</ToastDescription> : null}
          </Toast>
        </Pressable>
      ))}
    </Box>
  );
}
