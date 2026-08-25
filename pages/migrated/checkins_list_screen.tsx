import React, { useState, useCallback, useMemo } from 'react';
import { ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { VStack } from '@components/ui/vstack';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';
import { checkinsApi, checkinTypeLabel, CheckInAssignment } from '../../api/checkins';
import { readinessApi } from '../../api/readiness';
import logger from '@helper/logger';

interface Props {
  navigation?: any;
}

// "Próximo en X días" calculado a partir de datos reales ya disponibles
// (recurrence/submitted_at/scheduled_date/is_due) -- el backend
// (api/checkins.ts) solo modela recurrence: 'daily'|'weekly'|'monthly'|null,
// no existe un tipo "cada 15 días" como concepto propio. Si is_due ya es
// true no hace falta calcular nada (ya está en "Pendientes"). "monthly" usa
// 30 días como aproximación porque el backend no expone el día exacto del
// mes en el que vence.
function computeNextDueLabel(a: CheckInAssignment): string | null {
  if (a.is_due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (a.scheduled_date) {
    const scheduled = new Date(`${a.scheduled_date}T00:00:00`);
    const diffDays = Math.round((scheduled.getTime() - today.getTime()) / 86400000);
    if (diffDays > 0) return diffDays === 1 ? 'Próximo: mañana' : `Próximo: en ${diffDays} días`;
    return null;
  }

  const recurrence = a.form.recurrence;
  if (!recurrence || !a.submitted_at) return null;

  const base = new Date(a.submitted_at);
  base.setHours(0, 0, 0, 0);
  const intervalDays = recurrence === 'daily' ? 1 : recurrence === 'weekly' ? 7 : 30;
  const next = new Date(base);
  next.setDate(next.getDate() + intervalDays);
  const diffDays = Math.round((next.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 0) return null;
  return diffDays === 1 ? 'Próximo: mañana' : `Próximo: en ${diffDays} días`;
}

export default function CheckInsListScreen(props: Props) {
  const { navigation } = props;
  const { colors: C } = useAppColorMode();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [items, setItems] = useState<CheckInAssignment[]>([]);
  // Readiness diario pre-entrenamiento (api/readiness.ts) -- un sistema
  // totalmente aparte de checkinsApi/CheckInForm (se rellena dentro de
  // workout_preview_screen.tsx antes de empezar un entrenamiento, tabla
  // backend daily_readiness_checks). No aparecía en esta lista aunque es,
  // de hecho, el check-in diario real de la app.
  const [readiness, setReadiness] = useState<{ required: boolean; submittedToday: boolean } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const res = await checkinsApi.getAssignedList();
      setItems(res.data?.data ?? []);
    } catch (e) {
      setError(true);
    } finally {
      setIsLoading(false);
    }
    readinessApi
      .getToday()
      .then((res) => {
        const d = res.data?.data;
        setReadiness(d ? { required: d.required, submittedToday: d.submitted_today } : null);
      })
      .catch((e) => {
        logger.error('Readiness today fetch error:', e);
        setReadiness(null);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pending = useMemo(() => items.filter((a) => a.is_due), [items]);
  const completed = useMemo(() => items.filter((a) => !a.is_due), [items]);
  const showReadiness = !!readiness?.required;
  const readinessPending = showReadiness && !readiness!.submittedToday;

  const openForm = (a: CheckInAssignment) => {
    navigation?.navigate('MigratedCheckInFill', { formAssignmentId: a.id, formId: a.form_id, title: a.form.title });
  };

  const renderCard = (a: CheckInAssignment) => {
    const nextDueLabel = computeNextDueLabel(a);
    return (
      <Pressable
        key={a.id}
        className="flex-row items-center gap-3 bg-card rounded-md"
        style={{ padding: 14, marginBottom: 10 }}
        onPress={() => openForm(a)}
      >
        <Box
          className="w-11 h-11 rounded-md items-center justify-center"
          style={{ backgroundColor: a.is_due ? C.warning10 : C.success10 }}
        >
          <Icon
            name={a.is_due ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={20}
            color={a.is_due ? C.warning60 : C.success60}
          />
        </Box>
        <Box className="flex-1">
          <Text weight="bold" size="sm" numberOfLines={2}>{a.form.title}</Text>
          <Text size="xs" muted style={{ marginTop: 3 }}>{checkinTypeLabel(a)}</Text>
          {a.submitted_at && (
            <Text size="xs" muted className="text-[11px]" style={{ marginTop: 2 }}>
              Última vez: {new Date(a.submitted_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </Text>
          )}
          {nextDueLabel && (
            <Text size="xs" weight="semibold" style={{ marginTop: 2, color: C.textSecondary }}>
              {nextDueLabel}
            </Text>
          )}
        </Box>
        <Icon name="chevron-forward" size={18} className="text-muted-foreground" />
      </Pressable>
    );
  };

  const renderReadinessCard = () => (
    <Pressable
      key="readiness"
      className="flex-row items-center gap-3 bg-card rounded-md"
      style={{ padding: 14, marginBottom: 10 }}
      onPress={() => navigation?.navigate('MigratedMyProgramCalendar')}
    >
      <Box
        className="w-11 h-11 rounded-md items-center justify-center"
        style={{ backgroundColor: readinessPending ? C.warning10 : C.success10 }}
      >
        <Icon
          name="pulse-outline"
          size={20}
          color={readinessPending ? C.warning60 : C.success60}
        />
      </Box>
      <Box className="flex-1">
        <Text weight="bold" size="sm" numberOfLines={2}>Chequeo de preparación</Text>
        <Text size="xs" muted style={{ marginTop: 3 }}>Check-in diario · antes de entrenar</Text>
        <Text size="xs" muted className="text-[11px]" style={{ marginTop: 2 }}>
          {readinessPending ? 'Se rellena al abrir tu próximo entrenamiento.' : 'Ya lo completaste hoy · próximo: mañana'}
        </Text>
      </Box>
      <Icon name="chevron-forward" size={18} className="text-muted-foreground" />
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <Box className="flex-1 bg-background">
        <ScreenHeader title="Check-ins y formularios" onBack={() => navigation?.goBack()} />

        {isLoading ? (
          <Box className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={C.textPrimary} />
          </Box>
        ) : error ? (
          <Box className="flex-1 items-center justify-center px-8" style={{ paddingTop: 60 }}>
            <Text size="sm" muted className="text-center">No se pudieron cargar tus check-ins.</Text>
          </Box>
        ) : items.length === 0 && !showReadiness ? (
          <Box className="flex-1 items-center justify-center px-8" style={{ paddingTop: 60 }}>
            <Icon name="clipboard-outline" size={40} className="text-muted-foreground" />
            <Text size="sm" muted className="text-center" style={{ marginTop: 12 }}>
              Tu coach no te ha asignado ningún check-in o formulario todavía.
            </Text>
          </Box>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <VStack space="sm">
              {(pending.length > 0 || readinessPending) && (
                <Box>
                  <Text
                    size="xs"
                    weight="bold"
                    muted
                    className="uppercase"
                    style={{ letterSpacing: 0.4, marginTop: 4, marginBottom: 10 }}
                  >
                    Pendientes
                  </Text>
                  {readinessPending && renderReadinessCard()}
                  {pending.map(renderCard)}
                </Box>
              )}
              {(completed.length > 0 || (showReadiness && !readinessPending)) && (
                <Box>
                  <Text
                    size="xs"
                    weight="bold"
                    muted
                    className="uppercase"
                    style={{ letterSpacing: 0.4, marginTop: 4, marginBottom: 10 }}
                  >
                    Al día
                  </Text>
                  {showReadiness && !readinessPending && renderReadinessCard()}
                  {completed.map(renderCard)}
                </Box>
              )}
            </VStack>
          </ScrollView>
        )}
      </Box>
    </SafeAreaView>
  );
}
