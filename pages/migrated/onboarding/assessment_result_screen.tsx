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
// navegar). Rediseño 2026-08-23 (pedido explícito, 3 capturas de
// referencia): de un resumen de IMC/BMR muy básico a un "tu plan está
// listo" completo con kcal/macros, meta de peso, hidratación y comidas.
//
// Todo lo numérico sale de datos reales (perfil ya guardado en Etapa 1 +
// respuestas de Etapas 3-4 pasadas por params) combinados con fórmulas
// estándar reales (Mifflin-St Jeor para BMR -- el backend ya la calcula en
// user_profile.bmr, aquí solo de respaldo si por lo que sea no llegó；
// Devine para peso ideal, mismo criterio que user_profile.ideal_weight;
// multiplicadores de actividad Harris-Benedict para BMR->objetivo calórico;
// 30 ml/kg para hidratación). Nada de esto es dato inventado por pantalla,
// es cálculo real sobre datos reales. Las fotos de comida SÍ son ilustrativas
// (todavía no existe un plan de comidas real en este punto del alta) --
// pedido explícito del usuario: "sacalas de alguna biblioteca de imágenes
// gratuita" (Unsplash vía LoremFlickr, sin API key, igual que se hizo antes
// con los workouts/recursos de Home v2).

interface RouteAnswers {
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
  activity_level?: string;
  training_days_per_week?: number;
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

function mifflinStJeorBmr(weightKg: number, heightCm: number, age: number, gender?: string): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base - 78; // media de ambas fórmulas para "otro/prefiero no decirlo"
}

function devineIdealWeight(heightCm: number, gender?: string): number {
  const heightInches = heightCm / 2.54;
  const over5ft = Math.max(0, heightInches - 60);
  return gender === 'female' ? 45.5 + 2.3 * over5ft : 50 + 2.3 * over5ft;
}

function formatEsDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

function foodImageSource(seed: number, keyword: string) {
  return { uri: `https://loremflickr.com/300/300/${keyword}?lock=${seed}` };
}

