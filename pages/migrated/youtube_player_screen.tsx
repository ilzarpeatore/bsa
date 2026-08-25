import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { useAppColorMode } from '@helper/useAppColorMode';

function extractYoutubeVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

interface YoutubePlayerScreenProps {
  route?: {
    params?: {
      url?: string;
      img?: string;
      autoPlay?: boolean;
      hideControl?: boolean;
    };
  };
  navigation?: any;
}

export default function YoutubePlayerScreen(props: YoutubePlayerScreenProps) {
  const { colors: C } = useAppColorMode();
  const { url, img, autoPlay = false, hideControl = false } = props.route?.params || {};

  const [videoId, setVideoId] = useState<string>('');
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleOption, setVisibleOption] = useState(true);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (url) {
      const id = extractYoutubeVideoId(url);
      if (id) {
        setVideoId(id);
      }
    }

    return () => {
      // Cleanup - pause video if needed
    };
  }, [url]);

  const getEmbedUrl = () => {
    const params = [
      `enablejsapi=1`,
      `autoplay=${autoPlay ? 1 : 0}`,
      `controls=${hideControl ? 0 : 1}`,
      `rel=0`,
      `modestbranding=1`,
    ].join('&');
    return `https://www.youtube.com/embed/${videoId}?${params}`;
  };

  const onMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.event === 'onReady') {
        setIsPlayerReady(true);
      }
      if (data.info) {
        setIsPlaying(data.info.playerState === 1);
      }
    } catch (e) {
      // Handle non-JSON messages
    }
  }, []);

  const postMessage = (func: string, args?: any[]) => {
    const message = JSON.stringify({ func, args: args || [] });
    webViewRef.current?.postMessage(message);
  };

  const playVideo = () => {
    postMessage('playVideo');
    setIsPlaying(true);
  };

  const pauseVideo = () => {
    postMessage('pauseVideo');
    setIsPlaying(false);
  };

  const seekTo = (seconds: number) => {
    postMessage('seekTo', [seconds, true]);
  };

  const goBackward10 = () => {
    postMessage('getCurrentTime');
  };

  const goForward10 = () => {
    postMessage('getCurrentTime');
  };

  const exitScreen = () => {
    props.navigation?.goBack();
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  };

  const youtubeHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; background: #000; }
        iframe { width: 100%; height: 100%; border: none; }
      </style>
    </head>
    <body>
      <div id="player"></div>
      <script>
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        var player;
        function onYouTubeIframeAPIReady() {
          player = new YT.Player('player', {
            height: '100%',
            width: '100%',
            videoId: '${videoId}',
            playerVars: {
              'autoplay': ${autoPlay ? 1 : 0},
              'controls': ${hideControl ? 0 : 1},
              'rel': 0,
              'modestbranding': 1
            },
            events: {
              'onReady': function(event) {
                window.postMessage(JSON.stringify({event: 'onReady'}));
              },
              'onStateChange': function(event) {
                window.postMessage(JSON.stringify({
                  event: 'onStateChange',
                  info: { playerState: event.data, currentTime: event.target.getCurrentTime() }
                }));
              }
            }
          });
        }

        window.addEventListener('message', function(event) {
          try {
            var data = JSON.parse(event.data);
            if (data.func && player) {
              if (data.func === 'playVideo') player.playVideo();
              if (data.func === 'pauseVideo') player.pauseVideo();
              if (data.func === 'seekTo' && data.args) player.seekTo(data.args[0], data.args[1]);
              if (data.func === 'getCurrentTime' && player.getCurrentTime) {
                window.postMessage(JSON.stringify({
                  event: 'currentTime',
                  currentTime: player.getCurrentTime()
                }));
              }
            }
          } catch(e) {}
        });
      </script>
    </body>
    </html>
  `;

  if (!videoId) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#000' }}>
        <Box className="flex-1 items-center justify-center">
          <Text style={{ color: '#FFFFFF', fontSize: 16, marginBottom: 20 }}>Invalid YouTube URL</Text>
          <Pressable
            className="rounded-sm"
            style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingVertical: 10 }}
            onPress={exitScreen}
          >
            <Text weight="semibold" size="sm" style={{ color: C.white }}>Close</Text>
          </Pressable>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#000' }}>
      <Box className="flex-1" style={{ position: 'relative' }}>
        {/* Close and PiP buttons */}
        {visibleOption && (
          <Box
            className="flex-row justify-between"
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 50 : 30,
              left: 8,
              right: 8,
              zIndex: 10,
            }}
          >
            <Pressable
              className="items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}
              onPress={exitScreen}
            >
              <Icon name="close" size={25} color={'#FFFFFF'} />
            </Pressable>
            {Platform.OS === 'android' && (
              <Pressable
                className="items-center justify-center"
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}
                onPress={() => {
                  setVisibleOption(false);
                  // SimplePip.enterPipMode() equivalent
                }}
              >
                <Icon name="copy-outline" size={25} color={'#FFFFFF'} />
              </Pressable>
            )}
          </Box>
        )}

        {/* WebView YouTube Player */}
        <WebView
          ref={webViewRef}
          source={{ html: youtubeHtml }}
          style={{ flex: 1, backgroundColor: '#000' }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          onMessage={onMessage}
          allowsFullscreenVideo={true}
        />

        {/* Custom Controls Overlay */}
        <Box
          className="flex-row items-center justify-around"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="box-none"
        >
          {/* Rewind 10s */}
          {!isPlaying && isPlayerReady && (
            <Pressable
              className="items-center justify-center"
              style={{ width: 50, height: 50 }}
              onPress={goBackward10}
            >
              <Icon name="play-back" size={30} color={'#FFFFFF'} />
            </Pressable>
          )}

          {/* Play/Pause Center Touch Area */}
          <Pressable style={{ width: 60, height: 60 }} onPress={togglePlayPause} />

          {/* Forward 10s */}
          {!isPlaying && isPlayerReady && (
            <Pressable
              className="items-center justify-center"
              style={{ width: 50, height: 50 }}
              onPress={goForward10}
            >
              <Icon name="play-forward" size={30} color={'#FFFFFF'} />
            </Pressable>
          )}
        </Box>
      </Box>
    </SafeAreaView>
  );
}
