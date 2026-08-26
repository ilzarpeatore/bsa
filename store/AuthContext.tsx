import React, { createContext, useContext, useEffect, useReducer, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, LoginPayload, RegisterPayload } from '../api/auth';
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
  /** Derivado de state.user?.access_tier !== 'free' — evita repetir la comparación en cada pantalla nueva. */
  isPaidTier: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Bug real corregido (reportado: el onboarding "se reinicia" para gente que
// ya se registró): `ONBOARDING_COMPLETED` vivía SOLO en AsyncStorage del
// dispositivo, sin ningún respaldo en el backend -- un usuario que ya
// terminó el onboarding volvía a verlo entero si reinstalaba la app o
// entraba desde otro dispositivo, porque ahí esa clave local nunca existió.
// Ahora se prioriza `user.onboarding_completed` (servidor, ver
// docs/ONBOARDING_V2.md) cuando el backend lo manda; el flag local de
// AsyncStorage queda solo como resguardo mientras ese campo no exista
// todavía en la respuesta real del backend.
// Tipado mínimo a propósito (no `UserData` completo): `login()`/`register()`
// reciben `LoginResponse['data']` (api/auth.ts), una forma distinta que no
// incluye `user_profile` -- nunca ha sido asignable a `UserData` tal cual
// (de ahí el `as any` ya existente al despachar `SIGN_IN`). Pedir aquí solo
// el campo que de verdad se lee evita ese choque de tipos sin necesitar otro
// `any`.
async function resolveOnboardingCompleted(user: { onboarding_completed?: boolean } | null): Promise<boolean> {
  if (user?.onboarding_completed !== undefined) return user.onboarding_completed;
  const local = await AsyncStorage.getItem('ONBOARDING_COMPLETED');
  return local === 'true';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const restoreToken = useCallback(async () => {
    try {
      const token = await getToken();
      const userJson = await AsyncStorage.getItem('USER');
      const user = userJson ? JSON.parse(userJson) : null;
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

  const logout = useCallback(async () => {
    await removeToken();
    // Limpia tambien el resto de estado ligado a la cuenta que salia -- antes
    // solo se borraba TOKEN/USER, dejando ONBOARDING_COMPLETED y una sesion
    // de entrenamiento activa colgados para el siguiente usuario que inicie
    // sesion en el mismo dispositivo.
    await AsyncStorage.removeMany(['USER', 'ONBOARDING_COMPLETED', ACTIVE_SESSION_STORAGE_KEY]);
    dispatch({ type: 'SIGN_OUT' });
  }, []);

  const updateUser = useCallback((user: UserData) => {
    AsyncStorage.setItem('USER', JSON.stringify(user));
    dispatch({ type: 'UPDATE_USER', user });
  }, []);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem('ONBOARDING_COMPLETED', 'true');
    dispatch({ type: 'SET_ONBOARDING_COMPLETED' });
    // Best-effort, mismo criterio que el resto de onboardingV2Api: el
    // endpoint todavía no existe en el backend, así que esto falla con 404
    // hoy -- no debe bloquear el paso a Home, el flag local ya se guardó.
    try {
      await onboardingV2Api.completeOnboarding();
    } catch (e) {
      logger.error('completeOnboarding: no se pudo marcar en el backend', e);
    }
  }, []);

  useEffect(() => {
    setLogoutHandler(logout);
  }, [logout]);

  const isPaidTier = state.user?.access_tier !== undefined && state.user.access_tier !== 'free';

  const contextValue = useMemo(
    () => ({ state, login, register, logout, updateUser, restoreToken, completeOnboarding, isPaidTier }),
    [state, login, register, logout, updateUser, restoreToken, completeOnboarding, isPaidTier]
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
