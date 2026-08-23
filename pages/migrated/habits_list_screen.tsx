import React, { useState, useCallback, useMemo } from 'react';
import { ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Button, ButtonText } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import ScreenHeader from '@components/ScreenHeader';
import { TAB_BAR_CLEARANCE } from '@components/NavigationTab';
import { useTabBarScroll } from '@store/TabBarScrollContext';
import TutorialTarget from '@components/tutorial/TutorialTarget';
import { useTutorial } from '@store/TutorialContext';
import { C } from './theme';
import { habitsApi, Habit, HabitSourceType } from '../../api/habits';
import { habitIoniconFor } from '../../constants/habitIcons';
import WeekComplianceRow from '../../components/WeekComplianceRow';
import { computeWeekCompliance } from '../../components/weekCompliance';

const SOURCE_LABEL: Record<HabitSourceType, string> = {
  coach_assigned: 'De tu coach',
  library: 'Biblioteca',
  personal: 'Personal',
};
const SOURCE_COLOR: Record<HabitSourceType, string> = {
  coach_assigned: C.purple60,
  library: C.blue60,
  personal: C.warning60,
};
const SOURCE_BG: Record<HabitSourceType, string> = {
  coach_assigned: C.purple5,
  library: C.blue5,
  personal: C.warning5,
};

// Fecha local (YYYY-MM-DD) sin pasar por UTC — ver comentario homologo en
// habit_detail_screen.tsx. toISOString() desplaza la fecha en usos horarios
// positivos (p.ej. España) y desincroniza esta comprobacion con lo que
// guarda esa pantalla.
function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isDoneToday(habit: Habit): boolean {
  const today = todayIso();
  return habit.logs.some((l) => l.date.slice(0, 10) === today && l.is_completed);
}

interface Props {
  navigation?: any;
}

const isGoalHabit = (habit: Habit) => habit.target_value != null && Number(habit.target_value) > 0;

export default function HabitsListScreen(props: Props) {
  const { navigation } = props;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [items, setItems] = useState<Habit[]>([]);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const { reportAction } = useTutorial();
  const { reportScrollY } = useTabBarScroll();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const res = await habitsApi.getMyList(30);
      setItems(res.data?.data ?? []);
    } catch (e) {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openDetail = (habit: Habit) => {
    navigation?.navigate('MigratedHabitDetail', { habitId: habit.id });
  };

  // Hábitos con objetivo numérico no se marcan "hecho" a ciegas desde aquí
  // (no hay dónde introducir el valor real) — se abre el detalle, que sí
  // pide la cantidad conseguida. Los binarios siguen con toggle instantáneo.
  const toggleToday = async (habit: Habit) => {
    if (togglingId) return;
    if (isGoalHabit(habit)) {
      openDetail(habit);
      return;
    }
    const done = isDoneToday(habit);
    setTogglingId(habit.id);
    try {
      await habitsApi.logHabit(habit.id, { is_completed: !done });
      if (!done) reportAction('habit_marked_done');
      await load();
    } catch (e) {
      // silencioso — el usuario puede reintentar el tap
    } finally {
      setTogglingId(null);
    }
  };

  const totalStreakDays = useMemo(() => items.reduce((sum, h) => sum + (h.current_streak || 0), 0), [items]);

  const renderCard = (habit: Habit, index: number) => {
    const done = isDoneToday(habit);
    const toggleBtn = (
      <Pressable
        className="w-9 h-9 rounded-pill items-center justify-center"
        style={{ backgroundColor: done ? C.success50 : C.bg }}
        onPress={() => toggleToday(habit)}
        disabled={togglingId === habit.id}
      >
        {togglingId === habit.id ? (
          <ActivityIndicator size="small" color={done ? '#FFFFFF' : C.textSecondary} />
        ) : (
          <Icon name="checkmark" size={20} color={done ? '#FFFFFF' : C.gray30} />
        )}
      </Pressable>
    );
    return (
      <Pressable
        key={habit.id}
        className="bg-card rounded-md"
        style={{ padding: 14, marginBottom: 10 }}
        onPress={() => openDetail(habit)}
      >
        <Box className="flex-row items-center" style={{ gap: 12, marginBottom: 12 }}>
          <Box className="w-11 h-11 rounded-md bg-background items-center justify-center">
            <Icon name={habitIoniconFor(habit.icon)} size={20} className="text-foreground" />
          </Box>
          <Box className="flex-1">
            <Text weight="bold" size="sm" numberOfLines={1}>{habit.title}</Text>
            <Box className="flex-row items-center" style={{ gap: 6, marginTop: 5 }}>
              {!!habit.current_streak && (
                <Box
                  className="flex-row items-center rounded-sm"
                  style={{ gap: 3, backgroundColor: C.warning5, paddingHorizontal: 6, paddingVertical: 2 }}
                >
                  <Icon name="flame" size={11} color={C.warning60} />
                  <Text size="xs" weight="bold" style={{ color: C.warning60 }}>{habit.current_streak}</Text>
                </Box>
              )}
              <Box
                className="rounded-sm"
                style={{ backgroundColor: SOURCE_BG[habit.source_type], paddingHorizontal: 6, paddingVertical: 2 }}
              >
                <Text size="xs" weight="medium" style={{ color: SOURCE_COLOR[habit.source_type] }}>{SOURCE_LABEL[habit.source_type]}</Text>
              </Box>
            </Box>
          </Box>
          {index === 0 ? (
            <TutorialTarget id="habit-toggle-first">{toggleBtn}</TutorialTarget>
          ) : (
            toggleBtn
          )}
        </Box>
        <WeekComplianceRow completedDays={computeWeekCompliance(habit.logs)} color={C.orange} size={24} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader
        title="Mis hábitos"
        onBack={() => navigation?.goBack()}
        rightAction={
          <TutorialTarget id="habits-add-button">
            <Pressable onPress={() => navigation?.navigate('MigratedHabitAdd')}>
              <Icon name="add-circle" size={26} className="text-foreground" />
            </Pressable>
          </TutorialTarget>
        }
      />

      {isLoading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={C.textPrimary} />
        </Box>
      ) : error ? (
        <Box className="flex-1 items-center justify-center">
          <Text size="sm" muted className="text-center">No se pudieron cargar tus hábitos.</Text>
        </Box>
      ) : items.length === 0 ? (
        <Box className="flex-1 items-center justify-center" style={{ paddingHorizontal: 32 }}>
          <Icon name="flame-outline" size={40} className="text-muted-foreground" />
          <Text size="sm" muted className="text-center" style={{ marginTop: 12 }}>Todavía no tienes ningún hábito.</Text>
          <Button radius="pill" style={{ marginTop: 18, paddingHorizontal: 22, paddingVertical: 12 }} onPress={() => navigation?.navigate('MigratedHabitAdd')}>
            <ButtonText size="sm" style={{ fontSize: 13.5 }}>Añadir mi primer hábito</ButtonText>
          </Button>
        </Box>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: TAB_BAR_CLEARANCE }}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => reportScrollY(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={32}
        >
          {totalStreakDays > 0 && (
            <Box
              className="flex-row items-center rounded-md"
              style={{ gap: 10, backgroundColor: C.warning5, padding: 14, marginBottom: 14 }}
            >
              <Icon name="flame" size={22} color={C.warning60} />
              <Text weight="bold" size="sm" style={{ color: C.warning60 }}>{totalStreakDays} días de racha combinada</Text>
            </Box>
          )}
          {items.map(renderCard)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
