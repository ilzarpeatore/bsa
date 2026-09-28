import ActivityKit
import Foundation

// Puente nativo para RN (LiveActivityModule.m expone estos 3 métodos vía
// RCT_EXTERN_METHOD). Sin App Group ni entitlement especial: esta clase
// vive en el target de la app y es la única que llama a Activity.request/
// update/end -- la extensión de widgets (bestrongerWidgets) solo RENDERIZA el
// ContentState que el sistema le entrega, no necesita leer nada de aquí
// directamente.
@objc(LiveActivityModule)
class LiveActivityModule: NSObject {

    private var currentActivity: Activity<WorkoutActivityAttributes>?

    @objc
    static func requiresMainQueueSetup() -> Bool { return false }

    @objc
    func startActivity(_ params: NSDictionary) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        endCurrentActivity()

        let workoutTitle = params["workoutTitle"] as? String ?? "Entrenamiento"
        let attributes = WorkoutActivityAttributes(workoutTitle: workoutTitle, startDate: Date())
        let state = Self.contentState(from: params)

        do {
            currentActivity = try Activity.request(
                attributes: attributes,
                content: Self.content(for: state)
            )
        } catch {
            NSLog("[LiveActivityModule] startActivity failed: \(error)")
        }
    }

    @objc
    func updateActivity(_ params: NSDictionary) {
        guard let activity = currentActivity ?? Activity<WorkoutActivityAttributes>.activities.first else { return }
        currentActivity = activity
        let state = Self.contentState(from: params)
        Task {
            await activity.update(Self.content(for: state))
        }
    }

    @objc
    func endActivity() {
        endCurrentActivity()
    }

    // Termina TODAS las Live Activities de entrenamiento, no solo la que
    // guarda currentActivity: si JS se recarga o la sesión se retoma, esta
    // instancia pierde la referencia y la actividad quedaba huérfana en la
    // pantalla de bloqueo con el cronómetro corriendo.
    private func endCurrentActivity() {
        currentActivity = nil
        for activity in Activity<WorkoutActivityAttributes>.activities {
            Task {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
    }

    // staleDate = fin del descanso: si el descanso acaba con la app en
    // segundo plano (JS no puede actualizar), el sistema vuelve a pintar la
    // Live Activity en ese momento y la vista, al ver el descanso ya
    // vencido, muestra la próxima serie en vez del temporizador a 0:00.
    private static func content(for state: WorkoutActivityAttributes.ContentState) -> ActivityContent<WorkoutActivityAttributes.ContentState> {
        ActivityContent(state: state, staleDate: state.isResting ? state.restEndDate : nil)
    }

    private static func contentState(from params: NSDictionary) -> WorkoutActivityAttributes.ContentState {
        let exerciseName = params["exerciseName"] as? String ?? ""
        let exerciseImageURL = params["exerciseImageURL"] as? String
        let exerciseIndex = (params["exerciseIndex"] as? NSNumber)?.intValue ?? 1
        let totalExercises = (params["totalExercises"] as? NSNumber)?.intValue ?? 1
        let setLabel = params["setLabel"] as? String ?? ""
        let setIndex = (params["setIndex"] as? NSNumber)?.intValue
        let totalSets = (params["totalSets"] as? NSNumber)?.intValue
        let reps = params["reps"] as? String
        let load = params["load"] as? String
        let intensityLabel = params["intensityLabel"] as? String
        let intensityValue = params["intensityValue"] as? String
        let isResting = (params["isResting"] as? NSNumber)?.boolValue ?? false
        let nextExerciseName = params["nextExerciseName"] as? String
        var restEndDate: Date?
        if let restEndMs = (params["restEndDate"] as? NSNumber)?.doubleValue {
            restEndDate = Date(timeIntervalSince1970: restEndMs / 1000)
        }
        return WorkoutActivityAttributes.ContentState(
            exerciseName: exerciseName,
            exerciseImageURL: exerciseImageURL,
            exerciseIndex: exerciseIndex,
            totalExercises: totalExercises,
            setLabel: setLabel,
            setIndex: setIndex,
            totalSets: totalSets,
            reps: reps,
            load: load,
            intensityLabel: intensityLabel,
            intensityValue: intensityValue,
            isResting: isResting,
            restEndDate: restEndDate,
            nextExerciseName: nextExerciseName
        )
    }
}
