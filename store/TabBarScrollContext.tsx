import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';

// Colapsar la barra de pestañas flotante al hacer scroll (pedido explícito,
// captura de referencia): la barra completa (4 pestañas + "+") solo se ve
// así en la parte superior de cada pantalla; en cuanto se hace scroll se
// pliega a un único círculo con el icono de la pestaña activa + el "+", y
// vuelve a desplegarse solo cuando el scroll regresa arriba del todo (no
// basta con "scrollear hacia arriba", tiene que llegar al principio).
//
// Un solo booleano compartido en vez de uno por pantalla porque NavigationTab
// vive fuera del árbol de cada screen (es el `tabBar` del Tab.Navigator) --
// cada pantalla raíz de pestaña reporta su propio scrollY aquí mediante
// `reportScrollY`, y NavigationTab (components/NavigationTab.tsx) resetea
// `collapsed` a false cuando cambia la pestaña activa (ver su propio
// useEffect sobre `state.index`), para no arrastrar el estado plegado de la
// pestaña anterior al entrar en una nueva ya sin haber hecho scroll ahí.
const TAB_BAR_COLLAPSE_THRESHOLD = 8;

interface TabBarScrollContextValue {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  reportScrollY: (y: number) => void;
  // Sube en CADA reportScrollY, aunque `collapsed` no cambie de valor --
  // pedido explícito: si el usuario fuerza la barra abierta tocando el
  // icono plegado, tiene que volver a plegarse en cuanto haya scroll real
  // de nuevo, no solo cuando `collapsed` cruce su umbral (si ya estaba
  // colapsado y sigue scrolleando en el mismo sentido, `collapsed` nunca
  // vuelve a cambiar de valor). Deliberadamente un `ref` leído bajo demanda
  // (no `useState`): algunas pantallas (Hábitos, Mi programa) llaman
  // reportScrollY() en cada tick de scroll sin gating -- si esto fuera
  // estado reactivo, forzaría un re-render de NavigationTab en cada tick
  // aunque nadie esté usando la apertura manual. NavigationTab solo lo
  // consulta con un intervalo ligero, y solo mientras esa apertura manual
  // está activa (ver expandFromCollapsed ahí).
  getScrollTick: () => number;
}

const TabBarScrollContext = createContext<TabBarScrollContextValue | null>(null);

export function TabBarScrollProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollTickRef = useRef(0);

  const reportScrollY = useCallback((y: number) => {
    setCollapsed(y > TAB_BAR_COLLAPSE_THRESHOLD);
    scrollTickRef.current += 1;
  }, []);

  const getScrollTick = useCallback(() => scrollTickRef.current, []);

  const value = useMemo(
    () => ({ collapsed, setCollapsed, reportScrollY, getScrollTick }),
    [collapsed, reportScrollY, getScrollTick]
  );

  return <TabBarScrollContext.Provider value={value}>{children}</TabBarScrollContext.Provider>;
}

// Fuera del Tab.Navigator (auth, onboarding) no hay provider -- no-op seguro
// en vez de reventar, en vez de exigir que cada pantalla sepa si está o no
// dentro de la barra de pestañas.
const NOOP_VALUE: TabBarScrollContextValue = {
  collapsed: false,
  setCollapsed: () => {},
  reportScrollY: () => {},
  getScrollTick: () => 0,
};

export function useTabBarScroll(): TabBarScrollContextValue {
  const ctx = useContext(TabBarScrollContext);
  return ctx ?? NOOP_VALUE;
}
