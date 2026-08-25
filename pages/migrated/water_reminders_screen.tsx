import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator, Modal, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyleSheet } from '@helper/responsiveStyleSheet';
import { profileApi } from '@api/profile';
import { useAuth } from '@store/AuthContext';
import { scheduleWaterReminders } from '@helper/reminderNotifications';
import { FONT } from './theme';
import { useAppColorMode } from '@helper/useAppColorMode';

function formatTime(hour: number, minute: number) {
  const h = hour.toString().padStart(2, '0');
  const m = minute.toString().padStart(2, '0');
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h12}:${m} ${period}`;
}

// Fuera del componente para no reconstruir el array en cada render del picker.
const EVERY_HOURS_OPTIONS = Array.from({ length: 24 }, (_, i) => i + 1);

export default function WaterRemindersScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  // Dentro del componente (no a nivel de módulo) para poder capturar `C` y
  // `styles` -- ambos dependen del tema en vivo.
  const renderRow = (title: string, value: string, onPress?: () => void) => (
    <Pressable
      style={({ pressed }) => [styles.row, !!onPress && pressed && { opacity: 0.2 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.rowTitle}>{title}</Text>
      <View style={styles.rowTrailing}>
        <Text style={styles.rowValue}>{value}</Text>
        <Ionicons name="chevron-forward" size={20} color={C.gray30} />
      </View>
    </Pressable>
  );
  const { state } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [everyHours, setEveryHours] = useState(1);
  const [fromHour, setFromHour] = useState(8);
  const [fromMinute, setFromMinute] = useState(0);
  const [untilHour, setUntilHour] = useState(20);
  const [untilMinute, setUntilMinute] = useState(0);
  const [atHour, setAtHour] = useState(8);
  const [atMinute, setAtMinute] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showEveryPicker, setShowEveryPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<'from' | 'until' | 'at' | null>(null);
  const [pickerHour, setPickerHour] = useState(0);
  const [pickerMinute, setPickerMinute] = useState(0);

  const is24Hours = everyHours === 24;

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const settings = state.user?.user_profile?.water_reminder_settings;
    if (settings) {
      setEnabled(settings.enabled ?? true);
      if (settings.start) {
        const [h, m] = String(settings.start).split(':').map(Number);
        setFromHour(h);
        setFromMinute(m);
      }
      if (settings.end) {
        const [h, m] = String(settings.end).split(':').map(Number);
        setUntilHour(h);
        setUntilMinute(m);
      }
      const interval = settings.interval ?? 60;
      setEveryHours(interval >= 60 ? Math.floor(interval / 60) : 1);
      if (settings.at_time) {
        const [h, m] = String(settings.at_time).split(':').map(Number);
        setAtHour(h);
        setAtMinute(m);
      }
    }
  };

  const openTimePicker = (type: 'from' | 'until' | 'at') => {
    if (type === 'from') {
      setPickerHour(fromHour);
      setPickerMinute(fromMinute);
    } else if (type === 'until') {
      setPickerHour(untilHour);
      setPickerMinute(untilMinute);
    } else {
      setPickerHour(atHour);
      setPickerMinute(atMinute);
    }
    setShowTimePicker(type);
  };

  const confirmTimePicker = () => {
    if (showTimePicker === 'from') {
      setFromHour(pickerHour);
      setFromMinute(pickerMinute);
    } else if (showTimePicker === 'until') {
      setUntilHour(pickerHour);
      setUntilMinute(pickerMinute);
    } else if (showTimePicker === 'at') {
      setAtHour(pickerHour);
      setAtMinute(pickerMinute);
    }
    setShowTimePicker(null);
  };

  const saveSettings = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const pad = (n: number) => n.toString().padStart(2, '0');

    const request: any = {
      water_reminder_settings: {
        enabled,
        interval: everyHours * 60,
      },
    };

    if (is24Hours) {
      request.water_reminder_settings.at_time = `${pad(atHour)}:${pad(atMinute)}`;
    } else {
      request.water_reminder_settings.start = `${pad(fromHour)}:${pad(fromMinute)}`;
      request.water_reminder_settings.end = `${pad(untilHour)}:${pad(untilMinute)}`;
    }

    try {
      await profileApi.setReminderSettings(request);
      await scheduleWaterReminders({
        enabled,
        is24Hours,
        intervalMinutes: everyHours * 60,
        start: is24Hours ? undefined : { hour: fromHour, minute: fromMinute },
        end: is24Hours ? undefined : { hour: untilHour, minute: untilMinute },
        atTime: is24Hours ? { hour: atHour, minute: atMinute } : undefined,
      });
      Alert.alert('Éxito', 'Datos guardados');
      props.navigation?.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e.toString());
    } finally {
      setIsSaving(false);
    }
  };

  const renderEveryPickerItem = ({ item }: { item: number }) => (
    <Pressable
      style={({ pressed }) => [styles.pickerItem, pressed && { opacity: 0.2 }]}
      onPress={() => {
        setEveryHours(item);
        setShowEveryPicker(false);
      }}
    >
      <Text style={styles.pickerItemText}>
        {item === 1 ? '1 hora' : `${item} horas`}
      </Text>
      {item === everyHours && <Ionicons name="checkmark" size={22} color={C.textPrimary} />}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => props.navigation?.goBack()} style={({ pressed }) => pressed && { opacity: 0.2 }}>
          <Ionicons name="chevron-back" size={24} color={C.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Recordatorios de agua</Text>
        <Pressable
          onPress={saveSettings}
          disabled={isSaving}
          style={({ pressed }) => pressed && { opacity: 0.2 }}
        >
          <Text style={styles.saveBtn}>Guardar</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={styles.rowTitle}>Recordatorios</Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: C.gray70, true: C.brand5 }}
              thumbColor={enabled ? C.amber : C.gray30}
            />
          </View>
          <View style={styles.divider} />

          {renderRow(
            'Cada',
            everyHours === 1 ? '1 hora' : `${everyHours} horas`,
            enabled ? () => setShowEveryPicker(true) : undefined,
          )}
          <View style={styles.divider} />

          {!is24Hours ? (
            <>
              {renderRow(
                'Desde',
                formatTime(fromHour, fromMinute),
                enabled ? () => openTimePicker('from') : undefined,
              )}
              <View style={styles.divider} />
              {renderRow(
                'Hasta',
                formatTime(untilHour, untilMinute),
                enabled ? () => openTimePicker('until') : undefined,
              )}
            </>
          ) : (
            renderRow(
              'A las',
              formatTime(atHour, atMinute),
              enabled ? () => openTimePicker('at') : undefined,
            )
          )}
        </View>

        {isSaving && (
          <View style={styles.savingOverlay}>
            <ActivityIndicator size="large" color={C.orange} />
          </View>
        )}
      </View>

      {/* Every Hours Picker Modal */}
      <Modal visible={showEveryPicker} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEveryPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar intervalo</Text>
            <FlatList
              data={EVERY_HOURS_OPTIONS}
              renderItem={renderEveryPickerItem}
              keyExtractor={(item) => item.toString()}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
              style={{ maxHeight: 400 }}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={showTimePicker !== null} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTimePicker(null)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar hora</Text>
            <View style={styles.timePickerRow}>
              <View style={styles.timeColumn}>
                <Pressable
                  style={({ pressed }) => [styles.timeArrow, pressed && { opacity: 0.2 }]}
                  onPress={() => setPickerHour((prev) => (prev + 1) % 24)}
                >
                  <Ionicons name="chevron-up" size={28} color={C.white} />
                </Pressable>
                <Text style={styles.timeValue}>{pickerHour.toString().padStart(2, '0')}</Text>
                <Pressable
                  style={({ pressed }) => [styles.timeArrow, pressed && { opacity: 0.2 }]}
                  onPress={() => setPickerHour((prev) => (prev + 23) % 24)}
                >
                  <Ionicons name="chevron-down" size={28} color={C.white} />
                </Pressable>
              </View>
              <Text style={styles.timeSeparator}>:</Text>
              <View style={styles.timeColumn}>
                <Pressable
                  style={({ pressed }) => [styles.timeArrow, pressed && { opacity: 0.2 }]}
                  onPress={() => setPickerMinute((prev) => (prev + 5) % 60)}
                >
                  <Ionicons name="chevron-up" size={28} color={C.white} />
                </Pressable>
                <Text style={styles.timeValue}>{pickerMinute.toString().padStart(2, '0')}</Text>
                <Pressable
                  style={({ pressed }) => [styles.timeArrow, pressed && { opacity: 0.2 }]}
                  onPress={() => setPickerMinute((prev) => (prev + 55) % 60)}
                >
                  <Ionicons name="chevron-down" size={28} color={C.white} />
                </Pressable>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.2 }]}
              onPress={confirmTimePicker}
            >
              <Text style={styles.confirmBtnText}>Confirmar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 18,
    color: C.white,
  },
  saveBtn: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: C.textPrimary,
  },
  body: { flex: 1, padding: 16 },
  card: {
    backgroundColor: C.surfaceLight,
    borderRadius: 12,
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowTitle: {
    fontFamily: FONT.medium,
    fontSize: 16,
    color: C.white,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: C.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 18,
    color: C.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  pickerItemText: {
    fontFamily: FONT.regular,
    fontSize: 16,
    color: C.white,
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  timeColumn: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  timeArrow: {
    padding: 8,
  },
  timeValue: {
    fontFamily: FONT.bold,
    fontSize: 40,
    lineHeight: 47,
    color: C.white,
    marginVertical: 4,
  },
  timeSeparator: {
    fontFamily: FONT.bold,
    fontSize: 40,
    lineHeight: 47,
    color: C.white,
  },
  confirmBtn: {
    backgroundColor: C.brand5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmBtnText: {
    fontFamily: FONT.bold,
    fontSize: 16,
    color: C.white,
  },
  });
}
