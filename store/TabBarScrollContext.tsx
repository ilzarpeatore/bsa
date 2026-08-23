import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

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
}

const TabBarScrollContext = createContext<TabBarScrollContextValue | null>(null);

export function TabBarScrollProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  const reportScrollY = useCallback((y: number) => {
    setCollapsed(y > TAB_BAR_COLLAPSE_THRESHOLD);
  }, []);

  const value = useMemo(() => ({ collapsed, setCollapsed, reportScrollY }), [collapsed, reportScrollY]);

  return <TabBarScrollContext.Provider value={value}>{children}</TabBarScrollContext.Provider>;
}

// Fuera del Tab.Navigator (auth, onboarding) no hay provider -- no-op seguro
// en vez de reventar, en vez de exigir que cada pantalla sepa si está o no
// dentro de la barra de pestañas.
const NOOP_VALUE: TabBarScrollContextValue = {
  collapsed: false,
  setCollapsed: () => {},
  reportScrollY: () => {},
};

export function useTabBarScroll(): TabBarScrollContextValue {
  const ctx = useContext(TabBarScrollContext);
  return ctx ?? NOOP_VALUE;
}
