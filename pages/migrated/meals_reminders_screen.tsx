import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyleSheet } from '@helper/responsiveStyleSheet';
import { profileApi } from '@api/profile';
import { useAuth } from '@store/AuthContext';
import { scheduleMealReminders } from '@helper/reminderNotifications';
import { useAppColorMode } from '@helper/useAppColorMode';
import { FONT } from './theme';

interface TimeObj {
  hour: number;
  minute: number;
}

function formatTime(t: TimeObj): string {
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
}

function formatTimeDisplay(t: TimeObj): string {
  const ampm = t.hour >= 12 ? 'PM' : 'AM';
  const h = t.hour % 12 || 12;
  return `${h}:${String(t.minute).padStart(2, '0')} ${ampm}`;
}

interface MealsRemindersScreenProps {
  navigation?: any;
  route?: any;
}

function parseTime(value: string): TimeObj | null {
  if (!value) return null;
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { hour: h, minute: m };
}

function pickTime(current: TimeObj, onSelected: (t: TimeObj) => void) {
  Alert.alert('Establecer hora', `Actual: ${formatTimeDisplay(current)}\n\nUsar un selector de hora real en producción.`, [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Poner 1 hora más tarde',
      onPress: () => {
        onSelected({ hour: (current.hour + 1) % 24, minute: current.minute });
      },
    },
  ]);
}

export default function MealsRemindersScreen(props: MealsRemindersScreenProps) {
  const { navigation } = props;
  const { state } = useAuth();
  const { colors: C } = useAppColorMode();

  const [breakfastEnabled, setBreakfastEnabled] = useState(true);
  const [snacksEnabled, setSnacksEnabled] = useState(true);
  const [lunchEnabled, setLunchEnabled] = useState(true);
  const [dinnerEnabled, setDinnerEnabled] = useState(true);

  const [breakfastTime, setBreakfastTime] = useState<TimeObj>({ hour: 8, minute: 0 });
  const [snacksTime, setSnacksTime] = useState<TimeObj>({ hour: 10, minute: 30 });
  const [lunchTime, setLunchTime] = useState<TimeObj>({ hour: 13, minute: 0 });
  const [dinnerTime, setDinnerTime] = useState<TimeObj>({ hour: 20, minute: 0 });

  const [isSaving, setIsSaving] = useState(false);

  const styles = useResponsiveStyleSheet({
    container: { flex: 1, backgroundColor: C.bg },
    header: { fontSize: '20@ratio', fontFamily: FONT.bold, color: C.white, padding: '16@ratio' },
    content: { padding: '16@ratio' },
    sectionTitle: { fontSize: '16@ratio', fontFamily: FONT.bold, color: C.white, marginBottom: '8@ratio' },
    sectionCard: { backgroundColor: C.surfaceLight, borderRadius: '12@ratio', marginBottom: '16@ratio', overflow: 'hidden' },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: '16@ratio', paddingVertical: '14@ratio' },
    settingLabel: { fontSize: '15@ratio', fontFamily: FONT.regular, color: C.white },
    timeRow: { flexDirection: 'row', alignItems: 'center' },
    timeText: { fontSize: '14@ratio', fontFamily: FONT.regular, color: C.textSecondary, marginRight: '8@ratio' },
    divider: { height: 1, backgroundColor: C.border },
    saveBtn: { color: C.textPrimary, fontSize: '16@ratio', fontFamily: FONT.semiBold },
    loader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: '16@ratio', paddingTop: '16@ratio' },
  }, [C]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = state.user?.user_profile?.meal_reminder_settings;
    if (!settings) return;

    if (settings.breakfast) {
      setBreakfastEnabled(settings.breakfast.enabled ?? true);
      const t = parseTime(settings.breakfast.time);
      if (t) setBreakfastTime(t);
    }
    if (settings.lunch) {
      setLunchEnabled(settings.lunch.enabled ?? true);
      const t = parseTime(settings.lunch.time);
      if (t) setLunchTime(t);
    }
    if (settings.snacks) {
      setSnacksEnabled(settings.snacks.enabled ?? true);
      const t = parseTime(settings.snacks.time);
      if (t) setSnacksTime(t);
    }
    if (settings.dinner) {
      setDinnerEnabled(settings.dinner.enabled ?? true);
      const t = parseTime(settings.dinner.time);
      if (t) setDinnerTime(t);
    }
  };

  const saveSettings = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const request = {
        meal_reminder_settings: {
          breakfast: { enabled: breakfastEnabled, time: formatTime(breakfastTime) },
          lunch: { enabled: lunchEnabled, time: formatTime(lunchTime) },
          snacks: { enabled: snacksEnabled, time: formatTime(snacksTime) },
          dinner: { enabled: dinnerEnabled, time: formatTime(dinnerTime) },
        },
      };
      await profileApi.setReminderSettings(request);
      await scheduleMealReminders({
        breakfast: { enabled: breakfastEnabled, time: breakfastTime },
        lunch: { enabled: lunchEnabled, time: lunchTime },
        snacks: { enabled: snacksEnabled, time: snacksTime },
        dinner: { enabled: dinnerEnabled, time: dinnerTime },
      });
      Alert.alert('Éxito', 'Ajustes guardados');
      navigation?.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Algo salió mal');
    } finally {
      setIsSaving(false);
    }
  };

  const renderMealSection = (
    title: string,
    enabled: boolean,
    onToggle: (v: boolean) => void,
    time: TimeObj,
    onPickTime: () => void,
  ) => (
    <View key={title}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Recordatorios</Text>
          <Switch
            value={enabled}
            onValueChange={onToggle}
            trackColor={{ false: C.gray70, true: C.orange }}
            thumbColor={enabled ? C.white : C.gray30}
          />
        </View>
        <View style={styles.divider} />
        <Pressable
          style={({ pressed }) => [styles.settingRow, enabled && pressed && { opacity: 0.7 }]}
          onPress={enabled ? onPickTime : undefined}
        >
          <Text style={styles.settingLabel}>Hora</Text>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTimeDisplay(time)}</Text>
            <Ionicons name="chevron-forward" size={20} color={C.gray40} />
          </View>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.header}>Recordatorios de comidas</Text>
        <Pressable onPress={saveSettings} disabled={isSaving} style={({ pressed }) => pressed && { opacity: 0.2 }}>
          <Text style={styles.saveBtn}>Guardar</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {renderMealSection('Desayuno', breakfastEnabled, setBreakfastEnabled, breakfastTime, () =>
          pickTime(breakfastTime, setBreakfastTime)
        )}
        {renderMealSection('Snacks', snacksEnabled, setSnacksEnabled, snacksTime, () =>
          pickTime(snacksTime, setSnacksTime)
        )}
        {renderMealSection('Comida', lunchEnabled, setLunchEnabled, lunchTime, () =>
          pickTime(lunchTime, setLunchTime)
        )}
        {renderMealSection('Cena', dinnerEnabled, setDinnerEnabled, dinnerTime, () =>
          pickTime(dinnerTime, setDinnerTime)
        )}
      </ScrollView>
      {isSaving && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={C.orange} />
        </View>
      )}
    </SafeAreaView>
  );
}
