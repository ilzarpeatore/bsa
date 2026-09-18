import React, { useCallback } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

// Mismo orden que TAB_ROOT_SCREEN en App.tsx (InicioTab, PlanDiarioTab,
// NutritionTab, HabitsTab) -- se repite aquí en vez de importarse porque
// App.tsx no exporta nada (es el punto de entrada) y las 4 pantallas raíz
// que usan esto (home_screen_modern_v2, my_program_calendar_screen,
// plan_screen, habits_list_screen) no deberían depender de él.
export const HOME_TAB_ORDER = ['InicioTab', 'PlanDiarioTab', 'NutritionTab', 'HabitsTab'] as const;
export type HomeTabName = (typeof HOME_TAB_ORDER)[number];

// pt de arrastre horizontal para disparar el cambio de pestaña -- mismo
// orden de magnitud que CALENDAR_SWIPE_THRESHOLD en
// my_program_calendar_screen.tsx.
const SWIPE_THRESHOLD = 60;

type NativeGesture = ReturnType<typeof Gesture.Native>;

interface HomeSwipeNavProps {
  tab: HomeTabName;
  navigation?: { navigate: (name: string) => void };
  children: React.ReactElement;
  // Gestos Gesture.Native() de carruseles horizontales (ScrollView
  // horizontal) dentro de la pantalla -- el swipe de pestaña espera a que
  // fallen antes de activarse, para no robarle el deslizamiento a un
  // carrusel cuando el usuario arrastra dentro de él en vez de en el resto
  // de la pantalla.
  protectedGestures?: NativeGesture[];
}

// Deslizar horizontalmente en la pantalla raíz de cada pestaña de Home
// (Inicio / Plan del día / Nutrición / Hábitos) navega a la pestaña
// siguiente/anterior, además del uso normal de la barra inferior (pedido
// explícito 2026-09-18). Solo debe usarse en la pantalla raíz de cada
// pestaña -- nunca en pantallas de detalle dentro del stack -- para no
// competir con el swipe-to-go-back nativo de iOS (que solo existe cuando
// hay una pantalla previa en el stack de esa pestaña).
export default function HomeSwipeNav({
  tab,
  navigation,
  children,
  protectedGestures,
}: HomeSwipeNavProps) {
  const index = HOME_TAB_ORDER.indexOf(tab);

  const goToTab = useCallback(
    (name: HomeTabName) => {
      navigation?.navigate(name);
    },
    [navigation],
  );

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (e.translationX <= -SWIPE_THRESHOLD && index < HOME_TAB_ORDER.length - 1) {
        runOnJS(goToTab)(HOME_TAB_ORDER[index + 1]);
      } else if (e.translationX >= SWIPE_THRESHOLD && index > 0) {
        runOnJS(goToTab)(HOME_TAB_ORDER[index - 1]);
      }
    });
  if (protectedGestures?.length) {
    swipeGesture.requireExternalGestureToFail(...protectedGestures);
  }

  return <GestureDetector gesture={swipeGesture}>{children}</GestureDetector>;
}
