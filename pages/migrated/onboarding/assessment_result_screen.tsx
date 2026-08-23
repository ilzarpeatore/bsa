import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import AnimatedRing from '@components/AnimatedRing';
import { useAuth } from '@store/AuthContext';
import { C, FONT } from '../theme';

// Screen mostrada justo al terminar las 36 preguntas del onboarding
// (onboarding_v2_screen.tsx navega aquí con `route.params.answers` -- las
// respuestas en crudo, ya que se borran de AsyncStorage justo antes de
// navegar).
//
// Segundo rediseño 2026-08-23 (pedido explícito, tras revisar el primero):
// esta app funciona con coach real, no con un algoritmo que genera un plan
// cerrado -- decir "tu plan está listo" con un peso objetivo y una fecha
// concretos era engañoso, sobre todo porque esa meta se inventaba con una
// fórmula genérica (peso ideal de Devine) en vez de con lo que el cliente
// pidió de verdad. Se añadió `goal_type` como pregunta real del onboarding
// (constants/onboardingV2Questions.ts, etapa training_questionnaire) y esta
// pantalla ahora se enmarca como "hemos recogido tus datos, tu coach
// preparará tu plan" -- las kcal/macros se muestran como punto de partida
// orientativo, no como el plan final. Colores: verde -> naranja de marca
// (pedido explícito), mismo acento que el resto de la app.
//
// Datos reales usados: perfil ya guardado en Etapa 1 (edad/altura/peso/sexo)
// + respuestas de Etapas 3-4 pasadas por params (objetivo, nivel de
// actividad, días/duración de entreno). BMR sale de user_profile.bmr (el
// backend ya lo calcula, Mifflin-St Jeor) con fallback a la misma fórmula en
// cliente si por lo que sea no llegó. Objetivo calórico = BMR × multiplicador
// de actividad (Harris-Benedict) sobre la respuesta real de actividad.
// Hidratación = 30 ml/kg sobre el peso real. Las fotos de comida SÍ son
// ilustrativas (todavía no existe un plan de comidas real en este punto del
// alta) -- pedido explícito del usuario: "sacalas de alguna biblioteca de
// imágenes gratuita" (LoremFlickr, sin API key).

interface RouteAnswers {
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
  goal_type?: string;
  activity_level?: string;
  training_days_per_week?: number;
  session_duration_preference?: string;
  desired_meals_per_day?: number;
}

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const ACTIVITY_LABEL: Record<string, string> = {
  sedentary: 'sedentario',
  light: 'ligero',
  moderate: 'moderado',
  active: 'activo',
  very_active: 'muy activo',
};

// Bug real corregido (2026-08-23): el objetivo (goal_type) se guardaba y se
// mostraba, pero el cálculo de kcalTarget nunca lo usaba -- daba siempre el
// mantenimiento puro (BMR × actividad), sin superávit para ganar masa
// muscular ni déficit para perder grasa. Ajuste estándar y conservador
// (el coach lo afina de verdad después, ver cardNote de la tarjeta de
// macros): -20% para perder grasa (ritmo sostenible, ~0.5-1 kg/semana),
// +10% para ganar músculo (superávit moderado, evita ganar grasa de más),
// 0% para recomposición (se apoya en reparto de macros + entrenamiento, no
// en un superávit/déficit) y mantenimiento.
const GOAL_KCAL_ADJUSTMENT: Record<string, number> = {
  lose_fat: -0.2,
  gain_muscle: 0.1,
  recomposition: 0,
  maintain: 0,
};

const GOAL_LABEL: Record<string, string> = {
  lose_fat: 'Perder grasa',
  gain_muscle: 'Ganar masa muscular',
  recomposition: 'Recomposición corporal',
  maintain: 'Mantener mi forma física',
};

const GOAL_EMOJI: Record<string, string> = {
  lose_fat: '🔥',
  gain_muscle: '💪',
  recomposition: '⚖️',
  maintain: '🎯',
};

const SESSION_DURATION_LABEL: Record<string, string> = {
  '30': '30 minutos',
  '45': '45 minutos',
  '60': '60 minutos',
  '90': '90 minutos',
  '90_plus': 'más de 90 minutos',
};

