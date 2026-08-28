# WEB_APP_DOCUMENTATION.md

**Documentación funcional completa de BeFit (repo `bsa`) para servir de base a la web oficial del servicio de entrenamiento y nutrición online.**

- Fecha del análisis: 2026-08-27.
- Fuente: análisis directo del código fuente de la app (React Native/Expo, ~90 pantallas registradas) mediante 7 investigaciones exhaustivas por dominio funcional, más la documentación interna del proyecto (`docs/*.md`, `BUGS_AND_FIXES.md`, `IMPROVEMENTS.md`).
- Método: cada afirmación de este documento está respaldada por código real (archivo/pantalla) o por documentación interna del proyecto. Nada aquí es inventado. Donde el estado real no se pudo confirmar del todo, se marca explícitamente **"No confirmado"**.
- Convención de estado usada en todo el documento:
  - 🟢 **Implementada** — funciona de extremo a extremo (frontend + backend reales).
  - 🟡 **Parcialmente implementada** — el frontend existe y funciona, pero con una limitación real (dato aproximado, sin persistencia, cobertura incompleta).
  - 🟠 **Preparada, backend pendiente** — el frontend está totalmente construido y probado, pero depende de un endpoint que el backend todavía no expone (falla o no persiste hasta que se construya).
  - ⚪ **No implementada / código muerto** — existe en el repositorio pero no es alcanzable por un usuario real, o es un stub sin funcionalidad.
  - 🔵 **Idea futura** — no existe en el código; es una recomendación de este documento, nunca una funcionalidad real.

## ⚠️ Nota de marca (a resolver antes de construir la web)

El nombre interno/técnico del proyecto y de la app es **"BeFit"** (identificador de repo `bsa`, nombre visible en el pie de la app: `"BeFit {versión}"`, `home_screen_modern_v2.tsx`). Sin embargo, el dominio de venta/cobro externo y el contenido del blog se refieren a la marca como **"BeStronger"** (dominio `bestronger.es`, y una frase real de un artículo del blog: _"En BeStronger vemos este patrón constantemente entre quienes usan la app..."_). Esto no está resuelto en el propio código — parece un cambio de nombre en curso o un nombre de marca (BeStronger) distinto del nombre técnico de la app (BeFit). **Antes de fijar el dominio, el logo y el copy de la web, hay que confirmar con el negocio cuál es el nombre comercial definitivo.** Este documento usa "BeFit" para referirse a la app y "el servicio"/"la marca" quando no depende del nombre exacto.

---

## 1. Visión general del servicio

### Qué es

Un servicio de **entrenamiento y nutrición online con acompañamiento de un coach real**, entregado a través de una app móvil (iOS/Android) que el cliente usa a diario y un panel de administración donde el coach diseña, asigna y hace seguimiento de los planes. No es una app de rutinas genéricas descargable y ya está: cada plan de entrenamiento y de nutrición que un cliente ve en la app puede haber sido diseñado o ajustado específicamente para él por su coach, y buena parte del valor del producto está en cómo la app **recoge datos objetivos del cliente día a día** (series completadas, cargas, sensación, sueño, estrés, cumplimiento de hábitos, dolor) para que el coach pueda tomar decisiones informadas sin depender de que el cliente se lo cuente por WhatsApp.

### Para quién está diseñado

El modelo de datos distingue explícitamente **3 niveles de cliente** (`access_tier`: `free` / `subscriber` / `personal`, más un flag independiente `is_personal_client`):

- **Cliente personal / 1:1** (`is_personal_client=true`): tiene un coach que le diseña y ajusta su plan de entrenamiento día a día (ve "Mi plan de hoy" en el Home, personalizado; el carrusel de "Entrenamientos" genéricos se le oculta porque no lo necesita).
- **Cliente con paquete/suscripción** (`subscriber`): accede a contenido según lo que su `Package` desbloquee (mecanismo existe, pero a fecha de este análisis **ningún contenido de producción está marcado como exclusivo todavía** — ver §13).
- **Cliente free**: nivel por defecto, acceso a lo no marcado como exclusivo/premium.

### Qué problema resuelve

Sustituye la combinación habitual de "PDF/Excel de rutina + grupo de WhatsApp + hoja de cálculo de comidas" por una única app donde el cliente ve qué le toca cada día, registra lo que hace en tiempo real (no de memoria al final del día), y el coach puede ver el histórico completo, el cumplimiento, el dolor reportado y las sensaciones diarias sin tener que preguntar.

### Qué incluye el servicio (bloques reales de la app)

1. Entrenamiento personalizado con seguimiento serie a serie (§3).
2. Nutrición personalizada con plan diario de macros/calorías (§4).
3. Sistema de hábitos con rachas y objetivos numéricos (§5).
4. Seguimiento de métricas corporales, progreso y estadísticas de entrenamiento (§6).
5. Chequeo diario de preparación (sueño/energía/estrés/agujetas) que alimenta el "Recovery" del Home.
6. Check-ins periódicos configurables por el coach (formularios de revisión).
7. Comunidad social entre clientes (posts, likes, comentarios).
8. Contenido educativo (blog real, recursos asignables por el coach).
9. Un bot de soporte para dudas básicas (no es un entrenador ni un chat con IA real — ver §9).

### Cómo funciona desde que una persona se registra hasta que empieza a usarlo

Flujo real verificado en código (no el flujo más largo que existe en el repo, sino el que de verdad es alcanzable — ver §12 para el detalle completo y la advertencia sobre un flujo de registro más largo que quedó **como código muerto**):

1. Pantalla de bienvenida (Google/Facebook son botones "Próximamente", no funcionan) → "Continuar con Email".
2. Registro con nombre, email, contraseña y un **código de invitación opcional** (si es válido, marca al usuario como cliente personal 1:1 automáticamente).
3. Onboarding v2: un cuestionario de 37 preguntas en 4 etapas (datos personales, PAR-Q, cuestionario de entrenamiento, cuestionario de nutrición) — ver §12 para el detalle exacto, incluida la salvedad importante de que 3 de las 4 etapas **no se guardan todavía en el servidor** (backend pendiente).
4. Pantalla de resultado: BMR/TDEE calculado y un plan de calorías/macros de partida, botón "Confirmar mi plan".
5. Entra al Home, donde empieza a ver contenido — genérico si es free, o ya asignado por su coach si es 1:1.

### Qué lo diferencia de un gimnasio tradicional

El seguimiento no depende de que el cliente esté físicamente presente ni de que recuerde contarle al entrenador cómo le fue: cada serie, cada síntoma de dolor, cada check-in diario y cada hábito cumplido queda registrado con fecha y hora, visible para el coach sin depender de la memoria de nadie.

### Qué lo diferencia de una app genérica de entrenamiento

Una app de rutinas genérica no tiene a un coach real leyendo los datos y ajustando el plan; aquí el sistema de **auto-regulación de carga** (ver §14) ya calcula sugerencias de peso/reps según el rendimiento pasado, pero esas sugerencias quedan pendientes de aprobación del coach antes de mostrarse como el objetivo real — el sistema propone, la persona decide.

### Qué lo diferencia de contratar solo una rutina en PDF

La rutina en PDF no se adapta: aquí, si el cliente reporta dolor en un ejercicio, hay un sistema de reporte de dolor con categorías (molestia leve/dolor agudo/dolor que empeora) que decide automáticamente si debe notificarse al coach; si el cliente no puede entrenar un día concreto, puede solicitar reorganizar su semana arrastrando el entrenamiento a otro día; si su sueño o estrés están mal, el chequeo diario de preparación lo refleja antes de empezar a entrenar.

### Qué valor aporta el acompañamiento personalizado

El acompañamiento no es un chat en vivo con el coach (**no existe** esa función — ver §9), sino un conjunto de señales asíncronas de alta calidad que el coach revisa desde su panel: notas del coach visibles en cada ejercicio, objetivos concretos por serie, feedback post-entrenamiento (dificultad + comentario libre), reportes de dolor, check-ins configurables, y el chequeo diario de preparación.

### Cómo se combinan entrenamiento, nutrición, hábitos y seguimiento

Las 4 piezas comparten la misma pantalla de inicio (Home) y el mismo sistema de constancia semanal (`WeekComplianceRow`, un componente compartido que se usa tanto para hábitos como para entrenamientos). El Home resume en una sola pantalla: el plan de entrenamiento de hoy, el cumplimiento semanal, los hábitos con racha, el objetivo nutricional del día, y el estado de "Recovery" calculado a partir del chequeo diario.

### Filosofía/metodología

No se encontró en el código ningún documento de metodología de entrenamiento propia (tipo "método X"). Lo que sí es una decisión de producto explícita y verificable es la **auto-regulación de carga basada en rendimiento real** (no en tablas fijas de progresión) y el uso de **RIR/RPE como medida de esfuerzo intercambiable** en vez de solo porcentajes de 1RM — ambos elementos técnicos reales que la web puede explicar sin inventar una "filosofía de marca" que no está documentada en la app. **No confirmado**: si existe una filosofía de marca definida fuera del código (por ejemplo, en materiales del coach), habría que pedirla aparte — no se puede extraer del repositorio.

---

## 2. Funcionalidades generales de la app — inventario completo

Tabla maestra de todas las funcionalidades encontradas. El detalle línea a línea de cada una está en las secciones 3-10; aquí se listan todas juntas para tener un inventario de un vistazo.

