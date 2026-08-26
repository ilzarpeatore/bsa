import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionTitleText,
  AccordionContent,
} from '@components/ui/accordion';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';
import { recipesApi } from '../../api/recipes';

interface RecipeTag {
  id: number;
  title: string;
  recipeTagImage?: string;
}

interface TagCategory {
  key: string;
  label: string;
  icon: string;
  tags: RecipeTag[];
}

// La lista de tags viene plana del backend (recipetag-list) sin ningún campo
// de agrupación (solo id/title/slug/imagen) — "esta screen es una locura"
// venía de eso: 40-60 chips sueltos en un único wrap. Para organizarla por
// secciones sin depender de un campo que la API no expone, clasificamos cada
// tag por palabras clave en su título y agrupamos lo que no encaja en
// "Otros". Es una heurística, no un contrato con el backend -- ver
// docs/PENDIENTE_BACKEND_ADMIN.md para la propuesta real de un campo de
// grupo en `recipe_tags` que sustituya esto por datos reales.
//
// Taxonomía rediseñada (pedido explícito, 2026-08-24: "organiza todas las
// categorías" -- duración, países, tipo de dieta, recetas de comunidades de
// España, y por tipo de objetivo). `classifyTag` recorre este array EN
// ORDEN y devuelve el primer match, así que el orden importa: las 3
// categorías de objetivo y "Comunidades de España" van ANTES que "Países"/
// "Tipo de dieta" a propósito -- son más específicas (ej. "cocina andaluza"
// debe caer en Comunidades de España, no en el "espanol[ao]" genérico de
// Países; "alto en proteina" es más objetivo de entrenamiento que dieta en
// sí). Antes "alto en proteina"/"proteica"/"hipocalorica"/"light" vivían en
// "Tipo de dieta" -- se mueven a las categorías de objetivo, que son un
// encaje semántico más preciso para esos términos.
const CATEGORY_DEFS: { key: string; label: string; icon: string; keywords: RegExp }[] = [
  {
    key: 'duration',
    label: 'Duración',
    icon: 'time-outline',
    keywords: /\b(\d+\s*-?\s*(min|mins|minutos)|rapid[ao]s?|express|menos de)\b/,
  },
  {
    key: 'fatLoss',
    label: 'Pérdida de grasa',
    icon: 'flame-outline',
    keywords:
      /\b(perdida de grasa|quema\s?-?grasas?|definicion|deficit calorico|baj[ao] en calorias|hipocalor[ií]c[ao]|adelgaz\w*|light)\b/,
  },
  {
    key: 'muscleGain',
    label: 'Subida de masa muscular',
    icon: 'barbell-outline',
    keywords: /\b(masa muscular|volumen|ganancia muscular|alt[ao] en proteina|proteic[ao]|hipertrofia|bulking)\b/,
  },
  {
    key: 'performance',
    label: 'Rendimiento deportivo',
    icon: 'flash-outline',
    keywords:
      /\b(rendimiento deportivo|pre\s?-?entreno|post\s?-?entreno|recuperacion muscular|resistencia|hidratacion|electrolitos|energia)\b/,
  },
  {
    key: 'spainRegional',
    label: 'Recetas de comunidades de España',
    icon: 'location-outline',
    keywords:
      /\b(andaluz[ao]s?|catalan[ao]?s?|catalu[nñ]a|galleg[ao]s?|galicia|vasc[ao]s?|euskadi|valencian[ao]s?|canari[ao]s?|asturian[ao]s?|asturias|murcian[ao]s?|riojan[ao]s?|aragones[ao]?s?|extreme[nñ][ao]s?|castellan[ao]s?|manchega?s?|madrile[nñ][ao]s?|balear(es)?|cantabr[ao]s?|navarr[ao]s?|cordobes[ao]?s?|sevillan[ao]s?)\b/,
  },
  {
    key: 'country',
    label: 'Países',
    icon: 'earth-outline',
    keywords:
      /\b(mexican[ao]|italian[ao]|espanol[ao]|francesa|frances|japonesa|japones|china|india|tailandesa|tailandes|mediterranea|mediterraneo|asiatica|asiatico|american[ao]|griega|griego|coreana|coreano|vietnamita|marroqui|peruana|peruano|argentina|argentino|brasilena|brasileno|alemana|aleman|turca|turco|libanesa|libanes|hindu|arabe|latina|latino|oriental|caribena|caribeno)\b/,
  },
  {
    key: 'diet',
    label: 'Tipo de dieta',
    icon: 'leaf-outline',
    // Bug real corregido de paso (preexistente, misma línea): "bajo en carb"
    // con \b de cierre nunca hacía match contra "carbohidratos" (el \b exige
    // fin de palabra justo tras "carb", que en "carbohidratos" sigue en
    // mitad de palabra) -- \w* al final, mismo patrón que "adelgaz\w*".
    keywords: /\b(vegan[ao]|vegetarian[ao]|sin gluten|sin lactosa|keto|cetogenic[ao]|paleo|baj[ao] en carb\w*|sin azucar|fitness)\b/,
  },
  {
    key: 'mealType',
    label: 'Tipo de receta',
    icon: 'restaurant-outline',
    keywords:
      /\b(desayuno|comida|cena|almuerzo|snack|postre|batido|smoothie|sopa|ensalada|entrante|aperitivo|guarnicion|plato principal|bebida|salsa|pan|dulce|salado)\b/,
  },
];
const OTHER_CATEGORY = { key: 'other', label: 'Otros', icon: 'pricetag-outline' };

