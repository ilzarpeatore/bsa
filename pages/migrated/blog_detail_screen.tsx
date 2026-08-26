import React, { useState, useEffect, useCallback } from 'react';
import { Dimensions, ActivityIndicator, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { HStack } from '@components/ui/hstack';
import { VStack } from '@components/ui/vstack';
import { Button } from '@components/ui/button';
import { Icon } from '@components/ui/icon';
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionTitleText,
  AccordionContent,
} from '@components/ui/accordion';
import { useAppColorMode } from '@helper/useAppColorMode';
import { blogApi, BlogDetailItem } from '../../api/blog';
import logger from '@helper/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mismo efecto glass progresivo que el hero de home_screen_modern_v2.tsx
// (pedido explícito: "el mismo efecto que las imágenes que hay en el home
// v2") -- a medida que se hace scroll la foto de cabecera se desenfoca y
// oscurece progresivamente, dejando el texto de título/categoría (que se
// pinta encima, en un z-index superior) siempre legible.
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const HERO_BLUR_SCROLL_RANGE = 220;
const HERO_BLUR_MAX_INTENSITY = 90;
const HERO_DARKEN_MAX_OPACITY = 0.55;

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

// Blog content comes from the coach/admin rich-text editor and is rendered raw inside a
// WebView — strip the constructs that would let a compromised/malicious editor session
// execute script or redirect the WebView (stored-XSS defense-in-depth; the WebView's own
// originWhitelist/onShouldStartLoadWithRequest below is the primary navigation guard).
const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1=$2#$2');
};

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

// El texto del cuerpo (p, li) estaba hardcodeado en gris claro (#e0e0e0),
// un resto de cuando este WebView se diseñó para fondo oscuro: sobre el bg
// claro actual (C.surface) era casi ilegible. Corregido a C.textPrimary
// (negro). Antes una constante de módulo (WRAPPER_HTML) que capturaba `C`
// estático en el momento del import -- convertida a función (mismo patrón
// que resource_detail_screen.tsx) para que reciba el `C` dinámico de
// useAppColorMode() y el HTML generado siga al tema actual. Esto se dejó
// pendiente hasta que GluestackUIProvider dejase de estar fijo en
// mode="light" (App.tsx) -- el resto de esta pantalla usa
// className="bg-card"/"bg-background" de NativeWind, que hasta ahora no
// respondía a modo oscuro; con GluestackUIProvider ya dinámico (ver
// App.tsx/GluestackModeBridge) esas clases seguirán el tema por su cuenta,
// así que solo hacía falta dinamizar este WebView.
function buildWrapperHtml(C: ReturnType<typeof useAppColorMode>['colors']): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    /* padding real en el body -- antes el texto llegaba justo al borde de la
       tarjeta (bg-card) que lo envuelve, sin ningún margen propio: se veía
       "colapsado y junto" (pedido explícito). El padding vive aquí, no en la
       tarjeta de fuera, para que las imágenes/tablas del contenido puedan
       seguir siendo full-bleed si el editor las pone así. */
    body { margin:0; padding:16px 18px; background-color:${C.surface}; font-family:-apple-system,BlinkMacSystemFont,sans-serif; }
    img { max-width:100%; height:auto; border-radius:12px; margin:10px 0; }
    p, li { font-size:15px; line-height:1.7; margin:10px 0; }
    h1,h2,h3,h4 { margin:16px 0 10px; }
    /* Radio de 12px en todos los bloques "recuadrados" del contenido editorial
       (cita, código, tabla) para que sigan el mismo lenguaje visual que el
       resto de tarjetas de la app (RADIUS.sm = 12px) en vez de verse a
       esquina viva. El color de texto real de blockquote/enlaces lo deciden
       las reglas #content de abajo (!important) -- aquí solo forma. */
    blockquote { border-left:3px solid ${C.orange}; border-radius:12px; padding:10px 12px; margin:12px 0; }
    pre, code { border-radius:12px; }
    pre { padding:12px; overflow-x:auto; }
    table { border-radius:12px; overflow:hidden; border-collapse:separate; border-spacing:0; }
    iframe { border-radius:12px; }
    /* El HTML del editor a veces trae color inline (grises pensados para un
       fondo oscuro que ya no existe) -- un simple "p { color }" pierde
       contra eso por especificidad. #content + !important gana tanto a los
       estilos inline como a cualquier color suelto que traiga el contenido,
       sin tener que sanitizarlo elemento por elemento. */
    #content, #content * { color:${C.textPrimary} !important; }
    #content blockquote { color:${C.textSecondary} !important; }
    #content a { color:${C.orange} !important; }
  </style>
