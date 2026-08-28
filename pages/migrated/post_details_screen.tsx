import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Image, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Card } from '@components/ui/card';
import { Text } from '@components/ui/text';
import { Button } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import ScreenHeader from '@components/ScreenHeader';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { useAppColorMode } from '@helper/useAppColorMode';
import { postsApi, PostComment } from '../../api/posts';
import logger from '@helper/logger';
import { showToast } from '@helper/toast';

interface PostUser {
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
  users?: PostUser;
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt?: string;
}

export default function PostDetailsScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const postData: PostData | undefined = props.route?.params?.postData;
  const isFromLink: boolean = props.route?.params?.isFromLink ?? false;

  const likeChangeRef = useRef(0);
  const bookMarkChangeRef = useRef(0);
  const [heartVisible, setHeartVisible] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(postData?.isLiked ?? false);
  const [isBookmarked, setIsBookmarked] = useState(postData?.isBookmarked ?? false);

  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [commentsCount, setCommentsCount] = useState(postData?.commentsCount ?? 0);
  const commentInputRef = useRef<TextInput>(null);

  const loadComments = useCallback(async () => {
    if (!postData?.id) return;
    setCommentsLoading(true);
    try {
      const res = await postsApi.getComments(postData.id, 1);
      setComments(res.data.data ?? []);
    } catch (e) {
      logger.error('Error fetching comments', e);
    } finally {
      setCommentsLoading(false);
    }
  }, [postData?.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  if (!postData) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: C.bg }} edges={['bottom']}>
        <ScreenHeader title="" onBack={() => props.navigation?.goBack()} />
        <Box className="flex-1 items-center justify-center">
          <Text muted weight="medium">
            No hay datos disponibles de la publicación
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  const user = postData.users;

  const toggleLike = () => {
    setIsLiked((prev) => !prev);
    likeChangeRef.current += 1;
    if (postData.id) {
      postsApi.like(postData.id).catch(() => {
        setIsLiked((prev) => !prev);
        likeChangeRef.current -= 1;
      });
    }
  };

  const toggleBookmark = () => {
    setIsBookmarked((prev) => !prev);
    bookMarkChangeRef.current += 1;
    if (postData.id) {
      postsApi.bookmark(postData.id).catch(() => {
        setIsBookmarked((prev) => !prev);
        bookMarkChangeRef.current -= 1;
      });
    }
  };

  const focusCommentInput = () => {
    commentInputRef.current?.focus();
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: postData.content || 'Mira esta publicación en Be Stronger' });
    } catch (e) {
      logger.error('Error sharing post', e);
    }
  };

  const submitReport = async (reason: string) => {
    if (!postData.id) return;
    try {
      await postsApi.report(postData.id, reason);
      showToast('Gracias', { description: 'Hemos recibido tu reporte y lo revisaremos.', variant: 'success' });
    } catch (e) {
      logger.error('Error reporting post', e);
      showToast('Error', { description: 'No se pudo enviar el reporte.', variant: 'error' });
    }
  };

  const showReportReasons = () => {
    Alert.alert('Motivo del reporte', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Spam', onPress: () => submitReport('spam') },
      { text: 'Contenido inapropiado', onPress: () => submitReport('inappropriate_content') },
      { text: 'Acoso o bullying', onPress: () => submitReport('harassment') },
      { text: 'Otro', onPress: () => submitReport('other') },
    ]);
  };

  const showPostOptions = () => {
    Alert.alert('Publicación', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Reportar publicación', style: 'destructive', onPress: showReportReasons },
    ]);
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text || !postData.id || postingComment) return;
    setPostingComment(true);
    try {
      await postsApi.saveComment(postData.id, text);
      setCommentText('');
      setCommentsCount((prev) => prev + 1);
      await loadComments();
    } catch (e) {
      logger.error('Error posting comment', e);
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: C.bg }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScreenHeader title="" onBack={() => props.navigation?.goBack()} />
        <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 + WORKOUT_MINIBAR_CLEARANCE }}>
          <Card variant="ghost" style={{ marginBottom: 12 }}>
            <Box className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
              <Pressable
                className="flex-row items-center flex-1"
                onPress={() => {
                  if (!user?.id) return;
                  props.navigation?.navigate('MigratedOtherUserProfile', { userDetails: user });
                }}>
                <Box className="w-9 h-9 rounded-pill bg-secondary items-center justify-center">
                  {user?.profileImage ? (
                    <Image source={{ uri: user.profileImage }} className="w-9 h-9 rounded-pill" />
                  ) : (
                    <Icon name="person" size={18} className="text-muted-foreground" />
                  )}
                </Box>
                <Box className="flex-1" style={{ marginLeft: 12 }}>
                  <Text weight="semibold" size="sm">
                    {user?.firstName ?? ''} {user?.lastName ?? ''}
                  </Text>
                  {postData.createdAt && (
                    <Text muted size="xs" style={{ marginTop: 2 }}>
                      {postData.createdAt}
                    </Text>
                  )}
                </Box>
              </Pressable>
              <Pressable
                style={{ padding: 4 }}
                onPress={showPostOptions}
                accessibilityRole="button"
                accessibilityLabel="Más opciones">
                <Icon name="ellipsis-horizontal" size={20} className="text-muted-foreground" />
              </Pressable>
            </Box>
            {postData.content ? (
              <Text muted style={{ lineHeight: 22, marginBottom: 12 }}>
                {postData.content}
              </Text>
            ) : null}
            {postData.images && postData.images.length > 0 ? (
              <Box className="flex-row flex-wrap" style={{ marginBottom: 12 }}>
                {postData.images.map((img) => (
                  <Image
                    key={img}
                    source={{ uri: img }}
                    className="rounded-md bg-secondary"
                    style={[
                      { width: '48%', height: 180, marginBottom: 4, marginRight: 8 },
                      postData.images!.length === 1 && { width: '100%', marginRight: 0 },
                    ]}
                  />
                ))}
              </Box>
            ) : null}
            <Box
              className="flex-row items-center border-t border-border"
              style={{ paddingTop: 12, marginTop: 4 }}>
              <Pressable
                className="flex-row items-center"
                style={{ marginRight: 20 }}
                onPress={toggleLike}
                accessibilityRole="button"
                accessibilityLabel="Me gusta"
                accessibilityState={{ selected: isLiked }}>
                <Icon
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={22}
                  className={isLiked ? 'text-destructive' : 'text-muted-foreground'}
                />
                <Text
                  size="xs"
                  className={isLiked ? 'text-destructive' : 'text-muted-foreground'}
                  style={{ marginLeft: 6 }}>
                  {(postData.likesCount ?? 0) + (isLiked ? 1 : 0)}
                </Text>
              </Pressable>
              <Pressable
                className="flex-row items-center"
                style={{ marginRight: 20 }}
                onPress={focusCommentInput}
                accessibilityRole="button"
                accessibilityLabel="Comentar">
                <Icon name="chatbubble-outline" size={22} className="text-muted-foreground" />
                <Text size="xs" className="text-muted-foreground" style={{ marginLeft: 6 }}>
                  {commentsCount}
                </Text>
              </Pressable>
              <Pressable
                className="flex-row items-center"
                style={{ marginRight: 20 }}
                onPress={toggleBookmark}
                accessibilityRole="button"
                accessibilityLabel="Guardar en marcadores"
                accessibilityState={{ selected: isBookmarked }}>
                <Icon
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  className={isBookmarked ? undefined : 'text-muted-foreground'}
                  style={isBookmarked ? { color: C.orange } : undefined}
                />
              </Pressable>
              <Pressable
                className="flex-row items-center"
                style={{ marginRight: 20 }}
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel="Compartir">
                <Icon name="share-outline" size={22} className="text-muted-foreground" />
              </Pressable>
            </Box>
          </Card>

          <Card variant="ghost" style={{ marginBottom: 12 }}>
            <Text weight="semibold" size="sm" style={{ marginBottom: 12 }}>
              Comentarios
            </Text>
            {commentsLoading ? (
              <Spinner size="small" color={C.orange} style={{ marginVertical: 16 }} />
            ) : comments.length > 0 ? (
              comments.map((c) => (
                <Box key={c.id} className="flex-row items-start" style={{ marginBottom: 14 }}>
                  <Box className="w-9 h-9 rounded-pill bg-secondary items-center justify-center">
                    {c.users?.profile_image ? (
                      <Image
                        source={{ uri: c.users.profile_image }}
                        className="w-9 h-9 rounded-pill"
                      />
                    ) : (
                      <Icon name="person" size={16} className="text-muted-foreground" />
                    )}
                  </Box>
                  <Box className="flex-1" style={{ marginLeft: 10 }}>
                    <Text weight="semibold" size="xs">
                      {c.users?.first_name ?? ''} {c.users?.last_name ?? ''}
                    </Text>
                    <Text muted size="xs" style={{ marginTop: 2, lineHeight: 18 }}>
                      {c.comment}
                    </Text>
                    {c.created_at ? (
                      <Text muted size="xs" style={{ marginTop: 4 }}>
                        {c.created_at}
                      </Text>
                    ) : null}
                  </Box>
                </Box>
              ))
            ) : (
              <Text muted size="xs" className="text-center" style={{ paddingVertical: 12 }}>
                Sé el primero en comentar
              </Text>
            )}
          </Card>
        </ScrollView>

        <Box className="flex-row items-end px-3 py-2.5 gap-2 border-t border-border bg-card">
          <TextInput
            ref={commentInputRef}
            className="flex-1 bg-secondary rounded-md px-3.5 py-2.5 text-foreground font-gilroy-regular text-sm border border-border"
            style={{ maxHeight: 100 }}
            placeholder="Escribe un comentario..."
            placeholderTextColor="rgb(var(--muted-foreground))"
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <Button
            onPress={submitComment}
            disabled={!commentText.trim() || postingComment}
            size="icon"
            radius="pill"
            className="w-10 h-10">
            {postingComment ? (
              <Spinner size="small" color="#FFFFFF" />
            ) : (
              <Icon name="send" size={18} className="text-primary-foreground" />
            )}
          </Button>
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