| Funcionalidad                                                    | Estado                                                                                           | Depende de                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------- |
| Registro simple (nombre/email/contraseña + código de invitación) | 🟢 Implementada                                                                                  | —                                 |
| Registro largo con PAR-Q y assessment (`RegisterFlowScreen`)     | ⚪ Código muerto, nunca alcanzable                                                               | —                                 |
| Onboarding v2 — datos personales                                 | 🟢 Implementada                                                                                  | Registro                          |
| Onboarding v2 — PAR-Q (10 preguntas)                             | 🟠 Preparada, backend pendiente                                                                  | Registro                          |
| Onboarding v2 — cuestionario de entrenamiento (12 preguntas)     | 🟠 Preparada, backend pendiente                                                                  | Registro                          |
| Onboarding v2 — cuestionario de nutrición (10 preguntas)         | 🟠 Preparada, backend pendiente                                                                  | Registro                          |
| Cálculo de plan (BMR/TDEE/macros)                                | 🟢 Implementada                                                                                  | Datos personales del onboarding   |
| Marcado de onboarding completado                                 | 🟡 Parcial (solo local, sin sincronía real entre dispositivos)                                   | —                                 |
| Niveles de acceso (`free`/`subscriber`/`personal`)               | 🟡 Modelo listo, apenas consumido en la práctica                                                 | —                                 |
| Conexión con Apple Health / Health Connect                       | 🟡 Parcial (Android backend real; iOS bloqueado; UI de conexión inalcanzable)                    | Cuenta de pago de Apple Developer |
| Vista previa de entrenamiento                                    | 🟢 Implementada                                                                                  | Plan asignado o catálogo          |
| Chequeo diario de preparación (readiness)                        | 🟢 Implementada                                                                                  | —                                 |
| Sesión de entrenamiento (series/reps/carga/RIR-RPE/descanso)     | 🟢 Implementada                                                                                  | Vista previa                      |
| Selector RIR/RPE intercambiable                                  | 🟢 Implementada                                                                                  | Sesión de entrenamiento           |
| Live Activity (pantalla de bloqueo iOS)                          | 🟢 Implementada                                                                                  | Sesión de entrenamiento, solo iOS |
| Barra de entrenamiento minimizado                                | 🟢 Implementada                                                                                  | Sesión de entrenamiento           |
| Añadir ejercicio sobre la marcha                                 | 🟢 Implementada                                                                                  | Sesión de entrenamiento           |
| Reporte de dolor por ejercicio                                   | 🟢 Implementada                                                                                  | Sesión de entrenamiento           |
| Auto-regulación de carga (sugerencias)                           | 🟢 Implementada (motor real)                                                                     | Historial de rendimiento          |
| Feedback post-entrenamiento                                      | 🟢 Implementada                                                                                  | Fin de sesión                     |
| Resumen de entrenamiento (tarjetas para compartir)               | 🟢 Implementada                                                                                  | Feedback                          |
| Historial de entrenamientos                                      | 🟢 Implementada                                                                                  | —                                 |
| Detalle de sesión pasada                                         | 🟢 Implementada                                                                                  | Historial                         |
| Calendario de programa (mes/semana)                              | 🟢 Implementada                                                                                  | Plan asignado                     |
| Solicitar día no disponible                                      | 🟢 Implementada                                                                                  | Calendario                        |
| Reorganizar semana (arrastrar entrenamiento)                     | 🟢 Implementada                                                                                  | Calendario                        |
| Importación desde Hevy/Strong                                    | ⚪ No existe (solo referencias de diseño internas)                                               | —                                 |
| Rutinas v1 (legacy)                                              | ⚪ Código muerto                                                                                 | —                                 |
| Plan diario de nutrición (macros/calorías)                       | 🟢 Implementada                                                                                  | —                                 |
| Comidas asignadas por el coach                                   | 🟢 Implementada                                                                                  | Plan diario                       |
| Buscador/catálogo de recetas                                     | 🟢 Implementada                                                                                  | —                                 |
| Categorías y etiquetas de recetas                                | 🟢 Implementada (etiquetas agrupadas por heurística, no campo real de backend)                   | —                                 |
| Favoritos de recetas                                             | 🟢 Implementada                                                                                  | —                                 |
| Lista de la compra (generada desde el plan)                      | 🟡 Completa pero sin punto de entrada visible en la navegación actual                            | Plan diario                       |
| Seguimiento de agua                                              | 🟡 Solo interfaz, no persiste datos (backend no conectado)                                       | —                                 |
| Dashboard "Dietas" (catálogo legacy)                             | 🟡 Interfaz completa, catálogo de contenido casi vacío (1 fila real)                             | —                                 |
| Sustitución de ingredientes                                      | ⚪ No existe                                                                                     | —                                 |
| Hábitos (biblioteca/personal/asignado por coach)                 | 🟢 Implementada                                                                                  | —                                 |
| Racha de hábitos                                                 | 🟢 Implementada (calculada en servidor)                                                          | —                                 |
| Hábitos con objetivo numérico (% de cumplimiento)                | 🟢 Implementada                                                                                  | —                                 |
| Métricas corporales (peso, medidas, config. por coach)           | 🟢 Implementada                                                                                  | —                                 |
| Fotos de progreso                                                | ⚪ No existe en ninguna pantalla                                                                 | —                                 |
| Progreso agregado (composición, constancia, entreno)             | 🟢 Implementada                                                                                  | —                                 |
| Progreso muscular (mapa de calor)                                | 🟢 Implementada                                                                                  | —                                 |
| Estadísticas — 6 informes distintos                              | 🟢 Implementada                                                                                  | Historial de entrenamiento        |
| Check-ins configurables por el coach                             | 🟢 Implementada (8 de 11 tipos de pregunta)                                                      | —                                 |
| Preguntas de foto/firma en check-ins                             | ⚪ Definidas en el modelo de datos, sin renderer en la app                                       | Check-ins                         |
| Chequeo de preparación (Recovery)                                | 🟢 Implementada (aproximación real, no el score completo del backend)                            | —                                 |
| Anillo "Strain"                                                  | ⚪ Placeholder permanente, sin fuente de datos                                                   | —                                 |
| Dashboard / Home                                                 | 🟢 Implementada                                                                                  | —                                 |
| Reto para empezar (tutorial gamificado)                          | 🟢 Implementada                                                                                  | —                                 |
| Perfil de usuario                                                | 🟢 Implementada                                                                                  | —                                 |
| Editar perfil (incl. foto)                                       | 🟢 Implementada                                                                                  | —                                 |
| Comunidad (posts, likes, comentarios, reportes)                  | 🟢 Implementada                                                                                  | —                                 |
| Perfil de otro usuario                                           | 🟢 Implementada                                                                                  | Comunidad                         |
| Guardados/bookmarks de posts                                     | 🟢 Implementada                                                                                  | Comunidad                         |
| Chat de soporte ("FitBot"/"Be Stronger AI")                      | 🟡 Interfaz + historial reales, respuesta **fija, no es IA**                                     | —                                 |
| Chat de soporte con imágenes                                     | ⚪ Sin implementar (`TODO: OpenAI`), inalcanzable                                                | —                                 |
| Notificaciones push (bandeja)                                    | 🟢 Implementada                                                                                  | —                                 |
| Recordatorios locales (agua/comidas/personalizados)              | ⚪ Motor construido, sin pantallas que lo activen hoy                                            | —                                 |
| Blog                                                             | 🟢 Implementada, contenido real (15 artículos)                                                   | —                                 |
| Vídeos                                                           | ⚪ Sin backend, sin datos, inalcanzable                                                          | —                                 |
| Recursos (artículos/vídeos/enlaces/documentos asignables)        | 🟢 Implementada                                                                                  | —                                 |
| Buscar ejercicio por músculo (mapa corporal)                     | 🟢 Implementada                                                                                  | —                                 |
| Buscar ejercicio por equipamiento (pantalla dedicada)            | ⚪ Código muerto (el filtro sí existe dentro del buscador general)                               | —                                 |
| Selector de idioma                                               | ⚪ No funcional (persistencia comentada, app 100% en español)                                    | —                                 |
| Modo claro/oscuro/automático                                     | 🟢 Implementada ("automático" sigue la hora del dispositivo, no el ajuste del sistema operativo) | —                                 |
| Acerca de la app / Acerca de nosotros                            | ⚪ Contenido de plantilla sin terminar ("MightyFitness", placeholders)                           | —                                 |
| Política de privacidad / Términos                                | ⚪ Contenido de plantilla genérico                                                               | —                                 |
| Solicitar función / Informar de error                            | 🟠 Preparada, backend pendiente                                                                  | —                                 |
| Diagnóstico (exportar registros locales)                         | 🟢 Implementada                                                                                  | —                                 |
| Compra/suscripción dentro de la app                              | ⚪ Eliminada a propósito (política Apple/Google); cobro 100% externo                             | —                                 |
| Screen Explorer                                                  | ⚪ Herramienta interna de desarrollo, no es una función de marketing                             | —                                 |

---

## 3. Entrenamiento

Es el dominio más maduro y completo de la app: no se encontraron TODOs sin resolver dentro de los propios archivos de la sesión de entrenamiento.

### 3.1 Cómo vive el usuario un entrenamiento, de principio a fin

