import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import ScreenHeader from '@components/ScreenHeader';
import { ConfirmDialogMem } from '@components/ConfirmDialog';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { useAppColorMode } from '@helper/useAppColorMode';
import { logger } from '@helper/logger';
import { showToast } from '@helper/toast';
import { describeRange } from '@helper/shoppingDates';
import { shoppingApi, ShoppingListItem } from '@api/shopping';
import { RADIUS } from './theme';
import { listSubtitle } from './shoppingList';

// Listado de listas de la compra (reconstruido 2026-09-26, ítem 26). Antes: sin forma de borrar
// una lista desde aquí, sin refrescar, sin fechas ni raciones y con una hoja intermedia
// "Fecha / Rango" que ya no hace falta (la pantalla de creación elige día o rango).

export default function ShoppingListScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const [lists, setLists] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [toDelete, setToDelete] = useState<ShoppingListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    setFailed(false);
    try {
      const res = await shoppingApi.getList();
      const data = res.data?.data;
      setLists(Array.isArray(data) ? data.filter((l) => !!l && typeof l === 'object') : []);
    } catch (e) {
      logger.error('Error cargando las listas de la compra:', e);
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = navigation?.addListener?.('focus', () => load('refresh'));
    return unsubscribe;
  }, [load, navigation]);

  const confirmDelete = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try {
      await shoppingApi.deleteShoppingList(toDelete.id);
      setLists((prev) => prev.filter((l) => l.id !== toDelete.id));
      setToDelete(null);
    } catch (e) {
      logger.error('Error borrando la lista de la compra:', e);
      showToast('No se pudo borrar', { description: 'Inténtalo de nuevo.', variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const newList = () => navigation.navigate('MigratedAddShoppingList');

  const renderItem = ({ item }: { item: ShoppingListItem }) => {
    const range =
      item.start_date && item.end_date
        ? describeRange({ start: String(item.start_date).slice(0, 10), end: String(item.end_date).slice(0, 10) })
        : null;
    return (
      <Pressable
        onPress={() => navigation.navigate('MigratedShoppingListDetail', { shoppingListId: item.id })}
        accessibilityRole="button"
        accessibilityLabel={`Abrir la lista ${item.title}`}
        className="bg-card rounded-md"
        style={{ flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 12, gap: 12 }}
      >
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="cart-outline" size={22} color={C.textPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text weight="bold" numberOfLines={2}>{item.title}</Text>
          <Text size="sm" muted style={{ marginTop: 2 }}>
            {[range, listSubtitle(item)].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Pressable
          onPress={() => setToDelete(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`Borrar la lista ${item.title}`}
        >
          <Icon name="trash-outline" size={20} color={C.textSecondary} />
        </Pressable>
        <Icon name="chevron-forward" size={18} color={C.textSecondary} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader
        title="Listas de la compra"
        onBack={() => navigation.goBack()}
        rightAction={
          <Pressable
            onPress={newList}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Nueva lista"
          >
            <Icon name="add" size={28} color={C.textPrimary} />
          </Pressable>
        }
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.textPrimary} />
        </View>
      ) : failed && lists.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 }}>
          <Icon name="cloud-offline-outline" size={40} color={C.textSecondary} />
          <Text muted className="text-center">No se pudieron cargar tus listas.</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              load();
            }}
            accessibilityRole="button"
            style={{ paddingHorizontal: 22, paddingVertical: 12, borderRadius: RADIUS.pill, backgroundColor: C.accentBlack }}
          >
            <Text weight="bold" style={{ color: C.accentBlackForeground }}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(l) => String(l.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 90 + WORKOUT_MINIBAR_CLEARANCE, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 60, gap: 10 }}>
              <Icon name="cart-outline" size={56} color={C.textSecondary} />
              <Text weight="bold" size="lg">Aún no tienes listas</Text>
              <Text muted className="text-center">
                Crea una lista con lo que necesitas para las comidas que tienes planificadas, para un día o para varios.
              </Text>
            </View>
          }
        />
      )}

      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: C.bg }}>
        <Pressable
          onPress={newList}
          accessibilityRole="button"
          accessibilityLabel="Crear una lista nueva"
          style={{ height: 52, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: C.accentBlack, flexDirection: 'row', gap: 8 }}
        >
          <Icon name="add" size={20} color={C.accentBlackForeground} />
          <Text weight="bold" style={{ letterSpacing: 0.5, color: C.accentBlackForeground, fontSize: 15 }}>NUEVA LISTA</Text>
        </Pressable>
      </View>

      <ConfirmDialogMem
        visible={!!toDelete}
        icon="trash-outline"
        destructive
        title="Borrar lista"
        message={`Se borrará "${toDelete?.title ?? ''}" con todos sus artículos.`}
        confirmText={deleting ? 'Borrando…' : 'Borrar'}
        cancelText="Cancelar"
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </SafeAreaView>
  );
}
