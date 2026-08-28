import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Spinner } from '@components/ui/spinner';
import { useAppColorMode } from '@helper/useAppColorMode';
// @ts-ignore - expo-av removed; fallback to View
const Video = (props: any) => <Box style={props.style} className="bg-black" />;
const ResizeMode = { CONTAIN: 'contain' };

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ASPECT_RATIO = 12 / 7;

export default function ChewieScreen({ route }: any) {
  const { colors: C } = useAppColorMode();
  const url = route?.params?.url;
  const image = route?.params?.image;
  const autoPlay = route?.params?.autoPlay ?? false;

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isPlayingRef = useRef(autoPlay);
  const videoRef = useRef<any>(null);

  const initializePlayer = useCallback(async () => {
    if (url) {
      setIsLoading(false);
      setIsInitialized(true);
    } else {
      setIsLoading(false);
    }
  }, [url]);

  // videoRef.current se lee al desmontar a proposito, no se captura antes:
  // en el momento en que este efecto se monta, isInitialized todavia es
  // false y el <Video> ni existe (videoRef.current seria null) -- solo
  // llega a apuntar al nodo real despues de que initializePlayer confirme
  // la URL. Capturarlo antes descargaria "null" en vez del video real.
  // react-doctor-disable-next-line exhaustive-deps
  useEffect(() => {
    initializePlayer();
    return () => {
      videoRef.current?.unloadAsync();
    };
  }, [initializePlayer]);

  const handlePlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      isPlayingRef.current = status.isPlaying;
    }
  };

  const handleVisibility = (visible: boolean) => {
    if (!videoRef.current) return;
    if (visible) {
      if (!isPlayingRef.current) {
        videoRef.current.playAsync();
      }
    } else {
      if (isPlayingRef.current) {
        videoRef.current.pauseAsync();
      }
    }
  };

  if (isInitialized && url) {
    return (
      <Box style={{ width: SCREEN_WIDTH, aspectRatio: ASPECT_RATIO, overflow: 'hidden', backgroundColor: C.bg }}>
        <Video
          ref={videoRef}
          source={{ uri: url }}
          style={{ width: '100%', height: '100%' }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={autoPlay}
          isLooping
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          useNativeControls
        />
      </Box>
    );
  }

  return (
    <Box style={{ width: SCREEN_WIDTH, aspectRatio: ASPECT_RATIO, overflow: 'hidden', backgroundColor: C.bg }}>
      {isLoading ? (
        <Box className="flex-1 items-center justify-center">
          <Spinner size="large" />
        </Box>
      ) : image ? (
        <Image
          source={{ uri: image }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
      ) : (
        <Box className="flex-1 items-center justify-center">
          <Text size="sm" muted>No media available</Text>
        </Box>
      )}
    </Box>
  );
}
