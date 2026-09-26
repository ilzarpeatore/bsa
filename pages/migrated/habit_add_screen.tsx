import React, { useState, useCallback, useRef } from 'react';
import { ScrollView, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Button, ButtonText } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import ScreenHeader from '@components/ScreenHeader';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { useTutorial } from '@store/TutorialContext';
import { useAppColorMode } from '@helper/useAppColorMode';
import { logger } from '@helper/logger';
import { showToast } from '@helper/toast';
import { habitsApi, HabitTemplate, HabitFrequency } from '../../api/habits';
import { HABIT_ICON_KEYS, habitIoniconFor } from '../../constants/habitIcons';
import { FONT, RADIUS } from './theme';

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
    logger.error('[HabitAddScreen] Error atrapado por el ErrorBoundary:', error);
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

// Formulario "Crear el mío", reconstruido con componentes básicos de React
// Native (TextInput/Pressable/View) en vez de Input/Button de gluestack y sin
// KeyboardAvoidingView anidado dentro de un ScrollView: en el dispositivo real
// la pestaña dejaba de permitir crear hábitos propios (adoptar de la
// biblioteca sí funcionaba y en la base de datos no hay ningún hábito
// personal desde el 2026-08-04; causa exacta no reproducible fuera del
// iPhone). El botón de crear queda FIJO abajo, fuera del scroll -- siempre
// visible y pulsable, sin depender de hacer scroll ni de la barra minimizada
// del entrenamiento -- y cualquier fallo se muestra también dentro de la
// propia pantalla, no solo en un toast.
function PersonalHabitForm({ navigation }: { navigation?: any }) {
  const { colors: C } = useAppColorMode();
  const { reportAction } = useTutorial();
  const [icon, setIcon] = useState<string>('fitness');
  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('veces');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const labelStyle = { marginBottom: 8, marginTop: 16, letterSpacing: 0.3 } as const;
  const chip = (active: boolean) => ({
    backgroundColor: active ? C.accentBlack : C.surface,
  });
  const chipText = (active: boolean) => ({ color: active ? C.accentBlackForeground : C.textSecondary });

  const submit = async () => {
    if (submittingRef.current) return;
    if (!title.trim()) {
      setFormError('Ponle un nombre a tu hábito.');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
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
        navigation?.replace
          ? navigation.replace('MigratedHabitDetail', { habitId: newId })
          : navigation?.navigate('MigratedHabitDetail', { habitId: newId });
      } else {
        navigation?.goBack();
      }
    } catch (e: any) {
      // Se muestra el motivo real del backend (validación...) igual que en
      // adopt(); logger.error deja rastro en "Enviar registros al
      // desarrollador" (Ajustes).
      logger.error('[HabitAdd] Error creando hábito personal:', e);
      const firstFieldError = e?.response?.data?.errors
        ? (Object.values(e.response.data.errors)[0] as string[] | undefined)?.[0]
        : undefined;
      const msg =
        firstFieldError ||
        e?.response?.data?.message ||
        (e?.response
          ? `No se pudo crear el hábito (error ${e.response.status}).`
          : 'Sin conexión con el servidor. Inténtalo de nuevo.');
      setFormError(msg);
      showToast('Error', { description: msg, variant: 'error' });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text weight="bold" size="xs" muted className="uppercase" style={labelStyle}>Icono</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {HABIT_ICON_KEYS.map((key) => (
            <Pressable
              key={key}
              style={{ width: 40, height: 40, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', ...chip(icon === key) }}
              onPress={() => setIcon(key)}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel={`Icono ${key}`}
              accessibilityState={{ selected: icon === key }}
            >
              <Icon name={habitIoniconFor(key)} size={19} color={icon === key ? C.accentBlackForeground : C.textSecondary} />
            </Pressable>
          ))}
        </View>

        <Text weight="bold" size="xs" muted className="uppercase" style={labelStyle}>Nombre</Text>
        <TextInput
          style={{
            height: 48,
            paddingHorizontal: 14,
            borderRadius: RADIUS.sm,
            backgroundColor: C.surface,
            color: C.textPrimary,
            fontFamily: FONT.regular,
            fontSize: 16,
          }}
          placeholder="p. ej. Beber agua"
          placeholderTextColor={C.textSecondary}
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            if (formError) setFormError(null);
          }}
          maxLength={50}
          returnKeyType="done"
          accessibilityLabel="Nombre del hábito"
        />

        <Text weight="bold" size="xs" muted className="uppercase" style={labelStyle}>Objetivo (opcional)</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TextInput
            style={{
              width: 72,
              height: 48,
              borderRadius: RADIUS.sm,
              backgroundColor: C.surface,
              color: C.textPrimary,
              fontFamily: FONT.regular,
              fontSize: 16,
              textAlign: 'center',
            }}
            placeholder="8"
            placeholderTextColor={C.textSecondary}
            value={targetValue}
            onChangeText={(t) => setTargetValue(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={5}
            accessibilityLabel="Valor del objetivo"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {GOAL_UNITS.map((u) => (
                <Pressable
                  key={u}
                  style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.pill, ...chip(targetUnit === u) }}
                  onPress={() => setTargetUnit(u)}
                >
                  <Text weight="semibold" size="sm" style={chipText(targetUnit === u)}>{u}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <Text weight="bold" size="xs" muted className="uppercase" style={labelStyle}>Frecuencia</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['daily', 'weekly'] as HabitFrequency[]).map((f) => (
            <Pressable
              key={f}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: RADIUS.sm, ...chip(frequency === f) }}
              onPress={() => setFrequency(f)}
            >
              <Text weight="bold" size="sm" style={chipText(frequency === f)}>{f === 'daily' ? 'Diario' : 'Semanal'}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: C.bg }}>
        {formError ? (
          <Text size="sm" className="text-center" style={{ color: C.destructive50, marginBottom: 8 }}>
            {formError}
          </Text>
        ) : null}
        <Pressable
          onPress={submit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Crear hábito"
          style={({ pressed }) => ({
            height: 52,
            borderRadius: RADIUS.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: C.accentBlack,
            opacity: submitting ? 0.6 : pressed ? 0.85 : 1,
          })}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={C.accentBlackForeground} />
          ) : (
            <Text weight="bold" style={{ letterSpacing: 0.5, color: C.accentBlackForeground, fontSize: 15 }}>
              CREAR HÁBITO
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
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
      logger.error('[HabitAdd] Error cargando biblioteca de hábitos:', e);
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
      logger.error('[HabitAdd] Error adoptando hábito de biblioteca:', e);
      const msg = e?.response?.data?.message || 'No se pudo añadir este hábito.';
      showToast('Aviso', { description: msg, variant: 'error' });
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
        <Box className="items-center justify-center" style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: C.bg }}>
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
          {adoptingId === t.id ? <ActivityIndicator size="small" color={C.accentBlackForeground} /> : <Icon name="add" size={20} color={C.accentBlackForeground} />}
        </Pressable>
      </Box>
    ),
    [adopt, adoptingId, C]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="Añadir hábito" onBack={() => navigation?.goBack()} />

      {/* Selector de pestañas con View/Pressable básicos (antes
          GlassSegmentedBar, Liquid Glass en iOS 26+): la pestaña "Crear el
          mío" no respondía en el dispositivo real y esta es la pieza
          nativa más frágil entre la pantalla y el formulario. */}
      <View
        style={{
          flexDirection: 'row',
          padding: 4,
          marginHorizontal: 20,
          marginTop: 16,
          marginBottom: 14,
          borderRadius: RADIUS.md,
          backgroundColor: C.surface,
        }}
      >
        {([['library', 'Biblioteca'], ['create', 'Crear el mío']] as const).map(([key, label]) => (
          <Pressable
            key={key}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 10,
              borderRadius: RADIUS.sm,
              backgroundColor: tab === key ? C.accentBlack : 'transparent',
            }}
            onPress={() => setTab(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
          >
            <Text weight="semibold" size="sm" style={{ color: tab === key ? C.accentBlackForeground : C.textSecondary }}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

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
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 + WORKOUT_MINIBAR_CLEARANCE }}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        <PersonalHabitForm navigation={navigation} />
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
