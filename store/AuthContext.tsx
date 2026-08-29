import React, { createContext, useContext, useEffect, useReducer, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, LoginPayload, LoginResponse, RegisterPayload } from '../api/auth';
import { UserData } from '../api/profile';
import { onboardingV2Api } from '../api/onboardingV2';
import { setLogoutHandler } from '../api/client';
import { getToken, setToken, removeToken } from '../helper/secureToken';
import { ACTIVE_SESSION_STORAGE_KEY } from '../helper/workoutSessionBus';
import logger from '../helper/logger';

interface AuthState {
  token: string | null;
  user: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
}

type AuthAction =
  | { type: 'RESTORE_TOKEN'; token: string | null; user: UserData | null; onboardingCompleted: boolean }
  | { type: 'SIGN_IN'; token: string; user: UserData; onboardingCompleted?: boolean }
  | { type: 'SIGN_OUT' }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'UPDATE_USER'; user: UserData }
  | { type: 'SET_ONBOARDING_COMPLETED' };

const initialState: AuthState = {
  token: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  onboardingCompleted: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'RESTORE_TOKEN':
      return {
        ...state,
        token: action.token,
        user: action.user,
        isLoading: false,
        isAuthenticated: action.token !== null,
        onboardingCompleted: action.onboardingCompleted,
      };
    case 'SIGN_IN':
      return {
        ...state,
        token: action.token,
        user: action.user,
        isLoading: false,
        isAuthenticated: true,
        onboardingCompleted: action.onboardingCompleted ?? state.onboardingCompleted,
      };
    case 'SIGN_OUT':
      return {
        ...state,
        token: null,
        user: null,
        isLoading: false,
        isAuthenticated: false,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    case 'UPDATE_USER':
      return { ...state, user: action.user };
    case 'SET_ONBOARDING_COMPLETED':
      return { ...state, onboardingCompleted: true };
    default:
      return state;
  }
}

interface AuthContextType {
  state: AuthState;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: UserData) => void;
  restoreToken: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  /** Ver comentario junto a su implementación -- paso final del registro diferido al final del onboarding. */
  hydrateSession: (userData: LoginResponse['data'], onboardingCompletedNow: boolean) => Promise<void>;
  /** Derivado de state.user?.access_tier !== 'free' — evita repetir la comparación en cada pantalla nueva. */
  isPaidTier: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Clave por usuario (id numérico), no un flag único global -- ver bug real
// corregido más abajo (reportado 2026-08-29: "cada vez que inicio sesión
// con una cuenta existente me manda al onboarding").
function onboardingCompletedKey(userId: number): string {
  return `ONBOARDING_COMPLETED_${userId}`;
}

