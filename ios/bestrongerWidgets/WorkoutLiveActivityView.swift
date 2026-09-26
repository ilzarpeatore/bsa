import ActivityKit
import SwiftUI
import WidgetKit

// Live Activity del entrenamiento en curso (pedido explícito del usuario
// con captura de referencia de otra app, 2026-08-26; ampliada el mismo día
// con foto del ejercicio + datos de la serie objetivo, también con captura
// de referencia).
//
// Rediseño (2026-09-26, con mockup de referencia generado y aprobado):
// - Barra de progreso segmentada (una por ejercicio) sustituye al texto
//   "Ejercicio N/M" -- se lee de un vistazo, sin tener que leer números.
// - Nombre del ejercicio a 2 líneas (antes 1, se cortaba mal: los nombres
//   de esta app son frases largas, "Jalón lateral con cable y barra en V"
//   no cabía en una línea y quedaba "Jalón lateral con cable y barra e...").
// - "Lo que toca ahora" (reps/carga/RIR-RPE) en chips independientes en vez
//   de una frase corrida -- se capta cada número suelto más rápido que una
//   frase con separadores " · ".
// - Descanso: countdown grande + anillo de progreso circular
//   (ProgressView(timerInterval:countsDown:), iOS 16+) -- el sistema anima
//   el anillo solo, sin que la app tenga que enviar más updates.
// - Los chips de reps/carga y el botón "Serie hecha" abren la app con un
//   Link (deep link por URL scheme, ver DeepLink más abajo) directo al
//   campo/acción correspondiente de la serie activa -- SIN necesitar saber
//   qué sesión/serie es: workout_session_screen.tsx ya resuelve "la serie
//   pendiente de la sesión activa" por su cuenta (mismo patrón que
//   WorkoutMinimizedBar.restore(), que retoma la sesión activa sin pasar
//   ningún id de serie). Usa Link (multi-región, WidgetKit iOS 16+), no
//   widgetURL (que es UNA sola URL para toda la tarjeta) -- así cada chip
//   puede llevar a un sitio distinto dentro de la misma tarjeta.
//
// Pendiente, requiere una capacidad de Apple que no se puede activar sin
// Xcode + portal de desarrollador (App Group o Keychain Sharing, para que
// esta extensión pueda autenticarse contra el backend o avisar a la app
// aunque esté cerrada del todo): un AppIntent real para "Serie hecha" que
// NO abra la app. Por ahora "Serie hecha" también es un Link (abre la app
// y marca la serie en el mismo golpe) -- sigue siendo un solo toque, pero
// no evita desbloquear el móvil. El AppIntent ya escrito, listo para
// activar esa capacidad y cambiar el Link por un Button(intent:), queda
// comentado al final de este fichero.
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
                    // BUG REAL visto en dispositivo (captura, 2026-09-27):
                    // con TrailingStatus aquí, "Serie 1/4" salía DUPLICADO
                    // -- una vez en esta esquina y otra vez abajo (la línea
                    // de .bottom, ver targetSummaryLine), porque para un
                    // ejercicio sin reps/carga/RIR (p.ej. "Dominada", peso
                    // corporal) esa línea de abajo se queda solo con
                    // setLabel, idéntico al de aquí. Se usa
                    // CompactTrailingStatus en su lugar (mismo componente
                    // que ya usa compactTrailing): arriba se ve "en qué
                    // ejercicio del entreno vas" (o la cuenta atrás si
                    // descansas), abajo se ve el detalle de la serie -- dos
                    // datos distintos en vez de uno repetido.
                    CompactTrailingStatus(state: context.state)
                        .foregroundStyle(.white)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.exerciseName)
                        .font(.headline)
                        .foregroundStyle(.white)
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 6) {
                        SegmentedProgressBar(index: context.state.exerciseIndex, total: context.state.totalExercises, height: 3)
                        Text(context.state.isResting ? context.state.restNextLine : context.state.targetSummaryLine)
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.85))
                            .lineLimit(1)
                    }
                }
            } compactLeading: {
                Image(systemName: "figure.strengthtraining.traditional")
            } compactTrailing: {
                // Sin .frame(width: 44) -- ese ancho fijo fue justo lo que
                // forzaba el corte a "Seri..." (ver CompactTrailingStatus);
                // el contenido ya es corto de por sí, se deja que el
                // sistema le dé el tamaño natural que necesita.
                CompactTrailingStatus(state: context.state)
            } minimal: {
                Image(systemName: "figure.strengthtraining.traditional")
            }
        }
    }
}

