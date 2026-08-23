import React from 'react';
import { ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
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

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  iconColor?: string;
  iconBg?: string;
  textColor?: string;
  route: string;
  params?: Record<string, any>;
  visible?: boolean;
}

// Fusionado desde MigratedSetting (2026-08-06): esa pantalla intermedia solo
// tenía 2 opciones reales ('Mi programa' y 'Change Password'), el resto era
// placeholder sin persistencia real (Metrics Settings, Goal Calories & Macros,
// App Themes) — se eliminaron en vez de arrastrarlos aquí. Un solo menú en
// vez de Profile → engranaje → Settings → item.
function buildMenuItems(isSocial: boolean): MenuItem[] {
  return [
    { icon: 'person-outline', title: 'Edit Profile', iconBg: C.brand10, route: 'MigratedEditProfile' },
    { icon: 'barbell-outline', title: 'Mi programa', iconBg: 'rgba(255,107,53,0.15)', route: 'MigratedMyProgramCalendar' },
    { icon: 'time-outline', title: 'Workout History', iconBg: C.blue10, route: 'MigratedWorkoutHistory' },
    { icon: 'trending-up', title: 'Progress', iconBg: C.success10, route: 'MigratedProgress' },
    { icon: 'heart-outline', title: 'Favorites', iconBg: C.destructive10, route: 'MigratedFavourite' },
    // Todavía no hay integración real con wearables (backend pendiente) —
    // entrada visible ya, pantalla honesta "Próximamente" en vez de fingir
    // datos, mismo criterio que se aplicó a "Sueño" en el Informe.
    { icon: 'watch-outline', title: 'Dispositivos', iconBg: C.blue10, route: 'MigratedComingSoon', params: { title: 'Dispositivos' } },
    { icon: 'notifications-outline', title: 'Notifications', iconBg: C.warning10, route: 'MigratedNotification' },
    { icon: 'language-outline', title: 'Language', iconBg: C.brand10, route: 'MigratedLanguage' },
    { icon: 'key-outline', title: 'Change Password', iconBg: C.brand10, route: 'MigratedChangePwd', visible: !isSocial },
    { icon: 'information-circle-outline', title: 'About', iconBg: C.brand10, route: 'MigratedAboutApp' },
    { icon: 'log-out-outline', title: 'Sign Out', iconColor: C.destructive, iconBg: C.destructive10, textColor: C.destructive, route: 'Logout' },
  ];
}

interface StatTileProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}

function StatTile({ label, value, icon }: StatTileProps) {
  return (
    <Box className="flex-1 items-center rounded-sm py-4" style={{ backgroundColor: C.gray80 }}>
      <AppIcon name={icon} size={20} color={C.orange} bg="rgba(255,107,53,0.15)" containerSize={40} style={{ marginBottom: 8 }} />
      <Text weight="bold" size="lg">{value}</Text>
      <Text size="xs" muted style={{ marginTop: 4 }}>{label}</Text>
    </Box>
  );
}

export default function ProfileScreen(props: any) {
  const { state, logout } = useAuth();
  const user = state.user;
  const profile = user?.user_profile;

  const userName = user?.display_name || user?.first_name || 'Usuario';
  const userEmail = user?.email || '';
  const userWeight = profile?.weight ? `${profile.weight}` : '--';
  const userHeight = profile?.height ? `${profile.height}` : '--';
  const userAge = profile?.age ? `${profile.age}` : '--';
  const profileImage = user?.profile_image || '';
  const isSocial = user?.login_type != null;
  const menuItems = buildMenuItems(isSocial).filter((item) => item.visible !== false);

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.route === 'Logout') {
      Alert.alert('Cerrar sesión', '¿Estás seguro de que quieres cerrar sesión?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
      ]);
      return;
    }
    props.navigation?.navigate(item.route, item.params);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }} showsVerticalScrollIndicator={false}>
        <Box className="rounded-b-lg px-5 items-center" style={{ backgroundColor: C.gray80, paddingTop: 24, paddingBottom: 24 }}>
          <HStack className="items-center w-full" style={{ marginBottom: 24 }}>
            <Heading size="md">Profile</Heading>
          </HStack>
          <Box className="relative" style={{ marginBottom: 16 }}>
            <Box className="rounded-pill bg-card items-center justify-center overflow-hidden" style={{ width: 96, height: 96 }}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} contentFit="cover" style={{ width: 96, height: 96, borderRadius: 48 }} />
              ) : (
                <Icon name="person" size={40} color={C.gray30} />
              )}
            </Box>
            <Pressable
              className="absolute rounded-pill items-center justify-center"
              style={{ bottom: 0, right: 0, width: 32, height: 32, backgroundColor: C.orange, borderWidth: 2, borderColor: C.gray80 }}
              onPress={() => props.navigation?.navigate('MigratedEditProfile')}
            >
              <Icon name="pencil" size={14} color="#FFFFFF" />
            </Pressable>
          </Box>
          <Text weight="bold" size="xl">{userName}</Text>
          <Text size="sm" muted style={{ marginTop: 4 }}>{userEmail}</Text>
        </Box>

        <Box className="flex-row px-5 gap-2" style={{ marginTop: 24 }}>
          <StatTile label="Weight" value={`${userWeight} kg`} icon="scale-outline" />
          <StatTile label="Height" value={`${userHeight} cm`} icon="resize-outline" />
          <StatTile label="Age" value={userAge} icon="calendar-outline" />
        </Box>

        <Box className="px-5 gap-2" style={{ marginTop: 24 }}>
          {menuItems.map((item) => (
            <Pressable
              key={item.route}
              className="flex-row items-center rounded-sm px-4"
              style={{ backgroundColor: C.gray80, paddingVertical: 14 }}
              onPress={() => handleMenuItemPress(item)}
            >
              <AppIcon
                name={item.icon}
                size={22}
                color={item.iconColor ?? C.textPrimary}
                bg={item.iconBg ?? C.brand10}
                containerSize={40}
                borderRadius={12}
              />
              <Text
                weight="medium"
                className="flex-1"
                style={[{ marginLeft: 16 }, item.textColor ? { color: item.textColor } : null]}
              >
                {item.title}
              </Text>
              <Icon name="chevron-forward" size={20} color={C.gray50} />
            </Pressable>
          ))}
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
}
