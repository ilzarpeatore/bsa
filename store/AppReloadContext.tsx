import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface AppReloadContextValue {
  reloadKey: number;
  reloadApp: () => void;
}

const AppReloadContext = createContext<AppReloadContextValue | null>(null);

// "Borrar caché y recargar todos los datos" (Ajustes, pedido explícito con
// captura de referencia). Esta app no tiene una capa de caché centralizada
// (cada pantalla gestiona su propio fetch en useState/useEffect) -- así que
// "recargar todos los datos" se implementa remontando el NavigationContainer
// entero (key={reloadKey} en App.tsx), no vaciando AsyncStorage. Cada
// pantalla que estuviera montada vuelve a hacer su fetch inicial desde cero,
// que es el efecto real que se pide.
//
// Deliberadamente NO se toca AsyncStorage: varias claves guardan datos
// reales que se perderían sin poder recuperarse -- sesión de entrenamiento
// en curso (workout_session_screen.tsx), borrador de respuestas de
// onboarding v2, recordatorios personalizados (sin backend todavía, ver
// docs/PENDIENTE_BACKEND_ADMIN.md #7). Borrarlos de un botón "limpiar caché"
// sería un bug real, no una limpieza -- por eso el reload es un remount de
// React, no un AsyncStorage.clear().
export function AppReloadProvider({ children }: { children: React.ReactNode }) {
  const [reloadKey, setReloadKey] = useState(0);
  const reloadApp = useCallback(() => setReloadKey((k) => k + 1), []);
  const value = useMemo(() => ({ reloadKey, reloadApp }), [reloadKey, reloadApp]);
  return <AppReloadContext.Provider value={value}>{children}</AppReloadContext.Provider>;
}

const NOOP_VALUE: AppReloadContextValue = { reloadKey: 0, reloadApp: () => {} };

export function useAppReload(): AppReloadContextValue {
  const ctx = useContext(AppReloadContext);
  return ctx ?? NOOP_VALUE;
}