1. **Chequeo de preparación diario (obligatorio, salvo que el coach lo desactive para ese cliente)**: antes de ver el entrenamiento, si no se ha rellenado hoy, aparece un formulario — "¿Cómo llegas hoy?" — con 4 escalas: calidad del sueño (1-5), agujetas (1-10), energía (1-5) y estrés mental (1-5). Si la llamada de red falla, el chequeo se salta en vez de bloquear el entrenamiento ("mejor dejar entrenar que dejar a alguien atascado", comentario real del código).
2. **Vista previa del entrenamiento**: foto de cabecera, título, descripción, número de ejercicios y series totales. Cada ejercicio muestra una miniatura con mapa de calor muscular, el número de series prescritas, un resumen ("3 series de 10 reps"), la **última vez que se hizo ese ejercicio** ("80 kg × 10 reps · 3 series"), y notas del coach en una tarjeta desplegable si las hay. Botón "INICIAR ENTRENAMIENTO".
3. **Sesión de entrenamiento**: los ejercicios se organizan en bloques (páginas horizontales), cada bloque con sus ejercicios en acordeón (uno abierto a la vez). Por cada serie hay celdas editables según las métricas habilitadas por el coach para ese ejercicio: repeticiones, carga, descanso, tiempo, y una casilla de intensidad que alterna entre **RIR** (repeticiones en reserva) y **RPE** (esfuerzo percibido) — nunca las dos a la vez, y el cliente puede cambiar cuál rellenar tocando la cabecera de la columna. Cada celda muestra el objetivo del coach debajo ("Obj: 80"), o una "Sugerido: 85" en naranja/aviso si el motor de auto-regulación tiene una propuesta pendiente de aprobación.
4. **Marcar una serie**: tocar el círculo de check dispara una vibración ligera, guarda la serie inmediatamente en el servidor (no espera a terminar el entrenamiento), arranca el descanso configurado (si lo hay, con cuenta atrás y opción de saltar) y — si el ejercicio tiene RIR/RPE activado — abre automáticamente el selector de intensidad (desactivable, se recuerda la preferencia). "MARCAR TODAS" completa todas las series del ejercicio activo de golpe.
5. **Durante el descanso**, en iOS aparece una notificación en la pantalla de bloqueo/Dynamic Island (Live Activity) con la foto del ejercicio, el objetivo de la siguiente serie y la cuenta atrás en vivo — sin necesidad de tener la app abierta.
6. **Reportar dolor**: un icono de botiquín por ejercicio abre un formulario — tipo de molestia, zona del cuerpo (10 opciones + "otro"), intensidad 1-5, y cuándo ocurrió. Según la combinación, la app decide si mostrar "hemos notificado a tu entrenador" o solo "queda registrado en tu sesión".
7. **Minimizar sin perder la sesión**: se puede minimizar deslizando hacia abajo sobre la cabecera; aparece entonces una barra flotante global (visible en cualquier pantalla de la app) con el título, el tiempo transcurrido y el progreso de series, que al tocarla vuelve exactamente a la sesión en curso. La sesión persiste aunque se cierre la app del todo.
8. **Finalizar**: si hay 0 series registradas, pide confirmación explícita. Si se sale sin finalizar, avisa de que se perderá la duración y el feedback (las series ya marcadas quedan guardadas de todas formas).
9. **Feedback post-entrenamiento**: escala de dificultad de 5 emojis (😩 Muy duro → 🔥 Genial) + comentario libre ("Cómo te has sentido, alguna molestia, qué te gustaría cambiar...").
10. **Resumen para compartir**: un carrusel de 6 tarjetas diseñadas para redes sociales (kg totales levantados con una comparación graciosa — "eso es como levantar 2.3 veces un oso pardo" —, mapa de calor muscular, estadísticas del entrenamiento), compartibles directamente a Instagram Stories, para descargar, o por cualquier otra app.
11. **Historial**: lista de entrenamientos completados con duración, volumen y dificultad; el detalle de cada uno muestra la tabla completa de series (peso/reps/RIR-RPE) y marca si hubo un récord personal en algún ejercicio.

### 3.2 Elementos técnicos, uno a uno

| Elemento                            | Detalle real                                                                                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Series/repeticiones/carga           | Celdas numéricas editables, guardadas serie a serie al marcarla completa                                                                                             |
| RIR/RPE                             | Un único "hueco" intercambiable por ejercicio, nunca ambos a la vez; escalas de 5 tramos con explicación bajo demanda                                                |
| Descansos                           | Cuenta atrás con opción de saltar; vibra al llegar a cero; también se ve en la Live Activity de iOS                                                                  |
| Tiempo                              | Métrica disponible como columna, para ejercicios por tiempo en vez de repeticiones                                                                                   |
| Calentamiento / cardio              | **No confirmado** — no se encontró un bloque específico de "calentamiento" o "cardio" diferenciado en el modelo de datos; los bloques de entrenamiento son genéricos |
| Progresiones                        | El motor de auto-regulación (§14) calcula sugerencias de carga/reps basadas en el rendimiento pasado, pendientes de aprobación del coach                             |
| Registro de ejercicios              | Cada serie se sincroniza al servidor al momento de marcarla, no al final de la sesión                                                                                |
| Historial                           | Pantalla dedicada + detalle de cada sesión pasada                                                                                                                    |
| Entrenamientos completados          | Contados y mostrados en varias pantallas (perfil, resumen, estadísticas)                                                                                             |
| Modificación/adaptación             | El coach puede ajustar el día (aparece como "Sesión ajustada por tu entrenador"); el cliente puede pedir reorganizar su semana                                       |
| Entrenamientos futuros / calendario | Vista de mes y semana, con bloqueo de la semana siguiente hasta que empiece la actual                                                                                |
| Feedback del usuario                | Dificultad + comentario libre, guardado por sesión                                                                                                                   |
| Comunicación con el entrenador      | Notas del coach por ejercicio, objetivos vs. sugerencias, reporte de dolor, solicitudes de día no disponible — todo asíncrono, sin chat en vivo (ver §9)             |

### 3.3 Catálogo de entrenamientos y asignación

- El plan real de un cliente 1:1 llega como **asignación de día de programa** (`program_day_assignment_id`), diseñada por su coach.
- Además existe un catálogo de **"Workouts sueltos"** navegable fuera de cualquier programa, que puede marcarse como exclusivo (bloqueado con un candado y el mensaje "hazte cliente 1:1 o compra un paquete con acceso completo a Workouts" si no es accesible para ese usuario).
- **No existe importación desde Hevy, Strong ni ninguna otra app** — las únicas menciones a esos nombres en el código son comentarios internos de referencia visual de diseño (nunca funcionalidad real). Si el equipo comercial cree que existe esta función, hay que corregir esa idea antes de prometerla en la web.
- Existe una pantalla de "Rutinas" más antigua (v1) que está registrada en el código pero **no es alcanzable por ningún usuario real** — un comentario del propio equipo de desarrollo confirma que se quitó a propósito del Home por ser "un callejón sin salida". No debe aparecer en la web como funcionalidad viva.

### 3.4 Cómo comunicar este servicio en la web

Mensajes defendibles con evidencia real (no genéricos):

- "Cada serie que haces queda registrada al momento — tu coach ve tu progreso real, no lo que recuerdas contarle."
- "El peso y las repeticiones que te tocan hoy se ajustan solos según cómo entrenaste la última vez" (auto-regulación, con matiz honesto: las sugerencias las aprueba el coach, no son automáticas sin supervisión).
- "Si te duele algo entrenando, repórtalo ahí mismo — tu coach se entera al momento, sin esperar a la próxima sesión."
- "Comparte tu entrenamiento con una tarjeta diseñada para redes, con tus kilos totales y tu mapa de músculos trabajados."
- Evitar: "sincroniza con tu app de entrenamiento favorita" (no existe importación de terceros), "entrenador con IA" (no hay IA de entrenamiento en ningún punto de este dominio).

---

## 4. Nutrición

### 4.1 Plan diario

Pantalla central de nutrición ("Plan diario"): selector semanal de días, objetivo de calorías y 3 barras de macros (proteína/carbos/grasas) con progreso en tiempo real, y 4 secciones de comida — Desayuno, Comida, Cena, Snacks — cada una con su propio subtotal de calorías/macros.

Cada comida registrada muestra su foto, nombre, calorías/macros, y — si la puso el coach — una insignia "Asignado por {coach}". Se puede marcar como completada con un check (dispara feedback háptico y avisa al sistema de tutorial gamificado). Añadir comida abre un modal con dos pestañas: **"Asignadas"** (las opciones que el coach preparó específicamente para esa comida) y **"Recetario"** (buscador general con scroll infinito).

### 4.2 Comidas asignadas por el coach — cómo funciona la personalización real

Distinto del Plan diario: es el catálogo curado por el coach para ese cliente. Tiene una función que **el catálogo genérico no tiene**: al seleccionar varias opciones para un día, la app calcula en vivo si la combinación se ajusta al objetivo calórico del cliente ("Esta combinación se ajusta a tu objetivo" / "Aún te faltan X kcal" / "Te pasas X kcal"), antes de añadirlas al plan del día. Esta es la pieza más clara de "nutrición con acompañamiento real" frente a "aquí tienes una dieta en PDF".

### 4.3 Recetas

Catálogo con buscador, filtros (tipo de comida, favoritos, rango de calorías — el filtro por macros y tiempo de preparación existe en la API pero **no tiene control visible en la interfaz todavía**), navegación por categorías y por etiquetas (las etiquetas se agrupan en 8 categorías por una heurística de palabras clave en el propio cliente, no por un campo real del backend — puede fallar en casos raros, es una limitación documentada por el propio equipo). Cada receta tiene ingredientes con cantidad exacta e instrucciones numeradas, y desglose de calorías/macros por ingrediente (el dato existe a nivel de ingrediente, aunque no se confirmó que se muestre así en pantalla).

**Calidad de contenido real (a fecha de este análisis)**: de 5.276 recetas en catálogo, **ninguna tiene foto real — el 100% son imágenes de relleno**, 297 están inactivas/incompletas y 429 tienen proteína en cero. Esto es relevante para la web: no prometer "recetas con fotos profesionales" hasta que el catálogo se complete.

### 4.4 Lista de la compra

Se genera automáticamente a partir del plan de comidas de un día o de un rango de fechas (con opción de solo incluir comidas ya marcadas como completadas), agrupada por categoría de ingrediente, con checkboxes y posibilidad de añadir artículos manuales. **Está completamente construida y conectada al backend, pero a día de hoy no hay ningún botón en la navegación real de la app que lleve hasta ella** — es una funcionalidad terminada sin punto de entrada visible, algo a corregir antes de anunciarla en la web como una función usable hoy mismo.

### 4.5 Seguimiento de agua — limitación real importante

La pantalla de seguimiento de agua **es solo una interfaz — no guarda nada**. Las tres llamadas que deberían guardar el objetivo diario y cada registro de vasos bebidos están literalmente comentadas en el código (`// await waterController.saveGoal()`, etc.). El objetivo y el historial se resetean cada vez que se sale de la pantalla. **No se puede vender como "seguimiento de hidratación" en la web tal como está hoy** — o se corrige antes del lanzamiento, o no se incluye en el copy de marketing.

### 4.6 Sustitución de ingredientes

No existe ninguna función de sustitución de ingredientes en ningún punto del dominio de nutrición (ni API, ni pantalla). Si el negocio quiere ofrecerla, es una función nueva a construir, no algo ya hecho.

### 4.7 Valor frente a "entregar una dieta"

