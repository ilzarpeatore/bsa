import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@components/ui/text';
import { Divider } from '@components/ui/divider';
import GuidePhotoHeader from '@components/GuidePhotoHeader';
import {
  createGuideStyles,
  Section,
  P,
  Bullet,
  HighlightBox,
  ColumnBlock,
  TrafficLight,
  TrafficLightItem,
  DataTable,
} from '@components/GuideBlocks';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { useAppColorMode } from '@helper/useAppColorMode';

// Guía estática compartida por todos los usuarios (pedido explícito
// 2026-08-30, misma naturaleza que la Guía de Autogestión) -- contenido
// migrado 1:1 desde el HTML original (guiasobrentrenamiento.html) a
// componentes reales de React Native/Expo, sin WebView. Los bloques
// reutilizables (Section, tablas, cajas de aviso, semáforo...) viven en
// components/GuideBlocks, compartidos con autogestion_guide_screen.tsx.
interface Props {
  navigation?: any;
}

export default function OvertrainingGuideScreen({ navigation }: Props) {
  const { colors: C } = useAppColorMode();
  const styles = createGuideStyles(C);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <GuidePhotoHeader image={require('../../assets/overtraining-guide-header.png')} onBack={() => navigation?.goBack()} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 + WORKOUT_MINIBAR_CLEARANCE }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.headerIcon}>⚠️</Text>
          <Text style={styles.title}>¿Entrenas Mucho o Entrenas Bien?</Text>
          <Text style={styles.description}>
            La pregunta que muchos no se atreven a hacer. Y la respuesta que cambia todo.
          </Text>
        </View>
        <Divider style={{ marginHorizontal: 20, marginBottom: 8 }} />

        {/* 1. Qué es realmente el sobrentrenamiento */}
        <Section styles={styles} kicker="1. Qué es realmente el sobrentrenamiento" title="Aclaremos la Confusión">
          <P styles={styles}>
            Aquí está el problema:{' '}
            <Text style={styles.inlineBold}>
              la mayoría de las personas cree que tiene sobrentrenamiento cuando en realidad tiene
              recuperación insuficiente.
            </Text>{' '}
            No es lo mismo.
          </P>

          <HighlightBox styles={styles} title="📌 Tres Conceptos Clave">
            <Text style={styles.highlightText}>
              <Text style={styles.inlineBold}>Fatiga Aguda (Normal): </Text>
              Cansancio después de entrenar. Se recupera en 24-48 horas. Es necesaria para el
              progreso.
            </Text>
            <Text style={[styles.highlightText, { marginTop: 12 }]}>
              <Text style={styles.inlineBold}>Fatiga Acumulada (Manejable): </Text>
              Acumulación de sesiones sin suficiente recuperación. Se resuelve con un deload o 3-5
              días de descanso.
            </Text>
            <Text style={[styles.highlightText, { marginTop: 12 }]}>
              <Text style={styles.inlineBold}>Síndrome de Sobrentrenamiento (Patológico): </Text>
              Estado crónico donde el sistema nervioso central está agotado. Requiere semanas de
              recuperación.
            </Text>
          </HighlightBox>

          <P styles={styles}>
            <Text style={styles.inlineBold}>La verdad incómoda: </Text>
            La mayoría de mis clientes que creen tener sobrentrenamiento en realidad tienen uno de
            estos problemas:
          </P>

          <ColumnBlock styles={styles} title="❌ Duermen poco">
            5-6 horas en lugar de 7-9. El sueño es donde ocurre la recuperación real.
          </ColumnBlock>
          <ColumnBlock styles={styles} title="❌ Comen poco">
            Déficit calórico + volumen alto = imposible recuperarse.
          </ColumnBlock>
          <ColumnBlock styles={styles} title="❌ Estrés crónico">
            Trabajo, vida personal, dinero. El cortisol no distingue fuentes.
          </ColumnBlock>
          <ColumnBlock styles={styles} title="❌ No respetan deloads">
            Entrenan al máximo 52 semanas al año. Imposible.
          </ColumnBlock>

          <P styles={styles} last>
            <Text style={styles.inlineBold}>El punto: </Text>
            Antes de asumir que tienes sobrentrenamiento, pregúntate: ¿Duermo 7-9 horas? ¿Como
            suficiente? ¿Tengo estrés controlado? ¿Hago deloads? Si la respuesta a cualquiera es
            “no”, ese es tu problema real.
          </P>
        </Section>

        {/* 2. Señales tempranas vs. avanzadas */}
        <Section styles={styles} kicker="2. Señales tempranas vs. avanzadas" title="Aprende a Reconocer las Alertas">
          <P styles={styles}>
            No esperes a estar completamente quemado. Aquí están las señales en dos niveles de
            alerta.
          </P>

          <DataTable
            styles={styles}
            columns={['🟡 Nivel Amarillo (Actúa Pronto)', '🔴 Nivel Rojo (Actúa Ya)']}
            widths={[230, 230]}
            rows={[
              [
                [{ text: 'Rendimiento estancado 2+ semanas', color: C.warning60 }],
                [{ text: 'Pérdida de fuerza sostenida', color: C.destructive }],
              ],
              [
                [{ text: 'Motivación baja para entrenar', color: C.warning60 }],
                [{ text: 'Frecuencia cardíaca en reposo +5-10 bpm', color: C.destructive }],
              ],
              [
                [{ text: 'Sueño alterado o fragmentado', color: C.warning60 }],
                [{ text: 'Infecciones frecuentes (resfriados, etc)', color: C.destructive }],
              ],
              [
                [{ text: 'Irritabilidad o cambios de humor', color: C.warning60 }],
                [{ text: 'Dolor articular continuo (no muscular)', color: C.destructive }],
              ],
              [
                [{ text: 'Agujetas persistentes', color: C.warning60 }],
                [{ text: 'Pérdida de masa muscular visible', color: C.destructive }],
              ],
              [
                [{ text: 'Recuperación lenta entre series', color: C.warning60 }],
                [{ text: 'Ansiedad o depresión', color: C.destructive }],
              ],
            ]}
          />

          <HighlightBox styles={styles} title="💡 Acción Recomendada">
            <Text style={styles.highlightText}>
              <Text style={styles.inlineBold}>Nivel Amarillo: </Text>
              Reduce volumen 20-30%, añade un día de descanso, mejora sueño y nutrición.
            </Text>
            <Text style={[styles.highlightText, { marginTop: 12 }]}>
              <Text style={styles.inlineBold}>Nivel Rojo: </Text>
              Deload inmediato de 1 semana o descanso total de 3-5 días. Considera consultar a un
              profesional.
            </Text>
          </HighlightBox>
        </Section>

        {/* 3. El semáforo de recuperación */}
        <Section styles={styles} kicker="3. El semáforo de recuperación" title="Tu Herramienta Diaria">
          <P styles={styles}>
            Antes de cada sesión, responde estas 3 preguntas. Tu respuesta te dirá si entrenar hoy
            o no.
          </P>

          <TrafficLight styles={styles} heading="¿Cómo estoy hoy?">
            <TrafficLightItem styles={styles} color="green" icon="🟢" title="VERDE: Entrena Normal" status="Dormir bien anoche: ✓ | Energía alta: ✓ | Motivación: ✓">
              Procede con tu sesión planeada. Todo está en orden.
            </TrafficLightItem>
            <TrafficLightItem
              styles={styles}
              color="yellow"
              icon="🟡"
              title="AMARILLO: Entrena Reducido"
              status="Dormir regular anoche: ⚠️ | Energía media: ⚠️ | Motivación baja: ⚠️"
            >
              Entrena, pero reduce volumen 30-40%. Mantén intensidad, menos series. Ejemplo: 3
              series en lugar de 5.
            </TrafficLightItem>
            <TrafficLightItem styles={styles} color="red" icon="🔴" title="ROJO: Descanso Activo" status="Dormir mal anoche: ✗ | Energía muy baja: ✗ | Sin motivación: ✗">
              Descansa hoy. Camina 30 min, estira, movilidad. Tu cuerpo te está diciendo que
              necesita recuperación.
            </TrafficLightItem>
          </TrafficLight>

          <HighlightBox styles={styles} title="🎯 Regla de Oro">
            <Text style={styles.highlightText}>
              Si tienes 2+ semanas consecutivas en AMARILLO o 1 semana en ROJO, necesitas un
              deload estructurado. No esperes.
            </Text>
          </HighlightBox>
        </Section>

        {/* 4. Los factores que más lo provocan */}
        <Section styles={styles} kicker="4. Los factores que más lo provocan" title="No Solo es el Volumen">
          <P styles={styles}>
            La mayoría piensa que sobrentrenamiento = entrenar mucho. Error. Aquí están los
            culpables reales.
          </P>

          <Bullet styles={styles} glyph="▸" title="Déficit calórico + Volumen alto simultáneamente">
            Tu cuerpo no puede recuperarse si no tiene combustible. Déficit calórico + 5 días de
            entrenamiento intenso = desastre.
          </Bullet>
          <Bullet styles={styles} glyph="▸" title="Sueño insuficiente crónico">
            5-6 horas en lugar de 7-9. El sueño es donde ocurre el 70% de la recuperación. Sin
            sueño, no hay recuperación.
          </Bullet>
          <Bullet styles={styles} glyph="▸" title="Estrés laboral o personal elevado">
            El cortisol crónico + entrenamiento intenso = sobrentrenamiento garantizado. Tu cuerpo
            no distingue entre estrés mental y físico.
          </Bullet>
          <Bullet styles={styles} glyph="▸" title="No respetar los días de descanso programados">
            Entrenar 6-7 días a la semana sin deload. Tu plan dice 4 días, pero haces 6. Eso es
            sobrentrenamiento.
          </Bullet>
          <Bullet styles={styles} glyph="▸" title="Aumentos de carga demasiado agresivos">
            Subir 10kg en una semana cuando debería ser 2-5%. Tu sistema nervioso no puede
            adaptarse tan rápido.
          </Bullet>
          <Bullet styles={styles} glyph="▸" title="Falta de deload estructurado" last>
            Entrenar al máximo 52 semanas al año. Imposible. Necesitas 1 semana de deload cada 4-6
            semanas.
          </Bullet>

          <HighlightBox styles={styles} title="🔍 Pregunta Honesta">
            <Text style={styles.highlightText}>
              ¿Cuál de estos es tu culpable? Probablemente no sea solo el volumen. Identifica el
              factor real y ajusta.
            </Text>
          </HighlightBox>
        </Section>

        {/* 5. Protocolo de prevención */}
        <Section styles={styles} kicker="5. Protocolo de prevención" title="Cuatro Pilares Concretos">
          <P styles={styles}>
            <Text style={styles.inlineBold}>Volumen: </Text>
            No aumentes más de 10% por semana. Si haces 100 series, la próxima semana máximo 110.
            Punto.
          </P>
          <P styles={styles}>
            <Text style={styles.inlineBold}>Deload: </Text>
            1 semana cada 4-6 semanas. Reduce volumen 40-50%, mantén intensidad moderada. No es
            “no entrenar”, es entrenar inteligente.
          </P>
          <P styles={styles}>
            <Text style={styles.inlineBold}>Nutrición: </Text>
            Come suficiente. Proteína 1.8-2.2g/kg, carbos adecuados, grasas para hormonas. Déficit
            calórico + volumen alto = imposible recuperarse.
          </P>
          <P styles={styles}>
            <Text style={styles.inlineBold}>Monitorización: </Text>
            Registra cada semana:
          </P>

          <View style={styles.columnBlock}>
            <Text style={styles.columnBlockTitle}>📊 Métricas Clave</Text>
            <Bullet styles={styles} glyph="▸">Frecuencia cardíaca en reposo</Bullet>
            <Bullet styles={styles} glyph="▸">Calidad de sueño (1-10)</Bullet>
            <Bullet styles={styles} glyph="▸">Motivación (1-10)</Bullet>
            <Bullet styles={styles} glyph="▸" last>Fuerza en ejercicios clave</Bullet>
          </View>
          <View style={styles.columnBlock}>
            <Text style={styles.columnBlockTitle}>⚡ Qué Buscar</Text>
            <Bullet styles={styles} glyph="▸">FC reposo estable o bajando</Bullet>
            <Bullet styles={styles} glyph="▸">Sueño consistente 7-9h</Bullet>
            <Bullet styles={styles} glyph="▸">Motivación alta</Bullet>
            <Bullet styles={styles} glyph="▸" last>Fuerza progresando</Bullet>
          </View>

          <HighlightBox styles={styles} title="✅ Checklist Semanal">
            <Text style={styles.highlightText}>
              {'□ Volumen dentro de rango (no +10%)\n□ Durmiendo 7-9 horas\n□ Comiendo suficiente\n□ Motivación presente\n□ Fuerza consistente\n□ Estrés manejable'}
            </Text>
          </HighlightBox>
        </Section>

        {/* 6. Qué hacer si ya estás en sobrentrenamiento */}
        <Section styles={styles} kicker="6. Qué hacer si ya estás en sobrentrenamiento" title="Protocolo de Salida en 3 Fases">
          <P styles={styles}>
            <Text style={styles.inlineBold}>Mensaje clave: </Text>
            No es fracaso. Es información. Tu cuerpo te está diciendo qué necesita.
          </P>

          <HighlightBox styles={styles} title="Fase 1: Pausa Activa (3-7 días)">
            <Text style={styles.highlightText}>
              Reduce volumen 50-70%. Mantén movimiento ligero: camina, estira, movilidad. Duerme
              1-2 horas extra. Come bien.
            </Text>
          </HighlightBox>
          <HighlightBox styles={styles} title="Fase 2: Reintroducción Progresiva (2-3 semanas)">
            <Text style={styles.highlightText}>
              Semana 1: 50% volumen normal. Semana 2: 70%. Semana 3: 90%. Monitorea cómo te
              sientes. Si vuelven señales de alerta, pausa más tiempo.
            </Text>
          </HighlightBox>
          <HighlightBox styles={styles} title="Fase 3: Ajuste del Plan (Permanente)">
            <Text style={styles.highlightText}>
              Reduce volumen 15-20% respecto a lo que hacías. Añade deload cada 4 semanas. Mejora
              sueño, nutrición, estrés. Esto es tu nuevo normal.
            </Text>
          </HighlightBox>
          <HighlightBox styles={styles} title="💚 Recuerda" variant="success">
            <Text style={styles.highlightText}>
              Muchos de mis mejores clientes pasaron por sobrentrenamiento. No es el fin. Es el
              comienzo de entrenar inteligente.
            </Text>
          </HighlightBox>
        </Section>

        {/* Footer */}
        <View style={styles.footerBox}>
          <Text style={styles.footerText}>
            <Text style={styles.inlineBold}>La pregunta final: </Text>
            ¿Entrenas mucho o entrenas bien?
          </Text>
          <Text style={styles.footerText}>La respuesta determina si logras tu objetivo o te quemas en el camino.</Text>
          <Text style={[styles.footerText, { color: C.orange60, fontSize: 13, marginBottom: 0 }]}>
            Si tienes dudas sobre tu volumen actual o crees que estás sobrentrenado, contacta.
            Podemos revisar tu plan juntos.
          </Text>
          <Text style={styles.footerSignature}>Hamza</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
