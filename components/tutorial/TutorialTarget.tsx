import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleProp, ViewStyle, ScrollView, findNodeHandle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTutorial } from '@store/TutorialContext';

interface Props {
  id: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  // Si el elemento puede quedar fuera de la parte visible de la pantalla
  // (más abajo del scroll inicial, ej. "Accede a tu plan de nutrición" en
  // Home), se le pasa la ref del ScrollView que lo contiene -- reportado
  // con captura: sin esto, el overlay oscurece la pantalla pero el "hueco"
  // señalado queda fuera de la vista y no hay nada que tocar salvo "Saltar
  // tutorial".
  scrollRef?: React.RefObject<ScrollView | null>;
}

// Envuelve cualquier elemento que un reto del tutorial pueda señalar.
// Se mide (measureInWindow, coordenadas absolutas de pantalla, lo que
// necesita el overlay para recortar el hueco) cada vez que la pantalla
// gana el foco -- no basta con onLayout solo, porque react-native-screens
// mantiene la pantalla montada al navegar hacia atrás, así que onLayout no
// vuelve a dispararse al reenfocar si el tamaño no cambió.
export default function TutorialTarget({ id, children, style, scrollRef }: Props) {
  const ref = useRef<View>(null);
  const { registerTarget, unregisterTarget, activeStep } = useTutorial();
  const isActiveTarget = activeStep?.targetId === id;

  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) registerTarget(id, { x, y, width, height });
    });
  }, [id, registerTarget]);

  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(measure, 80);
      return () => {
        clearTimeout(timeout);
        unregisterTarget(id);
      };
    }, [measure, unregisterTarget, id])
  );

  // Al activarse el paso que señala este elemento, si vive dentro de un
  // scroll, lo desplaza a la vista -- con margen arriba para que el propio
  // tooltip del overlay (que se pinta debajo o encima del hueco) no lo
  // tape. measureLayout da la posición relativa al contenido del
  // ScrollView (independiente del scroll actual), a diferencia de
  // measureInWindow (coordenadas absolutas de pantalla, solo válidas en el
  // momento en que se miden).
  useEffect(() => {
    if (!isActiveTarget || !scrollRef?.current) return;
    const node = findNodeHandle(scrollRef.current);
    if (!node) return;
    const timeout = setTimeout(() => {
      ref.current?.measureLayout(
        node,
        (_x: number, y: number) => {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - 140), animated: true });
        },
        () => {}
      );
    }, 80);
    return () => clearTimeout(timeout);
  }, [isActiveTarget, scrollRef]);

  return (
    <View ref={ref} onLayout={measure} style={style} collapsable={false}>
      {children}
    </View>
  );
}