La diferencia real y verificable es doble: (1) el ajuste en vivo de calorías al combinar opciones asignadas por el coach (§4.2), y (2) que cada comida registrada queda con fecha y sello de quién la asignó, permitiendo al coach ver exactamente qué come el cliente y cuándo, no solo qué dieta le entregó en su día.

### 4.8 Cómo presentarlo en la web

Mensajes defendibles: "Tu coach te prepara opciones de comida reales para cada franja del día, y la app te dice al momento si tu combinación encaja con tu objetivo." Evitar: "controla tu hidratación" (no persiste hoy), "sustituye ingredientes al vuelo" (no existe), "miles de recetas con fotos" (0% tienen foto real hoy).

---

## 5. Hábitos

Dominio completo y sólido, sin datos simulados: toda la lógica de rachas se calcula en el servidor, no en el cliente.

### 5.1 Qué hábitos existen

Tres orígenes posibles, cada uno con su propia insignia de color: **de tu coach** (asignado directamente), **biblioteca** (catálogo del coach, el cliente los adopta), **personal** (creado libremente por el cliente con icono, nombre, objetivo numérico opcional y frecuencia diaria/semanal).

### 5.2 Cómo se muestran y se registran

En la lista de hábitos ("Mis hábitos"), cada tarjeta muestra icono, título, racha con llama 🔥, insignia de origen, y una fila de 7 círculos (L-M-X-J-V-S-D) de cumplimiento semanal. Hay dos formas de registrar un día:

- **Hábitos binarios** (sin objetivo numérico): un toque marca hecho/no hecho, al instante.
- **Hábitos con objetivo numérico** ("leer 4 libros", "10.000 pasos"): al tocar el día se abre un modal pidiendo el valor real conseguido ese día; el círculo semanal correspondiente **se rellena por el porcentaje real de cumplimiento** (2 de 4 = 50%), no solo hecho/no-hecho — funcionalidad añadida esta misma sesión de desarrollo.

### 5.3 Vista de detalle e historial

El detalle de un hábito tiene 5 rangos de tiempo (semana/mes/trimestre/semestre/año), una cuadrícula tipo calendario para semana/mes, y un mapa de calor estilo GitHub para los rangos largos. El color de cada celda representa 5 tramos de intensidad según el % de cumplimiento del objetivo ese día.

### 5.4 Rachas y estadísticas

La racha (`current_streak`) la calcula el servidor, no hay lógica de cálculo en el cliente. En la lista general se muestra también una **racha combinada** (suma de todas las rachas activas del cliente) como refuerzo motivacional.

### 5.5 Relación entre hábitos y progreso

El mismo componente visual de cumplimiento semanal (círculos) se reutiliza tanto para hábitos como para la vista de "Cumplimiento semanal" de entrenamiento en el Home — visualmente el cliente aprende un único lenguaje de "cumplí / no cumplí / cumplí en parte" para todo el sistema.

### 5.6 Por qué esta función forma parte del servicio

Los hábitos son la pieza que conecta el entrenamiento y la nutrición con el resto del día del cliente (dormir, beber agua, leer, meditar) — es el mecanismo de constancia diaria que no depende de que haya un entrenamiento programado ese día.

### 5.7 Cómo comunicarlo comercialmente

"No solo entrenamiento: construye las rutinas diarias que hacen que el resto funcione, con seguimiento real de tu racha." Evitar prometer "recomendaciones de hábitos por IA" — no existe, la biblioteca la cura el coach manualmente.

---

## 6. Seguimiento de métricas y progreso

| Métrica                                                                         | Cómo se registra                                             | Cómo se visualiza                                                                    | Utilidad                                                                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Peso, medidas corporales, % grasa (catálogo configurable por el coach, no fijo) | Formulario numérico con fecha                                | Tarjeta de último valor + delta vs. anterior + gráfico de línea                      | El coach define qué métricas sigue cada cliente, no es una lista genérica igual para todos                |
| Fotos de progreso                                                               | **No existe** en ninguna pantalla ni API de la app           | —                                                                                    | Solo está prevista como _tipo_ de pregunta dentro de check-ins, sin implementar todavía (§10)             |
| Rendimiento por ejercicio                                                       | Automático, desde las series registradas en entrenamiento    | Gráfico de evolución + mejores marcas (1RM estimado)                                 | Muestra progresión objetiva sin que el cliente tenga que anotar nada aparte                               |
| Cargas / repeticiones                                                           | Automático desde el entrenamiento                            | Estadísticas de series por grupo muscular, ejercicios más frecuentes, mejores marcas | Base de las 6 pantallas de estadísticas (§6.2)                                                            |
| Actividad / pasos                                                               | Sincronización con Health Connect (Android) o entrada manual | Tarjeta de actividad en el Home                                                      | Parcial — ver limitaciones de salud en §12.5                                                              |
| Cumplimiento de hábitos                                                         | Ver §5                                                       | Círculos semanales, calendario/heatmap                                               | —                                                                                                         |
| Constancia (adherencia al programa)                                             | Automático (% de sesiones completadas vs. programadas)       | Tarjeta "Constancia" en Progreso, con heatmap de 21 días                             | Distingue clientes con programa asignado (% real) de clientes free sin programa (solo cuenta de sesiones) |
| Evolución temporal                                                              | Todas las métricas anteriores tienen vista histórica         | Gráficos de línea / barras / radar según la pantalla                                 | —                                                                                                         |
| Objetivos                                                                       | Definidos en el onboarding y en cada hábito/métrica          | Comparación contra el valor actual en cada tarjeta                                   | —                                                                                                         |

### 6.1 Cómo ayuda al coach a tomar decisiones

Las 6 pantallas de estadísticas (§6.2) y el progreso muscular agregado le dan al coach (a través de datos que el cliente ve también) una foto objetiva de qué grupos musculares se están entrenando de más o de menos, si el volumen sube o baja mes a mes, y si hay récords personales nuevos — sin tener que pedir esa información al cliente.

### 6.2 Las 6 pantallas de estadísticas

| Pantalla                  | Qué muestra                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Series por grupo muscular | Series totales por grupo, comparadas con el periodo anterior equivalente                                                              |
| Balance muscular          | Radar comparando volumen actual vs. periodo anterior por grupo muscular, compartible como imagen                                      |
| Mapa de calor corporal    | Heatmap frontal/trasero navegable semana a semana                                                                                     |
| Ejercicios más frecuentes | Ranking por frecuencia de uso, filtrable por músculo                                                                                  |
| Mejores marcas            | Ranking de récords personales (peso + 1RM estimado) por ejercicio                                                                     |
| Resumen mensual           | KPIs del mes vs. el anterior, desglose semanal de volumen, récords batidos, cambios de volumen por músculo, lista de sesiones del mes |

### 6.3 Cómo ayuda al usuario a entender su progreso

La pantalla "Progreso" agrega en una sola vista composición corporal, constancia, y un resumen de entrenamiento (mapa muscular de los últimos 7 días + volumen/sesiones de los últimos 30) — pensada como el resumen ejecutivo de "cómo voy" sin tener que entrar en las 6 pantallas de estadísticas por separado.

### 6.4 Limitación importante a comunicar con cuidado

**No existe función de fotos de progreso (antes/después) en ningún punto de la app**, pese a que el modelo de datos de check-ins ya contempla ese tipo de pregunta — simplemente no tiene interfaz todavía. No prometer esta función en la web hasta que se construya.

---

## 7. Dashboard / pantalla principal (Home)

Al abrir la app, el cliente ve, en este orden:

1. **Cabecera fija** con foto de fondo según la hora del día (amanecer, día o noche), saludo dinámico, calendario, notificaciones y ajustes.
2. **Anillos Recovery / Strain**: Recovery es un cálculo real (aunque aproximado) a partir del chequeo diario de sueño/energía/agujetas/estrés; si no se ha rellenado hoy, el anillo mismo es el botón para rellenarlo. **Strain está permanentemente en "-%"** — es un hueco visual a la espera de que el backend exponga el cálculo real de carga de entrenamiento (ACWR), que ya existe internamente pero no se expone todavía al cliente. La propia app muestra por defecto un aviso: _"Esto son datos de demostración. Los anillos de Recovery/Strain se activarán con datos reales en cuanto conectes Apple Health o Health Connect."_
3. **Agua / Actividad**: tarjetas rápidas (agua no persiste, ver §4.5; actividad combina pasos + calorías de entrenamiento).
4. **"Reto para empezar"**: tarjeta de progreso del tutorial gamificado (§7.2).
5. **"Mi plan de hoy"** (clientes 1:1, con insignia "Personalizado por tu coach") o **"Actividad de Hoy"** (el resto): el entrenamiento/check-in pendiente de hoy.
6. **Cumplimiento semanal**: círculos de la semana de entrenamiento.
7. **Hábitos**: mini-lista con racha.
8. **Nutrición**: objetivo de calorías del día con enlace a la dieta.
9. **Explorar**: accesos a recetas y a "buscar ejercicio por músculo".
10. **Entrenamientos** (carrusel de catálogo — oculto para clientes 1:1, porque ya tienen su plan).
11. **Recursos** (asignados por el coach o generales).
12. **Blog** (últimos 3 artículos).
13. **"Sueño"**: tarjeta explícitamente vacía hoy — "Conecta tu reloj o app de salud para ver tus datos de sueño aquí."
14. **Tarjeta de soporte** ("¿Necesitas ayuda? Be Stronger AI") — abre el bot de chat, no un entrenador humano (§9).

### 7.1 Objetivo UX de esta pantalla

Es un resumen de "qué me toca hoy" más que un dashboard analítico — el detalle analítico vive en Progreso/Estadísticas (§6). El Home prioriza la acción del día (entrenar, comer, mantener hábitos) sobre la introspección de datos históricos.

### 7.2 Reto para empezar (tutorial gamificado)

Sistema real de 7 retos encadenados con condiciones de finalización basadas en acciones reales del usuario (no solo "pulsar siguiente"): acceder al entrenamiento de hoy → registrar la primera serie → añadir un hábito → marcarlo como hecho → acceder al plan de nutrición → marcar una comida → rellenar el chequeo de preparación. Se apoya en una superposición visual tipo "spotlight" que resalta el elemento real de la interfaz al que hay que tocar.

