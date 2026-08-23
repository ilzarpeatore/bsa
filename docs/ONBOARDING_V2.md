# Onboarding v2 (4 etapas) — contrato frontend/backend

Estado: **frontend completo y wireado**, backend pendiente para 3 de las 4
etapas. Este documento es el contrato que necesita quien implemente el
backend — payloads exactos, endpoints esperados y esquema de BD sugerido.

## Qué sustituye

Reemplaza por completo el onboarding anterior (`MigratedOnboarding` carrusel
de 11 slides → `ProfileSetupIntro` → `ProfileSetupForm` → `AvatarSetup` →
`PrivacyPolicyOnboard` → `NotificationsOnboard` → `AssessmentResult` →
`Recommendations` → `Health` → `Articles` → `OnboardingComplete`), que además
tenía un bug real: el carrusel llamaba a `completeOnboarding()` directamente
al pulsar "Saltar" o "Empezar", sin pasar nunca por el formulario de datos
personales — en la práctica nadie llegaba a `ProfileSetupForm` ni a nada
posterior.

`App.tsx` (`RootNavigator`, rama `!state.onboardingCompleted`) ahora registra
solo:

- `MigratedOnboardingV2` (nuevo, `pages/migrated/onboarding_v2/onboarding_v2_screen.tsx`) — las 4 etapas.
- `MigratedAssessmentResult` (reutilizada tal cual — ya muestra IMC/BMR reales calculados en el backend a partir de `user_profile.height/weight/age` una vez la etapa 1 se guarda).
- `MigratedOnboardingComplete` (reutilizada tal cual — ya llama a `completeOnboarding()` y navega a Home).

Las pantallas quitadas de esta rama (`AvatarSetup`, `PrivacyPolicyOnboard`,
`NotificationsOnboard`, `Recommendations`, `Health`, `Articles`, el carrusel
`MigratedOnboarding`, `ProfileSetupIntro`, `ProfileSetupForm`) **no se han
borrado** — siguen registradas dentro de `MigratedNavigator` (alcanzables
desde dentro de la app ya autenticada) por si algo más las usa. Si se
confirma que no las usa nadie más, son candidatas a limpieza en una pasada
aparte.

## Arquitectura frontend

- `types/onboardingV2.ts` — tipos de pregunta (`OnboardingQuestion` y sus
  variantes) y de respuesta.
- `constants/onboardingV2Questions.ts` — las 36 preguntas, declarativas, en
  orden, cada una con su `stage`.
- `components/onboarding_v2/*` — widgets reutilizables (`OptionCards` para
  selección única con tarjetas, `RulerPicker` para altura/peso, `NumberWheelPicker`
  para edad/días-semana/meses-entrenando/comidas-día, `ScaleSelector` para
  escalas 1-10, `OnboardingHeader` para el botón atrás + barra de progreso
  segmentada por etapa).
- `pages/migrated/onboarding_v2/onboarding_v2_screen.tsx` — motor único: una
  sola pantalla recorre las 36 preguntas con un índice interno (no hay una
  ruta de navegación por pregunta), guarda las respuestas en
  `AsyncStorage` (`@befit_onboarding_v2_answers`) en cada paso para poder
  reanudar si la app se cierra a medias, y llama al endpoint de la etapa al
  responder su última pregunta.
- `api/onboardingV2.ts` — la capa de API. Ver contrato completo abajo.

**Nada de esto bloquea el alta de un usuario si un envío falla** — las
respuestas siempre quedan a salvo en `AsyncStorage` primero, y cada llamada a
la API es "best effort" (se registra el error con `logger.error` y se sigue
adelante). Esto es intencional: las etapas 2-4 llaman hoy a endpoints que
**todavía no existen** en el backend (ver más abajo), así que fallarán con
404 hasta que se implementen — sin este best-effort, nadie podría completar
el onboarding hoy mismo.

## Las 4 etapas y sus preguntas

### Etapa 1 — Datos personales (`personal_data`)

