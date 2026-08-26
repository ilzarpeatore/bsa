import React, { useState, useRef, useCallback } from 'react';
import {  FlatList, RefreshControl, ActivityIndicator, Alert, StyleSheet  } from 'react-native';
import {  Image  } from 'expo-image';
import {  SafeAreaView  } from 'react-native-safe-area-context';
import {  useFocusEffect  } from '@react-navigation/native';
import {  Box  } from '@components/ui/box';
import {  Text  } from '@components/ui/text';
import {  HStack  } from '@components/ui/hstack';
import {  Heading  } from '@components/ui/heading';
import {  Button  } from '@components/ui/button';
import {  Pressable  } from '@components/ui/pressable';
import {  Icon  } from '@components/ui/icon';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import {  postsApi  } from '../../api/posts';
import logger from '@helper/logger';
import { showToast } from '@helper/toast';
import { hapticLight } from '@helper/haptics';
import {  RADIUS  } from './theme';

interface PostData {
  id: number;
  users?: { id: number; profileImage?: string; displayName?: string };
  canEdit?: boolean;
  [key: string]: any;
}

export default function CommunityScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const [mPostList, setMPostList] = useState<PostData[]>([]);
  const pageRef = useRef(1);
  const numPageRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollController = useRef<FlatList | null>(null);

  const getPostList = useCallback(async (pageNum: number = 1) => {
    setIsLoading(true);
    try {
      const res = await postsApi.getList(pageNum);
      numPageRef.current = res.data.pagination?.totalPages ?? 1;
      const list = (res.data.data ?? []).map((p: any) => ({
        id: p.id,
        users: p.users
          ? {
              id: p.users.id,
              profileImage: p.users.profile_image,
              displayName: p.users.display_name,
            }
          : undefined,
        canEdit: p.can_edit,
        content: p.description,
        postImage: p.posting_media_array?.[0]?.media_url ?? '',
        postingMediaArray: p.posting_media_array ?? [],
        createdAt: p.created_at,
        likesCount: p.posting_like_count,
        commentsCount: p.posting_comment_count,
        isLiked: p.is_liked,
        isBookmark: p.is_bookmark,
      }));
      if (pageNum === 1) setMPostList(list);
      else setMPostList((prev) => [...prev, ...list]);
    } catch (e) {
      logger.error('Error fetching posts', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      pageRef.current = 1;
      getPostList(1);
    }, [getPostList]),
  );

  const _onRefresh = async () => {
    setIsRefreshing(true);
    pageRef.current = 1;
    setMPostList([]);
    try {
      await getPostList(1);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePostPress = () => {
    props.navigation.navigate('MigratedAddPost');
  };

  const handleEndReached = () => {
    if (!isLoading && numPageRef.current && pageRef.current < numPageRef.current) {
      const nextPage = pageRef.current + 1;
      pageRef.current = nextPage;
      getPostList(nextPage);
    }
  };

  const openUserProfile = (item: PostData) => {
    if (!item.users?.id) return;
    props.navigation.navigate('MigratedOtherUserProfile', {
      userDetails: {
        id: item.users.id,
        firstName: item.users.displayName || 'Usuario',
        lastName: '',
        profileImage: item.users.profileImage,
      },
    });
  };

  const openPostDetail = (item: PostData) => {
    props.navigation.navigate('MigratedPostDetails', {
      postData: {
        id: item.id,
        content: item.content,
        images: item.postImage ? [item.postImage] : [],
        canEdit: item.canEdit,
        users: {
          id: item.users?.id,
          firstName: item.users?.displayName || 'Usuario',
          lastName: '',
          profileImage: item.users?.profileImage,
        },
        likesCount: item.likesCount,
        commentsCount: item.commentsCount,
        isLiked: item.isLiked,
        isBookmarked: item.isBookmark,
        createdAt: item.createdAt,
      },
    });
  };

  const toggleLike = (item: PostData) => {
    const wasLiked = !!item.isLiked;
    if (!wasLiked) hapticLight();
    setMPostList((prev) =>
      prev.map((p) =>
        p.id === item.id
          ? { ...p, isLiked: !wasLiked, likesCount: (p.likesCount || 0) + (wasLiked ? -1 : 1) }
          : p,
      ),
    );
    postsApi.like(item.id).catch((e) => {
      logger.error('Error toggling like', e);
      setMPostList((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, isLiked: wasLiked, likesCount: item.likesCount } : p,
        ),
      );
    });
  };

  const toggleBookmark = (item: PostData) => {
    const wasBookmarked = !!item.isBookmark;
    setMPostList((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, isBookmark: !wasBookmarked } : p)),
    );
    postsApi.bookmark(item.id).catch((e) => {
      logger.error('Error toggling bookmark', e);
      setMPostList((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, isBookmark: wasBookmarked } : p)),
      );
    });
  };

  const showPostOptions = (item: PostData) => {
    Alert.alert('Publicación', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Editar',
        onPress: () => {
          props.navigation.navigate('MigratedAddPost', {
            flow: 'EditFlow',
            postData: {
              id: item.id,
              description: item.content,
              postingMediaArray: item.postingMediaArray ?? [],
            },
          });
        },
      },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await postsApi.deletePost(item.id);
            setMPostList((prev) => prev.filter((p) => p.id !== item.id));
          } catch (e) {
            logger.error('Error deleting post', e);
            showToast('Error', { description: 'No se pudo eliminar la publicación', variant: 'error' });
          }
        },
      },
    ]);
  };

  const renderPostItem = ({ item }: { item: PostData; index: number }) => {
    return (
      <Pressable
        className="bg-card rounded-md p-3"
        style={{ marginHorizontal: 10, marginVertical: 6 }}
        onPress={() => openPostDetail(item)}>
        <HStack className="items-center">
          <Pressable className="flex-1 flex-row items-center" onPress={() => openUserProfile(item)}>
            {item.users?.profileImage ? (
              <Image
                source={{ uri: item.users.profileImage }}
                contentFit="cover"
                style={{ width: 40, height: 40, borderRadius: RADIUS.lg }}
              />
            ) : (
              <Box className="w-10 h-10 rounded-full bg-secondary items-center justify-center">
                <Icon name="person" size={18} className="text-muted-foreground" />
              </Box>
            )}
            <Box className="flex-1" style={{ marginLeft: 10 }}>
              <Text weight="semibold" size="sm">
                {item.users?.displayName || 'Usuario'}
              </Text>
              <Text size="xs" muted>
                {item.createdAt || ''}
              </Text>
            </Box>
          </Pressable>
          {item.canEdit && (
            <Pressable
              onPress={() => showPostOptions(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="ellipsis-vertical" size={18} className="text-muted-foreground" />
            </Pressable>
          )}
        </HStack>
        {item.content ? (
          <Text size="sm" style={{ marginTop: 10 }}>
            {item.content}
          </Text>
        ) : null}
        {item.postImage ? (
          <Image
            source={{ uri: item.postImage }}
            style={{ width: '100%', height: 200, borderRadius: 10, marginTop: 10 }}
            contentFit="cover"
          />
        ) : null}
        <HStack
          className="items-center"
          style={{ marginTop: 12, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 10 }}>
          <Pressable
            className="flex-row items-center"
            style={{ marginRight: 20 }}
            onPress={() => toggleLike(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon
              name={item.isLiked ? 'heart' : 'heart-outline'}
              size={20}
              className={item.isLiked ? 'text-destructive' : 'text-muted-foreground'}
            />
            <Text size="sm" muted style={{ marginLeft: 4 }}>
              {item.likesCount || 0}
            </Text>
          </Pressable>
          <Pressable
            className="flex-row items-center"
            style={{ marginRight: 20 }}
            onPress={() => openPostDetail(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="chatbubble-outline" size={20} className="text-muted-foreground" />
            <Text size="sm" muted style={{ marginLeft: 4 }}>
              {item.commentsCount || 0}
            </Text>
          </Pressable>
          <Pressable
            className="flex-row items-center"
            onPress={() => toggleBookmark(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon
              name={item.isBookmark ? 'bookmark' : 'bookmark-outline'}
              size={20}
              className={item.isBookmark ? 'text-warning' : 'text-muted-foreground'}
              style={item.isBookmark ? { color: C.orange } : undefined}
            />
          </Pressable>
        </HStack>
      </Pressable>
    );
  };

  const renderEmptyList = () => {
    if (isLoading) return null;
    return (
      <Box className="flex-1 items-center justify-center gap-3" style={{ paddingTop: 80 }}>
        <Icon name="alert-circle-outline" size={80} className="text-muted-foreground" />
        <Text weight="bold">No se encontraron publicaciones</Text>
      </Box>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background">
      <HStack className="items-center justify-between px-4 py-3">
        <Heading size="md">Comunidad</Heading>
        <HStack space="md" className="items-center">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => props.navigation.navigate('MigratedBookmark')}>
            <Icon name="bookmark-outline" size={22} className="text-foreground" />
          </Button>
          <Pressable
            className="flex-row items-center rounded-pill"
            style={{ backgroundColor: C.orange, paddingHorizontal: 12, paddingVertical: 6 }}
            onPress={handlePostPress}>
            <Icon name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text weight="bold" style={{ color: '#FFFFFF', marginLeft: 4 }}>
              Publicar
            </Text>
          </Pressable>
        </HStack>
      </HStack>
      <Box className="flex-1" style={{ backgroundColor: 'rgba(128,128,128,0.1)' }}>
        {mPostList.length > 0 ? (
          <FlatList
            ref={scrollController}
            data={mPostList}
            renderItem={renderPostItem}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={_onRefresh}
                tintColor={C.orange}
              />
            }
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        ) : (
          renderEmptyList()
        )}
        {isLoading && (
          <Box className="items-center justify-center" style={StyleSheet.absoluteFill}>
            <ActivityIndicator size="large" color={C.orange} />
          </Box>
        )}
      </Box>
    </SafeAreaView>
  );
}
