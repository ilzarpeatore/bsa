# BeFit React - Auditoría de pantallas muertas

> Generado el 04-08-2026. Pantallas sin ruta de navegación alcanzable desde los flujos normales.
> **No borrar**: el usuario las desarrollará más adelante. Este documento es solo inventario.
>
> **Excepción (2026-08-13)**: `MigratedSubscribe`/`subscribe_screen.tsx` — listada abajo como B1 (sin enlace entrante) — sí se borró, junto con `MigratedPayment`/`MigratedPaymentScheduled`/`MigratedChoosePlan` (no estaban en este inventario por tener enlace entrante real). Motivo: Apple/Google exigen que la app no venda contenido digital dentro sin su propio IAP — no es la razón "se desarrollará más adelante" que motiva el resto de este documento. Ver `docs/TAREAS.md`.
>
> **Excepción (2026-08-18)**: 27 pantallas más se borraron, esta vez porque el usuario las revisó una por una desde la app (herramienta `ScreenReviewFab`, tabla `screen_review_marks`) y confirmó explícitamente borrarlas — 8 marcadas directamente `status=delete`, otras 13 con la nota "¿la borramos?" confirmadas muertas tras un análisis real de alcanzabilidad (grep de `.navigate()`/`.replace()` desde el flujo vivo de la app), y una cadena de auth duplicada (Sandow) encontrada huérfana durante esa misma investigación. Mismo criterio que la excepción anterior: decisión explícita del usuario sobre pantallas concretas, no un borrado masivo por este documento. Ver `docs/TAREAS.md` para el detalle completo.
>
> De las 27, estas ya aparecían en el inventario de abajo (no se han quitado de sus listas, igual que la excepción de 2026-08-13 tampoco tocó las suyas — las listas se dejan como foto fija del 04-08-2026, esta nota es la que manda): de **B1** — `MigratedAssign`, `MigratedExerciseHistory`, `MigratedFilterWorkout`, `MigratedHomeEmpty`, `MigratedNoData`, `MigratedNoInternet`, `MigratedSchedule`, `MigratedSignInSandow`, `MigratedViewDietCategory`, `MigratedViewLevel`, `MigratedWalkThrough` (11); de **B2** — `MigratedForgotPwd`, `MigratedOTP`, `MigratedSignUpSandow`, `MigratedVerifyOtp`, `MigratedViewAllDiet` (5).
>
> Las otras 11 borradas NO aparecen en ningún lado de este inventario (ni A, ni B1, ni B2): `MigratedExerciseDuration`, `MigratedExerciseDurationCast`, `MigratedProgressDetail`, `MigratedSubscriptionDetail`, `MigratedViewWorkouts`, y las 6 pantallas legacy sin prefijo `Migrated` (`ExerciseList`, `FavouriteWorkouts`, `Profile`, `ProfileStats`, `Settings`/`SettingsScreen`, `WorkoutSummary` — este documento nunca auditó las `pages/*.tsx` no migradas como categoría propia). O bien se volvieron huérfanas _después_ del 04-08-2026 (este inventario es una foto fija de esa fecha y `App.tsx` cambió mucho desde entonces), o se les escapó a la auditoría original. No se puede saber cuál de las dos sin rehacer el análisis completo — no se inventa el motivo.
>
> **Los recuentos de "Verificación" de abajo (190/70/120) son del 04-08-2026 y ya no son correctos** — además de estas 27 bajas, `App.tsx` recibió muchas altas y bajas en sesiones intermedias (recetas, calendario, cabeceras Fase 4, etc.) que este documento nunca reflejó. Recalcularlos con precisión requiere rehacer la auditoría completa de alcanzabilidad, fuera del alcance de esta actualización puntual — no se corrigen aquí para no fabricar un número.
>
> **Excepción (2026-08-23)**: `MigratedOnboardingComplete`/`onboarding_complete_screen.tsx` (listada abajo en la fila `onboarding/articles_screen` — su único enlace entrante venía de esa pantalla, ya inalcanzable, parte de la cadena vieja del carrusel retirado) se borró de verdad, pedido explícito del usuario ("esta screen que sale después del onboarding es innecesaria, elimínala") — su única lógica real (`completeOnboarding()` + navegar a Home) se movió al botón final de `MigratedAssessmentResult`. Ver `docs/ONBOARDING_V2.md`/`docs/TAREAS.md` para el detalle.

## Verificación

- Nombres de pantalla registrados en `App.tsx` (Stack/Tab `name=` + `component=`): **190** (149 Migrated + 41 no-migrated)
- Alcanzables por navegación normal (punto fijo de las aristas de navegación desde las pantallas de entrada): **70**
- **Muertas registradas (Categoría B): 120**

## Categoría A - NO registradas (nunca importadas, sin referencias en código)