Único endpoint que **ya funciona hoy** — reutiliza `update-profile`
(`profileApi.updateProfile`, ya real), porque `age`/`height`/`weight`/
`gender` ya existen como columnas reales en `user_profiles`/`users`.

| id       | tipo             | pregunta                 | notas                                                                                                      |
| -------- | ---------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `name`   | nombre+apellidos | ¿Cómo te llamas?         | precargado desde `state.user.first_name/last_name`                                                         |
| `gender` | selección única  | ¿Cuál es tu sexo?        | `male` / `female` / `other`                                                                                |
| `age`    | rueda numérica   | ¿Cuántos años tienes?    | 14-90                                                                                                      |
| `height` | regla            | ¿Cuál es tu estatura?    | 140-220 cm, toggle cm/ft (el toggle solo convierte el número mostrado, el valor guardado siempre es en cm) |
| `weight` | regla            | ¿Cuál es tu peso actual? | 30-200 kg, 1 decimal, toggle kg/lbs (mismo criterio: se guarda siempre en kg)                              |

**Request** (vía `profileApi.updateProfile`, `POST update-profile`):

```json
{
  "username": "<state.user.username>",
  "email": "<state.user.email>",
  "first_name": "...",
  "last_name": "...",
  "gender": "male | female | other",
  "user_profile": {
    "age": "27",
    "height": "170",
    "height_unit": "cm",
    "weight": "73.4",
    "weight_unit": "kg"
  }
}
```

`username`/`email` son obligatorios en `UserRequest::rules()` aunque esta
pantalla no los pida — sin ambos el guardado devuelve 422 aunque el resto del
payload sea válido (bug ya documentado en `profile_setup_form_screen.tsx` /
`edit_profile_screen.tsx`, reproducido aquí a propósito).

**Response**: la misma envolvente que ya devuelve `update-profile` hoy
(`{ data: UserData }`, con `user_profile.bmi`/`bmr` recalculados).

### Etapa 2 — PAR-Q (`par_q`)

Numeración conservada tal cual la dio el usuario (continúa un PAR-Q+
estándar cuyas preguntas 1-2 no se piden aquí).

| id                                | tipo                   | pregunta                                                                                   |
| --------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| `parq_heart_condition`            | Sí/No                  | 3. ¿Le ha dicho su médico alguna vez que padece una enfermedad cardiaca...?                |
| `parq_chest_pain_activity`        | Sí/No                  | 4. ¿Tiene dolor en el pecho cuando hace actividad física?                                  |
| `parq_chest_pain_rest_last_month` | Sí/No                  | 5. En el último mes, ¿ha tenido dolor en el pecho cuando no hacía actividad física?        |
| `parq_dizziness_balance`          | Sí/No                  | 6. ¿Pierde el equilibrio debido a mareos o se ha desmayado alguna vez?                     |
| `parq_bone_joint_problem`         | Sí/No                  | 7. ¿Tiene problemas en huesos o articulaciones...?                                         |
| `parq_bp_or_heart_medication`     | Sí/No                  | 8. ¿Le receta su médico algún medicamento para la tensión arterial o un problema cardíaco? |
| `parq_reason_not_to_exercise`     | Sí/No                  | 9. ¿Conoce alguna razón por la cual no debería realizar actividad física?                  |
| `parq_fitness_level`              | escala 1-10            | 10. ¿Cómo calificarías tu nivel de condición física actual?                                |
| `parq_medical_history`            | texto libre (opcional) | 11. Indica cualquier historial médico relevante...                                         |
| `parq_goals`                      | texto libre            | 12. ¿Cuáles son tus objetivos?                                                             |

**Endpoint pendiente**: `POST v1/onboarding/par-q`

**Request**:

```json
{
  "parq_heart_condition": false,
  "parq_chest_pain_activity": false,
  "parq_chest_pain_rest_last_month": false,
  "parq_dizziness_balance": false,
  "parq_bone_joint_problem": false,
  "parq_bp_or_heart_medication": false,
  "parq_reason_not_to_exercise": false,
  "parq_fitness_level": 6,
  "parq_medical_history": "",
  "parq_goals": "Perder grasa y ganar movilidad"
}
```

