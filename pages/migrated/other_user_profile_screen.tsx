import React, { useState, useEffect, useRef, useCallback } from 'react';
import {  ScrollView, ActivityIndicator, useWindowDimensions, Alert  } from 'react-native';
import {  Image  } from 'expo-image';
import {  SafeAreaView  } from 'react-native-safe-area-context';
import {  Box  } from '@components/ui/box';
import {  Text  } from '@components/ui/text';
import {  HStack  } from '@components/ui/hstack';
import {  VStack  } from '@components/ui/vstack';
import {  Pressable  } from '@components/ui/pressable';
import {  Icon  } from '@components/ui/icon';
import ScreenHeader from '@components/ScreenHeader';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import {  postsApi  } from '../../api/posts';
import {  profileApi, UserPublicStats, UserSocialStats  } from '../../api/profile';
import { userBlockApi } from '../../api/userBlock';
import { showToast } from '@helper/toast';
import logger from '@helper/logger';
import {  RADIUS  } from './theme';

interface UserDetails {
  id?: number;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
}

interface PostData {
  id?: number;
  content?: string;
  images?: string[];
  canEdit?: boolean;
  users?: { id?: number; firstName?: string; lastName?: string; profileImage?: string };
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt?: string;
}

// Estadisticas publicas: undefined = cargando, 'hidden' = el dueño no las comparte,
// 'error' = fallo de red/servidor, objeto = agregados visibles.
type PublicStatsState = UserPublicStats | 'hidden' | 'error' | undefined;

