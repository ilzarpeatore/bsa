import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import ScreenHeader from '@components/ScreenHeader';
import SimpleBottomSheet from '@components/SimpleBottomSheet';
import { ConfirmDialogMem } from '@components/ConfirmDialog';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { useAppColorMode } from '@helper/useAppColorMode';
import { logger } from '@helper/logger';
import { showToast } from '@helper/toast';
import { describeRange } from '@helper/shoppingDates';
import { shoppingApi, ShoppingListDetail, ShoppingListItemDetail, MeasurementUnit } from '@api/shopping';
import { FONT, RADIUS } from './theme';
import {
  categoryTitle,
  itemName,
  listToText,
  progressOf,
  quantityText,
  sortUnchecked,
} from './shoppingList';

// Detalle de una lista de la compra (reconstruido 2026-09-26, ítem 26). Antes solo se podía
// marcar y añadir (la unidad de un artículo nuevo era siempre la primera del catálogo, sin poder
// elegirla) y no se podía editar ni quitar un artículo, ni compartir la lista, ni ver el progreso.

type Confirm = 'deleteList' | 'clearChecked' | null;

export default function ShoppingListDetailScreen({ navigation, route }: any) {
  const { colors: C } = useAppColorMode();
  const shoppingListId: number = route?.params?.shoppingListId ?? 0;

  const [data, setData] = useState<ShoppingListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [byCategory, setByCategory] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  // null = cerrada; 'new' = añadir; un artículo = editarlo
  const [sheet, setSheet] = useState<'new' | ShoppingListItemDetail | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res = await shoppingApi.getDetail(shoppingListId);
      const detail = res.data?.data ?? null;
      setData(detail);
      setChecked(Object.fromEntries((detail?.items ?? []).map((i) => [i.id, i.is_checked === true])));
    } catch (e) {
      logger.error('Error cargando la lista de la compra:', e);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [shoppingListId]);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const isChecked = useCallback((i: { id: number; is_checked?: boolean }) => checked[i.id] ?? i.is_checked === true, [checked]);
  const progress = useMemo(() => progressOf(items, isChecked), [items, isChecked]);

  const toggle = async (item: ShoppingListItemDetail) => {
    const next = !isChecked(item);
    setChecked((prev) => ({ ...prev, [item.id]: next }));
    try {
      await shoppingApi.toggleItem(item.id, next);
    } catch (e) {
      logger.error('Error marcando el artículo:', e);
      setChecked((prev) => ({ ...prev, [item.id]: !next }));
      showToast('No se pudo marcar', { description: 'Revisa tu conexión.', variant: 'error' });
    }
  };

  const share = async () => {
    setMenuOpen(false);
    if (!data) return;
    try {
      await Share.share({ message: listToText(data.title, items, isChecked, true) });
    } catch (e) {
      logger.error('Error compartiendo la lista:', e);
    }
  };

  const regenerate = async () => {
    setMenuOpen(false);
    if (!data || busy) return;
    setBusy(true);
    try {
      await shoppingApi.generateFromDailyPlan({ shopping_list_id: data.id });
      await load();
      showToast('Lista actualizada', { description: 'Se ha recalculado con tu plan actual; lo marcado se conserva.', variant: 'success' });
    } catch (e: any) {
      logger.error('Error actualizando la lista desde el plan:', e);
      const status = e?.response?.status;
      showToast('No se pudo actualizar', {
        description: status === 422 ? 'Ya no hay comidas planificadas en esas fechas.' : 'Inténtalo de nuevo.',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const clearChecked = async () => {
    setConfirm(null);
    const done = items.filter(isChecked);
    if (done.length === 0 || busy) return;
    setBusy(true);
    try {
      await Promise.all(done.map((i) => shoppingApi.deleteItem(i.id)));
    } catch (e) {
      logger.error('Error quitando los artículos comprados:', e);
      showToast('No se pudieron quitar todos', { variant: 'error' });
    } finally {
      await load();
      setBusy(false);
    }
  };

  const deleteList = async () => {
    setConfirm(null);
    if (!data) return;
    try {
      await shoppingApi.deleteShoppingList(data.id);
      navigation.goBack();
    } catch (e) {
      logger.error('Error borrando la lista:', e);
      showToast('No se pudo borrar la lista', { variant: 'error' });
    }
  };

  const openMenuAction = (fn: () => void) => {
    setMenuOpen(false);
    fn();
  };

  // ─── filas ──────────────────────────────────────────────────────────────────
  const renderRow = (item: ShoppingListItemDetail) => {
    const done = isChecked(item);
    const qty = quantityText(item);
    return (
      <View
        key={item.id}
        className="bg-card rounded-sm"
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: `${C.border}80` }}
      >
        <Pressable
          onPress={() => toggle(item)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`${itemName(item)}${qty ? `, ${qty}` : ''}`}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: done ? C.accentBlack : C.textSecondary,
              backgroundColor: done ? C.accentBlack : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {done ? <Icon name="checkmark" size={16} color={C.accentBlackForeground} /> : null}
          </View>
          <Text
            style={{ flex: 1, fontSize: 15, color: done ? C.textSecondary : C.textPrimary, textDecorationLine: done ? 'line-through' : 'none' }}
          >
            {itemName(item)}
          </Text>
          {qty ? (
            <Text weight="bold" style={{ fontSize: 15, color: done ? C.textSecondary : C.textPrimary, textDecorationLine: done ? 'line-through' : 'none' }}>
              {qty}
            </Text>
          ) : null}
        </Pressable>
        <Pressable
          onPress={() => setSheet(item)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={`Editar ${itemName(item)}`}
          style={{ paddingRight: 12, paddingLeft: 4 }}
        >
          <Icon name="create-outline" size={18} color={C.textSecondary} />
        </Pressable>
      </View>
    );
  };

  const body = () => {
    if (items.length === 0) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 }}>
          <Icon name="cart-outline" size={56} color={C.textSecondary} />
          <Text weight="bold" size="lg">La lista está vacía</Text>
          <Text muted className="text-center">Añade artículos a mano o actualízala desde tu plan de comidas.</Text>
        </View>
      );
    }
    const content = byCategory
      ? (data?.items_by_category ?? []).map((cat) => (
          <View key={String(cat.ingredient_category_id ?? 'otros')} style={{ marginBottom: 8 }}>
            <Text weight="bold" size="lg" style={{ marginBottom: 10, marginTop: 6 }}>{categoryTitle(cat.ingredient_category_title)}</Text>
            {sortUnchecked(cat.items ?? [], isChecked).map(renderRow)}
          </View>
        ))
      : sortUnchecked(items, isChecked).map(renderRow);
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 + WORKOUT_MINIBAR_CLEARANCE }} showsVerticalScrollIndicator={false}>
        {content}
      </ScrollView>
    );
  };

  const dates =
    data?.start_date && data?.end_date
      ? describeRange({ start: String(data.start_date).slice(0, 10), end: String(data.end_date).slice(0, 10) })
      : null;

  const menuAction = (icon: string, label: string, onPress: () => void, danger = false) => (
    <Pressable
      key={label}
      onPress={() => openMenuAction(onPress)}
      accessibilityRole="button"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}
    >
      <Icon name={icon as any} size={22} color={danger ? C.destructive50 : C.textPrimary} />
      <Text weight="semibold" style={{ color: danger ? C.destructive50 : C.textPrimary }}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader
        title={data?.title ?? 'Lista de la compra'}
        onBack={() => navigation.goBack()}
        rightAction={
          <Pressable
            onPress={() => setMenuOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Más opciones"
          >
            <Icon name="ellipsis-vertical" size={22} color={C.textPrimary} />
          </Pressable>
        }
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.textPrimary} />
        </View>
      ) : failed || !data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 }}>
          <Icon name="cloud-offline-outline" size={40} color={C.textSecondary} />
          <Text muted className="text-center">No se pudo cargar la lista.</Text>
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
        <>
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text weight="bold" accessibilityLabel={`${progress.checked} de ${progress.total} comprados`}>
                {progress.checked} de {progress.total} comprados
              </Text>
              {dates ? <Text size="sm" muted>{dates}</Text> : null}
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: C.surface, marginTop: 8, overflow: 'hidden' }}>
              <View style={{ height: 6, borderRadius: 3, width: `${Math.round(progress.ratio * 100)}%`, backgroundColor: C.success }} />
            </View>
            <View style={{ flexDirection: 'row', backgroundColor: C.surface, borderRadius: RADIUS.md, padding: 4, marginTop: 12 }}>
              {([[false, 'Lista'], [true, 'Por categoría']] as const).map(([value, label]) => (
                <Pressable
                  key={label}
                  onPress={() => setByCategory(value)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: byCategory === value }}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: RADIUS.sm, backgroundColor: byCategory === value ? C.accentBlack : 'transparent' }}
                >
                  <Text weight="semibold" size="sm" style={{ color: byCategory === value ? C.accentBlackForeground : C.textSecondary }}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {body()}
        </>
      )}

      {data ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: C.bg }}>
          <Pressable
            onPress={() => setSheet('new')}
            accessibilityRole="button"
            accessibilityLabel="Añadir artículo"
            style={{ height: 52, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: C.accentBlack, flexDirection: 'row', gap: 8 }}
          >
            <Icon name="add" size={20} color={C.accentBlackForeground} />
            <Text weight="bold" style={{ letterSpacing: 0.5, color: C.accentBlackForeground, fontSize: 15 }}>AÑADIR ARTÍCULO</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Menú de la lista */}
      <SimpleBottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          {menuAction('share-outline', 'Compartir lo que falta por comprar', share)}
          {menuAction('refresh-outline', 'Actualizar desde mi plan', regenerate)}
          {menuAction('checkmark-done-outline', 'Quitar los artículos comprados', () => setConfirm('clearChecked'))}
          {menuAction('create-outline', 'Editar días y raciones', () => data && navigation.navigate('MigratedAddShoppingList', { shoppingList: data }))}
          {menuAction('trash-outline', 'Borrar lista', () => setConfirm('deleteList'), true)}
        </View>
      </SimpleBottomSheet>

      <ItemSheet
        target={sheet}
        shoppingListId={shoppingListId}
        onClose={() => setSheet(null)}
        onSaved={() => {
          setSheet(null);
          load();
        }}
      />

      <ConfirmDialogMem
        visible={confirm === 'deleteList'}
        icon="trash-outline"
        destructive
        title="Borrar lista"
        message={`Se borrará "${data?.title ?? ''}" con todos sus artículos.`}
        confirmText="Borrar"
        cancelText="Cancelar"
        onCancel={() => setConfirm(null)}
        onConfirm={deleteList}
      />
      <ConfirmDialogMem
        visible={confirm === 'clearChecked'}
        icon="checkmark-done-outline"
        title="Quitar comprados"
        message={
          progress.checked > 0
            ? `Se quitarán ${progress.checked} ${progress.checked === 1 ? 'artículo comprado' : 'artículos comprados'} de la lista.`
            : 'No hay ningún artículo marcado como comprado.'
        }
        confirmText="Quitar"
        cancelText="Cancelar"
        onCancel={() => setConfirm(null)}
        onConfirm={clearChecked}
      />
    </SafeAreaView>
  );
}

