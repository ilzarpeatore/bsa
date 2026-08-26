import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Input, InputField, InputSlot } from '@components/ui/input';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';
import { resourcesApi, ResourceListItem, ResourceCategory } from '../../api/resources';

type Tab = 'mine' | 'shared';

// Sub-secciones que se muestran dentro de cada pestaña, en este orden fijo.
const SHARED_SECTIONS: { key: ResourceCategory; label: string }[] = [
  { key: 'entrenamiento', label: 'Entrenamiento' },
  { key: 'nutricion', label: 'Nutrición' },
  { key: 'habitos_mindset', label: 'Hábitos y Mindset' },
];

const MINE_SECTIONS: { key: ResourceCategory; label: string }[] = [
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'planes_actuales', label: 'Tus planes actuales' },
];

const OTHER_LABEL = 'Otros';

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  article: 'document-text-outline',
  video: 'play-circle-outline',
  link: 'link-outline',
  doc: 'reader-outline',
};

const TYPE_LABEL: Record<string, string> = {
  article: 'Artículo',
  video: 'Vídeo',
  link: 'Enlace',
  doc: 'Documento',
};

function formatResourceDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

interface Props {
  navigation?: any;
}

export default function ResourcesListScreen(props: Props) {
  const { colors: C } = useAppColorMode();
  const TYPE_COLOR: Record<string, string> = {
    article: C.blue60,
    video: C.warning60,
    link: C.purple60,
    doc: C.success60,
  };
  const { navigation } = props;
  const [activeTab, setActiveTab] = useState<Tab>('mine');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [items, setItems] = useState<ResourceListItem[]>([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const res = await resourcesApi.getList({ per_page: 100 });
      setItems(res.data?.data ?? []);
    } catch (e) {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const mine = useMemo(() => items.filter((i) => i.scope === 'assigned'), [items]);
  const shared = useMemo(() => items.filter((i) => i.scope === 'shared'), [items]);
  const scopedList = activeTab === 'mine' ? mine : shared;
  const query = search.trim().toLowerCase();
  const activeList = useMemo(
    () => (query ? scopedList.filter((i) => i.title.toLowerCase().includes(query)) : scopedList),
    [scopedList, query]
  );
  const sectionDefs = activeTab === 'mine' ? MINE_SECTIONS : SHARED_SECTIONS;

  const sections = useMemo(() => {
    const known = sectionDefs.map((s) => ({
      label: s.label,
      data: activeList.filter((i) => i.category === s.key),
    }));
    const knownKeys = new Set(sectionDefs.map((s) => s.key));
    const rest = activeList.filter((i) => !knownKeys.has(i.category as ResourceCategory));
    return rest.length > 0 ? [...known, { label: OTHER_LABEL, data: rest }] : known;
  }, [activeList, sectionDefs]);

  const openResource = (item: ResourceListItem) => {
    navigation?.navigate('MigratedResourceDetail', { resourceId: item.id, title: item.title });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="Recursos" onBack={() => navigation?.goBack()} />

      <Box className="px-4" style={{ marginTop: 12, marginBottom: 4 }}>
        <Input className="rounded-full bg-secondary px-4 gap-2" size="md">
          <Icon name="search" size={18} className="text-muted-foreground" />
          <InputField
            placeholder="Busca en tus recursos"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <InputSlot onPress={() => setSearch('')}>
              <Icon name="close-circle" size={18} className="text-muted-foreground" />
            </InputSlot>
          )}
        </Input>
      </Box>

      <Box className="flex-row gap-6 px-4" style={{ marginTop: 16, marginBottom: 8 }}>
        <Pressable onPress={() => setActiveTab('mine')} style={{ paddingBottom: 8 }}>
          <Text weight="bold" size="lg" className={activeTab === 'mine' ? 'text-foreground' : 'text-muted-foreground'}>
            Mis Recursos
          </Text>
          {activeTab === 'mine' && <Box className="bg-foreground" style={{ height: 2, borderRadius: 1, marginTop: 6 }} />}
        </Pressable>
        <Pressable onPress={() => setActiveTab('shared')} style={{ paddingBottom: 8 }}>
          <Text weight="bold" size="lg" className={activeTab === 'shared' ? 'text-foreground' : 'text-muted-foreground'}>
            Compartidos
          </Text>
          {activeTab === 'shared' && <Box className="bg-foreground" style={{ height: 2, borderRadius: 1, marginTop: 6 }} />}
        </Pressable>
      </Box>

      {isLoading ? (
        <Box className="flex-1 items-center justify-center" style={{ paddingTop: 60 }}>
          <ActivityIndicator size="large" color={C.textPrimary} />
        </Box>
      ) : error ? (
        <Box className="flex-1 items-center justify-center" style={{ paddingTop: 60 }}>
          <Text muted className="text-center px-8">No se pudieron cargar los recursos.</Text>
        </Box>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {activeList.length === 0 ? (
            <Box className="flex-1 items-center justify-center" style={{ paddingTop: 60 }}>
              <Icon name="folder-open-outline" size={40} className="text-muted-foreground" />
              <Text muted className="text-center px-8" style={{ marginTop: 12 }}>
                {activeTab === 'mine' ? 'Todavía no tienes recursos asignados.' : 'Aún no hay recursos compartidos.'}
              </Text>
            </Box>
          ) : (
            <Box className="gap-6">
              {sections.map((section) =>
                section.data.length === 0 ? null : (
                  <Box key={section.label}>
                    <Text weight="bold" size="xl" style={{ marginBottom: 12 }}>
                      {section.label}
                    </Text>
                    <Box className="gap-3">
                      {section.data.map((item) => (
                        <Pressable
                          key={item.id}
                          className="flex-row items-center gap-3 bg-card rounded-lg p-3"
                          onPress={() => openResource(item)}
                        >
                          <Box
                            className="w-[68px] h-[68px] rounded-lg items-center justify-center"
                            style={{ backgroundColor: `${TYPE_COLOR[item.type] ?? C.textPrimary}1A` }}
                          >
                            <Icon
                              name={TYPE_ICON[item.type] ?? 'document-text-outline'}
                              size={28}
                              color={TYPE_COLOR[item.type] ?? C.textPrimary}
                            />
                          </Box>
                          <Box className="flex-1">
                            <Text weight="bold" size="md" numberOfLines={2}>
                              {item.title}
                            </Text>
                            <Text muted size="sm" style={{ marginTop: 4 }}>
                              {TYPE_LABEL[item.type] ?? item.type}
                            </Text>
                            <Text muted size="xs" style={{ marginTop: 2 }}>
                              {formatResourceDate(item.created_at)}
                            </Text>
                          </Box>
                          <Icon name="chevron-forward" size={18} className="text-muted-foreground" />
                        </Pressable>
                      ))}
                    </Box>
                  </Box>
                )
              )}
            </Box>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
