// Chat (FitBot / soporte con el entrenador, MigratedChatting) desactivado
// para la primera versión publicada en la tienda -- pedido explícito: la
// pantalla de chat no tiene moderación de contenido ni forma de reportar
// mensajes, y ambas tiendas (App Store 1.2 "User Generated Content" / Play
// Console "User-generated content policy") pueden rechazar una app con
// mensajería libre sin eso. Los dos puntos de entrada (home_screen_modern_v2.tsx
// "¿Necesitas ayuda?" y profile_screen.tsx "Soporte") comprueban este flag y
// muestran "disponible en la próxima versión" en vez de navegar a
// MigratedChatting. La pantalla en sí (App.tsx) NO se ha quitado del stack
// a propósito -- solo se bloquea el acceso desde la UI, así no hace falta
// tocar la navegación ni arriesgarse a romper un deep link existente.
// Reactivar: cambiar a true en cuanto exista moderación/reporte de mensajes.
export const CHAT_ENABLED = false;

// Activity Tracker (MigratedActivityTracker) y Water Tracker
// (MigratedWaterTracker) desactivados para la primera versión -- pedido
// explícito: los usuarios todavía no pueden acceder a esas pantallas. Punto
// de entrada único a cada una: los botones "+" de las tarjetas Agua/
// Actividad en home_screen_modern_v2.tsx, que comprueban estos flags y
// muestran "disponible en la próxima versión" en vez de navegar. Las
// pantallas y sus rutas en App.tsx NO se quitan, igual que CHAT_ENABLED.
// MigratedActivityTracker en concreto ya estaba documentada como bloqueada
// por la falta de integración real Apple Health/Google Fit (ver
// docs/TAREAS.md) -- sus datos son hardcodeados, sin ningún api/* real.
export const ACTIVITY_TRACKER_ENABLED = false;
export const WATER_TRACKER_ENABLED = false;

// "Reto para empezar" (StartupChecklist, home_screen_modern_v2.tsx) --
// pedido explícito 2026-08-31: el sistema de retos todavía no está
// terminado, se sigue puliendo. Solo se oculta la tarjeta de entrada en
// Home -- useTutorial()/TutorialOverlay/TutorialTarget y el resto del
// sistema (constants/tutorialChallenges.ts) NO se tocan, siguen activos
// por si algún TutorialTarget de otra pantalla depende de ese contexto.
// Reactivar: cambiar a true cuando el sistema de retos esté listo.
export const STARTUP_CHALLENGE_ENABLED = false;

// ScreenReviewFab ("Revisar pantalla") y ScreenExplorerFab (mapa de
// pantallas) -- herramientas de desarrollo montadas globalmente en
// App.tsx. Pedido explícito 2026-08-31: ocultarlas para el build oficial
// de tienda (no son para usuarios finales), sin desmontarlas del árbol --
// se reactivan después de este build.
export const DEV_TOOLS_ENABLED = false;
