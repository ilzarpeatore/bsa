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
        public var exerciseIndex: Int
        public var totalExercises: Int
        public var setLabel: String
        public var isResting: Bool
        public var restEndDate: Date?

        public init(
            exerciseName: String,
            exerciseIndex: Int,
            totalExercises: Int,
            setLabel: String,
            isResting: Bool,
            restEndDate: Date?
        ) {
            self.exerciseName = exerciseName
            self.exerciseIndex = exerciseIndex
            self.totalExercises = totalExercises
            self.setLabel = setLabel
            self.isResting = isResting
            self.restEndDate = restEndDate
        }
    }

    public var workoutTitle: String
    public var startDate: Date

    public init(workoutTitle: String, startDate: Date) {
        self.workoutTitle = workoutTitle
        self.startDate = startDate
    }
}
