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
    // [\s\/] (not just \s) so a self-closing-style separator (`<img/onerror=..>`,
    // no space before the attribute) doesn't skip the strip; the value alternation
    // covers double-quoted, single-quoted AND unquoted (`onerror=alert(1)`) forms --
    // the original only matched quoted values, which is a well-known filter bypass.
    .replace(/[\s\/]on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    .replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]*)/gi, '$1="#"');
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

// Paleta propia del contenido de Recursos (2026-09-12, pedido explícito:
// "olvídate de respetar el diseño de la app, es muy plano" -- deja de usar
// los tokens de pages/migrated/theme.ts a propósito). Lo único que se
// mantiene del resto de la app es la sincronización claro/oscuro: `mode`
// viene de useAppColorMode() (ya resuelve la preferencia auto/manual del
// usuario), solo se usa para elegir qué paleta de las dos de abajo pintar.
const MODERN_PALETTE = {
  light: {
    bg: '#FFFFFF',
    surfaceCard: '#FFFFFF',
    surfaceAlt: '#FAFAFC',
    border: '#E7E8F0',
    text: '#16181D',
    textMuted: '#5B5F73',
    accent: '#5B4FE9',
    accentSoft: '#EEEBFF',
    accentContrast: '#FFFFFF',
    info: '#2E90E5',
    infoSoft: '#EAF4FE',
    success: '#149F73',
    successSoft: '#E6F8F1',
    warning: '#C2790A',
    warningSoft: '#FCF1DE',
    danger: '#E5484D',
    dangerSoft: '#FDEAEA',
  },
  dark: {
    bg: '#0D0E12',
    surfaceCard: '#171922',
    surfaceAlt: '#1C1F29',
    border: '#282C38',
    text: '#F1F2F6',
    textMuted: '#9A9EB2',
    accent: '#9B8CFF',
    accentSoft: 'rgba(155,140,255,0.16)',
    accentContrast: '#0D0E12',
    info: '#63B7F2',
    infoSoft: 'rgba(99,183,242,0.14)',
    success: '#43D3A0',
    successSoft: 'rgba(67,211,160,0.14)',
    warning: '#E7B155',
    warningSoft: 'rgba(231,177,85,0.14)',
    danger: '#F1696D',
    dangerSoft: 'rgba(241,105,109,0.14)',
  },
} as const;

