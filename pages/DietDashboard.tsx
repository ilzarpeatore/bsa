import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useResponsiveStyleSheet } from "@helper/responsiveStyleSheet";
import { useColors } from "@constants/colors";
import { dietApi, DietListItem, AssignedMealsSummary } from "../api/diet";
import { DietGridCardMem } from "../components/DietGridCard";
import { EmptyStateMem } from "../components/EmptyState";
import { ErrorRetryMem } from "../components/ErrorRetry";
import { LoadingSkeletonMem } from "../components/LoadingSkeleton";

interface Props {
  navigation: any;
}

export default function DietDashboard({ navigation }: Props) {
  const Colors = useColors();
  const styles = useStyle();
  const [otherDiets, setOtherDiets] = useState<DietListItem[]>([]);
  const [assignedMealsGoal, setAssignedMealsGoal] = useState<AssignedMealsSummary["goal"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashboardRes, assignedMealsRes] = await Promise.allSettled([
        dietApi.getDashboard(),
        dietApi.getAssignedMealsSummary(),
      ]);
      if (dashboardRes.status === "fulfilled") {
        setOtherDiets(dashboardRes.value.data?.diet ?? []);
      }
      if (assignedMealsRes.status === "fulfilled") {
        setAssignedMealsGoal(assignedMealsRes.value.data?.goal ?? null);
      }
      if (dashboardRes.status === "rejected") {
        setError("Failed to load diet dashboard.");
      }
    } catch {
      setError("Failed to load diet dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const openDietDetail = useCallback(
    (id: number, title: string) => {
      navigation.navigate("Migrated", {
        screen: "MigratedAssignedMeals",
        params: { dietId: id, dietTitle: title },
      });
    },
    [navigation]
  );

  const toggleFavourite = useCallback(async (dietId: number) => {
    setOtherDiets((prev) =>
      prev.map((d) => (d.id === dietId ? { ...d, is_favourite: d.is_favourite === 1 ? 0 : 1 } : d))
    );
    try {
      await dietApi.setFavourite(dietId);
    } catch {
      setOtherDiets((prev) =>
        prev.map((d) => (d.id === dietId ? { ...d, is_favourite: d.is_favourite === 1 ? 0 : 1 } : d))
      );
    }
  }, []);

  if (loading && !refreshing) {
    return (
      <View
        style={styles.bg}
      >
        <SafeAreaView style={styles.container} edges={["right", "left", "top"]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [
                { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
                pressed && { opacity: 0.2 },
              ]}
            >
              <Ionicons name="chevron-back" size={22} color="#000000" />
            </Pressable>
            <Text style={{ flex: 1, fontSize: 18, fontFamily: 'Gilroy-Bold', color: '#000000' }}>Diet</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.skeletonWrap}>
            <LoadingSkeletonMem width="100%" height="120@ratio" borderRadius={16} />
            <View style={{ height: 16 }} />
            <LoadingSkeletonMem width="100%" height="180@ratio" borderRadius={16} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <View
        style={styles.bg}
      >
        <SafeAreaView style={styles.container} edges={["right", "left", "top"]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [
                { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
                pressed && { opacity: 0.2 },
              ]}
            >
              <Ionicons name="chevron-back" size={22} color="#000000" />
            </Pressable>
            <Text style={{ flex: 1, fontSize: 18, fontFamily: 'Gilroy-Bold', color: '#000000' }}>Diet</Text>
            <View style={{ width: 40 }} />
          </View>
          <ErrorRetryMem message={error} onRetry={fetchData} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.container} edges={["right", "left", "top"]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
              pressed && { opacity: 0.2 },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color="#000000" />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontFamily: 'Gilroy-Bold', color: '#000000' }}>Diet</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.ACCENT_START}
            />
          }
        >
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Asignado a mí</Text>
              </View>
              <Pressable
                style={({ pressed }) => pressed && { opacity: 0.85 }}
                onPress={() => navigation.navigate("Migrated", { screen: "MigratedAssignedMeals" })}
              >
                <LinearGradient
                  start={{ x: 0.24, y: -0.09 }}
                  end={{ x: 0.78, y: 0.93 }}
                  colors={[Colors.CARD_START, Colors.CARD_END]}
                  style={styles.summaryCard}
                >
                  <View style={styles.summaryKcalRow}>
                    <Ionicons name="flame-outline" size={26} color={Colors.TEXT_PRIMARY} />
                    <Text style={styles.summaryKcalValue}>{assignedMealsGoal?.kcal ?? 0}</Text>
                    <Text style={styles.summaryKcalLabel}>kcal / objetivo diario</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{assignedMealsGoal?.protein ?? 0}g</Text>
                      <Text style={styles.summaryLabel}>Proteína</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{assignedMealsGoal?.carbs ?? 0}g</Text>
                      <Text style={styles.summaryLabel}>Carbohidratos</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{assignedMealsGoal?.fats ?? 0}g</Text>
                      <Text style={styles.summaryLabel}>Grasas</Text>
                    </View>
                  </View>
                  <View style={styles.viewPlanRow}>
                    <Text style={styles.viewPlanText}>Ver mis comidas asignadas</Text>
                    <Ionicons name="arrow-forward" size={14} color={Colors.TEXT_PRIMARY} />
                  </View>
                </LinearGradient>
              </Pressable>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Otras dietas</Text>
                <Pressable
                  onPress={() => navigation.navigate("DietList")}
                  style={({ pressed }) => pressed && { opacity: 0.2 }}
                >
                  <Text style={styles.viewAll}>View All</Text>
                </Pressable>
              </View>
              {otherDiets.length === 0 ? (
                <EmptyStateMem
                  icon="nutrition-outline"
                  title="No Diets Yet"
                  message="Your coach hasn't published any public diets yet."
                />
              ) : (
                <View style={styles.grid}>
                  {otherDiets.map((item) => (
                    <DietGridCardMem
                      key={item.id.toString()}
                      title={item.title}
                      calories={Number(item.calories)}
                      totalTime={item.total_time}
                      image={item.diet_image}
                      isFavourite={item.is_favourite === 1}
                      onPress={() => openDietDetail(item.id, item.title)}
                      onToggleFavourite={() => toggleFavourite(item.id)}
                    />
                  ))}
                </View>
              )}
            </View>
          </>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function useStyle() {
  const Colors = useColors();
  return useResponsiveStyleSheet({
    bg: {
      width: "100%",
      height: "100%",
      backgroundColor: Colors.BG_PRIMARY,
    },
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: "16@ratio",
      paddingVertical: "16@ratio",
    },
    headerTitle: {
      fontFamily: "Gilroy-ExtraBold",
      fontSize: "24@ratio",
      color: Colors.TEXT_PRIMARY,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: "16@ratio",
      paddingBottom: "32@ratio",
    },
    skeletonWrap: {
      paddingHorizontal: "16@ratio",
      paddingTop: "16@ratio",
    },
    summaryCard: {
      borderRadius: "16@ratio",
      padding: "20@ratio",
      marginBottom: "24@ratio",
    },
    summaryKcalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: "8@ratio",
      marginBottom: "16@ratio",
    },
    summaryKcalValue: {
      fontFamily: "Gilroy-ExtraBold",
      fontSize: "22@ratio",
      color: Colors.TEXT_PRIMARY,
    },
    summaryKcalLabel: {
      fontFamily: "Gilroy-Regular",
      fontSize: "12@ratio",
      color: Colors.TEXT_SECONDARY,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
    },
    summaryItem: {
      alignItems: "center",
    },
    summaryValue: {
      fontFamily: "Gilroy-Bold",
      fontSize: "20@ratio",
      color: Colors.TEXT_PRIMARY,
      marginTop: "8@ratio",
    },
    summaryLabel: {
      fontFamily: "Gilroy-Regular",
      fontSize: "12@ratio",
      color: Colors.TEXT_SECONDARY,
      marginTop: "4@ratio",
    },
    summaryDivider: {
      width: 1,
      height: "40@ratio",
      backgroundColor: Colors.TEXT_MUTED,
    },
    viewPlanRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: "6@ratio",
      marginTop: "16@ratio",
      paddingTop: "12@ratio",
      borderTopWidth: 1,
      borderTopColor: "#E5E5EA",
    },
    viewPlanText: {
      fontFamily: "Gilroy-SemiBold",
      fontSize: "13@ratio",
      color: Colors.TEXT_PRIMARY,
    },
    section: {
      marginBottom: "24@ratio",
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "12@ratio",
    },
    sectionTitle: {
      fontFamily: "Gilroy-Bold",
      fontSize: "18@ratio",
      color: Colors.TEXT_PRIMARY,
    },
    viewAll: {
      fontFamily: "Gilroy-SemiBold",
      fontSize: "14@ratio",
      color: Colors.TEXT_SECONDARY,
    },
  }, [Colors]);
}