// Color de marca (mismo teal que C.accentBlack/C.orange en la app RN,
// pages/migrated/theme.ts) -- único acento de color permitido por las
// Human Interface Guidelines de Apple para Live Activities (fondo se queda
// negro/gris, nada de fondos de color llamativos).
private let brandTeal = Color(red: 0x49 / 255, green: 0xC5 / 255, blue: 0xB6 / 255)

// Deep link de vuelta a la app -- mismo esquema ya declarado en
// ios/bestronger/Info.plist (CFBundleURLSchemes: com.pfndesign.bestronger).
// Un solo parámetro (`focus`): la pantalla de sesión ya sabe resolver sola
// cuál es la sesión/serie activa (ver comentario grande arriba), así que
// esta extensión no necesita conocer ningún id de sesión ni de serie.
private enum DeepLink {
    static func focus(_ field: String) -> URL? {
        URL(string: "com.pfndesign.bestronger://workout/focus?field=\(field)")
    }
}

// Barra de progreso segmentada -- un segmento por ejercicio del entreno,
// el actual relleno en teal con leve brillo, el resto en gris apagado.
// Sustituye al texto "Ejercicio N/M": se lee en décimas de segundo.
private struct SegmentedProgressBar: View {
    let index: Int
    let total: Int
    var height: CGFloat = 4

    // BUG REAL visto en dispositivo (captura, 2026-09-27): esta barra se
    // veía como una esquirla diminuta en la esquina en vez de franjas
    // completas. Causa: cada segmento solo llevaba `.frame(height:)`, sin
    // ningún ancho -- un Shape (RoundedRectangle) sin `.frame(width:)` NI
    // `.frame(maxWidth:)` no tiene tamaño intrínseco propio, así que en un
    // HStack normal (y más aún dentro del motor de layout de WidgetKit,
    // más estricto que el de una app) colapsa a un ancho mínimo/cero en vez
    // de repartirse el espacio disponible. `.frame(maxWidth: .infinity)`
    // por segmento -- técnica estándar para una barra segmentada de anchos
    // iguales -- y la propia barra pide todo el ancho que le sobre a su
    // padre (ver LockScreenLiveActivityView: ya no compite con un Spacer
    // contra un ancho indefinido, es ella la que se declara "voraz" y el
    // reloj de al lado queda con su tamaño natural en el borde derecho).
    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<max(total, 1), id: \.self) { i in
                RoundedRectangle(cornerRadius: height / 2)
                    .fill(i < index ? brandTeal : Color.white.opacity(0.18))
                    .frame(maxWidth: .infinity)
                    .frame(height: height)
                    .shadow(color: i == index - 1 ? brandTeal.opacity(0.6) : .clear, radius: 3)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// BUG REAL visto en dispositivo (captura, 2026-09-27): compactTrailing
// usaba TrailingStatus (el mismo componente del estado expandido, con
// texto "Serie N/M") forzado dentro de `.frame(width: 44)`. "Serie 1/4"
// no cabe en 44pt y quedaba cortado a "Seri...". Ese hueco -- el estado
// COMPACTO de la Dynamic Island -- es demasiado estrecho para palabra +
// número; solo debe llevar el dato más corto posible.
//
// Descansando: la cuenta atrás ya es corta de por sí ("1:12") y cabe
// bien, se mantiene igual. Sin descansar: en vez de "Serie N/M" (puede
// llegar a "Serie 12/15", 11 caracteres) se muestra solo la fracción de
// EJERCICIO dentro del entreno ("2/4", sin la palabra) -- mismo dato que
// ya cuenta SegmentedProgressBar, consistente con el resto de la tarjeta,
// y siempre corto (como mucho "12/15", 5 caracteres).
private struct CompactTrailingStatus: View {
    let state: WorkoutActivityAttributes.ContentState

    var body: some View {
        if state.isResting, let end = state.restEndDate {
            Text(timerInterval: Date.now...end, countsDown: true)
                .monospacedDigit()
                .font(.caption2)
        } else {
            Text("\(state.exerciseIndex)/\(state.totalExercises)")
                .monospacedDigit()
                .font(.caption2)
                .fontWeight(.semibold)
                .lineLimit(1)
        }
    }
}

// Miniatura del ejercicio activo -- misma URL remota (CDN) que ya usa el
// resto de la app, cargada vía AsyncImage porque esta extensión no comparte
// disco con la app principal (sin App Group, ver WorkoutActivityAttributes).
// Cae al icono genérico si no hay URL o la carga falla/tarda. Borde teal
// sutil (antes blanco plano) para que se sienta de marca.
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
        .background(Color.white.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: size * 0.27))
        .overlay(
            RoundedRectangle(cornerRadius: size * 0.27)
                .stroke(brandTeal.opacity(0.5), lineWidth: 1.5)
        )
    }

    private var placeholder: some View {
        Image(systemName: "figure.strengthtraining.traditional")
            .font(.system(size: size * 0.4))
            .foregroundStyle(brandTeal)
    }
}

