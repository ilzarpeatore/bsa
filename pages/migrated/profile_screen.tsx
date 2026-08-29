import React, { useEffect, useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Heading } from '@components/ui/heading';
import { HStack } from '@components/ui/hstack';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Ionicons } from '@expo/vector-icons';
import AppIcon from '@components/AppIcon';
import { useAppColorMode } from '@helper/useAppColorMode';
import { useAuth } from '../../store/AuthContext';
import { TAB_BAR_CLEARANCE } from '@components/NavigationTab';
import { CHAT_ENABLED } from '@constants/featureFlags';
import { workoutHistoryApi } from '../../api/workoutHistory';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  route: string;
  params?: Record<string, any>;
  visible?: boolean;
  iconColor: string;
  iconBg: string;
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

// Fusionado desde MigratedSetting (2026-08-06): esa pantalla intermedia solo
// tenía 2 opciones reales ('Mi programa' y 'Change Password'), el resto era
// placeholder sin persistencia real (Metrics Settings, Goal Calories & Macros,
// App Themes) — se eliminaron en vez de arrastrarlos aquí. Un solo menú en
// vez de Profile → engranaje → Settings → item.
// Rediseño 2026-08-23 (pedido explícito, capturas de referencia de la propia
// Bevel real): en vez de una única tarjeta plana con todos los items, se
// agrupan por sección (tarjeta blanca + etiqueta gris encima, como el
// "Ajustes" real de Bevel) y cada fila lleva su icono en un cuadrado de
// color, no un icono plano suelto.
function buildMenuSections(isSocial: boolean, C: ReturnType<typeof useAppColorMode>['colors']): MenuSection[] {
  return [
    {
      label: 'Cuenta',
      items: [
        { icon: 'person-outline', title: 'Editar perfil', subtitle: 'Nombre, foto, peso, altura y más', route: 'MigratedEditProfile', iconColor: C.textPrimary, iconBg: C.brand10 },
        { icon: 'key-outline', title: 'Cambiar contraseña', route: 'MigratedChangePwd', visible: !isSocial, iconColor: C.warning60, iconBg: C.warning10 },
      ],
    },
    {
      label: 'Actividad',
      items: [
        { icon: 'barbell-outline', title: 'Mi programa', subtitle: 'Tu plan de entrenamiento actual', route: 'MigratedMyProgramCalendar', iconColor: C.success60, iconBg: C.success10 },
        { icon: 'time-outline', title: 'Historial de entrenamientos', subtitle: 'Tus sesiones completadas', route: 'MigratedWorkoutHistory', iconColor: C.blue, iconBg: C.blue10 },
        { icon: 'trending-up-outline', title: 'Progreso', subtitle: 'Tu evolución a lo largo del tiempo', route: 'MigratedProgress', iconColor: C.orange, iconBg: 'rgba(255,107,53,0.15)' },
        { icon: 'heart-outline', title: 'Favoritos', subtitle: 'Recetas y workouts guardados', route: 'MigratedFavourite', iconColor: C.destructive, iconBg: C.destructive10 },
      ],
    },
    {
      label: 'Preferencias',
      items: [
        // Todavía no hay integración real con wearables (backend pendiente)
        // -- entrada visible ya, pantalla honesta "Próximamente" en vez de
        // fingir datos, mismo criterio que se aplicó a "Sueño" en el Informe.
        { icon: 'watch-outline', title: 'Dispositivos', subtitle: 'Conecta tu reloj o app de salud', route: 'MigratedComingSoon', params: { title: 'Dispositivos' }, iconColor: C.blue, iconBg: C.blue10 },
        { icon: 'notifications-outline', title: 'Notificaciones', route: 'MigratedNotification', iconColor: C.warning60, iconBg: C.warning10 },
        // Desactivada para esta primera versión (pedido explícito): los
        // usuarios todavía no pueden acceder a MigratedLanguage. Mismo
        // patrón ya usado arriba para "Dispositivos" -- apunta al
        // placeholder honesto MigratedComingSoon en vez de a la pantalla
        // real, sin tocar ésta ni su ruta en App.tsx.
        { icon: 'language-outline', title: 'Idioma', route: 'MigratedComingSoon', params: { title: 'Idioma' }, iconColor: C.success60, iconBg: C.success10 },
      ],
    },
    {
      label: 'Información',
      items: [
        { icon: 'information-circle-outline', title: 'Acerca de', route: 'MigratedAboutApp', iconColor: C.textPrimary, iconBg: C.brand10 },
      ],
    },
  ];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  return letters || 'U';
}

