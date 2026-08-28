import React, { useState } from 'react';
import { FlatList } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';

interface LanguageData {
  languageCode: string;
  languageName: string;
  languageImage: string;
}

interface LanguageScreenProps {
  navigation?: any;
  route?: any;
}

const defaultLanguages: LanguageData[] = [
  { languageCode: 'en', languageName: 'English', languageImage: '' },
  { languageCode: 'es', languageName: 'Spanish', languageImage: '' },
  { languageCode: 'fr', languageName: 'French', languageImage: '' },
  { languageCode: 'ar', languageName: 'Arabic', languageImage: '' },
];

export default function LanguageScreen(props: LanguageScreenProps) {
  const { colors: C } = useAppColorMode();
  const { navigation } = props;
  const [selectedCode, setSelectedCode] = useState('en');
  const [languages] = useState<LanguageData[]>(defaultLanguages);

  const handleSelect = async (item: LanguageData) => {
    setSelectedCode(item.languageCode);
    // API/persist language selection
    // await setValue(SELECTED_LANGUAGE_CODE, item.languageCode);
    // await appStore.setLanguage(item.languageCode, context);
    navigation?.goBack();
  };

  const renderItem = ({ item }: { item: LanguageData }) => {
    const isSelected = selectedCode === item.languageCode;
    return (
      <Pressable
        className={`px-4 py-3 rounded-sm border ${isSelected ? 'bg-secondary border-primary' : 'bg-card border-border'}`}
        onPress={() => handleSelect(item)}
      >
        <Box className="flex-row items-center gap-4">
          {item.languageImage ? (
            <Image source={{ uri: item.languageImage }} style={{ width: 32, height: 32, borderRadius: 4 }} contentFit="cover" />
          ) : (
            <Box className="w-8 h-8 rounded-sm bg-muted" />
          )}
          <Text weight="bold" className="flex-1 text-foreground">
            {item.languageName.split(' ')[0]}
          </Text>
          <Icon name={isSelected ? 'radio-button-on' : 'radio-button-off'} size={20} className="text-foreground" />
        </Box>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="Select Language" onBack={() => navigation?.goBack()} />
      <FlatList
        data={languages}
        keyExtractor={(item) => item.languageCode}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 16 }}
      />
    </SafeAreaView>
  );
}