// Un dato suelto de la serie objetivo ("12-15 reps", "70 kg", "RIR 3") como
// chip independiente y tocable -- antes iban todos en una sola frase
// corrida ("Serie 1/3 · 12-15 reps · 70 kg · RIR 3") en subheadline al 70%
// de opacidad, el dato más accionable de toda la tarjeta era el más
// apagado. `focusField` es nil para chips no editables (RIR/RPE, de
// momento no se edita desde el bloqueo).
private struct MetricChip: View {
    let label: String
    let focusField: String?

    var body: some View {
        let text = Text(label)
            .font(.caption)
            .fontWeight(.semibold)
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(
                Capsule().strokeBorder(brandTeal.opacity(0.6), lineWidth: 1)
            )

        if let focusField, let url = DeepLink.focus(focusField) {
            Link(destination: url) { text }
        } else {
            text
        }
    }
}

private struct LockScreenLiveActivityView: View {
    let context: ActivityViewContext<WorkoutActivityAttributes>

    // BUG REAL reportado (2026-09-27): el botón "Serie hecha" aparecía
    // cortado. Las Live Activities de la pantalla bloqueada tienen un
    // límite práctico de alto que impone el sistema (guía de Apple: en
    // torno a 160pt) -- si el contenido se pasa, el sistema RECORTA lo que
    // sobra por abajo (sin avisar, sin error), que es justo donde vive el
    // botón al ser el último elemento. Con los tamaños/espacios originales
    // (padding 16, spacing 12 entre filas, miniatura 56pt, nombre en
    // .headline a 2 líneas) la suma se iba muy por encima de ese margen.
    // Se reduce aire vertical en varios sitios a la vez (aquí, en la
    // miniatura, en el nombre, en los chips y en el propio botón) para
    // dejar margen real de sobra en vez de ajustar al límite exacto, que
    // no se puede medir sin un dispositivo.
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 8) {
                // SegmentedProgressBar ya se declara `.frame(maxWidth:
                // .infinity)` a sí misma -- es ella la que reclama el hueco
                // disponible en vez de dejarlo a un Spacer compitiendo
                // contra un ancho que antes no existía (ver el comentario
                // del bug real en la propia barra).
                SegmentedProgressBar(index: context.state.exerciseIndex, total: context.state.totalExercises)
                // Tiempo total transcurrido -- antes competía en tamaño con
                // "Entrenamiento"/"Ejercicio N/M" en la misma línea; ahora es
                // el dato menos accionable de la tarjeta, así que se queda
                // pequeño y apagado en una esquina, no desaparece.
                Text(context.attributes.startDate, style: .timer)
                    .font(.caption2)
                    .monospacedDigit()
                    .foregroundStyle(.white.opacity(0.35))
                    .fixedSize()
            }

            HStack(spacing: 10) {
                Link(destination: DeepLink.focus("exercise") ?? URL(string: "com.pfndesign.bestronger://")!) {
                    ExerciseThumbnail(urlString: context.state.exerciseImageURL, size: 40)
                }
                Text(context.state.exerciseName)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
            }

            if context.state.isResting, let end = context.state.restEndDate {
                RestingView(state: context.state, end: end)
            } else {
                WStack {
                    MetricChip(label: context.state.setLabel, focusField: nil)
                    if let reps = context.state.reps, !reps.isEmpty {
                        MetricChip(label: "\(reps) reps", focusField: "reps")
                    }
                    if let load = context.state.load, !load.isEmpty {
                        MetricChip(label: load, focusField: "carga")
                    }
                    if let label = context.state.intensityLabel, let value = context.state.intensityValue, !value.isEmpty {
                        MetricChip(label: "\(label) \(value)", focusField: nil)
                    }
                }

                Link(destination: DeepLink.focus("done") ?? URL(string: "com.pfndesign.bestronger://")!) {
                    Text("Serie hecha ✓")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundStyle(Color.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(brandTeal, in: Capsule())
                }
            }
        }
        .padding(12)
    }
}

