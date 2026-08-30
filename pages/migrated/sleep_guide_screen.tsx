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
  HighlightBox,
  DataTable,
  TocItem,
  GuideCard,
  ChecklistItem,
  SelectRow,
  GuideStyles,
} from '@components/GuideBlocks';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { useAppColorMode } from '@helper/useAppColorMode';

// Guía estática compartida por todos los usuarios (pedido explícito
// 2026-08-30, misma naturaleza que las 3 guías anteriores) -- contenido
// migrado 1:1 desde el HTML original (guiasuenomejorada.html) a componentes
// reales de React Native/Expo, sin WebView. La calculadora de horas de
// sueño y el checklist SÍ son interactivos de verdad (mismo criterio que la
// calculadora de la Guía de Suplementación), replicando exactamente la
// lógica del <script> original: edad por defecto 28, objetivo por defecto
// "Ganancia muscular" (primera opción del <select>), intensidad por
// defecto "Baja" (primera opción) -- el resultado inicial real es "7-9",
// no el placeholder estático "7-8" que el HTML muestra antes de que su
// propio script se ejecute.
//
// Una frase del cierre del HTML original menciona "contactarme a través de
// HubFit" -- se mantiene tal cual (no se reescribe contenido), aunque
// probablemente sea un desliz de otra plantilla ya que el resto de la guía
// y la app son "Be Stronger".
interface Props {
  navigation?: any;
}

const TOC_ITEMS = [
  { key: 'beneficios', emoji: '💪', title: 'Beneficios Clave', description: 'Recuperación muscular y hormonal' },
  { key: 'importancia', emoji: '🔬', title: '¿Por Qué es Importante?', description: 'Ciencia detrás del sueño' },
  { key: 'consejos', emoji: '😴', title: 'Para Dormir Mejor', description: 'Estrategias prácticas' },
  { key: 'suplementos', emoji: '💊', title: 'Suplementos Clave', description: 'Opciones recomendadas' },
  { key: 'calculadora', emoji: '🧮', title: 'Calculadora', description: 'Horas necesarias' },
  { key: 'checklist', emoji: '✓', title: 'Checklist', description: 'Rutina de sueño' },
];

const OBJETIVOS = [
  { value: 'ganancia', label: 'Ganancia muscular' },
  { value: 'perdida', label: 'Pérdida de grasa' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'fuerza', label: 'Fuerza pura' },
];

const INTENSIDADES = [
  { value: 'baja', label: 'Baja (1-2 días/semana)' },
  { value: 'moderada', label: 'Moderada (3-4 días/semana)' },
  { value: 'alta', label: 'Alta (5-6 días/semana)' },
  { value: 'extrema', label: 'Extrema (6+ días/semana)' },
];

const CHECKLIST_LABELS = [
  'Acuéstame y me levanto a la misma hora cada día (incluyendo fines de semana)',
  'Evito cafeína después de las 14:00 horas',
  'Apago pantallas 60 minutos antes de dormir',
  'Mi dormitorio está oscuro, silencioso y a 18-20°C',
  'Realizo una cena ligera 2-3 horas antes de dormir',
  'Practico una rutina pre-sueño consistente (lectura, meditación, etc.)',
  'Duermo 7-9 horas cada noche',
  'Evito alcohol 4-6 horas antes de dormir',
  'Realizo ejercicio, pero no dentro de 3 horas antes de dormir',
  'Practico técnicas de relajación (respiración, meditación)',
];

function AlertBullets({ styles, items }: { styles: GuideStyles; items: string[] }) {
  return (
    <>
      {items.map((item, i) => (
        <Text key={i} style={[styles.highlightText, i > 0 && { marginTop: 6 }]}>
          • {item}
        </Text>
      ))}
    </>
  );
}

