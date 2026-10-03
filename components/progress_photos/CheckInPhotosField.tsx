import React, { useState } from 'react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Button, ButtonText } from '@components/ui/button';
import { useAppColorMode } from '@helper/useAppColorMode';
import logger from '@helper/logger';
import { POSES, POSE_LABEL, progressPhotosApi, type ProgressPhoto } from '../../api/progressPhotos';
import PoseCamera, { type CapturedPose } from './PoseCamera';
import PhotoGuideSheet from './PhotoGuideSheet';

// Pregunta «Fotos de progreso» de un check-in. Usa la misma cámara guiada que
// la pantalla de Fotos de progreso; al enviar, el backend las guarda también
// en la galería de progreso del cliente (FormController::submit).
interface Props {
  value: CapturedPose[];
  maxFiles: number;
  onChange: (v: CapturedPose[]) => void;
}

export default function CheckInPhotosField({ value, maxFiles, onChange }: Props) {
  const { colors: C } = useAppColorMode();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [previous, setPrevious] = useState<ProgressPhoto[]>([]);
  const limit = Math.max(1, maxFiles || POSES.length);

  const openCamera = async () => {
    // Las fotos anteriores solo hacen falta para la transparencia; si fallan,
    // la cámara funciona igual sin ellas.
    try {
      const res = await progressPhotosApi.list();
      setPrevious(res.data?.data ?? []);
    } catch (e) {
      logger.warn('Check-in photos: previous photos unavailable', e);
    }
    setCameraOpen(true);
  };

  const pickFromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: limit,
      quality: 0.7,
    });
    if (res.canceled || !res.assets?.length) return;
    onChange(
      res.assets.slice(0, limit).map((a, i) => ({
        pose: POSES[i]?.key ?? 'other',
        file: { uri: a.uri, name: a.fileName ?? undefined, type: a.mimeType ?? undefined },
      })),
    );
  };

  return (
    <Box>
      {value.length ? (
        <Box className="flex-row flex-wrap" style={{ gap: 6, marginBottom: 10 }}>
          {value.map((shot, i) => (
            <Box key={`${shot.file.uri}-${i}`} style={{ width: '31%' }}>
              <Image
                source={{ uri: shot.file.uri }}
                style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 10 }}
                contentFit="cover"
              />
              <Pressable
                onPress={() => onChange(value.filter((_, j) => j !== i))}
                hitSlop={8}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  borderRadius: 12,
                  padding: 2,
                }}>
                <Icon name="close" size={16} color="#fff" />
              </Pressable>
              <Text size="xs" muted style={{ textAlign: 'center', marginTop: 3 }}>
                {POSE_LABEL[shot.pose]}
              </Text>
            </Box>
          ))}
        </Box>
      ) : null}

      <Box className="flex-row" style={{ gap: 8 }}>
        <Button radius="pill" className="flex-1" onPress={openCamera}>
          <Icon name="camera-outline" size={16} className="text-primary-foreground" />
          <ButtonText>{value.length ? 'Repetir fotos' : 'Hacer fotos'}</ButtonText>
        </Button>
        <Button radius="pill" variant="outline" className="flex-1" onPress={pickFromLibrary}>
          <ButtonText>Galería</ButtonText>
        </Button>
      </Box>
      <Pressable
        onPress={() => setGuideOpen(true)}
        className="flex-row items-center self-start"
        style={{ gap: 5, marginTop: 10 }}>
        <Icon name="information-circle-outline" size={16} color={C.orange} />
        <Text size="xs" weight="bold" style={{ color: C.orange }}>
          Cómo hacer las fotos
        </Text>
      </Pressable>

      <PoseCamera
        visible={cameraOpen}
        previous={previous}
        onClose={() => setCameraOpen(false)}
        onDone={(shots) => {
          setCameraOpen(false);
          onChange(shots.slice(0, limit));
        }}
      />
      <PhotoGuideSheet visible={guideOpen} onClose={() => setGuideOpen(false)} />
    </Box>
  );
}
