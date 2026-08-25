import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { FONT } from "../theme";
import { useAppColorMode } from "@helper/useAppColorMode";

const WEEKLY_DATA = [
  { day: "Mon", steps: 6200 },
  { day: "Tue", steps: 8400 },
  { day: "Wed", steps: 5100 },
  { day: "Thu", steps: 12450 },
  { day: "Fri", steps: 7800 },
  { day: "Sat", steps: 9200 },
  { day: "Sun", steps: 3644 },
];

const MAX_STEPS = 12450;
const GOAL = 10000;
const TOTAL = 52794;
const BEST_DAY = 12450;
const AVERAGE = 7542;

export default function StepsInsightScreen() {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  const weeklyPercentage = Math.round((AVERAGE / GOAL) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Weekly Steps</Text>
          <Text style={styles.headerSubtitle}>Average Weekly Steps</Text>
          <Text style={styles.headerValue}>7,542</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.barChart}>
            {WEEKLY_DATA.map((item, index) => (
              <View key={item.day} style={styles.barColumn}>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${(item.steps / MAX_STEPS) * 100}%`,
                        backgroundColor:
                          index === WEEKLY_DATA.length - 1
                            ? C.primary
                            : C.gray + "40",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barDay}>{item.day}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Weekly Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.progressRing}>
              <View style={styles.ringOuter}>
                <View style={styles.ringInner}>
                  <Text style={styles.ringPercent}>{weeklyPercentage}%</Text>
                  <Text style={styles.ringLabel}>of goal</Text>
                </View>
              </View>
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Weekly Progress</Text>
              <Text style={styles.statusSubtitle}>
                {AVERAGE.toLocaleString()} / {GOAL.toLocaleString()} avg
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Ionicons name="footsteps-outline" size={24} color={C.textPrimary} />
              <Text style={styles.metricValue}>{TOTAL.toLocaleString()}</Text>
              <Text style={styles.metricLabel}>Total</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="trophy-outline" size={24} color="#FFD700" />
              <Text style={styles.metricValue}>{BEST_DAY.toLocaleString()}</Text>
              <Text style={styles.metricLabel}>Best Day</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="analytics-outline" size={24} color="#4CAF50" />
              <Text style={styles.metricValue}>{AVERAGE.toLocaleString()}</Text>
              <Text style={styles.metricLabel}>Average</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>["colors"]) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    backgroundColor: "#1A1A2E",
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: "#AAA",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: "#888",
    marginBottom: 8,
  },
  headerValue: {
    fontSize: 40,
    lineHeight: 47,
    fontFamily: FONT.bold,
    color: '#FFFFFF',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: C.text,
    marginBottom: 16,
  },
  barChart: {
    flexDirection: "row",
    height: 160,
    alignItems: "flex-end",
    gap: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
  },
  barWrapper: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: 4,
  },
  barDay: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: C.gray,
    marginTop: 6,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  progressRing: {},
  ringOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: C.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  ringInner: {
    alignItems: "center",
  },
  ringPercent: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: C.textPrimary,
  },
  ringLabel: {
    fontSize: 9,
    fontFamily: FONT.medium,
    color: C.gray,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: C.text,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: C.gray,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: C.text,
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: C.gray,
    marginTop: 4,
  },
  });
}