export default function OtherUserProfileScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const { height: windowHeight } = useWindowDimensions();
  // Bug real (2026-09-24, nota de la revision de pantallas): al pulsar el nombre/foto del
  // autor de un post la pantalla salia en blanco. Se abria con navigate(), que reutiliza
  // una instancia ya visitada sin refrescar de forma fiable los params anidados (mismo
  // fallo que MigratedPostDetails, commit abd5a11) -- ahora los llamadores usan push() y
  // ademas la pantalla nunca se queda en blanco: si faltan datos los completa desde las
  // publicaciones del propio usuario y, si no hay id, muestra un error explicito.
  const userDetails: UserDetails = props.route?.params?.userDetails ?? {};
  const userId = userDetails.id;

  const [identity, setIdentity] = useState<UserDetails>(userDetails);
  const firstName = identity.firstName ?? '';
  const lastName = identity.lastName ?? '';
  const displayName = `${firstName} ${lastName}`.trim() || 'Usuario';
  const profileImg = identity.profileImage ?? '';
  const [postList, setPostList] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [postsError, setPostsError] = useState(false);
  const pageRef = useRef(1);
  const numPageRef = useRef(1);
  const [stats, setStats] = useState<UserSocialStats | null>(null);
  const [publicStats, setPublicStats] = useState<PublicStatsState>(undefined);
  const [isBlocked, setIsBlocked] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const checkIfBlocked = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await userBlockApi.getMyBlockedUsers();
      setIsBlocked((res.data.data ?? []).some((u) => u.id === userId));
    } catch (e) {
      logger.error('Error checking blocked users', e);
    }
  }, [userId]);

  const toggleBlockUser = async () => {
    if (!userId) return;
    const name = displayName === 'Usuario' ? 'este usuario' : displayName;
    if (isBlocked) {
      try {
        await userBlockApi.unblock(userId);
        setIsBlocked(false);
        showToast('Usuario desbloqueado', { description: `Ya puedes ver el contenido de ${name} de nuevo.`, variant: 'success' });
      } catch (e) {
        logger.error('Error unblocking user', e);
        showToast('Error', { description: 'No se pudo desbloquear al usuario.', variant: 'error' });
      }
      return;
    }

    Alert.alert(`¿Bloquear a ${name}?`, 'No verás sus publicaciones ni comentarios, y no podrá interactuar con los tuyos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Bloquear',
        style: 'destructive',
        onPress: async () => {
          try {
            await userBlockApi.block(userId);
            setIsBlocked(true);
            showToast('Usuario bloqueado', { description: `Ya no verás publicaciones ni comentarios de ${name}.`, variant: 'success' });
          } catch (e) {
            logger.error('Error blocking user', e);
            showToast('Error', { description: 'No se pudo bloquear al usuario.', variant: 'error' });
          }
        },
      },
    ]);
  };

  const showProfileOptions = () => {
    Alert.alert('Perfil', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario', style: 'destructive', onPress: toggleBlockUser },
    ]);
  };

  const getStats = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await profileApi.getSocialStats(userId);
      setStats(res.data.data);
    } catch (e) {
      logger.error('Error fetching user social stats', e);
    }
  }, [userId]);

  const getPublicStats = useCallback(async () => {
    if (!userId) return;
    setPublicStats(undefined);
    try {
      const res = await profileApi.getPublicStats(userId);
      const d = res.data?.data;
      setPublicStats(d?.visible && d.stats ? d.stats : 'hidden');
    } catch (e) {
      logger.error('Error fetching user public stats', e);
      setPublicStats('error');
    }
  }, [userId]);

  const getPostList = useCallback(
    async (pageNum: number = 1) => {
      if (!userId) return;
      setIsLoading(true);
      setPostsError(false);
      try {
        const res = await postsApi.getList(pageNum, userId);
        numPageRef.current = res.data.pagination?.totalPages ?? 1;
        const rows: any[] = res.data.data ?? [];
        const list: PostData[] = rows.map((p: any) => ({
          id: p.id,
          content: p.description,
          images: p.posting_media_array?.map((m: any) => m.media_url) ?? [],
          canEdit: p.can_edit,
          likesCount: p.posting_like_count,
          commentsCount: p.posting_comment_count,
          isLiked: p.is_liked,
          isBookmarked: p.is_bookmark,
        }));
        setPostList((prev) => (pageNum === 1 ? list : [...prev, ...list]));
        pageRef.current = pageNum;
        // Si el llamador no traia nombre/foto, se completan con los del autor de sus posts.
        const author = rows.find((p: any) => p.users)?.users;
        if (author) {
          setIdentity((prev) => ({
            ...prev,
            firstName: prev.firstName && prev.firstName !== 'Usuario' ? prev.firstName : (author.display_name ?? prev.firstName),
            profileImage: prev.profileImage || author.profile_image,
          }));
        }
      } catch (e) {
        logger.error('Error fetching user posts', e);
        setPostsError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    setIdentity(userDetails);
    setPostList([]);
    getPostList(1);
    getStats();
    getPublicStats();
    checkIfBlocked();
    // userDetails viene de los params: solo cambia cuando cambia el usuario (userId).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const toggleLike = (item: PostData) => {
    if (!item.id) return;
    const wasLiked = !!item.isLiked;
    setPostList((prev) =>
      prev.map((p) =>
        p.id === item.id
          ? { ...p, isLiked: !wasLiked, likesCount: (p.likesCount || 0) + (wasLiked ? -1 : 1) }
          : p,
      ),
    );
    postsApi.like(item.id).catch((e) => {
      logger.error('Error toggling like', e);
      setPostList((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, isLiked: wasLiked, likesCount: item.likesCount } : p,
        ),
      );
    });
  };

  const openPostDetail = (item: PostData) => {
    // .push() en vez de .navigate() -- ver comentario en community_screen.tsx
    // (mismo bug real: .navigate() reutiliza la instancia ya visitada de
    // MigratedPostDetails en vez de refrescarla con los datos de este post).
    props.navigation?.push('MigratedPostDetails', {
      postData: {
        id: item.id,
        content: item.content,
        images: item.images ?? [],
        canEdit: item.canEdit,
        users: {
          id: userId,
          firstName,
          lastName,
          profileImage: profileImg,
        },
        likesCount: item.likesCount,
        commentsCount: item.commentsCount,
        isLiked: item.isLiked,
        isBookmarked: item.isBookmarked,
      },
    });
  };

  const renderPostItem = (item: PostData) => (
    <Pressable
      key={item.id}
      className="bg-card rounded-lg p-4"
      style={{ marginBottom: 12 }}
      onPress={() => openPostDetail(item)}>
      <HStack className="items-center" style={{ marginBottom: 12 }}>
        {profileImg ? (
          <Image
            source={{ uri: profileImg }}
            contentFit="cover"
            style={{ width: 40, height: 40, borderRadius: RADIUS.lg }}
          />
        ) : (
          <Box
            className="bg-muted rounded-pill items-center justify-center"
            style={{ width: 40, height: 40 }}>
            <Icon name="person" size={20} color={C.gray30} />
          </Box>
        )}
        <Box className="flex-1" style={{ marginLeft: 12 }}>
          <Text weight="semibold" size="sm">
            {displayName}
          </Text>
          <Text size="xs" style={{ color: C.gray40 }}>
            Publicación
          </Text>
        </Box>
      </HStack>
      {item.content ? (
        <Text size="sm" style={{ color: C.gray50, marginBottom: 12, lineHeight: 20 }}>
          {item.content}
        </Text>
      ) : null}
      {item.images && item.images.length > 0 ? (
        <HStack style={{ marginBottom: 12 }}>
          {item.images.map((img) => (
            <Image
              key={img}
              source={{ uri: img }}
              contentFit="cover"
              style={{
                width: 80,
                height: 80,
                borderRadius: RADIUS.xs,
                marginRight: 8,
                backgroundColor: C.surfaceLight,
              }}
            />
          ))}
        </HStack>
      ) : null}
      <HStack className="border-t border-border" style={{ paddingTop: 12 }}>
        <Pressable
          className="flex-row items-center"
          style={{ marginRight: 24 }}
          onPress={() => toggleLike(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon
            name={item.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={item.isLiked ? C.destructive : C.gray30}
          />
          <Text size="sm" style={{ color: C.gray30, marginLeft: 6 }}>
            {item.likesCount ?? 0}
          </Text>
        </Pressable>
        <Pressable
          className="flex-row items-center"
          onPress={() => openPostDetail(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="chatbubble-outline" size={20} color={C.gray30} />
          <Text size="sm" style={{ color: C.gray30, marginLeft: 6 }}>
            {item.commentsCount ?? 0}
          </Text>
        </Pressable>
      </HStack>
    </Pressable>
  );

  const renderStatTile = (value: string, label: string) => (
    <VStack className="items-center" style={{ width: '50%', paddingVertical: 10 }}>
      <Text weight="bold" size="lg">
        {value}
      </Text>
      <Text size="xs" style={{ color: C.gray40, marginTop: 2, textAlign: 'center' }}>
        {label}
      </Text>
    </VStack>
  );

  const renderPublicStats = () => {
    if (publicStats === undefined) {
      return <ActivityIndicator size="small" color={C.orange} style={{ marginTop: 16 }} />;
    }
    if (publicStats === 'hidden' || publicStats === 'error') {
      return (
        <Text size="xs" style={{ color: C.gray40, marginTop: 16, paddingHorizontal: 24, textAlign: 'center' }}>
          {publicStats === 'hidden'
            ? 'Este usuario no comparte sus estadísticas.'
            : 'No se pudieron cargar las estadísticas.'}
        </Text>
      );
    }
    return (
      <HStack className="flex-wrap border-t border-border" style={{ marginTop: 16, paddingTop: 8, width: '100%' }}>
        {renderStatTile(String(publicStats.workouts_last_30_days), 'Entrenos el último mes')}
        {renderStatTile(String(publicStats.records_count), 'Récords logrados')}
        {renderStatTile(publicStats.avg_duration_minutes !== null ? `${publicStats.avg_duration_minutes} min` : '-', 'Duración media')}
        {renderStatTile(
          `${publicStats.week_streak} ${publicStats.week_streak === 1 ? 'semana' : 'semanas'}`,
          'Racha actual',
        )}
      </HStack>
    );
  };

  if (!userId) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: C.bg }} edges={['bottom']}>
        <ScreenHeader title="Perfil" onBack={() => props.navigation?.goBack()} />
        <Box className="flex-1 items-center justify-center" style={{ paddingHorizontal: 32 }}>
          <Icon name="alert-circle-outline" size={48} color={C.gray40} />
          <Text weight="medium" style={{ color: C.gray40, marginTop: 12, textAlign: 'center' }}>
            No se pudo abrir este perfil.
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: C.bg }} edges={['bottom']}>
      <Box
        className="absolute top-0 left-0 right-0"
        style={{ height: windowHeight * 0.3, backgroundColor: C.brand5 }}
      />
      <ScrollView ref={scrollRef} className="flex-1">
        <ScreenHeader
          title="Perfil"
          onBack={() => props.navigation?.goBack()}
          rightAction={
            <Pressable onPress={showProfileOptions} className="p-2">
              <Icon name="ellipsis-horizontal" size={22} className="text-foreground" />
            </Pressable>
          }
        />
        <Box
          className="bg-card rounded-lg items-center"
          style={{ marginTop: windowHeight * 0.15, paddingTop: 60, paddingBottom: 24 }}>
          <Box className="absolute self-center" style={{ top: -48 }}>
            <Box
              className="bg-muted items-center justify-center overflow-hidden"
              style={{ width: 96, height: 96, borderRadius: 48 }}>
              {profileImg ? (
                <Image
                  source={{ uri: profileImg }}
                  contentFit="cover"
                  style={{ width: 96, height: 96, borderRadius: 48 }}
                />
              ) : (
                <Icon name="person" size={40} color={C.gray30} />
              )}
            </Box>
          </Box>
          <Text weight="bold" size="xl" style={{ marginTop: 8 }}>
            {displayName}
          </Text>
          <HStack className="items-center" style={{ marginTop: 16 }}>
            <VStack className="items-center" style={{ paddingHorizontal: 24 }}>
              <Text weight="bold" size="lg">
                {stats ? stats.workout_count : '-'}
              </Text>
              <Text size="xs" style={{ color: C.gray40, marginTop: 2 }}>
                Entrenamientos
              </Text>
            </VStack>
            <Box className="bg-border" style={{ width: 1, height: 28 }} />
            <VStack className="items-center" style={{ paddingHorizontal: 24 }}>
              <Text weight="bold" size="lg">
                {stats ? stats.posting_count : '-'}
              </Text>
              <Text size="xs" style={{ color: C.gray40, marginTop: 2 }}>
                Publicaciones
              </Text>
            </VStack>
          </HStack>
          {renderPublicStats()}
        </Box>
        <Box style={{ paddingHorizontal: 6, paddingTop: 16, paddingBottom: 24 + WORKOUT_MINIBAR_CLEARANCE }}>
          {postList.length > 0 ? (
            postList.map((item) => renderPostItem(item))
          ) : postsError ? (
            <Box className="items-center justify-center" style={{ paddingVertical: 48 }}>
              <Icon name="cloud-offline-outline" size={48} color={C.gray50} />
              <Text weight="medium" style={{ color: C.gray40, marginTop: 12 }}>
                No se pudieron cargar las publicaciones
              </Text>
              <Pressable onPress={() => getPostList(1)} style={{ marginTop: 12 }} accessibilityRole="button">
                <Text weight="semibold" style={{ color: C.orange }}>
                  Reintentar
                </Text>
              </Pressable>
            </Box>
          ) : !isLoading ? (
            <Box className="items-center justify-center" style={{ paddingVertical: 48 }}>
              <Icon name="document-text-outline" size={64} color={C.gray50} />
              <Text weight="medium" style={{ color: C.gray40, marginTop: 16 }}>
                Aún no hay publicaciones
              </Text>
            </Box>
          ) : null}
          {isLoading && (
            <ActivityIndicator size="small" color={C.orange} style={{ marginVertical: 16 }} />
          )}
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
}
