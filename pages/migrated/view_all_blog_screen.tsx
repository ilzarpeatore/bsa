import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Heading } from '@components/ui/heading';
import { HStack } from '@components/ui/hstack';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Input, InputField, InputSlot } from '@components/ui/input';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';
import { blogApi, BlogListItem, BlogCategory } from '../../api/blog';
import SimpleBottomSheet from '../../components/SimpleBottomSheet';
import logger from '@helper/logger';

interface SortOption {
  key: string;
  label: string;
  sortBy: string;
  orderDir: string;
}

const SORT_OPTIONS: SortOption[] = [
  { key: 'recent', label: 'Recientes', sortBy: 'datetime', orderDir: 'desc' },
  { key: 'old', label: 'Antiguos', sortBy: 'datetime', orderDir: 'asc' },
  { key: 'az', label: 'A-Z', sortBy: 'title', orderDir: 'asc' },
];

const truncateTitle = (text: string, maxWords: number = 15): string => {
  if (!text) return '';
  const stripped = text.replace(/<[^>]*>/g, '');
  const words = stripped.split(/\s+/);
  if (words.length <= maxWords) return stripped;
  return words.slice(0, maxWords).join(' ') + '…';
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export default function ViewAllBlogScreen({ navigation, route }: any) {
  const { colors: C } = useAppColorMode();
  const { categoryTitle, categoryId } = route?.params || {};

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(categoryId ?? null);
  const [sortBy, setSortBy] = useState<string>('datetime');
  const [orderDir, setOrderDir] = useState<string>('desc');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [categorySheetVisible, setCategorySheetVisible] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<BlogListItem[]>([]);

  const [posts, setPosts] = useState<BlogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const isLastPageRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    blogApi.getCategories().then((res) => setCategories(res.data?.data ?? [])).catch(() => {});
  }, []);

  // react-doctor no reconoce la guarda de ignoreRef porque vive dentro de
  // loadPosts (llamada por referencia, no inline): si el fetch queda
  // obsoleto, ignoreRef.current corta antes de tocar el estado con datos
  // viejos.
  // react-doctor-disable-next-line no-set-state-after-await-in-effect
  useEffect(() => {
    pageRef.current = 1;
    const ignoreRef = { current: false };
    loadPosts(1, ignoreRef);
    return () => {
      ignoreRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, sortBy, orderDir]);

  // ignoreRef solo lo pasa el efecto de arriba (cambia de categoria/orden y
  // puede solapar peticiones); handleLoadMore no lo necesita, es un fetch
  // unico disparado por el usuario.
  const loadPosts = async (pageNum: number, ignoreRef?: { current: boolean }) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params: any = {
        page: pageNum,
        per_page: 15,
        order_by: sortBy,
        order_dir: orderDir,
      };
      if (selectedCategory) params.blog_category_id = selectedCategory;

      const res = await blogApi.getList(pageNum, params);
      if (ignoreRef?.current) return;
      const data = res.data.data ?? [];
      const filtered = data.filter((p: BlogListItem) => p.status === 'publish');
      const pagination = res.data.pagination;

      setPosts((prev) => (pageNum === 1 ? filtered : [...prev, ...filtered]));
      isLastPageRef.current = pageNum >= (pagination.totalPages || 1);
    } catch (e) {
      logger.error('Error loading posts:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (!isLastPageRef.current && !loadingMore && !isSearching) {
      const nextPage = pageRef.current + 1;
      pageRef.current = nextPage;
      loadPosts(nextPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, isSearching]);

  const handleSearch = async (text: string) => {
    setSearchText(text);
    if (text.trim().length === 0) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await blogApi.getList(1, { search: text, per_page: 50 });
      setSearchResults((res.data?.data ?? []).filter((p: any) => p.status === 'publish'));
    } catch {}
  };

  const navigateToDetail = (item: BlogListItem) => {
    navigation.navigate('MigratedBlogDetail', { mBlogModel: item });
  };

  const renderCard = ({ item }: { item: BlogListItem }) => (
    <Pressable
      className="bg-card rounded-md overflow-hidden"
      style={{ marginBottom: 16 }}
      onPress={() => navigateToDetail(item)}
    >
      {item.post_image ? (
        <Image source={{ uri: item.post_image }} style={{ width: '100%', height: 160 }} contentFit="cover" />
      ) : (
        <Box className="bg-secondary" style={{ width: '100%', height: 160 }} />
      )}
      <Box style={{ padding: 14 }}>
        <Text weight="semibold" numberOfLines={2} style={{ marginBottom: 8, lineHeight: 22 }}>
          {truncateTitle(item.title || '', 15)}
        </Text>
        {item.blog_category && (
          <Box
            className="self-start rounded-sm"
            style={{ backgroundColor: C.brand5, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 }}
          >
            <Text size="xs" weight="semibold" style={{ color: C.white }}>{item.blog_category.title}</Text>
          </Box>
        )}
        <HStack space="xs" className="items-center">
          <Icon name="time-outline" size={13} className="text-muted-foreground" />
          <Text size="xs" muted>{formatDate(item.datetime)}</Text>
        </HStack>
      </Box>
    </Pressable>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <Box className="items-center" style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={C.orange} />
      </Box>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <Box className="items-center justify-center" style={{ paddingVertical: 80 }}>
          <ActivityIndicator size="large" color={C.orange} />
        </Box>
      );
    }
    return (
      <Box className="items-center justify-center gap-3" style={{ paddingVertical: 80 }}>
        <Icon name="document-text-outline" size={48} className="text-muted-foreground" />
        <Text size="md" muted>{isSearching ? 'Sin resultados' : 'No hay artículos disponibles'}</Text>
      </Box>
    );
  };

  const listData = isSearching ? searchResults : posts;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title={categoryTitle || 'Todos los artículos'} onBack={() => navigation.goBack()} />

      <Input className="mx-4" style={{ marginTop: 12 }}>
        <InputSlot className="px-3">
          <Icon name="search-outline" size={18} className="text-muted-foreground" />
        </InputSlot>
        <InputField
          placeholder="Buscar artículos..."
          value={searchText}
          onChangeText={handleSearch}
        />
        {searchText.length > 0 && (
          <InputSlot className="px-3" onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={18} className="text-muted-foreground" />
          </InputSlot>
        )}
      </Input>

      {!isSearching && (
        <HStack space="sm" className="mx-4" style={{ marginTop: 12 }}>
          <Pressable
            className="flex-row items-center rounded-pill bg-secondary"
            style={{ paddingHorizontal: 14, paddingVertical: 8, gap: 6 }}
            onPress={() => setSortSheetVisible(true)}
          >
            <Icon name="swap-vertical-outline" size={15} className="text-foreground" />
            <Text size="sm" weight="medium" numberOfLines={1} style={{ maxWidth: 120 }}>
              {SORT_OPTIONS.find((o) => o.sortBy === sortBy && o.orderDir === orderDir)?.label ?? 'Ordenar'}
            </Text>
            <Icon name="chevron-down" size={14} className="text-muted-foreground" />
          </Pressable>

          {categories.length > 0 && (
            <Pressable
              className="flex-row items-center rounded-pill bg-secondary"
              style={{ paddingHorizontal: 14, paddingVertical: 8, gap: 6 }}
              onPress={() => setCategorySheetVisible(true)}
            >
              <Icon name="pricetag-outline" size={15} className="text-foreground" />
              <Text size="sm" weight="medium" numberOfLines={1} style={{ maxWidth: 120 }}>
                {selectedCategory ? categories.find((c) => c.id === selectedCategory)?.title ?? 'Todos' : 'Todos'}
              </Text>
              <Icon name="chevron-down" size={14} className="text-muted-foreground" />
            </Pressable>
          )}
        </HStack>
      )}

      <FlatList
        ref={flatListRef}
        data={listData}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderCard}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />

      <SimpleBottomSheet visible={sortSheetVisible} onClose={() => setSortSheetVisible(false)}>
        <Box style={{ padding: 24 }}>
          <Heading size="sm" style={{ marginBottom: 8 }}>Ordenar por</Heading>
          {SORT_OPTIONS.map((opt) => {
            const active = opt.sortBy === sortBy && opt.orderDir === orderDir;
            return (
              <Pressable
                key={opt.key}
                className="flex-row items-center justify-between"
                style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.border }}
                onPress={() => {
                  setSortBy(opt.sortBy);
                  setOrderDir(opt.orderDir);
                  setSortSheetVisible(false);
                }}
              >
                <Text weight={active ? 'bold' : 'medium'} style={{ color: active ? C.textPrimary : C.textSecondary }}>
                  {opt.label}
                </Text>
                {active ? <Icon name="checkmark" size={18} color={C.textPrimary} /> : null}
              </Pressable>
            );
          })}
        </Box>
      </SimpleBottomSheet>

      <SimpleBottomSheet visible={categorySheetVisible} onClose={() => setCategorySheetVisible(false)}>
        <Box style={{ padding: 24 }}>
          <Heading size="sm" style={{ marginBottom: 8 }}>Categoría</Heading>
          <Box>
            <Pressable
              className="flex-row items-center justify-between"
              style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.border }}
              onPress={() => {
                setSelectedCategory(null);
                setCategorySheetVisible(false);
              }}
            >
              <Text weight={!selectedCategory ? 'bold' : 'medium'} style={{ color: !selectedCategory ? C.textPrimary : C.textSecondary }}>
                Todos
              </Text>
              {!selectedCategory ? <Icon name="checkmark" size={18} color={C.textPrimary} /> : null}
            </Pressable>
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  className="flex-row items-center justify-between"
                  style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.border }}
                  onPress={() => {
                    setSelectedCategory(active ? null : cat.id);
                    setCategorySheetVisible(false);
                  }}
                >
                  <Text weight={active ? 'bold' : 'medium'} style={{ color: active ? C.textPrimary : C.textSecondary }}>
                    {cat.title}
                  </Text>
                  {active ? <Icon name="checkmark" size={18} color={C.textPrimary} /> : null}
                </Pressable>
              );
            })}
          </Box>
        </Box>
      </SimpleBottomSheet>
    </SafeAreaView>
  );
}
