import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  Animated,
  StyleSheet,
  Modal,
} from "react-native";
import { GlassView } from "@components/ui/glass-view";
import { LinearGradient } from "expo-linear-gradient";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { NavigationTabOptionsInterface, IoniconName } from "./_types/NavigationTab.i";
import { useResponsiveStyleSheet } from "@helper/responsiveStyleSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@components/ui/icon";
import { Text } from "@components/ui/text";
import { FONT } from "../pages/migrated/theme";
import { useAppColorMode } from "@helper/useAppColorMode";
import { useTabBarScroll } from "@store/TabBarScrollContext";

// Espacio que las pantallas RAÍZ de una pestaña (las únicas que muestran
// esta barra flotante -- ver tabBarVisible en App.tsx) deben reservar al
// final de su contenido desplazable para que el último bloque no quede
// tapado detrás de la barra (reportado con captura: una tarjeta quedaba
// justo debajo/tapada por la barra al hacer scroll hasta el fondo).
// navigationOuter mide '64@ratio' de alto -- desde el rediseño que separó el
// "+" de la barra (ya no se superpone centrado encima), la fila entera mide
// eso mismo, sin ningún elemento sobresaliendo por arriba. A escala ~1
// (ancho de referencia) son ~64px de la barra en sí, más un margen extra de
// aire. Deliberadamente NO incluye insets.bottom: la barra se posiciona
// sobre el screen completo (fuera del SafeAreaView de cada pantalla) y ya
// añade su propio `marginBottom: safearea.bottom` (ver navigationOuter más
// abajo) -- sumarlo aquí también lo contaría dos veces en cualquier
// pantalla cuyo SafeAreaView ya reserve el edge 'bottom'. Cada pantalla ya
// es responsable de su propio inset físico (SafeAreaView con edge 'bottom',
// o insets.bottom a mano); esta constante es solo el hueco adicional para
// la barra flotante.
export const TAB_BAR_CLEARANCE = 64 + 20;

interface QuickAction {
  id: string;
  label: string;
  icon: IoniconName;
  route: string;
  params?: Record<string, any>;
}

// Segundo rediseño 2026-08-23 (pedido explícito): Home v2 vuelve a la barra
// fija como "Inicio" (sustituyendo a Perfil, que pasaba desapercibido ahí
// -- ver App.tsx Homenavigator), así que Perfil se muda aquí, al "+", junto
// a Blog/Comunidad/Métricas/Check-ins.
const QUICK_ACTIONS: QuickAction[] = [
  { id: "profile", label: "Perfil", icon: "person-outline", route: "MigratedProfile" },
  { id: "blog", label: "Blog", icon: "newspaper-outline", route: "MigratedBlog" },
  { id: "community", label: "Comunidad", icon: "people-outline", route: "MigratedCommunity" },
  { id: "metrics", label: "Métricas", icon: "body-outline", route: "MigratedBodyMetrics" },
  { id: "checkins", label: "Check-ins", icon: "clipboard-outline", route: "MigratedCheckIns" },
];

/**
 * NavigationTab
 * reactnative navigation tabBar function -- barra flotante con efecto
 * glass (GlassView, Liquid Glass real en iOS 26+, mismo componente que ya
 * usan Fab/Modal/Popover/Tooltip -- ver components/ui/glass-view) y botón
 * central "+" que abre un submenu de accesos rápidos.
 */