---

## 8. Perfil del usuario

| Dato/función                                                                          | Estado                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nombre, apellidos, email, teléfono                                                    | 🟢 Editable                                                                                                                                                                                 |
| Sexo, edad, peso, altura (con conversión de unidades)                                 | 🟢 Editable                                                                                                                                                                                 |
| Foto de perfil                                                                        | 🟢 Editable (subida real de archivo)                                                                                                                                                        |
| Estadísticas de perfil (entrenamientos completados, miembro desde, versión de la app) | 🟢 Implementada                                                                                                                                                                             |
| Historial de entrenamientos / Progreso / Favoritos                                    | 🟢 Accesos directos desde el perfil                                                                                                                                                         |
| Preferencias de tema (claro/oscuro/automático)                                        | 🟢 Implementada                                                                                                                                                                             |
| Idioma                                                                                | ⚪ No funcional — selector visual sin persistencia real, la app está en español en la práctica                                                                                              |
| Notificaciones                                                                        | 🟢 Un interruptor que refleja el permiso real del sistema operativo                                                                                                                         |
| Suscripción / plan de pago                                                            | 🟡 Existe un endpoint de solo lectura ("mi plan") en el backend, pero **no se encontró ninguna pantalla en la app que lo consuma** — no confirmado si hay una vista de suscripción real hoy |
| Configuración de "Dispositivos" (reloj/salud)                                         | 🟡 Lleva a una pantalla de "Próximamente" honesta — no hay integración real de wearables                                                                                                    |

---

## 9. Comunicación y acompañamiento — hallazgo importante

**No existe chat en vivo ni mensajería directa con un entrenador humano en ningún punto de la app.** Esto contradice una suposición razonable sobre un "servicio de acompañamiento" y debe corregirse en cualquier copy de venta: la palabra "chat" en el código se refiere únicamente a un bot de soporte.

### 9.1 El bot de soporte ("FitBot" / "Be Stronger AI" en el Home)

- Tiene interfaz de chat real y guarda historial en el servidor.
- **La respuesta que da siempre es la misma frase fija, no generada por IA**: _"FitBot está disponible para consultas básicas. Para asesoría personalizada, contacta a tu entrenador."_ — pese a que los nombres de los endpoints del backend contienen literalmente "chatgpt", no hay ninguna llamada real a un modelo de lenguaje en esta pantalla.
- Existe una segunda variante pensada para enviar imágenes al bot, que en el código tiene comentarios literales `TODO: Replace with actual OpenAI API call` y un mensaje de ejemplo que dice _"Esto es una respuesta de ejemplo. Falta implementar la integración con OpenAI"_ — y además **no tiene ningún botón real en la app que lleve hasta ella** hoy.
- **Recomendación de comunicación**: no vender esto como "asistente de IA" en la web hasta que sea real. Si se quiere mantener como función, presentarlo honestamente como "ayuda rápida" o "preguntas frecuentes automatizadas", nunca como sustituto de conversación con el coach.

### 9.2 Cómo se comunica realmente el cliente con su coach (todo asíncrono)

- Notas del coach visibles directamente en cada ejercicio de la sesión.
- Objetivos concretos por serie, con sugerencias de ajuste (auto-regulación) pendientes de aprobación del coach.
- Reporte de dolor con notificación automática al coach según severidad.
- Feedback de dificultad + comentario libre tras cada entrenamiento.
- Check-ins configurables por el coach, con distintos tipos de pregunta (§10).
- Solicitud de días no disponibles (requiere aprobación del coach) y reorganización de la semana (se aplica directamente).
- Chequeo diario de preparación, pensado explícitamente para "ayudar a tu coach a ajustar tu entrenamiento a cómo te sientes de verdad".

### 9.3 Cómo comunicar esto en la web sin sobreprometer

Mensaje honesto y fuerte: "Tu coach ve tu esfuerzo real, tus molestias y cómo llegas cada día — sin que tengas que escribirle." Evitar cualquier frase que sugiera chat en vivo, videollamadas o respuesta inmediata de un humano — ninguna de esas 3 cosas existe en la app hoy.

---

## 10. Recursos y contenido educativo

| Tipo de contenido                              | Estado                                                                                                      | Detalle                                                                                                                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blog                                           | 🟢 Implementada, contenido real                                                                             | 15 artículos reales sembrados en producción, 3 categorías (Entrenamiento/Nutrición/Hábitos), con bibliografía de fuentes reales de ciencia del deporte/nutrición (NSCA, ACSM, ISSN) |
| Vídeos                                         | ⚪ No implementada                                                                                          | Sin backend construido, pantalla siempre vacía, sin punto de entrada real desde la app                                                                                              |
| Recursos (artículos/vídeos/enlaces/documentos) | 🟢 Implementada                                                                                             | El coach puede asignarlos a un cliente concreto o compartirlos con todos; imágenes todavía de relleno (falta un campo del backend)                                                  |
| Guías/tutoriales sueltos ("Tips")              | ⚪ Código muerto                                                                                            | Pantalla huérfana, sin llamada real desde ningún otro punto de la app                                                                                                               |
| Movilidad / técnica                            | Cubierto dentro de la ficha de cada ejercicio (pestañas Instrucciones/Equipamiento), no como sección aparte | —                                                                                                                                                                                   |

### 10.1 Cómo complementan el servicio

El blog aporta contexto educativo real (con fuentes citadas) sobre por qué el plan está diseñado así, sin depender de que el coach escriba algo nuevo para cada cliente; los recursos asignables permiten personalizar qué material educativo recibe cada cliente además de su plan.

### 10.2 Muestra real de títulos de blog (verificados en el contenido sembrado)

- "Fuerza para principiantes: por dónde empezar sin perderte"
- "Sentadilla y peso muerto: la técnica que marca la diferencia"
- "Periodización: cómo organizar tus meses de entrenamiento"
- "Proteína y síntesis muscular: cuánta necesitas realmente"
- "Déficit calórico sin perder músculo: la guía práctica"
- "Consistencia sobre intensidad: la regla que cambia resultados"
- "Sueño y recuperación: el entrenamiento que haces mientras duermes"

---

## 11. Flujo completo del cliente

| Fase               | Qué hace el cliente                                             | Qué hace el coach                                               | Qué ocurre en la app                                                              | Qué valor percibe                                                |
| ------------------ | --------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Visita la web      | Investiga el servicio                                           | —                                                               | (fuera de la app)                                                                 | Entiende qué recibirá                                            |
| Se registra        | Nombre, email, contraseña, código de invitación opcional        | Puede haber generado el código de invitación de antemano        | Cuenta creada; si el código es válido, queda marcado como cliente 1:1             | Entrada simple, sin fricción                                     |
| Onboarding         | Responde 37 preguntas en 4 etapas                               | — (los datos de 3 de las 4 etapas no llegan al backend todavía) | Se calcula un plan de calorías/macros de partida a partir de los datos personales | Recibe un primer plan personalizado de inmediato                 |
| Evaluación inicial | Ve su resultado de BMR/TDEE                                     | —                                                               | Pantalla de resultado con "Confirmar mi plan"                                     | Sensación de personalización desde el primer minuto              |
| Planificación      | —                                                               | Diseña/asigna el plan de entrenamiento y las opciones de comida | El plan aparece en el Home como "Mi plan de hoy"                                  | El plan se siente hecho a medida, no genérico                    |
| Entrenamiento      | Sigue la sesión, registra series, reporta dolor si lo hay       | Revisa el historial y ajusta sugerencias de carga               | Registro en vivo, Live Activity, feedback post-sesión                             | Sensación de seguimiento real, no solo "cumplir una tabla"       |
| Nutrición          | Registra sus comidas, elige entre opciones asignadas            | Prepara opciones de comida por franja                           | Ajuste en vivo de si la combinación encaja con el objetivo                        | Sensación de control sin tener que hacer cálculos                |
| Hábitos            | Marca hábitos diarios, ve su racha                              | Puede asignar hábitos o curar la biblioteca                     | Círculos de cumplimiento, rachas                                                  | Motivación por constancia visible                                |
| Seguimiento        | Rellena el chequeo diario, ve sus estadísticas                  | Revisa Recovery, dolor reportado, cumplimiento                  | Datos agregados en Progreso/Estadísticas                                          | Entiende su propia evolución con datos, no solo sensaciones      |
| Revisión           | Responde check-ins periódicos si el coach los configuró         | Revisa las respuestas                                           | Formularios con distintos tipos de pregunta                                       | Se siente escuchado en un formato estructurado                   |
| Ajustes            | Puede pedir reorganizar su semana o marcar un día no disponible | Aprueba o ajusta el plan según lo anterior                      | Calendario con solicitudes y reordenación                                         | El plan se adapta a su vida real, no al revés                    |
| Progreso           | Ve su evolución agregada                                        | Usa las mismas estadísticas para decidir el siguiente bloque    | Progreso, estadísticas, mejores marcas                                            | Percibe resultados objetivos, no solo "esfuerzo"                 |
| Renovación         | Paga en la web externa del servicio (`bestronger.es`)           | Confirma el acceso vía admin/webhook                            | El acceso se refleja automáticamente en la app                                    | Proceso de pago fuera de la app, sin fricción de tiendas de apps |

---

## 12. Onboarding

### 12.1 Flujo real (el único alcanzable hoy)

