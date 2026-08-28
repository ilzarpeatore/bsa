import React, { useState, useEffect, useRef } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';

function VideoComponent({ item }: { item: any }) {
  return (
    <Pressable style={{ marginBottom: 12 }} className="flex-row bg-card rounded-md overflow-hidden">
      <Image
        source={{ uri: item.image || '' }}
        style={{ width: 120, height: 80 }}
        contentFit="cover"
      />
      <Box className="flex-1 p-3 justify-center">
        <Text size="sm" weight="semibold" numberOfLines={2} style={{ marginBottom: 4 }}>
          {item.title || 'Video Title'}
        </Text>
        <Text size="xs" muted>{item.duration || '3:45'}</Text>
      </Box>
      <Box
        className="w-10 h-10 rounded-pill items-center justify-center absolute"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', right: 12, top: '50%', marginTop: -20 }}
      >
        <Icon name="play" size={24} className="text-white" />
      </Box>
    </Pressable>
  );
}

export default function VideoScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const [videoList, setVideoList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pageRef = useRef(1);
  const [numPage, setNumPage] = useState(1);
  const isLastPageRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    getVideoData();
  }, []);

  const getVideoData = async () => {
    setIsLoading(true);
    try {
      // const value = await getVideoApi({ page });
      // setNumPage(value.pagination.totalPages);
      // if (page === 1) setVideoList([]);
      // setVideoList(prev => [...prev, ...value.data]);
      setIsLoading(false);
    } catch (e) {
      isLastPageRef.current = true;
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLastPageRef.current && !isLoading && pageRef.current < numPage) {
      pageRef.current = pageRef.current + 1;
      getVideoData();
    }
  };

  const renderEmpty = () => {
    if (isLoading) return <Spinner size="large" style={{ marginTop: 60 }} />;
    return (
      <Box className="items-center py-16">
        <Text size="sm" muted>No videos found</Text>
      </Box>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="Videos" onBack={() => props.navigation.goBack()} />

      <FlatList
        ref={flatListRef}
        data={videoList}
        keyExtractor={(item, i) => String(item.id || i)}
        renderItem={VideoComponent}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 + WORKOUT_MINIBAR_CLEARANCE }}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
}
