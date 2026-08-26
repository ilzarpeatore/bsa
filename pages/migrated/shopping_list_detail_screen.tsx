import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { HStack } from '@components/ui/hstack';
import { Button, ButtonText } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Input, InputField } from '@components/ui/input';
import { Spinner } from '@components/ui/spinner';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
} from '@components/ui/actionsheet';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';
import { shoppingApi, ShoppingListDetail, ShoppingListItemDetail, MeasurementUnit } from '@api/shopping';
import logger from '@helper/logger';
import { showToast } from '@helper/toast';

export default function ShoppingListDetailScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const shoppingListId = props.route?.params?.shoppingListId ?? 0;
  const [isLoading, setIsLoading] = useState(true);
  const [detailData, setDetailData] = useState<ShoppingListDetail | null>(null);
  const [showByCategory, setShowByCategory] = useState(false);
  const [checkedMap, setCheckedMap] = useState<Map<number, boolean>>(new Map());
  const [showAddSheet, setShowAddSheet] = useState(false);

  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await shoppingApi.getDetail(shoppingListId);
      const data = res.data?.data ?? null;
      setDetailData(data);
      const newMap = new Map<number, boolean>();
      for (const item of data?.items ?? []) {
        newMap.set(item.id, item.is_checked ?? false);
      }
      setCheckedMap(newMap);
    } catch (e: any) {
      logger.error('Error fetching shopping list detail:', e);
    } finally {
      setIsLoading(false);
    }
  }, [shoppingListId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const toggleItem = async (item: ShoppingListItemDetail) => {
    if (item.id == null) return;
    const newStatus = !(checkedMap.get(item.id) ?? false);
    const prevMap = new Map(checkedMap);
    setCheckedMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(item.id, newStatus);
      return newMap;
    });
    try {
      await shoppingApi.toggleItem(item.id, newStatus);
    } catch (e) {
      logger.error('Error toggling shopping list item:', e);
      setCheckedMap(prevMap);
    }
  };

  const handleMenuAction = (value: number) => {
    if (value === 1) {
      setShowByCategory((prev) => !prev);
    } else if (value === 2) {
      // Edit list
      if (detailData) {
        props.navigation.navigate('MigratedAddShoppingList', { shoppingList: detailData });
      }
    } else if (value === 3) {
      // Delete list
      Alert.alert(
        'Borrar lista de la compra',
        '¿Seguro que quieres borrar esta lista de la compra?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Borrar',
            style: 'destructive',
            onPress: async () => {
              if (detailData?.id == null) return;
              try {
                await shoppingApi.deleteShoppingList(detailData.id);
                props.navigation.goBack(true);
              } catch (e: any) {
                logger.error('Error deleting shopping list:', e);
                showToast('Error', { description: 'No se pudo borrar la lista', variant: 'error' });
              }
            },
          },
        ]
      );
    }
  };

  const buildItem = (item: ShoppingListItemDetail) => {
    const checked = checkedMap.get(item.id) ?? item.is_checked === true;
    const itemName = item.manually_added === true ? (item.custom_item_name ?? '') : (item.ingredient_title ?? '');
    const quantityText = `${item.display_quantity ?? ''} ${item.display_unit_symbol ?? ''}`.trim();

    return (
      <Pressable
        key={item.id}
        className="flex-row items-center bg-card rounded-sm p-3"
        style={{ marginBottom: 12, borderWidth: 1, borderColor: `${C.border}80` }}
        onPress={() => toggleItem(item)}
      >
        <Box
          className="items-center justify-center"
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            borderWidth: 1.5,
            borderColor: checked ? C.brand5 : C.gray50,
            backgroundColor: checked ? C.brand5 : 'transparent',
            marginRight: 12,
          }}
        >
          {checked && <Icon name="checkmark" size={16} color="#FFFFFF" />}
        </Box>
        <Text
          className="flex-1"
          style={{ fontSize: 15, color: checked ? C.gray40 : C.textPrimary, textDecorationLine: checked ? 'line-through' : 'none' }}
        >
          {itemName}
        </Text>
        <Text
          weight="bold"
          style={{ fontSize: 15, marginLeft: 8, color: checked ? C.gray40 : C.textPrimary, textDecorationLine: checked ? 'line-through' : 'none' }}
        >
          {quantityText}
        </Text>
      </Pressable>
    );
  };

  const buildItemsList = () => {
    const items = detailData?.items;
    if (!items || items.length === 0) {
      return (
        <Box className="flex-1 items-center justify-center">
          <Icon name="cart-outline" size={64} color={C.gray50} />
          <Text weight="medium" style={{ color: C.gray30, marginTop: 12 }}>No se encontraron artículos</Text>
        </Box>
      );
    }
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
        {items.map((item) => buildItem(item))}
      </ScrollView>
    );
  };

  const buildItemsByCategory = () => {
    const categories = detailData?.items_by_category;
    if (!categories || categories.length === 0) {
      return (
        <Box className="flex-1 items-center justify-center">
          <Icon name="cart-outline" size={64} color={C.gray50} />
          <Text weight="medium" style={{ color: C.gray30, marginTop: 12 }}>No se encontraron artículos</Text>
        </Box>
      );
    }
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
        {categories.map((category) => (
          <Box key={category.ingredient_category_id ?? 'uncategorized'}>
            <Text weight="bold" size="lg" style={{ marginBottom: 12 }}>
              {category.ingredient_category_title || 'Otros'}
            </Text>
            {(category.items ?? []).map((item) => buildItem(item))}
            <Box style={{ height: 16 }} />
          </Box>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader
        title={detailData?.title ?? 'Lista de la compra'}
        onBack={() => props.navigation.goBack()}
        rightAction={
          <Button variant="ghost" size="icon" onPress={() => handleMenuAction(1)}>
            <Icon name="ellipsis-vertical" size={22} className="text-foreground" />
          </Button>
        }
      />

      {/* Simple menu actions */}
      <HStack className="justify-around px-4 py-2 border-b border-border">
        <Pressable className="flex-row items-center gap-1" style={{ padding: 8 }} onPress={() => handleMenuAction(1)}>
          <Icon name={showByCategory ? 'list' : 'grid-outline'} size={20} className="text-foreground" />
          <Text size="xs" style={{ color: C.gray30 }}>{showByCategory ? 'Lista simple' : 'Por categorías'}</Text>
        </Pressable>
        <Pressable className="flex-row items-center gap-1" style={{ padding: 8 }} onPress={() => handleMenuAction(2)}>
          <Icon name="create-outline" size={20} className="text-foreground" />
          <Text size="xs" style={{ color: C.gray30 }}>Editar</Text>
        </Pressable>
        <Pressable className="flex-row items-center gap-1" style={{ padding: 8 }} onPress={() => handleMenuAction(3)}>
          <Icon name="trash-outline" size={20} color={C.red} />
          <Text size="xs" style={{ color: C.red }}>Borrar</Text>
        </Pressable>
      </HStack>

      {isLoading ? (
        <Box className="flex-1 items-center justify-center">
          <Spinner size="large" color={C.orange} />
        </Box>
      ) : !detailData ? (
        <Box className="flex-1 items-center justify-center">
          <Icon name="document-text-outline" size={64} color={C.gray50} />
          <Text weight="medium" style={{ color: C.gray30, marginTop: 12 }}>Sin datos</Text>
        </Box>
      ) : showByCategory ? (
        buildItemsByCategory()
      ) : (
        buildItemsList()
      )}

      {/* Add Item Button */}
      <Box className="p-4" style={{ paddingBottom: 24 }}>
        <Button size="lg" onPress={() => setShowAddSheet(true)}>
          <ButtonText>Añadir artículo</ButtonText>
        </Button>
      </Box>

      {/* Add Item Bottom Sheet */}
      <AddItemSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        shoppingListId={shoppingListId}
        onAdded={() => {
          setShowAddSheet(false);
          fetchDetail();
        }}
      />
    </SafeAreaView>
  );
}

function AddItemSheet({
  visible,
  onClose,
  shoppingListId,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  shoppingListId: number;
  onAdded: () => void;
}) {
  const { colors: C } = useAppColorMode();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const unitsRef = useRef<MeasurementUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<MeasurementUnit | null>(null);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // react-doctor no reconoce la guarda de ignoreRef porque vive dentro de
  // loadUnits (llamada por referencia, no inline): si el fetch queda
  // obsoleto, ignoreRef.current corta antes de tocar el estado con datos
  // viejos.
  // react-doctor-disable-next-line no-set-state-after-await-in-effect
  useEffect(() => {
    if (!visible) return;
    const ignoreRef = { current: false };
    loadUnits(ignoreRef);
    return () => {
      ignoreRef.current = true;
    };
  }, [visible]);

  const loadUnits = async (ignoreRef: { current: boolean }) => {
    setLoadingUnits(true);
    try {
      const res = await shoppingApi.getMeasurementUnits();
      if (ignoreRef.current) return;
      const list = res.data?.data ?? [];
      unitsRef.current = list;
      setSelectedUnit(list[0] ?? null);
    } catch (e) {
      logger.error('Error loading measurement units:', e);
    } finally {
      setLoadingUnits(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) {
      showToast('Error', { description: 'Introduce el nombre del artículo', variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const req: { shopping_list_id: number; custom_item_name: string; display_quantity?: number; measurement_unit_id?: number } = {
        shopping_list_id: shoppingListId,
        custom_item_name: name.trim(),
      };
      if (quantity.trim()) req.display_quantity = parseFloat(quantity.trim());
      if (selectedUnit) req.measurement_unit_id = selectedUnit.id;
      await shoppingApi.addCustomItem(req);
      onAdded();
    } catch (e: any) {
      logger.error('Error adding shopping list item:', e);
      showToast('Error', { description: 'No se pudo añadir el item', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Actionsheet isOpen={visible} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="items-stretch p-0 rounded-t-lg" style={{ paddingBottom: 20, backgroundColor: C.bg }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          <HStack className="items-center p-5">
              <Box className="w-11 h-11 rounded-md items-center justify-center" style={{ backgroundColor: `${C.brand5}1F` }}>
                <Icon name="add" size={24} className="text-foreground" />
              </Box>
              <Box className="flex-1" style={{ marginLeft: 14 }}>
                <Text weight="bold" size="lg">Añadir artículo</Text>
                <Text size="sm" muted style={{ marginTop: 4 }}>Añade un nuevo artículo a tu lista de la compra</Text>
              </Box>
              <Pressable onPress={onClose}>
                <Icon name="close" size={24} color={C.gray30} />
              </Pressable>
            </HStack>

            <Box className="h-px bg-border mx-5" />

            {loadingUnits ? (
              <Spinner size="large" color={C.orange} style={{ padding: 32 }} />
            ) : (
              <Box className="p-5">
                <Text weight="bold" style={{ marginBottom: 8 }}>Artículo</Text>
                <Input style={{ marginBottom: 16 }}>
                  <InputField
                    placeholder="Introduce el nombre del artículo"
                    value={name}
                    onChangeText={setName}
                  />
                </Input>

                <Text weight="bold" style={{ marginBottom: 8 }}>Cantidad</Text>
                <HStack space="md" style={{ marginBottom: 24 }}>
                  <Input style={{ width: 140 }}>
                    <InputField
                      placeholder="Cantidad"
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="decimal-pad"
                    />
                  </Input>
                  <Box className="flex-1 h-11 justify-center bg-card rounded-sm border border-border px-3">
                    <Text>
                      {selectedUnit ? `${selectedUnit.title ?? ''} (${selectedUnit.symbol ?? ''})` : 'Ninguna'}
                    </Text>
                  </Box>
                </HStack>

                <HStack space="lg">
                  <Button variant="secondary" className="flex-1" onPress={onClose}>
                    <ButtonText>Cancelar</ButtonText>
                  </Button>
                  <Button className="flex-1" onPress={submit} disabled={submitting}>
                    {submitting ? <Spinner size="small" color="#FFFFFF" /> : <ButtonText>Añadir</ButtonText>}
                  </Button>
                </HStack>
              </Box>
            )}
        </KeyboardAvoidingView>
      </ActionsheetContent>
    </Actionsheet>
  );
}
