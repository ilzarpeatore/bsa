import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Button, ButtonText } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import ScreenHeader from '@components/ScreenHeader';
import ConfirmDialog from '@components/ConfirmDialog';
import SimpleBottomSheet from '@components/SimpleBottomSheet';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import PhotoGuideSheet from '@components/progress_photos/PhotoGuideSheet';
import PoseCamera, { type CapturedPose } from '@components/progress_photos/PoseCamera';
import BeforeAfterSlider from '@components/progress_photos/BeforeAfterSlider';
import { useAppColorMode } from '@helper/useAppColorMode';
import { showToast } from '@helper/toast';
import logger from '@helper/logger';
import { SHADOW } from './theme';
import {
  progressPhotosApi,
  POSES,
  POSE_LABEL,
  type ProgressPhoto,
  type ProgressPhotoPose,
} from '../../api/progressPhotos';
import { bodyMetricsApi, type BodyMetricChartData } from '../../api/bodyMetrics';
import {
  groupByDate,
  datesWithPose,
  defaultComparison,
  photoFor,
  metricChanges,
  daysBetween,
  formatPhotoDate,
  dateFromExif,
  todayISO,
} from '@helper/progressPhotos';

// Fotos de progreso con antes/después (2026-10-03, ROADMAP). Se entra desde
// Informe (progress_screen.tsx). Dos vistas: Comparar (deslizador o lado a
// lado, con el cambio de peso/cintura entre las dos fechas) y Galería (todas
// las sesiones por fecha). El icono ⓘ abre la guía para hacer las fotos
// siempre en las mismas condiciones.
type Tab = 'compare' | 'gallery';
type CompareMode = 'slider' | 'side';