// Descanso: countdown grande (ya era lo mejor del diseño anterior) + anillo
// de progreso circular alrededor -- de reojo, sin leer los dígitos, se sabe
// si el descanso "acaba de empezar" o "ya casi". ProgressView(timerInterval:)
// lo anima el propio sistema, no hace falta que la app siga enviando
// updates cada segundo (igual que ya pasaba con el Text(timerInterval:) de
// antes).
private struct RestingView: View {
    let state: WorkoutActivityAttributes.ContentState
    let end: Date

    // Mismo motivo que el recorte de LockScreenLiveActivityView (ver el
    // comentario de bug real ahí): este anillo con frame(height: 90) +
    // fuente de 32pt para el número + la línea de "Siguiente" debajo, sumado
    // a la cabecera y la fila de miniatura/nombre que comparte con el otro
    // estado, se pasaba con margen del límite práctico de alto de una Live
    // Activity de pantalla bloqueada -- mismo riesgo de recorte, aunque
    // todavía no reportado en este estado en concreto. Se reduce el anillo
    // y la tipografía en proporción, no solo el alto del frame.
    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                ProgressView(
                    timerInterval: Date.now...end,
                    countsDown: true,
                    label: { EmptyView() },
                    currentValueLabel: { EmptyView() }
                )
                .progressViewStyle(.circular)
                .tint(brandTeal)
                .scaleEffect(1.7)

                Text(timerInterval: Date.now...end, countsDown: true)
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.white)
            }
            .frame(height: 56)
            .frame(maxWidth: .infinity)

            (Text("Siguiente: ").foregroundStyle(brandTeal).fontWeight(.semibold)
                + Text(state.nextExerciseName.map { "\($0) · \(state.targetSummaryLine)" } ?? state.targetSummaryLine)
                    .foregroundStyle(.white.opacity(0.85)))
                .font(.caption)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .center)
        }
    }
}

// HStack con wrap -- SwiftUI no trae uno de fábrica y los chips (número
// variable, 2 a 4) no siempre caben en una sola fila a ancho de Live
// Activity. Implementación mínima con Layout (iOS 16+), sin dependencias.
private struct WStack: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var (currentRowWidth, totalHeight, rowHeight): (CGFloat, CGFloat, CGFloat) = (0, 0, 0)
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentRowWidth + size.width > maxWidth, currentRowWidth > 0 {
                totalHeight += rowHeight + spacing
                currentRowWidth = 0
                rowHeight = 0
            }
            currentRowWidth += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        totalHeight += rowHeight
        return CGSize(width: maxWidth, height: totalHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var (x, y, rowHeight): (CGFloat, CGFloat, CGFloat) = (bounds.minX, bounds.minY, 0)
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
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

// MARK: - Pendiente de una capacidad de Apple que no se puede activar sin
// Xcode + portal de desarrollador (App Group o Keychain Sharing).
//
// Con esa capacidad activada, "Serie hecha" pasaría de Link (abre la app)
// a esto -- un botón real que NO sale del bloqueo. `perform()` necesitaría
// leer el token de sesión desde un Keychain compartido (Keychain Sharing
// entitlement, grupo p.ej. "group.com.pfndesign.bestronger") y llamar
// directamente al mismo endpoint que ya usa la app para marcar una serie
// (ver toggleRowComplete en workout_session_screen.tsx del lado RN), sin
// pasar por la app -- funcionaría incluso con la app completamente cerrada.
//
// import AppIntents
//
// struct MarkSetDoneIntent: LiveActivityIntent {
//     static var title: LocalizedStringResource = "Marcar serie hecha"
//
//     func perform() async throws -> some IntentResult {
//         // TODO (requiere Keychain Sharing): leer el token compartido y
//         // llamar al backend para marcar la serie activa como completada.
//         return .result()
//     }
// }
//
// Uso en LockScreenLiveActivityView, sustituyendo el Link de "Serie hecha":
//
// Button(intent: MarkSetDoneIntent()) {
//     Text("Serie hecha ✓")...
// }
// .buttonStyle(.plain)
