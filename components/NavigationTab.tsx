import React, { useRef, useState } from "react";
import {
  View,
  Pressable,
  Animated,
  StyleSheet,
  LayoutChangeEvent,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { GlassView, isGlassEffectAPIAvailable } from "@components/ui/glass-view";
import { LinearGradient } from "expo-linear-gradient";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { NavigationTabOptionsInterface, IoniconName } from "./_types/NavigationTab.i";
import { useResponsiveStyleSheet } from "@helper/responsiveStyleSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@components/ui/icon";
import { Text } from "@components/ui/text";
import { C, FONT } from "../pages/migrated/theme";
// Modulo-scope: Animated.createAnimatedComponent(Image) solo depende del
// import estatico de Image, no de props/estado del componente -- crearlo
// aqui evita reconstruirlo (y su wrapper interno) en cada render.
const AnimatedImage = Animated.createAnimatedComponent(Image);

// Espacio que las pantallas RAÍZ de una pestaña (las únicas que muestran
// esta barra flotante -- ver tabBarVisible en App.tsx) deben reservar al
// final de su contenido desplazable para que el último bloque no quede
// tapado detrás de la barra (reportado con captura: una tarjeta quedaba
// justo debajo/tapada por la barra al hacer scroll hasta el fondo).
// navigationOuter mide '64@ratio' de alto y el "+" sobresale '22@ratio' por
// encima de ese contenedor (ver plusBtn.top más abajo) -- a escala ~1 (ancho
// de referencia) son ~86px de la barra en sí, más un margen extra de aire.
// Deliberadamente NO incluye insets.bottom: la barra se posiciona sobre el
// screen completo (fuera del SafeAreaView de cada pantalla) y ya añade su
// propio `marginBottom: safearea.bottom` (ver navigationOuter más abajo) --
// sumarlo aquí también lo contaría dos veces en cualquier pantalla cuyo
// SafeAreaView ya reserve el edge 'bottom'. Cada pantalla ya es responsable
// de su propio inset físico (SafeAreaView con edge 'bottom', o insets.bottom
// a mano); esta constante es solo el hueco adicional para la barra flotante.
export const TAB_BAR_CLEARANCE = 86 + 20;

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
  const styles = useStyle();
  const safearea = useSafeAreaInsets();
  /* top bar options */
  const focusedOptions = descriptors[state.routes[state.index].key].options as NavigationTabOptionsInterface;
  /* show navigation btn ellipse */
  const [navigation_ellipse_show, set_navigation_ellipse_show] = useState(
    false
  );
  /* save navigation nav x location */
  const [navlocations, set_navlocations] = useState([0, 0, 0, 0]);
  const [navigationbtnactiveX] = useState(() => new Animated.Value(0));

  /* submenu "+" */
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  const openMenu = () => {
    setMenuOpen(true);
    Animated.spring(menuAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }).start();
  };
  const closeMenu = () => {
    Animated.timing(menuAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => setMenuOpen(false));
  };

  const set_nav_positions = (event: LayoutChangeEvent, index: number) => {
    /* save navigation tab x positions */
    let { x } = event.nativeEvent.layout;
    let locations = navlocations;
    locations[index] = x;
    set_navlocations(locations);
    /* if is the active page move navigation btn ellipse to it location and show it */
    if (index == state.index) {
      navigationbtnactiveX.setValue(x + ((styles.navigationbtn.width / 2) - 4.5));
      set_navigation_ellipse_show(true);
    }
  };
  const navigation_press = (index: number, onPress: Function) => {
    /* if navigationbtnactiveX return 0 set it location to the active page index xlocation */
    //@ts-ignore exits
    if (navigationbtnactiveX.__getValue() == 0)
      navigationbtnactiveX.setValue(navlocations[state.index] + ((styles.navigationbtn.width / 2) - 4.5));
    /* animate navigation btn ellipse */
    Animated.timing(navigationbtnactiveX, {
      toValue: navlocations[index] + ((styles.navigationbtn.width / 2) - 4.5),
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      /* navigate to bottom tab screen */
      onPress();
    });
  };
  /* hide if tabBarVisible is false */
  if (focusedOptions.tabBarVisible === false) {
    return null;
  }
  return (
    <>
      <View style={[styles.navigationOuter, { marginBottom: safearea.bottom || 12 }]}>
        <View style={[styles.navigationBlur, !isGlassEffectAPIAvailable() && styles.navigationFallbackBg]}>
          <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
          <View style={styles.navigationglow} />
          <AnimatedImage
            source={require("./../assets/icons/navigationellipse.png")}
            contentFit="contain"
            style={[
              styles.navigationbtnactive,
              {
                transform: [{ translateX: navigationbtnactiveX }],
                tintColor: "#1C1C1E",
              },
              navigation_ellipse_show ? { opacity: 1 } : { opacity: 0 },
            ]}
          />
          {/*navigation icons start*/}
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const typedOptions = options as NavigationTabOptionsInterface;
            const isFocused = state.index === index;

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
                onLayout={(event) => set_nav_positions(event, index)}
                onPress={() => {
                  navigation_press(index, onPress);
                }}
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

        {/* Botón "+" flotante -- abre el submenu de accesos rápidos. Cambia a
            icono "cerrar" mientras el menú está abierto (mismo criterio que
            la referencia), sin cambiar de color entre estados (pedido
            explícito en el rediseño anterior). */}
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
                !isGlassEffectAPIAvailable() && styles.quickMenuFallbackBg,
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
                    <View style={styles.quickMenuIconWrap}>
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
function useStyle() {
  const styles = useResponsiveStyleSheet({
    navigationOuter: {
      position: "absolute",
      left: '20@ratio',
      right: '20@ratio',
      bottom: 0,
      height: '64@ratio',
    },
    navigationBlur: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      width: "100%",
      height: '64@ratio',
      borderRadius: '32@ratio',
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.4)",
    },
    // Fondo sólido de reserva -- solo se aplica cuando NO hay Liquid Glass
    // real (Android, iOS<26); con glass real el material translúcido ya lo
    // pinta el propio GlassView (mismo criterio que Fab/Modal/Popover).
    navigationFallbackBg: {
      backgroundColor: "rgba(255,255,255,0.92)",
    },
    modalBackdrop: {
      backgroundColor: "rgba(0,0,0,0.2)",
    },
    navigationglow: {
      position: "absolute",
      top: 0,
      left: '14@ratio',
      right: '14@ratio',
      height: '1@ratio',
      backgroundColor: "rgba(255,255,255,0.5)",
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
    navigationbtnactive: {
      position: "absolute",
      top: '8@ratio',
      left: 0,
      width: '9@ratio',
      height: '5@ratio',
    },
    plusBtn: {
      position: "absolute",
      top: '-22@ratio',
      left: "50%",
      marginLeft: '-28@ratio',
      width: '56@ratio',
      height: '56@ratio',
      borderRadius: '28@ratio',
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
    // Fondo sólido de reserva -- solo cuando NO hay Liquid Glass real
    // (Android, iOS<26), mismo criterio que navigationFallbackBg más arriba.
    quickMenuFallbackBg: {
      backgroundColor: C.surface,
    },
    // Capa blanca semi-opaca sobre el propio GlassView -- el bug de
    // legibilidad original (texto directo sobre el material translúcido, con
    // la pantalla de debajo transparentándose encima) se evita garantizando
    // este contraste mínimo pase lo que pase detrás, sin perder el efecto
    // glass (que se sigue notando en el blur del borde/contorno).
    quickMenuTint: {
      backgroundColor: "rgba(255,255,255,0.55)",
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
    quickMenuIconWrap: {
      width: '52@ratio',
      height: '52@ratio',
      borderRadius: '26@ratio',
      backgroundColor: `${C.orange}1F`,
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