export default function SleepGuideScreen({ navigation }: Props) {
  const { colors: C } = useAppColorMode();
  const styles = createGuideStyles(C);
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});

  const [edadInput, setEdadInput] = useState('28');
  const [objetivo, setObjetivo] = useState('ganancia');
  const [intensidad, setIntensidad] = useState('baja');
  const [checked, setChecked] = useState<boolean[]>(() => CHECKLIST_LABELS.map(() => false));

  const edad = parseInt(edadInput, 10) || 28;
  const { min, max } = useMemo(() => {
    let horas = 7;
    if (edad < 25) horas += 0.5;
    if (edad > 40) horas += 0.5;
    if (objetivo === 'ganancia') horas += 0.5;
    if (objetivo === 'fuerza') horas += 0.5;
    if (intensidad === 'alta') horas += 0.5;
    if (intensidad === 'extrema') horas += 1;
    return { min: Math.floor(horas), max: Math.ceil(horas) + 1 };
  }, [edad, objetivo, intensidad]);

  const toggleCheck = (i: number) => setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  const checkedCount = checked.filter(Boolean).length;

  const registerOffset = (key: string) => (e: LayoutChangeEvent) => {
    offsets.current[key] = e.nativeEvent.layout.y;
  };
  const scrollToSection = (key: string) => {
    const y = offsets.current[key];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <GuidePhotoHeader image={require('../../assets/sleep-guide-header.jpg')} onBack={() => navigation?.goBack()} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 40 + WORKOUT_MINIBAR_CLEARANCE }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.brandKicker}>
            Be <Text style={styles.titleAccent}>Stronger</Text>
          </Text>
          <Text style={styles.subtitle}>Recuperación · Hormonal · Rendimiento · 2026</Text>
          <Text style={styles.title}>Tu músculo crece cuando descansas, no solo cuando entrenas</Text>
        </View>
        <Divider style={{ marginHorizontal: 20, marginBottom: 8 }} />

        {/* Índice de contenidos */}
        <View style={styles.tocBox}>
          <Text style={styles.tocTitle}>Índice de Contenidos</Text>
          {TOC_ITEMS.map((item) => (
            <TocItem
              key={item.key}
              styles={styles}
              label={`${item.emoji} ${item.title}`}
              description={item.description}
              onPress={() => scrollToSection(item.key)}
            />
          ))}
        </View>

        {/* Beneficios Clave */}
        <View onLayout={registerOffset('beneficios')}>
          <Section styles={styles} title="💪 Beneficios Clave del Sueño">
            <P styles={styles}>
              El sueño es el pilar fundamental para la recuperación y el rendimiento. Durante las
              fases de sueño profundo ocurren procesos críticos que determinan tu progreso en el
              entrenamiento.
            </P>
            <GuideCard styles={styles} icon="🏗️" title="Recuperación Muscular">
              Se produce la recuperación y construcción de tejido muscular. Los aminoácidos
              circulantes se utilizan para reparar las micro-roturas generadas durante el
              entrenamiento.
            </GuideCard>
            <GuideCard styles={styles} icon="⚡" title="Liberación Hormonal">
              Alta liberación de testosterona, hormona del crecimiento (GH) y otras hormonas
              anabólicas durante el sueño profundo, esenciales para ganancia muscular y fuerza.
            </GuideCard>
            <GuideCard styles={styles} icon="🧠" title="Reducción del Estrés">
              Reducción del cortisol (hormona del estrés) y mejora del equilibrio hormonal
              general, facilitando la pérdida de grasa y la recuperación.
            </GuideCard>
          </Section>
        </View>

        {/* ¿Por Qué es Importante? */}
        <View onLayout={registerOffset('importancia')}>
          <Section styles={styles} title="🔬 ¿Por Qué es Tan Importante?">
            <SubHeading styles={styles}>A Nivel Hormonal</SubHeading>
            <P styles={styles}>
              <Text style={styles.inlineBold}>Testosterona: </Text>
              El sueño profundo favorece su producción, esencial para ganar masa muscular y
              fuerza. Dormir menos de 7 horas reduce significativamente los niveles de
              testosterona.
            </P>
            <P styles={styles}>
              <Text style={styles.inlineBold}>Hormona del Crecimiento (GH): </Text>
              Se libera principalmente durante las fases de sueño profundo (estadios 3 y 4).
              Repara tejidos, estimula la síntesis proteica y favorece la recuperación muscular.
            </P>
            <P styles={styles}>
              <Text style={styles.inlineBold}>Cortisol: </Text>
              Dormir bien mantiene esta “hormona del estrés” bajo control. Niveles altos de
              cortisol dificultan la pérdida de grasa, aumentan la inflamación y ralentizan la
              recuperación.
            </P>

            <SubHeading styles={styles}>Síntesis de Proteínas</SubHeading>
            <P styles={styles}>
              Al aumentar la liberación de hormona del crecimiento y testosterona durante el
              sueño, se activa la síntesis de proteínas. Esta reparación no solo permite recuperar
              fuerza y rendimiento, sino que también favorece el crecimiento de nueva masa
              muscular.
            </P>

            <SubHeading styles={styles}>Menos Sueño = Menos Rendimiento</SubHeading>
            <HighlightBox styles={styles} title="⚠️ Impacto de dormir menos de 7 horas:">
              <AlertBullets
                styles={styles}
                items={[
                  'Altera hormonas que regulan el apetito (aumenta grelina, reduce leptina)',
                  'Eleva los antojos de comida calórica, dificultando mantener un déficit',
                  'Reduce capacidad de concentración, fuerza y recuperación',
                  'Mayor riesgo de lesión durante el entrenamiento',
                  'Ralentiza la ganancia muscular y la pérdida de grasa',
                ]}
              />
            </HighlightBox>

            <DataTable
              styles={styles}
              columns={['Horas de Sueño', 'Impacto en Rendimiento', 'Impacto en Composición Corporal']}
              widths={[110, 160, 220]}
              rows={[
                [[{ text: '9+ horas', bold: true }], 'Óptimo', 'Máxima recuperación y síntesis proteica'],
                [[{ text: '7-8 horas', bold: true }], 'Muy bueno', 'Recuperación adecuada, balance hormonal'],
                [[{ text: '6-7 horas', bold: true }], 'Aceptable', 'Rendimiento reducido, apetito aumentado'],
                [[{ text: '<6 horas', bold: true }], 'Pobre', 'Pérdida de rendimiento, difícil mantener déficit'],
              ]}
            />
          </Section>
        </View>

        {/* Para Dormir Mejor */}
        <View onLayout={registerOffset('consejos')}>
          <Section styles={styles} title="😴 Para Dormir Mejor">
            <P styles={styles}>Implementa estas estrategias para optimizar tu sueño y maximizar la recuperación:</P>
            <GuideCard styles={styles} icon="💡" title="Luz">
              <Text style={styles.inlineBold}>Evita pantallas 60 minutos antes de dormir </Text>
              o utiliza modo nocturno. La luz azul suprime la melatonina, dificultando conciliar
              el sueño.
            </GuideCard>
            <GuideCard styles={styles} icon="☕" title="Estímulos">
              <Text style={styles.inlineBold}>Limita cafeína 6-8 horas antes de dormir. </Text>
              Realiza cenas ligeras para evitar digestión pesada durante la noche.
            </GuideCard>
            <GuideCard styles={styles} icon="⏰" title="Horario">
              <Text style={styles.inlineBold}>Acuéstate y levántate siempre a la misma hora, </Text>
              incluso los fines de semana. Esto sincroniza tu reloj circadiano.
            </GuideCard>
            <GuideCard styles={styles} icon="🌡️" title="Ambiente">
              <Text style={styles.inlineBold}>Temperatura: 18-20°C, habitación oscura y silenciosa. </Text>
              Un ambiente frío favorece la conciliación del sueño.
            </GuideCard>
            <GuideCard styles={styles} icon="📖" title="Hábitos">
              <Text style={styles.inlineBold}>Realiza las mismas tareas pre-sueño </Text>
              (leer, preparar ropa del día siguiente). Esto señala al cuerpo que es hora de
              dormir.
            </GuideCard>
            <GuideCard styles={styles} icon="🧘" title="Relajación">
              <Text style={styles.inlineBold}>Respiraciones controladas te dormirás más rápido. </Text>
              Prueba la técnica 4-7-8: inhala 4, sostén 7, exhala 8.
            </GuideCard>
          </Section>
        </View>

        {/* Suplementos Clave */}
        <View onLayout={registerOffset('suplementos')}>
          <Section styles={styles} title="💊 Suplementos Clave para el Sueño">
            <P styles={styles}>
              Estos suplementos pueden ayudarte a optimizar la calidad del sueño cuando los
              hábitos básicos están en orden:
            </P>
            <DataTable
              styles={styles}
              columns={['Suplemento', 'Función', 'Dosis', 'Cuándo Tomarlo']}
              widths={[110, 220, 100, 170]}
              rows={[
                [
                  [{ text: 'Melatonina', bold: true }],
                  'Regula el reloj cronológico y facilita la conciliación del sueño',
                  '0.5-3 mg',
                  '30-60 min antes de dormir',
                ],
                [
                  [{ text: 'Magnesio', bold: true }],
                  'Favorece el descanso nocturno profundo, evita interrupciones, recuperación muscular',
                  '200-400 mg',
                  '1-2 horas antes de dormir',
                ],
                [
                  [{ text: 'Valeriana', bold: true }],
                  'Promueve la relajación y facilita la conciliación del sueño',
                  '400-900 mg',
                  '30-60 min antes de dormir',
                ],
                [
                  [{ text: 'GABA', bold: true }],
                  'Neurotransmisor inhibidor que reduce la ansiedad y promueve relajación',
                  '500-1000 mg',
                  '30-60 min antes de dormir',
                ],
                [
                  [{ text: 'L-Teanina', bold: true }],
                  'Aminoácido que promueve relajación sin sedación diurna',
                  '100-200 mg',
                  'Antes de dormir o durante el día',
                ],
              ]}
            />
            <HighlightBox styles={styles} title="💡 Nota importante:">
              <Text style={styles.highlightText}>
                Los suplementos son herramientas complementarias. Prioriza siempre los hábitos
                básicos (horario consistente, ambiente oscuro, sin cafeína tarde, etc.) antes de
                recurrir a suplementos.
              </Text>
            </HighlightBox>
          </Section>
        </View>

        {/* Calculadora */}
        <View onLayout={registerOffset('calculadora')}>
          <Section styles={styles} title="🧮 Calculadora de Horas de Sueño Necesarias">
            <View style={styles.calculatorBox}>
              <Text style={styles.calculatorTitle}>¿Cuántas horas necesitas dormir?</Text>

              <Text style={styles.calcInputLabel}>Tu edad (años)</Text>
              <Input style={styles.calcInput}>
                <InputField keyboardType="numeric" value={edadInput} onChangeText={setEdadInput} placeholder="Ej: 28" />
              </Input>

              <Text style={[styles.calcInputLabel, { marginTop: 16 }]}>Objetivo principal</Text>
              {OBJETIVOS.map((o) => (
                <SelectRow key={o.value} styles={styles} label={o.label} selected={objetivo === o.value} onPress={() => setObjetivo(o.value)} />
              ))}

              <Text style={[styles.calcInputLabel, { marginTop: 8 }]}>Intensidad de entrenamiento</Text>
              {INTENSIDADES.map((o) => (
                <SelectRow key={o.value} styles={styles} label={o.label} selected={intensidad === o.value} onPress={() => setIntensidad(o.value)} />
              ))}

              <View style={[styles.calcResultBox, { width: '100%', marginTop: 8, alignItems: 'center' }]}>
                <Text style={styles.calcResultLabel}>Horas de sueño recomendadas por noche</Text>
                <Text style={[styles.calcResultValue, { fontSize: 32 }]}>
                  {min}-{max}
                </Text>
              </View>
              <Text style={[styles.description, { marginTop: 14, maxWidth: undefined }]}>
                <Text style={styles.inlineBold}>Recomendación: </Text>
                Basado en tu edad ({edad} años), objetivo ({objetivo}) e intensidad de
                entrenamiento ({intensidad}), se recomienda dormir entre {min}-{max} horas
                diarias. Mantén una rutina consistente para optimizar recuperación y rendimiento.
              </Text>
            </View>
          </Section>
        </View>

        {/* Checklist */}
        <View onLayout={registerOffset('checklist')}>
          <Section styles={styles} title="✓ Checklist de Sueño Óptimo">
            <P styles={styles}>
              Utiliza este checklist para monitorear tu rutina de sueño. Marca los ítems que
              implementas diariamente:
            </P>
            <View style={styles.checklistBox}>
              {CHECKLIST_LABELS.map((label, i) => (
                <ChecklistItem key={i} styles={styles} checked={checked[i]} onToggle={() => toggleCheck(i)}>
                  {label}
                </ChecklistItem>
              ))}
            </View>
            <HighlightBox styles={styles} title="🎯 Meta:">
              <Text style={styles.highlightText}>
                Marca al menos 8 de 10 ítems diariamente para optimizar tu sueño y recuperación.
                {'\n'}Llevas {checkedCount} de 10 marcados.
              </Text>
            </HighlightBox>
          </Section>
        </View>

        {/* Conclusión */}
        <Section styles={styles} title="🚀 Conclusión">
          <P styles={styles}>
            El sueño no es un lujo, es una necesidad fisiológica fundamental para tu rendimiento,
            recuperación y composición corporal. Invertir en una buena rutina de sueño es tan
            importante como tu entrenamiento y nutrición.
          </P>
          <P styles={styles}>
            <Text style={styles.inlineBold}>Recuerda: </Text>
            Los suplementos son herramientas complementarias. Prioriza siempre los hábitos básicos
            de sueño antes de recurrir a cualquier suplemento.
          </P>
          <P styles={styles} last>
            Si tienes dudas sobre cómo optimizar tu sueño o necesitas ajustes personalizados según
            tu situación, no dudes en contactarme a través de HubFit. Estoy aquí para ayudarte a
            maximizar tu recuperación y rendimiento.
          </P>
        </Section>

        {/* Footer */}
        <View style={{ paddingHorizontal: 20, alignItems: 'center', marginTop: 8 }}>
          <Text style={styles.footerText}>© 2026 Be Stronger. Guía de Sueño, Recuperación y Rendimiento.</Text>
          <Text style={[styles.footerText, { marginBottom: 0 }]}>Todos los derechos reservados.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