### pages/migrated (7) - referenciadas solo en docs/Encargo3_Auditoria_Colores.md

- `chatbot_empty_screen.tsx`
- `chatbot_image_empty_screen.tsx`
- `forgot_password_email_screen.tsx`
- `forgot_password_options_screen.tsx`
- `login_screen.tsx`
- `password_reset_sent_screen.tsx`
- `welcome_auth_screen.tsx`

### pages/auth (4) - no importadas por App.tsx

- `fitness_assessment_screen.tsx`
- `parq_result_screen.tsx`
- `parq_screen.tsx`
- `RegisterFlowScreen.tsx`

### pages/auth - muertas por cadena (importadas solo por otro archivo muerto)

- `register_screen.tsx` (nunca importado; su único import es el bundle `dist` obsoleto)
- `register_flow_screen.tsx` (importado SOLO por `register_screen.tsx` muerto)

## Categoría C - Importadas en App.tsx pero nunca en `component={...}`

- **`Home`** (`pages/Home.tsx`): importado pero sin uso; la pantalla "Home" usa `component={Homenavigator}`.

## Categoría B - Registradas pero sin navegación desde pantallas alcanzables (120)

- **B1 - Ninguna pantalla navega a ellas (63)**: todas las `Migrated*` sin enlace entrante desde pantallas alcanzables (listadas abajo) + `ExerciseDetail` + `Unboard`.
- **B2 - Alcanzables solo desde OTRAS pantallas muertas (57)**: clusters de Unboarding, Sandow/auth y device-pairing.

> Caveat: `pages/ScreenExplorer.tsx` (herramienta de debug, alcanzable desde Home) navega dinámicamente a casi todas las rutas. Si se cuenta, 112 de las 120 se vuelven alcanzables; solo **8** quedan inalcanzables por cualquier vía:
>
> - Cluster Unboarding: `Unboarding`, `Unboard`, `Name`, `Weight`, `Height` (el `navigate('Unboard')` de ScreenExplorer falla - UnboardingStack nunca se monta)
> - `MigratedChattingImage`, `MigratedWeightGoalSet`, `MigratedWeightLogged` (no están en la lista de rutas de ScreenExplorer)

### B1 (63) - sin enlace entrante

`ExerciseDetail`, `MigratedAboutApp`, `MigratedActivityTracker`, `MigratedAssign`, `MigratedBlog`, `MigratedBookmark`, `MigratedChewie`, `MigratedCommunity`, `MigratedExerciseHistory`, `MigratedFavourite`, `MigratedFavouriteRecipe`, `MigratedFilterWorkout`, `MigratedFitnessMetrics`, `MigratedHeartRate`, `MigratedHomeEmpty`, `MigratedLinkDeviceChoice`, `MigratedMainGoal`, `MigratedManageHealthMetrics`, `MigratedMissingDetails`, `MigratedNoData`, `MigratedNoInternet`, `MigratedOtherUserProfile`, `MigratedPayment`, `MigratedPaymentScheduled`, `MigratedPostDetails`, `MigratedPrivacyPolicy`, `MigratedProduct`, `MigratedProfile`, `MigratedProfileSandow`, `MigratedProfileSetupIntro`, `MigratedReminder`, `MigratedSandowScore`, `MigratedSchedule`, `MigratedScoreBreakdown`, `MigratedSearch`, `MigratedShoppingList`, `MigratedSignInSandow`, `MigratedSleepMonitoring`, `MigratedSplash`, `MigratedStepGoal`, `MigratedStepGoalCompleted`, `MigratedSteps`, `MigratedStepsCount`, `MigratedStepsHistory`, `MigratedTermsAndConditions`, `MigratedVideo`, `MigratedVideoDetail`, `MigratedViewAllProduct`, `MigratedViewBodyPart`, `MigratedViewDietCategory`, `MigratedViewEquipment`, `MigratedViewLevel`, `MigratedViewProductCategory`, `MigratedWalkThrough`, `MigratedWaterTracker`, `MigratedWeight`, `MigratedWeightGoalCompleted`, `MigratedWeightGoalSet`, `MigratedWeightLoseGainChoice`, `MigratedWeightReminder`, `MigratedWorkoutHistory`, `MigratedYoutubePlayer`, `Unboard`.

### B2 (57) - navegadas solo desde pantallas muertas

