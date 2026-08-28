// Catálogo de los retos "esenciales" del tutorial guiado — ver docs/TAREAS.md
// para el resto de la lista ("descubre más", no implementada todavía).
//
// Cada reto tiene un único paso activo: apunta a un elemento real de la app
// (targetId, registrado por <TutorialTarget id=.../> en la pantalla donde
// vive) y se completa cuando ocurre la acción real correspondiente
// (completion), nunca por un botón "Siguiente" -- el usuario tiene que
// usar la app de verdad. Un paso sin targetId muestra un aviso flotante
// en vez de un spotlight (para acciones que no tienen un único elemento
// fijo que señalar, ej. elegir cualquier hábito de una lista dinámica).

export type TutorialCompletion =
  // screen acepta un array (pedido explícito de la auditoría 2026-08-28,
  // ver store/TutorialContext.tsx): un mismo botón puente puede aterrizar en
  // pantallas distintas según datos del usuario (p.ej. el enlace de Hábitos
  // en Home navega a MigratedHabits si ya tiene hábitos, o a
  // MigratedHabitAdd si no tiene ninguno) -- con un único string fijo, la
  // mitad de los usuarios nunca completaban ese paso puente y el reto se
  // quedaba colgado sin avanzar nunca.
  | { type: 'navigate'; screen: string | string[] }
  | { type: 'action'; actionId: string };

export interface TutorialStep {
  targetId?: string;
  title: string;
  text: string;
  completion: TutorialCompletion;
  // Pasos que dependen de una métrica concreta (reps/descanso/rir/rpe...)
  // configurada por el coach para ESE ejercicio -- varía de un entrenamiento
  // a otro, así que su target puede no llegar a registrarse nunca (ver
  // store/TutorialContext.tsx: si no aparece en unos segundos, se salta
  // solo en vez de quedarse bloqueado esperando algo que no existe en este
  // entrenamiento). Los pasos "siempre presentes" (abrir la tarjeta, pulsar
  // iniciar entrenamiento, marcar la serie) NO llevan esto -- deben ocurrir
  // de verdad.
  skippable?: boolean;
}

export interface TutorialChallenge {
  id: string;
  label: string;
  steps: TutorialStep[];
  // Reto que arranca automáticamente en cuanto este termina (pedido
  // explícito: aprovechar que "accede a tu entrenamiento" ya deja al
  // usuario dentro del flujo real para encadenar "registra tu primera
  // serie" sin que tenga que volver a la lista y tocarlo a mano).
  nextChallengeId?: string;
  // Reto "de continuación" (auditoría 2026-08-28, BUG real: "algunos retos
  // no se activan ni comienzan"): su primer targetId vive en una pantalla a
  // la que solo se llega encadenado desde OTRO reto (ver nextChallengeId de
  // ese otro), nunca desde Home. Listarlo también como entrada suelta en el
  // checklist de Home (ver startupSteps en home_screen_modern_v2.tsx) hacía
  // que tocarlo directamente no mostrara nada -- el target (p.ej.
  // "workout-preview-start-button") no existe todavía en Home, así que el
  // reto quedaba "activo" en memoria pero invisible para siempre. `hidden`
  // saca estos retos del checklist tocable; siguen funcionando igual cuando
  // llegan encadenados de forma automática.
  hidden?: boolean;
}

