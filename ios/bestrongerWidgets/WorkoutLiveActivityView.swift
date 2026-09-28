import ActivityKit
import SwiftUI
import WidgetKit

// Live Activity del entrenamiento en curso.
//
// Historia (2026-09-28): el rediseño del 26-sep no llegó a verse NUNCA en
// ningún dispositivo -- Activity.request respondía OK pero la extensión no
// pintaba nada, ni en la Dynamic Island ni en la pantalla de bloqueo. Al
// restaurar la vista de la 1.0.1 volvió a aparecer, así que el fallo estaba
// en la vista. Sospechosos: un `Layout` propio (WStack) que pedía ancho
// infinito, rangos `Date.now...end` que abortan si el descanso ya venció, y
// un anillo circular con temporizador escalado. Esta versión nueva sigue
// unas reglas para no repetirlo:
//
// 1. Solo vistas estándar de SwiftUI/WidgetKit disponibles en iOS 16.4
//    (Text, HStack/VStack, Capsule, ProgressView lineal, ViewThatFits). Nada
//    de `Layout` propio, GeometryReader ni tamaños infinitos salvo
//    `.frame(maxWidth: .infinity)`.
// 2. Todo temporizador usa restTimerRange (nunca un rango al revés).
// 3. Sin AsyncImage: WidgetKit no descarga imágenes (la miniatura nunca
//    llegaba a cargarse, siempre salía el icono). La foto del ejercicio
//    necesita un App Group (la app la guarda en disco compartido); hasta
//    entonces se usa el icono.
// 4. Sin Link por zonas: toda la tarjeta y la isla abren la sesión activa
//    con widgetURL (lo que Apple recomienda para Live Activities).
// 5. Alto de la tarjeta de bloqueo por debajo de ~160 pt (lo que sobra, el
//    sistema lo recorta sin avisar).
//
// El diseño de la 1.0.1 se conserva abajo (Classic*) y se elige con
// `attributes.layout == "classic"` (Ajustes → Diagnóstico en la app), para
// poder volver a él sin sacar otra build.
struct WorkoutLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            LockScreenRoot(context: context)
                .activityBackgroundTint(Color.black)
                .activitySystemActionForegroundColor(Color.white)
                .widgetURL(DeepLink.openSession)
        } dynamicIsland: { context in
            context.attributes.layout == "classic" ? ClassicIsland.make(context) : NewIsland.make(context)
        }
    }
}

// Mismo teal de marca que la app (pages/migrated/theme.ts). Único acento de
// color: el fondo se queda negro, como piden las guías de Apple.
private let brandTeal = Color(red: 0x49 / 255, green: 0xC5 / 255, blue: 0xB6 / 255)

// Esquema ya declarado en ios/bestronger/Info.plist. App.tsx lo traduce a
// "abrir la sesión activa" (field=open solo lleva a la serie que toca, sin
// enfocar ningún campo ni marcar nada).
private enum DeepLink {
    static let openSession = URL(string: "com.pfndesign.bestronger://workout/focus?field=open")
}

private struct LockScreenRoot: View {
    let context: ActivityViewContext<WorkoutActivityAttributes>

    var body: some View {
        if context.attributes.layout == "classic" {
            ClassicLockScreenView(context: context)
        } else {
            NewLockScreenView(context: context)
        }
    }
}

// MARK: - Diseño nuevo: Dynamic Island

