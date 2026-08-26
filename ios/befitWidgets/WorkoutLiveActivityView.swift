import ActivityKit
import SwiftUI
import WidgetKit

// Live Activity del entrenamiento en curso (pedido explícito del usuario
// con captura de referencia de otra app, 2026-08-26). Sin botones
// interactivos (-10s/+10s/Omitir de la referencia) -- eso requiere App
// Intents (iOS 17+), una pieza separada y más grande; esta primera versión
// es de solo lectura: ejercicio actual, siguiente serie, y cuenta atrás de
// descanso en vivo (Text(timerInterval:), la cuenta la actualiza el propio
// sistema, no hace falta que la app siga enviando updates cada segundo).
struct WorkoutLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            LockScreenLiveActivityView(context: context)
                .activityBackgroundTint(Color.black)
                .activitySystemActionForegroundColor(Color.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "figure.strengthtraining.traditional")
                        .foregroundStyle(.white)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    TrailingStatus(state: context.state)
                        .foregroundStyle(.white)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.exerciseName)
                        .font(.headline)
                        .foregroundStyle(.white)
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Ejercicio \(context.state.exerciseIndex)/\(context.state.totalExercises)")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.7))
                }
            } compactLeading: {
                Image(systemName: "figure.strengthtraining.traditional")
            } compactTrailing: {
                TrailingStatus(state: context.state)
                    .frame(width: 44)
            } minimal: {
                Image(systemName: "figure.strengthtraining.traditional")
            }
        }
    }
}

private struct TrailingStatus: View {
    let state: WorkoutActivityAttributes.ContentState

    var body: some View {
        if state.isResting, let end = state.restEndDate {
            Text(timerInterval: Date.now...end, countsDown: true)
                .monospacedDigit()
        } else {
            Text(state.setLabel)
                .lineLimit(1)
        }
    }
}

private struct LockScreenLiveActivityView: View {
    let context: ActivityViewContext<WorkoutActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Entrenamiento")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.6))
                Spacer()
                Text("Ejercicio \(context.state.exerciseIndex)/\(context.state.totalExercises)")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.6))
                Text(context.attributes.startDate, style: .timer)
                    .font(.caption)
                    .monospacedDigit()
                    .foregroundStyle(.white.opacity(0.6))
            }

            HStack(spacing: 12) {
                Image(systemName: "figure.strengthtraining.traditional")
                    .font(.title2)
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(Color.white.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 2) {
                    Text(context.state.exerciseName)
                        .font(.headline)
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    if !context.state.isResting {
                        Text("Siguiente: \(context.state.setLabel)")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.7))
                            .lineLimit(1)
                    }
                }
                Spacer()
            }

            if context.state.isResting, let end = context.state.restEndDate {
                Text(timerInterval: Date.now...end, countsDown: true)
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
        }
        .padding(16)
    }
}