export default function AssessmentResultScreen({ navigation, route }: any) {
  const { state } = useAuth();
  const profile = state.user?.user_profile;
  const answers: RouteAnswers = route?.params?.answers ?? {};

  const gender = answers.gender ?? state.user?.gender;
  const age = answers.age ?? (profile?.age ? parseFloat(profile.age) : undefined);
  const height = answers.height ?? (profile?.height ? parseFloat(profile.height) : undefined);
  const weight = answers.weight ?? (profile?.weight ? parseFloat(profile.weight) : undefined);
  const activityLevel = answers.activity_level;
  const trainingDaysPerWeek = answers.training_days_per_week;
  const hasCoreData = !!(age && height && weight);

  if (!hasCoreData) {
    return (
      <SafeAreaView style={localStyles.container}>
        <View style={localStyles.emptyState}>
          <Icon name="body-outline" size={40} color={C.gray30} />
          <Text style={localStyles.emptyText}>
            Todavía no tenemos suficientes datos para preparar tu plan. Completa tu perfil para verlo aquí.
          </Text>
          <Pressable style={localStyles.continueBtn} onPress={() => navigation.navigate('MigratedOnboardingComplete')}>
            <Text style={localStyles.continueBtnText}>Continuar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const bmrFromProfile = profile?.bmr ? parseFloat(profile.bmr) : NaN;
  const bmr = Number.isNaN(bmrFromProfile) ? mifflinStJeorBmr(weight!, height!, age!, gender) : bmrFromProfile;
  const idealWeightFromProfile = profile?.ideal_weight ? parseFloat(profile.ideal_weight) : NaN;
  const idealWeight = Number.isNaN(idealWeightFromProfile) ? devineIdealWeight(height!, gender) : idealWeightFromProfile;

  const activityMultiplier = ACTIVITY_MULTIPLIER[activityLevel ?? ''] ?? 1.2;
  const kcalTarget = Math.round(bmr * activityMultiplier);
  const carbsG = Math.round((kcalTarget * 0.45) / 4);
  const fatG = Math.round((kcalTarget * 0.3) / 9);
  const proteinG = Math.round((kcalTarget * 0.25) / 4);

  const weightDiff = weight! - idealWeight;
  const isMaintaining = Math.abs(weightDiff) < 1;
  const weeksToGoal = isMaintaining ? 8 : Math.min(24, Math.max(4, Math.ceil(Math.abs(weightDiff) / 0.4)));
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + weeksToGoal * 7);
  const weeklyRateKg = isMaintaining ? 0 : Math.round((Math.abs(weightDiff) / weeksToGoal) * 10) / 10;

  const hydrationMl = Math.round(weight! * 30);

  const genderLabel = gender === 'male' ? 'Hombre' : gender === 'female' ? 'Mujer' : 'Persona';
  const genderEmoji = gender === 'male' ? '👨' : gender === 'female' ? '👩' : '🧑';
  const firstName = state.user?.first_name || state.user?.display_name || '';

  return (
    <SafeAreaView style={localStyles.container}>
      <ScrollView contentContainerStyle={localStyles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={localStyles.hero}>
          <View style={localStyles.checkBadge}>
            <Icon name="checkmark" size={26} color="#FFFFFF" />
          </View>
          {!!firstName && (
            <Text style={localStyles.heroGreeting}>{firstName}, ¡tu plan personal está listo!</Text>
          )}
          <Text style={localStyles.heroTitle}>
            {isMaintaining ? (
              <>Mantén tu peso en <Text style={localStyles.heroTitleAccent}>{weight!.toFixed(1).replace('.', ',')} kg</Text></>
            ) : (
              <>Alcanza <Text style={localStyles.heroTitleAccent}>{idealWeight.toFixed(1).replace('.', ',')} kg</Text> para el {formatEsDate(targetDate)}</>
            )}
          </Text>
        </View>

        {/* Macros */}
        <View style={localStyles.card}>
          <Text style={localStyles.cardTitle}>Recomendaciones nutricionales diarias</Text>
          <View style={localStyles.macrosRow}>
            <AnimatedRing size={110} strokeWidth={10} percent={100} color={C.warning} trackColor={`${C.warning}25`}>
              <Text style={localStyles.kcalValue}>{kcalTarget}</Text>
              <Text style={localStyles.kcalUnit}>kcal</Text>
            </AnimatedRing>
            <View style={localStyles.macroCols}>
              <View style={localStyles.macroCol}>
                <Text style={[localStyles.macroLabel, { color: C.warning }]}>Carbohidratos</Text>
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
        </View>

        {/* Progreso de peso */}
        <View style={localStyles.card}>
          <Text style={localStyles.cardTitle}>Cómo progresarás</Text>
          <View style={localStyles.progressChart}>
            <View style={localStyles.progressBubbleLeft}>
              <Text style={localStyles.progressBubbleText}>{weight!.toFixed(1).replace('.', ',')} kg</Text>
            </View>
            <View style={localStyles.progressBubbleRight}>
              <Text style={localStyles.progressBubbleTextActive}>{(isMaintaining ? weight! : idealWeight).toFixed(1).replace('.', ',')} kg</Text>
            </View>
            <View style={localStyles.progressLineTrack}>
              <View style={localStyles.progressLineFill} />
            </View>
            <View style={localStyles.progressDotStart} />
            <View style={localStyles.progressDotEnd} />
            <View style={localStyles.progressAxisRow}>
              <Text style={localStyles.progressAxisLabel}>Hoy</Text>
              <Text style={localStyles.progressAxisLabel}>{formatEsDate(targetDate)}</Text>
            </View>
          </View>
          <View style={localStyles.checklist}>
            <View style={localStyles.checklistRow}>
              <Icon name="checkmark-circle" size={20} color={C.success} />
              <Text style={localStyles.checklistText}>
                {isMaintaining ? 'Enfocado en mantener un peso saludable' : `Enfocado en ${weightDiff > 0 ? 'perder' : 'ganar'} peso de forma sostenible`}
              </Text>
            </View>
            <View style={localStyles.checklistRow}>
              <Icon name="checkmark-circle" size={20} color={C.success} />
              <Text style={localStyles.checklistText}>Al ritmo justo para mantenerte en buen camino a largo plazo</Text>
            </View>
          </View>
        </View>

        {/* Cómo alcanzar tus metas */}
        <View style={localStyles.card}>
          <Text style={localStyles.cardTitle}>Cómo alcanzar tus metas</Text>
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

        {/* Hidratación */}
        <View style={localStyles.card}>
          <Text style={localStyles.cardTitle}>Necesidades de hidratación diaria</Text>
          <View style={localStyles.hydrationRow}>
            <Text style={localStyles.hydrationEmoji}>🥛</Text>
            <Text style={localStyles.hydrationValue}>{hydrationMl}</Text>
            <Text style={localStyles.hydrationUnit}>ml</Text>
          </View>
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
          <View style={localStyles.iconRow}>
            <Text style={localStyles.iconRowEmoji}>🗓️</Text>
            <View style={{ flex: 1 }}>
              <Text style={localStyles.iconRowTitle}>Recibe tu plan de comidas semanal</Text>
              <Text style={localStyles.iconRowSubtitle}>Cocina recetas simples y a tu medida</Text>
            </View>
          </View>
          <View style={localStyles.iconRow}>
            <Text style={localStyles.iconRowEmoji}>⚖️</Text>
            <View style={{ flex: 1 }}>
              <Text style={localStyles.iconRowTitle}>Adaptado a una dieta equilibrada</Text>
              <Text style={localStyles.iconRowSubtitle}>Como de todo</Text>
            </View>
          </View>
        </View>

        {/* Resumen del perfil */}
        <View style={localStyles.card}>
          <Text style={localStyles.cardTitle}>Un plan hecho a tu medida</Text>
          <View style={localStyles.iconRow}>
            <Text style={localStyles.iconRowEmoji}>{genderEmoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={localStyles.iconRowTitle}>{firstName || genderLabel}</Text>
              <Text style={localStyles.iconRowSubtitle}>{genderLabel} · {Math.round(height!)} cm · {weight!.toFixed(1).replace('.', ',')} kg</Text>
            </View>
          </View>
          <View style={localStyles.iconRow}>
            <Text style={localStyles.iconRowEmoji}>📈</Text>
            <View style={{ flex: 1 }}>
              <Text style={localStyles.iconRowTitle}>
                {isMaintaining ? 'Te ayuda a mantener tu peso' : `Te ayuda a ${weightDiff > 0 ? 'perder' : 'ganar'} peso`}
              </Text>
              <Text style={localStyles.iconRowSubtitle}>{weeklyRateKg.toFixed(1).replace('.', ',')} kg por semana</Text>
            </View>
          </View>
          {!!activityLevel && (
            <View style={localStyles.iconRow}>
              <Text style={localStyles.iconRowEmoji}>🏆</Text>
              <View style={{ flex: 1 }}>
                <Text style={localStyles.iconRowTitle}>Adaptado a un nivel de actividad {ACTIVITY_LABEL[activityLevel] ?? activityLevel}</Text>
                {!!trainingDaysPerWeek && (
                  <Text style={localStyles.iconRowSubtitle}>{ACTIVITY_LABEL[activityLevel] ?? activityLevel} con {trainingDaysPerWeek} sesiones/semana</Text>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={localStyles.bottomBar}>
        <Pressable
          style={({ pressed }) => [localStyles.continueBtn, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('MigratedOnboardingComplete')}
        >
          <Text style={localStyles.continueBtnText}>Confirmar mi plan</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EAF7E4' },
  scrollContent: { padding: 20, paddingBottom: 110 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyText: { fontFamily: FONT.regular, fontSize: 14, color: C.gray50, textAlign: 'center' },
  hero: { alignItems: 'center', paddingVertical: 12, marginBottom: 20 },
  checkBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroGreeting: { fontFamily: FONT.regular, fontSize: 15, color: C.gray50, marginBottom: 10, textAlign: 'center' },
  heroTitle: { fontFamily: FONT.bold, fontSize: 26, lineHeight: 33, color: C.textPrimary, textAlign: 'center' },
  heroTitleAccent: { color: C.success60 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16 },
  cardTitle: { fontFamily: FONT.bold, fontSize: 18, color: C.textPrimary, marginBottom: 18 },
  macrosRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  kcalValue: { fontFamily: FONT.bold, fontSize: 24, color: C.textPrimary, textAlign: 'center' },
  kcalUnit: { fontFamily: FONT.regular, fontSize: 12, color: C.gray50, textAlign: 'center' },
  macroCols: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  macroCol: { flex: 1, alignItems: 'flex-start' },
  macroDivider: { width: 1, height: 44, backgroundColor: C.border, marginHorizontal: 8 },
  macroLabel: { fontFamily: FONT.semiBold, fontSize: 12.5, marginBottom: 4 },
  macroValue: { fontFamily: FONT.bold, fontSize: 16, color: C.textPrimary },
  macroPct: { fontFamily: FONT.regular, fontSize: 12, color: C.gray50, marginTop: 2 },
  progressChart: { height: 90, marginTop: 4, marginBottom: 16, justifyContent: 'flex-end' },
  progressLineTrack: { height: 2, backgroundColor: C.border, borderRadius: 1, marginBottom: 8 },
  progressLineFill: { height: 2, backgroundColor: C.success, borderRadius: 1, width: '100%' },
  progressDotStart: { position: 'absolute', left: 0, bottom: 8, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: C.gray30 },
  progressDotEnd: { position: 'absolute', right: 0, bottom: 8, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: C.success },
  progressBubbleLeft: { position: 'absolute', left: 0, top: 0, backgroundColor: C.gray10, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  progressBubbleRight: { position: 'absolute', right: 0, top: 0, backgroundColor: C.success, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  progressBubbleText: { fontFamily: FONT.semiBold, fontSize: 12.5, color: C.textPrimary },
  progressBubbleTextActive: { fontFamily: FONT.semiBold, fontSize: 12.5, color: '#FFFFFF' },
  progressAxisRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressAxisLabel: { fontFamily: FONT.regular, fontSize: 12, color: C.gray40 },
  checklist: { gap: 10 },
  checklistRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checklistText: { flex: 1, fontFamily: FONT.medium, fontSize: 14, color: C.textPrimary, lineHeight: 19 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
  iconRowEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  iconRowText: { flex: 1, fontFamily: FONT.medium, fontSize: 14.5, color: C.textPrimary },
  iconRowTitle: { fontFamily: FONT.semiBold, fontSize: 14.5, color: C.textPrimary },
  iconRowSubtitle: { fontFamily: FONT.regular, fontSize: 12.5, color: C.gray50, marginTop: 2 },
  hydrationRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  hydrationEmoji: { fontSize: 26, marginRight: 4 },
  hydrationValue: { fontFamily: FONT.bold, fontSize: 26, color: C.textPrimary },
  hydrationUnit: { fontFamily: FONT.regular, fontSize: 14, color: C.gray50, marginBottom: 3 },
  mealsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 18 },
  mealItem: { alignItems: 'center', gap: 8 },
  mealImage: { width: 84, height: 84, borderRadius: 42, backgroundColor: C.gray10 },
  mealLabel: { fontFamily: FONT.semiBold, fontSize: 13, color: C.textPrimary },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 30, backgroundColor: '#EAF7E4' },
  continueBtn: { paddingVertical: 17, borderRadius: 28, alignItems: 'center', backgroundColor: C.success },
  continueBtnText: { fontFamily: FONT.bold, fontSize: 16, color: '#FFFFFF' },
});