private enum NewIsland {
    static func make(_ context: ActivityViewContext<WorkoutActivityAttributes>) -> DynamicIsland {
        let state = context.state
        return DynamicIsland {
            DynamicIslandExpandedRegion(.leading) {
                ExerciseIcon(size: 36)
                    .padding(.leading, 4)
            }
            DynamicIslandExpandedRegion(.trailing) {
                ExpandedTrailing(state: state)
                    .padding(.trailing, 4)
            }
            DynamicIslandExpandedRegion(.center) {
                Text(state.exerciseName)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            DynamicIslandExpandedRegion(.bottom) {
                ExpandedBottom(state: state)
                    .padding(.horizontal, 4)
            }
        } compactLeading: {
            Image(systemName: "figure.strengthtraining.traditional")
                .foregroundColor(brandTeal)
        } compactTrailing: {
            CompactTrailing(state: state)
        } minimal: {
            Image(systemName: state.isResting ? "timer" : "figure.strengthtraining.traditional")
                .foregroundColor(brandTeal)
        }
        .widgetURL(DeepLink.openSession)
        .keylineTint(brandTeal)
    }
}

// Hueco derecho de la isla compacta: solo cabe un dato corto. «1/4» es la
// serie que toca del ejercicio actual; descansando, la cuenta atrás.
private struct CompactTrailing: View {
    let state: WorkoutActivityAttributes.ContentState

    var body: some View {
        if state.isResting, let end = state.restEndDate {
            // Un Text con temporizador ocupa todo el ancho que le den: ancho
            // fijo, suficiente para «10:00».
            Text(timerInterval: restTimerRange(until: end), countsDown: true)
                .font(.caption)
                .fontWeight(.semibold)
                .monospacedDigit()
                .foregroundColor(brandTeal)
                .multilineTextAlignment(.trailing)
                .frame(width: 42)
        } else {
            Text(state.setFraction)
                .font(.caption)
                .fontWeight(.semibold)
                .monospacedDigit()
                .foregroundColor(.white)
                .lineLimit(1)
        }
    }
}

// Esquina derecha de la isla expandida: en qué ejercicio del entreno vas (la
// serie ya va abajo, así no se repite), o la cuenta atrás si descansas.
private struct ExpandedTrailing: View {
    let state: WorkoutActivityAttributes.ContentState

    var body: some View {
        if state.isResting, let end = state.restEndDate {
            Text(timerInterval: restTimerRange(until: end), countsDown: true)
                .font(.system(.title3, design: .rounded))
                .fontWeight(.bold)
                .monospacedDigit()
                .foregroundColor(brandTeal)
                .multilineTextAlignment(.trailing)
                .frame(width: 64)
        } else {
            VStack(alignment: .trailing, spacing: 0) {
                Text("Ejercicio")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.55))
                Text("\(state.exerciseIndex)/\(state.totalExercises)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .monospacedDigit()
                    .foregroundColor(.white)
            }
            .lineLimit(1)
        }
    }
}

private struct ExpandedBottom: View {
    let state: WorkoutActivityAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if state.isResting, let end = state.restEndDate {
                RestProgressBar(end: end)
                Text(state.restNextLine)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.85))
                    .lineLimit(1)
            } else {
                SetProgressBar(index: state.setIndex, total: state.totalSets)
                Text(state.targetSummaryLine)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.85))
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Diseño nuevo: pantalla de bloqueo

// Alto estimado (sin descansar): 14 + 16 + 8 + 44 + 8 + 24 + 8 + 4 + 14 ≈ 140 pt.
// Descansando: 14 + 20 + 6 + 48 + 6 + 4 + 6 + 16 + 14 ≈ 134 pt.
private struct NewLockScreenView: View {
    let context: ActivityViewContext<WorkoutActivityAttributes>

