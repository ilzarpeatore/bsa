import React, { useState, useEffect, useRef, useCallback } from 'react';
import {  FlatList, ActivityIndicator  } from 'react-native';
import {  Image  } from 'expo-image';
import {  SafeAreaView  } from 'react-native-safe-area-context';
import {  Box  } from '@components/ui/box';
import {  Text  } from '@components/ui/text';
import {  Pressable  } from '@components/ui/pressable';
import {  Icon  } from '@components/ui/icon';
import ScreenHeader from '@components/ScreenHeader';
import {  postsApi  } from '../../api/posts';
import logger from '@helper/logger';
import {  RADIUS  } from './theme';
import { useAppColorMode } from '@helper/useAppColorMode';

interface BookmarkPost {
  id: number;
  content?: string;
  postImage?: string;
  users?: { id?: number; displayName?: string; profileImage?: string };
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  createdAt?: string;
}

export default function BookmarkScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const [postList, setPostList] = useState<BookmarkPost[]>([]);
  // page/numPage stay as state (not refs): both are read during render below
  // to drive the loading indicators, so they need to trigger a re-render.
  const [page, setPage] = useState(1);
  const [numPage, setNumPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<FlatList>(null);

  useEffect(() => {
    getPostList(1);
  }, []);

  const getPostList = useCallback(async (pageNum: number = 1) => {
    setLoading(true);
    try {
      const res = await postsApi.getBookmarks(pageNum);
      setNumPage(res.data.pagination?.totalPages ?? 1);
      const list: BookmarkPost[] = (res.data.data ?? []).map((p: any) => ({
        id: p.id,
        content: p.description,
        postImage: p.posting_media_array?.[0]?.media_url ?? '',
        users: p.users
          ? {
              id: p.users.id,
              displayName: p.users.display_name,
              profileImage: p.users.profile_image,
            }
          : undefined,
        likesCount: p.posting_like_count,
        commentsCount: p.posting_comment_count,
        isLiked: p.is_liked,
        createdAt: p.created_at,
      }));
      setPostList((prev) => (pageNum === 1 ? list : [...prev, ...list]));
    } catch (e) {
      logger.error('Error fetching bookmarks:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = () => {
    setPage(1);
    getPostList(1);
  };

  const handleBookmarksEndReached = () => {
    if (!loading && numPage != null && page < numPage) {
      const nextPage = page + 1;
      setPage(nextPage);
      getPostList(nextPage);
    }
  };

  const toggleLike = useCallback((item: BookmarkPost) => {
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
  }, []);

  const unbookmark = useCallback(
    (item: BookmarkPost) => {
      setPostList((prev) => prev.filter((p) => p.id !== item.id));
      postsApi.bookmark(item.id).catch((e) => {
        logger.error('Error removing bookmark', e);
        getPostList(1);
      });
    },
    [getPostList],
  );

  const openDetail = useCallback(
    (item: BookmarkPost) => {
      navigation.navigate('MigratedPostDetails', {
        postData: {
          id: item.id,
          content: item.content,
          images: item.postImage ? [item.postImage] : [],
          users: {
            id: item.users?.id,
            firstName: item.users?.displayName || 'Usuario',
            lastName: '',
            profileImage: item.users?.profileImage,
          },
          likesCount: item.likesCount,
          commentsCount: item.commentsCount,
          isLiked: item.isLiked,
          isBookmarked: true,
          createdAt: item.createdAt,
        },
      });
    },
    [navigation],
  );

  const renderPostCard = useCallback(
    ({ item }: { item: BookmarkPost }) => {
      return (
        <Pressable
          className="bg-card rounded-md overflow-hidden mx-4 my-1.5"
          onPress={() => openDetail(item)}>
          {/* User header */}
          <Box className="flex-row items-center gap-2.5 p-3">
            {item.users?.profileImage ? (
              <Image
                source={{ uri: item.users.profileImage }}
                contentFit="cover"
                style={{ width: 36, height: 36, borderRadius: 18 }}
              />
            ) : (
              <Box className="w-9 h-9 rounded-full bg-secondary items-center justify-center">
                <Icon name="person" size={20} className="text-muted-foreground" />
              </Box>
            )}
            <Box className="flex-1">
              <Text weight="semibold" size="sm">
                {item.users?.displayName ?? 'Usuario'}
              </Text>
              <Text muted size="xs">
                {item.createdAt ?? ''}
              </Text>
            </Box>
          </Box>

          {/* Description */}
          {item.content ? (
            <Text size="sm" muted className="px-3" style={{ paddingBottom: 8, lineHeight: 20 }}>
              {item.content}
            </Text>
          ) : null}

          {/* Image */}
          {item.postImage ? (
            <Box className="mx-3" style={{ marginBottom: 8 }}>
              <Image
                source={{ uri: item.postImage }}
                style={{ width: '100%', height: 200, borderRadius: RADIUS.xs }}
                contentFit="cover"
              />
            </Box>
          ) : null}

          {/* Actions */}
          <Box className="flex-row items-center gap-6 px-3 py-2.5 border-t border-border">
            <Pressable
              style={({ pressed }: { pressed: boolean }) => [
                { flexDirection: 'row', alignItems: 'center', gap: 6 },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => toggleLike(item)}>
              <Icon
                name={item.isLiked ? 'heart' : 'heart-outline'}
                size={22}
                className={item.isLiked ? 'text-destructive' : 'text-muted-foreground'}
              />
              <Text size="sm" muted>
                {item.likesCount ?? 0}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }: { pressed: boolean }) => [
                { flexDirection: 'row', alignItems: 'center', gap: 6 },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => openDetail(item)}>
              <Icon name="chatbubble-outline" size={22} className="text-muted-foreground" />
              <Text size="sm" muted>
                {item.commentsCount ?? 0}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }: { pressed: boolean }) => [
                { flexDirection: 'row', alignItems: 'center', gap: 6 },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => unbookmark(item)}>
              <Icon name="bookmark" size={22} className="text-foreground" />
            </Pressable>
          </Box>
        </Pressable>
      );
    },
    [openDetail, toggleLike, unbookmark],
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="Guardados" onBack={() => navigation.goBack()} />

      <Box className="flex-1">
        {loading && page === 1 ? (
          <Box className="flex-1 items-center justify-center gap-3">
            <ActivityIndicator size="large" color="#000000" />
          </Box>
        ) : postList.length > 0 ? (
          <FlatList
            ref={scrollRef}
            data={postList}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderPostCard}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
            onEndReached={handleBookmarksEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loading && page > 1 ? (
                <Box className="items-center py-4">
                  <ActivityIndicator size="small" color="#000000" />
                </Box>
              ) : null
            }
          />
        ) : (
          <Box className="flex-1 items-center justify-center gap-3">
            <Icon name="bookmark-outline" size={56} className="text-muted-foreground" />
            <Text weight="medium" muted>
              No hay publicaciones guardadas
            </Text>
          </Box>
        )}
      </Box>
    </SafeAreaView>
  );
}
