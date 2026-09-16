import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import ScreenHeader from '@components/ScreenHeader';
import { exercisesApi } from '../../api/exercises';
import { useAppColorMode } from '@helper/useAppColorMode';

interface EquipmentItem {
  id: number;
  title: string;
  image: string;
  [key: string]: any;
}

export default function ViewEquipmentScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [page, setPage] = useState(1);
  const numPageRef = useRef<number | null>(null);
  const isLastPageRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<FlatList>(null);

  useEffect(() => {
    getEquipmentData();
    // getEquipmentData lee `page`, pero solo se llama aqui, una vez al
    // montar (siempre con page=1) -- getEquipmentDataPagination es la
    // funcion dedicada a re-fetchear cuando page > 1 (ver el efecto de
    // abajo). Añadir getEquipmentData a estas deps duplicaria el fetch
    // cada vez que cambia page.
    // react-doctor-disable-next-line exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getEquipmentData = async () => {
    setIsLoading(true);
    try {
      const value = await exercisesApi.getEquipment(page);
      const items = (value.data.data ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        image: e.equipment_image,
      }));
      numPageRef.current = value.data.pagination?.totalPages ?? 1;
      isLastPageRef.current = false;
      if (page === 1) setEquipmentList(items);
      else setEquipmentList((prev) => [...prev, ...items]);
    } catch (e) {
      isLastPageRef.current = true;
    } finally {
      setIsLoading(false);
    }
  };

  const getEquipmentDataPagination = useCallback(async (ignoreRef: { current: boolean }) => {
    setIsLoading(true);
    try {
      const value = await exercisesApi.getEquipment(page);
      if (ignoreRef.current) return;
      const items = (value.data.data ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        image: e.equipment_image,
      }));
      numPageRef.current = value.data.pagination?.totalPages ?? 1;
      isLastPageRef.current = false;
      setEquipmentList((prev) => [...prev, ...items]);
    } catch (e) {
      isLastPageRef.current = true;
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  // react-doctor no reconoce la guarda de ignoreRef porque vive dentro de
  // getEquipmentDataPagination (llamada por referencia, no inline): si el
  // fetch queda obsoleto, ignoreRef.current corta antes de tocar el estado
  // con datos viejos.
  // react-doctor-disable-next-line no-set-state-after-await-in-effect
  useEffect(() => {
    if (!numPageRef.current || page <= 1) return;
    const ignoreRef = { current: false };
    getEquipmentDataPagination(ignoreRef);
    return () => {
      ignoreRef.current = true;
    };
  }, [page, getEquipmentDataPagination]);

  const handleEquipmentListEndReached = () => {
    if (!isLoading && numPageRef.current && page < numPageRef.current) {
      setPage((prev) => prev + 1);
    }
  };

  const renderEquipmentItem = useCallback(
    ({ item }: { item: EquipmentItem }) => (
      <Pressable
        style={{ width: '47%' }}
        className="bg-card rounded-lg overflow-hidden"
        onPress={() =>
          props.navigation.navigate('MigratedSearch', {
            mTitle: item.title,
            isEquipment: true,
            id: item.id,
          })
        }
      >
        <Image source={{ uri: item.image }} style={{ width: '100%', height: 120 }} contentFit="cover" />
        <Text weight="medium" size="sm" numberOfLines={2} className="p-2.5">
          {item.title}
        </Text>
      </Pressable>
    ),
    [props.navigation]
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="Equipments Exercise" onBack={() => props.navigation?.goBack()} />

      <Box className="flex-1">
        <FlatList
          ref={scrollRef}
          data={equipmentList}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderEquipmentItem}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{ padding: 16, rowGap: 16 }}
          onEndReached={handleEquipmentListEndReached}
          onEndReachedThreshold={0.3}
        />

        {isLoading && (
          <Box
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            className="items-center justify-center bg-black/40"
          >
            <ActivityIndicator size="large" color="#000000" />
          </Box>
        )}
      </Box>
    </SafeAreaView>
  );
}