1. **Registro simple**: nombre completo, email, contraseña (mínimo 8 caracteres), confirmación de contraseña, código de invitación opcional (validado en vivo mientras se escribe). Un código válido marca automáticamente al usuario como cliente 1:1; uno inválido bloquea el registro entero.
2. **Onboarding v2** (37 preguntas en 4 etapas, en una sola pantalla con progreso guardado localmente por si se cierra la app a medias):
   - **Etapa 1 — Datos personales** (5 preguntas: nombre, sexo, edad, altura, peso) — **la única etapa con backend real hoy**, reutiliza el endpoint de actualizar perfil ya existente.
   - **Etapa 2 — PAR-Q** (10 preguntas: enfermedad cardiaca, dolor en el pecho con/sin actividad, mareos/desmayos, problemas óseos/articulares, medicación de tensión/corazón, razones para no hacer ejercicio, nivel de forma física 1-10, historial médico libre, objetivos libres) — **backend pendiente**: la app envía los datos, pero el endpoint no existe todavía, así que hoy se pierden (solo quedan en el dispositivo).
   - **Etapa 3 — Cuestionario de entrenamiento** (12 preguntas: tipo de objetivo — perder grasa/ganar músculo/recomposición/mantener —, nivel de actividad, tipo de estilo de vida, años de experiencia, días de entrenamiento por semana, duración de sesión preferida, mentalidad al entrenar, coaching previo, estilo de rutina actual, preferencia de split semanal, nivel de técnica 1-10, objetivo realista libre) — **backend pendiente**, mismo caso que PAR-Q.
   - **Etapa 4 — Cuestionario de nutrición** (10 preguntas: alergias/intolerancias, alimentos que no gustan/sí gustan, comidas actuales/deseadas al día, cómo es un día típico de comidas, carnes/pescados/frutas-verduras/platos combinados favoritos) — **backend pendiente**, mismo caso.
3. **Resultado**: cálculo de metabolismo basal y gasto calórico total a partir de los datos de la etapa 1, con un primer plan de calorías/macros, y botón "Confirmar mi plan" que marca el onboarding como completado.

### 12.2 Cómo se usan estos datos hoy para personalizar

**Solo los datos de la Etapa 1** (edad/altura/peso/sexo) se usan realmente hoy, para calcular el plan calórico inicial. Las respuestas de PAR-Q, entrenamiento y nutrición **se capturan pero no llegan a ningún sitio útil todavía** — no se envían al coach, no personalizan nada automáticamente — porque los 3 endpoints de backend correspondientes no existen aún. Esto es importante para no prometer en la web "tu plan se ajusta automáticamente a tus 37 respuestas" — hoy no es así.

### 12.3 Lesiones o limitaciones físicas

Las preguntas de PAR-Q sí capturan riesgos médicos (dolor en el pecho, problemas óseos/articulares, medicación), pero al no llegar al backend, **no hay hoy ningún mecanismo real que alerte al coach de un riesgo antes de asignar un plan** — es una decisión de producto pendiente, documentada como tal en el propio proyecto.

### 12.4 Marcado de "onboarding completado" — limitación real

Se guarda primero de forma local en el dispositivo; solo se sincroniza con el servidor si el backend lo soporta, lo cual **no ocurre todavía**. Consecuencia real y verificada: **si un cliente reinstala la app o entra desde otro dispositivo, vuelve a ver todo el onboarding desde cero**, porque no hay ningún registro de finalización en el servidor.

### 12.5 Conexión de salud/wearables — estado real, con matices

- El sistema de lectura de pasos/frecuencia cardiaca/sueño/HRV está construido y, en **Android con Health Connect, sí envía datos reales al servidor** en segundo plano una vez al día.
- En **iOS está deliberadamente desactivado** hasta que el proyecto tenga una cuenta de pago de Apple Developer (necesaria para el permiso de HealthKit).
- La pantalla dedicada a "conectar tu dispositivo" **existe pero no tiene ningún botón en la navegación real que lleve hasta ella** — hoy es inalcanzable para un usuario normal.
- El emparejamith con relojes/pulseras (Garmin, Fitbit, Apple Watch, Galaxy Watch) es **una simulación visual** (una animación de 3 segundos con temporizador fijo) sin Bluetooth real ni backend — no funciona de verdad.
- **No prometer en la web** "conecta tu Garmin/Fitbit/Apple Watch" hasta que esto se construya de verdad.

---

## 13. Personalización — qué es real y qué no

| Elemento                                | ¿Genérico o personalizado?                                                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan de entrenamiento de un cliente 1:1 | **Personalizado real** — diseñado/asignado por su coach, día a día                                                                             |
| Catálogo de "Workouts sueltos"          | Genérico, mismo catálogo para todos (salvo contenido exclusivo, hoy sin ningún workout marcado como tal en producción)                         |
| Objetivo calórico/macros inicial        | Calculado automáticamente a partir de edad/peso/altura/sexo (fórmula estándar), no una decisión manual del coach en el primer momento          |
| Comidas asignadas                       | **Personalizado real** — las prepara el coach específicamente, con ajuste en vivo al objetivo del cliente                                      |
| Sugerencias de carga de entrenamiento   | Calculadas automáticamente por el motor de auto-regulación, **pero pendientes de aprobación del coach** antes de considerarse el objetivo real |
| Hábitos de biblioteca                   | Curados por el coach para todos sus clientes, no individuales por defecto (a menos que asigne uno específico)                                  |
| Recursos educativos                     | Pueden ser asignados individualmente o compartidos con todos                                                                                   |
| Ajuste ante dolor reportado             | Depende de que el coach revise el reporte — la app decide automáticamente si notificarlo, pero no reajusta el plan sola                        |

**Mensaje clave para la web**: la diferencia real entre "tener acceso a una app" y "tener un entrenador que usa una app" está en el entrenamiento asignado, las comidas curadas, y la revisión humana de dolor/rendimiento — no en que todo el contenido de la app sea único para cada cliente (el catálogo general de recetas y de workouts sueltos es compartido).

---

## 14. Progresión y adaptación

- **Motor de auto-regulación de carga**: calcula sugerencias de peso/repeticiones para la próxima sesión de un ejercicio basándose en el rendimiento pasado real (series completadas, RIR/RPE registrado). Se muestra en la sesión de entrenamiento como "Sugerido: X", distinto del "Obj: X" que puso el coach, hasta que el coach la aprueba.
- **Detección de problemas**: el sistema de reporte de dolor decide automáticamente si notificar al coach según la combinación de tipo/intensidad/momento del dolor.
- **Revisión de objetivos**: ocurre a través de los check-ins periódicos configurables (§10) y de las estadísticas que el coach también puede ver.
- **Modificación de entrenamientos por el coach**: sí es posible — se refleja como "Sesión ajustada por tu entrenador" cuando el motor de semanas adaptativas oculta o cambia un día.
- **Modificación de nutrición**: el coach ajusta las comidas asignadas; no se encontró un mecanismo de "ajuste automático de macros" basado en el progreso (por ejemplo, bajar calorías automáticamente si el peso no baja) — sería una función nueva, no existente hoy.

---

## 15. Servicio de entrenamiento online — perspectiva comercial

**¿Qué recibe el cliente?** Un plan de entrenamiento (asignado por su coach si es 1:1, o un catálogo si es de acceso general) que registra en vivo, serie a serie, con objetivo de carga/reps/intensidad definido por su coach.

**¿Cómo funciona?** Abre la app, ve su entrenamiento del día, lo sigue celda a celda, y cada serie se guarda al momento — no hace falta recordar nada al final.

**¿Cómo se personaliza?** El plan lo diseña un coach real para clientes 1:1; el sistema de auto-regulación propone ajustes de carga basados en el rendimiento, pero un humano los aprueba antes de que se conviertan en el objetivo oficial.

**¿Cómo se realiza el seguimiento?** Historial completo de sesiones, estadísticas de series por músculo, mejores marcas, resumen mensual — todo calculado automáticamente desde lo que el cliente registra, sin que tenga que rellenar un informe aparte.

**¿Cómo se adapta el entrenamiento?** El coach puede modificar el día directamente; el cliente puede pedir mover su semana (reorganización directa) o avisar de un día que no puede entrenar (con aprobación del coach).

**¿Qué soporte recibe?** Notas del coach visibles en cada ejercicio, reporte de dolor con notificación automática según gravedad, chequeo diario de preparación pensado explícitamente para que el coach entienda cómo llega el cliente cada día. **No hay chat en vivo con el coach** — toda la comunicación es asíncrona a través de estos mecanismos.

**¿Qué ocurre si no puede realizar un entrenamiento?** Puede marcar el día como no disponible (pendiente de aprobación del coach) o reorganizar su semana arrastrando el entrenamiento a otro día (se aplica al instante).

**¿Cómo se mide el progreso?** Con datos objetivos automáticos: volumen levantado, récords personales, series por grupo muscular, cumplimiento del programa — no autoevaluaciones subjetivas.

**¿Qué ventajas tiene frente a entrenar por su cuenta?** El objetivo de cada serie lo define un coach (no una tabla fija de progresión genérica), y el sistema avisa automáticamente ante señales de dolor o de rendimiento estancado que un cliente entrenando solo podría pasar por alto.

---

## 16. Servicio de nutrición online — perspectiva comercial

**¿Qué recibe el cliente?** Un objetivo diario de calorías y macros, con comidas concretas preparadas por su coach para cada franja del día, y un catálogo general de recetas para completar el resto.

**¿Cómo se personaliza?** Las opciones de comida las prepara el coach específicamente para ese cliente; al combinarlas, la app calcula en vivo si encajan con su objetivo calórico antes de guardarlas.

**¿Cómo se adapta?** El coach puede cambiar las comidas asignadas en cualquier momento; el cliente elige libremente entre lo asignado y el catálogo general según lo que le apetezca comer.

**¿Cómo se realiza el seguimiento?** Registro diario de qué se come y cuándo, con macros/calorías acumuladas visibles en tiempo real durante el día.

**¿Cómo se trabaja la adherencia?** El feedback visual inmediato del ajuste al objetivo (§4.2) está pensado para que el cliente entienda de forma simple si va bien encaminado sin tener que hacer cálculos, lo cual reduce la fricción de seguir el plan.

**¿Cómo se incorporan preferencias alimentarias?** El onboarding pregunta por alergias, intolerancias y alimentos que gustan/no gustan — **hoy esa información no llega al backend** (limitación pendiente, ver §12.2), así que actualmente esta personalización depende de que el coach la recoja por otro medio, no de que la app se la entregue automáticamente.

