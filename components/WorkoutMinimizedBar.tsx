import React, { useEffect, useState } from 'react';
import {  Platform  } from 'react-native';
import {  useSafeAreaInsets  } from 'react-native-safe-area-context';
import {  Box  } from '@components/ui/box';
import {  HStack  } from '@components/ui/hstack';
import {  Text  } from '@components/ui/text';
import {  Pressable  } from '@components/ui/pressable';
import {  Icon  } from '@components/ui/icon';
import {  GlassView, isGlassEffectAPIAvailable  } from '@components/ui/glass-view';
import {  TAB_BAR_CLEARANCE  } from '@components/NavigationTab';
import {  subscribeWorkoutSession, ActiveWorkoutSession  } from '../helper/workoutSessionBus';
import {  RADIUS  } from '../pages/migrated/theme';

interface Props {
  navigationRef: any;
}

// Espacio que CUALQUIER pantalla con contenido desplazable (ScrollView,
// FlatList...) debe sumar a su paddingBottom/contentContainerStyle para que
// su ultimo elemento no quede tapado por esta barra -- es un overlay GLOBAL
// (montado una vez junto a NavigationContainer en App.tsx, ver comentario
// del componente) que puede aparecer sobre CUALQUIER pantalla mientras haya
// un entrenamiento en curso minimizado, tenga o no esa pantalla la barra de
// pestañas (reportado con captura, 2026-08-26: en Estadisticas, una pantalla
// sin tab bar, el ultimo item de la lista quedaba debajo de la barra al
// hacer scroll hasta el final). No incluye insets.bottom -- cada pantalla ya
// reserva su propio inset fisico por su cuenta (SafeAreaView/insets.bottom a
// mano), igual que TAB_BAR_CLEARANCE. Valor: TAB_BAR_CLEARANCE (mismo hueco
// que ya reserva la barra flotante para posicionarse) + la altura real
// renderizada de la barra (padding 12+12, fila de icono/texto ~34, barra de
// progreso 10+3) + un margen -- pensado para cubrir el peor caso (con tab
// bar Y minimizador visibles a la vez), asi que sobra un poco en pantallas
// que solo tienen uno de los dos.
export const WORKOUT_MINIBAR_CLEARANCE = TAB_BAR_CLEARANCE + 90;

