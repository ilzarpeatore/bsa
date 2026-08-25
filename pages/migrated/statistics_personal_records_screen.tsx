import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Heading } from '@components/ui/heading';
import { HStack } from '@components/ui/hstack';
import { Button } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import { Input, InputField, InputSlot } from '@components/ui/input';
import { useAppColorMode } from '@helper/useAppColorMode';
import { exerciseStatsApi, PersonalRecordItem } from '../../api/exerciseStats';
import MuscleFilterSheet from '../../components/MuscleFilterSheet';

const RECENT_LIMIT = 15;

interface Props {
  navigation?: any;
  route?: any;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function RecordRow({ item, rank, onOpenExercise }: { item: PersonalRecordItem; rank: number; onOpenExercise: () => void }) {
  const { colors: C } = useAppColorMode();
  return (
    <HStack className="items-center" style={{ padding: 12, gap: 12 }}>
      <Box className="items-center" style={{ width: 20 }}>
        <Text weight="bold" size="sm" muted>{rank}</Text>
      </Box>
      <Pressable onPress={onOpenExercise}>
        {item.image ? (
          <Image source={{ uri: item.image }} contentFit="cover" style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: C.gray5 }} />
        ) : (
          <Box className="items-center justify-center bg-muted" style={{ width: 48, height: 48, borderRadius: 10 }}>
            <Icon name="trophy-outline" size={18} className="text-muted-foreground" />
          </Box>
        )}
      </Pressable>
      <Pressable className="flex-1" onPress={onOpenExercise}>
        <Text weight="semibold" size="sm" numberOfLines={2} style={{ fontSize: 14.5 }}>
          {item.title}
        </Text>
        <Text size="xs" muted style={{ marginTop: 3 }}>
          1RM est. {Math.round(item.max_1rm)} kg {item.achieved_at ? `· ${formatDate(item.achieved_at)}` : ''}
        </Text>
      </Pressable>
      <Box className="items-end">
        <Text weight="extrabold" style={{ fontSize: 18, color: C.orange }}>{item.max_weight}</Text>
        <Text size="xs" muted style={{ fontSize: 10.5 }}>kg</Text>
        {item.max_reps != null && (
          <Text weight="medium" size="xs" muted style={{ fontSize: 11, marginTop: 2 }}>{item.max_reps} reps</Text>
        )}
      </Box>
    </HStack>
  );
}

export default function StatisticsPersonalRecordsScreen(props: Props) {
  const { navigation } = props;
  const { colors: C } = useAppColorMode();
  const [items, setItems] = useState<PersonalRecordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [muscleId, setMuscleId] = useState<number | null>(null);
  const [muscleName, setMuscleName] = useState<string>('');
  const [showMuscleSheet, setShowMuscleSheet] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    exerciseStatsApi
      .getMyPersonalRecords(muscleId ?? undefined)
      .then((res) => {
        if (!active) return;
        setItems(res.data?.data || []);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [muscleId]);

  // Ya viene ordenado por fecha de logro mas reciente desde el backend.
  // Sin filtro de musculo, recortamos a los ultimos 15 ejercicios realizados
  // (evita que la lista crezca sin limite); con filtro de musculo activo se
  // muestran todos los que coincidan, sin recortar.
  const visibleItems = useMemo(() => {
    let list = items;
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter((it) => it.title.toLowerCase().includes(q));
    }
    if (!muscleId) {
      list = list.slice(0, RECENT_LIMIT);
    }
    return list;
  }, [items, searchText, muscleId]);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['top']}>
      <HStack className="items-center justify-between px-3 py-3">
        <Button variant="ghost" size="icon" onPress={() => navigation?.goBack()}>
          <Icon name="chevron-back" size={22} className="text-foreground" />
        </Button>
        <Heading size="sm" className="flex-1 text-center mx-1" numberOfLines={1}>
          Marcas personales
        </Heading>
        <Button variant="ghost" size="icon" onPress={() => setShowMuscleSheet(true)}>
          <Icon name="body-outline" size={22} color={muscleId ? C.orange : C.textPrimary} />
        </Button>
      </HStack>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Text size="xs" muted style={{ marginTop: 8, marginBottom: 4 }}>
          Tu mejor peso levantado en cada ejercicio, con el 1RM estimado.
          {!muscleId ? ` Se muestran solo los últimos ${RECENT_LIMIT} ejercicios realizados.` : ` Filtrado por ${muscleName}.`}
        </Text>

        <Input className="rounded-md bg-card border-0 px-3.5 gap-2" size="md" style={{ marginTop: 10 }}>
          <Icon name="search" size={16} className="text-muted-foreground" />
          <InputField
            placeholder="Buscar ejercicio..."
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <InputSlot onPress={() => setSearchText('')}>
              <Icon name="close-circle" size={18} className="text-muted-foreground" />
            </InputSlot>
          )}
        </Input>

        {muscleId ? (
          <Pressable
            className="flex-row items-center self-start rounded-md gap-1.5"
            style={{ backgroundColor: C.orange, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 }}
            onPress={() => { setMuscleId(null); setMuscleName(''); }}
          >
            <Text weight="semibold" size="xs" style={{ fontSize: 12.5, color: C.white }}>{muscleName}</Text>
            <Icon name="close" size={14} color={C.white} />
          </Pressable>
        ) : null}

        <Box className="bg-card rounded-lg shadow-card" style={{ marginTop: 12, padding: 8 }}>
          {isLoading ? (
            <Spinner size="large" color={C.textSecondary} style={{ paddingVertical: 60 }} />
          ) : visibleItems.length === 0 ? (
            <Text size="xs" muted className="text-center" style={{ paddingVertical: 40, paddingHorizontal: 16 }}>
              {items.length === 0
                ? 'Todavía no tienes marcas registradas. Completa series con peso y repeticiones para empezar a acumularlas.'
                : 'Ningún ejercicio coincide con la búsqueda.'}
            </Text>
          ) : (
            visibleItems.map((item, idx) => (
              <Box key={item.exercise_id}>
                <RecordRow
                  item={item}
                  rank={idx + 1}
                  onOpenExercise={() =>
                    navigation?.navigate('MigratedExerciseInfo', {
                      mExerciseId: item.exercise_id,
                      mExerciseName: item.title,
                      initialTab: 'analysis',
                    })
                  }
                />
                {idx < visibleItems.length - 1 && <Box className="border-b border-border" style={{ marginLeft: 76 }} />}
              </Box>
            ))
          )}
        </Box>
      </ScrollView>

      <MuscleFilterSheet
        visible={showMuscleSheet}
        onClose={() => setShowMuscleSheet(false)}
        selectedId={muscleId}
        onSelect={(id, name) => {
          if (id === 0) {
            setMuscleId(null);
            setMuscleName('');
          } else {
            setMuscleId(id);
            setMuscleName(name);
          }
          setShowMuscleSheet(false);
        }}
      />
    </SafeAreaView>
  );
}
