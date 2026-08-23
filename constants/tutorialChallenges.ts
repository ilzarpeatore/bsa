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
  | { type: 'navigate'; screen: string }
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
    steps: [
      {
        targetId: 'workout-preview-start-button',
        title: 'Empieza tu entrenamiento',
        text: 'Toca aquí para iniciar la sesión de hoy.',
        completion: { type: 'navigate', screen: 'MigratedWorkoutSession' },
      },
      // Estas 4 explican, una por una, las métricas más habituales de una
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
      {
        targetId: 'workout-session-metric-descanso',
        title: 'Descanso',
        text: 'El tiempo de descanso que toca antes de la siguiente serie. Al marcarla, arrancamos un contador automático.',
        completion: { type: 'action', actionId: 'metric_focus_descanso' },
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
    ],
  },
  {
    id: 'add-habit',
    label: 'Añade un nuevo hábito',
    steps: [
      {
        targetId: 'habits-add-button',
        title: 'Añade un hábito',
        text: 'Toca aquí para elegir un hábito de la biblioteca o crear uno propio.',
        completion: { type: 'navigate', screen: 'MigratedHabitAdd' },
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
  },
  {
    id: 'mark-meal-done',
    label: 'Marca una comida como realizada',
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
      {
        targetId: 'home-checkin-card',
        title: 'Check-in de preparación',
        text: 'Rellena este formulario para que tu coach sepa cómo llegas al entrenamiento.',
        completion: { type: 'action', actionId: 'checkin_submitted' },
      },
    ],
  },
];
