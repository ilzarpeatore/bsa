# AUDITORÍA COMPLETA DE UI/UX — APP REACT NATIVE + EXPO

> Brief original del encargo (convertido a Markdown). El resultado de ejecutar este encargo está en `docs/AUDITORIA_UIUX_2026-08-24.md`.

Quiero que hagas una **auditoría profunda y profesional de la UI/UX de nuestra aplicación**, desarrollada con **React Native + Expo**.

No quiero una revisión superficial ni únicamente una propuesta de paleta de colores. Quiero que analices la aplicación como lo haría un **Senior Product Designer + UI/UX Designer especializado en aplicaciones móviles**, teniendo en cuenta tanto la experiencia visual como la consistencia del sistema de diseño y, cuando sea relevante, su implementación en React Native/Expo.

## 1. OBJETIVO

El objetivo es conseguir que la aplicación tenga una interfaz:

- Moderna
- Premium
- Profesional
- Visualmente coherente
- Fácil de utilizar
- Intuitiva
- Consistente entre pantallas
- Accesible
- Escalable para futuras funcionalidades
- Comparable visualmente con aplicaciones móviles de alto nivel

No cambies elementos simplemente porque "te gustan más". Cada recomendación debe estar justificada desde criterios de **UX, UI, jerarquía visual, usabilidad, accesibilidad o consistencia del sistema de diseño**.

---

# 2. AUDITORÍA VISUAL COMPLETA

## COLOR

Revisa:

- Color primario
- Colores secundarios
- Backgrounds
- Superficies/cards
- Colores de texto
- Colores secundarios de texto
- Bordes
- Divisores
- Estados activos/inactivos
- Success
- Warning
- Error
- Info
- Colores utilizados en botones
- Contraste entre elementos
- Uso excesivo o insuficiente de determinados colores
- Consistencia del uso del color
- Accesibilidad y contraste WCAG cuando sea aplicable

Determina si necesitamos un **sistema de colores estructurado**, en lugar de colores definidos arbitrariamente pantalla por pantalla.

---

## TIPOGRAFÍA

Analiza:

- Familia tipográfica
- Peso de cada estilo
- Tamaños
- Line-height
- Letter spacing
- Jerarquía entre H1/H2/H3/body/caption/etc.
- Legibilidad
- Consistencia
- Diferencias entre títulos, subtítulos y cuerpo
- Uso excesivo de negritas
- Tamaños demasiado pequeños
- Textos que deberían tener mayor o menor protagonismo

Propón una **escala tipográfica completa** si consideras que la actual no está bien estructurada.

---

## ICONOS

Analiza:

- Familia de iconos utilizada
- Consistencia visual
- Grosor del trazo
- Tamaño
- Alineación
- Espaciado
- Uso correcto de iconos
- Iconos redundantes
- Iconos ambiguos
- Iconos que deberían sustituirse
- Consistencia entre iconos outline/filled
- Iconos dentro de botones
- Iconos de navegación
- Iconos de estados

Determina si deberíamos utilizar un único sistema de iconografía.

---

## ESPACIADO

Analiza el sistema de spacing:

- Padding
- Margins
- Gaps
- Separación entre secciones
- Separación entre títulos y contenido
- Espaciado interno de cards
- Espaciado de botones
- Espaciado de listas
- Safe areas
- Distancia respecto a navegación y elementos inferiores

Determina si existe realmente un **spacing system** o si parece que cada pantalla ha sido diseñada de forma independiente.

