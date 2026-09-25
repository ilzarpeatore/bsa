import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { HStack } from '@components/ui/hstack';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import ScreenHeader from '@components/ScreenHeader';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { useAppColorMode } from '@helper/useAppColorMode';
import logger from '@helper/logger';
import { readinessApi, ReadinessHistoryItem } from '../../api/readiness';
import { checkinsApi, CheckInSubmissionDetail, CheckInSubmissionItem } from '../../api/checkins';
import { FONT, RADIUS } from './theme';

// Historial propio de Check-ins (2026-09-26, nota de la revision de pantallas): fechas en las
// que rellenaste el readiness diario y cada check-in/formulario periodico, con el detalle de
// tus respuestas de solo lectura al abrir uno. Solo datos propios (el backend nunca acepta
// un client_id).
type Tab = 'readiness' | 'checkins';

function formatDay(iso: string | null): string {
  if (!iso) return '-';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAnswer(value: string | string[] | null): string {
  if (value === null || value === undefined || value === '') return 'Sin respuesta';
  if (Array.isArray(value)) return value.join(', ');
  const trimmed = value.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.join(', ');
    } catch {
      // no era JSON: se enseña tal cual
    }
  }
  return value;
}

export default function CheckInHistoryScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const [tab, setTab] = useState<Tab>('readiness');
  const [readiness, setReadiness] = useState<ReadinessHistoryItem[] | null>(null);
  const [submissions, setSubmissions] = useState<CheckInSubmissionItem[] | null>(null);
  const [error, setError] = useState<Record<Tab, boolean>>({ readiness: false, checkins: false });
  const [openId, setOpenId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, CheckInSubmissionDetail | 'error'>>({});

  const load = useCallback(() => {
    setError({ readiness: false, checkins: false });
    setReadiness(null);
    setSubmissions(null);
    readinessApi
      .getHistory()
      .then((res) => setReadiness(res.data?.data ?? []))
      .catch((e) => {
        logger.error('Readiness history fetch error:', e);
        setError((prev) => ({ ...prev, readiness: true }));
        setReadiness([]);
      });
    checkinsApi
      .getMySubmissions()
      .then((res) => setSubmissions(res.data?.data ?? []))
      .catch((e) => {
        logger.error('Check-in submissions fetch error:', e);
        setError((prev) => ({ ...prev, checkins: true }));
        setSubmissions([]);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSubmission = (id: number) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (details[id]) return;
    checkinsApi
      .getSubmissionDetail(id)
      .then((res) => setDetails((prev) => ({ ...prev, [id]: res.data.data })))
      .catch((e) => {
        logger.error('Check-in submission detail fetch error:', e);
        setDetails((prev) => ({ ...prev, [id]: 'error' }));
      });
  };

  const list = tab === 'readiness' ? readiness : submissions;

  const renderReadiness = (r: ReadinessHistoryItem) => (
    <Box key={r.id} style={styles.card}>
      <Text style={styles.cardTitle}>{formatDay(r.date)}</Text>
      <HStack style={{ flexWrap: 'wrap', marginTop: 8, gap: 8 }}>
        {[
          ['Sueño', r.sleep_quality, '/5'],
          ['Agujetas', r.soreness_level, '/10'],
          ['Energía', r.energy_level, '/5'],
          ['Estrés', r.stress_level, '/5'],
        ].map(([label, value, max]) => (
          <Box key={String(label)} style={styles.chip}>
            <Text style={styles.chipLabel}>{label}</Text>
            <Text style={styles.chipValue}>
              {value ?? '-'}
              {value !== null && value !== undefined ? max : ''}
            </Text>
          </Box>
        ))}
      </HStack>
    </Box>
  );

  const renderSubmission = (s: CheckInSubmissionItem) => {
    const isOpen = openId === s.id;
    const detail = details[s.id];
    return (
      <Box key={s.id} style={styles.card}>
        <Pressable onPress={() => toggleSubmission(s.id)} accessibilityRole="button">
          <HStack className="items-center justify-between">
            <Box style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.cardTitle}>{s.form_title ?? 'Check-in'}</Text>
              <Text style={styles.subtitle}>
                {formatDay(s.submitted_at)} · {s.answers_count} {s.answers_count === 1 ? 'respuesta' : 'respuestas'}
              </Text>
            </Box>
            <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={C.textSecondary} />
          </HStack>
        </Pressable>
        {isOpen && (
          <Box style={{ marginTop: 12 }}>
            {!detail ? (
              <ActivityIndicator size="small" color={C.orange} />
            ) : detail === 'error' ? (
              <Text style={styles.subtitle}>No se pudo cargar el detalle. Cierra y vuelve a abrir para reintentar.</Text>
            ) : (
              <>
                {detail.answers.map((a, i) => (
                  <Box key={`${s.id}-${i}`} style={{ marginBottom: 10 }}>
                    <Text style={styles.question}>{a.question ?? 'Pregunta'}</Text>
                    <Text style={styles.answer}>{formatAnswer(a.answer)}</Text>
                  </Box>
                ))}
                {detail.coach_feedback ? (
                  <Box style={styles.feedback}>
                    <Text style={styles.question}>Comentario de tu entrenador</Text>
                    <Text style={styles.answer}>{detail.coach_feedback}</Text>
                  </Box>
                ) : null}
              </>
            )}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Historial" onBack={() => props.navigation?.goBack()} />
      <HStack style={styles.tabs}>
        {(
          [
            ['readiness', 'Readiness'],
            ['checkins', 'Check-ins'],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && { backgroundColor: C.accentBlack }]}
            accessibilityRole="button"
          >
            <Text style={[styles.tabText, { color: tab === key ? C.accentBlackForeground : C.textSecondary }]}>{label}</Text>
          </Pressable>
        ))}
      </HStack>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 + WORKOUT_MINIBAR_CLEARANCE }}>
        {list === null ? (
          <ActivityIndicator size="small" color={C.orange} style={{ marginVertical: 24 }} />
        ) : error[tab] ? (
          <Box style={styles.empty}>
            <Text style={styles.subtitle}>No se pudo cargar el historial.</Text>
            <Pressable onPress={load} style={{ marginTop: 12 }} accessibilityRole="button">
              <Text style={[styles.cardTitle, { color: C.orange }]}>Reintentar</Text>
            </Pressable>
          </Box>
        ) : list.length === 0 ? (
          <Box style={styles.empty}>
            <Icon name="clipboard-outline" size={48} color={C.textSecondary} />
            <Text style={[styles.subtitle, { marginTop: 12 }]}>
              {tab === 'readiness' ? 'Aún no has rellenado ningún readiness.' : 'Aún no has enviado ningún check-in.'}
            </Text>
          </Box>
        ) : tab === 'readiness' ? (
          (readiness ?? []).map(renderReadiness)
        ) : (
          (submissions ?? []).map(renderSubmission)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    tabs: { marginHorizontal: 20, marginTop: 12, marginBottom: 12, gap: 8 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.pill, backgroundColor: C.surfaceLight },
    tabText: { fontSize: 13, fontFamily: FONT.bold },
    card: { backgroundColor: C.surface, borderRadius: RADIUS.md, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 15, fontFamily: FONT.bold, color: C.textPrimary },
    subtitle: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    chip: { backgroundColor: C.surfaceLight, borderRadius: RADIUS.sm, paddingVertical: 6, paddingHorizontal: 10 },
    chipLabel: { fontSize: 11, color: C.textSecondary },
    chipValue: { fontSize: 14, fontFamily: FONT.bold, color: C.textPrimary },
    question: { fontSize: 12, color: C.textSecondary },
    answer: { fontSize: 14, color: C.textPrimary, marginTop: 2 },
    feedback: { backgroundColor: C.surfaceLight, borderRadius: RADIUS.sm, padding: 12, marginTop: 4 },
    empty: { alignItems: 'center', paddingVertical: 48 },
  });
}