    var body: some View {
        let state = context.state
        VStack(alignment: .leading, spacing: 8) {
            if state.isResting, let end = state.restEndDate {
                NewRestingView(state: state, end: end)
            } else {
                HStack(spacing: 8) {
                    Text("Ejercicio \(state.exerciseIndex)/\(state.totalExercises)")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(brandTeal)
                    Spacer(minLength: 4)
                    Text(context.attributes.startDate, style: .timer)
                        .font(.caption)
                        .monospacedDigit()
                        .foregroundColor(.white.opacity(0.5))
                        .multilineTextAlignment(.trailing)
                        .frame(width: 64, alignment: .trailing)
                }

                HStack(spacing: 12) {
                    ExerciseIcon(size: 44)
                    Text(state.exerciseName)
                        .font(.headline)
                        .foregroundColor(.white)
                        .lineLimit(2)
                    Spacer(minLength: 0)
                }

                // Chips si caben en una fila; si no, la misma información en
                // una línea de texto (ViewThatFits elige la primera que cabe).
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 6) {
                        MetricChip(text: state.setLabel, highlighted: true)
                        ForEach(Array(state.targetMetricParts.enumerated()), id: \.offset) { item in
                            MetricChip(text: item.element, highlighted: false)
                        }
                    }
                    Text(state.targetSummaryLine)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.85))
                        .lineLimit(1)
                }

                SetProgressBar(index: state.setIndex, total: state.totalSets)
            }
        }
        .padding(14)
    }
}

private struct NewRestingView: View {
    let state: WorkoutActivityAttributes.ContentState
    let end: Date

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Text("Descanso")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(brandTeal)
                Spacer(minLength: 4)
                Text("Ejercicio \(state.exerciseIndex)/\(state.totalExercises)")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.5))
            }

            Text(timerInterval: restTimerRange(until: end), countsDown: true)
                .font(.system(size: 40, weight: .bold, design: .rounded))
                .monospacedDigit()
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, alignment: .center)

            RestProgressBar(end: end)

            Text(state.restNextLine)
                .font(.caption)
                .foregroundColor(.white.opacity(0.8))
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .center)
        }
    }
}

// MARK: - Piezas comunes del diseño nuevo

private struct ExerciseIcon: View {
    let size: CGFloat

    var body: some View {
        Image(systemName: "figure.strengthtraining.traditional")
            .font(.system(size: size * 0.45))
            .foregroundColor(brandTeal)
            .frame(width: size, height: size)
            .background(
                RoundedRectangle(cornerRadius: size * 0.27)
                    .fill(Color.white.opacity(0.12))
            )
    }
}

private struct MetricChip: View {
    let text: String
    let highlighted: Bool

    var body: some View {
        Text(text)
            .font(.caption)
            .fontWeight(.semibold)
            .foregroundColor(highlighted ? .black : .white)
            .lineLimit(1)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule().fill(highlighted ? brandTeal : Color.white.opacity(0.14))
            )
    }
}

// Una franja por serie del ejercicio actual: hechas en teal, la que toca en
// teal apagado, el resto en gris. Con más de 10 series (o sin datos de
// serie) pasa a una barra continua para no dibujar franjas de 2 pt.
private struct SetProgressBar: View {
    let index: Int?
    let total: Int?

    var body: some View {
        let count = max(total ?? 0, 0)
        let current = min(max(index ?? 0, 0), count)
        if count > 0 && count <= 10 {
            HStack(spacing: 3) {
                ForEach(0..<count, id: \.self) { i in
                    Capsule()
                        .fill(segmentColor(i, current: current))
                        .frame(maxWidth: .infinity)
                        .frame(height: 4)
                }
            }
            .frame(maxWidth: .infinity)
        } else if count > 10 {
            ProgressView(value: Double(max(current - 1, 0)), total: Double(count))
                .progressViewStyle(.linear)
                .tint(brandTeal)
        }
    }

    // `current` es la serie que toca (1-based): las anteriores están hechas.
    private func segmentColor(_ i: Int, current: Int) -> Color {
        if i < current - 1 { return brandTeal }
        if i == current - 1 { return brandTeal.opacity(0.4) }
        return Color.white.opacity(0.18)
    }
}

// Barra de descanso que se vacía sola (la anima el sistema, la app no manda
// updates). Lineal a propósito: el anillo circular escalado del rediseño es
// uno de los sospechosos de que no se viera nada.
private struct RestProgressBar: View {
    let end: Date

    var body: some View {
        ProgressView(
            timerInterval: restTimerRange(until: end),
            countsDown: true,
            label: { EmptyView() },
            currentValueLabel: { EmptyView() }
        )
        .progressViewStyle(.linear)
        .tint(brandTeal)
    }
}

