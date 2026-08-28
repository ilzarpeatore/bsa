// Controlador global de toasts, imperativo (importable desde cualquier sitio,
// como Alert.alert) -- construido para migrar los ~100 Alert.alert de feedback
// simple (un solo boton "OK"/aviso, sin eleccion real del usuario) sin tener
// que convertir cada pantalla que los usa en consumidora de un hook. Mismo
// patron ya usado en el repo para estado global sin Context (ver
// helper/workoutSessionBus.ts): un pequeno pub/sub a nivel de modulo +
// un componente montado una vez cerca de la raiz (ToastHost, en App.tsx) que
// se suscribe y pinta. Los componentes visuales (Toast/ToastTitle/ToastDescription,
// components/ui/toast) ya existian de Fase 3 sin ningun consumidor real.
//
// Los Alert.alert con 2+ botones (confirmar/cancelar, acciones destructivas)
// NO se migran -- un toast no bloquea ni puede sustituir una eleccion real,
// se quedan como Alert.alert a proposito.

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'muted';

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let listener: Listener | null = null;
let nextId = 1;

function emit() {
  listener?.(toasts);
}

export function subscribeToasts(fn: Listener): () => void {
  listener = fn;
  fn(toasts);
  return () => {
    if (listener === fn) listener = null;
  };
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function showToast(
  title: string,
  opts?: { description?: string; variant?: ToastVariant; duration?: number }
): number {
  const id = nextId++;
  toasts = [...toasts, { id, title, description: opts?.description, variant: opts?.variant ?? 'muted' }];
  emit();
  const duration = opts?.duration ?? 3500;
  setTimeout(() => dismissToast(id), duration);
  return id;
}