// ─── Hoja de añadir / editar un artículo ────────────────────────────────────────
function ItemSheet({
  target,
  shoppingListId,
  onClose,
  onSaved,
}: {
  target: 'new' | ShoppingListItemDetail | null;
  shoppingListId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { colors: C } = useAppColorMode();
  const editing = target && target !== 'new' ? target : null;
  // El nombre solo se edita en lo añadido a mano o en líneas de texto (FatSecret); un
  // ingrediente del catálogo conserva el suyo.
  const nameEditable = !editing || editing.ingredient_id === null;

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitId, setUnitId] = useState<number | null>(null);
  const [units, setUnits] = useState<MeasurementUnit[]>([]);
  const [saving, setSaving] = useState(false);

  // Cada vez que se abre, parte de los datos del artículo (o vacío si es nuevo).
  useEffect(() => {
    if (!target) return;
    setName(editing ? itemName(editing) : '');
    setQuantity(editing && Number(editing.display_quantity) > 0 ? String(Number(editing.display_quantity)).replace('.', ',') : '');
    setUnitId(editing?.measurement_unit_id ?? null);
  }, [target, editing]);

  useEffect(() => {
    if (!target || units.length > 0) return;
    let cancelled = false;
    shoppingApi
      .getMeasurementUnits()
      .then((res) => {
        if (!cancelled) setUnits(Array.isArray(res.data?.data) ? res.data.data : []);
      })
      .catch((e) => logger.error('Error cargando las unidades de medida:', e));
    return () => {
      cancelled = true;
    };
  }, [target, units.length]);

  const parsedQuantity = quantity.trim() === '' ? null : Number(quantity.replace(',', '.'));

  const save = async () => {
    if (saving) return;
    if (nameEditable && !name.trim()) {
      showToast('Falta el nombre', { description: 'Escribe qué quieres comprar.', variant: 'warning' });
      return;
    }
    if (parsedQuantity !== null && (Number.isNaN(parsedQuantity) || parsedQuantity <= 0)) {
      showToast('Cantidad no válida', { description: 'Usa un número mayor que 0 o déjala vacía.', variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await shoppingApi.updateItem({
          item_id: editing.id,
          ...(nameEditable ? { custom_item_name: name.trim() } : {}),
          ...(parsedQuantity !== null ? { display_quantity: parsedQuantity } : {}),
          ...(unitId !== null && unitId !== editing.measurement_unit_id ? { measurement_unit_id: unitId } : {}),
        });
      } else {
        await shoppingApi.addCustomItem({
          shopping_list_id: shoppingListId,
          custom_item_name: name.trim(),
          ...(parsedQuantity !== null ? { display_quantity: parsedQuantity } : {}),
          ...(unitId !== null ? { measurement_unit_id: unitId } : {}),
        });
      }
      onSaved();
    } catch (e: any) {
      logger.error('Error guardando el artículo:', e);
      showToast('No se pudo guardar', { description: e?.response?.data?.message || 'Inténtalo de nuevo.', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing || saving) return;
    setSaving(true);
    try {
      await shoppingApi.deleteItem(editing.id);
      onSaved();
    } catch (e) {
      logger.error('Error quitando el artículo:', e);
      showToast('No se pudo quitar', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { height: 48, paddingHorizontal: 14, borderRadius: RADIUS.sm, backgroundColor: C.surfaceLight, color: C.textPrimary, fontFamily: FONT.regular, fontSize: 16 };
  const label = (t: string) => <Text weight="bold" size="xs" muted className="uppercase" style={{ letterSpacing: 0.3, marginBottom: 6, marginTop: 14 }}>{t}</Text>;

  return (
    <SimpleBottomSheet visible={!!target} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text weight="bold" size="lg">{editing ? 'Editar artículo' : 'Añadir artículo'}</Text>

        {label('Artículo')}
        {nameEditable ? (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="p. ej. Leche"
            placeholderTextColor={C.textSecondary}
            accessibilityLabel="Nombre del artículo"
            style={inputStyle}
          />
        ) : (
          <Text weight="semibold" style={{ paddingVertical: 8 }}>{name}</Text>
        )}

        {label('Cantidad')}
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Opcional"
          placeholderTextColor={C.textSecondary}
          keyboardType="decimal-pad"
          accessibilityLabel="Cantidad"
          style={inputStyle}
        />

        {label('Unidad')}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
          {[{ id: null as number | null, title: 'Sin unidad', symbol: '' }, ...units].map((u) => {
            const active = unitId === u.id;
            return (
              <Pressable
                key={String(u.id)}
                onPress={() => setUnitId(u.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.pill, backgroundColor: active ? C.accentBlack : C.surfaceLight }}
              >
                <Text weight="semibold" size="sm" style={{ color: active ? C.accentBlackForeground : C.textSecondary }}>
                  {u.id === null ? u.title : u.symbol || u.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
          {editing ? (
            <Pressable
              onPress={remove}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Quitar artículo"
              style={{ height: 50, paddingHorizontal: 18, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surfaceLight }}
            >
              <Icon name="trash-outline" size={20} color={C.destructive50} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={save}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Guardar cambios' : 'Añadir a la lista'}
            style={{ flex: 1, height: 50, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: C.accentBlack, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? (
              <ActivityIndicator size="small" color={C.accentBlackForeground} />
            ) : (
              <Text weight="bold" style={{ color: C.accentBlackForeground }}>{editing ? 'GUARDAR' : 'AÑADIR'}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SimpleBottomSheet>
  );
}
