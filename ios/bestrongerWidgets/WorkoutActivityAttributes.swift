import ActivityKit
import Foundation

// Compilado en AMBOS targets (app principal + extensión de widgets) --
// ActivityKit exige que el tipo de atributos de la Live Activity sea
// exactamente el mismo en quien la crea (LiveActivityModule, en la app) y
// en quien la renderiza (WorkoutLiveActivityWidget, en la extensión). Sin
// App Group: la extensión solo RENDERIZA el ContentState que el sistema le
// entrega vía ActivityKit, no necesita leer ningún dato compartido en
// disco -- por eso no hace falta compartir UserDefaults/ficheros entre
// ambos targets para esta feature.
public struct WorkoutActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var exerciseName: String
        // URL remota (mismo CDN que ya usa el resto de la app para las miniaturas
        // de ejercicio) -- sin App Group, así que se resuelve con una petición de
        // red normal desde la propia extensión, no con un fichero compartido.
        public var exerciseImageURL: String?
        public var exerciseIndex: Int
        public var totalExercises: Int
        // "Objetivo" (serie/reps/carga/intensidad) de la PRÓXIMA serie por
        // hacer -- el mismo dato sirve para las dos situaciones: sin
        // descansar es "lo que toca ahora"; descansando es "lo que viene
        // después del descanso" (pedido explícito 2026-08-26, con captura de
        // referencia). intensityLabel es "RIR" o "RPE" según cuál tenga
        // activo el ejercicio -- nunca los dos a la vez (ver
        // getIntensityMode en workout_session_screen.tsx).
        public var setLabel: String
        public var reps: String?
        public var load: String?
        public var intensityLabel: String?
        public var intensityValue: String?
        public var isResting: Bool
        public var restEndDate: Date?
        // Solo relevante durante el descanso: si la próxima serie pertenece
        // a un ejercicio DISTINTO al que se muestra como titular (porque el
        // actual ya no tiene series pendientes), aquí va su nombre -- nil
        // cuando la próxima serie sigue siendo del mismo ejercicio.
        public var nextExerciseName: String?

        public init(
            exerciseName: String,
            exerciseImageURL: String?,
            exerciseIndex: Int,
            totalExercises: Int,
            setLabel: String,
            reps: String?,
            load: String?,
            intensityLabel: String?,
            intensityValue: String?,
            isResting: Bool,
            restEndDate: Date?,
            nextExerciseName: String?
        ) {
            self.exerciseName = exerciseName
            self.exerciseImageURL = exerciseImageURL
            self.exerciseIndex = exerciseIndex
            self.totalExercises = totalExercises
            self.setLabel = setLabel
            self.reps = reps
            self.load = load
            self.intensityLabel = intensityLabel
            self.intensityValue = intensityValue
            self.isResting = isResting
            self.restEndDate = restEndDate
            self.nextExerciseName = nextExerciseName
        }
    }

    public var workoutTitle: String
    public var startDate: Date

    public init(workoutTitle: String, startDate: Date) {
        self.workoutTitle = workoutTitle
        self.startDate = startDate
    }
}
