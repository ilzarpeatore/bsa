import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { authApi } from '@/api/auth';
import { ensureNotificationPermissionsAsync } from './reminderNotifications';

/**
 * Notificaciones push server->dispositivo via Expo Push (decision 2026-09-11,
 * ver auditoria del panel React: reemplaza a OneSignal, que nunca llego a
 * integrarse). Distinto de reminderNotifications.ts, que programa
 * recordatorios 100% locales (agua/comida/personalizados) sin pasar por el
 * servidor -- esto es lo que permite que el backend avise algo real (racha
 * de habito en riesgo, logro, mensaje del coach, push manual del admin).
 *
 * Requiere un proyecto EAS asociado (app.json -> extra.eas.projectId) para
 * poder pedir un token real -- sin eso, getExpoPushTokenAsync() lanza. Se
 * captura y no se interrumpe el login/arranque de la app si falla.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulador/emulador: Expo no puede emitir un token push real.
    return null;
  }

  const granted = await ensureNotificationPermissionsAsync();
  if (!granted) {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId) {
    if (__DEV__) {
      console.warn(
        '[pushNotifications] Falta extra.eas.projectId en app.json — no se puede pedir un token de Expo Push todavía.'
      );
    }
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return token;
  } catch (error) {
    if (__DEV__) {
      console.warn('[pushNotifications] No se pudo obtener el token de Expo Push:', error);
    }
    return null;
  }
}

/** Pide el token y lo manda al backend. Pensado para llamarse tras login y en el arranque de la app si ya hay sesión. No lanza — un fallo aquí nunca debe bloquear el login. */
export async function syncPushTokenWithBackend(): Promise<void> {
  try {
    const token = await registerForPushNotificationsAsync();
    if (!token) {
      return;
    }
    await authApi.updatePushToken(token);
  } catch (error) {
    if (__DEV__) {
      console.warn('[pushNotifications] No se pudo sincronizar el token con el backend:', error);
    }
  }
}
