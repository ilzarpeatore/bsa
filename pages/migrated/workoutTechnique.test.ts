import { formatTechnique, resolveTechnique } from './workoutTechnique';

const catalog = [
  {
    key: 'rest_pause',
    label: 'Rest-pause',
    description: 'Llega al fallo, pausa 15-20 s y continúa hasta el fallo otra vez.',
    steps: ['Hasta el fallo.', 'Pausa 15-20 s.', 'Otra vez hasta el fallo.'],
    mistakes: ['Perder la técnica.'],
    logging: 'Apunta el total de repeticiones.',
  },
  { key: 'otra', label: 'Otra', description: 'Técnica indicada por tu entrenador.', steps: [], mistakes: [], logging: 'Como te indique.' },
];

describe('resolveTechnique', () => {
  test('sin técnica -> null', () => {
    expect(resolveTechnique({ series: '3' }, catalog)).toBeNull();
    expect(resolveTechnique(null, catalog)).toBeNull();
    expect(resolveTechnique({ tecnica: '  ' }, catalog)).toBeNull();
  });

  test('técnica del catálogo, solo en la última serie', () => {
    const info = resolveTechnique({ tecnica: 'rest_pause', tecnica_series: 'ultima' }, catalog);
    expect(info).toEqual({
      key: 'rest_pause',
      label: 'Rest-pause',
      description: 'Llega al fallo, pausa 15-20 s y continúa hasta el fallo otra vez.',
      steps: ['Hasta el fallo.', 'Pausa 15-20 s.', 'Otra vez hasta el fallo.'],
      mistakes: ['Perder la técnica.'],
      logging: 'Apunta el total de repeticiones.',
      lastSetOnly: true,
    });
    expect(formatTechnique(info!)).toBe('Rest-pause · última serie');
  });

  test('«otra» usa el texto del coach como nombre', () => {
    const info = resolveTechnique({ tecnica: 'otra', tecnica_otra: 'Pausa 2 s arriba', tecnica_series: 'todas' }, catalog);
    expect(info).toMatchObject({ key: 'otra', label: 'Pausa 2 s arriba', description: 'Técnica indicada por tu entrenador.', steps: [], lastSetOnly: false });
    expect(formatTechnique(info!)).toBe('Pausa 2 s arriba');
  });

  test('sin catálogo (sin red) se muestra igual con la clave legible', () => {
    expect(resolveTechnique({ tecnica: 'drop_sets_mecanicos' }, [])).toEqual({
      key: 'drop_sets_mecanicos',
      label: 'drop sets mecanicos',
      description: '',
      steps: [],
      mistakes: [],
      logging: '',
      lastSetOnly: false,
    });
  });
});
