import React, { useEffect, useState } from 'react';
import { ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Button, ButtonText } from '@components/ui/button';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import ScreenHeader from '@components/ScreenHeader';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { useAppColorMode } from '@helper/useAppColorMode';
import { resourcesApi, ResourceListItem } from '../../api/resources';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mismo patron probado en blog_detail_screen.tsx: contenido subido por el coach
// (incluso documentos HTML completos, ver isFullDocument) renderizado tal cual en
// un WebView — se sanea (quita <script>/<iframe> ajenos y atributos on*=) antes de
// inyectar el propio <iframe> de YouTube e el resize script, ambos de confianza.
const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1=$2#$2');
};

// Mismo patron probado en blog_detail_screen.tsx: altura dinamica via
// postMessage (el WebView no sabe su propia altura de contenido de otra
// forma), mas transformacion de enlaces de YouTube a embed real.
const renderYouTubeEmbeds = (html: string): string => {
  if (!html) return '';
  return html.replace(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g,
    `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:16px 0;">
      <iframe src="https://www.youtube.com/embed/$1" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
        allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
    </div>`
  );
};

// Antes una constante de módulo (WRAPPER_HTML) que capturaba `C` estático en
// el momento de cargar el módulo -- convertido a función para que el HTML
// generado use siempre los colores del tema actual (claro/oscuro).
//
// Clases .box/.box-info/.box-success/.box-warning/.box-danger (pedido
// explícito 2026-08-30, para migrar las guías estáticas de GuideBlocks a
// Recursos sin perder su lenguaje visual): mismos tokens de color que
// HighlightBox en components/GuideBlocks.tsx (C.orange10/blue10/success10/
// warning10/destructive10), recalculados en cada render con el tema actual
// -- un recurso que use estas clases respeta claro/oscuro igual que el
// resto del wrapper, a diferencia de un documento HTML completo con su
// propio <style> fijo (ver docs/PENDIENTE_BACKEND_ADMIN.md).
function buildWrapperHtml(C: ReturnType<typeof useAppColorMode>['colors']): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    body { margin:0; padding:0; background-color:${C.surface}; color:${C.textPrimary}; font-family:-apple-system,BlinkMacSystemFont,sans-serif; }
    img { max-width:100%; height:auto; border-radius:8px; margin:8px 0; }
    p, li { font-size:15px; line-height:1.7; color:${C.textSecondary}; margin:8px 0; }
    h1 { color:${C.textPrimary}; font-size:24px; margin:4px 0 6px; }
    h2 { color:${C.textPrimary}; font-size:20px; margin:22px 0 10px; padding-bottom:8px; border-bottom:1px solid ${C.orange10}; }
    h3 { color:${C.textPrimary}; font-size:16px; margin:16px 0 8px; }
    h4 { color:${C.textPrimary}; margin:12px 0 8px; }
    .kicker { color:${C.textSecondary}; font-size:13px; font-weight:700; margin-bottom:2px; }
    .subtitle { color:${C.textSecondary}; font-size:14px; margin:0 0 16px; }
    table { width:100%; border-collapse:collapse; margin:12px 0; }
    th, td { border:1px solid ${C.border}; padding:8px; font-size:14px; text-align:left; }
    th { background:${C.blue60}; color:#FFFFFF; }
    blockquote { border-left:3px solid ${C.accentBlack}; padding-left:12px; margin:12px 0; color:${C.textSecondary}; }
    a { color:${C.blue60}; }
    iframe { border-radius:12px; }
    .box { border-left:4px solid ${C.orange}; background:${C.orange10}; padding:12px 14px; border-radius:8px; margin:14px 0; }
    .box p, .box li { color:${C.textPrimary}; margin:4px 0; }
    .box .box-title { display:block; color:${C.orange60}; font-weight:700; margin-bottom:6px; }
    .box-info { border-left-color:${C.blue}; background:${C.blue10}; }
    .box-info .box-title { color:${C.blue60}; }
    .box-success { border-left-color:${C.success}; background:${C.success10}; }
    .box-success .box-title { color:${C.success60}; }
    .box-warning { border-left-color:${C.warning}; background:${C.warning10}; }
    .box-warning .box-title { color:${C.warning60}; }
    .box-danger { border-left-color:${C.destructive}; background:${C.destructive10}; }
    .box-danger .box-title { color:${C.destructive}; }
  </style>
</head>
<body>
  <div id="content">__CONTENT__</div>
  <script>
    window.onload = function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type:'resize', height: document.documentElement.scrollHeight }));
    };
  </script>