**¿Cómo se controla el progreso?** A través del cumplimiento diario del plan y — de forma indirecta — de las métricas corporales que el cliente registre (peso, medidas) en la sección de progreso.

**¿Cómo se realizan ajustes?** Manualmente por el coach, cambiando las comidas asignadas o el objetivo calórico; no existe un ajuste automático basado en la evolución del peso.

**Diferencia real frente a una dieta estática**: la dieta no cambia sola, pero el cliente ve en vivo si lo que está a punto de comer encaja con su objetivo, y el coach puede actualizar las opciones asignadas cuando quiera sin tener que reenviar un documento nuevo.

---

## 17. Propuesta de valor

### Principales beneficios (respaldados por funcionalidad real)

- Seguimiento de entrenamiento en tiempo real, no reconstruido de memoria.
- Auto-regulación de carga basada en rendimiento real, con supervisión humana.
- Comidas asignadas por el coach con verificación en vivo del ajuste calórico.
- Sistema de hábitos con rachas y objetivos numéricos reales.
- Estadísticas de entrenamiento automáticas y completas (6 informes distintos).
- Reporte de dolor con notificación automática al coach según gravedad.
- Reorganización real de la semana de entrenamiento sin perder el plan.

### Principales problemas que resuelve

- Que el coach no sepa realmente qué hizo el cliente hasta la próxima cita.
- Que una dieta en PDF no diga si lo que se va a comer hoy encaja con el objetivo.
- Que un cliente entrenando solo no note señales de dolor o estancamiento a tiempo.
- Que los hábitos diarios (fuera del gimnasio) no tengan ningún sistema de seguimiento.

### Principales objeciones de un potencial cliente y cómo responderlas con honestidad

- _"¿Voy a poder hablar con mi coach cuando quiera?"_ → No hay chat en vivo; la comunicación es a través de notas, reportes de dolor y feedback estructurado. Hay que ser claro con esto para no generar expectativas falsas.
- _"¿La app conecta con mi reloj?"_ → Hoy, solo parcialmente y solo en Android; en iOS está pendiente de una cuenta de pago de Apple. No prometer una integración completa todavía.
- _"¿Puedo pagar desde la app?"_ → No; el pago se hace en la web externa del servicio, la app solo refleja el acceso ya activo.

### Diferenciadores reales

- Auto-regulación de carga con aprobación humana (no una tabla de progresión fija ni una IA sin supervisión).
- Sistema de dolor con notificación automática graduada por severidad.
- Reorganización de semana con aplicación inmediata (no un simple "avisar y esperar").

### Elementos que generan confianza

- Datos objetivos (series, cargas, cumplimiento) en vez de autoevaluación subjetiva.
- Transparencia del propio sistema al mostrar "esto son datos de demostración" cuando corresponde, en vez de simular datos falsos sin avisar.

### Elementos que justifican el precio

- El acompañamiento humano (coach real revisando datos, ajustando planes, aprobando sugerencias) es lo que distingue el servicio de una app de rutinas de pago único.

---

## 18. Estructura propuesta para la página web

1. **Hero** — promesa central + CTA.
2. **El problema** — entrenar/comer "a ciegas" sin seguimiento real.
3. **La solución** — app + coach real, entrenamiento y nutrición conectados.
4. **Cómo funciona** — 3-4 pasos (regístrate → cuestionario inicial → tu coach diseña tu plan → sigue tu progreso día a día).
5. **Entrenamiento** — el flujo de sesión, auto-regulación, estadísticas.
6. **Nutrición** — plan diario, comidas asignadas con ajuste en vivo.
7. **Hábitos** — rachas, objetivos numéricos.
8. **Seguimiento y progreso** — estadísticas, métricas, chequeo diario.
9. **Acompañamiento de tu coach** — cómo se comunican de verdad (honesto sobre que no es chat en vivo).
10. **La app** — capturas reales, disponibilidad iOS/Android.
11. **Para quién es** — clientes 1:1, clientes con paquete.
12. **Para quién no es** — quien busca chat en vivo 24/7 con su coach, o integración completa con wearables hoy mismo.
13. **Preguntas frecuentes** (§21).
14. **Precios / planes** — dado que el cobro es externo (`bestronger.es`), esta sección puede ser la propia pasarela de venta.
15. **CTA final**.
16. **Footer** (legal, contacto).

No es obligatorio seguir este orden exacto — es una propuesta razonable dado lo que la app realmente ofrece; se puede fusionar 5+6+7+8 en una única sección larga de "cómo funciona por dentro" si se prefiere una web más corta.

---

## 19. Contenido por sección de la web

| Sección               | Objetivo                                | Mensaje principal                                                           | Funcionalidad de la app que lo respalda                | CTA                                    |
| --------------------- | --------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------- |
| Hero                  | Captar interés en 3 segundos            | "Entrena y come con un plan real, hecho para ti, con seguimiento de verdad" | Plan personalizado + registro en vivo                  | "Empieza ahora" / "Habla con nosotros" |
| Problema              | Generar identificación                  | "Entrenar sin seguimiento real es entrenar a ciegas"                        | —                                                      | Scroll hacia solución                  |
| Solución              | Presentar el modelo                     | "Un coach real + una app que registra todo por ti"                          | Todo el conjunto                                       | —                                      |
| Cómo funciona         | Reducir fricción de entender el proceso | Pasos simples y concretos                                                   | Onboarding, asignación de plan                         | "Ver cómo es por dentro"               |
| Entrenamiento         | Demostrar profundidad técnica           | "Cada serie cuenta, literalmente"                                           | Sesión de entrenamiento, auto-regulación, estadísticas | Captura de la sesión de entrenamiento  |
| Nutrición             | Diferenciarse de una dieta estática     | "Sabrás al momento si lo que vas a comer encaja con tu objetivo"            | Plan diario + comidas asignadas                        | Captura del plan diario                |
| Hábitos               | Mostrar que va más allá del gimnasio    | "La constancia también se puede medir"                                      | Lista de hábitos + racha                               | Captura de hábitos                     |
| Seguimiento           | Reforzar la seriedad del sistema        | "Tu progreso, con datos, no con sensaciones"                                | Progreso + Estadísticas                                | Captura de estadísticas                |
| Acompañamiento        | Gestionar expectativas con honestidad   | "Tu coach ve tu esfuerzo real sin que tengas que contárselo"                | Notas del coach, reporte de dolor, feedback            | —                                      |
| La app                | Mostrar producción real                 | Capturas reales de pantallas                                                | Home, sesión, plan diario                              | Enlaces a App Store/Google Play        |
| Para quién es / no es | Filtrar leads                           | Honestidad sobre lo que sí y no ofrece hoy                                  | —                                                      | —                                      |
| FAQ                   | Resolver objeciones                     | Ver §21                                                                     | —                                                      | —                                      |
| Precios               | Convertir                               | Depende del modelo comercial definido externamente                          | Checkout en `bestronger.es`                            | "Ver planes"                           |

**Elementos visuales por sección**: capturas reales de la app (nunca mockups genéricos de stock, dado que la propia app ya tiene una identidad visual consistente — colores de marca, iconografía, tipografía Gilroy) para el Home, la sesión de entrenamiento, el plan diario, la lista de hábitos, y al menos una pantalla de estadísticas.

---

## 20. Copy y mensajes clave

- **Mensaje principal**: "Entrenamiento y nutrición online con un coach real detrás — no una app que rellenas sola."
- **Submensaje**: "Cada serie, cada comida y cada hábito quedan registrados al momento, para que tu coach vea tu progreso real."
- **Beneficios principales**: seguimiento en vivo, ajuste automático de carga con aprobación humana, comidas verificadas contra tu objetivo, hábitos con racha real.
- **Diferenciadores**: auto-regulación de carga supervisada, sistema de reporte de dolor con notificación automática, reorganización de semana sin perder el plan.
- **Frases clave**: "Registra cada serie, no la recuerdes al final del día." / "Tu plan de comidas te dice si encaja antes de que lo comas." / "Tu constancia, medida de verdad, no solo sentida."
- **Objeciones a responder**: comunicación con el coach (asíncrona, no chat en vivo — ver §9.3), integración con wearables (parcial, honesta), pago (externo, sin fricción de tiendas de apps).
- **CTAs**: "Empieza tu plan", "Habla con un coach", "Ver cómo funciona por dentro".
- **Mensajes por dominio**: ver los cierres de §15, §16, §5.7, §6, §9.3.

---

## 21. FAQ

**¿Cómo funciona el servicio?** Te registras, respondes un cuestionario inicial, y accedes a tu plan de entrenamiento y nutrición dentro de la app, donde registras tu progreso día a día.

**¿El entrenamiento se ajusta automáticamente?** El sistema calcula sugerencias de carga/repeticiones según tu rendimiento pasado, pero siempre quedan pendientes de que tu coach las apruebe — no cambia tu plan sin supervisión.

**¿Puedo hablar con mi coach en cualquier momento?** No hay chat en vivo dentro de la app. La comunicación funciona a través de notas en cada ejercicio, reportes de dolor, feedback tras cada entrenamiento y check-ins configurables por tu coach.

**¿Qué pasa si tengo dolor entrenando?** Puedes reportarlo al momento desde la propia sesión, indicando tipo, zona e intensidad; según la gravedad, tu coach recibe una notificación automática.

**¿Y si no puedo entrenar un día concreto?** Puedes reorganizar tu semana arrastrando el entrenamiento a otro día (se aplica al instante), o marcar el día como no disponible para que tu coach lo revise.

**¿Cómo funciona la nutrición?** Tu coach prepara opciones de comida para cada franja del día; al elegir tus comidas, la app te dice al momento si encajan con tu objetivo calórico.

**¿Puedo seguir una dieta con mis propias preferencias/alergias?** El onboarding las pregunta, pero hoy esa información no llega automáticamente a tu coach dentro del sistema — coméntaselo también por otro medio si es relevante.

**¿La app funciona con mi reloj o pulsera?** En Android, parcialmente sí (a través de Health Connect). En iOS todavía no está disponible. La conexión con relojes específicos (Garmin, Fitbit, etc.) no está operativa todavía.

