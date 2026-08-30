import React, { useRef } from 'react';
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
  HighlightBox,
  AffirmationBox,
  DataTable,
  TocItem,
} from '@components/GuideBlocks';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { useAppColorMode } from '@helper/useAppColorMode';

// Guía estática compartida por todos los usuarios (pedido explícito
// 2026-08-30, misma naturaleza que las 5 guías anteriores) -- contenido
// migrado 1:1 desde el HTML original (manualmentalidad.html) a componentes
// reales de React Native/Expo, sin WebView. Mismo formato y estructura que
// el resto de guías (kicker de marca, índice navegable, secciones
// numeradas, pie de página). Se añade AffirmationBox a GuideBlocks para las
// 5 tarjetas de afirmación (patrón visual centrado/en cursiva que no existía
// en las guías anteriores); las 6 preguntas de reflexión reutilizan
// HighlightBox (título = pregunta, contenido = explicación) sin necesidad de
// un componente nuevo, mismo criterio de "reutiliza lo que ya encaja" que el
// resto de la sesión.
//
// La firma de cierre de la sección 8 ("Hamza / Tu Coach en Be Stronger") es
// contenido del propio manual, distinta del pie de página final de la
// pantalla (aviso + copyright) -- se mantienen ambas, igual que en el HTML.
interface Props {
  navigation?: any;
}

const TOC_ITEMS = [
  { key: 'intro', label: '1. Introducción', description: 'Por Qué Fracasan Muchos' },
  {
    key: 'errores',
    label: '2. Los Errores de Mentalidad Más Comunes',
    description: 'Trampas Mentales que Sabotean tu Progreso',
  },
  {
    key: 'progreso',
    label: '3. Cómo Funciona Realmente el Progreso',
    description: 'La Verdad Sobre la Transformación Corporal',
  },
  {
    key: 'identidad',
    label: '4. Construye una Identidad, No Solo un Objetivo',
    description: 'De "Quiero Perder 10kg" a "Soy una Persona que Cuida su Cuerpo"',
  },
  {
    key: 'relacion',
    label: '5. Tu Relación con la Comida y el Entrenamiento',
    description: 'Salir de la Dinámica Premio/Castigo',
  },
  {
    key: 'protocolo',
    label: '6. Protocolo Mental para Semanas Difíciles',
    description: 'Qué Hacer Cuando Todo Se Siente Difícil',
  },
  {
    key: 'reflexion',
    label: '7. Afirmaciones y Preguntas de Reflexión',
    description: 'Herramientas Mentales para Cuando Flaquees',
  },
  { key: 'cierre', label: '8. Cierre', description: 'Tienes a Alguien en Tu Esquina' },
];

