import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, TextInput, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Heading } from '@components/ui/heading';
import { Button } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import { FONT, SHADOW } from './theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import SimpleBottomSheet from '@components/SimpleBottomSheet';
import MetricLineChart from '@components/MetricLineChart';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import {
  bodyMetricsApi,
  BodyMetricTypeDef,
  BodyMetricChartData,
  BodyMetricChartPoint,
} from '../../api/bodyMetrics';
import logger from '@helper/logger';

const CHART_WIDTH = Dimensions.get('window').width - 20 * 2 - 18 * 2;

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BodyMetricsScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const initialType: string | undefined = props.route?.params?.metricType;
  const [types, setTypes] = useState<BodyMetricTypeDef[]>([]);
  const [chartData, setChartData] = useState<BodyMetricChartData>({});
  const [selectedType, setSelectedType] = useState<string | null>(initialType ?? null);
  const [loading, setLoading] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [formValue, setFormValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Se cargan tipos + datos juntos y no se muestra nada hasta tener ambos —
  // mostrar la lista de chips antes de saber qué tipos existen (o el valor
  // "más reciente" antes de saber si hay datos) es justo lo que producía el
  // parpadeo/estado roto reportado al añadir una medida y volver a esta pantalla.
  const load = async () => {
    setLoading(true);
    try {
      const [typesRes, chartRes] = await Promise.all([bodyMetricsApi.getTypes(), bodyMetricsApi.getChart()]);
      const fetchedTypes = typesRes.data?.data || [];
      setTypes(fetchedTypes);
      setChartData(chartRes.data?.data || {});
      setSelectedType((prev) => prev ?? fetchedTypes[0]?.value ?? null);
    } catch (e) {
      logger.error('BodyMetrics load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const meta = types.find((t) => t.value === selectedType) ?? null;
  const entries: BodyMetricChartPoint[] = useMemo(
    () => (selectedType ? chartData[selectedType]?.data ?? [] : []),
    [selectedType, chartData]
  );
  const unit = (selectedType && chartData[selectedType]?.unit) || meta?.unit || '';
  const sortedAsc = useMemo(() => [...entries].sort((a, b) => a.date.localeCompare(b.date)), [entries]);
  const sortedDesc = useMemo(() => [...sortedAsc].reverse(), [sortedAsc]);
  const latest = sortedDesc[0] ?? null;
  const previous = sortedDesc[1] ?? null;
  const delta = latest && previous ? latest.value - previous.value : null;

  const typesWithData = useMemo(
    () => new Set(Object.keys(chartData).filter((k) => (chartData[k]?.data?.length ?? 0) > 0)),
    [chartData]
  );

  const openAdd = () => {
    setFormValue(latest ? String(latest.value) : '');
    setSheetVisible(true);
  };

  const save = async () => {
    if (!selectedType) return;
    const numeric = parseFloat(formValue.replace(',', '.'));
    if (!numeric || Number.isNaN(numeric)) return;
    setSaving(true);
    try {
      await bodyMetricsApi.store({
        metric_type: selectedType,
        value: numeric,
        unit: meta?.unit ?? undefined,
        recorded_at: todayISO(),
      });
      setSheetVisible(false);
      await load();
    } catch (e) {
      logger.error('BodyMetrics save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = (id: number) => {
    Alert.alert('Eliminar medida', '¿Seguro que quieres borrar esta medida?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await bodyMetricsApi.destroy(id);
            await load();
          } catch (e) {
            logger.error('BodyMetrics delete error:', e);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Box className="flex-row items-center justify-between px-3 py-3">
        <Pressable onPress={() => props.navigation?.goBack()} style={{ padding: 4 }}>
          <Icon name="chevron-back" size={24} color={C.textPrimary} />
        </Pressable>
        <Text weight="bold" size="lg">Antropometría</Text>
        <Box style={{ width: 32 }} />
      </Box>

      {loading ? (
        <Box className="flex-1 items-center justify-center px-8" style={{ gap: 12 }}>
          <Spinner size="large" color={C.textSecondary} />
        </Box>
      ) : types.length === 0 ? (
        <Box className="flex-1 items-center justify-center px-8" style={{ gap: 12 }}>
          <Icon name="body-outline" size={40} color={C.gray30} />
          <Text size="sm" muted className="text-center">Tu coach todavía no ha configurado ningún tipo de medida.</Text>
        </Box>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 8 }}>
            {types.map((t) => (
              <Pressable
                key={t.value}
                className="flex-row items-center rounded-pill"
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  backgroundColor: selectedType === t.value ? C.accentBlack : C.surface,
                  boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
                }}
                onPress={() => setSelectedType(t.value)}
              >
                {typesWithData.has(t.value) && (
                  <Box style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.statusSuccess, marginRight: 6 }} />
                )}
                {/* lineHeight explícito (mismo motivo que el número grande de
                    abajo): sin él, el className size="xs" no siempre llega a
                    Text con un lineHeight utilizable y el glifo del custom
                    font se recorta por arriba/abajo -- reportado con
                    captura, "Peso"/"Grasa..." con las letras cortadas. */}
                <Text
                  weight="semibold"
                  size="xs"
                  style={{ fontSize: 12.5, lineHeight: 18, color: selectedType === t.value ? C.accentBlackForeground : C.textSecondary }}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 + WORKOUT_MINIBAR_CLEARANCE }} showsVerticalScrollIndicator={false}>
            <Box className="bg-card rounded-md" style={{ padding: 18, ...SHADOW.card }}>
              {latest ? (
                <>
                  <Box className="flex-row items-start justify-between">
                    <Box style={{ flex: 1 }}>
                      <Text weight="medium" size="sm" muted>{meta?.label}</Text>
                      {/* lineHeight explícito: el tamaño 32 supera el lineHeight de 24 que
                          aplica el className size="md" por defecto (Gilroy-Bold custom
                          recorta el glifo si el lineHeight queda por debajo del fontSize). */}
                      <Text weight="bold" style={{ fontSize: 32, lineHeight: 38, marginTop: 4 }}>
                        {latest.value}
                        <Text weight="medium" size="md" muted> {unit}</Text>
                      </Text>
                    </Box>
                    <Pressable
                      className="items-center justify-center rounded-pill"
                      style={{ width: 34, height: 34, backgroundColor: C.accentBlack }}
                      onPress={openAdd}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Añadir medición"
                    >
                      <Icon name="add" size={20} color={C.accentBlackForeground} />
                    </Pressable>
                  </Box>
                  <Box className="flex-row items-center justify-between" style={{ marginTop: 8 }}>
                    <Text size="xs" muted>
                      {formatShortDate(latest.date)} · {latest.source === 'coach' ? 'Tu coach' : 'Tú'}
                    </Text>
                    {delta !== null && (
                      <Box
                        className="flex-row items-center rounded-sm"
                        style={{
                          gap: 4,
                          paddingHorizontal: 9,
                          paddingVertical: 5,
                          backgroundColor: delta < 0 ? C.success10 : delta > 0 ? C.warning10 : C.gray5,
                        }}
                      >
                        <Icon name={delta < 0 ? 'arrow-down' : delta > 0 ? 'arrow-up' : 'remove'} size={11} color={delta < 0 ? C.statusSuccess : delta > 0 ? C.statusWarning : C.gray40} />
                        <Text weight="bold" style={{ fontSize: 11.5, color: delta < 0 ? C.statusSuccess : delta > 0 ? C.statusWarning : C.gray40 }}>
                          {Math.abs(delta).toFixed(1)} {unit}
                        </Text>
                      </Box>
                    )}
                  </Box>
                </>
              ) : (
                <Box className="items-center" style={{ paddingVertical: 16, gap: 10 }}>
                  <Icon name="body-outline" size={32} color={C.gray30} />
                  <Text size="sm" muted className="text-center">Sin medidas de {meta?.label.toLowerCase()} todavía</Text>
                  <Button style={{ backgroundColor: C.accentBlack, marginTop: 4 }} onPress={openAdd}>
                    <Text weight="bold" size="sm" style={{ color: C.accentBlackForeground }}>Añadir primera medida</Text>
                  </Button>
                </Box>
              )}
            </Box>

            {sortedAsc.length >= 2 && (
              <Box className="bg-card rounded-md items-center" style={{ padding: 18, marginTop: 12, ...SHADOW.card }}>
                <MetricLineChart
                  series={[{ key: selectedType ?? 'metric', color: C.orange, values: sortedAsc.map((p) => p.value) }]}
                  pointCount={sortedAsc.length}
                  width={CHART_WIDTH}
                  height={130}
                  unit={unit}
                  pointLabels={sortedAsc.map((p) => formatShortDate(p.date))}
                />
                <Box className="flex-row justify-between" style={{ width: CHART_WIDTH, marginTop: 6 }}>
                  <Text size="xs" muted>{formatShortDate(sortedAsc[0].date)}</Text>
                  <Text size="xs" muted>{formatShortDate(sortedAsc[sortedAsc.length - 1].date)}</Text>
                </Box>
              </Box>
            )}

            {sortedDesc.length > 0 && (
              <Box style={{ marginTop: 20 }}>
                <Text weight="bold" size="xs" muted style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Historial</Text>
                {sortedDesc.map((entry) => (
                  <Box key={entry.id} className="flex-row items-center bg-card rounded-md p-3.5" style={{ marginBottom: 8, ...SHADOW.card }}>
                    <Box style={{ flex: 1 }}>
                      <Text weight="bold" size="md">
                        {entry.value} {unit}
                      </Text>
                      <Text size="xs" muted style={{ marginTop: 2 }}>
                        {formatShortDate(entry.date)} · {entry.source === 'coach' ? 'Coach' : 'Tú'}
                      </Text>
                      {entry.notes ? <Text size="xs" muted style={{ marginTop: 4, fontStyle: 'italic' }}>{entry.notes}</Text> : null}
                    </Box>
                    {entry.source === 'client' && (
                      <Pressable onPress={() => deleteEntry(entry.id)} style={{ padding: 8 }}>
                        <Icon name="trash-outline" size={16} color={C.gray40} />
                      </Pressable>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </ScrollView>
        </>
      )}

      <SimpleBottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)}>
        <Box style={{ padding: 24 }}>
          <Heading size="sm" className="text-center" style={{ marginBottom: 16 }}>Añadir {meta?.label.toLowerCase()}</Heading>
          <Box className="flex-row items-center bg-secondary rounded-md" style={{ paddingHorizontal: 16 }}>
            <TextInput
              style={{ flex: 1, fontFamily: FONT.bold, fontSize: 28, lineHeight: 34, color: C.textPrimary, paddingVertical: 14 }}
              keyboardType="decimal-pad"
              value={formValue}
              onChangeText={setFormValue}
              placeholder="0.0"
              placeholderTextColor={C.gray30}
              autoFocus
            />
            <Text weight="medium" size="md" muted>{unit}</Text>
          </Box>
          <Button style={{ backgroundColor: C.accentBlack, marginTop: 16 }} onPress={save} disabled={saving}>
            {saving ? <Spinner size="small" color={C.accentBlackForeground} /> : <Text weight="bold" size="sm" style={{ color: C.accentBlackForeground }}>Guardar</Text>}
          </Button>
        </Box>
      </SimpleBottomSheet>
    </SafeAreaView>
  );
}
