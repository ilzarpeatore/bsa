import type { TransitionPreset } from '@react-navigation/stack';

// Mismos valores ya usados en components/NavigationTab.tsx (apertura del
// menu "+" de la tab bar: friction 8, tension 80) - reutilizados aqui para
// que la transicion de pantalla completa se sienta de la misma familia que
// el resto de animaciones de la app, en vez de inventar una curva nueva.
export const screenTransitionSpec: TransitionPreset['transitionSpec']['open'] = {
  animation: 'spring',
  config: {
    friction: 8,
    tension: 80,
  },
};
