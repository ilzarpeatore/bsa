import React, { useState, useEffect, useRef } from 'react';
import { FlatList, Alert, Keyboard } from 'react-native';
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

let selectedImageIndex = -1;

export default function ChattingImageScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();

  const renderMessage = ({ item, index }: { item: any; index: number }) => (
    <Box className="px-4">
      {/* User message */}
      <Box
        className="flex-row items-start rounded-md"
        style={{
          backgroundColor: C.brand60,
          borderBottomRightRadius: 4,
          padding: 12,
          marginLeft: 48,
          marginBottom: 4,
          gap: 8,
        }}>
        {item.imageUri ? (
          <Box
            className="items-center justify-center"
            style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <Icon name="image" size={16} className="text-muted-foreground" />
          </Box>
        ) : null}
        <Text className="flex-1" style={{ lineHeight: 20 }}>
          {item.question}
        </Text>
      </Box>

      {/* Bot response */}
      <Box
        className="flex-row items-start rounded-md"
        style={{
          backgroundColor: C.surfaceLight,
          borderBottomLeftRadius: 4,
          padding: 12,
          marginRight: 48,
          gap: 8,
        }}>
        <Icon name="hardware-chip-outline" size={18} className="text-foreground" />
        {item.isLoading ? (
          <Box className="flex-row items-center" style={{ gap: 8 }}>
            <Spinner size="small" color={C.orange} />
            <Text size="sm" muted>
              Pensando...
            </Text>
          </Box>
        ) : (
          <Text className="flex-1" muted style={{ lineHeight: 20 }}>
            {item.answer}
          </Text>
        )}
      </Box>
    </Box>
  );

  const [questionAnswers, setQuestionAnswers] = useState<any[]>([]);
  const myMessagesRef = useRef<any[]>([]);
  const [msgController, setMsgController] = useState('');
  const isLoadingRef = useRef(false);
  const [showUI, setShowUI] = useState(true);
  const isScrollRef = useRef(false);
  const [showResponse, setShowResponse] = useState(false);
  const imageSelectedRef = useRef('');
  const [selectedText, setSelectedText] = useState('');
  const [firstQuestion, setFirstQuestion] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    isLoadingRef.current = false;
    // TODO: Initialize OpenAI and auto-send first message
    setShowUI(true);
  }, []);

  const sendMessage = async () => {
    if (!msgController.trim()) return;
    Keyboard.dismiss();
    setShowResponse(true);
    isLoadingRef.current = true;

    const question = selectedText ? selectedText + msgController : msgController;
    setMsgController('');

    const newQA = {
      question,
      imageUri: imageSelectedRef.current,
      answer: '',
      isLoading: true,
      smartCompose: selectedText,
    };
    setQuestionAnswers((prev) => [newQA, ...prev]);

    const newMsgs = [...myMessagesRef.current, { role: 'user', content: question }];
    myMessagesRef.current = newMsgs;

    try {
      // TODO: Replace with actual OpenAI API call
      // const stream = await openAI.onChatCompletion(request);
      // Simulate response
      const answer =
        'Esto es una respuesta de ejemplo. Falta implementar la integración con OpenAI.';
      setQuestionAnswers((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[0] = { ...updated[0], answer, isLoading: false };
        }
        return updated;
      });
      myMessagesRef.current = [...myMessagesRef.current, { role: 'assistant', content: answer }];
      imageSelectedRef.current = '';
      selectedImageIndex = -1;
    } catch (error) {
      setQuestionAnswers((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[0] = {
            ...updated[0],
            answer: 'Demasiadas solicitudes, inténtalo de nuevo',
            isLoading: false,
          };
        }
        return updated;
      });
      imageSelectedRef.current = '';
      selectedImageIndex = -1;
    }

    isLoadingRef.current = false;
    setShowResponse(false);
  };

  const showClearDialog = () => {
    Alert.alert('Limpiar Chat', '¿Estás seguro de que quieres borrar toda la conversación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí',
        onPress: () => {
          setQuestionAnswers([]);
          myMessagesRef.current = [];
        },
      },
    ]);
  };

  if (!showUI) {
    return (
      <Box className="flex-1 items-center justify-center" style={{ backgroundColor: C.bg }}>
        <Spinner size="large" color={C.orange} />
      </Box>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader
        title="FitBot"
        onBack={() => navigation.goBack()}
        rightAction={
          questionAnswers.length > 0 ? (
            <Button variant="ghost" size="icon" onPress={showClearDialog}>
              <Icon name="refresh-outline" size={22} className="text-foreground" />
            </Button>
          ) : undefined
        }
      />

      <Box className="flex-1">
        {questionAnswers.length > 0 ? (
          <FlatList
            ref={flatListRef}
            data={questionAnswers}
            renderItem={renderMessage}
            keyExtractor={(_, i) => i.toString()}
            inverted
            contentContainerStyle={{ paddingVertical: 16 }}
            ItemSeparatorComponent={() => <Box style={{ height: 12 }} />}
          />
        ) : (
          <Box className="flex-1 items-center justify-center" style={{ gap: 12 }}>
            {/* TODO: Integrate ChatBotEmptyScreen */}
            <Icon name="chatbubbles-outline" size={48} className="text-muted-foreground" />
            <Text size="lg" weight="semibold" muted>
              FitBot Chat de imágenes
            </Text>
            <Text size="sm" muted>
              Envía una imagen y haz una pregunta
            </Text>
          </Box>
        )}
      </Box>

      {!showResponse && (
        <Box
          className="flex-row items-end bg-card"
          style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, gap: 10 }}>
          <Input
            className="flex-1 rounded-sm"
            size="md"
            style={{ height: undefined, minHeight: 44, maxHeight: 100 }}>
            <InputField
              placeholder="Escribe un mensaje..."
              value={msgController}
              onChangeText={setMsgController}
              onSubmitEditing={sendMessage}
              multiline
              onFocus={() => {
                isScrollRef.current = true;
              }}
            />
          </Input>
          <Pressable
            className="w-10 h-10 rounded-sm items-center justify-center"
            style={{ backgroundColor: C.brand5 }}
            onPress={sendMessage}
            disabled={!msgController.trim()}>
            <Icon name="send" size={16} className="text-foreground" />
          </Pressable>
        </Box>
      )}
    </SafeAreaView>
  );
}
