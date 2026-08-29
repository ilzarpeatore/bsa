import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  FlatList,
  Text,
  View,
  Pressable,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useResponsiveStyleSheet } from "@helper/responsiveStyleSheet";
import { useColors } from "@constants/colors";
import { GRADIENT } from "./migrated/theme";
import { dietApi, DietListItem, DietCategory } from "../api/diet";
import { DietCardMem } from "../components/DietCard";
import { EmptyStateMem } from "../components/EmptyState";
import { ErrorRetryMem } from "../components/ErrorRetry";
import { LoadingSkeletonMem } from "../components/LoadingSkeleton";

interface Props {
  navigation: any;
}

// Constantes del gradiente del chip activo, fuera del componente para no
// reconstruir el objeto en cada render de cada fila del FlatList -- los
// colores (que si dependen del tema) se calculan aparte, dentro del
// componente, via useMemo (ver CHIP_GRADIENT_COLORS mas abajo).
const CHIP_GRADIENT_START = { x: 0.24, y: -0.09 };
const CHIP_GRADIENT_END = { x: 0.78, y: 0.93 };
const ALL_CATEGORY: DietCategory = { id: 0, title: "All", categorydiet_image: "" } as DietCategory;

export default function DietList({ navigation }: Props) {
  const Colors = useColors();
  // Antes Colors.ACCENT_START/END (gris) -- color de marca en el chip
  // activo (pedido explícito 2026-08-29, "todos los botones"). GRADIENT.brand
  // no depende del tema (ver theme.ts), así que no hace falta memoizarlo
  // sobre Colors, pero se mantiene el useMemo para no tocar la firma del
  // resto del componente.
  const CHIP_GRADIENT_COLORS = useMemo<[string, string]>(() => [...GRADIENT.brand], []);
  const styles = useStyle();
  const [data, setData] = useState<DietListItem[]>([]);
  const [categories, setCategories] = useState<DietCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const pageRef = useRef(1);
  const totalPagesRef = useRef(1);
  const [loading, setLoading] = useState(true);
  const loadingMoreRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(
    async (catId?: number | null, search?: string, pageNum: number = 1) => {
      try {
        if (pageNum === 1) setLoading(true);
        setError(null);
        let res;
        if (search && search.trim().length > 0) {
          res = await dietApi.search(search.trim(), pageNum);
        } else {
          res = await dietApi.getList({
            categorydiet_id: catId ?? undefined,
            page: pageNum,
          });
        }
        if (pageNum === 1) {
          setData(res.data?.data ?? []);
        } else {
          setData((prev) => [...prev, ...(res.data?.data ?? [])]);
        }
        totalPagesRef.current = res.data?.pagination?.totalPages ?? 1;
      } catch {
        setError("Failed to load diet list.");
      } finally {
        setLoading(false);
        loadingMoreRef.current = false;
      }
    },
    []
  );

  const fetchCategories = useCallback(async () => {
    try {
      const res = await dietApi.getCategories();
      setCategories(res.data?.data ?? []);
    } catch {
      // categories are optional, fail silently
    }
  }, []);

  useEffect(() => {
    // Carga inicial: usa los valores por defecto directamente (no
    // selectedCategory/searchQuery, que siempre valen null/'' en este punto)
    // para no depender de estado y evitar que este efecto de montaje se
    // repita cuando el usuario cambia de categoria o busca (eso ya lo
    // disparan onCategoryPress/onSearchChange).
    fetchData(null, "", 1);
    fetchCategories();
  }, [fetchData, fetchCategories]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    pageRef.current = 1;
    await fetchData(selectedCategory, searchQuery, 1);
    setRefreshing(false);
  }, [selectedCategory, searchQuery, fetchData]);

  const onCategoryPress = useCallback(
    (catId: number | null) => {
      setSelectedCategory(catId);
      pageRef.current = 1;
      setSearchQuery("");
      fetchData(catId, "", 1);
    },
    [fetchData]
  );

  const onSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => {
        pageRef.current = 1;
        fetchData(selectedCategory, text, 1);
      }, 500);
    },
    [selectedCategory, fetchData]
  );

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || pageRef.current >= totalPagesRef.current) return;
    loadingMoreRef.current = true;
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    fetchData(selectedCategory, searchQuery, nextPage);
  }, [selectedCategory, searchQuery, fetchData]);

  const categoryFilterData = useMemo(
    () => [ALL_CATEGORY, ...categories],
    [categories]
  );

  const handleCategoryChipPress = useCallback(
    (catId: number) => {
      onCategoryPress(catId === 0 ? null : catId);
      setCategoryFilterOpen(false);
    },
    [onCategoryPress]
  );

  const renderCategoryItem = useCallback(
    ({ item }: { item: DietCategory }) => {
      const isActive =
        item.id === 0 ? selectedCategory === null : selectedCategory === item.id;
      return (
        <Pressable
          onPress={() => handleCategoryChipPress(item.id)}
          style={({ pressed }) => pressed && { opacity: 0.85 }}
        >
          {isActive ? (
            <LinearGradient
              start={CHIP_GRADIENT_START}
              end={CHIP_GRADIENT_END}
              colors={CHIP_GRADIENT_COLORS}
              style={styles.chip}
            >
              <Text style={styles.chipTextActive}>{item.title}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.chipInactive}>
              <Text style={styles.chipText}>{item.title}</Text>
            </View>
          )}
        </Pressable>
      );
    },
    [selectedCategory, handleCategoryChipPress, styles]
  );

  const handleDietPress = useCallback(
    (dietId: number, dietTitle: string) => {
      navigation.navigate("Migrated", {
        screen: "MigratedAssignedMeals",
        params: { dietId, dietTitle },
      });
    },
    [navigation]
  );

  const renderDietItem = useCallback(
    ({ item }: { item: DietListItem }) => (
      <View style={styles.cardWrap}>
        <DietCardMem
          title={item.title}
          calories={Number(item.calories)}
          image={item.diet_image}
          onPress={() => handleDietPress(item.id, item.title)}
        />
      </View>
    ),
    [styles, handleDietPress]
  );

  const renderHeader = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={Colors.TEXT_MUTED} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search diets..."
          placeholderTextColor={Colors.TEXT_MUTED}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => onSearchChange("")} style={({ pressed }) => pressed && { opacity: 0.2 }}>
            <Ionicons name="close-circle" size={20} color={Colors.TEXT_MUTED} />
          </Pressable>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [styles.filterToggle, pressed && { opacity: 0.85 }]}
        onPress={() => setCategoryFilterOpen((v) => !v)}
      >
        <Ionicons name="filter-outline" size={16} color={Colors.TEXT_PRIMARY} />
        <Text style={styles.filterToggleText}>
          {selectedCategory === null
            ? "Categoría"
            : categories.find((c) => c.id === selectedCategory)?.title ?? "Categoría"}
        </Text>
        <Ionicons
          name={categoryFilterOpen ? "chevron-up" : "chevron-down"}
          size={16}
          color={Colors.TEXT_MUTED}
        />
      </Pressable>
      {/* Nota: no hay filtro por país/etiqueta aquí a propósito — `diets` (modelo
          legacy que alimenta esta pantalla) no tiene ningún campo de tag/país en
          el backend (columnas reales: id/title/slug/categorydiet_id/calories/
          carbs/protein/fat/servings/total_time/is_featured/status/ingredients/
          description/is_premium/visibility). Las etiquetas de país (🇦🇷 Argentina,
          etc.) sí existen pero en `Recipe.recipe_tag`, un modelo distinto — no se
          inventó un filtro sin datos reales detrás de él. */}
      {categoryFilterOpen && (
        <FlatList
          data={categoryFilterData}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.chipList}
          renderItem={renderCategoryItem}
        />
      )}
    </View>
  );

  if (loading && !refreshing) {
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
            <Text style={{ flex: 1, fontSize: 18, fontFamily: 'Gilroy-Bold', color: '#000000' }}>Diet List</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.skeletonWrap}>
            {[1, 2, 3].map((i) => (
              <React.Fragment key={i}>
                <LoadingSkeletonMem width="100%" height="160@ratio" borderRadius={16} />
                <View style={{ height: 12 }} />
              </React.Fragment>
            ))}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error && !refreshing) {
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
            <Text style={{ flex: 1, fontSize: 18, fontFamily: 'Gilroy-Bold', color: '#000000' }}>Diet List</Text>
            <View style={{ width: 40 }} />
          </View>
          <ErrorRetryMem message={error} onRetry={() => fetchData(selectedCategory, searchQuery, 1)} />
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
          <Text style={{ flex: 1, fontSize: 18, fontFamily: 'Gilroy-Bold', color: '#000000' }}>Diet List</Text>
          <View style={{ width: 40 }} />
        </View>
        <FlatList
          data={data}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <EmptyStateMem
              icon="nutrition-outline"
              title="No Diets Found"
              message="Try a different search or category."
            />
          }
          renderItem={renderDietItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.ACCENT_START}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
        />
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
    searchContainer: {
      paddingHorizontal: "16@ratio",
      marginBottom: "8@ratio",
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.BG_INPUT,
      borderRadius: "12@ratio",
      paddingHorizontal: "12@ratio",
      paddingVertical: "10@ratio",
      marginBottom: "12@ratio",
    },
    searchInput: {
      flex: 1,
      fontFamily: "Gilroy-Regular",
      fontSize: "14@ratio",
      color: Colors.TEXT_PRIMARY,
      marginLeft: "8@ratio",
    },
    filterToggle: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: "6@ratio",
      backgroundColor: Colors.BG_CARD,
      borderRadius: "20@ratio",
      paddingHorizontal: "14@ratio",
      paddingVertical: "8@ratio",
      marginBottom: "10@ratio",
    },
    filterToggleText: {
      fontFamily: "Gilroy-SemiBold",
      fontSize: "13@ratio",
      color: Colors.TEXT_PRIMARY,
    },
    chipList: {
      paddingBottom: "8@ratio",
    },
    chip: {
      paddingHorizontal: "16@ratio",
      paddingVertical: "8@ratio",
      borderRadius: "20@ratio",
      marginRight: "8@ratio",
    },
    chipInactive: {
      paddingHorizontal: "16@ratio",
      paddingVertical: "8@ratio",
      borderRadius: "20@ratio",
      marginRight: "8@ratio",
      backgroundColor: Colors.BG_CARD,
    },
    chipTextActive: {
      fontFamily: "Gilroy-SemiBold",
      fontSize: "13@ratio",
      color: Colors.TEXT_PRIMARY,
    },
    chipText: {
      fontFamily: "Gilroy-SemiBold",
      fontSize: "13@ratio",
      color: Colors.TEXT_SECONDARY,
    },
    cardWrap: {
      paddingHorizontal: "16@ratio",
    },
    listContent: {
      paddingBottom: "32@ratio",
    },
    skeletonWrap: {
      paddingHorizontal: "16@ratio",
      paddingTop: "16@ratio",
    },
  }, [Colors]);
}
