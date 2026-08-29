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