**Response esperada**: `{ "message": "OK", "status": true }` (mismo patrón
que `ApiMessageResponse` del resto de la app).

**Si alguna respuesta Sí/No relevante para seguridad es `true`** (típicamente
`parq_heart_condition`, `parq_chest_pain_activity`,
`parq_chest_pain_rest_last_month`, `parq_dizziness_balance`), el backend
debería poder marcar el perfil para que el coach/entrenador lo revise antes
de asignar un plan — no implementado en el frontend (fuera de alcance de
esta tarea), pero es el uso típico de un PAR-Q real.

### Etapa 3 — Cuestionario de entrenamiento (`training_questionnaire`)

| id                            | tipo            | pregunta / opciones                                                                                                                                                                                                                                                      |
| ----------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `goal_type`                   | selección única | Objetivo principal: `lose_fat` (perder grasa) / `gain_muscle` (ganar músculo) / `recomposition` (recomposición) / `maintain` (mantener). Añadida 2026-08-23 — la pantalla de resultado del onboarding la necesita para no inventar un objetivo con una fórmula genérica. |
| `activity_level`              | selección única | Nivel de actividad: `sedentary` / `light` / `moderate` / `active` / `very_active`                                                                                                                                                                                        |
| `lifestyle_type`              | selección única | Estilo de vida (solo movimiento diario, no entrenamientos): `mostly_sitting` / `sometimes_standing` / `mostly_standing` / `always_moving` / `heavy_labor`                                                                                                                |
| `training_experience_months`  | rueda numérica  | Meses entrenando (0-360)                                                                                                                                                                                                                                                 |
| `training_days_per_week`      | rueda numérica  | Días/semana disponibles (1-7)                                                                                                                                                                                                                                            |
| `session_duration_preference` | selección única | Duración de sesión: `30` / `45` / `60` / `90` / `90_plus` (minutos)                                                                                                                                                                                                      |
| `training_mindset`            | selección única | Cómo sueles entrenar: `rushed` (con prisa) / `calm` (con calma) / `motivated` (con motivación) / `unmotivated` (sin ganas)                                                                                                                                               |
| `previous_coaching`           | selección única | `online_coach` / `in_person_coach` / `self_trained`                                                                                                                                                                                                                      |
| `current_routine_style`       | selección única | `improvised` / `copied` / `structured` / `always_same` / `very_varied`                                                                                                                                                                                                   |
| `weekly_split_preference`     | selección única | `upper_lower` (torso-pierna) / `push_pull` / `full_body` / `no_preference`                                                                                                                                                                                               |
| `technique_level`             | escala 1-10     | Nivel de técnica percibido                                                                                                                                                                                                                                               |
| `realistic_goal`              | texto libre     | Objetivo realista                                                                                                                                                                                                                                                        |

**Nota de producto**: `activity_level` y `lifestyle_type` se pidieron como
dos preguntas separadas en el encargo original, aunque conceptualmente se
solapan bastante (ambas describen el movimiento diario del usuario fuera del
gimnasio). Se han mantenido como dos campos independientes tal cual se
pidieron — si el backend/negocio decide que son redundantes, es una decisión
de producto a tomar más adelante, no resuelta aquí.

**Endpoint pendiente**: `POST v1/onboarding/training-questionnaire`

**Request**:

```json
{
  "goal_type": "gain_muscle",
  "activity_level": "moderate",
  "lifestyle_type": "mostly_sitting",
  "training_experience_months": 18,
  "training_days_per_week": 4,
  "session_duration_preference": "60",
  "training_mindset": "motivated",
  "previous_coaching": "self_trained",
  "current_routine_style": "structured",
  "weekly_split_preference": "upper_lower",
  "technique_level": 7,
  "realistic_goal": "Subir 3kg de músculo en 6 meses"
}
```

**Response esperada**: `{ "message": "OK", "status": true }`.

