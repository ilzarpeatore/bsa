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

    // Diagnóstico (2026-09-28): la Live Activity no llegaba a aparecer nunca
    // y los fallos eran silenciosos (return/NSLog). Se guarda el último
    // resultado de startActivity para poder consultarlo desde Ajustes →
    // Diagnóstico → «Probar Live Activity».
    private static var lastStartResult: String = "startActivity no se ha llamado todavía en esta ejecución"

    @objc
    static func requiresMainQueueSetup() -> Bool { return false }

    @objc
    func startActivity(_ params: NSDictionary) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            Self.lastStartResult = "startActivity: Live Activities desactivadas (areActivitiesEnabled = false)"
            return
        }
        endCurrentActivity()

        let workoutTitle = params["workoutTitle"] as? String ?? "Entrenamiento"
        let attributes = WorkoutActivityAttributes(workoutTitle: workoutTitle, startDate: Date())
        let state = Self.contentState(from: params)

        do {
            let activity = try Activity.request(
                attributes: attributes,
                content: Self.content(for: state)
            )
            currentActivity = activity
            Self.lastStartResult = "startActivity OK (id \(activity.id))"
        } catch {
            Self.lastStartResult = "startActivity falló: \(error)"
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

    @objc(diagnose:rejecter:)
    func diagnose(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let info = ActivityAuthorizationInfo()
        resolve([
            "enabled": info.areActivitiesEnabled,
            "activeCount": Activity<WorkoutActivityAttributes>.activities.count,
            "lastStartResult": Self.lastStartResult,
        ])
    }

    // Lanza una Live Activity de prueba (se cierra sola a los 20 s) y
    // devuelve el resultado real de Activity.request.
    @objc(testActivity:rejecter:)
    func testActivity(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            resolve(["ok": false, "error": "Live Activities desactivadas para la app (areActivitiesEnabled = false)"])
            return
        }
        let attributes = WorkoutActivityAttributes(workoutTitle: "Prueba Live Activity", startDate: Date())
        let state = WorkoutActivityAttributes.ContentState(
            exerciseName: "Prueba", exerciseImageURL: nil, exerciseIndex: 1, totalExercises: 1,
            setLabel: "Serie 1/1", setIndex: 1, totalSets: 1, reps: "10", load: nil,
            intensityLabel: nil, intensityValue: nil, isResting: false, restEndDate: nil, nextExerciseName: nil
        )
        do {
            let activity = try Activity.request(attributes: attributes, content: ActivityContent(state: state, staleDate: nil))
            resolve(["ok": true, "id": activity.id])
            Task {
                try? await Task.sleep(nanoseconds: 20_000_000_000)
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        } catch {
            resolve(["ok": false, "error": "\(error)"])
        }
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
