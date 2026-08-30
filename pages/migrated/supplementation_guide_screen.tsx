import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, View, LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@components/ui/text';
import { Divider } from '@components/ui/divider';
import { Input, InputField } from '@components/ui/input';
import GuidePhotoHeader from '@components/GuidePhotoHeader';
import {
  createGuideStyles,
  Section,
  SubHeading,
  P,
  Bullet,
  HighlightBox,
  SupplementCard,
  GuideStyles,
} from '@components/GuideBlocks';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { useAppColorMode } from '@helper/useAppColorMode';

// Guía estática compartida por todos los usuarios (pedido explícito
// 2026-08-30, misma naturaleza que las guías de Autogestión y
// Sobrentrenamiento) -- contenido migrado 1:1 desde el HTML original
// (guiasuplementacionmejorada.html) a componentes reales de React
// Native/Expo, sin WebView. Dos adaptaciones deliberadas del original:
//
// 1. El índice (TOC) del HTML enlaza a 8 secciones (#intro, #tier1, #tier2,
//    #tier3, #calculadoras, #stacks, #compatibilidad, #timeline) pero el
//    HTML de origen solo desarrolla 4 de verdad (intro, tier1, calculadoras,
//    stacks) -- TIER 2, TIER 3, Compatibilidad y Timeline son enlaces del
//    índice sin contenido detrás incluso en el HTML original (no es un
//    recorte mío). Se mantienen las 8 entradas del índice tal cual (no se
//    inventa contenido que no existe), pero solo las 4 con sección real
//    debajo se pueden tocar para saltar a ella.
// 2. La calculadora de dosis SÍ es interactiva de verdad (TextInput +
//    cálculo en vivo), replicando el <script> del HTML original en vez de
//    dejarla como texto estático -- coherente con "usa elementos reales de
//    React Native/Expo".
interface Props {
  navigation?: any;
}

const TOC_ITEMS: { key: string; label: string; anchor?: 'intro' | 'tier1' | 'calculadoras' | 'stacks' }[] = [
  { key: 'intro', label: 'Introducción', anchor: 'intro' },
  { key: 'tier1', label: 'TIER 1 - Evidencia Sólida', anchor: 'tier1' },
  { key: 'tier2', label: 'TIER 2 - Evidencia Moderada' },
  { key: 'tier3', label: 'TIER 3 - No Recomendados' },
  { key: 'calculadoras', label: 'Calculadoras', anchor: 'calculadoras' },
  { key: 'stacks', label: 'Stacks por Objetivo', anchor: 'stacks' },
  { key: 'compatibilidad', label: 'Compatibilidad' },
  { key: 'timeline', label: 'Timeline de Efectos' },
];

function CalcResult({ styles, label, value, note }: { styles: GuideStyles; label: string; value: string; note: string }) {
  return (
    <View style={styles.calcResultBox}>
      <Text style={styles.calcResultLabel}>{label}</Text>
      <Text style={styles.calcResultValue}>{value}</Text>
      <Text style={styles.calcResultNote}>{note}</Text>
    </View>
  );
}