### Etapa 4 — Cuestionario de nutrición (`nutrition_questionnaire`)

La pregunta original _"¿Cuántas comidas realizas normalmente y cuántas
quieres realizar?"_ se dividió en dos preguntas numéricas independientes
(`current_meals_per_day` / `desired_meals_per_day`) para poder usar el mismo
widget de rueda numérica que el resto de preguntas cuantitativas, en vez de
pedirlo como texto libre.

| id                           | tipo                   | pregunta                                                       |
| ---------------------------- | ---------------------- | -------------------------------------------------------------- |
| `allergies_intolerances`     | texto libre            | 1. ¿Tienes alguna alergia o intolerancia?                      |
| `disliked_foods`             | texto libre (opcional) | 2. ¿Qué comidas o alimentos no te gustan y no quieres incluir? |
| `liked_foods`                | texto libre (opcional) | 3. ¿Qué comidas o alimentos te gustan y quieres incluir?       |
| `current_meals_per_day`      | rueda numérica         | 4a. ¿Cuántas comidas realizas normalmente al día? (1-8)        |
| `desired_meals_per_day`      | rueda numérica         | 4b. ¿Cuántas comidas te gustaría realizar al día? (1-8)        |
| `typical_day_meals`          | texto libre            | 5. Explícame lo que comes durante un día entero                |
| `favorite_meats`             | texto libre (opcional) | 6. ¿Cuáles son tus carnes favoritas?                           |
| `favorite_fish`              | texto libre (opcional) | 7. ¿Cuáles son tus pescados favoritos?                         |
| `favorite_fruits_vegetables` | texto libre (opcional) | 8. ¿Cuáles son tus frutas y verduras preferidas?               |
| `favorite_combined_dishes`   | texto libre (opcional) | 9. ¿Cuáles son tus comidas combinadas favoritas?               |

**Endpoint pendiente**: `POST v1/onboarding/nutrition-questionnaire`

**Request**:

```json
{
  "allergies_intolerances": "Intolerancia a la lactosa",
  "disliked_foods": "Berenjena, hígado",
  "liked_foods": "Pollo, arroz, aguacate",
  "current_meals_per_day": 3,
  "desired_meals_per_day": 4,
  "typical_day_meals": "Desayuno: avena con fruta. Comida: pollo con arroz...",
  "favorite_meats": "Pollo, ternera",
  "favorite_fish": "Salmón, atún",
  "favorite_fruits_vegetables": "Plátano, brócoli, espinacas",
  "favorite_combined_dishes": "Arroz con pollo, pasta con atún"
}
```

**Response esperada**: `{ "message": "OK", "status": true }`.

## Esquema de BD sugerido (backend, pendiente)

`user_profiles` ya tiene `age`/`height`/`height_unit`/`weight`/`weight_unit`/
`activity`/`goal` — no requiere cambios para la etapa 1.

Para las etapas 2-4, una tabla por etapa (1:1 con `users`, igual que
`user_profiles`), todas con `user_id` único + timestamps:

