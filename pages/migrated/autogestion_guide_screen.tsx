import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@components/ui/text';
import { Divider } from '@components/ui/divider';
import GuidePhotoHeader from '@components/GuidePhotoHeader';
import { createGuideStyles, Section, SubHeading, P, Bullet, HighlightBox, ExampleBox, DataTable } from '@components/GuideBlocks';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { useAppColorMode } from '@helper/useAppColorMode';

// Guía estática compartida por todos los usuarios (pedido explícito
// 2026-08-30) -- contenido migrado 1:1 desde el manual HTML original
// (manualautogestion.html) a componentes reales de React Native/Expo, sin
// WebView ni HTML embebido (pedido explícito). Dos piezas del HTML de
// origen NO tienen equivalente aquí a propósito, por ser controles del
// propio navegador web, no contenido: el botón "🖨️ Imprimir" (sin
// equivalente nativo con sentido) y el botón "← Volver al menú" (ya lo
// cubre la flecha atrás flotante de GuidePhotoHeader). Todo el contenido
// informativo real -- bienvenida, las 7 secciones numeradas, tablas, cajas
// de ejemplo/aviso y nota final -- está íntegro más abajo. Los bloques
// reutilizables (Section, tablas, cajas...) viven en components/GuideBlocks
// -- compartidos con la Guía de Sobrentrenamiento.
interface Props {
  navigation?: any;
}