function buildWrapperHtml(mode: 'light' | 'dark'): string {
  const p = MODERN_PALETTE[mode];
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg:${p.bg}; --surface-card:${p.surfaceCard}; --surface-alt:${p.surfaceAlt}; --border:${p.border};
      --text:${p.text}; --text-muted:${p.textMuted};
      --accent:${p.accent}; --accent-soft:${p.accentSoft}; --accent-contrast:${p.accentContrast};
      --info:${p.info}; --info-soft:${p.infoSoft};
      --success:${p.success}; --success-soft:${p.successSoft};
      --warning:${p.warning}; --warning-soft:${p.warningSoft};
      --danger:${p.danger}; --danger-soft:${p.dangerSoft};
    }
    * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
    body { margin:0; padding:0; background:var(--bg); color:var(--text); font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; }
    #content { padding:24px 20px 48px; }

    .kicker { display:inline-flex; align-items:center; gap:7px; background:var(--accent-soft); color:var(--accent); font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; padding:6px 12px 6px 10px; border-radius:999px; margin:0 0 14px; }
    .kicker::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--accent); }

    h1 { font-family:'Sora',-apple-system,sans-serif; color:var(--text); font-size:27px; font-weight:800; letter-spacing:-0.01em; line-height:1.2; margin:0 0 10px; }
    .subtitle { color:var(--text-muted); font-size:15.5px; line-height:1.6; margin:0 0 24px; padding-bottom:22px; border-bottom:1px solid var(--border); }

    h3 { font-family:'Sora',-apple-system,sans-serif; color:var(--text); font-size:17px; font-weight:700; letter-spacing:-0.005em; margin:22px 0 10px; }
    h4 { color:var(--accent); font-size:13.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; margin:18px 0 8px; }

    p, li { font-size:15.5px; line-height:1.75; color:var(--text-muted); margin:10px 0; }
    strong { color:var(--text); font-weight:700; }
    ul, ol { padding-left:20px; margin:10px 0; }
    li { margin:6px 0; }
    li::marker { color:var(--accent); font-weight:700; }
    a { color:var(--accent); text-decoration:underline; text-underline-offset:2px; }

    img { max-width:100%; height:auto; border-radius:16px; margin:14px 0; display:block; }
    iframe { border-radius:16px; }

    table { width:100%; border-collapse:separate; border-spacing:0; margin:16px 0; font-size:13.5px; border:1px solid var(--border); border-radius:14px; overflow:hidden; }
    thead th { background:var(--accent-soft); color:var(--text); font-weight:700; text-align:left; padding:10px 12px; }
    td { padding:10px 12px; color:var(--text-muted); border-top:1px solid var(--border); }
    tbody tr:nth-child(even) { background:var(--surface-alt); }
    td strong { color:var(--text); }

    blockquote { border-left:3px solid var(--accent); background:var(--accent-soft); padding:12px 16px; border-radius:0 12px 12px 0; margin:14px 0; color:var(--text); }

    /* Callouts .box/.box-info/.box-success/.box-warning/.box-danger --
       tarjeta con tinte + borde de acento a la izquierda, cada variante
       redefine --box-color/--box-bg. Sin variante = tono de aviso (así
       venían usándose ya en el contenido para "antes de hacer X..."). */
    .box { --box-color:var(--warning); --box-bg:var(--warning-soft); background:var(--box-bg); border-left:4px solid var(--box-color); border-radius:4px 16px 16px 4px; padding:16px 18px; margin:18px 0; }
    .box p, .box li { color:var(--text); }
    .box .box-title { display:block; font-weight:800; font-size:14px; color:var(--box-color); margin-bottom:6px; }
    .box-info { --box-color:var(--info); --box-bg:var(--info-soft); }
    .box-success { --box-color:var(--success); --box-bg:var(--success-soft); }
    .box-warning { --box-color:var(--warning); --box-bg:var(--warning-soft); }
    .box-danger { --box-color:var(--danger); --box-bg:var(--danger-soft); }

    /* Acordeón nativo (<details>/<summary>): tarjeta redondeada con sombra
       suave y un icono "+" que gira a "-" al abrir (dos barras del icono,
       la vertical se aplana a 0 -- pura CSS, sin JS de animación). */
    .acc { background:var(--surface-card); border:1px solid var(--border); border-radius:18px; margin:14px 0; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
    .acc[open] { border-color:var(--accent-soft); }
    .acc summary { display:flex; align-items:center; gap:14px; padding:17px 18px; font-family:'Sora',-apple-system,sans-serif; font-size:15.5px; font-weight:700; color:var(--text); cursor:pointer; list-style:none; }
    .acc summary:active { background:var(--surface-alt); }
    .acc summary::-webkit-details-marker { display:none; }
    .acc-title { flex:1; line-height:1.4; }
    .acc-chevron { position:relative; flex-shrink:0; width:30px; height:30px; border-radius:50%; background:var(--accent-soft); }
    .acc-chevron::before, .acc-chevron::after { content:''; position:absolute; top:50%; left:50%; background:var(--accent); border-radius:2px; transition:transform 220ms ease; }
    .acc-chevron::before { width:12px; height:2px; transform:translate(-50%,-50%); }
    .acc-chevron::after { width:2px; height:12px; transform:translate(-50%,-50%); }
    .acc[open] .acc-chevron::after { transform:translate(-50%,-50%) scaleY(0); }
    .acc-body { padding:0 18px 18px; }
    .acc-body > *:first-child { margin-top:0; }
    .acc-body > *:last-child { margin-bottom:0; }
    .acc-body h2 { display:none; } /* por si algún recurso viejo mezcla h2 dentro de un acordeón */
  </style>
</head>
<body>
  <div id="content">__CONTENT__</div>
  <script>
    function postHeight() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type:'resize', height: document.documentElement.scrollHeight }));
    }
    window.onload = postHeight;
    // BUG (todos los recursos con acordeón, reportado 2026-09-18): la altura
    // solo se medía una vez en window.onload -- al abrir un <details> (.acc)
    // el documento crece pero nadie volvía a avisar a React Native, así que
    // el WebView se quedaba con la altura del estado colapsado y el
    // contenido expandido se veía cortado. 'toggle' no burbujea, por eso se
    // escucha en fase de captura sobre document (delega a cualquier <details>
    // sin tener que engancharse uno a uno); requestAnimationFrame deja que el
    // layout se asiente tras el cambio de 'open' antes de medir scrollHeight.
    document.addEventListener('toggle', function() {
      requestAnimationFrame(postHeight);
    }, true);
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
  function __postHeight() {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type:'resize', height: document.documentElement.scrollHeight }));
  }
  window.onload = __postHeight;
  // Mismo fix que buildWrapperHtml() -- ver su comentario -- para un
  // documento HTML completo subido tal cual que también use <details>.
  document.addEventListener('toggle', function() {
    requestAnimationFrame(__postHeight);
  }, true);
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
  const { colors: C, mode } = useAppColorMode();
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
                    : buildWrapperHtml(mode).replace('__CONTENT__', renderYouTubeEmbeds(sanitized));
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