function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function classifyTag(tag: RecipeTag): string {
  const normalized = normalize(tag.title);
  for (const def of CATEGORY_DEFS) {
    if (def.keywords.test(normalized)) return def.key;
  }
  return OTHER_CATEGORY.key;
}

function groupTags(tags: RecipeTag[]): TagCategory[] {
  const buckets = new Map<string, RecipeTag[]>();
  tags.forEach((tag) => {
    const key = classifyTag(tag);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(tag);
  });
  const ordered = [...CATEGORY_DEFS.map((d) => ({ key: d.key, label: d.label, icon: d.icon })), OTHER_CATEGORY];
  return ordered
    .filter((c) => buckets.has(c.key))
    .map((c) => ({ ...c, tags: buckets.get(c.key)! }));
}

export default function RecipeTagListScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const [mTagList, setMTagList] = useState<RecipeTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getTagData();
  }, []);

  const getTagData = useCallback(async () => {
    setIsLoading(true);
    try {
      let page = 1;
      let totalPages = 1;
      const allTags: RecipeTag[] = [];
      while (page <= totalPages) {
        const res = await recipesApi.getTags(page);
        totalPages = res.data.pagination?.totalPages ?? 1;
        allTags.push(
          ...(res.data.data ?? []).map((t) => ({
            id: t.id,
            title: t.title,
            recipeTagImage: t.recipe_tag_image ?? undefined,
          }))
        );
        page++;
      }
      setMTagList(allTags);
    } catch (e: any) {
      // toast(e.toString());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filteredTags = useMemo(() => {
    const query = normalize(searchQuery.trim());
    if (!query) return mTagList;
    return mTagList.filter((t) => normalize(t.title).includes(query));
  }, [mTagList, searchQuery]);

  const categories = useMemo(() => groupTags(filteredTags), [filteredTags]);
  const categoryKeys = useMemo(() => categories.map((c) => c.key), [categories]);

  const handleTagPress = (item: RecipeTag) => {
    props.navigation.navigate('MigratedRecipeListV2', {
      tagId: item.id,
      title: item.title,
    });
  };

  const renderTagChip = (item: RecipeTag) => (
    <Pressable
      key={item.id}
      className="flex-row items-center gap-2 px-4 py-2 rounded-pill border border-border bg-card"
      onPress={() => handleTagPress(item)}
    >
      <Text size="sm" className="text-foreground">{item.title}</Text>
      {item.recipeTagImage ? (
        <Image
          source={{ uri: item.recipeTagImage }}
          contentFit="cover"
          style={{ width: 20, height: 20, borderRadius: 10 }}
        />
      ) : null}
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="Etiquetas" onBack={() => props.navigation.goBack()} />

      <Box className="flex-1">
        {isLoading ? (
          <Box className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={C.orange} />
          </Box>
        ) : mTagList.length === 0 ? (
          <Box className="flex-1 items-center justify-center">
            <Icon name="pricetags-outline" size={64} className="text-muted-foreground" />
            <Text weight="medium" muted style={{ marginTop: 12 }}>No se encontraron etiquetas</Text>
          </Box>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            <Box
              className="flex-row items-center bg-card rounded-md border border-border"
              style={{ paddingHorizontal: 12, height: 44, marginBottom: 16 }}
            >
              <Icon name="search-outline" size={18} className="text-muted-foreground" />
              <TextInput
                style={{ flex: 1, marginLeft: 8, fontSize: 14, color: C.textPrimary }}
                placeholder="Buscar etiquetas..."
                placeholderTextColor={C.gray40}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Icon name="close-circle" size={18} className="text-muted-foreground" />
                </Pressable>
              )}
            </Box>

            {categories.length === 0 ? (
              <Box className="items-center" style={{ paddingVertical: 40 }}>
                <Text muted size="sm">Sin resultados para &quot;{searchQuery.trim()}&quot;</Text>
              </Box>
            ) : (
              <Accordion type="multiple" value={categoryKeys} className="gap-3">
                {categories.map((category) => (
                  <AccordionItem
                    key={category.key}
                    value={category.key}
                    className="bg-card rounded-lg border border-border"
                  >
                    <AccordionHeader>
                      <AccordionTrigger style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                        {({ isExpanded }: { isExpanded: boolean }) => (
                          <>
                            <Icon name={category.icon as any} size={18} className="text-foreground" />
                            <AccordionTitleText className="flex-1">
                              {category.label} ({category.tags.length})
                            </AccordionTitleText>
                            <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} className="text-foreground" />
                          </>
                        )}
                      </AccordionTrigger>
                    </AccordionHeader>
                    <AccordionContent style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                      <Box className="flex-row flex-wrap gap-3">
                        {category.tags.map(renderTagChip)}
                      </Box>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </ScrollView>
        )}
      </Box>
    </SafeAreaView>
  );
}