export default function AutogestionGuideScreen({ navigation }: Props) {
  const { colors: C } = useAppColorMode();
  const styles = createGuideStyles(C);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <GuidePhotoHeader image={require('../../assets/autogestion-guide-header.webp')} onBack={() => navigation?.goBack()} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 + WORKOUT_MINIBAR_CLEARANCE }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.title}>
            Guía de <Text style={styles.titleAccent}>Autogestión</Text>
          </Text>
          <Text style={styles.subtitle}>de tu entrenamiento</Text>
          <Text style={styles.description}>
            Todo lo que necesitas saber para ejecutar tu plan y progresar semana a semana de forma
            autónoma.
          </Text>
        </View>
        <Divider style={{ marginHorizontal: 20, marginBottom: 8 }} />

        {/* Bienvenida */}
        <Section styles={styles} title="Bienvenida">
          <P styles={styles}>
            Este documento es tu guía de referencia para entender, interpretar y ejecutar tu plan
            de entrenamiento de forma autónoma. Aquí encontrarás todo lo que necesitas saber: qué
            significa cada número de tu app, cómo elegir la carga adecuada en tu gimnasio, cómo
            progresar semana a semana y qué hacer cuando surgen dudas.
          </P>
          <P styles={styles}>
            Tu plan está diseñado con una metodología basada en evidencia científica y en la
            experiencia práctica tanto mía como de otros profesionales, siempre orientada a la
            hipertrofia muscular y a la fuerza. Cada detalle tiene un motivo. Cuanto mejor
            entiendas el sistema, mejores resultados obtendrás.
          </P>
        </Section>

        {/* 1. Cómo leer tu panel de entrenamiento */}
        <Section styles={styles} title="1. Cómo leer tu panel de entrenamiento">
          <P styles={styles}>
            Cada semana tendrás acceso a tu app con el entrenamiento actualizado, con los
            ejercicios de la sesión y los parámetros exactos para cada uno. Una vez inicies tu
            entrenamiento, la app te mostrará cuatro columnas que debes conocer:
          </P>
          <DataTable
            styles={styles}
            columns={['Columna', 'Qué significa']}
            widths={[110, 260]}
            rows={[
              [[{ text: 'Series', bold: true }], 'Número de veces que repites el ejercicio. Ej: 3 = tres series.'],
              [
                [{ text: 'Reps', bold: true }],
                'Número de repeticiones por serie. Puede ser un rango (ej: 8-10) o una indicación especial (FALLO, DROP SET, etc.). El rango de repeticiones indica un margen sobre el que debes trabajar, siendo por ejemplo en este caso 8 repeticiones como mínimo y 10 como máximo. El rango sirve para ajustarse al RIR o RPE que se te pide en el ejercicio.',
              ],
              [[{ text: 'Peso', bold: true }], 'Carga a utilizar. Puede ser un kg exacto o una instrucción (SUBE, MANTÉN, BAJA).'],
              [
                [{ text: 'RIR / RPE', bold: true }],
                'Margen de repeticiones en reserva (RIR) o percepción del esfuerzo (RPE). Ver explicación completa en el bloque 6.',
              ],
            ]}
          />
          <ExampleBox styles={styles} title="Ejemplo real de lectura:">
            <Text style={styles.exampleText}>
              Series: 3 | Reps: 2X8-10 Y 2X10-12 | Peso: 2X40 Y 2X35 | RIR: 2
            </Text>
            <Text style={[styles.exampleText, { marginTop: 10 }]}>
              Esto significa: 2 series pesadas de 8-10 reps con 40 kg (Top Set) y 2 series más
              ligeras de 10-12 reps con 35 kg (Back-off Set). Al terminar cada serie debes sentir
              que podrías hacer 2 reps más.
            </Text>
          </ExampleBox>
        </Section>

        {/* 2. Top Set y Back-off Sets */}
        <Section styles={styles} title="2. Top Set y Back-off Sets">
          <P styles={styles}>
            En la mayoría de ejercicios trabajarás con dos cargas diferentes dentro de la misma
            sesión. Esta estructura se llama Top Set + Back-off y es una de las herramientas más
            efectivas para estimular el músculo desde diferentes ángulos de intensidad.
          </P>
          <P styles={styles}>
            <Text style={styles.inlineBold}>Top Set: </Text>
            Son las series más pesadas. Trabajan en un rango de repeticiones más bajo y con mayor
            intensidad. Su objetivo es generar tensión mecánica máxima sobre el músculo.
          </P>
          <P styles={styles}>
            <Text style={styles.inlineBold}>Back-off Sets: </Text>
            Son las series más ligeras que siguen al Top Set. Trabajan con un rango de repeticiones
            más alto. Su objetivo es acumular volumen de trabajo y generar estrés metabólico.
          </P>
          <HighlightBox styles={styles} title="Regla práctica:">
            <Text style={styles.highlightText}>
              La carga del Back-off es aproximadamente un 10-15% menos la del Top Set. Si tu Top
              Set es 40 kg, tu Back-off estará entre 34 y 36 kg. Usa el disco disponible en tu
              máquina más cercano a ese rango.
            </Text>
          </HighlightBox>
        </Section>

        {/* 3. ¿Cuánta carga debo subir? */}
        <Section styles={styles} title="3. ¿Cuánta carga debo subir?">
          <P styles={styles}>
            La respuesta depende de tres factores: el tipo de equipo que estás usando, el objetivo
            de ese ejercicio (fuerza o hipertrofia) y la señal que te da tu cuerpo durante la
            serie. Aquí tienes las guías concretas para cada situación.
          </P>

          <SubHeading styles={styles}>Según el tipo de equipo</SubHeading>
          <DataTable
            styles={styles}
            columns={['Tipo de equipo', 'Incremento recomendado al subir carga']}
            widths={[230, 260]}
            rows={[
              [
                [
                  { text: 'Barra olímpica (sentadilla, peso muerto, press banca, press militar)\n' },
                  { text: 'GENERALMENTE PESA 20KG Y SU CARGA TAMBIÉN DEBE SUMARLA A LOS DISCOS', bold: true },
                ],
                'Mínimo 2,5 kg por lado (5 kg en total). Si no tienes microplatos, el siguiente escalón es 5 kg por lado (10 kg en total). Acepta ese salto solo si en la última semana terminaste con RIR sobrante claro.',
              ],
              [
                [
                  { text: 'Mancuernas\n' },
                  { text: 'EN LA APP DEBERÁS APUNTAR EL PESO DE UNA SOLA MANCUERNA. NO LA SUMA DE LAS DOS.', bold: true },
                ],
                'Sube al siguiente par disponible. Habitualmente 2 kg por mancuerna (4 kg en total). Si el salto es de 4 kg por mancuerna (8 kg total), solo súbelo si completaste el rango máximo de reps con al menos RIR 2.',
              ],
              [
                [
                  { text: 'Máquina de balanzas con discos (press, remo, leg press, etc.)\n' },
                  { text: 'NO CONTAMOS SU PESO', bold: true },
                ],
                'Un disco por lado si son de 5 kg = +10 kg total. Un disco por lado si son de 2,5 kg = +5 kg total. Usa siempre el disco más pequeño disponible para hacer el incremento más gradual posible.',
              ],
              [
                'Máquina guiada con placas y pin (polea, máquina de cable, stack, etc.)',
                'Una placa = generalmente 5 kg. Sube una placa cuando completes el rango máximo de reps con RIR sobrante. Si hay medio pin disponible (+2,5 kg), úsalo siempre antes de subir una placa entera.',
              ],
            ]}
          />

          <SubHeading styles={styles}>Según el objetivo del ejercicio</SubHeading>
          <DataTable
            styles={styles}
            columns={['Objetivo', 'Criterio de subida de carga']}
            widths={[210, 260]}
            rows={[
              [
                [{ text: 'Fuerza', bold: true }, { text: ' (rango 3-6 reps, RIR 1-2)' }],
                'Los incrementos pueden ser algo mayores porque el margen de reps es estrecho y la adaptación neuromuscular es rápida. Sube cuando completes todas las series en el límite superior del rango. El cuerpo tiene más capacidad de adaptarse rápido en rangos de fuerza.',
              ],
              [
                [{ text: 'Hipertrofia', bold: true }, { text: ' (rango 6-15 reps, RIR 2-4)' }],
                'Los incrementos deben ser más conservadores. Sube solo cuando completes todas las series en el límite superior del rango con el RIR indicado o con margen. Aquí la progresión es más lenta pero más sostenida.',
              ],
            ]}
          />

          <SubHeading styles={styles}>¿Cómo sé si me estoy quedando corto o pasado de intensidad?</SubHeading>
          <DataTable
            styles={styles}
            columns={['Señal', '¿Qué significa?', '¿Qué hacer?']}
            widths={[200, 210, 210]}
            rows={[
              [
                'Terminas la serie pudiendo hacer 5+ reps más',
                'Carga demasiado ligera. El estímulo es insuficiente para generar adaptación.',
                'Sube al siguiente escalón disponible en la siguiente serie o en el próximo entrenamiento.',
              ],
              [
                'Terminas justo en el rango con el RIR indicado',
                'Carga perfecta. Estás en la zona óptima de estímulo.',
                'Mantén esa carga. Si se repite varias semanas, sube.',
              ],
              [
                'No llegas al mínimo de reps del rango',
                'Carga demasiado pesada para ese día o ese RIR.',
                'Baja un escalón. No es un fracaso, es información valiosa.',
              ],
              [
                'Las últimas reps pierden control o la técnica se rompe',
                'Estás yendo más allá de tu RIR real. El fallo técnico precede al fallo muscular.',
                'Para la serie. Esa rep no cuenta y aumenta el riesgo de lesión.',
              ],
              [
                'Una serie te sale bien pero la siguiente baja mucho el rendimiento',
                'El descanso entre series es insuficiente o la carga es demasiado alta para ese volumen.',
                'Alarga el descanso 30-60 segundos o reduce la carga un escalón.',
              ],
            ]}
          />

          <SubHeading styles={styles}>Máquinas con diferentes incrementos</SubHeading>
          <P styles={styles}>Cada máquina tiene su propio salto de carga. Aquí te explico cómo adaptarte en cada caso:</P>
          <Bullet styles={styles}>
            <Text style={styles.inlineBold}>Máquinas de 5 en 5 kg: </Text>
            cuando toca subir carga, sube un escalón (5 kg). Si es demasiado, intenta completar el
            mínimo de reps aunque el RIR sea menor.
          </Bullet>
          <Bullet styles={styles}>
            <Text style={styles.inlineBold}>Máquinas de 2,5 en 2,5 kg: </Text>
            tienes más precisión. Sube un escalón (2,5 kg) cuando el panel indique SUBE.
          </Bullet>
          <Bullet styles={styles}>
            <Text style={styles.inlineBold}>Máquinas con pin y pilas: </Text>
            los incrementos suelen ser de 5 kg. Usa el criterio del RIR para decidir si subir o
            mantener.
          </Bullet>
          <Bullet styles={styles} last>
            <Text style={styles.inlineBold}>Mancuernas: </Text>
            elige el par que te permita completar el rango de reps con el RIR correcto. Si con 12
            kg sobra margen y con 14 kg no llegas, quédate en 12 kg hasta que mejore.
          </Bullet>
        </Section>

        {/* 4. El tempo */}
        <Section styles={styles} title="4. El tempo: la velocidad de cada repetición">
          <P styles={styles}>
            El tempo es la velocidad a la que ejecutas cada fase de un movimiento. Se expresa con 4
            números separados por guiones. Cada número representa los segundos que dura cada fase
            del movimiento. Controlar el tempo es una herramienta poderosa para aumentar el
            estímulo muscular sin necesidad de añadir más carga.
          </P>

          <SubHeading styles={styles}>Cómo leer un tempo</SubHeading>
          <DataTable
            styles={styles}
            columns={['Número', 'Fase', 'Ejemplo en press banca', 'Ejemplo en curl de bíceps']}
            widths={[70, 200, 180, 190]}
            rows={[
              [
                [{ text: '1º', bold: true }],
                'Fase excéntrica (bajada / alargamiento del músculo)',
                'Bajar la barra hacia el pecho',
                'Bajar la mancuerna desde arriba',
              ],
              [
                [{ text: '2º', bold: true }],
                'Pausa en la posición de máximo estiramiento',
                'Pausa con la barra en el pecho',
                'Pausa con el brazo extendido abajo',
              ],
              [
                [{ text: '3º', bold: true }],
                'Fase concéntrica (subida / acortamiento del músculo)',
                'Empujar la barra hacia arriba',
                'Subir la mancuerna hacia el hombro',
              ],
              [
                [{ text: '4º', bold: true }],
                'Pausa en la posición de máxima contracción',
                'Pausa con los brazos extendidos arriba',
                'Pausa con el bíceps completamente contraído',
              ],
            ]}
          />

          <SubHeading styles={styles}>Tempos más habituales y cuándo usarlos</SubHeading>
          <DataTable
            styles={styles}
            columns={['Tempo', 'Descripción', 'Mejor para', 'Efecto principal']}
            widths={[90, 210, 200, 220]}
            rows={[
              [
                [{ text: '3-0-3-0', bold: true }],
                '3s bajando, sin pausa, 3s subiendo, sin pausa',
                'Hipertrofia general, ejercicios de aislamiento',
                'Máximo tiempo bajo tensión. Aumenta el estímulo sin subir la carga.',
              ],
              [
                [{ text: '3-1-1-0', bold: true }],
                '3s bajando, 1s pausa abajo, explosivo subiendo, sin pausa',
                'Multiarticulares de hipertrofia (press, remo)',
                'La pausa elimina el rebote y obliga al músculo a generar tensión desde cero.',
              ],
              [
                [{ text: '4-0-1-0', bold: true }],
                '4s bajando, sin pausa, rápido subiendo, sin pausa',
                'Ejercicios de aislamiento para máximo tiempo bajo tensión',
                'La excéntrica lenta genera más daño muscular y mayor respuesta anabólica.',
              ],
              [
                [{ text: '2-0-2-0', bold: true }],
                '2s bajando, sin pausa, 2s subiendo, sin pausa',
                'Tempo estándar, buen equilibrio entre control y velocidad',
                'Tempo base recomendado cuando no se especifica ninguno en el panel.',
              ],
              [
                [{ text: '1-0-X-0', bold: true }],
                '1s bajando, sin pausa, explosivo (X = máxima velocidad) subiendo, sin pausa',
                'Ejercicios de fuerza y potencia (sentadilla, peso muerto, press)',
                'La fase concéntrica explosiva recluta más unidades motoras y mejora la producción de fuerza.',
              ],
              [
                [{ text: '2-2-1-2', bold: true }],
                '2s bajando, 2s pausa abajo, rápido subiendo, 2s pausa arriba',
                'Ejercicios donde quieres maximizar la contracción isométrica',
                'Las pausas dobles aumentan el tiempo bajo tensión y la coherencia muscular.',
              ],
            ]}
          />

          <HighlightBox styles={styles} title="Nota importante sobre el tempo:">
            <Text style={styles.highlightText}>
              Cuando tu ejercicio en la APP no especifica ningún tempo, aplica siempre el 2-0-2-0
              como estándar.
            </Text>
            <Text style={[styles.highlightText, { marginTop: 10 }]}>
              El tempo 3-0-3-0 es el más usado en hipertrofia porque maximiza el tiempo bajo
              tensión, por lo que siempre puedes buscar entrar a este rango aunque no se
              especifique.
            </Text>
            <Text style={[styles.highlightText, { marginTop: 10 }]}>
              En ejercicios de fuerza (rango 3-6 reps), la fase concéntrica siempre debe ser lo más
              explosiva posible (X), aunque la bajada sea controlada.
            </Text>
            <Text style={[styles.highlightText, { marginTop: 10 }]}>
              Recuerda: reducir el tempo es una forma de progresar sin subir la carga. Si un
              ejercicio se te resiste, intenta primero controlar más el tempo antes de bajar el
              peso.
            </Text>
          </HighlightBox>
        </Section>

        {/* 5. Cómo elegir la carga correcta */}
        <Section styles={styles} title="5. Cómo elegir la carga correcta">
          <P styles={styles}>
            No todos los gimnasios tienen las mismas máquinas ni los mismos incrementos de carga
            disponibles. Por eso, más que un número exacto, lo que importa es que la carga que
            elijas te permita cumplir los tres criterios siguientes:
          </P>
          <DataTable
            styles={styles}
            columns={['Criterio', 'Indicador', 'Acción', 'Ejemplo']}
            widths={[190, 220, 220, 190]}
            rows={[
              [
                'Carga demasiado ligera',
                'Terminas la serie con más de 4 reps en reserva',
                'Sube al siguiente escalón disponible',
                'Máquina de 5 en 5 → sube 5 kg',
              ],
              [
                'Carga correcta',
                'Terminas dentro del rango de reps con el RIR indicado',
                'Mantén esa carga o sigue la instrucción que se muestra en la app',
                'Perfecto, sigue el plan',
              ],
              [
                'Carga demasiado pesada',
                'No llegas al mínimo de reps del rango',
                'Baja al escalón anterior',
                'Máquina de 2,5 en 2,5 → baja 2,5 kg',
              ],
            ]}
          />
        </Section>

        {/* 6. RIR y RPE */}
        <Section styles={styles} title="6. RIR y RPE: el termómetro del esfuerzo">
          <P styles={styles}>
            El RIR (Reps In Reserve) y el RPE (Rate of Perceived Exertion) son dos formas de medir
            la intensidad del esfuerzo. En tu plan usarás principalmente el RIR en ejercicios de
            hipertrofia y el RPE en ejercicios de fuerza en ejercicios básicos.
          </P>
          <DataTable
            styles={styles}
            columns={['RIR', 'Qué significa en la práctica']}
            widths={[110, 260]}
            rows={[
              [[{ text: 'RIR 4-5', bold: true }], 'Esfuerzo muy moderado. Podrías hacer 4-5 reps más.'],
              [[{ text: 'RIR 3', bold: true }], 'Esfuerzo moderado-alto. Todavía te quedan energías.'],
              [[{ text: 'RIR 2', bold: true }], 'Esfuerzo alto. Podrías sacar 2 reps más, pero con mucho esfuerzo.'],
              [[{ text: 'RIR 1', bold: true }], 'Esfuerzo muy alto. Casi al límite.'],
              [[{ text: 'RIR 0 / FALLO', bold: true }], 'Máximo esfuerzo. No puedes hacer ni una rep más con buena técnica.'],
            ]}
          />
          <HighlightBox styles={styles} title="Consejo:">
            <Text style={styles.highlightText}>
              Al principio es normal no tener bien calibrado el RIR. Con el tiempo aprenderás a
              reconocer exactamente cuánto te queda de margen para mejorar. Si tienes dudas, peca
              de conservador: es mejor quedarse corto en intensidad que lesionarte por exceso de
              carga.
            </Text>
            <Text style={[styles.highlightText, { marginTop: 10 }]}>
              <Text style={styles.inlineBold}>Regla de oro: </Text>
              es mejor quedarse corto en intensidad que lesionarte por exceso de carga.
            </Text>
          </HighlightBox>
        </Section>

        {/* 7. Las técnicas especiales */}
        <Section styles={styles} title="7. Las técnicas especiales">
          <P styles={styles}>
            Cada mes, uno de los ejercicios de tu sesión incluirá una técnica especial. Estas
            técnicas sirven para aumentar el estímulo muscular en el pico de intensidad del
            mesociclo. Aquí tienes una guía de cada una:
          </P>

          <SubHeading styles={styles}>Rest-Pause</SubHeading>
          <P styles={styles}>
            Realiza la serie hasta el fallo o cerca de él. Descansa 15 segundos sin soltar el
            ejercicio y continúa haciendo todas las reps que puedas. Repite el descanso de 15
            segundos una vez más y saca las últimas reps posibles. Cuenta todo como una sola serie.
          </P>

          <SubHeading styles={styles}>Drop Set</SubHeading>
          <P styles={styles}>
            Realiza la serie hasta el fallo con la carga habitual. Sin descanso, reduce la carga
            entre un 20-30% y continúa haciendo reps hasta el fallo de nuevo. Cuenta todo como una
            sola serie. El panel indicará DROP SET en el campo de reps.
          </P>

          <SubHeading styles={styles}>Myo-Reps</SubHeading>
          <P styles={styles}>
            Realiza una serie de activación con RIR 1 (casi al fallo). Descansa 5 segundos y haz
            3-5 reps más. Repite el mini descanso y las 3-5 reps hasta completar 4-5 mini series.
            Es una forma muy eficiente de acumular volumen de alta calidad en poco tiempo.
          </P>

          <SubHeading styles={styles}>Series descendentes</SubHeading>
          <P styles={styles} last>
            Realiza 4 series bajando las reps progresivamente (12, 10, 8, 6) y subiendo la carga en
            cada una. Cada serie es más pesada e intensa que la anterior. El objetivo es estimular
            el músculo en distintos rangos de repetición dentro de la misma sesión.
          </P>
        </Section>

        {/* Footer */}
        <View style={{ paddingHorizontal: 20 }}>
          <HighlightBox styles={styles} title="Recuerda:" variant="info">
            <Text style={styles.highlightText}>
              Este manual es tu referencia. Úsalo cada vez que tengas una duda sobre cómo ejecutar
              tu plan. La consistencia en la ejecución correcta es lo que genera resultados. Si
              algo no está claro, no dudes en preguntar.
            </Text>
          </HighlightBox>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