export default function ProgressPhotosScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [metrics, setMetrics] = useState<BodyMetricChartData>({});
  const [tab, setTab] = useState<Tab>('compare');
  const [pose, setPose] = useState<Exclude<ProgressPhotoPose, 'other'>>('front');
  const [mode, setMode] = useState<CompareMode>('slider');
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ProgressPhoto | null>(null);
  const [toDelete, setToDelete] = useState<ProgressPhoto | null>(null);
  const [picked, setPicked] = useState<{ uri: string; date: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [photosRes, metricsRes] = await Promise.allSettled([
        progressPhotosApi.list(),
        bodyMetricsApi.getChart(['weight', 'waist', 'body_fat'], 3650),
      ]);
      if (photosRes.status === 'fulfilled') setPhotos(photosRes.value.data?.data ?? []);
      else
        showToast('Error', { description: 'No se pudieron cargar tus fotos.', variant: 'error' });
      if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value.data?.data ?? {});
    } catch (e) {
      logger.error('Progress photos load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Al cambiar de pose o al llegar fotos nuevas: primera vs última foto.
  useEffect(() => {
    const def = defaultComparison(photos, pose);
    setBefore(def?.before ?? null);
    setAfter(def?.after ?? null);
  }, [photos, pose]);

  const sessions = useMemo(() => groupByDate(photos), [photos]);
  const poseDates = useMemo(() => datesWithPose(photos, pose), [photos, pose]);
  const beforePhoto = before ? photoFor(photos, pose, before) : null;
  const afterPhoto = after ? photoFor(photos, pose, after) : null;
  const changes = before && after ? metricChanges(metrics, before, after) : [];

  const uploadShots = async (
    shots: { pose: ProgressPhotoPose; file: { uri: string } }[],
    date?: string,
  ) => {
    let ok = 0;
    for (let i = 0; i < shots.length; i++) {
      setUploading(`Guardando foto ${i + 1} de ${shots.length}…`);
      try {
        await progressPhotosApi.upload(shots[i].file, shots[i].pose, date ?? todayISO());
        ok++;
      } catch (e) {
        logger.error('Progress photo upload failed:', e);
      }
    }
    setUploading(null);
    if (ok < shots.length) {
      showToast('Error', {
        description: `No se pudieron guardar ${shots.length - ok} foto(s). Inténtalo de nuevo.`,
        variant: 'error',
      });
    } else if (ok) {
      showToast('Fotos guardadas', { variant: 'success' });
    }
    await load();
  };

  const onCameraDone = (shots: CapturedPose[]) => {
    setCameraOpen(false);
    if (shots.length) uploadShots(shots);
  };

  const pickFromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      exif: true,
    });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    setPicked({ uri: asset.uri, date: dateFromExif(asset.exif) ?? todayISO() });
  };

  const confirmDelete = async () => {
    const photo = toDelete;
    setToDelete(null);
    setViewer(null);
    if (!photo) return;
    try {
      await progressPhotosApi.remove(photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (e) {
      logger.error('Progress photo delete failed:', e);
      showToast('Error', { description: 'No se pudo eliminar la foto.', variant: 'error' });
    }
  };

  const chip = (label: string, active: boolean, onPress: () => void, key?: string) => (
    <Pressable
      key={key ?? label}
      onPress={onPress}
      className="rounded-full"
      style={{
        paddingHorizontal: 14,
        paddingVertical: 7,
        backgroundColor: active ? C.orange : C.gray5,
      }}>
      <Text size="sm" weight="bold" style={{ color: active ? '#fff' : C.gray40 }}>
        {label}
      </Text>
    </Pressable>
  );

  const renderEmpty = () => (
    <Box className="items-center" style={{ paddingTop: 40, paddingHorizontal: 12, gap: 12 }}>
      <Box
        className="items-center justify-center rounded-full"
        style={{ width: 84, height: 84, backgroundColor: C.gray5 }}>
        <Icon name="images-outline" size={40} color={C.orange} />
      </Box>
      <Text weight="bold" size="lg" style={{ textAlign: 'center' }}>
        Tus fotos de progreso
      </Text>
      <Text size="sm" muted style={{ textAlign: 'center', lineHeight: 20 }}>
        Hazte 3 fotos (frente, perfil y espalda) cada 2-4 semanas y compara tu antes y después. Solo
        las ves tú y tu coach.
      </Text>
      <Pressable
        onPress={() => setGuideOpen(true)}
        className="flex-row items-center"
        style={{ gap: 6, marginTop: 4 }}>
        <Icon name="information-circle-outline" size={18} color={C.orange} />
        <Text size="sm" weight="bold" style={{ color: C.orange }}>
          Cómo hacer las fotos
        </Text>
      </Pressable>
    </Box>
  );

  const renderCompare = () => {
    if (poseDates.length < 2) {
      return (
        <Box
          className="items-center rounded-md bg-card"
          style={{ padding: 20, marginTop: 14, gap: 8, ...SHADOW.card }}>
          <Icon name="git-compare-outline" size={28} color={C.gray40} />
          <Text size="sm" muted style={{ textAlign: 'center', lineHeight: 20 }}>
            {poseDates.length === 0
              ? `Aún no tienes fotos de ${POSE_LABEL[pose].toLowerCase()}.`
              : `Tienes una foto de ${POSE_LABEL[pose].toLowerCase()} (${formatPhotoDate(poseDates[0])}). Cuando hagas la siguiente podrás comparar.`}
          </Text>
        </Box>
      );
    }
    return (
      <>
        <Box className="flex-row" style={{ gap: 8, marginTop: 12, marginBottom: 12 }}>
          {chip('Deslizar', mode === 'slider', () => setMode('slider'))}
          {chip('Lado a lado', mode === 'side', () => setMode('side'))}
        </Box>

        {beforePhoto && afterPhoto ? (
          mode === 'slider' ? (
            <BeforeAfterSlider
              beforeUri={beforePhoto.url}
              afterUri={afterPhoto.url}
              beforeLabel={formatPhotoDate(beforePhoto.taken_at)}
              afterLabel={formatPhotoDate(afterPhoto.taken_at)}
            />
          ) : (
            <Box className="flex-row" style={{ gap: 6 }}>
              {[beforePhoto, afterPhoto].map((p) => (
                <Pressable key={p.id} style={{ flex: 1 }} onPress={() => setViewer(p)}>
                  <Image
                    source={{ uri: p.url }}
                    style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 12 }}
                    contentFit="cover"
                  />
                  <Text size="xs" weight="bold" muted style={{ textAlign: 'center', marginTop: 4 }}>
                    {formatPhotoDate(p.taken_at)}
                  </Text>
                </Pressable>
              ))}
            </Box>
          )
        ) : null}

        {before && after ? (
          <Box
            className="rounded-md bg-card"
            style={{ padding: 14, marginTop: 12, ...SHADOW.card }}>
            <Text size="sm" weight="bold">
              {daysBetween(before, after)} días de cambio
            </Text>
            {changes.length ? (
              <Box className="flex-row flex-wrap" style={{ gap: 8, marginTop: 10 }}>
                {changes.map((c) => (
                  <Box
                    key={c.key}
                    className="rounded-sm"
                    style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.gray5 }}>
                    <Text size="xs" muted>
                      {c.label}
                    </Text>
                    <Text size="sm" weight="bold">
                      {c.delta > 0 ? '+' : ''}
                      {c.delta} {c.unit}
                    </Text>
                  </Box>
                ))}
              </Box>
            ) : (
              <Text size="xs" muted style={{ marginTop: 6, lineHeight: 17 }}>
                Registra tu peso y cintura en Antropometría cerca de esas fechas para ver aquí
                cuánto has cambiado.
              </Text>
            )}
          </Box>
        ) : null}

        <Text
          size="xs"
          weight="bold"
          muted
          style={{
            marginTop: 16,
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
          Antes
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}>
          {poseDates.map((d) =>
            chip(formatPhotoDate(d), d === before, () => setBefore(d), `b-${d}`),
          )}
        </ScrollView>
        <Text
          size="xs"
          weight="bold"
          muted
          style={{
            marginTop: 12,
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
          Después
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}>
          {poseDates.map((d) => chip(formatPhotoDate(d), d === after, () => setAfter(d), `a-${d}`))}
        </ScrollView>
      </>
    );
  };

  const renderGallery = () => (
    <Box style={{ marginTop: 14, gap: 18 }}>
      {sessions.map((s) => (
        <Box key={s.date}>
          <Text size="sm" weight="bold" style={{ marginBottom: 8 }}>
            {formatPhotoDate(s.date)}
          </Text>
          <Box className="flex-row flex-wrap" style={{ gap: 6 }}>
            {s.photos.map((p) => (
              <Pressable key={p.id} onPress={() => setViewer(p)} style={{ width: '32%' }}>
                <Image
                  source={{ uri: p.url }}
                  style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 10 }}
                  contentFit="cover"
                />
                <Text size="xs" muted style={{ textAlign: 'center', marginTop: 3 }}>
                  {POSE_LABEL[p.pose]}
                </Text>
              </Pressable>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader
        title="Fotos de progreso"
        onBack={() => props.navigation?.goBack()}
        rightAction={
          <Pressable
            onPress={() => setGuideOpen(true)}
            hitSlop={10}
            accessibilityLabel="Cómo hacer las fotos"
            style={{ width: 40, alignItems: 'flex-end' }}>
            <Icon name="information-circle-outline" size={24} color={C.orange} />
          </Pressable>
        }
      />

      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <Spinner size="large" color={C.orange} />
        </Box>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 140 + WORKOUT_MINIBAR_CLEARANCE,
          }}
          showsVerticalScrollIndicator={false}>
          {photos.length === 0 ? (
            renderEmpty()
          ) : (
            <>
              <Box
                className="flex-row rounded-full"
                style={{ marginTop: 14, padding: 4, backgroundColor: C.gray5 }}>
                {(['compare', 'gallery'] as Tab[]).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setTab(t)}
                    className="flex-1 items-center rounded-full"
                    style={{
                      paddingVertical: 8,
                      backgroundColor: tab === t ? C.surface : 'transparent',
                    }}>
                    <Text
                      size="sm"
                      weight="bold"
                      style={{ color: tab === t ? undefined : C.gray40 }}>
                      {t === 'compare' ? 'Comparar' : 'Galería'}
                    </Text>
                  </Pressable>
                ))}
              </Box>
              {tab === 'compare' ? (
                <>
                  <Box className="flex-row" style={{ gap: 8, marginTop: 14 }}>
                    {POSES.map((p) => chip(p.label, pose === p.key, () => setPose(p.key)))}
                  </Box>
                  {renderCompare()}
                </>
              ) : (
                renderGallery()
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Acciones fijas abajo */}
      {!loading ? (
        <Box
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 16 + WORKOUT_MINIBAR_CLEARANCE,
            gap: 8,
          }}>
          <Button radius="pill" className="py-4" onPress={() => setCameraOpen(true)}>
            <Icon name="camera-outline" size={18} className="text-primary-foreground" />
            <ButtonText>Hacer las fotos de hoy</ButtonText>
          </Button>
          <Pressable
            onPress={pickFromLibrary}
            className="items-center"
            style={{ paddingVertical: 6 }}>
            <Text size="sm" weight="bold" style={{ color: C.orange }}>
              Subir una foto de la galería
            </Text>
          </Pressable>
        </Box>
      ) : null}

      {uploading ? (
        <View style={[StyleSheet.absoluteFill, styles.overlay]}>
          <Spinner size="large" color="#fff" />
          <Text weight="bold" style={{ color: '#fff', marginTop: 12 }}>
            {uploading}
          </Text>
        </View>
      ) : null}

      <PhotoGuideSheet visible={guideOpen} onClose={() => setGuideOpen(false)} />
      <PoseCamera
        visible={cameraOpen}
        previous={photos}
        onClose={() => setCameraOpen(false)}
        onDone={onCameraDone}
      />

      {/* Pose de una foto elegida de la galería */}
      <SimpleBottomSheet visible={!!picked} onClose={() => setPicked(null)}>
        <Text weight="bold" size="lg">
          ¿Qué pose es?
        </Text>
        <Text size="sm" muted style={{ marginTop: 2, marginBottom: 14 }}>
          Se guardará con fecha {picked ? formatPhotoDate(picked.date) : ''}.
        </Text>
        <Box className="flex-row" style={{ gap: 8 }}>
          {POSES.map((p) => (
            <Button
              key={p.key}
              radius="pill"
              className="flex-1"
              onPress={() => {
                const pick = picked;
                setPicked(null);
                if (pick) uploadShots([{ pose: p.key, file: { uri: pick.uri } }], pick.date);
              }}>
              <ButtonText>{p.label}</ButtonText>
            </Button>
          ))}
        </Box>
      </SimpleBottomSheet>

      {/* Visor a pantalla completa */}
      <Modal
        visible={!!viewer}
        animationType="fade"
        transparent
        onRequestClose={() => setViewer(null)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {viewer ? (
            <Image
              source={{ uri: viewer.url }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
            />
          ) : null}
          <SafeAreaView
            edges={['top', 'bottom']}
            style={{ flex: 1, justifyContent: 'space-between' }}>
            <Box className="flex-row items-center justify-between" style={{ padding: 16 }}>
              <Pressable onPress={() => setViewer(null)} hitSlop={10}>
                <Icon name="close" size={26} color="#fff" />
              </Pressable>
              {viewer ? (
                <Text weight="bold" style={{ color: '#fff' }}>
                  {POSE_LABEL[viewer.pose]} · {formatPhotoDate(viewer.taken_at)}
                </Text>
              ) : null}
              <Pressable onPress={() => setToDelete(viewer)} hitSlop={10}>
                <Icon name="trash-outline" size={24} color="#fff" />
              </Pressable>
            </Box>
          </SafeAreaView>
          <ConfirmDialog
            visible={!!toDelete}
            icon="trash-outline"
            title="Eliminar foto"
            message="Se borrará para siempre, también para tu coach."
            confirmText="Eliminar"
            cancelText="Cancelar"
            destructive
            onConfirm={confirmDelete}
            onCancel={() => setToDelete(null)}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
});
