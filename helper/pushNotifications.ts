import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { notificationsApi } from '../api/notifications';
import { ensureNotificationPermissionsAsync } from './reminderNotifications';
import logger from './logger';

// Best-effort: obtiene el push token de Expo del dispositivo y lo registra
// en el backend (ver api/notifications.ts@updatePushToken). Se llama tras
// login/register/hydrateSession y al restaurar una sesión ya existente al
// abrir la app (el token puede refrescarse a mitad de sesión, mismo
// criterio que el comentario del commit del backend) -- nunca debe
// bloquear ni romper el flujo de auth si falla, así que no relanza.
// Requiere `extra.eas.projectId` en app.json (pendiente de crear el
// proyecto EAS, ver CLAUDE.md) -- sin él, `getExpoPushTokenAsync` lanza y
// esta función simplemente no registra nada.
export async function registerPushTokenAsync(): Promise<void> {
  try {
    const granted = await ensureNotificationPermissionsAsync();
    if (!granted) return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    if (!projectId) {
      logger.warn('registerPushTokenAsync: falta extra.eas.projectId en app.json, omitiendo');
      return;
    }

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    await notificationsApi.updatePushToken(expoPushToken);
  } catch (e) {
    logger.error('registerPushTokenAsync: no se pudo registrar el push token', e);
  }
}