</body>
</html>`;
}

// Recursos subidos como archivo HTML completo (con su propio <html>/<head>/<style>)
// en vez de un fragmento: se sirven tal cual, sin envolverlos en WRAPPER_HTML
// (anidar <html> dentro de <html> es invalido), solo se les inyecta el mismo
// script de medicion de altura que usa WRAPPER_HTML.
const isFullDocument = (html: string): boolean => /^\s*(<!DOCTYPE|<html)/i.test(html);

const RESIZE_SCRIPT = `<script>
  window.onload = function() {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type:'resize', height: document.documentElement.scrollHeight }));
  };
</script>`;

const injectResizeScript = (html: string): string => {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${RESIZE_SCRIPT}</body>`);
  }
  return html + RESIZE_SCRIPT;
};

// Solo el documento que generamos nosotros mismos (source.html, origin "about:blank")
// y el iframe de YouTube que pueda contener deben poder navegar en este WebView.
const onShouldStartLoadWithRequest = (request: any) => {
  const url: string = request?.url ?? '';
  if (url === 'about:blank' || url.startsWith('data:')) return true;
  try {
    const host = new URL(url).hostname;
    return host === 'www.youtube.com' || host === 'youtube.com' || host.endsWith('.googlevideo.com') || host.endsWith('.ytimg.com');
  } catch {
    return false;
  }
};

interface Props {
  navigation?: any;
  route?: any;
}

export default function ResourceDetailScreen(props: Props) {
  const { colors: C } = useAppColorMode();
  const { navigation, route } = props;
  const resourceId: number | undefined = route?.params?.resourceId;
  const fallbackTitle: string | undefined = route?.params?.title;

  const [isLoading, setIsLoading] = useState(!!resourceId);
  const [error, setError] = useState(!resourceId);
  const [resource, setResource] = useState<ResourceListItem | null>(null);
  const [webViewHeight, setWebViewHeight] = useState(SCREEN_HEIGHT * 0.5);

  useEffect(() => {
    if (!resourceId) return;
    resourcesApi
      .getDetail(resourceId)
      .then((res) => setResource(res.data.data))
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, [resourceId]);

  const onWebViewMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'resize' && msg.height > 0) {
        setWebViewHeight(msg.height + 24);
      }
    } catch {}
  };

  const openExternal = () => {
    if (!resource?.external_url) return;
    navigation?.navigate('MigratedWebView', { mInitialUrl: resource.external_url });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
        <ScreenHeader title="" onBack={() => navigation?.goBack()} />
        <Box className="flex-1 items-center justify-center px-8">
          <Spinner size="large" color={C.textPrimary} />
        </Box>
      </SafeAreaView>
    );
  }

  if (error || !resource) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
        <ScreenHeader title="" onBack={() => navigation?.goBack()} />
        <Box className="flex-1 items-center justify-center px-8">
          <Text muted className="text-center">No se pudo cargar el recurso.</Text>
        </Box>
      </SafeAreaView>
    );
  }

  const isExternalType = resource.type === 'video' || resource.type === 'link';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title={resource.title || fallbackTitle || ''} onBack={() => navigation?.goBack()} />

      {isExternalType ? (
        <Box className="flex-1 items-center justify-center px-8">
          <Icon
            name={resource.type === 'video' ? 'play-circle-outline' : 'link-outline'}
            size={48}
            className="text-muted-foreground"
          />
          <Text weight="extrabold" size="lg" className="text-center" style={{ marginTop: 16 }}>
            {resource.title}
          </Text>
          <Button radius="pill" size="lg" style={{ marginTop: 24 }} onPress={openExternal}>
            <ButtonText>{resource.type === 'video' ? 'VER VÍDEO' : 'ABRIR ENLACE'}</ButtonText>
          </Button>
        </Box>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 + WORKOUT_MINIBAR_CLEARANCE, paddingTop: 12 }}>
          {resource.content ? (
            <WebView
              source={{
                html: (() => {
                  const sanitized = sanitizeHtml(resource.content);
                  return isFullDocument(sanitized)
                    ? injectResizeScript(renderYouTubeEmbeds(sanitized))
                    : buildWrapperHtml(C).replace('__CONTENT__', renderYouTubeEmbeds(sanitized));
                })(),
              }}
              style={{ width: '100%', height: webViewHeight }}
              scrollEnabled={false}
              originWhitelist={['about:blank']}
              onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
              onMessage={onWebViewMessage}
              javaScriptEnabled
            />
          ) : (
            <Text muted className="text-center">Este recurso todavía no tiene contenido.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