export default function ProfileScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const { state, logout } = useAuth();
  const user = state.user;

  const userName = user?.display_name || user?.first_name || 'Usuario';
  const userEmail = user?.email || '';
  const profileImage = user?.profile_image || '';
  const isSocial = user?.login_type != null;
  const menuSections = buildMenuSections(isSocial, C)
    .map((section) => ({ ...section, items: section.items.filter((item) => item.visible !== false) }))
    .filter((section) => section.items.length > 0);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
    : '--';
  // "Versión" (Constants.expoConfig?.version, ej. "1.2.0") es literal en
  // app.json -- NUNCA cambia entre builds, así que por sí sola no sirve para
  // comprobar si un IPA nuevo se instaló de verdad (causa real, documentada,
  // de que dos IPAs en verde seguidos "no mostraran cambios": no había forma
  // de distinguirlos en pantalla). nativeBuildVersion sí es distinto en cada
  // build desde que ios-build.yml empezó a poner CFBundleVersion a
  // $GITHUB_RUN_NUMBER (ver docs/BUILD_IPA.md) -- se añade aquí como el
  // identificador real y verificable de qué build hay instalado.
  const appVersion = Constants.expoConfig?.version ?? '--';
  const nativeBuild = Constants.nativeBuildVersion;
  const appVersionDisplay = nativeBuild ? `${appVersion} (${nativeBuild})` : appVersion;

  // Nº de entrenamientos completados -- mismo endpoint que Workout History,
  // solo se necesita el total (no hace falta paginar, esta lista de
  // sesiones ya viene completa desde el backend).
  const [workoutsCount, setWorkoutsCount] = useState<number | null>(null);
  useEffect(() => {
    workoutHistoryApi
      .getMyCompletedSessions()
      .then((res) => setWorkoutsCount(res.data?.data?.length ?? 0))
      .catch(() => setWorkoutsCount(0));
  }, []);

  const copyEmail = async () => {
    if (!userEmail) return;
    await Clipboard.setStringAsync(userEmail);
  };

  const handleMenuItemPress = (item: MenuItem) => {
    props.navigation?.navigate(item.route, item.params);
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
    ]);
  };

  // Misma screen registrada dos veces en App.tsx (MigratedProfile /
  // MigratedProfileModal, presentation:'modal' solo en la segunda) para
  // poder abrirse como diálogo desde el icono de ajustes de Home v2 sin
  // duplicar contenido -- `route.name` es lo único que distingue por cuál
  // de las dos se llegó. La X de cerrar solo tiene sentido en el modal (en
  // push normal ya se cierra con el gesto de volver de siempre, y añadir la
  // X ahí cambiaría cómo se ve entrando desde cualquier otro sitio, que es
  // justo lo que no se quería tocar).
  const isModal = props.route?.name === 'MigratedProfileModal';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }} showsVerticalScrollIndicator={false}>
        <Box className="px-5" style={{ paddingTop: 16 }}>
          {isModal ? (
            <HStack className="items-center justify-between" style={{ marginBottom: 16 }}>
              <Heading size="md">Perfil</Heading>
              <Pressable
                className="items-center justify-center rounded-pill"
                style={{ width: 32, height: 32, backgroundColor: C.surface }}
                onPress={() => props.navigation?.goBack()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <Icon name="close" size={18} color={C.textPrimary} />
              </Pressable>
            </HStack>
          ) : (
            <Heading size="md" style={{ marginBottom: 16 }}>Perfil</Heading>
          )}

          <Box className="rounded-lg items-center px-5" style={{ backgroundColor: C.surface, paddingVertical: 24 }}>
            <Box className="relative" style={{ marginBottom: 12 }}>
              <Box
                className="rounded-pill items-center justify-center overflow-hidden"
                style={{ width: 88, height: 88, backgroundColor: C.blue }}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} contentFit="cover" style={{ width: 88, height: 88, borderRadius: 44 }} />
                ) : (
                  <Text weight="bold" size="2xl" style={{ color: '#FFFFFF' }}>{initialsFor(userName)}</Text>
                )}
              </Box>
              <Pressable
                className="absolute rounded-pill items-center justify-center"
                style={{ bottom: 0, right: 0, width: 28, height: 28, backgroundColor: C.orange, borderWidth: 2, borderColor: C.surface }}
                onPress={() => props.navigation?.navigate('MigratedEditProfile')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Editar foto de perfil"
              >
                <Icon name="pencil" size={12} color="#FFFFFF" />
              </Pressable>
            </Box>

            <Text weight="bold" size="xl">{userName}</Text>
            {!!userEmail && (
              <Pressable className="flex-row items-center" style={{ marginTop: 4, gap: 6 }} onPress={copyEmail}>
                <Text size="sm" muted>{userEmail}</Text>
                <Icon name="copy-outline" size={14} color={C.gray40} />
              </Pressable>
            )}

            <HStack
              className="w-full justify-around"
              style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border }}
            >
              <Box className="items-center">
                <Text weight="bold" size="md">{workoutsCount ?? '--'}</Text>
                <Text size="xs" muted style={{ marginTop: 2 }}>Entrenamientos</Text>
              </Box>
              <Box className="items-center">
                <Text weight="bold" size="md">{memberSince}</Text>
                <Text size="xs" muted style={{ marginTop: 2 }}>Usuario desde</Text>
              </Box>
              <Box className="items-center">
                <Text weight="bold" size="md">{appVersionDisplay}</Text>
                <Text size="xs" muted style={{ marginTop: 2 }}>Versión</Text>
              </Box>
            </HStack>
          </Box>

          <HStack style={{ marginTop: 16, gap: 12 }}>
            <Pressable
              className="flex-1 rounded-lg"
              style={{ backgroundColor: C.surface, padding: 16 }}
              onPress={() => props.navigation?.navigate('MigratedCommunity')}
            >
              <AppIcon name="people-outline" size={18} color={C.textPrimary} bg={C.brand10} containerSize={36} borderRadius={12} style={{ marginBottom: 10 }} />
              <Text weight="bold" size="sm">Comunidad</Text>
              <Text size="xs" muted style={{ marginTop: 2 }}>Ver publicaciones</Text>
            </Pressable>
            {/* Chat desactivado en esta primera versión (ver
                constants/featureFlags.ts, CHAT_ENABLED) -- sin moderación ni
                forma de reportar mensajes todavía, riesgo real de rechazo en
                revisión de Apple/Google. */}
            <Pressable
              className="flex-1 rounded-lg"
              style={{ backgroundColor: C.surface, padding: 16 }}
              onPress={() =>
                CHAT_ENABLED
                  ? props.navigation?.navigate('MigratedChatting', { isDirect: true })
                  : Alert.alert('Próximamente', 'Podrás chatear con el soporte en la próxima versión de la app.')
              }
            >
              <AppIcon name="chatbubble-ellipses-outline" size={18} color={C.orange} bg="rgba(255,107,53,0.15)" containerSize={36} borderRadius={12} style={{ marginBottom: 10 }} />
              <Text weight="bold" size="sm">Soporte</Text>
              <Text size="xs" muted style={{ marginTop: 2 }}>Chat con el bot</Text>
            </Pressable>
          </HStack>

          {menuSections.map((section) => (
            <Box key={section.label} style={{ marginTop: 24 }}>
              <Text weight="bold" size="sm" style={{ marginBottom: 10, marginLeft: 4 }}>{section.label}</Text>
              <Box className="rounded-lg overflow-hidden" style={{ backgroundColor: C.surface }}>
                {section.items.map((item, index) => (
                  <Pressable
                    key={item.route + item.title}
                    className="flex-row items-center px-4"
                    style={[
                      { paddingVertical: 12 },
                      index < section.items.length - 1 ? { borderBottomWidth: 1, borderBottomColor: C.border } : null,
                    ]}
                    onPress={() => handleMenuItemPress(item)}
                  >
                    <AppIcon name={item.icon} size={18} color={item.iconColor} bg={item.iconBg} containerSize={36} borderRadius={12} style={{ marginRight: 14 }} />
                    <Box className="flex-1">
                      <Text weight="medium" size="sm">{item.title}</Text>
                      {!!item.subtitle && <Text size="xs" muted style={{ marginTop: 2 }}>{item.subtitle}</Text>}
                    </Box>
                    <Icon name="chevron-forward" size={18} color={C.gray50} />
                  </Pressable>
                ))}
              </Box>
            </Box>
          ))}

          <Pressable
            className="flex-row items-center justify-center rounded-lg"
            style={{ backgroundColor: C.destructive10, paddingVertical: 14, marginTop: 16 }}
            onPress={handleLogout}
          >
            <Icon name="log-out-outline" size={18} color={C.destructive} style={{ marginRight: 8 }} />
            <Text weight="bold" size="sm" style={{ color: C.destructive }}>Cerrar sesión</Text>
          </Pressable>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
}
