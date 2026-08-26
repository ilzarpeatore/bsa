import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Button } from '@components/ui/button';
import { Icon } from '@components/ui/icon';
import { useAppColorMode } from '@helper/useAppColorMode';

interface Props {
  navigation?: any;
  route?: any;
}

export default function ComingSoonScreen(props: Props) {
  const { colors: C } = useAppColorMode();
  const { navigation, route } = props;
  const title: string = route?.params?.title || 'Próximamente';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Box className="flex-row items-center px-3 py-3">
        <Button variant="ghost" size="icon" onPress={() => navigation?.goBack()}>
          <Icon name="chevron-back" size={22} className="text-foreground" />
        </Button>
      </Box>
      <Box className="flex-1 items-center justify-center px-8">
        <Box style={{ marginBottom: 16 }} className="w-16 h-16 rounded-pill bg-card items-center justify-center">
          <Icon name="construct-outline" size={30} className="text-muted-foreground" />
        </Box>
        <Text weight="bold" size="lg" className="text-center">{title}</Text>
        <Text muted className="text-center" style={{ marginTop: 8 }}>Estamos trabajando en esta pantalla. Vuelve pronto.</Text>
      </Box>
    </SafeAreaView>
  );
}
