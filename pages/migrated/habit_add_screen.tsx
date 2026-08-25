import React, { useState, useCallback } from 'react';
import { ScrollView, FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Button, ButtonText } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Input, InputField } from '@components/ui/input';
import ScreenHeader from '@components/ScreenHeader';
import { useTutorial } from '@store/TutorialContext';
import { useAppColorMode } from '@helper/useAppColorMode';
import { habitsApi, HabitTemplate, HabitFrequency } from '../../api/habits';
import { HABIT_ICON_KEYS, habitIoniconFor } from '../../constants/habitIcons';

const GOAL_UNITS = ['veces', 'min', 'horas', 'vasos', 'km', 'pasos', 'sesiones', 'páginas'];

interface Props {
  navigation?: any;
}

// Red de seguridad: no se pudo confirmar una causa raíz definitiva para el
// crash real reportado en esta pantalla tras revisar a fondo habitsApi,
// HABIT_ICON_MAP, ScreenHeader y el registro de navegación en App.tsx (todo
// null-safe por lectura estática). Como hipótesis más probable queda una
// respuesta de biblioteca con forma inesperada (item null/no-objeto dentro
// del array) reventando renderTemplateItem sin try/catch alrededor — ya
// mitigado abajo filtrando la respuesta — pero por si hay otra causa no
// detectada, este ErrorBoundary evita que un throw en el árbol de esta
// pantalla tumbe la app entera; en su lugar degrada a un mensaje con salida.
class HabitAddErrorBoundary extends React.Component<
  { navigation?: any; colors: ReturnType<typeof useAppColorMode>['colors']; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { navigation?: any; colors: ReturnType<typeof useAppColorMode>['colors']; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error('[HabitAddScreen] Error atrapado por el ErrorBoundary:', error);
  }
  render() {
    if (this.state.hasError) {
      const C = this.props.colors;
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
          <ScreenHeader title="Añadir hábito" onBack={() => this.props.navigation?.goBack()} />
          <Box className="flex-1 items-center justify-center" style={{ paddingHorizontal: 32 }}>
            <Icon name="alert-circle-outline" size={36} className="text-muted-foreground" />
            <Text size="sm" muted className="text-center" style={{ marginTop: 12 }}>
              No se pudo mostrar esta pantalla. Vuelve a intentarlo en unos segundos.
            </Text>
            <Button radius="pill" style={{ marginTop: 18, paddingHorizontal: 22, paddingVertical: 12 }} onPress={() => this.props.navigation?.goBack()}>
              <ButtonText size="sm">Volver</ButtonText>
            </Button>
          </Box>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function HabitAddScreenInner(props: Props) {
  const { colors: C } = useAppColorMode();
  const { navigation } = props;
  const [tab, setTab] = useState<'library' | 'create'>('library');

  const [templates, setTemplates] = useState<HabitTemplate[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [errorLibrary, setErrorLibrary] = useState(false);
  const [adoptingId, setAdoptingId] = useState<number | null>(null);
  const { reportAction } = useTutorial();

  const [icon, setIcon] = useState<string>('fitness');
  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('veces');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [submitting, setSubmitting] = useState(false);

  const loadLibrary = useCallback(async () => {
    setLoadingLibrary(true);
    setErrorLibrary(false);
    try {
      const res = await habitsApi.getLibrary();
      const raw = res.data?.data;
      // El backend en teoria siempre devuelve un array de objetos, pero si
      // llegara algo con forma distinta (item null, o data no-array) el
      // FlatList de abajo reventaria al leer t.icon/t.title sin proteccion
      // — se filtra aqui para que un dato malformado nunca sea la causa de
      // un crash de pantalla completa.
      setTemplates(Array.isArray(raw) ? raw.filter((t): t is HabitTemplate => !!t && typeof t === 'object') : []);
    } catch (e) {
      setErrorLibrary(true);
    } finally {
      setLoadingLibrary(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadLibrary(); }, [loadLibrary]));

  const adopt = useCallback(async (t: HabitTemplate) => {
    if (adoptingId) return;
    setAdoptingId(t.id);
    try {
      const res = await habitsApi.adopt(t.id);
      const newId = res.data?.data?.id;
      reportAction('habit_added');
      if (newId) {
        navigation?.replace ? navigation.replace('MigratedHabitDetail', { habitId: newId }) : navigation?.navigate('MigratedHabitDetail', { habitId: newId });
      } else {
        navigation?.goBack();
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'No se pudo añadir este hábito.';
      Alert.alert('Aviso', msg);
    } finally {
      setAdoptingId(null);
    }
  }, [adoptingId, navigation, reportAction]);

  const renderTemplateItem = useCallback(
    ({ item: t }: { item: HabitTemplate }) => (
      <Box
        className="flex-row items-center bg-card rounded-md"
        style={{ gap: 12, padding: 12, marginBottom: 10 }}
      >
        <Box className="items-center justify-center bg-background" style={{ width: 42, height: 42, borderRadius: 13 }}>
          <Icon name={habitIoniconFor(t.icon)} size={20} className="text-foreground" />
        </Box>
        <Box className="flex-1">
          <Text weight="bold" size="sm">{t.title}</Text>
          {t.target_value && t.target_unit && (
            <Text size="xs" muted style={{ marginTop: 2 }}>{t.target_value} {t.target_unit} / {t.frequency === 'daily' ? 'día' : 'semana'}</Text>
          )}
        </Box>
        <Pressable
          className="items-center justify-center rounded-pill"
          style={{ width: 34, height: 34, backgroundColor: C.accentBlack }}
          onPress={() => adopt(t)}
          disabled={adoptingId === t.id}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Añadir hábito ${t.title ?? ''}`.trim()}
        >
          {adoptingId === t.id ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="add" size={20} color="#FFFFFF" />}
        </Pressable>
      </Box>
    ),
    [adopt, adoptingId, C]
  );

  const submitPersonal = async () => {
    if (!title.trim()) {
      Alert.alert('Falta el nombre', 'Ponle un nombre a tu hábito.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await habitsApi.createPersonal({
        title: title.trim(),
        icon,
        target_value: targetValue ? Number(targetValue) : null,
        target_unit: targetValue ? targetUnit : null,
        frequency,
      });
      const newId = res.data?.data?.id;
      reportAction('habit_added');
      if (newId) {
        navigation?.replace ? navigation.replace('MigratedHabitDetail', { habitId: newId }) : navigation?.navigate('MigratedHabitDetail', { habitId: newId });
      } else {
        navigation?.goBack();
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear el hábito. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="Añadir hábito" onBack={() => navigation?.goBack()} />

      <Box
        className="flex-row bg-card rounded-md"
        style={{ padding: 4, marginHorizontal: 20, marginTop: 16, marginBottom: 14 }}
      >
        <Pressable
          className="flex-1 rounded-sm items-center"
          style={{ paddingVertical: 10, backgroundColor: tab === 'library' ? C.accentBlack : 'transparent' }}
          onPress={() => setTab('library')}
        >
          <Text weight="semibold" size="sm" style={{ color: tab === 'library' ? '#FFFFFF' : C.textSecondary }}>Biblioteca</Text>
        </Pressable>
        <Pressable
          className="flex-1 rounded-sm items-center"
          style={{ paddingVertical: 10, backgroundColor: tab === 'create' ? C.accentBlack : 'transparent' }}
          onPress={() => setTab('create')}
        >
          <Text weight="semibold" size="sm" style={{ color: tab === 'create' ? '#FFFFFF' : C.textSecondary }}>Crear el mío</Text>
        </Pressable>
      </Box>

      {tab === 'library' ? (
        loadingLibrary ? (
          <Box className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={C.textPrimary} />
          </Box>
        ) : errorLibrary ? (
          <Box className="flex-1 items-center justify-center">
            <Text size="sm" muted className="text-center">No se pudo cargar la biblioteca.</Text>
          </Box>
        ) : templates.length === 0 ? (
          <Box className="flex-1 items-center justify-center" style={{ paddingHorizontal: 32 }}>
            <Icon name="library-outline" size={36} className="text-muted-foreground" />
            <Text size="sm" muted className="text-center" style={{ marginTop: 12 }}>
              Tu coach todavía no ha añadido hábitos a la biblioteca. Puedes crear el tuyo propio.
            </Text>
          </Box>
        ) : (
          <FlatList
            data={templates}
            keyExtractor={(t) => String(t.id)}
            renderItem={renderTemplateItem}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text weight="bold" size="xs" muted className="uppercase" style={{ marginBottom: 8, marginTop: 16, letterSpacing: 0.3 }}>Icono</Text>
            <Box className="flex-row flex-wrap" style={{ gap: 8 }}>
              {HABIT_ICON_KEYS.map((key) => (
                <Pressable
                  key={key}
                  className="items-center justify-center bg-card rounded-sm"
                  style={{ width: 40, height: 40, backgroundColor: icon === key ? C.accentBlack : C.surface }}
                  onPress={() => setIcon(key)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Icono ${key}`}
                  accessibilityState={{ selected: icon === key }}
                >
                  <Icon name={habitIoniconFor(key)} size={19} color={icon === key ? '#FFFFFF' : C.textSecondary} />
                </Pressable>
              ))}
            </Box>

            <Text weight="bold" size="xs" muted className="uppercase" style={{ marginBottom: 8, marginTop: 16, letterSpacing: 0.3 }}>Nombre</Text>
            <Input className="rounded-sm" size="lg">
              <InputField
                placeholder="p. ej. Beber agua"
                value={title}
                onChangeText={setTitle}
                maxLength={50}
              />
            </Input>

            <Text weight="bold" size="xs" muted className="uppercase" style={{ marginBottom: 8, marginTop: 16, letterSpacing: 0.3 }}>Objetivo (opcional)</Text>
            <Box className="flex-row items-center" style={{ gap: 10 }}>
              <Input className="rounded-sm" size="lg" style={{ width: 72 }}>
                <InputField
                  placeholder="8"
                  value={targetValue}
                  onChangeText={(t) => setTargetValue(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  className="text-center"
                />
              </Input>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                <Box className="flex-row" style={{ gap: 8 }}>
                  {GOAL_UNITS.map((u) => (
                    <Pressable
                      key={u}
                      className="rounded-pill"
                      style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: targetUnit === u ? C.accentBlack : C.surface }}
                      onPress={() => setTargetUnit(u)}
                    >
                      <Text weight="semibold" size="sm" style={{ color: targetUnit === u ? '#FFFFFF' : C.textSecondary }}>{u}</Text>
                    </Pressable>
                  ))}
                </Box>
              </ScrollView>
            </Box>

            <Text weight="bold" size="xs" muted className="uppercase" style={{ marginBottom: 8, marginTop: 16, letterSpacing: 0.3 }}>Frecuencia</Text>
            <Box className="flex-row" style={{ gap: 10 }}>
              {(['daily', 'weekly'] as HabitFrequency[]).map((f) => (
                <Pressable
                  key={f}
                  className="flex-1 items-center rounded-sm"
                  style={{ paddingVertical: 12, backgroundColor: frequency === f ? C.accentBlack : C.surface }}
                  onPress={() => setFrequency(f)}
                >
                  <Text weight="bold" size="sm" style={{ color: frequency === f ? '#FFFFFF' : C.textSecondary }}>{f === 'daily' ? 'Diario' : 'Semanal'}</Text>
                </Pressable>
              ))}
            </Box>

            <Button radius="pill" className="py-4" style={{ marginTop: 28 }} onPress={submitPersonal} disabled={submitting}>
              {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ButtonText style={{ letterSpacing: 0.5 }}>CREAR HÁBITO</ButtonText>}
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

export default function HabitAddScreen(props: Props) {
  const { colors: C } = useAppColorMode();
  return (
    <HabitAddErrorBoundary navigation={props.navigation} colors={C}>
      <HabitAddScreenInner {...props} />
    </HabitAddErrorBoundary>
  );
}
