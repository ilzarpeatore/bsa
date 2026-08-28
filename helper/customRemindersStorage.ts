import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimeOfDay } from './reminderNotifications';

// No existe una tabla de backend para recordatorios personalizados (solo agua/comida
// se guardan en el perfil vía set-reminder-settings) — se quedan 100% en el dispositivo,
// junto a los ids de notificación local para poder cancelarlos al borrar.
const STORAGE_KEY = 'bestronger.customReminders';

export interface CustomReminder {
  id: string;
  title: string;
  description: string;
  time: TimeOfDay;
  days: number[]; // 0=Lunes..6=Domingo
  isDaily: boolean;
  notificationIds: string[];
}

export async function getCustomReminders(): Promise<CustomReminder[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addCustomReminder(reminder: CustomReminder): Promise<void> {
  const list = await getCustomReminders();
  list.push(reminder);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function removeCustomReminder(id: string): Promise<void> {
  const list = await getCustomReminders();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list.filter((r) => r.id !== id)));
}