Si es necesario, propón una escala, por ejemplo:

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40`

---

# 3. COMPONENTES

Audita todos los componentes reutilizables:

- Buttons
- Cards
- Inputs
- Selectors
- Tabs
- Bottom navigation
- Headers
- Modals
- Bottom sheets
- Dropdowns
- Badges
- Chips
- Progress bars
- Sliders
- Toggles
- Checkboxes
- Radio buttons
- Lists
- Avatares
- Toasts
- Alerts
- Empty states
- Loading states
- Skeletons

Para cada componente analiza:

1. Diseño
2. Tamaño
3. Espaciado
4. Tipografía
5. Colores
6. Border radius
7. Sombras
8. Estados
9. Consistencia
10. Usabilidad

---

# 4. BORDER RADIUS, SOMBRAS Y PROFUNDIDAD

Analiza específicamente:

- Border radius
- Sombras
- Elevación
- Bordes
- Separación entre superficies
- Cards
- Modales
- Botones

Determina si existe un lenguaje visual coherente.

Por ejemplo, si tenemos:

- 8px
- 12px
- 16px
- 20px
- 24px

sin una razón clara, propón una escala más coherente.

---

# 5. JERARQUÍA VISUAL

Analiza cada pantalla y responde:

- ¿Qué elemento debería mirar primero el usuario?
- ¿Está realmente claro?
- ¿Cuál es la acción principal?
- ¿Hay demasiados elementos compitiendo por atención?
- ¿Hay información secundaria que tiene demasiado protagonismo?
- ¿Hay elementos importantes que pasan desapercibidos?
- ¿Existe suficiente espacio en blanco?
- ¿La pantalla se entiende rápidamente?

Analiza la interfaz desde el punto de vista de **qué percibe el usuario durante los primeros 2–3 segundos**.

---

# 6. UX Y NAVEGACIÓN

No te limites al aspecto visual.

Analiza:

- Arquitectura de navegación
- Bottom navigation
- Flujo entre pantallas
- Número de pasos necesarios para realizar acciones
- Jerarquía de información
- CTAs
- Formularios
- Feedback del sistema
- Estados de carga
- Errores
- Confirmaciones
- Empty states
- Onboarding
- Descubribilidad de funcionalidades

Identifica cualquier punto donde el usuario pueda preguntarse:

> "¿Qué tengo que hacer ahora?"

---

# 7. CONSISTENCIA ENTRE PANTALLAS

Busca inconsistencias como:

- Diferentes tamaños de botones
- Diferentes border radius
- Diferentes tamaños de títulos
- Diferentes paddings
- Diferentes colores para la misma función
- Diferentes iconos para la misma acción
- Headers inconsistentes
- Diferentes estilos de cards
- Diferentes estilos de navegación
- Diferentes espaciados

Determina si actualmente existe un **Design System real** o simplemente una colección de pantallas.

---

# 8. ACCESIBILIDAD

Revisa:

- Contraste
- Tamaño mínimo de texto
- Tamaño de áreas táctiles
- Legibilidad
- Dependencia exclusiva del color
- Iconos sin contexto
- Labels
- Estados
- Feedback visual

Prioriza especialmente los elementos interactivos que puedan ser difíciles de utilizar en una pantalla móvil.

---

# 9. RESPONSIVE / DIFERENTES DISPOSITIVOS

Como es React Native + Expo, analiza posibles problemas relacionados con:

- Diferentes tamaños de pantalla
- iPhone con Dynamic Island
- Safe areas
- iPhone pequeños
- iPhone grandes
- Android
- Diferentes densidades
- Orientación cuando sea relevante
- Teclado
- Scroll
- Elementos inferiores
- Bottom sheets/modals

---

# 10. MICROINTERACCIONES Y ANIMACIONES

Analiza si la aplicación debería incorporar o mejorar:

- Animaciones de navegación
- Press states
- Feedback táctil
- Loading animations
- Transiciones
- Progress animations
- Success states
- Skeleton loading
- Haptic feedback

No quiero animaciones innecesarias. Solo aquellas que mejoren la percepción de calidad o ayuden a comprender la interfaz.

---

# 11. CÓDIGO Y ARQUITECTURA DE UI

Como la aplicación está desarrollada en **React Native + Expo**, revisa también, cuando tengas acceso al código:

- Componentización
- Reutilización
- Design tokens
- Theme
- Variables de color
- Tipografía centralizada
- Spacing tokens
- Border radius tokens
- Componentes duplicados
- Estilos duplicados
- Hardcoded values
- Consistencia de StyleSheet
- Estructura de componentes
- Posibles problemas de mantenimiento

Si detectas que visualmente tenemos inconsistencias porque la implementación no utiliza un sistema de diseño centralizado, indícalo.

---

# 12. NO QUIERO SOLO CRÍTICAS

Para cada problema importante quiero:

### PROBLEMA

Qué está mal.

### POR QUÉ

Por qué afecta a la UI/UX.

### RECOMENDACIÓN

Qué cambiarías.

### PRIORIDAD

- 🔴 Crítico
- 🟠 Importante
- 🟡 Mejora
- 🟢 Opcional

### IMPLEMENTACIÓN

Si es relevante, explica cómo debería implementarse en React Native/Expo.

---

# 13. CREA UN DESIGN SYSTEM PROPUESTO

Al finalizar la auditoría, crea una propuesta de Design System para nuestra aplicación.

## Colors

Define:

- Primary
- Secondary
- Background
- Surface
- Text
- Text secondary
- Border
- Success
- Warning
- Error
- Info

## Typography

Define:

- Display
- H1
- H2
- H3
- Body
- Body small
- Caption
- Button

Incluye:

- Tamaño
- Peso
- Line-height
- Letter spacing cuando sea necesario

## Spacing

Define una escala coherente.

## Border radius

Define una escala.

## Shadows / elevation

Define niveles.

## Buttons

Define variantes y estados.

## Inputs

Define estados y tamaños.

## Cards

Define variantes.

## Icons

Define sistema, tamaño y estilo.

---

# 14. PRIORIZACIÓN FINAL

Al terminar, crea:

# 🔴 TOP 10 CAMBIOS MÁS IMPORTANTES

Ordenados desde el cambio que más mejoraría la percepción y experiencia de la aplicación hasta el menos importante.

Para cada uno indica:

- Problema
- Solución
- Impacto esperado
- Dificultad de implementación

---

# QUICK WINS

Identifica cambios que puedan realizarse rápidamente pero que produzcan una mejora visual significativa.

---

# REDESIGN ROADMAP

Divide las mejoras en:

## Fase 1 — Critical

Cambios imprescindibles.

## Fase 2 — Visual System

Design System, colores, tipografía, spacing, componentes, etc.

## Fase 3 — UX

Navegación, flujos, estados y usabilidad.

## Fase 4 — Polish

Microinteracciones, animaciones, detalles visuales y refinamiento.

---

# IMPORTANTE

No quiero que seas complaciente.

Si algo está mal, dilo claramente.

No quiero frases genéricas como:

> "Podrías mejorar la consistencia."

Quiero algo como:

> "El botón principal utiliza 48px de altura en esta pantalla y 44px en esta otra. Esto debería unificarse a Xpx porque..."

Sé específico y señala los problemas concretos.

Tampoco quiero que rediseñes por gusto personal. Todas las recomendaciones deben tener una justificación basada en **UI/UX, diseño de sistemas, usabilidad, accesibilidad o patrones actuales de aplicaciones móviles profesionales**.

**Antes de proponer cambios, analiza primero toda la aplicación y entiende su estructura, propósito y flujo de usuario.**

Si tienes acceso al repositorio, inspecciona también el código y localiza dónde se implementan los elementos que propones modificar.

El resultado debe ser una **auditoría profesional completa + un plan concreto de rediseño**, no simplemente una opinión estética.