| Pantalla                       | Solo navegada desde (todas muertas)                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `Height`                       | `Weight.tsx`                                                                                    |
| `MigratedAboutUs`              | `about_app_screen`                                                                              |
| `MigratedAddPost`              | `community_screen`                                                                              |
| `MigratedAddShoppingList`      | `shopping_list_detail_screen`, `shopping_list_screen`                                           |
| `MigratedArticles`             | `onboarding/health_screen`                                                                      |
| `MigratedAssessmentResult`     | `onboarding/notifications_screen`                                                               |
| `MigratedAvatarSetup`          | `onboarding/profile_setup_form_screen`                                                          |
| `MigratedChangePwd`            | `setting_screen`                                                                                |
| `MigratedChattingImage`        | `main_goal_screen`                                                                              |
| `MigratedChoosePlan`           | `onboarding/avatar_setup_screen`                                                                |
| `MigratedDeviceConnected`      | `home/emparejando_screen`                                                                       |
| `MigratedEditProfile`          | `profile_screen`, `profile_screen_sandow`                                                       |
| `MigratedEmparejando`          | `home/link_device_list_screen`                                                                  |
| `MigratedExerciseList`         | `view_body_part_screen`, `view_equipment_screen`, `view_level_screen`                           |
| `MigratedForgotPwd`            | `sign_in_screen_sandow`                                                                         |
| `MigratedGoalCaloriesMacros`   | `setting_screen`                                                                                |
| `MigratedGoalSelection`        | `goal_calories_macros_screen`                                                                   |
| `MigratedHealth`               | `onboarding/recommendations_screen`                                                             |
| `MigratedHealthMetricInsight`  | `home/fitness_metrics_screen`                                                                   |
| `MigratedHeartRateDetails`     | `home/heart_rate_history_screen`, `home/heart_rate_screen`                                      |
| `MigratedHeartRateHistory`     | `home/heart_rate_screen`                                                                        |
| `MigratedHeartRateInsight`     | `home/heart_rate_details_screen`, `home/heart_rate_screen`                                      |
| `MigratedHeartRateZones`       | `home/heart_rate_screen`                                                                        |
| `MigratedLanguage`             | `setting_screen`                                                                                |
| `MigratedLinkDeviceList`       | `home/link_device_choice_screen`                                                                |
| `MigratedLogStepsForm`         | `home/link_device_choice_screen`, `home/steps_screen`                                           |
| `MigratedLogWeightForm`        | `home/weight_history_screen`, `home/weight_screen`                                              |
| `MigratedLogWeightKeyboard`    | `home/log_weight_form_screen`                                                                   |
| `MigratedMealsReminders`       | `meals_water_reminder_screen`                                                                   |
| `MigratedMealsWaterReminder`   | `reminder_screen`                                                                               |
| `MigratedNotificationsOnboard` | `onboarding/privacy_policy_screen`                                                              |
| `MigratedOnboardingComplete`   | `onboarding/articles_screen`                                                                    |
| `MigratedOTP`                  | `login_screen`, `sign_in_screen_sandow`                                                         |
| `MigratedPrivacyPolicyOnboard` | `onboarding/choose_plan_screen`                                                                 |
| `MigratedProductDetail`        | `product_screen`                                                                                |
| `MigratedProfileSetupForm`     | `onboarding/profile_setup_intro_screen`                                                         |
| `MigratedRecommendations`      | `onboarding/assessment_result_screen`                                                           |
| `MigratedSetReminder`          | `reminder_screen`                                                                               |
| `MigratedSetting`              | `profile_screen`, `profile_screen_sandow`                                                       |
| `MigratedShoppingListDetail`   | `shopping_list_screen`                                                                          |
| `MigratedSignUpSandow`         | `sign_in_screen_sandow`, `verify_otp_screen`                                                    |
| `MigratedStepsDetails`         | `home/steps_history_screen`, `home/steps_screen`                                                |
| `MigratedStepsInsight`         | `home/step_goal_screen`, `home/steps_details_screen`                                            |
| `MigratedStepsLogged`          | `home/log_steps_form_screen`                                                                    |
| `MigratedVerifyOtp`            | `otp_screen`                                                                                    |
| `MigratedViewAllDiet`          | `view_diet_category_screen`                                                                     |
| `MigratedWaterReminders`       | `meals_water_reminder_screen`                                                                   |
| `MigratedWeightDeadline`       | `home/weight_goal_summary_screen`                                                               |
| `MigratedWeightDetails`        | `home/weight_screen`                                                                            |
| `MigratedWeightGoalSummary`    | `home/weight_lose_gain_choice_screen`                                                           |
| `MigratedWeightHistory`        | `home/weight_screen`                                                                            |
| `MigratedWeightInsight`        | `home/weight_details_screen`, `home/weight_screen`                                              |
| `MigratedWeightLogged`         | `home/log_weight_keyboard_screen`                                                               |
| `MigratedWeightSetGoal`        | `home/weight_deadline_screen`, `home/weight_goal_summary_screen`, `home/weight_reminder_screen` |
| `Name`                         | `Unboarding.tsx`                                                                                |
| `Unboarding`                   | `Name.tsx`, `Unboarding.tsx`, `Weight.tsx`                                                      |
| `Weight`                       | `Name.tsx`                                                                                      |