function mifflinStJeorBmr(weightKg: number, heightCm: number, age: number, gender?: string): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base - 78; // media de ambas fórmulas para "otro/prefiero no decirlo"
}

function foodImageSource(seed: number, keyword: string) {
  return { uri: `https://loremflickr.com/300/300/${keyword}?lock=${seed}` };
}

export default function AssessmentResultScreen({ navigation, route }: any) {
  const { state, completeOnboarding } = useAuth();
  const profile = state.user?.user_profile;
  const answers: RouteAnswers = route?.params?.answers ?? {};

  const gender = answers.gender ?? state.user?.gender;
  const age = answers.age ?? (profile?.age ? parseFloat(profile.age) : undefined);
  const height = answers.height ?? (profile?.height ? parseFloat(profile.height) : undefined);
  const weight = answers.weight ?? (profile?.weight ? parseFloat(profile.weight) : undefined);
  const goalType = answers.goal_type;
  const activityLevel = answers.activity_level;
  const trainingDaysPerWeek = answers.training_days_per_week;
  const sessionDuration = answers.session_duration_preference;
  const hasCoreData = !!(age && height && weight);

  // Pantalla "¡Todo listo!" (onboarding_complete_screen.tsx) eliminada por
  // ser un paso intermedio innecesario (pedido explícito) -- su única
  // lógica real (marcar el onboarding como completado y entrar a Home) pasa
  // a hacerse directamente aquí, en el botón final de esta pantalla.
  const finishOnboarding = async () => {
    await completeOnboarding();
    navigation.replace('Home');
  };

  if (!hasCoreData) {
    return (
      <SafeAreaView style={localStyles.container}>
        <View style={localStyles.emptyState}>
          <Icon name="body-outline" size={40} color={C.gray30} />
          <Text style={localStyles.emptyText}>
            Todavía no tenemos suficientes datos para preparar tu resumen. Completa tu perfil para verlo aquí.
          </Text>
          <Pressable style={localStyles.continueBtn} onPress={finishOnboarding}>
            <Text style={localStyles.continueBtnText}>Continuar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const bmrFromProfile = profile?.bmr ? parseFloat(profile.bmr) : NaN;
  const bmr = Number.isNaN(bmrFromProfile) ? mifflinStJeorBmr(weight!, height!, age!, gender) : bmrFromProfile;

  const activityMultiplier = ACTIVITY_MULTIPLIER[activityLevel ?? ''] ?? 1.2;
  const tdee = bmr * activityMultiplier;
  const goalAdjustment = GOAL_KCAL_ADJUSTMENT[goalType ?? ''] ?? 0;
  const kcalTarget = Math.round(tdee * (1 + goalAdjustment));
  const carbsG = Math.round((kcalTarget * 0.45) / 4);
  const fatG = Math.round((kcalTarget * 0.3) / 9);
  const proteinG = Math.round((kcalTarget * 0.25) / 4);

  const hydrationMl = Math.round(weight! * 30);

  const genderLabel = gender === 'male' ? 'Hombre' : gender === 'female' ? 'Mujer' : 'Persona';
  const genderEmoji = gender === 'male' ? '👨' : gender === 'female' ? '👩' : '🧑';
  const firstName = state.user?.first_name || state.user?.display_name || '';
  const goalLabel = goalType ? GOAL_LABEL[goalType] : undefined;

  return (
    <SafeAreaView style={localStyles.container}>
      <ScrollView contentContainerStyle={localStyles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={localStyles.hero}>
          <View style={localStyles.checkBadge}>
            <Icon name="checkmark" size={26} color="#FFFFFF" />
          </View>
          {!!firstName && (
            <Text style={localStyles.heroGreeting}>{firstName}, ¡hemos recibido tus datos!</Text>
          )}
          <Text style={localStyles.heroTitle}>
            Tu coach preparará tu <Text style={localStyles.heroTitleAccent}>plan personalizado</Text>
          </Text>
          {!!goalLabel && (
            <View style={localStyles.goalChip}>
              <Text style={localStyles.goalChipEmoji}>{GOAL_EMOJI[goalType!]}</Text>
              <Text style={localStyles.goalChipText}>Objetivo: {goalLabel}</Text>
            </View>
          )}
        </View>

        {/* Macros */}
        <View style={localStyles.card}>
          <Text style={localStyles.cardTitle}>Recomendaciones nutricionales orientativas</Text>
          <View style={localStyles.macrosRow}>
            <AnimatedRing size={110} strokeWidth={10} percent={100} color={C.orange} trackColor={`${C.orange}25`}>
              <Text style={localStyles.kcalValue}>{kcalTarget}</Text>
              <Text style={localStyles.kcalUnit}>kcal</Text>
            </AnimatedRing>
            <View style={localStyles.macroCols}>
              <View style={localStyles.macroCol}>
                <Text style={[localStyles.macroLabel, { color: C.orange }]}>Carbs</Text>
                <Text style={localStyles.macroValue}>{carbsG}g</Text>
                <Text style={localStyles.macroPct}>45%</Text>
              </View>
              <View style={localStyles.macroDivider} />
              <View style={localStyles.macroCol}>
                <Text style={[localStyles.macroLabel, { color: C.blue }]}>Grasas</Text>
                <Text style={localStyles.macroValue}>{fatG}g</Text>
                <Text style={localStyles.macroPct}>30%</Text>
              </View>
              <View style={localStyles.macroDivider} />
              <View style={localStyles.macroCol}>
                <Text style={[localStyles.macroLabel, { color: C.destructive }]}>Proteínas</Text>
                <Text style={localStyles.macroValue}>{proteinG}g</Text>
                <Text style={localStyles.macroPct}>25%</Text>
              </View>
            </View>
          </View>
          <Text style={localStyles.cardNote}>Tu coach ajustará estos números según tu objetivo y tu evolución real.</Text>
        </View>

        {/* Hidratación */}
        <View style={localStyles.card}>
          <Text style={localStyles.cardTitle}>Necesidades de hidratación diaria</Text>
          <View style={localStyles.hydrationRow}>
            <Text style={localStyles.hydrationEmoji}>🥛</Text>
            <Text style={localStyles.hydrationValue}>{hydrationMl}</Text>
            <Text style={localStyles.hydrationUnit}>ml</Text>
          </View>
        </View>

        {/* Planificación de entrenamiento */}
        <View style={localStyles.card}>
          <Text style={localStyles.cardTitle}>Planificación de entrenamiento</Text>
          {!!trainingDaysPerWeek && (
            <View style={localStyles.iconRow}>
              <Text style={localStyles.iconRowEmoji}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={localStyles.iconRowTitle}>{trainingDaysPerWeek} días a la semana</Text>
                <Text style={localStyles.iconRowSubtitle}>Según la disponibilidad que nos indicaste</Text>
              </View>
            </View>
          )}
          {!!sessionDuration && (
            <View style={localStyles.iconRow}>
              <Text style={localStyles.iconRowEmoji}>⏱️</Text>
              <View style={{ flex: 1 }}>
                <Text style={localStyles.iconRowTitle}>Sesiones de {SESSION_DURATION_LABEL[sessionDuration] ?? sessionDuration}</Text>
                <Text style={localStyles.iconRowSubtitle}>Duración preferida por sesión</Text>
              </View>
            </View>
          )}
          <View style={localStyles.iconRow}>
            <Text style={localStyles.iconRowEmoji}>🧑‍🏫</Text>
            <View style={{ flex: 1 }}>
              <Text style={localStyles.iconRowTitle}>Tu coach diseñará tu rutina</Text>
              <Text style={localStyles.iconRowSubtitle}>Con estos días y duración como base</Text>
            </View>
          </View>
        </View>

        {/* Tips de entrenamiento */}
        <View style={localStyles.card}>
          <Text style={localStyles.cardTitle}>Tips de entrenamiento</Text>
          {[
            { emoji: '🏋️', text: 'Sigue tu plan de entrenamiento cada semana' },
            { emoji: '📈', text: 'Registra tus series y repeticiones para ver tu progreso' },
            { emoji: '🧘', text: 'Prioriza el descanso entre sesiones' },
            { emoji: '🔥', text: 'Calienta antes de cada entrenamiento' },
          ].map((item) => (
            <View key={item.text} style={localStyles.iconRow}>
              <Text style={localStyles.iconRowEmoji}>{item.emoji}</Text>
              <Text style={localStyles.iconRowText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Tips de nutrición */}
        <View style={localStyles.card}>
          <Text style={localStyles.cardTitle}>Tips de nutrición</Text>
          {[
            { emoji: '🍎', text: 'Registra tu comida' },
            { emoji: '📊', text: 'Sigue tu recomendación de calorías diarias' },
            { emoji: '⚖️', text: 'Equilibra tu consumo de carbohidratos, proteínas y grasas' },
            { emoji: '💧', text: 'Mantente hidratado' },
          ].map((item) => (
            <View key={item.text} style={localStyles.iconRow}>
              <Text style={localStyles.iconRowEmoji}>{item.emoji}</Text>
              <Text style={localStyles.iconRowText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Planificación de comidas */}
        <View style={localStyles.card}>
          <Text style={localStyles.cardTitle}>Planificación de comidas</Text>
          <View style={localStyles.mealsRow}>
            {[
              { label: 'Desayuno', keyword: 'breakfast,healthy' },
              { label: 'Almuerzo', keyword: 'lunch,healthy' },
              { label: 'Cena', keyword: 'dinner,healthy' },
            ].map((meal, i) => (
              <View key={meal.label} style={localStyles.mealItem}>
                <Image source={foodImageSource(i + 1, meal.keyword)} style={localStyles.mealImage} contentFit="cover" />
                <Text style={localStyles.mealLabel}>{meal.label}</Text>
              </View>
            ))}
          </View>
          <Text style={localStyles.cardNote}>Ejemplo orientativo — tu coach te preparará un plan de comidas real.</Text>
          <View style={localStyles.iconRow}>
            <Text style={localStyles.iconRowEmoji}>🗓️</Text>
            <View style={{ flex: 1 }}>
              <Text style={localStyles.iconRowTitle}>Recibirás tu plan de comidas de tu coach</Text>
              <Text style={localStyles.iconRowSubtitle}>Recetas simples y a tu medida</Text>
            </View>
          </View>
          <View style={localStyles.iconRow}>
            <Text style={localStyles.iconRowEmoji}>⚖️</Text>
            <View style={{ flex: 1 }}>
              <Text style={localStyles.iconRowTitle}>Adaptado a una dieta equilibrada</Text>
              <Text style={localStyles.iconRowSubtitle}>Según tus preferencias y alergias</Text>
            </View>
          </View>
        </View>

        {/* Resumen del perfil */}
        <View style={localStyles.card}>
          <Text style={localStyles.cardTitle}>Lo que hemos enviado a tu coach</Text>
          <View style={localStyles.iconRow}>
            <Text style={localStyles.iconRowEmoji}>{genderEmoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={localStyles.iconRowTitle}>{firstName || genderLabel}</Text>
              <Text style={localStyles.iconRowSubtitle}>{genderLabel} · {Math.round(height!)} cm · {weight!.toFixed(1).replace('.', ',')} kg</Text>
            </View>
          </View>
          {!!goalLabel && (
            <View style={localStyles.iconRow}>
              <Text style={localStyles.iconRowEmoji}>{GOAL_EMOJI[goalType!]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={localStyles.iconRowTitle}>Objetivo: {goalLabel}</Text>
              </View>
            </View>
          )}
          {!!activityLevel && (
            <View style={localStyles.iconRow}>
              <Text style={localStyles.iconRowEmoji}>🏆</Text>
              <View style={{ flex: 1 }}>
                <Text style={localStyles.iconRowTitle}>Nivel de actividad {ACTIVITY_LABEL[activityLevel] ?? activityLevel}</Text>
                {!!trainingDaysPerWeek && (
                  <Text style={localStyles.iconRowSubtitle}>{trainingDaysPerWeek} días/semana{sessionDuration ? ` · ${SESSION_DURATION_LABEL[sessionDuration] ?? sessionDuration}` : ''}</Text>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={localStyles.bottomBar}>
        <Pressable
          style={({ pressed }) => [localStyles.continueBtn, pressed && { opacity: 0.85 }]}
          onPress={finishOnboarding}
        >
          <Text style={localStyles.continueBtnText}>Confirmar mi plan</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF3EC' },
  scrollContent: { padding: 20, paddingBottom: 110 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyText: { fontFamily: FONT.regular, fontSize: 14, color: C.gray50, textAlign: 'center' },
  hero: { alignItems: 'center', paddingVertical: 12, marginBottom: 20 },
  checkBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroGreeting: { fontFamily: FONT.regular, fontSize: 15, color: C.gray50, marginBottom: 10, textAlign: 'center' },
  heroTitle: { fontFamily: FONT.bold, fontSize: 26, lineHeight: 33, color: C.textPrimary, textAlign: 'center' },
  // El <Text> compartido (components/ui/text) aplica sus propios defaults
  // (size="md" -> ~16px, weight="regular") vía className siempre que no se
  // le pasen esas props -- al anidarlo dentro de heroTitle solo heredaba el
  // color (única propiedad que este style sobreescribía), el resto de su
  // propio className (tamaño/peso más pequeños) ganaba por encima de la
  // herencia de texto de RN. Repetir aquí fontSize/fontFamily/lineHeight
  // explícitos iguales a heroTitle es lo que de verdad iguala el tamaño.
  heroTitleAccent: { color: C.orange, fontSize: 26, lineHeight: 33, fontFamily: FONT.bold },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${C.orange}1F`,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
  },
  goalChipEmoji: { fontSize: 18 },
  goalChipText: { fontFamily: FONT.semiBold, fontSize: 14, color: C.orange },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16 },
  cardTitle: { fontFamily: FONT.bold, fontSize: 18, lineHeight: 23, color: C.textPrimary, marginBottom: 18 },
  cardNote: { fontFamily: FONT.regular, fontSize: 12.5, color: C.gray50, marginTop: 14 },
  macrosRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  // Gilroy Bold/ExtraBold/Black sin lineHeight explícito se recorta en iOS
  // (bug ya documentado y barrido en otras pantallas esta sesión) -- 2012 y
  // el ml de hidratación son justo ese patrón: números grandes en negrita
  // sin lineHeight.
  kcalValue: { fontFamily: FONT.bold, fontSize: 24, lineHeight: 30, color: C.textPrimary, textAlign: 'center' },
  kcalUnit: { fontFamily: FONT.regular, fontSize: 12, color: C.gray50, textAlign: 'center' },
  macroCols: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  macroCol: { flex: 1, alignItems: 'flex-start' },
  macroDivider: { width: 1, height: 44, backgroundColor: C.border, marginHorizontal: 8 },
  macroLabel: { fontFamily: FONT.semiBold, fontSize: 12.5, marginBottom: 4 },
  macroValue: { fontFamily: FONT.bold, fontSize: 16, lineHeight: 20, color: C.textPrimary },
  macroPct: { fontFamily: FONT.regular, fontSize: 12, color: C.gray50, marginTop: 2 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
  // Mismo bug de recorte -- también afecta a emojis (glifos altos como
  // 🧑‍🏫 se cortan sin lineHeight, no solo texto Gilroy).
  iconRowEmoji: { fontSize: 22, lineHeight: 28, width: 28, textAlign: 'center' },
  iconRowText: { flex: 1, fontFamily: FONT.medium, fontSize: 14.5, color: C.textPrimary },
  iconRowTitle: { fontFamily: FONT.semiBold, fontSize: 14.5, color: C.textPrimary },
  iconRowSubtitle: { fontFamily: FONT.regular, fontSize: 12.5, color: C.gray50, marginTop: 2 },
  hydrationRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  hydrationEmoji: { fontSize: 26, lineHeight: 32, marginRight: 4 },
  hydrationValue: { fontFamily: FONT.bold, fontSize: 26, lineHeight: 32, color: C.textPrimary },
  hydrationUnit: { fontFamily: FONT.regular, fontSize: 14, color: C.gray50, marginBottom: 3 },
  mealsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
  mealItem: { alignItems: 'center', gap: 8 },
  mealImage: { width: 84, height: 84, borderRadius: 42, backgroundColor: C.gray10 },
  mealLabel: { fontFamily: FONT.semiBold, fontSize: 13, color: C.textPrimary },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 30, backgroundColor: '#FFF3EC' },
  continueBtn: { paddingVertical: 17, borderRadius: 28, alignItems: 'center', backgroundColor: C.orange },
  continueBtnText: { fontFamily: FONT.bold, fontSize: 16, color: '#FFFFFF' },
});
