import React, { useCallback, useMemo, useState } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { Box } from '@components/ui/box';
import { Spinner } from '@components/ui/spinner';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';
import { PRIVACY_POLICY_URL } from '@constants/appLinks';

// Antes: texto estático recibido por route.params.privacyPolicy, que nunca
// nadie rellenaba (siempre caía en el placeholder "Privacy policy content
// will be loaded here."). Ahora abre la URL pública real dentro de la app
// (mismo patrón de origen restringido que web_view_screen.tsx, SEC-003) en
// vez de embeber el texto legal -- así se puede actualizar la política sin
// publicar una versión nueva, y App Store Connect/Play Console ya piden esta
// misma URL en la ficha de la tienda.
export default function PrivacyPolicyScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const [isLoading, setIsLoading] = useState(true);

  const initialOrigin = useMemo(() => {
    try {
      return new URL(PRIVACY_POLICY_URL).origin;
    } catch {
      return null;
    }
  }, []);

  const onShouldStartLoadWithRequest = useCallback(
    (request: WebViewNavigation) => {
      if (!initialOrigin) return true;
      try {
        if (new URL(request.url).origin === initialOrigin) return true;
      } catch {
        // esquemas sin origen HTTP real (mailto:, tel:, etc.)
      }
      Linking.openURL(request.url).catch(() => {});
      return false;
    },
    [initialOrigin]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="Política de privacidad" onBack={() => props.navigation?.goBack()} />
      <Box style={{ flex: 1 }}>
        <WebView
          source={{ uri: PRIVACY_POLICY_URL }}
          style={{ flex: 1 }}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        />
        {isLoading && (
          <Box className="items-center justify-center bg-card" style={StyleSheet.absoluteFill}>
            <Spinner size="large" />
          </Box>
        )}
      </Box>
    </SafeAreaView>
  );
}
