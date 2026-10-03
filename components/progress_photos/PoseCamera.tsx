import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Button, ButtonText } from '@components/ui/button';
import {
  POSES,
  type ProgressPhoto,
  type ProgressPhotoPose,
  type PhotoFile,
} from '../../api/progressPhotos';
import { latestOfPose } from '@helper/progressPhotos';
import { PhotoGuideContent } from './PhotoGuideSheet';
import { useAppColorMode } from '@helper/useAppColorMode';
import logger from '@helper/logger';

// Cámara para las fotos de progreso: hace las 3 poses seguidas (frente,
// perfil, espalda) mostrando encima, en transparencia, la última foto de esa
// misma pose para repetir el encuadre. Temporizador opcional (0/5/10 s) para
// colocarse con el móvil apoyado. Las fotos NO se guardan en el carrete.
const FACING_KEY = '@bestronger_progress_photo_facing';
const TIMERS = [0, 5, 10];
const GHOST_OPACITY = 0.35;

export interface CapturedPose {
  pose: ProgressPhotoPose;
  file: PhotoFile;
}

interface Props {
  visible: boolean;
  previous: ProgressPhoto[];
  onClose: () => void;
  onDone: (shots: CapturedPose[]) => void;
}

export default function PoseCamera({ visible, previous, onClose, onDone }: Props) {
  const { colors: C } = useAppColorMode();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('front');
  const [step, setStep] = useState(0);
  const [shots, setShots] = useState<CapturedPose[]>([]);
  const [timer, setTimer] = useState(5);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [ghost, setGhost] = useState(true);
  const [busy, setBusy] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [preview, setPreview] = useState<PhotoFile | null>(null);

  const pose = POSES[step]?.key ?? 'front';
  const ghostPhoto = latestOfPose(previous, pose);

  useEffect(() => {
    if (!visible) return;
    setStep(0);
    setShots([]);
    setPreview(null);
    setCountdown(null);
    AsyncStorage.getItem(FACING_KEY)
      .then((v) => {
        if (v === 'front' || v === 'back') setFacing(v);
      })
      .catch(() => {});
  }, [visible]);

  const flip = () => {
    const next: CameraType = facing === 'front' ? 'back' : 'front';
    setFacing(next);
    AsyncStorage.setItem(FACING_KEY, next).catch(() => {});
  };

  const takePicture = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.7, skipProcessing: false });
      if (pic?.uri)
        setPreview({
          uri: pic.uri,
          type: 'image/jpeg',
          name: `progreso_${pose}_${Date.now()}.jpg`,
        });
    } catch (e) {
      logger.error('Progress photo capture failed:', e);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      takePicture();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const shutter = () => {
    if (busy || countdown !== null) return;
    if (timer > 0) setCountdown(timer);
    else takePicture();
  };

  const accept = () => {
    if (!preview) return;
    const next = [...shots, { pose, file: preview }];
    setPreview(null);
    if (step + 1 >= POSES.length) {
      onDone(next);
    } else {
      setShots(next);
      setStep(step + 1);
    }
  };

  const skipPose = () => {
    setPreview(null);
    if (step + 1 >= POSES.length) {
      if (shots.length) onDone(shots);
      else onClose();
    } else {
      setStep(step + 1);
    }
  };

  const content = () => {
    if (!permission) return null;
    if (!permission.granted) {
      return (
        <Box className="flex-1 items-center justify-center" style={{ padding: 32, gap: 14 }}>
          <Icon name="camera-outline" size={42} color="#fff" />
          <Text weight="bold" style={{ color: '#fff', textAlign: 'center' }}>
            Necesitamos la cámara para hacer tus fotos de progreso
          </Text>
          <Button
            radius="pill"
            onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}>
            <ButtonText>{permission.canAskAgain ? 'Permitir cámara' : 'Abrir ajustes'}</ButtonText>
          </Button>
          <Pressable onPress={onClose}>
            <Text style={{ color: '#ccc' }}>Cancelar</Text>
          </Pressable>
        </Box>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        {preview ? (
          <Image source={{ uri: preview.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            mirror={facing === 'front'}
          />
        )}
        {!preview && ghost && ghostPhoto ? (
          <Image
            source={{ uri: ghostPhoto.url }}
            style={[StyleSheet.absoluteFill, { opacity: GHOST_OPACITY }]}
            contentFit="cover"
            pointerEvents="none"
          />
        ) : null}

        <SafeAreaView
          style={{ flex: 1, justifyContent: 'space-between' }}
          edges={['top', 'bottom']}>
          {/* Barra superior */}
          <Box
            className="flex-row items-center justify-between"
            style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <Pressable onPress={onClose} hitSlop={10} style={styles.roundBtn}>
              <Icon name="close" size={22} color="#fff" />
            </Pressable>
            <Box className="items-center" style={styles.pill}>
              <Text weight="bold" size="sm" style={{ color: '#fff' }}>
                {POSES[step]?.label} · {step + 1}/{POSES.length}
              </Text>
            </Box>
            <Pressable onPress={() => setGuideOpen(true)} hitSlop={10} style={styles.roundBtn}>
              <Icon name="information-circle-outline" size={22} color="#fff" />
            </Pressable>
          </Box>

          {countdown !== null ? (
            <Text
              weight="bold"
              style={{ color: '#fff', fontSize: 96, lineHeight: 110, textAlign: 'center' }}>
              {countdown}
            </Text>
          ) : !ghostPhoto && !preview ? (
            <Text size="sm" style={{ color: '#fff', textAlign: 'center', paddingHorizontal: 32 }}>
              Primera foto de esta pose. La próxima vez la verás aquí en transparencia para repetir
              el encuadre.
            </Text>
          ) : (
            <View />
          )}

          {/* Controles inferiores */}
          {preview ? (
            <Box className="flex-row justify-center" style={{ gap: 14, paddingBottom: 24 }}>
              <Button
                radius="pill"
                variant="outline"
                onPress={() => setPreview(null)}
                style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                <ButtonText style={{ color: '#fff' }}>Repetir</ButtonText>
              </Button>
              <Button radius="pill" onPress={accept}>
                <ButtonText>{step + 1 >= POSES.length ? 'Terminar' : 'Usar y seguir'}</ButtonText>
              </Button>
            </Box>
          ) : (
            <Box style={{ paddingBottom: 24, gap: 14 }}>
              <Box className="flex-row justify-center" style={{ gap: 8 }}>
                {ghostPhoto ? (
                  <Pressable
                    onPress={() => setGhost((g) => !g)}
                    style={[styles.pill, ghost && styles.pillOn]}>
                    <Text size="xs" weight="bold" style={{ color: '#fff' }}>
                      Foto anterior {ghost ? 'sí' : 'no'}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => setTimer(TIMERS[(TIMERS.indexOf(timer) + 1) % TIMERS.length])}
                  style={[styles.pill, timer > 0 && styles.pillOn]}>
                  <Text size="xs" weight="bold" style={{ color: '#fff' }}>
                    Temporizador {timer > 0 ? `${timer} s` : 'no'}
                  </Text>
                </Pressable>
              </Box>
              <Box
                className="flex-row items-center justify-between"
                style={{ paddingHorizontal: 32 }}>
                <Pressable onPress={skipPose} hitSlop={10} style={{ width: 64 }}>
                  <Text size="sm" style={{ color: '#fff' }}>
                    Saltar
                  </Text>
                </Pressable>
                <Pressable onPress={shutter} disabled={busy} style={styles.shutter}>
                  <View style={styles.shutterInner} />
                </Pressable>
                <Pressable
                  onPress={flip}
                  hitSlop={10}
                  style={[styles.roundBtn, { width: 64, alignItems: 'flex-end' }]}>
                  <Icon name="camera-reverse-outline" size={26} color="#fff" />
                </Pressable>
              </Box>
            </Box>
          )}
        </SafeAreaView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {content()}
        {guideOpen ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
            ]}>
            <SafeAreaView
              edges={['bottom']}
              style={{
                backgroundColor: C.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 20,
              }}>
              <PhotoGuideContent onClose={() => setGuideOpen(false)} maxHeight={420} />
            </SafeAreaView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  roundBtn: { padding: 6 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pillOn: { backgroundColor: 'rgba(73,197,182,0.85)' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
});
