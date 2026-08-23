import React, { useEffect, useState } from 'react';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  navigationRef: any;
}

// Únicas pantallas que muestran la barra de pestañas flotante real (ver
// TAB_ROOT_SCREEN en App.tsx) -- en cualquier otra pantalla (la inmensa
// mayoría, todas apiladas) no hay barra debajo.
const TAB_ROOT_ROUTES = new Set([
  'MigratedHomeModernV2',
  'MigratedMyProgramCalendar',
  'MigratedPlan',
  'MigratedHabits',
]);

// Acceso global a Screen Explorer (herramienta de desarrollo, pages/ScreenExplorer.tsx)
// -- antes vivía solo en Home v2, pero al dejar de ser pantalla raíz de una
// pestaña (rediseños de la barra del 2026-08-23) el botón se volvía
// inalcanzable salvo estando ahí. Montado como hermano del NavigationContainer
// (mismo patrón que ScreenReviewFab/WorkoutMinimizedBar en App.tsx) para que
// quede visible en cualquier pantalla, usando el navigationRef para navegar
// sin depender del prop `navigation` de la pantalla actual.
//
// Bug real corregido (reportado: "el botón sigue sobresaliendo del resto de
// secciones" en MigratedProgress): un `bottom` fijo único no puede servir a
// la vez a las 4 pantallas raíz de pestaña (que sí tienen la barra flotante
// debajo, y reservan TAB_BAR_CLEARANCE al final de su scroll) y a cualquier
// otra pantalla apilada (sin barra, sin ese hueco reservado -- ahí el
// contenido real llega hasta mucho más abajo). El valor fijo que evitaba
// tapar la barra en Home quedaba por ENCIMA del hueco real reservado en
// pantallas como Informe/Progreso, cayendo encima de la última tarjeta.
// Ahora se seguye la ruta activa (mismo patrón que el listener de
// TutorialContext.tsx) para elegir entre las dos posiciones correctas.
export default function ScreenExplorerFab({ navigationRef }: Props) {
  const insets = useSafeAreaInsets();
  const [onTabRoot, setOnTabRoot] = useState(false);

  useEffect(() => {
    if (!navigationRef?.current?.addListener) return;
    const sync = () => {
      const current = navigationRef.current?.getCurrentRoute?.()?.name;
      setOnTabRoot(!!current && TAB_ROOT_ROUTES.has(current));
    };
    sync();
    const unsubscribe = navigationRef.current.addListener('state', sync);
    return unsubscribe;
  }, [navigationRef]);

  return (
    <Pressable
      style={{
        position: 'absolute',
        right: 16,
        bottom: insets.bottom + (onTabRoot ? 90 : 20),
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(30,30,32,0.85)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 15,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      }}
      onPress={() => navigationRef?.current?.navigate('ScreenExplorer')}
    >
      <Icon name="construct-outline" size={20} color="#FFFFFF" />
    </Pressable>
  );
}