export default function NavigationTab({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors: C } = useAppColorMode();
  const styles = useStyle(C);
  const safearea = useSafeAreaInsets();
  /* top bar options */
  const focusedOptions = descriptors[state.routes[state.index].key].options as NavigationTabOptionsInterface;

  /* submenu "+" */
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  // Plegar la barra al hacer scroll (pedido explícito, ver
  // store/TabBarScrollContext.tsx) -- las pantallas raíz de cada pestaña
  // reportan ahí su scrollY; aquí solo se anima la transición y se resetea
  // a desplegado en cuanto cambia la pestaña activa (si no, se arrastraría
  // el estado plegado de la pestaña anterior al entrar en una nueva que
  // todavía no se ha scrolleado).
  const { collapsed, setCollapsed, getScrollTick } = useTabBarScroll();
  const collapseAnim = useRef(new Animated.Value(0)).current;

  // Tocar el icono de la barra plegada la vuelve a desplegar (pedido
  // explícito: "como hace el menú +") sin depender del scroll -- pero tiene
  // que volver a plegarse en cuanto haya scroll real de nuevo, no quedarse
  // así para siempre. `forceExpanded` es un override puramente visual, no
  // toca el `collapsed` real del contexto (si lo hiciera, en pantallas que
  // solo reportan scroll en los cruces de umbral -- Home, Plan -- seguir
  // scrolleando en el mismo sentido nunca volvería a avisar, y la barra se
  // quedaría abierta a la fuerza). Se cancela con un intervalo ligero que
  // solo corre MIENTRAS el override está activo (comparando getScrollTick()
  // contra el valor que tenía al forzar la apertura) -- no un efecto atado
  // al contador directamente, porque ese contador es un ref por diseño (ver
  // TabBarScrollContext.tsx): no dispara re-render por sí solo, así que hay
  // que consultarlo activamente, no se puede "escuchar".
  const [forceExpanded, setForceExpanded] = useState(false);
  const scrollTickAtExpandRef = useRef(0);
  const isVisuallyCollapsed = collapsed && !forceExpanded;

  useEffect(() => {
    if (!forceExpanded) return;
    const interval = setInterval(() => {
      if (getScrollTick() !== scrollTickAtExpandRef.current) {
        setForceExpanded(false);
      }
    }, 150);
    return () => clearInterval(interval);
  }, [forceExpanded, getScrollTick]);

  const expandFromCollapsed = () => {
    scrollTickAtExpandRef.current = getScrollTick();
    setForceExpanded(true);
  };

  useEffect(() => {
    Animated.timing(collapseAnim, { toValue: isVisuallyCollapsed ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [isVisuallyCollapsed, collapseAnim]);

  useEffect(() => {
    setCollapsed(false);
    setForceExpanded(false);
  }, [state.index, setCollapsed]);

  const openMenu = () => {
    setMenuOpen(true);
    Animated.spring(menuAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }).start();
  };
  const closeMenu = () => {
    Animated.timing(menuAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => setMenuOpen(false));
  };

  /* hide if tabBarVisible is false */
  if (focusedOptions.tabBarVisible === false) {
    return null;
  }
  const renderPlusButton = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={menuOpen ? "Cerrar accesos rápidos" : "Accesos rápidos"}
      style={({ pressed }) => [styles.plusBtn, pressed && { opacity: 0.85 }]}
      onPress={() => (menuOpen ? closeMenu() : openMenu())}
    >
      <LinearGradient
        colors={["#FF8A50", C.orange, "#E85A2A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Icon name={menuOpen ? "close" : "add"} size={26} color="#FFFFFF" />
    </Pressable>
  );

  return (
    <>
      <View style={[styles.navigationOuter, { marginBottom: safearea.bottom || 12 }]}>
        {/* Fila completa (4 pestañas + "+") -- visible solo arriba del todo,
            se pliega en cuanto se hace scroll (ver useTabBarScroll). */}
        <Animated.View
          pointerEvents={isVisuallyCollapsed ? "none" : "auto"}
          style={[
            styles.navigationOuterRow,
            { opacity: collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
          ]}
        >
          <View style={styles.navigationBlur}>
            {/* Wrapper propio solo para recortar el glass (mismo patrón que
                Fab/SimpleBottomSheet/Card variant="glass" -- ver
                components/ui/fab/index.tsx): GlassView no lleva borderRadius
                propio (usa StyleSheet.absoluteFill), así que sin este
                recorte dedicado su material nativo puede asomar en forma de
                rectángulo por detrás de las esquinas redondeadas del
                borde/sombra del contenedor exterior. Separarlo del View que
                lleva el borde es lo que evita el "reborde cuadrado"
                reportado. */}
            <View style={styles.navigationGlassClip}>
              <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
              {/* Capa blanca semi-opaca -- sin esto, sobre fotos de fondo
                  claras (amanecer) o de noche el material translúcido por sí
                  solo no da contraste suficiente para leer iconos/texto
                  (reportado con captura). Con esta capa, el texto/iconos
                  oscuros siempre leen bien pase lo que pase detrás. */}
              <View style={[StyleSheet.absoluteFill, styles.navigationTint]} />
            </View>
            {/*navigation icons start*/}
            {state.routes.map((route) => {
              const { options } = descriptors[route.key];
              const typedOptions = options as NavigationTabOptionsInterface;
              const isFocused = state.routes[state.index].key === route.key;

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: "tabLongPress",
                  target: route.key,
                });
              };

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={typedOptions.tabBarAccessibilityLabel}
                  testID={(typedOptions as any).tabBarTestID}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={({ pressed }) => [styles.navigationbtn, pressed && { opacity: 0.2 }]}
                >
                  <Icon name={typedOptions.icon} size={22} color={isFocused ? "#1C1C1E" : "#AEAEB2"} />
                  <Text style={[styles.navigationLabel, isFocused && styles.navigationLabelActive]} numberOfLines={1}>
                    {typedOptions.label}
                  </Text>
                </Pressable>
              );
            })}
            {/*navigation icons end*/}
          </View>

          {/* Botón "+" separado de la barra (pedido explícito, captura de
              referencia: "todos los iconos juntos y separado el +") -- ya no
              se superpone centrado encima de la barra, vive al lado como
              círculo propio dentro de la misma fila. Cambia a icono "cerrar"
              mientras el menú está abierto (mismo criterio que la
              referencia), sin cambiar de color entre estados (pedido
              explícito en el rediseño anterior). */}
          {renderPlusButton()}
        </Animated.View>

        {/* Fila plegada -- solo el icono de la pestaña activa + el "+"
            (pedido explícito, captura de referencia), el primero anclado al
            borde izquierdo y el segundo al derecho (antes ambos quedaban
            juntos a la izquierda, con toda la fila vacía a la derecha --
            reportado con captura). */}
        <Animated.View
          pointerEvents={isVisuallyCollapsed ? "auto" : "none"}
          style={[styles.navigationOuterRow, styles.navigationOuterRowCollapsed, { opacity: collapseAnim }]}
        >
          {/* Tocar el icono plegado vuelve a desplegar la barra completa
              (pedido explícito: "como hace el menú +"), sin esperar a que el
              scroll suba de nuevo -- ver forceExpanded/expandFromCollapsed
              más arriba para cuándo se vuelve a plegar sola. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mostrar barra de navegación"
            style={({ pressed }) => [styles.collapsedCircle, pressed && { opacity: 0.85 }]}
            onPress={expandFromCollapsed}
          >
            <View style={styles.navigationGlassClip}>
              <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.navigationTint]} />
            </View>
            <Icon name={focusedOptions.icon} size={22} color="#1C1C1E" />
          </Pressable>
          {renderPlusButton()}
        </Animated.View>
      </View>

      {/* Submenu de accesos rápidos -- vuelve a usar Liquid Glass real (pedido
          explícito, captura de referencia), esta vez sin repetir el bug de
          legibilidad de la primera vez: aquella tenía el texto directamente
          sobre el material translúcido, con el contenido de la pantalla de
          debajo transparentándose encima. Aquí el propio GlassView queda
          debajo de una capa blanca semi-opaca (quickMenuTint) que garantiza
          contraste sea cual sea la pantalla de fondo, y el icono de cada
          acceso sigue en su círculo opaco de siempre -- el efecto glass se
          nota en el borde/blur del contorno, no arriesga la lectura del texto. */}
      <Modal visible={menuOpen} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={{ flex: 1 }}>
          <Pressable style={[StyleSheet.absoluteFill, styles.modalBackdrop]} onPress={closeMenu} />
          <View
            pointerEvents="box-none"
            style={{ flex: 1, justifyContent: "flex-end", alignItems: "center", paddingBottom: safearea.bottom + 92 }}
          >
            <Animated.View
              style={[
                styles.quickMenu,
                {
                  opacity: menuAnim,
                  transform: [
                    { translateY: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                    { scale: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                  ],
                },
              ]}
            >
              <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.quickMenuTint]} />
              <View style={styles.quickMenuGrid}>
                {QUICK_ACTIONS.map((action) => (
                  <Pressable
                    key={action.id}
                    style={({ pressed }) => [styles.quickMenuItem, pressed && { opacity: 0.7 }]}
                    onPress={() => {
                      closeMenu();
                      // `navigation` aqui es el navigator de PESTAÑAS (Tab.Navigator),
                      // no el stack interno -- hay que anidar explícitamente: entrar
                      // en cualquiera de las 4 pestañas (todas comparten el mismo
                      // stack MigratedNavigator) y pedirle a SU stack que navegue a
                      // la pantalla real.
                      navigation.navigate("PlanDiarioTab", { screen: action.route, params: action.params });
                    }}
                  >
                    <View style={[styles.quickMenuIconWrap, { backgroundColor: `${C.orange}1F` }]}>
                      <Icon name={action.icon} size={22} color={C.orange} />
                    </View>
                    <Text style={styles.quickMenuLabel} numberOfLines={1}>{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          </View>
        </View>
      </Modal>
    </>
  );
}
/**
 * style
 * * note : stylesheet is converted to responsiveStyleSheet because we need to use responsive ratio . if you don't want to use resposive ratio you can use the normal stylesheet version
 */
function useStyle(C: ReturnType<typeof useAppColorMode>['colors']) {
  const styles = useResponsiveStyleSheet({
    navigationOuter: {
      position: "absolute",
      left: '20@ratio',
      right: '20@ratio',
      bottom: 0,
      height: '64@ratio',
    },
    // Ambas filas (desplegada/plegada) se superponen exactamente en el mismo
    // sitio -- se cruza su opacidad (collapseAnim) en vez de animar anchos,
    // más simple y fiable que hacer "morphing" del ancho de navigationBlur.
    navigationOuterRow: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: '12@ratio',
    },
    // Fila plegada: el círculo activo pegado al borde izquierdo y el "+" al
    // derecho (reportado con captura: antes ambos quedaban juntos a la
    // izquierda, con toda la fila vacía a la derecha).
    navigationOuterRowCollapsed: {
      justifyContent: "space-between",
    },
    // Círculo plegado -- mismo tamaño que plusBtn para que la fila plegada
    // quede visualmente equilibrada (dos círculos iguales, como en la
    // referencia). Sin borderWidth aquí (ver navigationGlassClip): un View
    // con borde + overflow:hidden + un GlassView nativo dentro puede dejar
    // asomar el borde en línea recta por detrás de la esquina redondeada
    // (reportado con captura: "reborde" en los laterales/arriba/abajo) --
    // mismo criterio que components/ui/fab/index.tsx, que tampoco usa borde
    // sobre su glass, solo sombra para dar definición.
    collapsedCircle: {
      width: '64@ratio',
      height: '64@ratio',
      borderRadius: '32@ratio',
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    navigationBlur: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      height: '64@ratio',
      borderRadius: '32@ratio',
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    // Wrapper dedicado SOLO a recortar el glass (nunca lleva borde) -- mismo
    // patrón que components/ui/fab/index.tsx. Es lo que de verdad evita el
    // reborde cuadrado, separado del contenedor que si lleva forma/borde.
    navigationGlassClip: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: '32@ratio',
      overflow: "hidden",
    },
    // Capa blanca semi-opaca sobre el glass -- sin ella, sobre fotos claras
    // (amanecer) o de noche el material translúcido no da contraste
    // suficiente para leer iconos/texto oscuros (reportado con captura).
    // Funciona igual con o sin Liquid Glass real (Android/iOS<26 ya caen a
    // una <View> plana por su cuenta), así que sustituye al fallback sólido
    // condicional que había antes.
    navigationTint: {
      backgroundColor: "rgba(255,255,255,0.85)",
    },
    // Subido de 0.2 a 0.4 (pedido explícito: "oscurece un poco el fondo del
    // menú +") -- mismo backdrop que ya se usaba, solo más oscuro.
    modalBackdrop: {
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    navigationbtn: {
      width: '58@ratio',
      height: '56@ratio',
      justifyContent: "center",
      alignItems: "center",
      gap: '3@ratio',
    },
    navigationLabel: {
      fontSize: '9.5@ratio',
      fontFamily: FONT.semiBold,
      color: "#AEAEB2",
    },
    navigationLabelActive: {
      color: "#1C1C1E",
    },
    plusBtn: {
      width: '64@ratio',
      height: '64@ratio',
      borderRadius: '32@ratio',
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    quickMenu: {
      width: "82%",
      borderRadius: '24@ratio',
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    // Capa blanca casi opaca sobre el propio GlassView -- el bug de
    // legibilidad original (texto directo sobre el material translúcido, con
    // la pantalla de debajo transparentándose encima) seguía notándose sobre
    // fotos de fondo reales (reportado de nuevo con captura: el popup se
    // veía "mal" al desplegarse, el contenido de detrás se leía a través).
    // Subido de 0.55 a 0.85 -- garantiza contraste real pase lo que pase
    // detrás, funciona igual con o sin Liquid Glass real (sustituye también
    // al fallback sólido condicional que había antes).
    quickMenuTint: {
      backgroundColor: "rgba(255,255,255,0.85)",
    },
    quickMenuGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingVertical: '20@ratio',
      paddingHorizontal: '12@ratio',
    },
    quickMenuItem: {
      width: "50%",
      alignItems: "center",
      gap: '8@ratio',
      paddingVertical: '12@ratio',
    },
    // backgroundColor NO vive aqui -- useResponsiveStyleSheet memoiza el
    // StyleSheet.create() resultante solo por `scale` (ver
    // helper/responsiveStyleSheet.tsx), no por los valores de este objeto
    // (que en cualquier pantalla que lo usa se recrea en cada render de
    // todos modos). Si el color dependiente de C fuera parte de este objeto,
    // un cambio de tema claro/oscuro no lo actualizaria hasta que `scale`
    // cambiase (p.ej. al rotar) -- se aplica en su lugar como override
    // inline en el JSX, que si se reevalua en cada render.
    quickMenuIconWrap: {
      width: '52@ratio',
      height: '52@ratio',
      borderRadius: '26@ratio',
      alignItems: "center",
      justifyContent: "center",
    },
    quickMenuLabel: {
      fontSize: '13@ratio',
      fontFamily: FONT.semiBold,
      color: "#1C1C1E",
    },
  });
  return styles
}