</head>
<body>
  <div id="content">__CONTENT__</div>
  <script>
    window.addEventListener('message', function(e) {
      if (e.data === 'resize') {
        document.body.style.height = document.documentElement.scrollHeight + 'px';
        window.ReactNativeWebView.postMessage(JSON.stringify({ type:'resize', height: document.documentElement.scrollHeight }));
      }
    });
    window.onload = function() {
      document.body.style.height = document.documentElement.scrollHeight + 'px';
      window.ReactNativeWebView.postMessage(JSON.stringify({ type:'resize', height: document.documentElement.scrollHeight }));
    };
  </script>
</body>
</html>`;
}

// Only the wrapper HTML we generate (loaded as source.html, origin "about:blank") and the
// YouTube embed iframe it may contain should ever load in this WebView — block navigation
// to any other origin (e.g. a malicious link/redirect inside sanitized blog content).
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

export default function BlogDetailScreen({ navigation, route }: any) {
  const { colors: C } = useAppColorMode();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const heroScrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const heroBlurAnimatedProps = useAnimatedProps(() => ({
    intensity: interpolate(scrollY.value, [0, HERO_BLUR_SCROLL_RANGE], [0, HERO_BLUR_MAX_INTENSITY], Extrapolation.CLAMP),
  }));
  const heroDarkenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HERO_BLUR_SCROLL_RANGE], [0, HERO_DARKEN_MAX_OPACITY], Extrapolation.CLAMP),
  }));
  const mBlogModel = route?.params?.mBlogModel;
  // home_screen_modern.tsx navigates with { id } instead of { mBlogModel }; support both
  // so the post fetched from the API always matches what the user tapped.
  const blogId = mBlogModel?.id ?? route?.params?.id ?? 0;

  const [loading, setLoading] = useState(true);
  const [blog, setBlog] = useState<BlogDetailItem | null>(null);
  const [webViewHeight, setWebViewHeight] = useState(SCREEN_HEIGHT * 0.5);
  const [bibliographyOpen, setBibliographyOpen] = useState(false);

  const loadDetail = useCallback(async (ignoreRef: { current: boolean }) => {
    setLoading(true);
    try {
      const res = await blogApi.getDetail(blogId);
      if (ignoreRef.current) return;
      setBlog(res.data?.data ?? mBlogModel ?? null);
    } catch (e) {
      logger.error('Error loading blog detail:', e);
      if (ignoreRef.current) return;
      setBlog(mBlogModel ?? null);
    } finally {
      setLoading(false);
    }
  }, [blogId, mBlogModel]);

  // react-doctor no reconoce la guarda de ignoreRef porque vive dentro de
  // loadDetail (llamada por referencia, no inline): si el fetch queda
  // obsoleto, ignoreRef.current corta antes de tocar el estado con datos
  // viejos.
  // react-doctor-disable-next-line no-set-state-after-await-in-effect
  useEffect(() => {
    const ignoreRef = { current: false };
    loadDetail(ignoreRef);
    return () => {
      ignoreRef.current = true;
    };
  }, [loadDetail]);

  const onWebViewMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'resize' && msg.height > 0) {
        setWebViewHeight(msg.height + 20);
      }
    } catch {}
  };

  const getRenderedHtml = () => {
    const content = blog?.content || blog?.description || '';
    const withEmbeds = renderYouTubeEmbeds(sanitizeHtml(content));
    return buildWrapperHtml(C).replace('__CONTENT__', withEmbeds);
  };

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={C.orange} />
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-background">
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        onScroll={heroScrollHandler}
        scrollEventThrottle={16}
      >
        {/* Hero */}
        <Box style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.42, position: 'relative', overflow: 'hidden' }}>
          {blog?.post_image ? (
            <ExpoImage source={{ uri: blog.post_image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Box className="bg-card" style={{ width: '100%', height: '100%' }} />
          )}
          <Box style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
          {/* Glass progresivo (mismo efecto que el hero de home v2): la foto
              se desenfoca y oscurece más a medida que se hace scroll, sin
              tapar nunca del todo el texto/iconos de encima (z-index
              superior, pintados después de estas dos capas). */}
          <AnimatedBlurView
            style={StyleSheet.absoluteFill}
            animatedProps={heroBlurAnimatedProps}
            tint="dark"
            pointerEvents="none"
          />
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }, heroDarkenAnimatedStyle]}
          />

          <Button
            variant="ghost"
            size="icon"
            style={{ position: 'absolute', top: insets.top + 8, left: 8 }}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-back" size={28} color="#FFFFFF" />
          </Button>

          {/* Blanco fijo (no C.white) en todo este bloque de overlay sobre
              la foto -- C.white ahora depende del modo claro/oscuro
              (negro/blanco), pero este texto/icono va sobre el scrim oscuro
              de la imagen, no sobre una superficie de la app: debe verse
              igual en ambos modos. */}
          <HStack
            className="items-center rounded-sm"
            style={{
              position: 'absolute',
              top: insets.top + 58,
              left: 16,
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 8,
              paddingVertical: 5,
            }}
          >
            <Icon name="time-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text size="xs" style={{ color: '#FFFFFF' }}>{formatDate(blog?.datetime || blog?.created_at || '')}</Text>
          </HStack>

          <Text
            weight="bold"
            size="xl"
            numberOfLines={3}
            style={{
              position: 'absolute',
              bottom: 50,
              left: 16,
              right: 16,
              color: '#FFFFFF',
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            }}
          >
            {blog?.title ?? ''}
          </Text>

          {blog?.blog_category && (
            <Box
              className="rounded-sm"
              style={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                backgroundColor: C.brand5,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text size="xs" weight="semibold" style={{ color: '#FFFFFF' }}>{blog.blog_category.title}</Text>
            </Box>
          )}
        </Box>

        {/* Content */}
        <Box className="bg-background rounded-t-lg" style={{ paddingTop: 16, paddingBottom: 40 }}>
          {/* Tags */}
          {blog?.tags_name && blog.tags_name.length > 0 && (
            <Box
              className="flex-row flex-wrap"
              style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
            >
              {blog.tags_name.map((tag: any) => (
                <Box
                  key={tag.id}
                  className="bg-card rounded-pill"
                  style={{ paddingHorizontal: 12, paddingVertical: 5, borderWidth: 0.5, borderColor: C.brand5 }}
                >
                  <Text size="xs" style={{ color: C.textPrimary }}>{tag.title ?? ''}</Text>
                </Box>
              ))}
            </Box>
          )}

          {/* Rich content via WebView -- tarjeta con esquinas redondeadas
              como el resto de la app (antes era un rectángulo suelto sin
              radio, la única zona "cuadrada" de la pantalla). */}
          {blog?.content || blog?.description ? (
            <Box className="bg-card rounded-lg" style={{ marginHorizontal: 12, marginTop: 4, overflow: 'hidden' }}>
              <WebView
                source={{ html: getRenderedHtml() }}
                style={{ width: '100%', height: webViewHeight, backgroundColor: 'transparent' }}
                scrollEnabled={false}
                originWhitelist={['about:blank']}
                onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
                onMessage={onWebViewMessage}
                javaScriptEnabled
              />
            </Box>
          ) : null}

          {/* Fuente / Bibliografía — acordeón real (Accordion de Gluestack) */}
          {blog?.bibliography && blog.bibliography.trim().length > 0 && (
            <Accordion
              type="single"
              isCollapsible
              value={bibliographyOpen ? ['bibliography'] : []}
              onValueChange={(value) => setBibliographyOpen(value.includes('bibliography'))}
              className="bg-card rounded-lg"
              style={{ marginTop: 24, marginHorizontal: 12, overflow: 'hidden' }}
            >
              <AccordionItem value="bibliography">
                <AccordionHeader>
                  <AccordionTrigger style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
                    {({ isExpanded }: { isExpanded: boolean }) => (
                      <>
                        <Icon name="book-outline" size={20} color={C.textPrimary} />
                        <AccordionTitleText className="flex-1">Fuente / Bibliografía</AccordionTitleText>
                        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={C.textPrimary} />
                      </>
                    )}
                  </AccordionTrigger>
                </AccordionHeader>
                <AccordionContent style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  <Box style={{ height: 1, backgroundColor: C.gray60, marginBottom: 12 }} />
                  <VStack space="sm">
                    {blog.bibliography.split('\n').filter((line: string) => line.trim().length > 0).map((line: string, index: number) => {
                      const isUrl = line.trim().match(/^https?:\/\//);
                      return (
                        <HStack key={index} space="sm" style={{ alignItems: 'flex-start' }}>
                          <Box style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.brand5, marginTop: 6 }} />
                          {isUrl ? (
                            <Text
                              numberOfLines={3}
                              className="flex-1"
                              size="sm"
                              style={{ color: C.textPrimary, lineHeight: 18 }}
                            >
                              {line.trim()}
                            </Text>
                          ) : (
                            <Text className="flex-1" size="sm" style={{ color: C.gray30, lineHeight: 20 }}>
                              {line.trim()}
                            </Text>
                          )}
                        </HStack>
                      );
                    })}
                  </VStack>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </Box>
      </Animated.ScrollView>
    </Box>
  );
}
