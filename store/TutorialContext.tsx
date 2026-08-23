import React, { createContext, useContext, useEffect, useCallback, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TUTORIAL_CHALLENGES, TutorialChallenge, TutorialStep } from '../constants/tutorialChallenges';

const STORAGE_KEY = '@befit_tutorial_done_challenges';

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TutorialContextValue {
  doneIds: string[];
  isDone: (id: string) => boolean;
  activeChallenge: TutorialChallenge | null;
  activeStep: TutorialStep | null;
  activeStepIndex: number;
  startChallenge: (id: string) => void;
  skipChallenge: () => void;
  resetAll: () => void;
  registerTarget: (id: string, rect: TargetRect) => void;
  unregisterTarget: (id: string) => void;
  activeTargetRect: TargetRect | null;
  // Screens/handlers llaman a esto justo después de que la acción real
  // (ya existente, no simulada) tiene éxito -- si coincide con lo que el
  // paso activo del reto en curso espera, avanza o cierra el reto. Es un
  // no-op barato si no hay ningún reto activo, así que es seguro llamarlo
  // siempre desde el punto de éxito real, sin comprobar antes si el
  // tutorial está en marcha.
  reportAction: (actionId: string) => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({
  navigationRef,
  children,
}: {
  navigationRef: any;
  children: React.ReactNode;
}) {
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const targetsRef = useRef<Record<string, TargetRect>>({});
  const [activeTargetRect, setActiveTargetRect] = useState<TargetRect | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setDoneIds(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((ids: string[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids)).catch(() => {});
  }, []);

  const activeChallenge = useMemo(
    () => TUTORIAL_CHALLENGES.find((c) => c.id === activeChallengeId) ?? null,
    [activeChallengeId]
  );
  const activeStep = activeChallenge?.steps[activeStepIndex] ?? null;

  const endChallenge = useCallback((markDone: boolean) => {
    setActiveChallengeId((prevId) => {
      if (markDone && prevId) {
        setDoneIds((prev) => {
          if (prev.includes(prevId)) return prev;
          const next = [...prev, prevId];
          persist(next);
          return next;
        });
        // Encadenado (pedido explícito): si este reto define nextChallengeId,
        // el siguiente arranca ya mismo en vez de volver a la lista -- el
        // usuario sigue dentro del flujo real (ver "access-workout" ->
        // "log-first-set").
        const finished = TUTORIAL_CHALLENGES.find((c) => c.id === prevId);
        if (finished?.nextChallengeId) return finished.nextChallengeId;
      }
      return null;
    });
    setActiveStepIndex(0);
  }, [persist]);

  const startChallenge = useCallback((id: string) => {
    setActiveChallengeId(id);
    setActiveStepIndex(0);
  }, []);

  const skipChallenge = useCallback(() => {
    endChallenge(false);
  }, [endChallenge]);

  const resetAll = useCallback(() => {
    setDoneIds([]);
    persist([]);
  }, [persist]);

  const registerTarget = useCallback((id: string, rect: TargetRect) => {
    targetsRef.current[id] = rect;
    if (activeStep?.targetId === id) setActiveTargetRect(rect);
  }, [activeStep?.targetId]);

  const unregisterTarget = useCallback((id: string) => {
    delete targetsRef.current[id];
    if (activeStep?.targetId === id) setActiveTargetRect(null);
  }, [activeStep?.targetId]);

  // Al cambiar de paso (o de reto), el objetivo ya registrado para ese paso
  // (si la pantalla ya estaba montada) se recupera de inmediato; si la
  // pantalla todavía no existe, se queda en null hasta que esa pantalla
  // llame a registerTarget al enfocarse.
  useEffect(() => {
    if (activeStep?.targetId) {
      setActiveTargetRect(targetsRef.current[activeStep.targetId] ?? null);
    } else {
      setActiveTargetRect(null);
    }
  }, [activeStep?.targetId]);

  const advanceOrFinish = useCallback(() => {
    if (!activeChallenge) return;
    const nextIndex = activeStepIndex + 1;
    if (nextIndex >= activeChallenge.steps.length) {
      endChallenge(true);
    } else {
      setActiveStepIndex(nextIndex);
    }
  }, [activeChallenge, activeStepIndex, endChallenge]);

  // Pasos "skippable" (ver constants/tutorialChallenges.ts) apuntan a una
  // métrica concreta (reps/descanso/rir/rpe) que el coach puede no haber
  // configurado en ESTE ejercicio -- sin esto, el tutorial se quedaría
  // esperando para siempre un elemento que nunca va a registrarse. Si el
  // target no aparece en un tiempo razonable (ya dentro de la pantalla
  // correcta, dado que el paso anterior ya navegó ahí de verdad), se asume
  // que ese ejercicio no usa esa métrica y se avanza solo al siguiente paso.
  useEffect(() => {
    if (!activeStep?.skippable || !activeStep.targetId || activeTargetRect) return;
    const timeout = setTimeout(() => advanceOrFinish(), 2500);
    return () => clearTimeout(timeout);
  }, [activeStep, activeTargetRect, advanceOrFinish]);

  const reportAction = useCallback((actionId: string) => {
    if (!activeStep) return;
    if (activeStep.completion.type === 'action' && activeStep.completion.actionId === actionId) {
      advanceOrFinish();
    }
  }, [activeStep, advanceOrFinish]);

  // Completado por navegación: en vez de instrumentar cada pantalla
  // destino, escuchamos el estado del navigator raíz una sola vez aquí.
  useEffect(() => {
    if (!navigationRef?.current?.addListener) return;
    const unsubscribe = navigationRef.current.addListener('state', () => {
      if (!activeStep || activeStep.completion.type !== 'navigate') return;
      const current = navigationRef.current?.getCurrentRoute?.()?.name;
      if (current === activeStep.completion.screen) advanceOrFinish();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, navigationRef]);

  const value: TutorialContextValue = {
    doneIds,
    isDone: (id) => doneIds.includes(id),
    activeChallenge,
    activeStep,
    activeStepIndex,
    startChallenge,
    skipChallenge,
    resetAll,
    registerTarget,
    unregisterTarget,
    activeTargetRect,
    reportAction,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error('useTutorial debe usarse dentro de <TutorialProvider>');
  }
  return ctx;
}