export default function MindsetGuideScreen({ navigation }: Props) {
  const { colors: C } = useAppColorMode();
  const styles = createGuideStyles(C);
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});

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
        image={require('../../assets/mindset-guide-header.webp')}
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
          <Text style={styles.headerIcon}>💪</Text>
          <Text style={styles.title}>El Músculo Más Importante</Text>
          <Text style={styles.description}>
            No está en el gimnasio. Es tu mentalidad. Y aquí te enseño a entrenarlo.
          </Text>
        </View>
        <Divider style={{ marginHorizontal: 20, marginBottom: 8 }} />

        {/* Índice de contenidos */}
        <View style={styles.tocBox}>
          <Text style={styles.tocTitle}>📖 Índice</Text>
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
        <View onLayout={registerOffset('intro')}>
          <Section styles={styles} kicker="1. Introducción" title="Por Qué Fracasan Muchos">
            <P styles={styles}>
              Aquí está la verdad incómoda:{' '}
              <Text style={styles.inlineBold}>
                la mayoría de las personas que fracasan en su transformación corporal no lo hacen
                por falta de información.
              </Text>
            </P>
            <P styles={styles}>
              Tienen el plan. Saben qué comer. Conocen los ejercicios. Pero algo falla en el camino.
            </P>
            <P styles={styles}>Y ese algo es la mentalidad.</P>
            <P styles={styles}>
              He trabajado con cientos de personas. Los que logran sus objetivos no son los que
              tienen el plan perfecto. Son los que pueden mantener un plan imperfecto durante meses.
              Los que no se rinden cuando la báscula no se mueve. Los que entienden que el progreso
              no es una línea recta.
            </P>
            <P styles={styles}>
              La diferencia entre alguien que logra su transformación y alguien que abandona a los
              tres meses no está en la información. Está en cómo piensan sobre el proceso.
            </P>
            <P styles={styles} last>
              Este manual no te va a dar más datos. Ya tienes suficientes. Este manual te va a
              cambiar la forma en que ves tu transformación corporal. Y cuando cambies tu
              perspectiva, todo lo demás se alinea.
            </P>
            <HighlightBox styles={styles} title="💡 La Realidad">
              <Text style={styles.highlightText}>
                Tu cuerpo cambia cuando tu mente está lista para mantener los hábitos que lo
                cambian. No al revés.
              </Text>
            </HighlightBox>
          </Section>
        </View>

        {/* 2. Errores de mentalidad */}
        <View onLayout={registerOffset('errores')}>
          <Section
            styles={styles}
            kicker="2. Los Errores de Mentalidad Más Comunes"
            title="Trampas Mentales que Sabotean tu Progreso">
            <P styles={styles}>
              Estos son los patrones de pensamiento que veo una y otra vez. Probablemente reconozcas
              algunos.
            </P>

            <Bullet styles={styles} title="Todo o Nada">
              “Si me salto una comida, el día está perdido. Así que me como todo lo que veo.”{'\n'}
              <Text style={styles.inlineBold}>La realidad: </Text>Un día no define tu
              transformación. Ni una semana. Ni un mes. Lo que importa es la tendencia general.
            </Bullet>
            <Bullet styles={styles} title="Obsesión con la Báscula">
              “La báscula no bajó 500g esta semana. Significa que no funciona nada.”{'\n'}
              <Text style={styles.inlineBold}>La realidad: </Text>Tu peso fluctúa por retención de
              agua, ciclos hormonales, digestión, entrenamiento. La báscula es una herramienta, no
              la verdad absoluta.
            </Bullet>
            <Bullet styles={styles} title="Comparación en Redes Sociales">
              “Esa persona logró su transformación en 3 meses. Yo llevo 6 y no veo resultados.”
              {'\n'}
              <Text style={styles.inlineBold}>La realidad: </Text>Estás comparando tu día 180 con el
              día 90 de otra persona. Además, no ves sus fracasos, sus desvíos, sus semanas malas.
            </Bullet>
            <Bullet styles={styles} title="Buscar Resultados en Semanas">
              “Llevo dos semanas comiendo bien y no veo cambios. Esto no funciona.”{'\n'}
              <Text style={styles.inlineBold}>La realidad: </Text>Los cambios corporales visibles
              toman 4-6 semanas. Tu cuerpo está cambiando internamente antes de que lo veas
              externamente.
            </Bullet>
            <Bullet styles={styles} title="Confundir Motivación con Disciplina">
              “Hoy no tengo motivación, así que no voy al gimnasio.”{'\n'}
              <Text style={styles.inlineBold}>La realidad: </Text>La motivación es un sentimiento.
              La disciplina es una decisión. Los resultados vienen de la disciplina, no de cómo te
              sientas.
            </Bullet>
            <Bullet styles={styles} title="Castigarse por No Ser Perfecto" last>
              “Me salté el plan. Soy un fracaso. Nunca voy a lograrlo.”{'\n'}
              <Text style={styles.inlineBold}>La realidad: </Text>Perfección es el enemigo del
              progreso. Los ganadores no son perfectos. Son consistentes.
            </Bullet>

            <HighlightBox styles={styles} title="🎯 Pregunta Clave">
              <Text style={styles.highlightText}>
                ¿Cuál de estos errores reconoces en ti? Identifica uno. Solo uno. Y comprométete a
                cambiar ese patrón esta semana.
              </Text>
            </HighlightBox>
          </Section>
        </View>

        {/* 3. Cómo funciona el progreso */}
        <View onLayout={registerOffset('progreso')}>
          <Section
            styles={styles}
            kicker="3. Cómo Funciona Realmente el Progreso"
            title="La Verdad Sobre la Transformación Corporal">
            <P styles={styles}>
              Si esperas que tu progreso sea una línea recta hacia arriba, vas a estar decepcionado.
            </P>
            <P styles={styles} last>
              <Text style={styles.inlineBold}>El progreso real es caótico. </Text>
              Tiene semanas buenas. Semanas malas. Mesetas. Retrocesos. Y todo eso es completamente
              normal.
            </P>

            <HighlightBox styles={styles} title="📊 La Gráfica Real del Progreso">
              <Text style={styles.highlightText}>
                {
                  'Semana 1-2: Entusiasmo, cambios iniciales\nSemana 3-4: Meseta, dudas comienzan\nSemana 5-6: Pequeños cambios visibles, motivación regresa\nSemana 7-8: Meseta nuevamente\nSemana 9-12: Cambios más notables\nSemana 13+: Transformación visible, pero con altibajos constantes'
                }
              </Text>
            </HighlightBox>

            <SubHeading styles={styles}>Consistencia vs Perfección</SubHeading>
            <P styles={styles}>
              <Text style={styles.inlineBold}>Consistencia </Text>es hacer el 80% de lo planeado
              durante 12 semanas.
            </P>
            <P styles={styles}>
              <Text style={styles.inlineBold}>Perfección </Text>es hacer el 100% durante 2 semanas y
              luego abandonar.
            </P>
            <P styles={styles}>¿Cuál crees que genera mejores resultados?</P>
            <P styles={styles} last>
              La respuesta es obvia. Y sin embargo, la mayoría elige perfección.
            </P>

            <DataTable
              styles={styles}
              columns={['Perfección (Fracaso)', 'Consistencia (Éxito)']}
              widths={[215, 215]}
              rows={[
                [
                  [{ text: 'Semana 1: 100% adherencia', color: C.destructive }],
                  [{ text: 'Semana 1: 85% adherencia', color: C.success60 }],
                ],
                [
                  [{ text: 'Semana 2: 100% adherencia', color: C.destructive }],
                  [{ text: 'Semana 2: 80% adherencia', color: C.success60 }],
                ],
                [
                  [{ text: 'Semana 3: Fallo, abandono', color: C.destructive }],
                  [{ text: 'Semana 3: 85% adherencia', color: C.success60 }],
                ],
                [
                  [{ text: 'Resultado: 0% en 12 semanas', color: C.destructive }],
                  [
                    {
                      text: 'Resultado: 82% en 12 semanas = TRANSFORMACIÓN',
                      color: C.success60,
                      bold: true,
                    },
                  ],
                ],
              ]}
            />

            <SubHeading styles={styles}>El Efecto Compuesto</SubHeading>
            <P styles={styles}>
              Una comida saludable no cambia tu cuerpo. Una semana de comidas saludables tampoco.
              Pero 12 semanas de comidas 85% saludables? Eso cambia todo.
            </P>
            <P styles={styles}>
              Una sesión de entrenamiento no construye músculo. Pero 48 sesiones distribuidas en 12
              semanas? Eso construye una versión completamente diferente de ti.
            </P>
            <P styles={styles} last>
              El efecto compuesto es el superpoder de la transformación corporal. Pequeñas acciones
              consistentes generan resultados exponenciales.
            </P>

            <HighlightBox styles={styles} title="✅ La Fórmula Ganadora">
              <Text style={styles.highlightText}>
                80% de adherencia sostenida {'>'} 100% de adherencia puntual
              </Text>
            </HighlightBox>
          </Section>
        </View>

        {/* 4. Identidad */}
        <View onLayout={registerOffset('identidad')}>
          <Section
            styles={styles}
            kicker="4. Construye una Identidad, No Solo un Objetivo"
            title="De “Quiero Perder 10kg” a “Soy una Persona que Cuida su Cuerpo”">
            <P styles={styles}>Aquí está el secreto que la mayoría no entiende:</P>
            <P styles={styles}>
              <Text style={styles.inlineBold}>
                Los objetivos son frágiles. Las identidades son fuertes.
              </Text>
            </P>
            <P styles={styles}>
              Si tu objetivo es “perder 10kg”, ¿qué pasa cuando los pierdes? Tu objetivo desaparece.
              Y sin objetivo, sin dirección, vuelves a los hábitos antiguos.
            </P>
            <P styles={styles} last>
              Pero si tu identidad es “soy una persona que cuida su cuerpo”, entonces cada decisión
              se alinea con esa identidad. No es “¿debo ir al gimnasio?”. Es “¿qué haría una persona
              que cuida su cuerpo?”. Respuesta: ir al gimnasio. No es “¿puedo comer eso?”. Es “¿qué
              elegiría alguien que cuida su cuerpo?”. Respuesta: algo más nutritivo.
            </P>

            <SubHeading styles={styles}>Sistemas vs Objetivos</SubHeading>
            <P styles={styles}>Los objetivos son el destino. Los sistemas son el camino.</P>
            <P styles={styles}>
              Un objetivo es “tener un cuerpo definido”. Un sistema es “entrenar 4 veces por semana,
              comer proteína en cada comida, dormir 7-8 horas”.
            </P>
            <P styles={styles}>
              Los objetivos son motivantes al principio. Pero los sistemas son lo que te sostiene
              cuando la motivación desaparece.
            </P>
            <P styles={styles} last>
              Aquí está lo importante:{' '}
              <Text style={styles.inlineBold}>
                cuando construyes un sistema, el objetivo se logra casi por accidente.
              </Text>
            </P>

            <HighlightBox styles={styles} title="🎯 Tu Identidad Nueva">
              <Text style={styles.highlightText}>
                {
                  'Completa esta frase: "Soy alguien que..."\n\nEjemplos:\n• "Soy alguien que entrena sin excusas"\n• "Soy alguien que cuida su nutrición"\n• "Soy alguien que se recupera adecuadamente"\n• "Soy alguien que es consistente"\n\nEscribe tu frase. Memorízala. Úsala como brújula para tus decisiones diarias.'
                }
              </Text>
            </HighlightBox>

            <SubHeading styles={styles}>Celebra los Pequeños Avances</SubHeading>
            <P styles={styles}>No esperes al resultado final para celebrar. Eso es un error.</P>
            <P styles={styles}>¿Entrenaste cuando no tenías ganas? Celebra.</P>
            <P styles={styles}>¿Comiste bien toda la semana? Celebra.</P>
            <P styles={styles}>¿Dormiste 7 horas consistentemente? Celebra.</P>
            <P styles={styles} last>
              Estos pequeños avances son lo que construye la identidad. Y la identidad es lo que
              genera los resultados finales.
            </P>
          </Section>
        </View>

        {/* 5. Relación con comida y entrenamiento */}
        <View onLayout={registerOffset('relacion')}>
          <Section
            styles={styles}
            kicker="5. Tu Relación con la Comida y el Entrenamiento"
            title="Salir de la Dinámica Premio/Castigo">
            <P styles={styles}>
              Muchas personas tienen una relación tóxica con la comida y el entrenamiento. Y ni
              siquiera lo saben.
            </P>
            <P styles={styles}>La dinámica es así:</P>
            <P styles={styles}>
              <Text style={styles.inlineBold}>
                “Comí mal, así que tengo que castigarme en el gimnasio.”
              </Text>
            </P>
            <P styles={styles}>
              <Text style={styles.inlineBold}>
                “Entrené duro, así que me lo merezco. Puedo comer lo que quiera.”
              </Text>
            </P>
            <P styles={styles} last>
              Esto es premio/castigo. Y es tóxico. La comida no es un castigo. El entrenamiento no
              es un premio. Son herramientas para tu salud y tu objetivo.
            </P>

            <HighlightBox styles={styles} title="🔄 Relación Sana vs Relación Tóxica">
              <DataTable
                styles={styles}
                columns={['Relación Tóxica', 'Relación Sana']}
                widths={[210, 210]}
                rows={[
                  [
                    [
                      {
                        text: '“Tengo que entrenar para quemar lo que comí”',
                        color: C.destructive,
                      },
                    ],
                    [{ text: '“Entreno porque me siento mejor después”', color: C.success60 }],
                  ],
                  [
                    [{ text: '“La comida saludable es un castigo”', color: C.destructive }],
                    [{ text: '“La comida saludable es combustible”', color: C.success60 }],
                  ],
                  [
                    [{ text: '“Si como mal, soy un fracaso”', color: C.destructive }],
                    [{ text: '“Una comida no define mi semana”', color: C.success60 }],
                  ],
                  [
                    [{ text: '“Debo ser perfecto”', color: C.destructive }],
                    [{ text: '“Debo ser consistente”', color: C.success60 }],
                  ],
                ]}
              />
            </HighlightBox>

            <SubHeading styles={styles}>Cómo Hablar Contigo Mismo</SubHeading>
            <P styles={styles}>El diálogo interno es todo.</P>
            <P styles={styles}>
              Si te dices “soy débil” cuando te saltas una comida, refuerzas esa identidad.
            </P>
            <P styles={styles}>
              Si te dices “esto es parte del proceso” cuando algo no sale bien, refuerzas la
              resiliencia.
            </P>
            <P styles={styles}>
              <Text style={styles.inlineBold}>Aquí está lo que quiero que hagas:</Text>
            </P>
            <P styles={styles}>
              La próxima vez que cometas un “error” (te saltes una comida, no entrenes, comas algo
              fuera del plan), observa qué te dices a ti mismo.
            </P>
            <P styles={styles}>¿Es crítica? ¿Es motivadora? ¿Es realista?</P>
            <P styles={styles}>
              Luego, reescribe ese diálogo. Sé compasivo contigo mismo. Pero también sé honesto.
            </P>
            <P styles={styles}>Ejemplo:</P>
            <P styles={styles} last>
              <Text style={styles.inlineBold}>Crítica: </Text>“Soy un fracaso. Nunca voy a
              lograrlo.”{'\n'}
              <Text style={styles.inlineBold}>Reescrita: </Text>“Me salté el plan hoy. Eso sucede.
              Mañana vuelvo a hacerlo bien. Una comida no define mi transformación.”
            </P>

            <SubHeading styles={styles}>Señales de Alerta</SubHeading>
            <P styles={styles}>
              Tu relación con el proceso es <Text style={styles.inlineBold}>tóxica</Text> si:
            </P>
            <Bullet styles={styles}>Sientes culpa después de comer</Bullet>
            <Bullet styles={styles}>Usas el entrenamiento como castigo</Bullet>
            <Bullet styles={styles}>Tu autoestima fluctúa con la báscula</Bullet>
            <Bullet styles={styles}>Tienes pensamientos de “todo o nada”</Bullet>
            <Bullet styles={styles} last>
              Te castigas mentalmente por no ser perfecto
            </Bullet>

            <P styles={styles} last={false}>
              Tu relación con el proceso es <Text style={styles.inlineBold}>saludable</Text> si:
            </P>
            <Bullet styles={styles}>
              Ves la comida como combustible, no como recompensa o castigo
            </Bullet>
            <Bullet styles={styles}>Disfrutas del entrenamiento, no lo ves como obligación</Bullet>
            <Bullet styles={styles}>Tu autoestima es independiente de tu apariencia</Bullet>
            <Bullet styles={styles}>Eres flexible con tu plan sin perder dirección</Bullet>
            <Bullet styles={styles} last>
              Te tratas con compasión cuando cometes errores
            </Bullet>
          </Section>
        </View>

        {/* 6. Protocolo mental */}
        <View onLayout={registerOffset('protocolo')}>
          <Section
            styles={styles}
            kicker="6. Protocolo Mental para Semanas Difíciles"
            title="Qué Hacer Cuando Todo Se Siente Difícil">
            <P styles={styles} last>
              Las semanas difíciles van a venir. Prepárate mentalmente ahora.
            </P>

            <SubHeading styles={styles}>Cuando No Tienes Motivación</SubHeading>
            <HighlightBox styles={styles} title="🧭 Protocolo">
              <Text style={styles.highlightText}>
                <Text style={styles.inlineBold}>Recuerda: </Text>La motivación es un sentimiento.
                Los resultados no dependen de sentimientos. Dependen de acciones.
              </Text>
              <Text style={[styles.highlightText, { marginTop: 10 }]}>
                <Text style={styles.inlineBold}>Acción: </Text>Haz el 50% de lo planeado. No es
                perfecto, pero es consistente. Y la consistencia es lo que importa.
              </Text>
            </HighlightBox>

            <SubHeading styles={styles}>Cuando Llevas Dos Semanas Sin Ver Cambios</SubHeading>
            <HighlightBox styles={styles} title="🧭 Protocolo">
              <Text style={styles.highlightText}>
                <Text style={styles.inlineBold}>Recuerda: </Text>Los cambios corporales visibles
                toman 4-6 semanas. Tu cuerpo está cambiando internamente. Confía en el proceso.
              </Text>
              <Text style={[styles.highlightText, { marginTop: 10 }]}>
                <Text style={styles.inlineBold}>Acción: </Text>Toma una foto. Mide tu cintura.
                Revisa tu fuerza en el gimnasio. Hay progreso que la báscula no muestra.
              </Text>
            </HighlightBox>

            <SubHeading styles={styles}>Cuando Te Has Saltado Varios Días del Plan</SubHeading>
            <HighlightBox styles={styles} title="🧭 Protocolo">
              <Text style={styles.highlightText}>
                <Text style={styles.inlineBold}>Recuerda: </Text>Una semana mala no borra 11 semanas
                buenas. El progreso es la tendencia general, no un día específico.
              </Text>
              <Text style={[styles.highlightText, { marginTop: 10 }]}>
                <Text style={styles.inlineBold}>Acción: </Text>No intentes “compensar”. Solo vuelve
                al plan hoy. Mañana. Y el día después. La consistencia comienza ahora.
              </Text>
            </HighlightBox>

            <SubHeading styles={styles}>Cuando Sientes que No Vale la Pena</SubHeading>
            <HighlightBox styles={styles} title="🧭 Protocolo">
              <Text style={styles.highlightText}>
                <Text style={styles.inlineBold}>Recuerda: </Text>Este sentimiento es temporal.
                Pasará. Y del otro lado está la versión de ti que trabajaste para crear.
              </Text>
              <Text style={[styles.highlightText, { marginTop: 10 }]}>
                <Text style={styles.inlineBold}>Acción: </Text>Haz una cosa. Solo una. Entrena 20
                minutos. Come una comida saludable. Duerme 7 horas. Una acción pequeña regresa la
                perspectiva.
              </Text>
            </HighlightBox>
          </Section>
        </View>

        {/* 7. Afirmaciones y preguntas de reflexión */}
        <View onLayout={registerOffset('reflexion')}>
          <Section
            styles={styles}
            kicker="7. Afirmaciones y Preguntas de Reflexión"
            title="Herramientas Mentales para Cuando Flaquees">
            <SubHeading styles={styles}>Afirmaciones Poderosas</SubHeading>
            <AffirmationBox styles={styles}>
              “No busco perfección. Busco consistencia.”
            </AffirmationBox>
            <AffirmationBox styles={styles}>
              “Mi cuerpo está cambiando. Confío en el proceso.”
            </AffirmationBox>
            <AffirmationBox styles={styles}>“Soy más fuerte que mis excusas.”</AffirmationBox>
            <AffirmationBox styles={styles}>
              “Una comida, un día, una semana no define mi transformación.”
            </AffirmationBox>
            <AffirmationBox styles={styles}>
              “Soy disciplinado. No espero motivación.”
            </AffirmationBox>

            <SubHeading styles={styles}>Preguntas de Reflexión</SubHeading>
            <P styles={styles} last>
              <Text style={styles.inlineBold}>
                Úsalas cuando dudes. Úsalas cuando flaquees. Úsalas para recuperar la perspectiva.
              </Text>
            </P>

            <HighlightBox
              styles={styles}
              title="¿Qué haría alguien que cuida su cuerpo en esta situación?">
              <Text style={styles.highlightText}>
                No es “¿qué quiero hacer?”. Es “¿qué elegiría alguien con mi identidad?”. La
                respuesta te alineará con tus objetivos.
              </Text>
            </HighlightBox>
            <HighlightBox
              styles={styles}
              title="¿Es esto un problema real o solo un sentimiento temporal?">
              <Text style={styles.highlightText}>
                La mayoría de nuestras crisis son sentimientos temporales. Espera 24 horas. Verás
                con claridad.
              </Text>
            </HighlightBox>
            <HighlightBox
              styles={styles}
              title="¿Qué aprendí esta semana que me acerca a mi objetivo?">
              <Text style={styles.highlightText}>
                Incluso en semanas “malas”, hay aprendizaje. Enfócate en eso. Es progreso.
              </Text>
            </HighlightBox>
            <HighlightBox
              styles={styles}
              title="¿Estoy comparando mi día 90 con el día 30 de otra persona?">
              <Text style={styles.highlightText}>
                Probablemente sí. Detente. Tu única competencia eres tú hace 12 semanas.
              </Text>
            </HighlightBox>
            <HighlightBox
              styles={styles}
              title="¿Qué pequeña acción puedo hacer hoy que me acerque a mi objetivo?">
              <Text style={styles.highlightText}>
                No necesitas hacerlo todo perfecto. Solo una cosa. Una comida. Una sesión. Una hora
                de sueño. Acumula.
              </Text>
            </HighlightBox>
            <HighlightBox styles={styles} title="¿Cómo me hablaría a un amigo en esta situación?">
              <Text style={styles.highlightText}>
                Probablemente con compasión y realismo. Hazlo contigo mismo. Sé tu propio coach.
              </Text>
            </HighlightBox>
          </Section>
        </View>

        {/* 8. Cierre */}
        <View onLayout={registerOffset('cierre')}>
          <Section styles={styles} kicker="8. Cierre" title="Tienes a Alguien en Tu Esquina">
            <P styles={styles}>
              Quiero que sepas algo: <Text style={styles.inlineBold}>esto es difícil.</Text>
            </P>
            <P styles={styles}>
              Cambiar tu cuerpo es difícil. Cambiar tu mentalidad es aún más difícil. Mantener ambos
              cambios durante meses es lo más difícil.
            </P>
            <P styles={styles}>
              Pero aquí está lo que también es verdad:{' '}
              <Text style={styles.inlineBold}>es posible.</Text>
            </P>
            <P styles={styles}>
              He visto a personas que pensaban que era imposible lograrlo. Que sus genes no lo
              permitían. Que su vida era demasiado caótica. Que no tenían disciplina.
            </P>
            <P styles={styles}>
              Y luego, algo cambió. No fue su genética. No fue su vida. Fue su mentalidad.
            </P>
            <P styles={styles}>
              Cuando entendieron que el progreso no es lineal. Que la consistencia supera a la
              perfección. Que su identidad es más poderosa que sus objetivos. Que merecen tratarse
              con compasión.
            </P>
            <P styles={styles}>Cuando eso cambió, todo cambió.</P>
            <P styles={styles}>
              Tú estás aquí. Leyendo esto. Eso significa que ya diste el primer paso. Reconociste
              que tu mentalidad importa. Eso es más de lo que la mayoría hace.
            </P>
            <P styles={styles}>
              Así que aquí está mi promesa:{' '}
              <Text style={styles.inlineBold}>
                si aplicas lo que está en este manual, si eres consistente con tu mentalidad como lo
                eres con tu entrenamiento, vas a lograr tu objetivo.
              </Text>
            </P>
            <P styles={styles}>
              No en 4 semanas. Probablemente en 12-16 semanas. Pero lo vas a lograr.
            </P>
            <P styles={styles}>
              Y cuando lo hagas, no va a ser porque tuviste suerte. Va a ser porque decidiste que tu
              transformación era importante. Que tu mentalidad era importante. Que merecías ser
              mejor.
            </P>
            <P styles={styles}>
              Eso es lo que separa a los que logran sus objetivos de los que no.
            </P>
            <P styles={styles}>No es más información. Es decisión.</P>
            <P styles={styles} last>
              ¿Estás listo para decidir?
            </P>

            <HighlightBox styles={styles} title="Tu próximo paso:">
              <Text style={styles.highlightText}>
                Elige UNA cosa de este manual. Una sola. Aplícala esta semana. No todo. Solo una.
              </Text>
              <Text style={[styles.highlightText, { marginTop: 10 }]}>
                Luego, la próxima semana, añade otra.
              </Text>
              <Text style={[styles.highlightText, { marginTop: 10 }]}>
                Así es como se construye una mentalidad ganadora. Pequeño paso tras pequeño paso.
              </Text>
            </HighlightBox>

            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <Text style={styles.footerText}>Con respeto y confianza en ti,</Text>
              <Text style={styles.footerSignature}>Hamza</Text>
              <Text style={[styles.footerText, { fontSize: 12.5, marginTop: 4, marginBottom: 0 }]}>
                Tu Coach en Be Stronger
              </Text>
            </View>
          </Section>
        </View>

        {/* Footer */}
        <View style={styles.footerBox}>
          <Text style={styles.footerTitle}>Recuerda</Text>
          <Text style={[styles.footerText, { marginTop: 10 }]}>
            Este manual es tuyo. Vuelve a él cuando dudes. Subraya. Anota. Usa las preguntas de
            reflexión. No es un documento que lees una vez. Es una herramienta que usas
            constantemente.
          </Text>
          <Text style={[styles.footerText, { fontSize: 12, marginBottom: 0 }]}>
            © 2026 Be Stronger. Todos los derechos reservados.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
