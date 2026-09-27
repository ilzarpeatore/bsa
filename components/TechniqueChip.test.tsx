import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import TechniqueChip from './TechniqueChip';
import type { TechniqueInfo } from '../pages/migrated/workoutTechnique';

/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('@helper/useAppColorMode', () => ({
  useAppColorMode: () => ({ colors: new Proxy({}, { get: () => '#000000' }) }),
}));
jest.mock('@components/ui/hstack', () => ({ HStack: require('react-native').View }));
jest.mock('@components/ui/text', () => ({ Text: require('react-native').Text }));
jest.mock('@components/ui/pressable', () => ({ Pressable: require('react-native').Pressable }));
jest.mock('@components/ui/icon', () => ({ Icon: () => null }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../pages/migrated/theme', () => ({ FONT: new Proxy({}, { get: () => 'System' }) }));
// La hoja real usa el Actionsheet de gluestack; aquí basta con pintar su contenido al abrirse.
jest.mock('./SimpleBottomSheet', () => ({
  __esModule: true,
  default: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? require('react').createElement(require('react-native').View, null, children) : null,
}));

const restPause: TechniqueInfo = {
  key: 'rest_pause',
  label: 'Rest-pause',
  description: 'Tras llegar al fallo haces una pausa corta y sigues con el mismo peso.',
  steps: ['Haz la serie hasta el fallo técnico.', 'Respira 15-20 segundos.', 'Vuelve a hacer repeticiones hasta el fallo.'],
  mistakes: ['Perder la técnica para arañar una repetición más.'],
  logging: 'Apunta el total de repeticiones.',
  lastSetOnly: true,
};

describe('TechniqueChip', () => {
  test('sin técnica no pinta nada', async () => {
    await render(<TechniqueChip info={null} />);
    expect(screen.toJSON()).toBeNull();
  });

  test('muestra la técnica y al pulsarla abre la ficha con el paso a paso', async () => {
    await render(<TechniqueChip info={restPause} exerciseTitle="Dominada" />);
    expect(screen.getByText('Rest-pause · última serie')).toBeTruthy();
    expect(screen.queryByText('Paso a paso')).toBeNull();

    await fireEvent.press(screen.getByLabelText(/Técnica especial: Rest-pause/));

    expect(screen.getByText('TÉCNICA ESPECIAL')).toBeTruthy();
    expect(screen.getByText('Dominada')).toBeTruthy();
    expect(screen.getByText('Solo en la última serie')).toBeTruthy();
    expect(screen.getByText('Paso a paso')).toBeTruthy();
    expect(screen.getByText('Respira 15-20 segundos.')).toBeTruthy();
    expect(screen.getByText('Perder la técnica para arañar una repetición más.')).toBeTruthy();
    expect(screen.getByText('Apunta el total de repeticiones.')).toBeTruthy();

    await fireEvent.press(screen.getByText('ENTENDIDO'));
    expect(screen.queryByText('Paso a paso')).toBeNull();
  });

  test('en la fila de la serie dice «en esta serie»', async () => {
    await render(<TechniqueChip info={restPause} variant="row" />);
    expect(screen.getByText('Rest-pause en esta serie')).toBeTruthy();
  });
});
