import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { VStack } from '@components/ui/vstack';
import { Button, ButtonText } from '@components/ui/button';
import AppIcon from '@components/AppIcon';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';
import { notificationsApi, NotificationItem } from '../../api/notifications';

interface DisplayNotification {
  id: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  time: string;
  isUnread: boolean;
  image?: string | null;
}

type IconMap = Record<string, { icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }>;

function buildIconMap(C: ReturnType<typeof useAppColorMode>['colors']): IconMap {
  return {
    push_notification: { icon: 'notifications', bg: C.destructive5, color: C.orange },
    workout_reminder: { icon: 'barbell', bg: C.destructive5, color: C.orange },
    goal_achieved: { icon: 'trophy', bg: C.success5, color: C.success },
    water_reminder: { icon: 'water', bg: C.blue5, color: C.blue },
    subscription: { icon: 'star', bg: C.warning5, color: C.warning },
  };
}

function mapNotification(item: NotificationItem, iconMap: IconMap): DisplayNotification {
  const payload = item.data ?? {};
  const typeKey = payload.type ?? 'push_notification';
  const mapped = iconMap[typeKey] ?? iconMap.push_notification;

  return {
    id: item.id,
    icon: mapped.icon,
    iconBg: mapped.bg,
    iconColor: mapped.color,
    title: payload.title ?? payload.message ?? 'Notificación',
    subtitle: payload.description ?? payload.body ?? '',
    time: item.created_at ?? '',
    isUnread: !item.read_at,
    image: item.image,
  };
}

function NotificationCard({ item }: { item: DisplayNotification }) {
  const { colors: C } = useAppColorMode();
  return (
    <Box
      className={`flex-row gap-3.5 p-3.5 rounded-sm ${item.isUnread ? 'bg-secondary border border-border' : ''}`}
      style={!item.isUnread ? { backgroundColor: C.bg } : undefined}
    >
      <AppIcon name={item.icon} size={22} color={item.iconColor} bg={item.iconBg} containerSize={44} borderRadius={12} />
      <Box className="flex-1">
        <VStack space="xs">
          <Box className="flex-row items-center gap-2">
            <Text
              size="sm"
              weight={item.isUnread ? 'semibold' : 'regular'}
              className="flex-1 text-foreground"
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {item.isUnread && <Box className="w-2 h-2 rounded-pill bg-warning" />}
          </Box>
          {item.subtitle ? (
            <Text size="xs" muted numberOfLines={2}>{item.subtitle}</Text>
          ) : null}
          <Text size="xs" muted className="text-[11px]">{item.time}</Text>
        </VStack>
      </Box>
    </Box>
  );
}

export default function NotificationScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const iconMap = useMemo(() => buildIconMap(C), [C]);
  const [notifications, setNotifications] = useState<DisplayNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const pageRef = useRef(1);

  const loadNotifications = useCallback(async (p: number = 1) => {
    try {
      const res = await notificationsApi.getList(p);
      const data = res.data;
      const items = (data.notification_data ?? []).map((item) => mapNotification(item, iconMap));
      if (p === 1) {
        setNotifications(items);
      } else {
        setNotifications(prev => [...prev, ...items]);
      }
      setUnreadCount(data.all_unread_count ?? 0);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [iconMap]);

  useEffect(() => {
    loadNotifications(1);
  }, [loadNotifications]);

  const markAllRead = async () => {
    try {
      const res = await notificationsApi.markAllRead();
      setUnreadCount(res.data.all_unread_count ?? 0);
      setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })));
    } catch {
    }
  };

  const loadMore = () => {
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    loadNotifications(nextPage);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader
        title="Notificaciones"
        onBack={() => props.navigation?.goBack()}
        rightAction={
          unreadCount > 0 ? (
            <Button variant="secondary" size="sm" onPress={markAllRead}>
              <ButtonText className="text-warning">Marcar leídas</ButtonText>
            </Button>
          ) : undefined
        }
      />

      {isLoading && notifications.length === 0 ? (
        <Box className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="large" color={C.orange} />
        </Box>
      ) : notifications.length === 0 ? (
        <Box className="flex-1 items-center justify-center gap-3">
          <AppIcon name="notifications-off-outline" size={40} color={C.gray50} bg={C.brand10} containerSize={72} borderRadius={36} />
          <Text weight="semibold" muted>Sin notificaciones</Text>
        </Box>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
          ItemSeparatorComponent={() => <Box className="h-2" />}
          renderItem={NotificationCard}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={isLoading ? (
            <Box className="my-4">
              <ActivityIndicator size="small" color={C.orange} />
            </Box>
          ) : null}
        />
      )}
    </SafeAreaView>
  );
}
