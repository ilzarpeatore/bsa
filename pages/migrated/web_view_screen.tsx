import React, { useState, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { Box } from '@components/ui/box';
import { Button } from '@components/ui/button';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import { useAppColorMode } from '@helper/useAppColorMode';

interface WebViewScreenProps {
  route?: {
    params?: {
      mInitialUrl?: string;
      isAdsLoad?: boolean;
      onClick?: (status: string) => void;
    };
  };
  navigation?: any;
}

export default function WebViewScreen(props: WebViewScreenProps) {
  const { colors: C } = useAppColorMode();
  const { mInitialUrl, isAdsLoad = false, onClick } = props.route?.params || {};
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  const url = mInitialUrl || 'https://www.google.com';
  const initialOrigin = useMemo(() => {
    try {
      return new URL(url).origin;
    } catch {
      return null;
    }
  }, [url]);

  // Restringe la navegacion al mismo origen que la URL inicial -- esta
  // pantalla se abre con un external_url que viene del backend (recursos/CMS),
  // no de un input directo del usuario, pero sin esta comprobacion la WebView
  // seguiria cualquier redirect/enlace embebido sin ningun limite. Cualquier
  // otro origen se abre en el navegador del sistema en vez de cargarse aqui.
  const onShouldStartLoadWithRequest = useCallback(
    (request: WebViewNavigation) => {
      if (!initialOrigin) return true;
      try {
        const requestOrigin = new URL(request.url).origin;
        if (requestOrigin === initialOrigin) return true;
      } catch {
        // esquemas sin origen HTTP real (mailto:, tel:, whatsapp://, etc.)
      }
      Linking.openURL(request.url).catch(() => {});
      return false;
    },
    [initialOrigin]
  );

  const onLoadStart = () => setIsLoading(true);
  const onLoadEnd = () => setIsLoading(false);
  const onError = () => setIsLoading(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Box className="flex-row items-center px-2 py-2.5 bg-card border-b border-border">
        <Button variant="ghost" size="icon" onPress={() => props.navigation?.goBack()}>
          <Icon name="chevron-back" size={24} className="text-foreground" />
        </Button>
        <Box className="flex-1" />
      </Box>

      <Box className="flex-1">
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={{ flex: 1 }}
          onLoadStart={onLoadStart}
          onLoadEnd={onLoadEnd}
          onError={onError}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsBackForwardNavigationGestures={true}
          userAgent="Mozilla/5.0 (Linux; Android 4.2.2; GT-I9505 Build/JDQ39) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.59 Mobile Safari/537.36"
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