**¿Cuánto tiempo necesito al día?** No confirmado en este documento — depende del plan que te diseñe tu coach; la app no impone una duración fija.

**¿Qué material necesito?** No confirmado — depende de tu plan asignado; los ejercicios del catálogo indican el equipamiento necesario en su ficha.

**¿Cómo veo mi progreso?** En la sección de Progreso y en 6 pantallas de estadísticas detalladas: series por músculo, balance muscular, mapa de calor corporal, ejercicios más frecuentes, mejores marcas y resumen mensual.

**¿Cómo se paga el servicio?** El pago se realiza en la web, no dentro de la app (por políticas de Apple/Google); una vez confirmado, tu acceso se activa automáticamente.

**¿Puedo cancelar cuándo quiera?** No confirmado en este documento — depende de las condiciones comerciales externas al código de la app.

**¿La app tiene una comunidad?** Sí, puedes publicar, dar like, comentar y guardar publicaciones de otros usuarios de la app.

**¿Hay un chatbot de IA?** Hay un asistente de soporte básico, pero hoy da respuestas fijas, no generadas por inteligencia artificial — para asesoría real, la vía es tu coach.

---

## 22. Screenshots y elementos visuales

| Pantalla a mostrar                                | Qué destacar                                     | Mensaje que transmite                     | Sección de la web           |
| ------------------------------------------------- | ------------------------------------------------ | ----------------------------------------- | --------------------------- |
| Home                                              | Plan de hoy, cumplimiento semanal, hábitos       | Todo en un vistazo                        | Hero / "Cómo funciona"      |
| Vista previa de entrenamiento                     | Notas del coach, última vez, series prescritas   | Personalización real                      | Entrenamiento               |
| Sesión de entrenamiento (celdas de series)        | RIR/RPE, objetivo del coach, sugerencia de carga | Seguimiento serie a serie                 | Entrenamiento               |
| Ficha de ejercicio (pestaña Análisis)             | Gráfico de evolución                             | Progreso objetivo                         | Entrenamiento / Seguimiento |
| Plan diario de nutrición                          | Macros con barra de progreso, comidas asignadas  | Nutrición con acompañamiento              | Nutrición                   |
| Añadir comida (ajuste en vivo al objetivo)        | Feedback de "te faltan X kcal"                   | Nutrición inteligente, no una dieta plana | Nutrición                   |
| Lista de hábitos                                  | Racha, círculos semanales                        | Constancia medible                        | Hábitos                     |
| Detalle de hábito (calendario/heatmap)            | Colores por % de cumplimiento                    | Seguimiento fino                          | Hábitos                     |
| Progreso (resumen agregado)                       | Composición, constancia, mapa muscular           | Resultados con datos                      | Seguimiento                 |
| Estadísticas (balance muscular / resumen mensual) | Comparación con el periodo anterior              | Rigor analítico                           | Seguimiento                 |
| Calendario de programa                            | Semana con entrenamientos, reorganización        | Flexibilidad real                         | Cómo funciona               |
| Comunidad                                         | Feed de publicaciones                            | Comunidad activa de usuarios              | La app                      |
| Perfil                                            | Estadísticas personales                          | Progreso a lo largo del tiempo            | La app                      |

No usar (no reflejan una función real y estable hoy): seguimiento de agua, chat "de IA", pantalla de conexión de wearables, videos.

---

## 23. Funcionalidades: core vs. secundarias vs. internas

### ⭐ Core (deben aparecer sí o sí en la web)

- Sesión de entrenamiento con registro en vivo (serie a serie, RIR/RPE, auto-regulación).
- Plan diario de nutrición con comidas asignadas por el coach y ajuste en vivo al objetivo.
- Sistema de hábitos con rachas y objetivos numéricos.
- Estadísticas y progreso (las 6 pantallas + resumen agregado).
- Onboarding inicial (cuestionario + plan calculado).
- Reorganización de semana / solicitud de día no disponible.

_Motivo_: son las funciones más completas, sin limitaciones ocultas, y las que sostienen la promesa central de "acompañamiento real con datos objetivos".

### 🟡 Secundarias (aportan valor, sin necesitar protagonismo)

- Comunidad social (posts, likes, comentarios).
- Blog educativo.
- Recursos asignables.
- Live Activity en iOS.
- Resumen de entrenamiento compartible en redes.
- Chequeo diario de preparación / Recovery.

_Motivo_: refuerzan el producto pero no son el motivo principal de compra; pueden mencionarse en una sección secundaria o en "La app".

### ⚪ Internas (útiles en la app, no hace falta comunicarlas comercialmente)

- Diagnóstico/exportación de registros.
- Screen Explorer (herramienta de desarrollo).
- Modo claro/oscuro/automático.
- Selector de idioma (además, no funcional hoy).

_Motivo_: son utilidades de producto o herramientas internas, sin valor de venta directo.

### Casos a NO comunicar todavía (limitaciones reales, no clasificación de prioridad)

- Seguimiento de agua (no persiste datos).
- Chat "de IA" (respuesta fija, no es IA real).
- Conexión con wearables/relojes (parcial o simulada).
- Fotos de progreso (no existen).
- Importación desde Hevy/Strong (no existe).
- Chat en vivo con el coach (no existe).

---

## 24. Posibles mejoras

Separado estrictamente entre lo que existe y lo que es una recomendación — nada de esta sección debe presentarse como funcionalidad actual.

**FUNCIONALIDAD EXISTENTE con margen de mejora antes de comunicarla en la web:**

- El seguimiento de agua necesita conectarse de verdad al backend antes de anunciarse.
- La lista de la compra necesita un botón/enlace real desde el Plan diario u otra pantalla visible.
- El bot de soporte necesita, como mínimo, un mensaje más honesto sobre sus límites reales (hoy no queda claro para el usuario que la respuesta es siempre la misma).
- Las páginas "Acerca de nosotros", "Política de privacidad" y "Términos y condiciones" tienen contenido de plantilla sin terminar (marca "MightyFitness", textos `TODO`, datos de contacto de ejemplo) — deben reescribirse con contenido real antes de cualquier lanzamiento público, no solo de la web.

**RECOMENDACIÓN / IDEA FUTURA (no existe hoy, no prometer en la web hasta construirse):**

- 🔵 Fotos de progreso (antes/después) — el modelo de datos de check-ins ya lo contempla como tipo de pregunta, falta el renderer.
- 🔵 Exposición del cálculo real de "Strain" (ACWR) al cliente — el backend ya lo calcula internamente.
- 🔵 Sincronización real de PAR-Q/cuestionario de entrenamiento/nutrición con el backend, para que esas respuestas lleguen de verdad al coach.
- 🔵 Sincronización de "onboarding completado" en el servidor, para que no se repita al reinstalar o cambiar de dispositivo.
- 🔵 Un mecanismo real de conversación asíncrona con el coach (aunque no sea chat en vivo, algo más estructurado que notas sueltas podría reforzar la percepción de acompañamiento).
- 🔵 Integración real y probada de wearables (hoy la Bluetooth es una simulación).
- 🔵 Sustitución de ingredientes en recetas.
- 🔵 Fotos reales en el catálogo de recetas (hoy 0% las tiene).

---

## 25. Resumen ejecutivo

**Qué es el producto**: una app móvil (iOS/Android) de entrenamiento y nutrición online, respaldada por un coach real que diseña y ajusta los planes desde un panel de administración separado.

**Qué hace la app**: registra en vivo cada serie de entrenamiento (con reps/carga/RIR-RPE/descanso), gestiona un plan diario de nutrición con comidas asignadas por el coach, hace seguimiento de hábitos diarios con rachas, y agrega todo eso en estadísticas y un panel de progreso — todo verificado directamente en el código, sin datos inventados.

**Qué recibe el cliente**: un plan personalizado (si es cliente 1:1) o acceso a un catálogo general (si es free/suscriptor), un sistema de registro que no depende de su memoria, y varios canales asíncronos de comunicación con su coach (notas, reportes de dolor, feedback, check-ins) — **sin chat en vivo**.

**Cómo funciona el servicio**: registro simple → cuestionario inicial de 37 preguntas (solo la parte de datos personales personaliza algo hoy; el resto está pendiente de backend) → plan calculado automáticamente → uso diario de entrenamiento/nutrición/hábitos → seguimiento agregado en Progreso y Estadísticas → ajustes por parte del coach.

**Funcionalidades principales**: sesión de entrenamiento con auto-regulación de carga supervisada, plan diario de nutrición con verificación en vivo del ajuste calórico, sistema de hábitos con objetivos numéricos, 6 pantallas de estadísticas de entrenamiento, chequeo diario de preparación, calendario con reorganización de semana, comunidad social, blog educativo real.

**Principales beneficios**: datos objetivos en vez de sensaciones, ajuste de carga con supervisión humana, verificación en vivo de si una comida encaja con el objetivo, constancia medible con rachas reales.

**Qué debe transmitir la web**: que hay un coach real detrás de cada plan, que el seguimiento es objetivo y automático (no depende de que el cliente rellene informes), y que la comunicación con el coach existe de verdad aunque no sea un chat en vivo — hay que ser explícito en esto último para no generar una expectativa que la app no cumple.

**Mensajes principales**: "Entrena y come con un plan real, hecho para ti, con seguimiento de verdad" / "Cada serie, cada comida y cada hábito quedan registrados al momento, para que tu coach vea tu progreso real."

**Qué elementos de la app mostrar**: Home, sesión de entrenamiento (con RIR/RPE y objetivo del coach), plan diario de nutrición con el ajuste en vivo al objetivo, lista de hábitos con racha, y al menos una pantalla de estadísticas (balance muscular o resumen mensual) — todas capturas reales de la app, no mockups genéricos.

**Lo más importante a NO prometer todavía**: chat en vivo con el coach, asistente de IA real, seguimiento de agua persistente, integración completa con wearables, fotos de progreso, importación desde otras apps de entrenamiento. Todo esto puede convertirse en verdad más adelante, pero hoy no lo es — y prometerlo generaría una expectativa que la app, tal como está, no cumple.
