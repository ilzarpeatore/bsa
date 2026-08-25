import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Heading } from '@components/ui/heading';
import { VStack } from '@components/ui/vstack';
import { HStack } from '@components/ui/hstack';
import { Button, ButtonText } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
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
import { shoppingApi, ShoppingListItem } from '@api/shopping';
import logger from '@helper/logger';

export default function ShoppingListScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const [shoppingLists, setShoppingLists] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGenerateSheet, setShowGenerateSheet] = useState(false);
  const [selectedOption, setSelectedOption] = useState(0); // 0=Date, 1=Date range

  const fetchShoppingLists = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await shoppingApi.getList();
      setShoppingLists(res.data?.data ?? []);
    } catch (e: any) {
      logger.error('Error fetching shopping lists:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // False positive: this already returns `unsubscribe` from addListener,
  // the rule just doesn't recognize a bare `return unsubscribe` (only
  // literal `return () => ...`) as valid cleanup.
  // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
  useEffect(() => {
    fetchShoppingLists();
    const unsubscribe = props.navigation.addListener('focus', fetchShoppingLists);
    return unsubscribe;
  }, [fetchShoppingLists, props.navigation]);

  const openAddListScreen = (isSpecificDate: boolean) => {
    setShowGenerateSheet(false);
    props.navigation.navigate('MigratedAddShoppingList', { isDefaultSpecificDate: isSpecificDate });
  };

  const openDetail = (list: ShoppingListItem) => {
    props.navigation.navigate('MigratedShoppingListDetail', { shoppingListId: list.id });
  };

  const renderOption = (index: number, title: string, subtitle: string) => {
    const selected = selectedOption === index;
    return (
      <Pressable
        className="flex-row items-center rounded-lg p-5"
        style={{
          borderWidth: 1.5,
          borderColor: selected ? C.brand5 : C.border,
          backgroundColor: selected ? `${C.brand5}1A` : C.surfaceLight,
        }}
        onPress={() => setSelectedOption(index)}
      >
        <Box
          className="rounded-md p-2.5"
          style={{ backgroundColor: selected ? `${C.brand5}33` : C.bg }}
        >
          <Icon name="calendar-outline" size={24} color={selected ? C.orange : C.gray40} />
        </Box>
        <Box className="flex-1 gap-1" style={{ marginLeft: 20 }}>
          <Text weight="bold" size="lg">{title}</Text>
          <Text size="sm" muted>{subtitle}</Text>
        </Box>
        {selected ? (
          <Icon name="checkmark-circle" size={24} color={C.success} />
        ) : (
          <Icon name="chevron-forward" size={24} className="text-muted-foreground" />
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['bottom']}>
      <ScreenHeader
        title="Listas de la compra"
        onBack={() => props.navigation.goBack()}
        rightAction={
          <Button variant="ghost" size="icon" onPress={() => setShowGenerateSheet(true)}>
            <Icon name="add" size={28} className="text-foreground" />
          </Button>
        }
      />

      <Box className="flex-1">
        {isLoading && shoppingLists.length === 0 ? (
          <Box className="flex-1 items-center justify-center">
            <Spinner size="large" color={C.orange} />
          </Box>
        ) : shoppingLists.length === 0 ? (
          <Box className="flex-1 items-center justify-center gap-3">
            <Icon name="cart-outline" size={64} color={C.gray50} />
            <Text weight="medium" muted>No se encontraron listas de la compra</Text>
          </Box>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            {shoppingLists.map((list) => (
              <Pressable
                key={list.id}
                className="p-4 bg-card rounded-md border border-border"
                onPress={() => openDetail(list)}
              >
                <HStack className="items-center justify-between">
                  <Box className="flex-1 gap-1">
                    <Text weight="bold">{list.title}</Text>
                    <Text size="sm" muted>{list.items_count ?? 0} artículos</Text>
                  </Box>
                  <Icon name="chevron-forward" size={20} color={C.gray40} />
                </HStack>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </Box>

      {/* Generate Bottom Sheet */}
      <Actionsheet isOpen={showGenerateSheet} onClose={() => setShowGenerateSheet(false)}>
        <ActionsheetBackdrop />
        <ActionsheetContent className="items-stretch bg-background rounded-t-lg p-5">
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          <VStack space="lg">
            <VStack space="sm">
              <Heading size="lg">Generar lista de la compra</Heading>
              <Text muted>Elige qué comidas planificadas incluir</Text>
            </VStack>

            {renderOption(0, 'Fecha', 'Selecciona una fecha concreta')}
            {renderOption(1, 'Rango de fechas', 'Elige fecha de inicio y fin')}

            <Button size="lg" onPress={() => openAddListScreen(selectedOption === 0)}>
              <ButtonText>Continuar</ButtonText>
            </Button>

            <Button variant="ghost" onPress={() => setShowGenerateSheet(false)}>
              <ButtonText className="text-muted-foreground">Cancelar</ButtonText>
            </Button>
          </VStack>
        </ActionsheetContent>
      </Actionsheet>
    </SafeAreaView>
  );
}