export const TUTORIAL_CHALLENGES: TutorialChallenge[] = [
  {
    id: 'access-workout',
    label: 'Accede a tu entrenamiento de hoy',
    steps: [
      {
        targetId: 'home-today-workout-card',
        title: 'Tu entrenamiento de hoy',
        text: 'Toca esta tarjeta para abrir el entrenamiento que te toca hoy.',
        completion: { type: 'navigate', screen: 'MigratedWorkoutPreview' },
      },
    ],
    // Encadena directamente con "Registra tu primera serie" -- el usuario ya
    // está dentro del flujo real (vista previa del entrenamiento), tiene
    // sentido seguir guiándolo hasta registrar algo de verdad en vez de
    // devolverlo a la lista de retos.
    nextChallengeId: 'log-first-set',
  },
  {
    id: 'log-first-set',
    label: 'Registra tu primera serie',
    // Continuación de "access-workout" -- su primer paso vive en
    // MigratedWorkoutPreview, al que solo se llega tocando la tarjeta de
    // Home (ver hidden en TutorialChallenge). No aparece suelto en el
    // checklist.
    hidden: true,
    steps: [
      // Orden real pedido en la auditoría 2026-08-28 ("no se activa con un
      // orden lógico"): iniciar entrenamiento (ya cubierto por
      // access-workout, que encadena aquí) > rellenar readiness > reps >
      // carga > rir > marcar serie > finalizar. El gate de readiness
      // (ReadinessForm en workout_preview_screen.tsx) sustituye TODA la
      // pantalla de preview mientras está pendiente -- "workout-preview-
      // start-button" ni siquiera se monta hasta que se rellena, así que
      // este paso tiene que ir primero. skippable: true porque solo se
      // pide una vez al día (daily_readiness_checks); si el usuario ya lo
      // rellenó hoy, este target nunca aparece y hay que seguir sin
      // bloquear el tutorial.
      {
        targetId: 'workout-preview-readiness-submit',
        title: 'Cómo llegas hoy',
        text: 'Antes de empezar, cuéntanos brevemente cómo te sientes hoy (sueño, energía, estrés...).',
        completion: { type: 'action', actionId: 'readiness_submitted' },
        skippable: true,
      },
      {
        targetId: 'workout-preview-start-button',
        title: 'Empieza tu entrenamiento',
        text: 'Toca aquí para iniciar la sesión de hoy.',
        completion: { type: 'navigate', screen: 'MigratedWorkoutSession' },
      },
      // Estas explican, una por una, las métricas más habituales de una
      // serie -- pero cada ejercicio real solo muestra las que el coach le
      // configuró (ver enabledMetrics en workout_session_screen.tsx), así
      // que se marcan skippable: si el entrenamiento de hoy no usa alguna
      // de estas métricas, ese paso se salta solo en vez de bloquear el
      // tutorial esperando algo que no va a aparecer.
      {
        targetId: 'workout-session-metric-reps',
        title: 'Repeticiones',
        text: 'Aquí anotas cuántas repeticiones has hecho en esta serie.',
        completion: { type: 'action', actionId: 'metric_focus_reps' },
        skippable: true,
      },
      // Carga (peso) -- faltaba del todo en el tutorial (auditoría
      // 2026-08-28): la tabla de series ya soporta esta métrica (ver
      // key === 'carga' en workout_session_screen.tsx) pero nunca se
      // explicaba, saltando directo de reps a descanso/rir/rpe.
      {
        targetId: 'workout-session-metric-carga',
        title: 'Carga',
        text: 'El peso que has usado en esta serie (en kg).',
        completion: { type: 'action', actionId: 'metric_focus_carga' },
        skippable: true,
      },
      {
        targetId: 'workout-session-metric-rir',
        title: 'RIR (repeticiones en reserva)',
        text: 'Cuántas repeticiones más podrías haber hecho antes de fallar. RIR 2 significa que te quedaban 2 repeticiones en el tanque.',
        completion: { type: 'action', actionId: 'metric_focus_rir' },
        skippable: true,
      },
      {
        targetId: 'workout-session-metric-descanso',
        title: 'Descanso',
        text: 'El tiempo de descanso que toca antes de la siguiente serie. Al marcarla, arrancamos un contador automático.',
        completion: { type: 'action', actionId: 'metric_focus_descanso' },
        skippable: true,
      },
      {
        targetId: 'workout-session-metric-rpe',
        title: 'RPE (esfuerzo percibido)',
        text: 'Del 1 al 10, cuánto esfuerzo sentiste en la serie. 10 es el máximo esfuerzo posible.',
        completion: { type: 'action', actionId: 'metric_focus_rpe' },
        skippable: true,
      },
      {
        targetId: 'workout-session-first-set-toggle',
        title: 'Marca una serie como hecha',
        text: 'Cuando termines una serie, toca este círculo para registrarla.',
        completion: { type: 'action', actionId: 'workout_set_logged' },
      },
      // Finalizar -- faltaba del todo (auditoría 2026-08-28): el reto
      // terminaba en "marca una serie" sin llegar nunca al botón real de
      // cierre de sesión.
      {
        targetId: 'workout-session-finish-button',
        title: 'Finaliza tu entrenamiento',
        text: 'Cuando termines todos los ejercicios, toca aquí para cerrar la sesión.',
        completion: { type: 'navigate', screen: 'MigratedWorkoutFeedback' },
      },
    ],
  },
  {
    id: 'add-habit',
    label: 'Añade un nuevo hábito',
    steps: [
      // BUG real (auditoría 2026-08-28: "el de hábitos no funciona hasta que
      // no entras de forma manual a la screen de hábitos"): este reto
      // empezaba directo en "habits-add-button", que vive en
      // MigratedHabits/habits_list_screen.tsx -- si el usuario lo tocaba
      // desde el checklist de Home (donde SIEMPRE está, a diferencia de
      // access-workout/access-nutrition-plan, que sí arrancan con un target
      // real en Home), ese elemento nunca llegaba a registrarse y el reto se
      // quedaba invisible para siempre. Se añade este paso puente sobre el
      // enlace de Hábitos que YA existe en Home. `screen` acepta array:
      // ese mismo enlace navega a MigratedHabits si ya hay hábitos, o
      // directo a MigratedHabitAdd si no hay ninguno (ver
      // home_screen_modern_v2.tsx) -- cualquiera de los dos avanza el paso.
      {
        targetId: 'home-habits-link',
        title: 'Tus hábitos',
        text: 'Toca aquí para ver o añadir hábitos.',
        completion: { type: 'navigate', screen: ['MigratedHabits', 'MigratedHabitAdd'] },
      },
      // skippable: si el paso anterior aterrizó ya directo en
      // MigratedHabitAdd (usuario sin hábitos todavía), este botón "+" de la
      // lista ni siquiera existe en esa pantalla -- se salta solo en vez de
      // bloquear el tutorial esperando un elemento que no va a aparecer ahí.
      {
        targetId: 'habits-add-button',
        title: 'Añade un hábito',
        text: 'Toca aquí para elegir un hábito de la biblioteca o crear uno propio.',
        completion: { type: 'navigate', screen: 'MigratedHabitAdd' },
        skippable: true,
      },
      {
        title: 'Elige o crea tu hábito',
        text: 'Elige uno de la biblioteca, o crea el tuyo desde la pestaña "Crear".',
        completion: { type: 'action', actionId: 'habit_added' },
      },
    ],
  },
  {
    id: 'mark-habit-done',
    label: 'Marca un hábito como hecho',
    steps: [
      // Mismo bug/arreglo que add-habit -- "habit-toggle-first" vive en
      // MigratedHabits, no en Home.
      {
        targetId: 'home-habits-link',
        title: 'Tus hábitos',
        text: 'Toca aquí para ver tus hábitos de hoy.',
        completion: { type: 'navigate', screen: ['MigratedHabits', 'MigratedHabitAdd'] },
      },
      {
        targetId: 'habit-toggle-first',
        title: 'Marca tu hábito de hoy',
        text: 'Toca el círculo para marcar este hábito como hecho hoy.',
        completion: { type: 'action', actionId: 'habit_marked_done' },
      },
    ],
  },
  {
    id: 'access-nutrition-plan',
    label: 'Accede a tu plan de nutrición',
    steps: [
      {
        targetId: 'home-nutrition-link',
        title: 'Tu plan de nutrición',
        text: 'Toca aquí para ver las comidas de hoy.',
        completion: { type: 'navigate', screen: 'MigratedPlan' },
      },
    ],
    // Encadena con "Marca una comida como realizada" -- mismo patrón que
    // "access-workout" -> "log-first-set": el usuario ya está dentro de
    // MigratedPlan, tiene sentido seguir guiándolo hasta marcar una comida de
    // verdad en vez de devolverlo a la lista de retos.
    nextChallengeId: 'mark-meal-done',
  },
  {
    id: 'mark-meal-done',
    label: 'Marca una comida como realizada',
    // Continuación de "access-nutrition-plan" -- su target vive en
    // MigratedPlan, al que solo se llega encadenado (ver hidden en
    // TutorialChallenge). Listado suelto en el checklist de Home era
    // exactamente el mismo bug que log-first-set: tocarlo directo no hacía
    // nada visible.
    hidden: true,
    steps: [
      {
        targetId: 'plan-meal-toggle-first',
        title: 'Marca tu comida',
        text: 'Toca el círculo cuando termines una comida de tu plan.',
        completion: { type: 'action', actionId: 'meal_marked_done' },
      },
    ],
  },
  {
    id: 'complete-checkin',
    label: 'Rellena tu check-in de preparación',
    steps: [
      // skippable: este check-in solo aparece en "Mi plan de hoy" cuando hay
      // uno pendiente asignado por el coach -- si no lo hay, el target nunca
      // se registra y el reto se quedaba "activo" para siempre sin mostrar
      // nada (BUG real: "algunos retos no se activan ni comienzan").
      {
        targetId: 'home-checkin-card',
        title: 'Check-in de preparación',
        text: 'Rellena este formulario para que tu coach sepa cómo llegas al entrenamiento.',
        completion: { type: 'action', actionId: 'checkin_submitted' },
        skippable: true,
      },
    ],
    // Pedido explícito: el check-in de preparación es un paso real que ocurre
    // (una vez al día, automático) ANTES de cada entrenamiento -- así que su
    // tutorial se encadena con el resto de retos de entrenamiento
    // ("access-workout", que a su vez ya encadena con "log-first-set"),
    // reproduciendo el mismo orden que sigue el usuario de verdad en vez de
    // dejarlo como un reto suelto e independiente.
    nextChallengeId: 'access-workout',
  },
];