function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Barra flotante global (fuera del stack de navegacion, montada una vez
// junto a <NavigationContainer> en App.tsx) que muestra el entrenamiento en
// curso cuando el cliente sale de workout_session_screen sin finalizarlo
// (punto 5 del encargo, item #11). Se alimenta del bus en
// helper/workoutSessionBus.ts -- no depende de props de navegacion para
// enterarse del progreso.
export default function WorkoutMinimizedBar({ navigationRef }: Props) {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<ActiveWorkoutSession | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => subscribeWorkoutSession((s, m) => {
    setSession(s);
    setMinimized(m);
  }), []);

  useEffect(() => {
    if (!session || !minimized) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session, minimized]);

  // Guard contra doble-toque / toque accidental (nota 2026-08-19: "el
  // minimizador ha desaparecido al pulsarlo... que no desaparezca si se
  // pulsa erroneamente algun boton") -- restoringRef evita disparar
  // navigate() dos veces seguidas si el cliente toca rápido dos veces la
  // barra, que podía dejar la navegación en un estado inconsistente (la
  // barra se oculta al entrar a la pantalla completa, pero un segundo
  // navigate() concurrente podía no completar el mount y dejar la barra sin
  // reaparecer ni la pantalla completa visible). Nunca oculta la barra por
  // su cuenta -- solo el propio mount/unmount de workout_session_screen
  // (via setWorkoutSessionMinimized) decide su visibilidad. Declarado ANTES
  // del early-return de abajo -- los Hooks de React deben llamarse siempre
  // en el mismo orden en cada render.
  const restoringRef = React.useRef(false);

  if (!session || !minimized) return null;

  const elapsedSeconds = Math.max(0, Math.floor((nowTick - session.startedAt) / 1000));
  const progress = session.totalSets > 0 ? session.completedSets / session.totalSets : 0;
  const hasGlass = isGlassEffectAPIAvailable();

  const restore = () => {
    if (restoringRef.current) return;
    if (!navigationRef?.current?.isReady?.()) return;
    restoringRef.current = true;
    navigationRef.current.navigate('MigratedWorkoutSession', {
      programDayAssignmentId: session.programDayAssignmentId,
      workoutTemplateId: session.workoutTemplateId,
      mTitle: session.mTitle,
    });
    setTimeout(() => {
      restoringRef.current = false;
    }, 800);
  };

  return (
    <Box
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        // Antes se solapaba con la barra de pestañas flotante (misma zona
        // inferior, ambas con zIndex/render alto) -- pedido explícito: el
        // menú tiene que quedar siempre visible. Se suma TAB_BAR_CLEARANCE
        // (el mismo hueco que ya reservan las pantallas raíz de cada
        // pestaña) para flotar SIEMPRE por encima de donde iría la barra,
        // aunque la pantalla actual no tenga barra (coste menor: queda un
        // poco más alto de lo estrictamente necesario ahí, pero nunca tapa
        // el menú cuando sí la tiene).
        bottom: Math.max(insets.bottom, 12) + TAB_BAR_CLEARANCE + (Platform.OS === 'ios' ? 6 : 10),
        zIndex: 50,
        borderRadius: RADIUS.lg,
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
      }}
    >
      <Pressable onPress={restore}>
        {/* GlassView (expo-glass-effect) solo aplica su borderRadius nativo
            al UIVisualEffectView interno cuando el Liquid Glass real esta
            disponible Y ya se monto (ver su propio TODO "Glass effect does
            not work sometimes if view has not been laid out yet"). Cuando
            falla ese timing o se usa el fallback, el borderRadius/overflow
            del style no recorta nada y se ve la esquina cuadrada detras del
            contenido redondeado. Se envuelve en un Box con overflow:hidden
            propio (recorte 100% fiable de RN, independiente del native
            module) como red de seguridad. */}
        <Box style={{ borderRadius: RADIUS.lg, overflow: 'hidden' }}>
          <GlassView
            glassEffectStyle="regular"
            colorScheme="dark"
            style={{
              borderRadius: RADIUS.lg,
              paddingHorizontal: 16,
              paddingVertical: 12,
              ...(hasGlass ? null : { backgroundColor: '#1C1C1E' }),
            }}
          >
          {/* Nota 2026-08-19: "con texto blanco no se ve nada, ponlo en
              negro". Ese fix asumía que el GlassView real (hasGlass, Liquid
              Glass de iOS 26+) siempre sale con material CLARO, pero
              `colorScheme` por defecto es 'auto' -- sigue la apariencia del
              sistema, y sobre la foto del hero (fondos oscuros/nocturnos)
              el material real podía salir oscuro, dejando el texto negro
              invisible otra vez (reportado con captura, 2026-08-26). Fix
              real: `colorScheme="dark"` fuerza el material Liquid Glass a
              su variante oscura siempre, igual que el fondo sólido
              '#1C1C1E' del fallback (!hasGlass) -- así las dos ramas son
              siempre oscuras y el texto puede ser blanco fijo en ambas, sin
              depender de qué apariencia calcule el sistema ni de qué foto
              haya detrás. */}
          <HStack className="items-center justify-between">
            <HStack space="sm" className="items-center flex-1" style={{ marginRight: 10 }}>
              <Box className="items-center justify-center rounded-pill" style={{ width: 34, height: 34, backgroundColor: 'rgba(255,255,255,0.14)' }}>
                <Icon name="barbell-outline" size={17} color="#FFFFFF" />
              </Box>
              <Box className="flex-1">
                <Text weight="bold" numberOfLines={1} style={{ fontSize: 14, color: '#FFFFFF' }}>
                  {session.mTitle || 'Entrenamiento'}
                </Text>
                <Text style={{ fontSize: 12, opacity: 0.75, marginTop: 2, color: '#FFFFFF' }}>
                  {formatTimer(elapsedSeconds)} · {session.completedSets}/{session.totalSets} series
                </Text>
              </Box>
            </HStack>
            <Icon name="chevron-up-circle" size={26} color="#FFFFFF" />
          </HStack>
          <Box style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 10, overflow: 'hidden' }}>
            <Box style={{ height: 3, borderRadius: 2, width: `${Math.round(progress * 100)}%`, backgroundColor: '#34C759' }} />
          </Box>
          </GlassView>
        </Box>
      </Pressable>
    </Box>
  );
}
