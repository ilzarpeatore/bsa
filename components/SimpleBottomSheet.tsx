import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Actionsheet, ActionsheetBackdrop, ActionsheetContent } from '@components/ui/actionsheet';
import { GlassView, isGlassEffectAPIAvailable } from '@components/ui/glass-view';
import { useAppColorMode } from '@helper/useAppColorMode';

interface SimpleBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// Envuelve el Actionsheet real de Gluestack (verificado: usa el mismo Overlay
// portal-based que Modal, montado en App.tsx vía GluestackUIProvider, y se
// desmonta del todo cuando está cerrado — `if (!isOpen && exited) return null`
// en @gluestack-ui/core — no es el bug de @gorhom/bottom-sheet que motivó
// este componente en primer lugar, ese SÍ dejaba una capa invisible
// capturando toques con index=-1).
//
// Se conserva a propósito, encima del Actionsheet real, lo que Gluestack no
// trae de fábrica: el toque en el backdrop primero baja el teclado (si está
// abierto) y solo cierra la hoja en un segundo toque — mismo fix ya probado
// en producción (Antropometría), ActionsheetBackdrop no lo replica solo.
// `onPress` propio sustituye por completo el auto-cierre interno del
// Backdrop (createActionsheet lo spreadea después de su handler default),
// así que el control de apertura/cierre sigue siendo 100% el `visible`/
// `onClose` de este wrapper, igual que antes.
//
// El `className` por defecto de ActionsheetContent trae padding/centrado
// pensados para listas de opciones (`p-2 items-center`) que no encajan con
// los formularios/listas de ancho completo que usan las 14 pantallas que
// consumen este componente — se deja transparente y sin padding aquí; el
// fondo real (Liquid Glass o C.surface de reserva) lo pone el GlassView de
// dentro, que también lleva el radio/padding que antes tenía este nodo.
export default function SimpleBottomSheet({ visible, onClose, children }: SimpleBottomSheetProps) {
  const { colors: C } = useAppColorMode();
  const insets = useSafeAreaInsets();
  const keyboardVisibleRef = useRef(false);
  // Bug real reportado dos veces (2026-08-27 y 2026-08-29, con capturas): la
  // hoja de notas queda oculta tras el teclado. El primer intento
  // (KeyboardAvoidingView behavior="position") no basta aquí -- esta hoja
  // cuelga dentro del Overlay portal-based del Actionsheet (ver comentario
  // grande más abajo), y "position" mide su propio desplazamiento relativo a
  // esa jerarquía anidada, que no coincide con la altura real de teclado
  // reportada por el sistema. Se sustituye por una medida directa: se
  // escucha la altura real del teclado (evento nativo, no heurística) y se
  // traslada la hoja entera hacia arriba esa distancia con un `transform`
  // (no `margin`/`padding` -- un transform no depende de cómo reparta el
  // espacio el contenedor flex del Actionsheet, garantiza el mismo
  // desplazamiento visual sin importar esa jerarquía). Se resta el inset
  // inferior porque esa franja ya la cubre el propio `paddingBottom` de la
  // hoja en reposo -- sin restarlo, el teclado la desplazaría de más.
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => {
      keyboardVisibleRef.current = true;
      setKeyboardOffset(Math.max(0, (e.endCoordinates?.height ?? 0) - insets.bottom));
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      keyboardVisibleRef.current = false;
      setKeyboardOffset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
      keyboardVisibleRef.current = false;
      setKeyboardOffset(0);
    };
  }, [visible, insets.bottom]);
  // Solo iOS 26+ real (dispositivo + compilado con Xcode 26+) renderiza el
  // material Liquid Glass de verdad — en cualquier otro caso GlassView cae a
  // una View normal y quedaría transparente sin este fondo de reserva.
  const hasGlass = isGlassEffectAPIAvailable();

  const onBackdropPress = () => {
    if (keyboardVisibleRef.current) {
      Keyboard.dismiss();
      return;
    }
    onClose();
  };

  return (
    <Actionsheet isOpen={visible} onClose={onClose}>
      <ActionsheetBackdrop onPress={onBackdropPress} />
      <ActionsheetContent className="items-stretch p-0" style={{ backgroundColor: 'transparent' }}>
        {/* Ver nota en WorkoutMinimizedBar.tsx: GlassView solo aplica su
            propio borderRadius nativo cuando el Liquid Glass real esta
            disponible y ya se monto -- sin este wrapper, la esquina superior
            del sheet se ve cuadrada por detras cuando falla ese timing. */}
        <View
          style={{
            width: '100%',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
            transform: [{ translateY: -keyboardOffset }],
          }}
        >
          <GlassView
            glassEffectStyle="regular"
            style={{
              width: '100%',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: 28,
              ...(hasGlass ? null : { backgroundColor: C.surface }),
            }}
          >
            {children}
          </GlassView>
        </View>
      </ActionsheetContent>
    </Actionsheet>
  );
}
