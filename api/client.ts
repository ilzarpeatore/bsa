import axios from 'axios';
import Constants from 'expo-constants';
import { getToken, removeToken } from '../helper/secureToken';

function resolveBaseUrl(): string {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
    const ip = hostUri?.split(':')[0];
    if (ip) return `http://${ip}:8000/api`;
  }
  if (__DEV__) {
    // USB con adb reverse tcp:8000 tcp:8000 (ver docs/ARRANQUE_DESARROLLO.md) - inmune a cambios de IP
    return 'http://localhost:8000/api';
  }
  return Constants.expoConfig?.extra?.apiBaseUrl
    || (Constants as any).manifest?.extra?.apiBaseUrl
    || 'https://testapp.bestronger.es/api';
}

const BASE_URL = resolveBaseUrl();

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
  },
});

let logoutHandler: (() => void) | null = null;

export function setLogoutHandler(handler: () => void) {
  logoutHandler = handler;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await removeToken();
      if (logoutHandler) {
        logoutHandler();
      }
    }
    // Un error 5xx puede traer detalle interno del servidor (stack trace,
    // nombre de tabla/query) en el body -- las pantallas de toda la app leen
    // err.response?.data?.message directamente en su Alert de error, asi que
    // se sanea aqui una vez en vez de en cada uno de los ~10 sitios que lo
    // hacen. Los errores 4xx (validacion de formulario) se dejan intactos,
    // son mensajes pensados para el usuario.
    if (error.response?.status >= 500 && error.response?.data) {
      error.response.data.message = 'Ha ocurrido un error en el servidor. Inténtalo de nuevo más tarde.';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
