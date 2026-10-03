import { dropWeight, formatTechnique, partsConfigFor, partsPayload, resolveTechnique, techniqueAppliesToRow, totalReps } from './workoutTechnique';

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

describe('registro por partes', () => {
  const info = (key: string, lastSetOnly = false) => ({
    key,
    label: key,
    description: '',
    steps: [],
    mistakes: [],
    logging: '',
    lastSetOnly,
  });

  it('aplica a todas las series o solo a la última', () => {
    expect(techniqueAppliesToRow(info('rest_pause'), 0, 3)).toBe(true);
    expect(techniqueAppliesToRow(info('rest_pause', true), 1, 3)).toBe(false);
    expect(techniqueAppliesToRow(info('rest_pause', true), 2, 3)).toBe(true);
    expect(techniqueAppliesToRow(null, 0, 3)).toBe(false);
  });

  it('solo las técnicas por tramos tienen botón, con pausa donde toca', () => {
    expect(partsConfigFor(info('drop_sets'))?.pauseSeconds).toBeNull();
    expect(partsConfigFor(info('rest_pause'))?.pauseSeconds).toBe(15);
    expect(partsConfigFor(info('bisets'))).toBeNull();
  });

  it('la bajada propone ~20 % menos redondeado a 2,5 kg', () => {
    expect(dropWeight(100)).toBe(80);
    expect(dropWeight(22.5)).toBe(17.5);
    expect(dropWeight(5)).toBe(2.5);
    expect(dropWeight(null)).toBeNull();
  });

  it('envía solo tramos con repeticiones y suma el total', () => {
    const parts = [
      { carga: '80', reps: '3' },
      { carga: '', reps: '2' },
      { carga: '70', reps: '' },
    ];
    expect(partsPayload(parts)).toEqual([
      { carga: 80, reps: 3 },
      { carga: null, reps: 2 },
    ]);
    expect(totalReps('8', parts)).toBe(13);
  });
});