// MARK: - Diseño clásico (1.0.1), sin cambios salvo restTimerRange y «1/4»

private enum ClassicIsland {
    static func make(_ context: ActivityViewContext<WorkoutActivityAttributes>) -> DynamicIsland {
        DynamicIsland {
            DynamicIslandExpandedRegion(.leading) {
                ClassicExerciseThumbnail(urlString: context.state.exerciseImageURL, size: 32)
            }
            DynamicIslandExpandedRegion(.trailing) {
                ClassicTrailingStatus(state: context.state)
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
            ClassicTrailingStatus(state: context.state)
                .frame(width: 44)
        } minimal: {
            Image(systemName: "figure.strengthtraining.traditional")
        }
    }
}

private struct ClassicTrailingStatus: View {
    let state: WorkoutActivityAttributes.ContentState

    var body: some View {
        if state.isResting, let end = state.restEndDate {
            Text(timerInterval: restTimerRange(until: end), countsDown: true)
                .monospacedDigit()
        } else if let index = state.setIndex, let total = state.totalSets {
            // En la Dynamic Island solo cabe «1/4»: «Serie 1/4» salía «Seri…».
            Text("\(index)/\(total)")
                .monospacedDigit()
                .lineLimit(1)
        } else {
            Text(state.setLabel)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
    }
}

// AsyncImage no carga en widgets (sale siempre el icono); se deja tal cual
// estaba en la 1.0.1 para que el diseño clásico sea idéntico al que funcionaba.
private struct ClassicExerciseThumbnail: View {
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

private struct ClassicLockScreenView: View {
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
                ClassicExerciseThumbnail(urlString: context.state.exerciseImageURL, size: 44)

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
                Text(timerInterval: restTimerRange(until: end), countsDown: true)
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

// MARK: - Datos derivados

private extension WorkoutActivityAttributes.ContentState {
    // ["8 reps", "40 kg", "RIR 4"] -- solo las métricas que traiga la serie
    // objetivo (el entrenador no siempre pide las tres).
    var targetMetricParts: [String] {
        var parts: [String] = []
        if let reps, !reps.isEmpty { parts.append("\(reps) reps") }
        if let load, !load.isEmpty { parts.append(load) }
        if let intensityLabel, let intensityValue, !intensityValue.isEmpty {
            parts.append("\(intensityLabel) \(intensityValue)")
        }
        return parts
    }

    // "Serie 2/3 · 3 reps · 90 kg · RIR 2" -- la serie objetivo completa
    // (sirve igual sin descansar, como "lo que toca ahora").
    var targetSummaryLine: String {
        let parts = targetMetricParts
        guard !parts.isEmpty else { return setLabel }
        return ([setLabel] + parts).joined(separator: " · ")
    }

    // Solo se usa durante el descanso: antepone el nombre del ejercicio
    // siguiente si la próxima serie ya no es del mismo ejercicio que el
    // titular (petición explícita 2026-08-26).
    var restNextLine: String {
        if let nextExerciseName {
            return "Siguiente: \(nextExerciseName) · \(targetSummaryLine)"
        }
        return "Siguiente: \(targetSummaryLine)"
    }

    // «1/4» (serie del ejercicio actual) o, si no hay serie objetivo, la
    // fracción de ejercicio del entreno.
    var setFraction: String {
        if let setIndex, let totalSets { return "\(setIndex)/\(totalSets)" }
        return "\(exerciseIndex)/\(totalExercises)"
    }
}

// `Date.now...end` aborta la extensión si el descanso ya ha vencido
// (end < ahora), p. ej. al redibujar con la app en segundo plano. Con el
// rango acotado la cuenta se queda en 0:00 en vez de caerse.
private func restTimerRange(until end: Date) -> ClosedRange<Date> {
    let now = Date.now
    return now...max(now, end)
}