export default function SupplementationGuideScreen({ navigation }: Props) {
  const { colors: C } = useAppColorMode();
  const styles = createGuideStyles(C);
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const [weightInput, setWeightInput] = useState('75');

  const weight = parseFloat(weightInput.replace(',', '.')) || 75;
  const calc = useMemo(
    () => ({
      cafeinaBajo: Math.round(weight * 3),
      cafeinaAlto: Math.round(weight * 6),
      proteinaBajo: Math.round(weight * 1.8),
      proteinaAlto: Math.round(weight * 2.2),
      zincBajo: Math.round(weight * 0.2),
      zincAlto: Math.round(weight * 0.27),
      magnesioBajo: Math.round(weight * 3),
      magnesioAlto: Math.round(weight * 4),
    }),
    [weight]
  );

  const registerOffset = (key: string) => (e: LayoutChangeEvent) => {
    offsets.current[key] = e.nativeEvent.layout.y;
  };

  const scrollToSection = (key: string) => {
    const y = offsets.current[key];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <GuidePhotoHeader image={require('../../assets/supplementation-guide-header.jpg')} onBack={() => navigation?.goBack()} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 40 + WORKOUT_MINIBAR_CLEARANCE }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.brandKicker}>
            Be <Text style={styles.titleAccent}>Stronger</Text>
          </Text>
          <Text style={styles.title}>
            Guía de <Text style={styles.titleAccent}>Suplementación</Text>
          </Text>
          <Text style={styles.description}>Evidencia científica · Dosis · Timing · Combinaciones · 2026</Text>
        </View>
        <Divider style={{ marginHorizontal: 20, marginBottom: 8 }} />

        {/* Índice de contenidos */}
        <View style={styles.tocBox}>
          <Text style={styles.tocTitle}>📑 Índice de Contenidos</Text>
          {TOC_ITEMS.map((item) =>
            item.anchor ? (
              <Text key={item.key} style={styles.tocLink} onPress={() => scrollToSection(item.anchor!)}>
                {item.label}
              </Text>
            ) : (
              <Text key={item.key} style={styles.tocLinkDisabled}>
                {item.label}
              </Text>
            )
          )}
        </View>

        {/* Introducción */}
        <View onLayout={registerOffset('intro')}>
          <Section styles={styles} title="¿Qué es un suplemento?">
            <P styles={styles}>
              Un suplemento dietético es un producto diseñado para complementar la alimentación
              cuando esta no cubre por sí sola determinadas necesidades nutricionales o de
              rendimiento.{' '}
              <Text style={styles.inlineBold}>
                No es un sustituto de la dieta, no es un atajo y no puede compensar malos hábitos
                de entrenamiento o descanso.
              </Text>
            </P>
            <HighlightBox styles={styles} title="⚠️ Antes de suplementarte:">
              <Text style={styles.highlightText}>
                Ningún suplemento sustituye una dieta bien estructurada, un entrenamiento
                progresivo y un descanso suficiente. Si los tres pilares no están en orden, los
                suplementos no marcarán ninguna diferencia significativa. Prioriza siempre en ese
                orden.
              </Text>
            </HighlightBox>

            <SubHeading styles={styles}>Sistema de clasificación por evidencia</SubHeading>
            <P styles={styles}>
              Cada suplemento de esta guía está clasificado en uno de tres niveles según la
              solidez de la evidencia científica disponible:
            </P>

            <HighlightBox styles={styles} variant="success" title="TIER 1 — Evidencia sólida">
              <Text style={styles.highlightText}>
                Múltiples estudios independientes, metaanálisis y revisiones sistemáticas
                confirman su eficacia y seguridad. Recomendación directa sin reservas.
              </Text>
            </HighlightBox>
            <HighlightBox styles={styles} variant="warning" title="TIER 2 — Evidencia moderada">
              <Text style={styles.highlightText}>
                Estudios prometedores pero con limitaciones: muestras pequeñas, falta de
                replicación o efectos variables según el individuo. Pueden ser útiles en contextos
                específicos.
              </Text>
            </HighlightBox>
            <HighlightBox styles={styles} variant="danger" title="TIER 3 — Evidencia débil o nula">
              <Text style={styles.highlightText}>
                Sin respaldo científico sólido o con estudios que no se han podido replicar.
                Frecuentemente promovidos por marketing. No recomendados.
              </Text>
            </HighlightBox>
          </Section>
        </View>

        {/* TIER 1 */}
        <View onLayout={registerOffset('tier1')}>
          <Section styles={styles} title="TIER 1 — Evidencia Sólida">
            <P styles={styles}>
              Estos son los únicos suplementos que Be Stronger recomienda de forma sistemática. Si
              solo vas a suplementarte con algo, que sea con uno de estos.
            </P>

            <SupplementCard
              styles={styles}
              name="1. Creatina Monohidrato"
              tier={1}
              rows={[
                {
                  label: 'Para qué sirve',
                  value:
                    'Aumenta los depósitos de fosfocreatina muscular, incrementando la potencia y la fuerza en esfuerzos de alta intensidad y corta duración. Favorece la retención de masa muscular en déficit calórico. Es el suplemento más estudiado de la historia.',
                },
                {
                  label: 'Dosis recomendada',
                  value:
                    'Dosis plana de 3-5 g/día para la mayoría de personas. Algunos protocolos sugieren 0,03-0,05 g/kg/día para ajuste fino por peso: 60 kg → 1,8-3 g; 75 kg → 2,3-3,8 g; 90 kg → 2,7-4,5 g. En la práctica, 5 g/día es la dosis estándar segura y eficaz para cualquier peso. Sin fase de carga necesaria. Monohidrato estándar (no hace falta pagar por versiones premium como HCl o Kre-Alkalyn).',
                },
                {
                  label: 'Cuándo tomarlo',
                  value:
                    'En cualquier momento del día. La consistencia diaria importa más que el timing exacto. Puede tomarse con la comida post-entrenamiento para facilitar el hábito.',
                },
                { label: 'Combinar con', value: 'Agua abundante (aumenta la retención hídrica intramuscular). Compatible con proteína y cafeína sin problema.' },
                { label: 'Evitar con', value: 'No hay contraindicaciones relevantes en personas sanas. Hidratarse bien.' },
              ]}
            >
              <HighlightBox styles={styles} title="Nota:">
                <Text style={styles.highlightText}>
                  La retención de agua inicial (1-2 kg en las primeras semanas) es intramuscular,
                  no subcutánea. No afecta negativamente a la estética.
                </Text>
              </HighlightBox>
            </SupplementCard>

            <SupplementCard
              styles={styles}
              name="2. Proteína en Polvo (Whey / Caseína / Vegetal)"
              tier={1}
              rows={[
                {
                  label: 'Para qué sirve',
                  value:
                    'Herramienta práctica para alcanzar los requerimientos proteicos diarios (1,8-2,2 g/kg) cuando la dieta sólida no es suficiente. No tiene propiedades mágicas: es simplemente proteína concentrada.',
                },
                {
                  label: 'Dosis recomendada',
                  value:
                    'La dosis del batido (25-40 g de proteína) depende del déficit respecto al objetivo diario total, que si se calcula por peso: 1,8-2,2 g/kg/día. Ejemplos: 60 kg → 108-132 g/día; 75 kg → 135-165 g/día; 90 kg → 162-198 g/día. Calcula cuánto cubre con comida sólida y usa el batido solo para cerrar la diferencia. Whey (suero) para post-entrenamiento por su rápida absorción. Caseína antes de dormir por su liberación lenta. Proteína vegetal (guisante + arroz) para intolerantes a la lactosa o veganos.',
                },
                {
                  label: 'Cuándo tomarlo',
                  value:
                    'Whey: post-entrenamiento o entre comidas para cubrir el objetivo diario. Caseína: antes de dormir. No hay ventana anabólica estricta — lo que importa es el total diario.',
                },
                { label: 'Combinar con', value: 'Compatible con cualquier comida. Añadir a avena, yogur griego o batidos sin problema.' },
                {
                  label: 'Evitar con',
                  value: 'Nada relevante. Si hay intolerancia a la lactosa, elegir aislado de whey (proceso de filtrado elimina la lactosa) o proteína vegetal.',
                },
              ]}
            >
              <HighlightBox styles={styles} title="Nota:">
                <Text style={styles.highlightText}>
                  Si con la dieta sólida ya alcanzas el objetivo proteico, el batido es
                  innecesario. El suplemento no supera la proteína de alimentos reales en calidad.
                </Text>
              </HighlightBox>
            </SupplementCard>

            <SupplementCard
              styles={styles}
              name="3. Cafeína"
              tier={1}
              rows={[
                {
                  label: 'Para qué sirve',
                  value:
                    'Mejora el rendimiento en resistencia y fuerza, reduce la percepción de esfuerzo, aumenta la alerta y la concentración. También tiene un leve efecto supresor del apetito útil en déficit calórico.',
                },
                {
                  label: 'Dosis recomendada',
                  value:
                    '3-6 mg por kg de peso corporal. Ejemplos: 60 kg → 180-360 mg; 75 kg → 225-450 mg; 90 kg → 270-540 mg. Empezar siempre por el rango bajo para evaluar tolerancia individual. Dosis superiores a 500 mg no mejoran el rendimiento y sí aumentan los efectos adversos (taquicardia, ansiedad, insomnio).',
                },
                {
                  label: 'Cuándo tomarlo',
                  value: '30-60 minutos antes del entrenamiento para maximizar el efecto ergogénico. Evitar después de las 14-15h para no interferir con el sueño.',
                },
                { label: 'Combinar con', value: 'Compatible con creatina (combinación clásica). También con beta-alanina en el pre-entrenamiento.' },
                {
                  label: 'Evitar con',
                  value:
                    'El sueño es el enemigo principal. Consumo nocturno tiene vida media de 5-6 horas: un café a las 18h puede afectar el sueño a las 23h. Evitar dependencia diaria: ciclar 4-6 semanas de uso y 1-2 semanas sin ella maximiza el efecto. No usar como sustituto del sueño.',
                },
              ]}
            >
              <HighlightBox styles={styles} title="Nota:">
                <Text style={styles.highlightText}>
                  La tolerancia a la cafeína se desarrolla rápidamente. Ciclar 4-6 semanas de uso y
                  1-2 semanas sin ella maximiza el efecto. No usar como sustituto del sueño.
                </Text>
              </HighlightBox>
            </SupplementCard>

            <SupplementCard
              styles={styles}
              name="4. Omega-3 (EPA + DHA)"
              tier={1}
              rows={[
                {
                  label: 'Para qué sirve',
                  value:
                    'Reduce la inflamación sistémica, mejora la salud cardiovascular, favorece la recuperación muscular y tiene efectos positivos sobre la salud cognitiva. Especialmente relevante si el consumo de pescado azul es bajo.',
                },
                {
                  label: 'Dosis recomendada',
                  value:
                    '2-3 g/día de EPA+DHA combinados (no de aceite de pescado total — leer la etiqueta). La dosis no se calcula por peso, pero personas con mayor masa corporal o mayor porcentaje de grasa pueden beneficiarse del rango alto: 60 kg → 2 g; 75-90 kg → 2,5-3 g. Elegir aceite de pescado concentrado o krill para mayor pureza.',
                },
                { label: 'Cuándo tomarlo', value: 'Con las comidas para mejorar la absorción y reducir el sabor a pescado.' },
                { label: 'Combinar con', value: 'Compatible con vitamina D (ambos liposolubles, se absorben mejor con grasa).' },
                { label: 'Evitar con', value: 'Altas dosis (>3 g/día) pueden tener leve efecto anticoagulante. Consultar con médico si se toman anticoagulantes.' },
              ]}
            >
              <HighlightBox styles={styles} title="Nota:">
                <Text style={styles.highlightText}>
                  Si consumes 3-4 raciones semanales de pescado azul (salmón, sardinas, caballa),
                  el suplemento es opcional. En dietas bajas en pescado, es de los más rentables
                  que puedes tomar.
                </Text>
              </HighlightBox>
            </SupplementCard>

            <SupplementCard
              styles={styles}
              name="5. Vitamina D3 + K2"
              tier={1}
              rows={[
                {
                  label: 'Para qué sirve',
                  value:
                    'La vitamina D3 es fundamental para la función muscular, inmune, hormonal y ósea. La deficiencia es muy prevalente en Europa, especialmente en invierno. La K2 acompaña a la D3 para dirigir el calcio a los huesos y no a las arterias.',
                },
                {
                  label: 'Dosis recomendada',
                  value:
                    'Vitamina D3: 2,000-4,000 UI/día sin analítica previa. Personas con mayor peso corporal o mayor porcentaje de grasa pueden necesitar el rango alto (la vitamina D se secuestra en tejido adiposo): hasta 60 kg → 2,000 UI; 60-85 kg → 2,000-3,000 UI; más de 85 kg → 3,000-4,000 UI. Con analítica que muestre deficiencia, puede subirse bajo supervisión médica. K2 (MK-7): 100-200 mcg/día junto a la D3.',
                },
                { label: 'Cuándo tomarlo', value: 'Con la comida más abundante del día (mejor absorción con grasas).' },
                { label: 'Combinar con', value: 'Tomar D3 y K2 siempre juntas. Compatible con omega-3 y magnesio.' },
                { label: 'Evitar con', value: 'No exceder 10,000 UI/día de D3 sin supervisión médica (riesgo de toxicidad).' },
              ]}
            >
              <HighlightBox styles={styles} title="Nota:">
                <Text style={styles.highlightText}>
                  La mayoría de personas en España tienen niveles subóptimos de vitamina D en
                  invierno. Una analítica básica permite ajustar la dosis con precisión.
                </Text>
              </HighlightBox>
            </SupplementCard>
          </Section>
        </View>

        {/* Calculadoras */}
        <View onLayout={registerOffset('calculadoras')}>
          <Section styles={styles} title="Calculadoras Personalizadas">
            <P styles={styles}>Introduce tu peso corporal para calcular las dosis recomendadas de cada suplemento:</P>

            <View style={styles.calculatorBox}>
              <Text style={styles.calculatorTitle}>📊 Calculadora de Dosis</Text>
              <Text style={styles.calcInputLabel}>Tu peso corporal (kg)</Text>
              <Input style={styles.calcInput}>
                <InputField
                  keyboardType="numeric"
                  value={weightInput}
                  onChangeText={setWeightInput}
                  placeholder="Ej: 75"
                />
              </Input>

              <View style={styles.calcResultsGrid}>
                <CalcResult styles={styles} label="Creatina Monohidrato" value="5 g" note="Diarios (dosis estándar)" />
                <CalcResult styles={styles} label="Cafeína (rango bajo)" value={`${calc.cafeinaBajo} mg`} note="Antes del entrenamiento" />
                <CalcResult styles={styles} label="Cafeína (rango alto)" value={`${calc.cafeinaAlto} mg`} note="Máximo recomendado" />
                <CalcResult styles={styles} label="Proteína Diaria" value={`${calc.proteinaBajo}-${calc.proteinaAlto} g`} note="Total (1,8-2,2 g/kg)" />
                <CalcResult styles={styles} label="Zinc" value={`${calc.zincBajo}-${calc.zincAlto} mg`} note="Diarios con comida" />
                <CalcResult styles={styles} label="Magnesio" value={`${calc.magnesioBajo}-${calc.magnesioAlto} mg`} note="Antes de dormir" />
              </View>
            </View>
          </Section>
        </View>

        {/* Stacks */}
        <View onLayout={registerOffset('stacks')}>
          <Section styles={styles} title="Stacks Recomendados por Objetivo">
            <P styles={styles}>
              Un stack es una combinación de suplementos orientada a un objetivo específico. Estos
              son los tres más habituales en los perfiles de Be Stronger:
            </P>

            <View style={styles.stackCard}>
              <Text style={styles.stackName}>💪 Stack Hipertrofia (Ganancia Muscular)</Text>
              <Text style={styles.stackLabel}>Obligatorio</Text>
              <Bullet styles={styles} glyph="✓">
                <Text style={styles.inlineBold}>Creatina: </Text>5 g/día
              </Bullet>
              <Bullet styles={styles} glyph="✓" last>
                <Text style={styles.inlineBold}>Proteína en polvo: </Text>Si no alcanzas el objetivo con comida sólida
              </Bullet>
              <Text style={styles.stackLabel}>Recomendado</Text>
              <Bullet styles={styles} glyph="✓">
                <Text style={styles.inlineBold}>Vitamina D3 + K2: </Text>2,000-4,000 UI + 100-200 mcg
              </Bullet>
              <Bullet styles={styles} glyph="✓">
                <Text style={styles.inlineBold}>Omega-3: </Text>2-3 g/día
              </Bullet>
              <Bullet styles={styles} glyph="✓" last>
                <Text style={styles.inlineBold}>Cafeína: </Text>3-6 mg/kg pre-entrenamiento (opcional)
              </Bullet>
              <Text style={styles.stackLabel}>Opcional (Tier 2)</Text>
              <Bullet styles={styles} glyph="✓" last>
                <Text style={styles.inlineBold}>Citrulina Malato: </Text>6-8 g pre-entrenamiento en días de volumen alto
              </Bullet>
            </View>

            <View style={styles.stackCard}>
              <Text style={styles.stackName}>🔥 Stack Pérdida de Grasa (Recomposición)</Text>
              <Text style={styles.stackLabel}>Obligatorio</Text>
              <Bullet styles={styles} glyph="✓" last>
                <Text style={styles.inlineBold}>Proteína en polvo: </Text>Crítico para mantener masa muscular en déficit
              </Bullet>
              <Text style={styles.stackLabel}>Recomendado</Text>
              <Bullet styles={styles} glyph="✓">
                <Text style={styles.inlineBold}>Cafeína: </Text>3-6 mg/kg pre-entrenamiento (efecto supresor del apetito)
              </Bullet>
              <Bullet styles={styles} glyph="✓">
                <Text style={styles.inlineBold}>Vitamina D3 + K2: </Text>2,000-4,000 UI + 100-200 mcg
              </Bullet>
              <Bullet styles={styles} glyph="✓">
                <Text style={styles.inlineBold}>Omega-3: </Text>2-3 g/día
              </Bullet>
              <Bullet styles={styles} glyph="✓" last>
                <Text style={styles.inlineBold}>Creatina: </Text>5 g/día (retiene masa muscular en déficit)
              </Bullet>
              <Text style={styles.stackLabel}>Opcional (Tier 2)</Text>
              <Bullet styles={styles} glyph="✓" last>
                <Text style={styles.inlineBold}>Beta-Alanina: </Text>3,2-6,4 g/día (mejora resistencia en déficit)
              </Bullet>
            </View>

            <View style={styles.stackCard}>
              <Text style={styles.stackName}>⚖️ Stack Mantenimiento (Salud General)</Text>
              <Text style={styles.stackLabel}>Recomendado</Text>
              <Bullet styles={styles} glyph="✓">
                <Text style={styles.inlineBold}>Vitamina D3 + K2: </Text>2,000-4,000 UI + 100-200 mcg
              </Bullet>
              <Bullet styles={styles} glyph="✓">
                <Text style={styles.inlineBold}>Omega-3: </Text>2-3 g/día
              </Bullet>
              <Bullet styles={styles} glyph="✓" last>
                <Text style={styles.inlineBold}>Magnesio: </Text>200-300 mg antes de dormir
              </Bullet>
              <Text style={styles.stackLabel}>Opcional</Text>
              <Bullet styles={styles} glyph="✓" last>
                <Text style={styles.inlineBold}>Proteína en polvo: </Text>Si la dieta es baja en proteína
              </Bullet>
            </View>
          </Section>
        </View>

        {/* Footer */}
        <View style={styles.footerBox}>
          <Text style={styles.footerTitle}>Recuerda</Text>
          <Text style={[styles.footerText, { marginTop: 10, marginBottom: 0 }]}>
            Los suplementos son el 5% del resultado.{' '}
            <Text style={styles.inlineBold}>
              El 95% viene de: dieta consistente, entrenamiento progresivo y descanso suficiente.
            </Text>{' '}
            Si estos tres pilares no están en orden, ningún suplemento te llevará a tu objetivo.
            Invierte primero en lo que realmente importa.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