```sql
CREATE TABLE par_q_answers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  parq_heart_condition BOOLEAN NOT NULL,
  parq_chest_pain_activity BOOLEAN NOT NULL,
  parq_chest_pain_rest_last_month BOOLEAN NOT NULL,
  parq_dizziness_balance BOOLEAN NOT NULL,
  parq_bone_joint_problem BOOLEAN NOT NULL,
  parq_bp_or_heart_medication BOOLEAN NOT NULL,
  parq_reason_not_to_exercise BOOLEAN NOT NULL,
  parq_fitness_level TINYINT UNSIGNED NOT NULL,
  parq_medical_history TEXT NULL,
  parq_goals TEXT NOT NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE training_questionnaire_answers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  goal_type VARCHAR(20) NOT NULL,
  activity_level VARCHAR(20) NOT NULL,
  lifestyle_type VARCHAR(30) NOT NULL,
  training_experience_months SMALLINT UNSIGNED NOT NULL,
  training_days_per_week TINYINT UNSIGNED NOT NULL,
  session_duration_preference VARCHAR(10) NOT NULL,
  training_mindset VARCHAR(20) NOT NULL,
  previous_coaching VARCHAR(20) NOT NULL,
  current_routine_style VARCHAR(20) NOT NULL,
  weekly_split_preference VARCHAR(20) NOT NULL,
  technique_level TINYINT UNSIGNED NOT NULL,
  realistic_goal TEXT NOT NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE nutrition_questionnaire_answers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  allergies_intolerances TEXT NOT NULL,
  disliked_foods TEXT NULL,
  liked_foods TEXT NULL,
  current_meals_per_day TINYINT UNSIGNED NOT NULL,
  desired_meals_per_day TINYINT UNSIGNED NOT NULL,
  typical_day_meals TEXT NOT NULL,
  favorite_meats TEXT NULL,
  favorite_fish TEXT NULL,
  favorite_fruits_vegetables TEXT NULL,
  favorite_combined_dishes TEXT NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

`user_id` sale del token de auth (mismo mecanismo que el resto de la API,
`apiClient` ya adjunta `Authorization: Bearer <token>` — no hace falta que el
frontend lo mande en el body).

## Decisiones de diseño (frontend)

- **Una sola pantalla, no 36 rutas**: el flujo entero vive en
  `onboarding_v2_screen.tsx` con un índice de pregunta en estado local, en
  vez de registrar una ruta de React Navigation por pregunta. Más simple de
  mantener y el "atrás" es instantáneo.
- **Regla (altura/peso) siempre en unidad base**: el widget `RulerPicker`
  siempre opera en cm/kg internamente; el toggle cm↔ft o kg↔lbs solo
  convierte el número grande mostrado encima, no re-escala la regla. Los
  números bajo las marcas principales de la regla siguen en cm/kg aunque el
  toggle esté en ft/lbs — simplificación consciente para evitar tener que
  re-derivar rango/decimales por unidad.
- **Reanudable**: las respuestas se persisten en `AsyncStorage` en cada
  paso (`@befit_onboarding_v2_answers`), así que cerrar la app a mitad del
  onboarding no pierde lo ya respondido (aunque si algo cambia en la lista de
  preguntas entre versiones, se reanuda desde la primera pregunta, no desde
  el índice guardado — más simple y seguro que arriesgar un índice fuera de
  rango).
- **Ningún envío bloquea el alta de un usuario**: todas las llamadas a la
  API (incluida la etapa 1, que sí es real hoy) están en `try/catch` con
  `logger.error` y nunca detienen el avance del usuario — es la única forma
  sensata de que alguien pueda completar el onboarding hoy mismo, cuando 3 de
  los 4 endpoints todavía no existen.

## Pendiente

- [ ] Backend: implementar `POST v1/onboarding/par-q`,
      `POST v1/onboarding/training-questionnaire`,
      `POST v1/onboarding/nutrition-questionnaire` + las 3 tablas de arriba.
- [ ] Backend/producto: decidir si un PAR-Q con respuesta positiva en alguna
      pregunta de riesgo cardíaco debe bloquear/marcar el perfil para
      revisión de un coach antes de asignar un plan de entrenamiento.
- [ ] Verificar visualmente en dispositivo el `RulerPicker`/`NumberWheelPicker`
      (construidos desde cero, sin librería — no hay ninguna "rueda"/"regla"
      previa en el repo para reutilizar) — no se ha podido probar en un
      simulador real durante esta sesión.
- [ ] Decidir si migrar/eliminar las pantallas huérfanas del onboarding
      anterior (`AvatarSetup`, `PrivacyPolicyOnboard`, `NotificationsOnboard`,
      `Recommendations`, `Health`, `Articles`, el carrusel `MigratedOnboarding`,
      `ProfileSetupIntro`, `ProfileSetupForm`) — siguen registradas en
      `MigratedNavigator` por si algo más las usa, no se han tocado ni
      borrado en esta tarea.
