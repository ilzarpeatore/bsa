import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FlatList, Alert, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Button } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Input, InputField } from '@components/ui/input';
import { Spinner } from '@components/ui/spinner';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';
import { chatApi, ChatMessage } from '../../api/chat';

interface DisplayMessage {
  id: string;
  question: string;
  answer: string;
  isLoading: boolean;
  time?: string;
}

export default function ChattingScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();

  const renderMessage = ({ item }: { item: DisplayMessage }) => (
    <Box className="px-4">
      <Box
        className="flex-row items-start rounded-md"
        style={{
          backgroundColor: C.brand60,
          borderBottomRightRadius: 4,
          padding: 12,
          marginLeft: 48,
          marginBottom: 4,
        }}
      >
        <Text className="flex-1" style={{ lineHeight: 20 }}>{item.question}</Text>
      </Box>

      <Box
        className="flex-row items-start rounded-md"
        style={{
          backgroundColor: C.surfaceLight,
          borderBottomLeftRadius: 4,
          padding: 12,
          marginRight: 48,
          gap: 8,
        }}
      >
        <Icon name="hardware-chip-outline" size={18} className="text-foreground" />
        {item.isLoading ? (
          <Box className="flex-row items-center" style={{ gap: 8 }}>
            <Spinner size="small" color={C.orange} />
            <Text size="sm" muted>Pensando...</Text>
          </Box>
        ) : (
          <Text className="flex-1" muted style={{ lineHeight: 20 }}>{item.answer}</Text>
        )}
      </Box>
    </Box>
  );

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [msgController, setMsgController] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await chatApi.getList();
      const items: DisplayMessage[] = (res.data.data ?? []).map((m: ChatMessage) => ({
        id: m.id.toString(),
        question: m.question,
        answer: m.answer,
        isLoading: false,
        time: m.created_at,
      }));
      setMessages(items);
    } catch {
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const sendMessage = async () => {
    if (!msgController.trim()) return;
    Keyboard.dismiss();

    const question = msgController.trim();
    setMsgController('');

    const tempId = `temp_${Date.now()}`;
    const newMsg: DisplayMessage = {
      id: tempId,
      question,
      answer: '',
      isLoading: true,
    };
    setMessages(prev => [newMsg, ...prev]);

    try {
      const answer = 'FitBot está disponible para consultas básicas. Para asesoría personalizada, contacta a tu entrenador.';

      await chatApi.save(question, answer);

      setMessages(prev =>
        prev.map(m =>
          m.id === tempId ? { ...m, answer, isLoading: false } : m
        )
      );
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === tempId ? { ...m, answer: 'Error al enviar. Intenta de nuevo.', isLoading: false } : m
        )
      );
    }
  };

  const showClearDialog = () => {
    Alert.alert('Limpiar Chat', '¿Estás seguro de que quieres borrar toda la conversación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí',
        onPress: async () => {
          try {
            await chatApi.deleteAll();
            setMessages([]);
          } catch {
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScreenHeader
        title="FitBot"
        onBack={() => navigation.goBack()}
        rightAction={
          messages.length > 0 ? (
            <Button variant="ghost" size="icon" onPress={showClearDialog}>
              <Icon name="refresh-outline" size={22} className="text-foreground" />
            </Button>
          ) : undefined
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <Pressable onPress={Keyboard.dismiss} accessible={false} style={{ flex: 1 }}>
          <Box className="flex-1">
            {isLoadingHistory ? (
              <Box className="flex-1 items-center justify-center" style={{ gap: 12 }}>
                <Spinner size="large" color={C.orange} />
              </Box>
            ) : messages.length > 0 ? (
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                inverted
                contentContainerStyle={{ paddingVertical: 16 }}
                ItemSeparatorComponent={() => <Box style={{ height: 12 }} />}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              />
            ) : (
              <Box className="flex-1 items-center justify-center" style={{ gap: 12 }}>
                <Icon name="chatbubbles-outline" size={48} className="text-muted-foreground" />
                <Text size="lg" weight="semibold" muted>FitBot</Text>
                <Text size="sm" muted>Pregúntame sobre fitness y nutrición</Text>
              </Box>
            )}
          </Box>
        </Pressable>

        <Box
          className="flex-row items-end bg-card"
          style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, gap: 10 }}
        >
          <Input className="flex-1 rounded-sm" size="md" style={{ height: undefined, minHeight: 44, maxHeight: 100 }}>
            <InputField
              placeholder="Escribe un mensaje..."
              value={msgController}
              onChangeText={setMsgController}
              onSubmitEditing={sendMessage}
              blurOnSubmit={false}
              returnKeyType="send"
              multiline
            />
          </Input>
          <Pressable
            className="w-10 h-10 rounded-sm items-center justify-center"
            style={{ backgroundColor: C.brand5 }}
            onPress={sendMessage}
            disabled={!msgController.trim()}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
          >
            <Icon name="send" size={16} className="text-foreground" />
          </Pressable>
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
