import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// El token de sesion es una credencial completa (equivale a un access token
// de larga duracion, no hay refresh token en el backend) - SecureStore usa
// Keychain en iOS / Keystore-backed EncryptedSharedPreferences en Android,
// a diferencia de AsyncStorage (texto plano en disco, recuperable con
// jailbreak/root o un backup sin cifrar). Solo el token vive aqui; el resto
// de datos de perfil (USER) no son una credencial y se quedan en
// AsyncStorage sin cambios.
const TOKEN_KEY = 'TOKEN';

export async function getToken() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) return token;
  // Migracion desde versiones anteriores (token guardado en AsyncStorage sin
  // cifrar): si existe uno ahi, se mueve a SecureStore una sola vez para no
  // cerrar la sesion de usuarios ya logueados al actualizar la app.
  const legacy = await AsyncStorage.getItem(TOKEN_KEY);
  if (legacy) {
    await SecureStore.setItemAsync(TOKEN_KEY, legacy);
    await AsyncStorage.removeItem(TOKEN_KEY);
    return legacy;
  }
  return null;
}

export function setToken(token: string) {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await AsyncStorage.removeItem(TOKEN_KEY);
}
