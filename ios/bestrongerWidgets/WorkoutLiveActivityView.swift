import ActivityKit
import SwiftUI
import WidgetKit

// Live Activity del entrenamiento en curso (pedido explícito del usuario
// con captura de referencia de otra app, 2026-08-26; ampliada el mismo día
// con foto del ejercicio + datos de la serie objetivo, también con captura
// de referencia). Sin botones interactivos (-10s/+10s/Omitir de la
// referencia) -- eso requiere App Intents (iOS 17+), una pieza separada y
// más grande; esta versión es de solo lectura: ejercicio actual (con foto),
// datos de la serie objetivo (reps/carga/RIR o RPE), y cuenta atrás de
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
                    ExerciseThumbnail(urlString: context.state.exerciseImageURL, size: 32)
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
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Ejercicio \(context.state.exerciseIndex)/\(context.state.totalExercises)")
                            .font(.caption2)
                            .foregroundStyle(.white.opacity(0.6))
                        Text(context.state.isResting ? context.state.restNextLine : context.state.targetSummaryLine)
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.85))
                            .lineLimit(1)
                    }
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

// Miniatura del ejercicio activo -- misma URL remota (CDN) que ya usa el
// resto de la app, cargada vía AsyncImage porque esta extensión no comparte
// disco con la app principal (sin App Group, ver WorkoutActivityAttributes).
// Cae al icono genérico si no hay URL o la carga falla/tarda.
private struct ExerciseThumbnail: View {
    let urlString: String?
    let size: CGFloat

    var body: some View {
        Group {
            if let urlString, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: size, height: size)
        .background(Color.white.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: size * 0.27))
    }

    private var placeholder: some View {
        Image(systemName: "figure.strengthtraining.traditional")
            .font(.system(size: size * 0.45))
            .foregroundStyle(.white)
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
                ExerciseThumbnail(urlString: context.state.exerciseImageURL, size: 44)

                VStack(alignment: .leading, spacing: 2) {
                    Text(context.state.exerciseName)
                        .font(.headline)
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    if !context.state.isResting {
                        Text(context.state.targetSummaryLine)
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

                Text(context.state.restNextLine)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.75))
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
        }
        .padding(16)
    }
}

private extension WorkoutActivityAttributes.ContentState {
    // "3 reps · 90 kg · RIR 2" -- solo con las métricas que de verdad traiga
    // la serie objetivo (el entrenador no siempre pide las 3), nil si no hay
    // ninguna.
    var targetMetricsLine: String? {
        var parts: [String] = []
        if let reps, !reps.isEmpty { parts.append("\(reps) reps") }
        if let load, !load.isEmpty { parts.append(load) }
        if let intensityLabel, let intensityValue, !intensityValue.isEmpty {
            parts.append("\(intensityLabel) \(intensityValue)")
        }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    // "Serie 2/3 · 3 reps · 90 kg · RIR 2" -- la serie objetivo completa
    // (sirve igual sin descansar, como "lo que toca ahora").
    var targetSummaryLine: String {
        guard let metrics = targetMetricsLine else { return setLabel }
        return "\(setLabel) · \(metrics)"
    }

    // Solo se usa durante el descanso: antepone el nombre del ejercicio
    // siguiente si la próxima serie ya no es del mismo ejercicio que el
    // titular (petición explícita 2026-08-26: "si es otro ejercicio indicar
    // el ejercicio siguiente con los datos de la primera serie").
    var restNextLine: String {
        if let nextExerciseName {
            return "Siguiente: \(nextExerciseName) · \(targetSummaryLine)"
        }
        return "Siguiente: \(targetSummaryLine)"
    }
}
