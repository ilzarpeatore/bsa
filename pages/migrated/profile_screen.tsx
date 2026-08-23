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
import { C } from './theme';
import { useAuth } from '../../store/AuthContext';
import { TAB_BAR_CLEARANCE } from '@components/NavigationTab';
import { workoutHistoryApi } from '../../api/workoutHistory';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  route: string;
  params?: Record<string, any>;
  visible?: boolean;
}

// Fusionado desde MigratedSetting (2026-08-06): esa pantalla intermedia solo
// tenía 2 opciones reales ('Mi programa' y 'Change Password'), el resto era
// placeholder sin persistencia real (Metrics Settings, Goal Calories & Macros,
// App Themes) — se eliminaron en vez de arrastrarlos aquí. Un solo menú en
// vez de Profile → engranaje → Settings → item.
// Rediseño 2026-08-23 (pedido explícito, capturas de referencia): filas
// dentro de una sola tarjeta con separadores, título + subtítulo, icono
// plano (sin círculo de color) — "Sign Out" se deja fuera de la lista,
// como acción destructiva propia al final (como ya era antes).
function buildMenuItems(isSocial: boolean): MenuItem[] {
  return [
    { icon: 'person-outline', title: 'Editar perfil', subtitle: 'Nombre, foto, peso, altura y más', route: 'MigratedEditProfile' },
    { icon: 'barbell-outline', title: 'Mi programa', subtitle: 'Tu plan de entrenamiento actual', route: 'MigratedMyProgramCalendar' },
    { icon: 'time-outline', title: 'Historial de entrenamientos', subtitle: 'Tus sesiones completadas', route: 'MigratedWorkoutHistory' },
    { icon: 'trending-up-outline', title: 'Progreso', subtitle: 'Tu evolución a lo largo del tiempo', route: 'MigratedProgress' },
    { icon: 'heart-outline', title: 'Favoritos', subtitle: 'Recetas y workouts guardados', route: 'MigratedFavourite' },
    // Todavía no hay integración real con wearables (backend pendiente) —
    // entrada visible ya, pantalla honesta "Próximamente" en vez de fingir
    // datos, mismo criterio que se aplicó a "Sueño" en el Informe.
    { icon: 'watch-outline', title: 'Dispositivos', subtitle: 'Conecta tu reloj o app de salud', route: 'MigratedComingSoon', params: { title: 'Dispositivos' } },
    { icon: 'notifications-outline', title: 'Notificaciones', route: 'MigratedNotification' },
    { icon: 'language-outline', title: 'Idioma', route: 'MigratedLanguage' },
    { icon: 'key-outline', title: 'Cambiar contraseña', route: 'MigratedChangePwd', visible: !isSocial },
    { icon: 'information-circle-outline', title: 'Acerca de', route: 'MigratedAboutApp' },
  ];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  return letters || 'U';
}

export default function ProfileScreen(props: any) {
  const { state, logout } = useAuth();
  const user = state.user;

  const userName = user?.display_name || user?.first_name || 'Usuario';
  const userEmail = user?.email || '';
  const profileImage = user?.profile_image || '';
  const isSocial = user?.login_type != null;
  const menuItems = buildMenuItems(isSocial).filter((item) => item.visible !== false);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
    : '--';
  const appVersion = Constants.expoConfig?.version ?? '--';

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

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }} showsVerticalScrollIndicator={false}>
        <Box className="px-5" style={{ paddingTop: 16 }}>
          <Heading size="md" style={{ marginBottom: 16 }}>Perfil</Heading>

          <Box className="rounded-lg items-center px-5" style={{ backgroundColor: C.gray80, paddingVertical: 24 }}>
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
                style={{ bottom: 0, right: 0, width: 28, height: 28, backgroundColor: C.orange, borderWidth: 2, borderColor: C.gray80 }}
                onPress={() => props.navigation?.navigate('MigratedEditProfile')}
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
                <Text weight="bold" size="md">{appVersion}</Text>
                <Text size="xs" muted style={{ marginTop: 2 }}>Versión</Text>
              </Box>
            </HStack>
          </Box>

          <HStack style={{ marginTop: 16, gap: 12 }}>
            <Pressable
              className="flex-1 rounded-lg"
              style={{ backgroundColor: C.gray80, padding: 16 }}
              onPress={() => props.navigation?.navigate('MigratedCommunity')}
            >
              <AppIcon name="people-outline" size={18} color={C.textPrimary} bg={C.brand10} containerSize={36} borderRadius={12} style={{ marginBottom: 10 }} />
              <Text weight="bold" size="sm">Comunidad</Text>
              <Text size="xs" muted style={{ marginTop: 2 }}>Ver publicaciones</Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-lg"
              style={{ backgroundColor: C.gray80, padding: 16 }}
              onPress={() => props.navigation?.navigate('MigratedChatting', { isDirect: true })}
            >
              <AppIcon name="chatbubble-ellipses-outline" size={18} color={C.orange} bg="rgba(255,107,53,0.15)" containerSize={36} borderRadius={12} style={{ marginBottom: 10 }} />
              <Text weight="bold" size="sm">Soporte</Text>
              <Text size="xs" muted style={{ marginTop: 2 }}>Chat con el bot</Text>
            </Pressable>
          </HStack>

          <Text weight="bold" size="sm" style={{ marginTop: 24, marginBottom: 10 }}>Cuenta y ajustes</Text>
          <Box className="rounded-lg overflow-hidden" style={{ backgroundColor: C.gray80 }}>
            {menuItems.map((item, index) => (
              <Pressable
                key={item.route + item.title}
                className="flex-row items-center px-4"
                style={[
                  { paddingVertical: 14 },
                  index < menuItems.length - 1 ? { borderBottomWidth: 1, borderBottomColor: C.border } : null,
                ]}
                onPress={() => handleMenuItemPress(item)}
              >
                <Icon name={item.icon} size={20} color={C.textPrimary} />
                <Box className="flex-1" style={{ marginLeft: 14 }}>
                  <Text weight="medium" size="sm">{item.title}</Text>
                  {!!item.subtitle && <Text size="xs" muted style={{ marginTop: 2 }}>{item.subtitle}</Text>}
                </Box>
                <Icon name="chevron-forward" size={18} color={C.gray50} />
              </Pressable>
            ))}
          </Box>

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
