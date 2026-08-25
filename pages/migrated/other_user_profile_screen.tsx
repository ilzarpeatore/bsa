import React, { useState, useEffect, useRef, useCallback } from 'react';
import {  ScrollView, ActivityIndicator, useWindowDimensions  } from 'react-native';
import {  Image  } from 'expo-image';
import {  SafeAreaView  } from 'react-native-safe-area-context';
import {  Box  } from '@components/ui/box';
import {  Text  } from '@components/ui/text';
import {  HStack  } from '@components/ui/hstack';
import {  VStack  } from '@components/ui/vstack';
import {  Pressable  } from '@components/ui/pressable';
import {  Icon  } from '@components/ui/icon';
import ScreenHeader from '@components/ScreenHeader';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import {  postsApi  } from '../../api/posts';
import {  profileApi, UserSocialStats  } from '../../api/profile';
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

export default function OtherUserProfileScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const { height: windowHeight } = useWindowDimensions();
  const userDetails: UserDetails = props.route?.params?.userDetails ?? {};

  const firstName = userDetails.firstName ?? '';
  const lastName = userDetails.lastName ?? '';
  const profileImg = userDetails.profileImage ?? '';
  const [postList, setPostList] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pageRef = useRef(1);
  const numPageRef = useRef(1);
  const [stats, setStats] = useState<UserSocialStats | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    getPostList(1);
    getStats();
  }, [userDetails.id]);

  const getStats = useCallback(async () => {
    if (!userDetails.id) return;
    try {
      const res = await profileApi.getSocialStats(userDetails.id);
      setStats(res.data.data);
    } catch (e) {
      logger.error('Error fetching user social stats', e);
    }
  }, [userDetails.id]);

  const getPostList = useCallback(
    async (pageNum: number = 1) => {
      if (!userDetails.id) return;
      setIsLoading(true);
      try {
        const res = await postsApi.getList(pageNum, userDetails.id);
        numPageRef.current = res.data.pagination?.totalPages ?? 1;
        const list: PostData[] = (res.data.data ?? []).map((p: any) => ({
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
      } catch (e) {
        logger.error('Error fetching user posts', e);
      } finally {
        setIsLoading(false);
      }
    },
    [userDetails.id],
  );

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
    props.navigation?.navigate('MigratedPostDetails', {
      postData: {
        id: item.id,
        content: item.content,
        images: item.images ?? [],
        canEdit: item.canEdit,
        users: {
          id: userDetails.id,
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
            {firstName} {lastName}
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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <Box
        className="absolute top-0 left-0 right-0"
        style={{ height: windowHeight * 0.3, backgroundColor: C.brand5 }}
      />
      <ScrollView ref={scrollRef} className="flex-1">
        <ScreenHeader title="Perfil" onBack={() => props.navigation?.goBack()} />
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
            {firstName} {lastName}
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
        </Box>
        <Box style={{ paddingHorizontal: 6, paddingTop: 16, paddingBottom: 24 }}>
          {postList.length > 0 ? (
            postList.map((item) => renderPostItem(item))
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
