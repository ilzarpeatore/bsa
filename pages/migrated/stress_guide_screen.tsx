import React, { useRef, useState } from 'react';
import { ScrollView, View, LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@components/ui/text';
import { Divider } from '@components/ui/divider';
import GuidePhotoHeader from '@components/GuidePhotoHeader';
import {
  createGuideStyles,
  Section,
  SubHeading,
  P,
  Bullet,
  NoteCard,
  StatCard,
  AccordionItem,
  ChecklistItem,
  ActionItem,
  TocItem,
} from '@components/GuideBlocks';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { useAppColorMode } from '@helper/useAppColorMode';

// Guía estática compartida por todos los usuarios (pedido explícito
// 2026-08-30, misma naturaleza que las 4 guías anteriores) -- contenido
// migrado 1:1 desde el HTML original (guiagestionestres.html) a
// componentes reales de React Native/Expo, sin WebView.
//
// Los acordeones SÍ son interactivos de verdad (AccordionItem, con
// chevron real), replicando el comportamiento exacto del <script>
// original: un único acordeón abierto A LA VEZ **en toda la pantalla**
// (el script original cierra TODOS los .accordion-header del documento
// antes de abrir el pulsado, sin distinguir entre los 4 bloques de
// acordeones) -- de ahí un solo estado `openAccordion` compartido por las
// 14 tarjetas en vez de uno por bloque. El checklist de 14 señales
// también es interactivo (mismo criterio que la Guía de Sueño), con el
// contador real sustituyendo al "marca 5 o más" estático del HTML.
//
// El botón "← VOLVER AL MENÚ" del footer no tiene equivalente aquí --
// ya lo cubre la flecha atrás flotante de GuidePhotoHeader, mismo
// criterio que en las 4 guías anteriores.
interface Props {
  navigation?: any;
}

const SIGNALS: { category: string; items: string[] }[] = [
  {
    category: '🚩 Señales Físicas',
    items: [
      'Estancamiento de peso sin cambios en dieta o entrenamiento',
      'Retención de líquidos (especialmente abdominal)',
      'Antojos descontrolados, especialmente de ultraprocesados',
      'Fatiga persistente incluso después de descansar',
      'Dolor muscular o articular sin causa aparente',
    ],
  },
  {
    category: '📉 Señales de Rendimiento',
    items: [
      'Rendimiento en entrenamientos en bajada (menos fuerza, menos reps)',
      'Recuperación lenta entre sesiones',
      'Mayor susceptibilidad a lesiones',
    ],
  },
  {
    category: '🧠 Señales Emocionales',
    items: [
      'Irritabilidad o cambios de humor frecuentes',
      'Falta de motivación para entrenar',
      'Ansiedad o sensación de abrumación',
    ],
  },
  {
    category: '😴 Señales de Sueño',
    items: [
      'Dificultad para conciliar el sueño',
      'Despertares nocturnos frecuentes',
      'Sueño no reparador (despiertas cansado)',
    ],
  },
];

const TOC_ITEMS = [
  {
    key: 's1',
    label: '1. Introducción: El Factor Ignorado',
    description: 'Por qué el estrés sabotea tu progreso',
  },
  {
    key: 's2',
    label: '2. El Cortisol: Qué Es y Qué Hace',
    description: 'Cortisol agudo vs. crónico y su impacto',
  },
  {
    key: 's3',
    label: '3. Fuentes de Estrés que Afectan tu Composición Corporal',
    description: 'Los 5 factores que más estrés generan',
  },
  {
    key: 's4',
    label: '4. Cómo Identificar que el Estrés Te Está Frenando',
    description: '14 señales de alerta para autoevaluarte',
  },
  {
    key: 's5',
    label: '5. Protocolo de Gestión del Estrés Aplicado',
    description: 'Estrategias de sueño, nutrición y entrenamiento',
  },
  {
    key: 's6',
    label: '6. Plan de Acción Semanal: Comienza Esta Semana',
    description: '7 hábitos para empezar esta semana',
  },
  {
    key: 's7',
    label: '7. Cierre: Tu Transformación Comienza Aquí',
    description: 'Resumen y próximos pasos',
  },
];

export default function StressGuideScreen({ navigation }: Props) {
  const { colors: C } = useAppColorMode();
  const styles = createGuideStyles(C);
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const toggle = (key: string) => setOpenAccordion((prev) => (prev === key ? null : key));

  const totalSignals = SIGNALS.reduce((sum, g) => sum + g.items.length, 0);
  const [checked, setChecked] = useState<boolean[]>(() => Array(totalSignals).fill(false));
  const toggleCheck = (i: number) =>
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  const checkedCount = checked.filter(Boolean).length;
  let signalIndex = 0;

  const registerOffset = (key: string) => (e: LayoutChangeEvent) => {
    offsets.current[key] = e.nativeEvent.layout.y;
  };
  const scrollToSection = (key: string) => {
    const y = offsets.current[key];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <GuidePhotoHeader
        image={require('../../assets/stress-guide-header.jpg')}
        onBack={() => navigation?.goBack()}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 40 + WORKOUT_MINIBAR_CLEARANCE }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={styles.brandKicker}>
            Be <Text style={styles.titleAccent}>Stronger</Text>
          </Text>
          <Text style={styles.title}>El Estrés: Tu Enemigo Silencioso</Text>
          <Text style={styles.description}>
            Descubre cómo el cortisol sabotea tu composición corporal y cómo recuperar el control
          </Text>
          <View style={styles.statsRow}>
            <StatCard styles={styles} number="85%">
              de personas con estrés crónico tienen dificultad para perder grasa
            </StatCard>
            <StatCard styles={styles} number="40%">
              aumento de apetito bajo estrés prolongado
            </StatCard>
            <StatCard styles={styles} number="10-15%">
              reducción del metabolismo con cortisol elevado
            </StatCard>
          </View>
        </View>
        <Divider style={{ marginHorizontal: 20, marginTop: 8, marginBottom: 8 }} />

        {/* Índice de contenidos */}
        <View style={styles.tocBox}>
          <Text style={styles.tocTitle}>📑 Índice de Contenidos</Text>
          {TOC_ITEMS.map((item) => (
            <TocItem
              key={item.key}
              styles={styles}
              label={item.label}
              description={item.description}
              onPress={() => scrollToSection(item.key)}
            />
          ))}
        </View>

        {/* 1. Introducción */}
        <View onLayout={registerOffset('s1')}>
          <Section styles={styles} title="1. Introducción: El Factor Ignorado">
            <P styles={styles}>
              Llevas meses comiendo en déficit, entrenando duro, durmiendo lo que puedes... pero tu
              composición corporal no cambia. Tu peso se estanca, la grasa abdominal persiste, y tu
              energía desaparece. ¿La culpa? Probablemente no sea tu dieta ni tu entrenamiento.
            </P>
            <P styles={styles}>
              <Text style={styles.inlineBold}>Es el estrés.</Text>
            </P>
            <P styles={styles}>
              El estrés crónico es uno de los factores más ignorados en la transformación corporal.
              Mientras te enfocas en macros y repeticiones, una hormona silenciosa está saboteando
              tu progreso: el cortisol.
            </P>
            <P styles={styles} last>
              No se trata de “relajarte más”. Se trata de entender cómo el estrés afecta tu
              fisiología, reconocer cuándo te está frenando, y aplicar estrategias concretas para
              recuperar el control. Esta guía te mostrará exactamente cómo hacerlo.
            </P>
          </Section>
        </View>

        {/* 2. El Cortisol */}
        <View onLayout={registerOffset('s2')}>
          <Section styles={styles} title="2. El Cortisol: Qué Es y Qué Hace">
            <SubHeading styles={styles}>El Cortisol No Es el “Malo”</SubHeading>
            <P styles={styles}>
              Primero, aclaremos algo importante:{' '}
              <Text style={styles.inlineBold}>el cortisol no es tu enemigo</Text>. Es una hormona
              esencial que tu cuerpo produce para ayudarte a enfrentar desafíos. Sin cortisol, no
              podrías levantarte de la cama por la mañana.
            </P>
            <P styles={styles}>
              El problema surge cuando el cortisol permanece elevado de forma crónica. Esto es lo
              que sabotea tu composición corporal.
            </P>

            <SubHeading styles={styles}>Cortisol Agudo vs Crónico</SubHeading>
            <NoteCard styles={styles} title="Cortisol Agudo (Saludable):">
              Respuesta a un evento puntual (presentación importante, sesión de entrenamiento
              intenso). Dura minutos a horas. Tu cuerpo regresa a la normalidad después.
            </NoteCard>
            <NoteCard styles={styles} variant="warning" title="Cortisol Crónico (Problemático):">
              Estrés prolongado sin recuperación (trabajo demandante, déficit calórico extremo,
              entrenamientos excesivos). Permanece elevado durante semanas o meses. Sabotea tu
              composición corporal.
            </NoteCard>

            <SubHeading styles={styles}>Impacto Directo en Retención de Grasa</SubHeading>
            <P styles={styles}>
              El cortisol elevado activa mecanismos que favorecen la acumulación de grasa,
              especialmente en el abdomen:
            </P>
            <Bullet styles={styles} glyph="•" title="Aumenta la insulina:">
              El cortisol eleva los niveles de insulina, promoviendo el almacenamiento de grasa
            </Bullet>
            <Bullet styles={styles} glyph="•" title="Favorece la grasa abdominal:">
              El cortisol crónico especialmente afecta la acumulación de grasa visceral (la más
              peligrosa)
            </Bullet>
            <Bullet styles={styles} glyph="•" title="Reduce la quema de grasa:">
              Interfiere con la capacidad de tu cuerpo para movilizar grasa como combustible
            </Bullet>
            <Bullet styles={styles} glyph="•" title="Aumenta el apetito:" last>
              Estimula la producción de grelina, la hormona del hambre
            </Bullet>

            <SubHeading styles={styles}>
              Impacto en la Síntesis Proteica y Pérdida Muscular
            </SubHeading>
            <P styles={styles}>
              Bajo estrés crónico, tu cuerpo entra en “modo supervivencia”. Prioriza la energía
              inmediata sobre la construcción muscular:
            </P>
            <Bullet styles={styles} glyph="•" title="Catabolismo proteico:">
              El cortisol acelera la degradación de proteína muscular para obtener glucosa
            </Bullet>
            <Bullet styles={styles} glyph="•" title="Reduce síntesis proteica:">
              Interfiere con mTOR, la vía clave para la construcción muscular
            </Bullet>
            <Bullet styles={styles} glyph="•" title="Resultado:" last>
              Pierdes músculo incluso si estás entrenando y comiendo suficiente proteína
            </Bullet>

            <SubHeading styles={styles}>Efecto sobre el Apetito, Antojos y Adherencia</SubHeading>
            <P styles={styles}>El cortisol crónico crea un ciclo vicioso:</P>
            <NoteCard styles={styles} variant="danger" title="El Ciclo del Estrés:">
              Estrés elevado → Cortisol ↑ → Apetito ↑ → Antojos de ultraprocesados → Incumplimiento
              del plan → Culpa y más estrés
            </NoteCard>
            <P styles={styles} last>
              Específicamente, el cortisol aumenta los antojos de alimentos ultraprocesados, altos
              en calorías y bajos en nutrientes. No es debilidad de voluntad. Es fisiología.
            </P>
          </Section>
        </View>

        {/* 3. Fuentes de estrés */}
        <View onLayout={registerOffset('s3')}>
          <Section styles={styles} title="3. Fuentes de Estrés que Afectan tu Composición Corporal">
            <P styles={styles}>
              El estrés no viene solo de la vida personal. Tu plan de entrenamiento y nutrición
              también pueden ser fuentes significativas de estrés metabólico:
            </P>

            <AccordionItem
              styles={styles}
              accentColor={C.orange60}
              title="💼 Estrés Laboral y Emocional"
              open={openAccordion === 'f0'}
              onToggle={() => toggle('f0')}>
              <P styles={styles}>
                Trabajos demandantes, conflictos personales, o cambios de vida importantes generan
                estrés crónico que mantiene el cortisol elevado durante horas o días.
              </P>
              <P styles={styles} last>
                <Text style={styles.inlineBold}>Impacto: </Text>
                Cortisol elevado 24/7, afectando sueño, apetito y recuperación.
              </P>
            </AccordionItem>

            <AccordionItem
              styles={styles}
              accentColor={C.orange60}
              title="📉 Déficit Calórico Excesivo (Estrés Metabólico)"
              open={openAccordion === 'f1'}
              onToggle={() => toggle('f1')}>
              <P styles={styles}>
                Un déficit calórico muy agresivo ({'>'}500 kcal/día) es un estrés metabólico. Tu
                cuerpo interpreta esto como “hambruna” y eleva el cortisol.
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Impacto: </Text>
                Pérdida de músculo acelerada, fatiga, antojos descontrolados.
              </P>
              <P styles={styles} last>
                <Text style={styles.inlineBold}>Recomendación: </Text>
                Déficit moderado de 300-500 kcal/día máximo.
              </P>
            </AccordionItem>

            <AccordionItem
              styles={styles}
              accentColor={C.orange60}
              title="🏋️ Exceso de Volumen de Entrenamiento"
              open={openAccordion === 'f2'}
              onToggle={() => toggle('f2')}>
              <P styles={styles}>
                Entrenar duro todos los días sin deloads es un estrés físico crónico. Tu cuerpo no
                tiene tiempo de recuperarse.
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Impacto: </Text>
                Cortisol elevado, fatiga persistente, rendimiento en bajada, mayor riesgo de lesión.
              </P>
              <P styles={styles} last>
                <Text style={styles.inlineBold}>Recomendación: </Text>
                Incluir deloads cada 3-4 semanas, descansar 1-2 días por semana.
              </P>
            </AccordionItem>

            <AccordionItem
              styles={styles}
              accentColor={C.orange60}
              title="😴 Sueño Insuficiente"
              open={openAccordion === 'f3'}
              onToggle={() => toggle('f3')}>
              <P styles={styles}>
                Dormir menos de 6-7 horas es un estrés crónico. El cortisol se regula durante el
                sueño profundo.
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Impacto: </Text>
                Cortisol elevado, recuperación pobre, apetito aumentado, metabolismo reducido.
              </P>
              <P styles={styles} last>
                <Text style={styles.inlineBold}>Recomendación: </Text>
                Priorizar 7-9 horas de sueño de calidad.
              </P>
            </AccordionItem>

            <AccordionItem
              styles={styles}
              accentColor={C.orange60}
              title="👥 Estrés Social y Relacional"
              open={openAccordion === 'f4'}
              onToggle={() => toggle('f4')}>
              <P styles={styles}>
                Conflictos en relaciones, aislamiento social, o falta de apoyo generan estrés
                emocional crónico.
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Impacto: </Text>
                Cortisol elevado, depresión, pérdida de motivación, incumplimiento del plan.
              </P>
              <P styles={styles} last>
                <Text style={styles.inlineBold}>Recomendación: </Text>
                Invertir en relaciones significativas, buscar apoyo cuando sea necesario.
              </P>
            </AccordionItem>
          </Section>
        </View>

        {/* 4. Señales de alerta */}
        <View onLayout={registerOffset('s4')}>
          <Section styles={styles} title="4. Cómo Identificar que el Estrés Te Está Frenando">
            <P styles={styles}>
              Si experimentas varios de estos síntomas simultáneamente, es probable que el estrés
              sea el factor limitante en tu transformación corporal:
            </P>

            {SIGNALS.map((group) => (
              <React.Fragment key={group.category}>
                <Text style={styles.checklistCategoryTitle}>{group.category}</Text>
                {group.items.map((item) => {
                  const idx = signalIndex++;
                  return (
                    <ChecklistItem
                      key={idx}
                      styles={styles}
                      checked={checked[idx]}
                      onToggle={() => toggleCheck(idx)}>
                      {item}
                    </ChecklistItem>
                  );
                })}
              </React.Fragment>
            ))}

            <NoteCard styles={styles} variant="warning" title="⚠️ Si marcaste 5 o más:">
              El estrés es probablemente tu factor limitante. Es hora de aplicar el protocolo de
              gestión que viene a continuación.{'\n'}Llevas marcadas {checkedCount} de{' '}
              {totalSignals}.
            </NoteCard>
          </Section>
        </View>

        {/* 5. Protocolo de gestión */}
        <View onLayout={registerOffset('s5')}>
          <Section styles={styles} title="5. Protocolo de Gestión del Estrés Aplicado">
            <P styles={styles}>
              Aquí están las estrategias concretas para reducir el estrés y recuperar tu composición
              corporal. Divide tu atención en tres áreas clave:
            </P>

            <SubHeading styles={styles}>🌙 Bloque 1: Estilo de Vida</SubHeading>

            <AccordionItem
              styles={styles}
              accentColor={C.orange60}
              title="Sueño de Calidad (Prioridad #1)"
              open={openAccordion === 'b1-0'}
              onToggle={() => toggle('b1-0')}>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Por qué es crítico: </Text>
                El cortisol se regula durante el sueño profundo. Sin sueño de calidad, el cortisol
                permanece elevado.
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Checklist de Higiene del Sueño:</Text>
              </P>
              <Bullet styles={styles} glyph="✓">
                Acuéstate y despiértate a la misma hora (incluso fines de semana)
              </Bullet>
              <Bullet styles={styles} glyph="✓">
                Habitación oscura, fresca (16-18°C) y silenciosa
              </Bullet>
              <Bullet styles={styles} glyph="✓">
                Sin pantallas 1 hora antes de dormir
              </Bullet>
              <Bullet styles={styles} glyph="✓">
                Evita cafeína después de las 14:00
              </Bullet>
              <Bullet styles={styles} glyph="✓">
                Evita alcohol 3 horas antes de dormir
              </Bullet>
              <Bullet styles={styles} glyph="✓" last>
                Ritual de relajación (10-15 min): lectura, meditación, respiración
              </Bullet>
              <P styles={styles} last={false}>
                <Text style={styles.inlineBold}>Duración recomendada: </Text>7-9 horas por noche
              </P>
              <P styles={styles} last>
                <Text style={styles.inlineBold}>Suplementos opcionales: </Text>
                Magnesio (300-400 mg), L-teanina (100-200 mg)
              </P>
            </AccordionItem>

            <AccordionItem
              styles={styles}
              accentColor={C.orange60}
              title="Rutinas y Desconexión Digital"
              open={openAccordion === 'b1-1'}
              onToggle={() => toggle('b1-1')}>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Rutina Matinal (15-20 min):</Text>
              </P>
              <Bullet styles={styles}>Luz natural inmediata (5-10 min)</Bullet>
              <Bullet styles={styles}>Hidratación (500 ml agua)</Bullet>
              <Bullet styles={styles} last>
                Movimiento ligero (estiramientos, caminar)
              </Bullet>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Desconexión Digital:</Text>
              </P>
              <Bullet styles={styles}>Sin redes sociales en la primera hora del día</Bullet>
              <Bullet styles={styles}>Sin trabajo después de las 18:00</Bullet>
              <Bullet styles={styles}>Notificaciones silenciadas después de las 20:00</Bullet>
              <Bullet styles={styles} last>
                1 día por semana completamente desconectado
              </Bullet>
            </AccordionItem>

            <AccordionItem
              styles={styles}
              accentColor={C.orange60}
              title="Técnicas de Relajación"
              open={openAccordion === 'b1-2'}
              onToggle={() => toggle('b1-2')}>
              <P styles={styles}>
                <Text style={styles.inlineBold}>
                  Respiración Diafragmática (5 min, 2-3 veces al día):{' '}
                </Text>
              </P>
              <P styles={styles}>
                Inhala por la nariz (4 segundos) → Sostén (7 segundos) → Exhala por la boca (8
                segundos). Repite 10 veces.
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Meditación (5-10 min diarios): </Text>Apps como
                Headspace, Calm, o Insight Timer
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>
                  Yoga o Stretching (20-30 min, 3-4 veces por semana):{' '}
                </Text>
                Enfocado en relajación, no intensidad
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Baños Calientes (15-20 min): </Text>Agua a 38-40°C,
                antes de dormir
              </P>
              <P styles={styles} last>
                <Text style={styles.inlineBold}>Tiempo en Naturaleza (30+ min): </Text>Caminar,
                parque, playa. Sin teléfono.
              </P>
            </AccordionItem>

            <SubHeading styles={styles}>🍽️ Bloque 2: Nutrición Anti-Estrés</SubHeading>

            <AccordionItem
              styles={styles}
              accentColor={C.orange60}
              title="Ajuste Calórico en Periodos de Alto Estrés"
              open={openAccordion === 'b2-0'}
              onToggle={() => toggle('b2-0')}>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Estrategia: </Text>Si tu estrés es alto, reduce el
                déficit calórico o incluso mantén calorías.
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Razonamiento: </Text>Un déficit agresivo + estrés
                alto = catabolismo muscular máximo.
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Implementación:</Text>
              </P>
              <Bullet styles={styles}>
                Semanas de alto estrés: Déficit de 200-300 kcal (vs 400-500 normal)
              </Bullet>
              <Bullet styles={styles}>
                O: Mantén calorías (0 déficit) hasta que el estrés baje
              </Bullet>
              <Bullet styles={styles} last>
                Resultado: Pierdes grasa más lentamente, pero preservas músculo
              </Bullet>
            </AccordionItem>

            <AccordionItem
              styles={styles}
              accentColor={C.orange60}
              title="Refeeds Estratégicos"
              open={openAccordion === 'b2-1'}
              onToggle={() => toggle('b2-1')}>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Qué es: </Text>Un día de mayor ingesta calórica
                (especialmente carbos) para “resetear” el cortisol.
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Cuándo: </Text>Una vez por semana, preferiblemente
                después de una sesión de entrenamiento intenso.
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Cómo:</Text>
              </P>
              <Bullet styles={styles}>Aumenta carbos en 50-100g (vs tu normal)</Bullet>
              <Bullet styles={styles}>Mantén proteína alta (1.8-2.2 g/kg)</Bullet>
              <Bullet styles={styles}>Reduce grasas ligeramente</Bullet>
              <Bullet styles={styles} last>
                Ejemplo: Si normalmente comes 2,000 kcal, come 2,300-2,500 en refeed
              </Bullet>
            </AccordionItem>

            <AccordionItem
              styles={styles}
              accentColor={C.orange60}
              title="Alimentos que Modulan el Cortisol"
              open={openAccordion === 'b2-2'}
              onToggle={() => toggle('b2-2')}>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Omega-3 (2-3 porciones por semana): </Text>Salmón,
                sardinas, nueces, semillas de lino
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Magnesio (diario): </Text>Espinaca, almendras,
                chocolate negro (70%+), semillas de calabaza
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Vitamina C (diario): </Text>Cítricos, pimientos,
                kiwi, brócoli
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Probióticos (diario): </Text>Yogur, kéfir, chucrut,
                kimchi (gut health = menor estrés)
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Carbos complejos (en refeeds): </Text>Avena, arroz
                integral, batata, legumbres
              </P>
              <P styles={styles} last>
                <Text style={styles.inlineBold}>Evitar: </Text>Exceso de cafeína, azúcares
                refinados, alcohol
              </P>
            </AccordionItem>

            <SubHeading styles={styles}>🏋️ Bloque 3: Entrenamiento</SubHeading>

            <AccordionItem
              styles={styles}
              accentColor={C.orange60}
              title="Reducir Volumen en Semanas de Estrés Elevado"
              open={openAccordion === 'b3-0'}
              onToggle={() => toggle('b3-0')}>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Estrategia: </Text>Cuando el estrés es alto, entrena
                menos volumen pero mantén la intensidad.
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Implementación:</Text>
              </P>
              <Bullet styles={styles}>Semana normal: 12-15 series por grupo muscular</Bullet>
              <Bullet styles={styles} last>
                Semana de alto estrés: 6-8 series por grupo muscular
              </Bullet>
              <P styles={styles} last>
                <Text style={styles.inlineBold}>Beneficio: </Text>Reduces el estrés metabólico sin
                perder progreso de fuerza.
              </P>
            </AccordionItem>

            <AccordionItem
              styles={styles}
              accentColor={C.orange60}
              title="Priorizar Deloads"
              open={openAccordion === 'b3-1'}
              onToggle={() => toggle('b3-1')}>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Qué es un Deload: </Text>Una semana de entrenamiento
                más ligero (50-60% del volumen normal).
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Cuándo: </Text>Cada 3-4 semanas, o inmediatamente si
                el estrés es muy alto.
              </P>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Cómo:</Text>
              </P>
              <Bullet styles={styles}>Reduce volumen a 50-60% (ej: 6 series en lugar de 12)</Bullet>
              <Bullet styles={styles}>Mantén intensidad (RPE 6-7)</Bullet>
              <Bullet styles={styles} last>
                Enfócate en movimiento, movilidad, recuperación
              </Bullet>
              <P styles={styles} last>
                <Text style={styles.inlineBold}>Beneficio: </Text>El cortisol baja, la recuperación
                mejora, vuelves más fuerte la semana siguiente.
              </P>
            </AccordionItem>

            <AccordionItem
              styles={styles}
              accentColor={C.orange60}
              title="Tipo de Entrenamiento Óptimo"
              open={openAccordion === 'b3-2'}
              onToggle={() => toggle('b3-2')}>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Mejor combinación bajo estrés:</Text>
              </P>
              <Bullet styles={styles}>Fuerza: 3-4 días (preserva músculo, reduce cortisol)</Bullet>
              <Bullet styles={styles}>Cardio moderado: 2-3 días (no excesivo)</Bullet>
              <Bullet styles={styles} last>
                Evitar: Cardio extremo (aumenta cortisol aún más)
              </Bullet>
              <P styles={styles}>
                <Text style={styles.inlineBold}>Intensidad recomendada: </Text>60-75% esfuerzo
                máximo
              </P>
              <P styles={styles} last>
                <Text style={styles.inlineBold}>Timing: </Text>Mejor por la mañana o tarde (evita
                noche, interfiere con sueño)
              </P>
            </AccordionItem>
          </Section>
        </View>

        {/* 6. Plan de acción semanal */}
        <View onLayout={registerOffset('s6')}>
          <Section styles={styles} title="6. Plan de Acción Semanal: Comienza Esta Semana">
            <P styles={styles}>
              No necesitas cambiar todo de una vez. Aquí hay 7 hábitos simples que puedes
              implementar esta semana:
            </P>

            <SubHeading styles={styles}>✅ Tu Checklist de Esta Semana</SubHeading>
            <ActionItem styles={styles} number={1} title="Establece una hora de sueño consistente">
              Acuéstate y despiértate a la misma hora durante 7 días. Esto regula tu cortisol
              circadiano.
            </ActionItem>
            <ActionItem styles={styles} number={2} title="Elimina pantallas 1 hora antes de dormir">
              Reemplaza con lectura, meditación, o respiración. Mejora la calidad del sueño
              inmediatamente.
            </ActionItem>
            <ActionItem
              styles={styles}
              number={3}
              title="Practica respiración diafragmática 2 veces al día">
              5 minutos por la mañana y por la noche. Reduce el cortisol en tiempo real.
            </ActionItem>
            <ActionItem
              styles={styles}
              number={4}
              title="Añade un alimento anti-estrés a cada comida">
              Omega-3, magnesio, o vitamina C. Ejemplo: Salmón en almuerzo, almendras en snack,
              espinaca en cena.
            </ActionItem>
            <ActionItem
              styles={styles}
              number={5}
              title="Reduce el volumen de entrenamiento en 30%">
              Mantén la intensidad, reduce las series. Ejemplo: 10 series en lugar de 15.
            </ActionItem>
            <ActionItem
              styles={styles}
              number={6}
              title="Pasa 30 minutos en naturaleza sin teléfono">
              Camina, siéntate en un parque, o simplemente respira aire fresco. Reduce cortisol
              significativamente.
            </ActionItem>
            <ActionItem
              styles={styles}
              number={7}
              title="Desconéctate digitalmente 1 hora antes de dormir">
              Sin trabajo, redes sociales, ni correos. Tu mente necesita descansar.
            </ActionItem>

            <NoteCard styles={styles} variant="success" title="💡 Consejo:">
              Implementa estos 7 hábitos durante 2 semanas. Luego, evalúa cómo te sientes. ¿Más
              energía? ¿Mejor sueño? ¿Menos antojos? Si la respuesta es sí, el estrés era tu factor
              limitante.
            </NoteCard>
          </Section>
        </View>

        {/* 7. Cierre */}
        <View onLayout={registerOffset('s7')}>
          <Section styles={styles} title="7. Cierre: Tu Transformación Comienza Aquí">
            <P styles={styles}>
              El estrés no es debilidad. Es fisiología. Y ahora entiendes exactamente cómo sabotea
              tu composición corporal.
            </P>
            <P styles={styles}>
              La buena noticia: <Text style={styles.inlineBold}>es completamente reversible.</Text>{' '}
              Con las estrategias correctas, puedes:
            </P>
            <Bullet styles={styles} glyph="✓">
              Reducir el cortisol crónico en 2-3 semanas
            </Bullet>
            <Bullet styles={styles} glyph="✓">
              Recuperar la energía y la motivación
            </Bullet>
            <Bullet styles={styles} glyph="✓">
              Perder grasa de forma sostenible sin perder músculo
            </Bullet>
            <Bullet styles={styles} glyph="✓" last>
              Finalmente ver los resultados que mereces
            </Bullet>
            <P styles={styles}>
              <Text style={styles.inlineBold}>El próximo paso es acción.</Text> No esperes a que el
              estrés te detenga completamente. Comienza esta semana con los 7 hábitos que acabas de
              aprender.
            </P>
            <P styles={styles} last>
              Si tienes dudas sobre cómo aplicar estas estrategias a tu situación específica, o si
              necesitas ajustar tu plan de entrenamiento o nutrición para gestionar mejor el estrés,{' '}
              <Text style={styles.inlineBold}>contacta conmigo.</Text> Estoy aquí para ayudarte a
              recuperar el control.
            </P>

            <NoteCard styles={styles} variant="success" title="🎯 Tu Objetivo Esta Semana:">
              Implementa los 7 hábitos. Rastrear cómo te sientes. Reporta cambios en energía, sueño,
              y antojos.
            </NoteCard>
          </Section>
        </View>

        {/* Footer */}
        <View style={styles.footerBox}>
          <Text style={styles.footerTitle}>Be Stronger</Text>
          <Text style={[styles.footerText, { marginTop: 10, marginBottom: 0 }]}>
            Asesoramiento de Entrenamiento Personal Online. ¿Preguntas? Contacta a tu entrenador
            para ajustar tu plan según tu situación específica.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
