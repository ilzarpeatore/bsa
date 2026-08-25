import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsiveStyleSheet } from '@helper/responsiveStyleSheet';
import { useAppColorMode } from '@helper/useAppColorMode';
import { FONT } from './theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function StatCard({ icon, iconColor, value, label, target, progress, bgColor, styles }: any) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: iconColor }]} />
      </View>
      <Text style={styles.statGoal}>Goal: {target}</Text>
    </View>
  );
}

function ActivityListItem({ icon, iconBgColor, iconColor, title, subtitle, time, value, styles }: any) {
  return (
    <View style={styles.activityItem}>
      <View style={[styles.activityIconWrap, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activitySubtitle}>{subtitle}</Text>
        <Text style={styles.activityTime}>{time}</Text>
      </View>
      {value ? <Text style={styles.activityValue}>{value}</Text> : null}
    </View>
  );
}

function Bar({ day, heightFactor, isHighlighted = false, styles, C }: any) {
  return (
    <View style={styles.barCol}>
      <View
        style={[
          styles.bar,
          {
            height: 140 * heightFactor,
            backgroundColor: isHighlighted ? C.orange : 'rgba(255, 152, 0, 0.35)',
            opacity: isHighlighted ? 1 : 0.7,
          },
        ]}
      />
      <Text style={styles.barLabel}>{day}</Text>
    </View>
  );
}

const ACTIVITY_PERIODS = ['Today', 'Week', 'Month', 'Year'];

export default function ActivityTrackerScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const [selectedPeriod, setSelectedPeriod] = useState('Today');
  const periods = ACTIVITY_PERIODS;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.2 }]}
        >
          <Ionicons name="chevron-back" size={24} color={C.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Activity Tracker</Text>
        <Pressable style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.2 }]}>
          <Ionicons name="options-outline" size={22} color={C.gray30} />
        </Pressable>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Period selector */}
        <View style={styles.periodWrap}>
          <View style={styles.periodContainer}>
            {periods.map((period) => {
              const isSelected = period === selectedPeriod;
              return (
                <Pressable
                  key={period}
                  style={({ pressed }) => [
                    styles.periodBtn,
                    isSelected && styles.periodBtnActive,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text style={[styles.periodText, isSelected && styles.periodTextActive]}>
                    {period}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Main stats */}
        <View style={styles.statsRow}>
          <StatCard
            icon="walk-outline"
            iconColor={C.orange}
            value="6,842"
            label="Steps"
            target="10,000"
            progress={0.68}
            bgColor="#431407"
            styles={styles}
          />
          <StatCard
            icon="flame-outline"
            iconColor={C.red}
            value="486"
            label="Calories"
            target="600"
            progress={0.81}
            bgColor="#4C0519"
            styles={styles}
          />
          <StatCard
            icon="timer-outline"
            iconColor={C.blue}
            value="32"
            label="Minutes"
            target="45"
            progress={0.71}
            bgColor="#172554"
            styles={styles}
          />
        </View>

        {/* Weekly overview chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Weekly Overview</Text>
            <Text style={styles.chartSubtitle}>This Week</Text>
          </View>
          <View style={styles.barRow}>
            <Bar day="Mon" heightFactor={0.6} styles={styles} C={C} />
            <Bar day="Tue" heightFactor={0.8} styles={styles} C={C} />
            <Bar day="Wed" heightFactor={0.45} styles={styles} C={C} />
            <Bar day="Thu" heightFactor={0.9} isHighlighted styles={styles} C={C} />
            <Bar day="Fri" heightFactor={0.7} styles={styles} C={C} />
            <Bar day="Sat" heightFactor={0.5} styles={styles} C={C} />
            <Bar day="Sun" heightFactor={0.35} styles={styles} C={C} />
          </View>
        </View>

        {/* Today's activities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Activities</Text>
          <ActivityListItem
            icon="walk-outline"
            iconBgColor="#431407"
            iconColor={C.orange}
            title="Walking"
            subtitle="6,842 steps \u2022 5.2 km"
            time="Today, 8:30 AM"
            value="32 min"
            styles={styles}
          />
          <ActivityListItem
            icon="barbell-outline"
            iconBgColor="#172554"
            iconColor={C.blue}
            title="Upper Body Workout"
            subtitle="12 exercises completed"
            time="Today, 10:00 AM"
            value="45 min"
            styles={styles}
          />
          <ActivityListItem
            icon="water-outline"
            iconBgColor="#1C3D3A"
            iconColor={C.blue}
            title="Water Intake"
            subtitle="1.5L of 2.5L goal"
            time="Throughout the day"
            value=""
            styles={styles}
          />
        </View>
      </ScrollView>
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
    paddingVertical: 12,
    backgroundColor: C.surface,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: FONT.bold, color: C.white },
  body: { flex: 1 },
  periodWrap: { paddingHorizontal: 20, paddingTop: 16 },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 4,
  },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  periodBtnActive: { backgroundColor: C.orange },
  periodText: { fontSize: 13, fontFamily: FONT.semiBold, color: C.gray30, textAlign: 'center' },
  periodTextActive: { color: '#FFFFFF' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 24, gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
  },
  statIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 24, lineHeight: 29, fontFamily: FONT.bold, color: C.white, marginTop: 12 },
  statLabel: { fontSize: 12, fontFamily: FONT.regular, color: C.gray30, marginTop: 2 },
  progressTrack: { height: 4, backgroundColor: C.bg, borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 4 },
  statGoal: { fontSize: 10, fontFamily: FONT.regular, color: C.gray30, marginTop: 4 },
  chartCard: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartTitle: { fontSize: 16, fontFamily: FONT.semiBold, color: C.white },
  chartSubtitle: { fontSize: 12, fontFamily: FONT.regular, color: C.gray30 },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
    marginTop: 20,
  },
  barCol: { alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 32, borderRadius: 8 },
  barLabel: { fontSize: 11, fontFamily: FONT.regular, color: C.gray30, marginTop: 8 },
  section: { paddingHorizontal: 20, marginTop: 24, marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontFamily: FONT.bold, color: C.white, marginBottom: 16 },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  activityIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  activityInfo: { flex: 1, marginLeft: 14 },
  activityTitle: { fontSize: 15, fontFamily: FONT.semiBold, color: C.white },
  activitySubtitle: { fontSize: 12, fontFamily: FONT.regular, color: C.gray30, marginTop: 4 },
  activityTime: { fontSize: 11, fontFamily: FONT.regular, color: C.gray50, marginTop: 2 },
  activityValue: { fontSize: 14, fontFamily: FONT.semiBold, color: C.orange },
  });
}
