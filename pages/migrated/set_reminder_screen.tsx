import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyleSheet } from '@helper/responsiveStyleSheet';
import { useAppColorMode } from '@helper/useAppColorMode';
import { scheduleCustomReminder } from '@helper/reminderNotifications';
import { addCustomReminder } from '@helper/customRemindersStorage';
import { FONT } from './theme';

interface Props {
  isDaily?: boolean;
}

const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const weekdayLetters = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function formatHour(h: number): string {
  const hour12 = h % 12 || 12;
  return String(hour12).padStart(2, '0');
}
function formatMinute(m: number): string {
  return String(m).padStart(2, '0');
}

export default function SetReminderScreen(props: any) {
  const isDaily = props.route?.params?.isDaily ?? false;
  const [dateTime, setDateTime] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [reminderName, setReminderName] = useState('');
  const [description, setDescription] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const { colors: C } = useAppColorMode();
  const s = useMemo(() => createStyles(C), [C]);
  const styles = useStyle();

  const toggleDay = (index: number) => {
    setSelectedDays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleEveryDay = () => {
    setSelectedDays((prev) => {
      if (prev.size === 7) {
        return new Set();
      }
      return new Set([0, 1, 2, 3, 4, 5, 6]);
    });
  };

  const handleTimeChange = (hour: number, minute: number) => {
    const newDate = new Date(dateTime);
    newDate.setHours(hour);
    newDate.setMinutes(minute);
    setDateTime(newDate);
  };

  const handleSave = async () => {
    if (!reminderName.trim()) {
      Alert.alert('Error', 'Introduce un nombre para el recordatorio');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Introduce una descripción');
      return;
    }

    if (!isDaily && selectedDays.size === 0) {
      Alert.alert('Error', 'Selecciona al menos un día');
      return;
    }

    const time = { hour: dateTime.getHours(), minute: dateTime.getMinutes() };
    const days = Array.from(selectedDays);
    const title = reminderName.trim();
    const desc = description.trim();

    const notificationIds = await scheduleCustomReminder({ title, description: desc, time, days, isDaily });
    if (notificationIds.length === 0) {
      Alert.alert('Permiso necesario', 'Activa las notificaciones para poder crear recordatorios.');
      return;
    }

    await addCustomReminder({
      id: Date.now().toString(),
      title,
      description: desc,
      time,
      days,
      isDaily,
      notificationIds,
    });

    props.navigation.goBack();
  };

  const isAM = dateTime.getHours() < 12;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Pressable
          onPress={() => props.navigation.goBack()}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.2 }]}
        >
          <Ionicons name="chevron-back" size={24} color={C.white} />
        </Pressable>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* Time Picker */}
        <View style={s.timePickerContainer}>
          <Pressable
            style={({ pressed }) => [s.timeUnit, pressed && { opacity: 0.2 }]}
            onPress={() => handleTimeChange((dateTime.getHours() + 1) % 24, dateTime.getMinutes())}
          >
            <Ionicons name="chevron-up" size={24} color={C.gray30} />
          </Pressable>
          <View style={s.timeDisplay}>
            <Text style={[s.timeText, styles.fontBold]}>{formatHour(dateTime.getHours())}</Text>
            <Text style={[s.timeSeparator, styles.fontBold]}>:</Text>
            <Text style={[s.timeText, styles.fontBold]}>{formatMinute(dateTime.getMinutes())}</Text>
            <View style={s.ampmContainer}>
              <Pressable
                style={({ pressed }) => [s.ampmBtn, isAM && s.ampmBtnActive, pressed && { opacity: 0.2 }]}
                onPress={() => {
                  if (!isAM) handleTimeChange(dateTime.getHours() - 12, dateTime.getMinutes());
                }}
              >
                <Text style={[s.ampmText, isAM && s.ampmTextActive]}>AM</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.ampmBtn, !isAM && s.ampmBtnActive, pressed && { opacity: 0.2 }]}
                onPress={() => {
                  if (isAM) handleTimeChange(dateTime.getHours() + 12, dateTime.getMinutes());
                }}
              >
                <Text style={[s.ampmText, !isAM && s.ampmTextActive]}>PM</Text>
              </Pressable>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [s.timeUnit, pressed && { opacity: 0.2 }]}
            onPress={() => handleTimeChange((dateTime.getHours() + 23) % 24, dateTime.getMinutes())}
          >
            <Ionicons name="chevron-down" size={24} color={C.gray30} />
          </Pressable>
        </View>

        <View style={s.divider} />

        {/* Repeat Days (only when not daily) */}
        {!isDaily && (
          <View style={s.repeatSection}>
            <Text style={[s.sectionTitle, styles.fontBold]}>Repetir</Text>
            <Pressable onPress={toggleEveryDay} style={({ pressed }) => pressed && { opacity: 0.2 }}>
              <Text style={[s.everyDayText, { color: C.textPrimary }]}>Todos los días</Text>
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayChips}>
              {weekdays.map((day, index) => {
                const isSelected = selectedDays.has(index);
                return (
                  <Pressable
                    key={day}
                    style={({ pressed }) => [s.dayChip, isSelected && s.dayChipSelected, pressed && { opacity: 0.2 }]}
                    onPress={() => toggleDay(index)}
                  >
                    <Text style={[s.dayChipText, isSelected && s.dayChipTextSelected, styles.fontBold]}>
                      {weekdayLetters[index]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Reminder Name */}
        <Text style={[s.label, styles.fontRegular]}>Nombre del recordatorio</Text>
        <TextInput
          style={[s.textInput, styles.fontRegular]}
          placeholder="Introduce el nombre del recordatorio"
          placeholderTextColor={C.gray50}
          value={reminderName}
          onChangeText={setReminderName}
        />

        {/* Description */}
        <Text style={[s.label, styles.fontRegular]}>Descripción</Text>
        <TextInput
          style={[s.textInput, styles.fontRegular]}
          placeholder="Introduce una descripción"
          placeholderTextColor={C.gray50}
          value={description}
          onChangeText={setDescription}
        />

        {/* Save Button */}
        <Pressable style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.2 }]} onPress={handleSave}>
          <Text style={[s.saveBtnText, styles.fontSemiBold]}>Guardar</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    backBtn: { width: 40, alignItems: 'center' },
    scrollContent: { padding: 16 },
    timePickerContainer: { alignItems: 'center', paddingVertical: 20 },
    timeUnit: { padding: 12 },
    timeDisplay: { flexDirection: 'row', alignItems: 'center' },
    timeText: { fontSize: 48, lineHeight: 57, color: C.white },
    timeSeparator: { fontSize: 48, lineHeight: 57, color: C.white, marginHorizontal: 4 },
    ampmContainer: { marginLeft: 16, flexDirection: 'column' },
    ampmBtn: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
    ampmBtnActive: { backgroundColor: C.brand5 },
    ampmText: { fontSize: 14, color: C.gray40, fontWeight: '600' },
    ampmTextActive: { color: C.white },
    divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
    repeatSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 20, color: C.white, marginBottom: 8 },
    everyDayText: { fontSize: 14, marginBottom: 16 },
    dayChips: { paddingBottom: 8 },
    dayChip: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: `${C.brand5}20`,
      marginRight: 12,
    },
    dayChipSelected: { backgroundColor: C.brand5 },
    dayChipText: { fontSize: 16, color: C.textPrimary },
    dayChipTextSelected: { color: C.white },
    label: { fontSize: 14, color: C.white, marginBottom: 8 },
    textInput: {
      backgroundColor: C.surfaceLight,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      color: C.white,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      marginBottom: 24,
    },
    saveBtn: {
      backgroundColor: C.brand5,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    saveBtnText: { fontSize: 16, color: C.white },
  });
}

function useStyle() {
  return useResponsiveStyleSheet({
    fontBold: { fontFamily: FONT.bold },
    fontMedium: { fontFamily: FONT.medium },
    fontRegular: { fontFamily: FONT.regular },
    fontSemiBold: { fontFamily: FONT.semiBold },
  });
}
