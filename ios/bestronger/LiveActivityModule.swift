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
                content: ActivityContent(state: state, staleDate: nil)
            )
        } catch {
            NSLog("[LiveActivityModule] startActivity failed: \(error)")
        }
    }

    @objc
    func updateActivity(_ params: NSDictionary) {
        guard let activity = currentActivity else { return }
        let state = Self.contentState(from: params)
        Task {
            await activity.update(ActivityContent(state: state, staleDate: nil))
        }
    }

    @objc
    func endActivity() {
        endCurrentActivity()
    }

    private func endCurrentActivity() {
        guard let activity = currentActivity else { return }
        currentActivity = nil
        Task {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }

    private static func contentState(from params: NSDictionary) -> WorkoutActivityAttributes.ContentState {
        let exerciseName = params["exerciseName"] as? String ?? ""
        let exerciseImageURL = params["exerciseImageURL"] as? String
        let exerciseIndex = (params["exerciseIndex"] as? NSNumber)?.intValue ?? 1
        let totalExercises = (params["totalExercises"] as? NSNumber)?.intValue ?? 1
        let setLabel = params["setLabel"] as? String ?? ""
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
