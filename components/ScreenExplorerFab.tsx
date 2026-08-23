import React from 'react';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';

interface Props {
  navigationRef: any;
}

// Acceso global a Screen Explorer (herramienta de desarrollo, pages/ScreenExplorer.tsx)
// -- antes vivía solo en Home v2, pero al dejar de ser pantalla raíz de una
// pestaña (rediseños de la barra del 2026-08-23) el botón se volvía
// inalcanzable salvo estando ahí. Montado como hermano del NavigationContainer
// (mismo patrón que ScreenReviewFab/WorkoutMinimizedBar en App.tsx) para que
// quede visible en cualquier pantalla, usando el navigationRef para navegar
// sin depender del prop `navigation` de la pantalla actual.
// Posición fija bottom-right, por encima de donde vive WorkoutMinimizedBar
// (pegado al borde inferior) y separada del "+" real de accesos rápidos
// (centrado sobre la barra flotante, ver NavigationTab.tsx `plusBtn`).
export default function ScreenExplorerFab({ navigationRef }: Props) {
  return (
    <Pressable
      style={{
        position: 'absolute',
        right: 16,
        bottom: 100,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 15,
      }}
      onPress={() => navigationRef?.current?.navigate('ScreenExplorer')}
    >
      <Icon name="construct-outline" size={20} color="#FFFFFF" />
    </Pressable>
  );
}
