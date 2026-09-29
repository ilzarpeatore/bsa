# Investigación: cómo los onboardings de apps de suscripción captan clientes

Fecha: 2026-09-29. Base del rediseño del onboarding (`constants/onboardingV2Questions.ts`,
`pages/migrated/onboarding_v2/onboarding_v2_screen.tsx`).

> Nota de método: las cifras vienen de resultados de búsqueda (teardowns publicados, informes de
> RevenueCat/Adapty, estudios de formularios y un metaanálisis académico). Varias páginas no se
> pudieron abrir enteras desde el entorno de trabajo, así que cada dato se cita tal y como lo
> resumen sus fuentes. Son referencias de la industria, no garantías para Be Stronger: lo que de
> verdad vale es medir nuestro propio embudo (ver «Siguiente paso» al final).

## 1. Qué hacen los mejores

### Duolingo: primero valor, luego registro
- **Registro aplazado («gradual engagement»)**: el usuario elige idioma y objetivo y hace una
  primera lección *antes* de crear la cuenta. Solo retrasar la pantalla de registro unos pasos
  subió los usuarios activos diarios ~20 % ([Taplytics](https://taplytics.com/blog/duolingo-ab-test-onboarding/),
  [Appcues](https://www.appcues.com/blog/gradual-engagement-mobile-app-first-screen)).
- **Preguntas de objetivo como compromiso**: en unas ~12 pantallas pregunta para qué quieres
  aprender y cuánto tiempo al día. Esas respuestas funcionan como un compromiso que luego cuesta
  romper ([Relaunch](https://relaunch.ai/blog/duolingo-onboarding-teardown-7-b-tests-behind-their-9-conver.html)).
- **Muchos experimentos pequeños**: su conversión a pago pasó del 3 % al ~9 % en cinco años a base
  de muchos tests de +2-3 %, no de un único rediseño (misma fuente).
- **Personaje y feedback inmediato**: mascota, animaciones y reacción a cada respuesta
  ([Appcues GoodUX](https://goodux.appcues.com/blog/duolingo-user-onboarding)).

### Noom: un cuestionario largo que vende
- Hasta **113 pantallas y 10-15 minutos**, y aun así convierte **más del 10 %** de quienes terminan
  el cuestionario, frente a una mediana del 2,7 % en apps de suscripción
  ([RevenueCat](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel),
  [Heyflow](https://heyflow.com/blog/5-weight-loss-funnel-examples/)).
- Por qué funciona tan largo: **coste hundido** (cada respuesta es una razón más para no
  abandonar), **personalización** (el resultado se siente hecho a medida) y **contexto antes de
  las preguntas delicadas** (explica por qué pregunta cada cosa)
  ([The Behavioral Scientist](https://www.thebehavioralscientist.com/articles/noom-product-critique-onboarding)).
- **«Construyendo tu plan»**: una pantalla de carga que enumera lo que está combinando. Aparece
  también en Flo y Kayak y tiene nombre: *labor illusion*, la gente valora más un resultado que
  ve «trabajado» ([Medium, Flo y Zoe](https://medium.com/design-bootcamp/how-flo-and-zoe-use-a-web-to-app-to-boost-their-conversion-6f424171b1b7)).

### Cal AI
- Onboarding largo, pero cada respuesta hace el plan más personal y la interfaz nunca abruma.
  **Mover el inicio de sesión al final fue lo que más redujo el abandono**
  ([Superwall, caso Cal AI](https://superwall.com/case-studies/cal-ai)).

### Qué dicen los datos de mercado
- **El día 0 decide**: la primera sesión es cuando se decide pagar y quedarse
  ([RevenueCat, State of Subscription Apps](https://www.revenuecat.com/state-of-subscription-apps)).
- En la mayoría de categorías, el 10 % mejor de apps convierte descargas en pruebas **2-3 veces
  mejor que la mediana**: onboarding y paywall marcan la diferencia (misma fuente).

## 2. Lo que dice la investigación sobre formularios largos

| Hallazgo | Fuente |
| --- | --- |
| **La barra de progreso ayuda solo si va rápida al principio.** Metaanálisis de 32 experimentos: con progreso «rápido → lento» abandona menos gente; con «lento → rápido» abandona **más**; con progreso constante apenas cambia nada. | [Villar, Callegaro y Yang, 2013](https://journals.sagepub.com/doi/10.1177/0894439313497468) |
| **Progreso regalado.** Empezar con algo de progreso ya hecho sube la tasa de finalización (~30 % en un estudio). | Nunes y Drèze, 2006, vía [Learning Loop](https://learningloop.io/plays/psychology/goal-gradient-effect) |
| **Efecto meta.** El esfuerzo aumenta al acercarse al final (cafetería: 2,4 veces más frecuencia en los últimos sellos). | Kivetz et al., 2006, [PDF](https://www.columbia.edu/~rk566/Session4/Goal-Gradient_Illusionary_Goal_Progress.pdf) |
| **Explicar el porqué mejora las respuestas.** Las apps de salud que explican por qué hacen cada pregunta convierten mejor que las que solo preguntan. | [Lindy](https://www.lindy.ai/blog/customer-onboarding-survey) |
| **Pasos visibles.** Un flujo «paso 3 de 5» se completa más que uno sin final a la vista. | Baymard, vía [Formbricks](https://formbricks.com/blog/user-onboarding-best-practices) |
| **El teléfono es de los campos que más abandono causan.** Añadirlo bajó las conversiones un 47 %. **Pasarlo de obligatorio a opcional redujo el abandono del 39 % al 4 %**. | [Zuko](https://www.zuko.io/blog/optimizing-the-phone-number-field-on-forms), [Venture Harbour](https://ventureharbour.com/how-form-length-impacts-conversion-rates/) |
| **Cada campo cuenta.** Pasar de 4 a 3 campos mejoró la finalización ~50 % (HubSpot). | [WPForms](https://wpforms.com/research-based-tips-to-improve-contact-form-conversions/) |
| **Microinteracciones.** Animaciones de 200-400 ms, vibración ligera y celebrar hitos dan sensación de avance. | [UserGuiding](https://userguiding.com/blog/onboarding-microinteractions) |

## 3. Dos límites propios de Be Stronger

1. **No hay pago dentro de la app.** Desde 2026-08-13 la compra es 100 % externa (web), por las
   normas de Apple y Google (`api/subscription.ts`). El paywall con prueba gratuita de Noom, Cal AI
   o Duolingo **no se puede copiar tal cual**. Desde mayo de 2025 Apple permite enlazar a un pago
   externo, pero **solo en la tienda de EE. UU.**; en España sigue siendo una infracción de la
   norma 3.1.1 ([9to5Mac](https://9to5mac.com/2025/05/01/apple-app-store-guidelines-external-links/),
   [Stora](https://stora.sh/blog/2026-05-16-apple-app-store-external-purchase-links-implementation-guide)).
   Por eso aquí el «cierre» no es un paywall: es **un lead cualificado con el que el entrenador
   puede hablar** (en coaching online el cierre suele ser una conversación,
   [PocketSuite](https://pocketsuite.io/post/how-to-set-up-an-online-booking-link-that-turns-fitness-leads-into-booked-consults/)).
   De ahí la importancia del teléfono (opcional) y de que el resumen final sea convincente.
2. **Un entrenador real, no un algoritmo.** Las promesas deben ser verdad: el resumen dice «tu
   entrenador preparará tu plan», no «tu plan está listo». Las pantallas de introducción explican
   cómo usa el entrenador cada dato, sin estadísticas inventadas.

## 4. Qué se ha aplicado

| Principio | Cómo queda en nuestro onboarding |
| --- | --- |
| Gancho rápido y objetivo primero (Duolingo, Noom, Villar 2013) | Sección «Tu objetivo»: introducción, objetivo en un toque, detalle del objetivo, nombre y sexo. El nombre personaliza los textos siguientes («Encantados, Ana»). |
| Lo pesado en medio, lo rápido al final (pedido del usuario + efecto meta) | Tras el gancho: Nutrición y Entrenamiento (las que más escribir piden). Después Salud, Día a día y Sobre ti (casi todo toques y ruedas), y la cuenta al final. |
| Explicar el porqué (Noom, Lindy) | Cada sección empieza con una pantalla «Por qué te lo preguntamos / Cómo lo usará tu entrenador» y el tiempo estimado. |
| Menos esfuerzo por pantalla (HubSpot, Zuko) | Textos libres convertidos en puertas Sí/No (alergias, medicación, dietas previas, lesión) o checklists (las 7-10 preguntas del PAR-Q en **una** pantalla con «Ninguna de estas»). Lugar y material en una sola pregunta de 6 opciones. Favoritos en una pantalla. Email y teléfono juntos. |
| Solo lo necesario | Eliminadas: nivel de actividad (se deriva de estilo de vida + días de entreno), horario de comidas (va dentro del «día normal»), alimentos que te gustan (lo cubren los favoritos) y material por separado. |
| Preguntas condicionales | Embarazo y RED-S solo a mujeres; detalles de lesión solo si hay lesión; historial, técnica, mentalidad, entrenador previo, rutina, reparto y cargas solo si ya ha entrenado; detalle de material solo con poco material; historial médico solo si marca alguna condición. |
| Microinteracciones y dinamismo (Duolingo) | Transición animada entre pantallas, preguntas de un toque que avanzan solas, vibración ligera al elegir, barra de progreso animada con el nombre de la sección y «X de 7», botón «Omitir» en las opcionales. |
| Teléfono opcional (Zuko: 39 % → 4 % de abandono) | En la misma pantalla que el email, opcional, con el motivo («para que tu entrenador pueda contactarte más rápido»). |
| Registro al final (Duolingo, Cal AI) | Se mantiene: la cuenta se crea en la última pantalla. |
| Labor illusion (Noom, Flo) | Pantalla «Preparando tu resumen» antes del resultado, con los 4 pasos que se hacen de verdad (objetivo, salud, gasto energético, resumen para el entrenador). |

### Conflicto resuelto: «lo más lento primero»
El encargo pedía poner primero las secciones más lentas. El metaanálisis de Villar et al. (2013)
dice que un inicio lento **aumenta** el abandono. Solución mixta: unas pocas pantallas rápidas de
gancho, después lo más lento y al final lo más rápido. Además, casi todo lo «lento» se ha
convertido en toques, así que la diferencia entre secciones es mucho menor que antes. El orden
depende solo de la posición en `ONBOARDING_QUESTIONS`: cambiarlo es mover bloques.

## 5. Resultado en números

| | Antes (2026-09-29, v1) | Ahora |
| --- | --- | --- |
| Pantallas, caso más corto (sin experiencia, sin lesión, hombre) | ~62 | 47: 7 introducciones, 20 de un toque que avanzan solas |
| Pantallas, caso más largo (todo condicional abierto) | ~75 | 69 |
| Pantallas con texto libre obligatorio (caso más corto) | ~7 | 2 (detalle del objetivo y día normal de comidas) |
| Preguntas del PAR-Q | 10-12 pantallas | 1 checklist (+ lesión) |

## 6. Siguiente paso recomendado (no hecho)
- **Medir**: enviar un evento por pantalla vista y completada (id de pregunta, sección, segundos)
  para ver dónde abandona la gente. Sin datos propios, todo lo anterior son buenas prácticas de
  terceros.
- **Probar variantes (A/B)**: orden de secciones, textos de las introducciones, teléfono
  opcional frente a obligatorio. Es como Duolingo pasó del 3 % al 9 %.
- **Añadir prueba social real** a las introducciones cuando la haya (testimonios, número real de
  clientes). No se ha puesto ninguna cifra para no inventarla.
- **Cierre**: si el negocio lo quiere, una llamada de bienvenida agendada al final para quien
  deja el teléfono. Un enlace de pago externo solo se permitiría en la tienda de EE. UU.
