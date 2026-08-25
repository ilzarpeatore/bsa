import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useResponsiveStyleSheet } from '@helper/responsiveStyleSheet';
import { getCustomReminders, removeCustomReminder, CustomReminder } from '@helper/customRemindersStorage';
import { cancelNotifications } from '@helper/reminderNotifications';
import { useAppColorMode } from '@helper/useAppColorMode';
import { FONT } from './theme';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatTime(item: CustomReminder): string {
  const d = new Date();
  d.setHours(item.time.hour, item.time.minute, 0, 0);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDays(item: CustomReminder): string {
  if (item.isDaily) return 'Every day';
  return item.days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(', ');
}

export default function ReminderScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const s = useMemo(() => createStyles(C), [C]);
  const [remindList, setRemindList] = useState<CustomReminder[]>([]);
  const styles = useStyle();

  useFocusEffect(
    useCallback(() => {
      loadReminders();
    }, [])
  );

  const loadReminders = async () => {
    setRemindList(await getCustomReminders());
  };

  const handleAddReminder = () => {
    props.navigation.navigate('MigratedSetReminder');
  };

  const handleDeleteReminder = (item: CustomReminder) => {
    Alert.alert('Eliminar recordatorio', `¿Quitar "${item.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await cancelNotifications(item.notificationIds);
          await removeCustomReminder(item.id);
          setRemindList((prev) => prev.filter((r) => r.id !== item.id));
        },
      },
    ]);
  };

  const handleMealsWater = () => {
    props.navigation.navigate('MigratedMealsWaterReminder');
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Pressable
          onPress={() => props.navigation.goBack()}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.2 }]}
        >
          <Ionicons name="chevron-back" size={24} color={C.white} />
        </Pressable>
        <Text style={[s.headerTitle, styles.fontBold]}>Daily Reminders</Text>
        <Pressable
          onPress={handleAddReminder}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.2 }]}
        >
          <Ionicons name="add" size={28} color={C.textPrimary} />
        </Pressable>
      </View>

      <View style={s.body}>
        {/* Meals & Water */}
        <Pressable
          style={({ pressed }) => [s.mealsCard, pressed && { opacity: 0.2 }]}
          onPress={handleMealsWater}
        >
          <Text style={[s.mealsTitle, styles.fontRegular]}>Meals & Water</Text>
          <Ionicons name="chevron-forward" size={20} color={C.gray30} />
        </Pressable>

        {remindList.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={80} color={C.gray50} />
            <Text style={[s.emptyTitle, styles.fontBold]}>No reminders</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.listContent}>
            {remindList.map((item) => {
              return (
                <View key={item.id} style={s.reminderCard}>
                  <View style={s.reminderContent}>
                    <View style={s.reminderTextWrap}>
                      <Text style={[s.reminderTitle, styles.fontBold]}>{item.title}</Text>
                      <Text style={[s.reminderSubtitle, styles.fontRegular]}>
                        {formatDays(item)} {formatTime(item)} | {item.description}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleDeleteReminder(item)}
                      style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.2 }]}
                    >
                      <Ionicons name="trash-outline" size={22} color={C.gray30} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    backBtn: { width: 40, alignItems: 'center' },
    headerTitle: { fontSize: 18, color: C.white, flex: 1, textAlign: 'center' },
    body: { flex: 1 },
    mealsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
      padding: 16,
      backgroundColor: C.surfaceLight,
      borderRadius: 12,
    },
    mealsTitle: { fontSize: 16, color: C.white },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyTitle: { fontSize: 18, color: C.gray30, marginTop: 16 },
    listContent: { padding: 16 },
    reminderCard: {
      marginBottom: 16,
      padding: 16,
      backgroundColor: C.surfaceLight,
      borderRadius: 12,
    },
    reminderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    reminderTextWrap: { flex: 1, marginRight: 12 },
    reminderTitle: { fontSize: 18, color: C.white },
    reminderSubtitle: { fontSize: 14, color: C.gray30, marginTop: 6 },
    deleteBtn: { padding: 4 },
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
