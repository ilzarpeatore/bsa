import React, { useEffect } from 'react';
import { View, ViewProps , Appearance, ColorSchemeName } from 'react-native';
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { ToastProvider } from '@gluestack-ui/core/toast/creator';
import { colorScheme as nativeCssColorScheme } from 'react-native-css';

export type ModeType = 'light' | 'dark' | 'system';

export function GluestackUIProvider({
  mode = 'system',
  ...props
}: {
  mode?: ModeType;
  children?: React.ReactNode;
  style?: ViewProps['style'];
}) {
  useEffect(() => {
    Appearance.setColorScheme(mode as ColorSchemeName);
    // Appearance.setColorScheme() (arriba) actualiza la cache interna de
    // React Native pero NUNCA dispara el evento 'change' de Appearance --
    // solo lo dispara el evento real del sistema operativo (ver
    // node_modules/react-native/Libraries/Utilities/Appearance.js). El
    // motor que resuelve las clases de Tailwind/NativeWind (react-native-css)
    // inicializa su propio estado de color scheme UNA SOLA VEZ al arrancar
    // la app y desde ahi solo se entera de cambios via ESE evento 'change'
    // (ver node_modules/react-native-css/src/native/reactivity.ts) -- por
    // eso className="bg-background"/"bg-card"/etc se quedaba congelado para
    // siempre en el tema del sistema operativo al arranque, sin reaccionar
    // nunca al modo oscuro real de la app (BUG-047, causa raiz real de
    // BUG-044). theme.ts/C_DARK via useAppColorMode() nunca tuvo este
    // problema por ser Context de React puro, sin pasar por Appearance.
    // Fix real: actualizar tambien el observable propio de react-native-css,
    // que si notifica a todos los componentes con className en tiempo real.
    nativeCssColorScheme.set(mode === 'system' ? 'unspecified' : mode);
  }, [mode]);

  return (
    <View
      style={[
        { flex: 1, height: '100%', width: '100%' },
        props.style,
      ]}
    >
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
