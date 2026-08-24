import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C, C_DARK, isNightHour } from '../pages/migrated/theme';

export type ThemePreference = 'auto' | 'light' | 'dark';

const STORAGE_KEY = '@befit_theme_preference';

interface AppColorModeContextValue {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  mode: 'light' | 'dark';
  colors: typeof C;
}

const AppColorModeContext = createContext<AppColorModeContextValue | null>(null);

// Modo oscuro automático por hora del dispositivo (Home v2, 2026-08-21) --
// 'auto' sigue isNightHour (mismo criterio que la foto de noche del hero),
// pero el usuario puede fijar 'light'/'dark' manualmente y eso manda sobre
// la hora hasta que vuelva a elegir 'auto'.
//
// Convertido de hook con useState propio a Context (2026-08-24): con
// MigratedAppearance como segundo consumidor real (además de Home v2), cada
// llamada a un hook con estado local habría creado una instancia
// independiente -- cambiar el tema en Aspecto no se habría reflejado en Home
// hasta remontar (un stack navigator no remonta la pantalla de abajo al
// volver con goBack). Mismo patrón ya usado en store/TabBarScrollContext.tsx
// para el mismo tipo de problema. El nombre del hook (`useAppColorMode`) no
// cambia, así que Home v2 sigue funcionando sin tocar su código.
export function AppColorModeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('auto');
  const [autoIsDark, setAutoIsDark] = useState(() => isNightHour(new Date().getHours()));

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'auto' || saved === 'light' || saved === 'dark') setPreferenceState(saved);
    });
  }, []);

  const recomputeAuto = useCallback(() => {
    setAutoIsDark(isNightHour(new Date().getHours()));
  }, []);

  useEffect(() => {
    if (preference !== 'auto') return;
    recomputeAuto();
    // Sin timer corriendo todo el rato -- basta con recalcular al volver a
    // primer plano (cubre dejar la app abierta de un lado a otro del
    // amanecer/atardecer mientras estaba en segundo plano).
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') recomputeAuto();
    });
    return () => sub.remove();
  }, [preference, recomputeAuto]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const mode: 'light' | 'dark' = preference === 'auto' ? (autoIsDark ? 'dark' : 'light') : preference;
  const colors = mode === 'dark' ? C_DARK : C;

  const value = useMemo(
    () => ({ preference, setPreference, mode, colors }),
    [preference, setPreference, mode, colors]
  );

  return React.createElement(AppColorModeContext.Provider, { value }, children);
}

// Fuera del Provider (no debería pasar -- se monta cerca de la raíz en
// App.tsx -- pero por seguridad, mismo criterio que TabBarScrollContext.tsx)
// -- modo claro fijo en vez de reventar.
const NOOP_VALUE: AppColorModeContextValue = {
  preference: 'auto',
  setPreference: () => {},
  mode: 'light',
  colors: C,
};

export function useAppColorMode(): AppColorModeContextValue {
  const ctx = useContext(AppColorModeContext);
  return ctx ?? NOOP_VALUE;
}