// Bug real corregido (reportado: el onboarding "se reinicia" para gente que
// ya se registró): `ONBOARDING_COMPLETED` vivía SOLO en AsyncStorage del
// dispositivo, sin ningún respaldo en el backend -- un usuario que ya
// terminó el onboarding volvía a verlo entero si reinstalaba la app o
// entraba desde otro dispositivo, porque ahí esa clave local nunca existió.
// Ahora se prioriza `user.onboarding_completed` (servidor, ver
// docs/ONBOARDING_V2.md) cuando el backend lo manda; el flag local de
// AsyncStorage queda solo como resguardo mientras ese campo no exista
// todavía en la respuesta real del backend.
//
// Segundo bug real corregido (reportado 2026-08-29, mismo síntoma pero tras
// CERRAR sesión, no solo tras reinstalar): ese resguardo local vivía bajo
// una única clave `ONBOARDING_COMPLETED` para TODAS las cuentas del
// dispositivo, y `logout()` la borraba a propósito para que un usuario
// distinto que iniciara sesión después no heredara el onboarding "hecho" de
// la cuenta anterior. Efecto colateral: la MISMA cuenta que cerraba sesión y
// volvía a entrar (backend todavía sin `onboarding_completed` real, ver
// arriba) perdía su propio progreso y volvía a ver el onboarding entero cada
// vez. La clave ahora incluye el id de usuario -- cada cuenta tiene su
// propio resguardo local, así que ya no hace falta borrarlo en logout (no
// hay nada que limpiar para "el siguiente usuario": cada uno lee el suyo).
//
// Tipado mínimo a propósito (no `UserData` completo): `login()`/`register()`
// reciben `LoginResponse['data']` (api/auth.ts), una forma distinta que no
// incluye `user_profile` -- nunca ha sido asignable a `UserData` tal cual
// (de ahí el `as any` ya existente al despachar `SIGN_IN`). Pedir aquí solo
// los campos que de verdad se leen evita ese choque de tipos sin necesitar
// otro `any`.
async function resolveOnboardingCompleted(user: { id?: number; onboarding_completed?: boolean } | null): Promise<boolean> {
  if (user?.onboarding_completed !== undefined) return user.onboarding_completed;
  if (!user?.id) return false;
  const local = await AsyncStorage.getItem(onboardingCompletedKey(user.id));
  return local === 'true';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const restoreToken = useCallback(async () => {
    try {
      let token = await getToken();
      const userJson = await AsyncStorage.getItem('USER');
      const user = userJson ? JSON.parse(userJson) : null;
      // SecureStore (Keychain/Keystore) puede sobrevivir a un desinstalar +
      // reinstalar de la app, a diferencia de AsyncStorage (USER), que
      // siempre se borra. Un token sin su perfil correspondiente es una
      // sesión huérfana de una instalación anterior, no un usuario logueado
      // real -- si se deja pasar, RootNavigator lo manda directo al
      // onboarding en vez de a WelcomeAuth. Se limpia y se trata como
      // logout para forzar a pasar de nuevo por la pantalla de login/registro.
      if (token && !user) {
        await removeToken();
        token = null;
      }
      const onboardingCompleted = await resolveOnboardingCompleted(user);
      dispatch({ type: 'RESTORE_TOKEN', token, user, onboardingCompleted });
    } catch {
      dispatch({ type: 'RESTORE_TOKEN', token: null, user: null, onboardingCompleted: false });
    }
  }, []);

  useEffect(() => {
    restoreToken();
  }, [restoreToken]);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await authApi.login(payload);
    const userData = response.data.data;
    const token = userData.api_token;
    await setToken(token);
    await AsyncStorage.setItem('USER', JSON.stringify(userData));
    const onboardingCompleted = await resolveOnboardingCompleted(userData);
    dispatch({ type: 'SIGN_IN', token, user: userData as any, onboardingCompleted });
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await authApi.register(payload);
    const userData = response.data.data;
    const token = userData.api_token;
    await setToken(token);
    await AsyncStorage.setItem('USER', JSON.stringify(userData));
    const onboardingCompleted = await resolveOnboardingCompleted(userData);
    dispatch({ type: 'SIGN_IN', token, user: userData as any, onboardingCompleted });
  }, []);

  // Pedido explícito 2026-08-29: la screen de registro aparte desaparece --
  // el onboarding ES el registro, la cuenta se crea con las 2 últimas
  // preguntas (email/contraseña, ver constants/onboardingV2Questions.ts,
  // etapa 'credentials'). onboarding_v2_screen.tsx llama a
  // authApi.register() DIRECTAMENTE (no a register() de arriba) para poder
  // fijar el token y enviar las 4 etapas reales al backend ANTES de
  // despachar aquí -- si despachara con register() ahí mismo,
  // isAuthenticated pasaría a true de inmediato y RootNavigator (App.tsx)
  // remontaría todo el stack en mitad del envío (pierde `answers` en
  // memoria, ver comentario grande en onboarding_v2_screen.tsx). Este
  // método es el paso final, ya con todo enviado: fija sesión con el
  // `onboardingCompleted` que decida el caller (false: recién registrado,
  // pendiente de confirmar el resumen en MigratedAssessmentResult, mismo
  // criterio que login/register de arriba con un usuario ya existente).
  const hydrateSession = useCallback(async (userData: LoginResponse['data'], onboardingCompletedNow: boolean) => {
    const token = userData.api_token;
    await setToken(token);
    await AsyncStorage.setItem('USER', JSON.stringify(userData));
    if (onboardingCompletedNow) {
      await AsyncStorage.setItem(onboardingCompletedKey(userData.id), 'true');
    }
    dispatch({ type: 'SIGN_IN', token, user: userData as any, onboardingCompleted: onboardingCompletedNow });
  }, []);

  const logout = useCallback(async () => {
    await removeToken();
    // Limpia tambien el resto de estado ligado a la cuenta que salia -- antes
    // solo se borraba TOKEN/USER, dejando una sesion de entrenamiento activa
    // colgada para el siguiente usuario que inicie sesion en el mismo
    // dispositivo. `ONBOARDING_COMPLETED_<id>` (ver resolveOnboardingCompleted
    // arriba) NO se borra aquí a propósito -- va por id de usuario, no es un
    // flag único global, así que no hay nada que limpiar "para el siguiente
    // usuario": cada cuenta ya lee solo su propia clave.
    //
    // '@bestronger_tutorial_done_challenges' (misma clave literal que
    // store/TutorialContext.tsx -- no se importa desde aquí para no crear un
    // ciclo entre ambos Context, TutorialContext ya importa de este fichero)
    // -- BUG real corregido (auditoría 2026-08-29): sin esto, el progreso de
    // retos completados de la cuenta que cierra sesión seguía en disco, y el
    // siguiente usuario que iniciara sesión en el mismo dispositivo veía
    // retos ya "hechos" que nunca completó. El estado en MEMORIA de esa
    // misma clave se resetea aparte, en TutorialContext, al detectar el
    // cambio de usuario.
    await AsyncStorage.removeMany([
      'USER',
      ACTIVE_SESSION_STORAGE_KEY,
      '@bestronger_tutorial_done_challenges',
    ]);
    dispatch({ type: 'SIGN_OUT' });
  }, []);

  const updateUser = useCallback((user: UserData) => {
    AsyncStorage.setItem('USER', JSON.stringify(user));
    dispatch({ type: 'UPDATE_USER', user });
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (state.user?.id) {
      await AsyncStorage.setItem(onboardingCompletedKey(state.user.id), 'true');
    }
    dispatch({ type: 'SET_ONBOARDING_COMPLETED' });
    // Best-effort, mismo criterio que el resto de onboardingV2Api: el
    // endpoint todavía no existe en el backend, así que esto falla con 404
    // hoy -- no debe bloquear el paso a Home, el flag local ya se guardó.
    try {
      await onboardingV2Api.completeOnboarding();
    } catch (e) {
      logger.error('completeOnboarding: no se pudo marcar en el backend', e);
    }
  }, [state.user]);

  useEffect(() => {
    setLogoutHandler(logout);
  }, [logout]);

  const isPaidTier = state.user?.access_tier !== undefined && state.user.access_tier !== 'free';

  const contextValue = useMemo(
    () => ({ state, login, register, logout, updateUser, restoreToken, completeOnboarding, hydrateSession, isPaidTier }),
    [state, login, register, logout, updateUser, restoreToken, completeOnboarding, hydrateSession, isPaidTier]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
