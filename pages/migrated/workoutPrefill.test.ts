import {
  findSetsInRange,
  isNumericValue,
  parseRepRange,
  performanceSessions,
  pickReferenceSet,
} from './workoutPrefill';

describe('parseRepRange', () => {
  test.each([
    ['12-15', { min: 12, max: 15 }],
    [' 12 - 15 ', { min: 12, max: 15 }],
    ['12–15', { min: 12, max: 15 }], // guion largo
    ['12 a 15', { min: 12, max: 15 }],
    ['15-12', { min: 12, max: 15 }], // al revés
    ['10', { min: 10, max: 10 }],
    [10, { min: 10, max: 10 }],
    ['8,5', { min: 8.5, max: 8.5 }],
  ])('%p -> %p', (raw, expected) => {
    expect(parseRepRange(raw)).toEqual(expected);
  });

  test.each([['AMRAP'], ['10-12/lado'], ['al fallo'], [''], [null], [undefined], ['Subir']])('%p -> null', (raw) => {
    expect(parseRepRange(raw)).toBeNull();
  });
});

describe('isNumericValue', () => {
  test('acepta números y decimales con coma; rechaza rangos, texto y vacío', () => {
    expect(isNumericValue('12')).toBe(true);
    expect(isNumericValue(12.5)).toBe(true);
    expect(isNumericValue('12,5')).toBe(true);
    expect(isNumericValue('0')).toBe(true);
    expect(isNumericValue('12-15')).toBe(false);
    expect(isNumericValue('Subir')).toBe(false);
    expect(isNumericValue('')).toBe(false);
    expect(isNumericValue(null)).toBe(false);
  });
});

describe('findSetsInRange', () => {
  const range = { min: 12, max: 15 };

  test('coge la sesión MÁS RECIENTE que tenga series dentro del rango (inclusive)', () => {
    const sessions = [
      { date: '2026-09-24', sets: [{ reps: 8, carga: 50 }, { reps: 8, carga: 50 }] }, // fuera del rango
      { date: '2026-09-17', sets: [{ reps: 12, carga: 40 }, { reps: 15, carga: 40 }, { reps: 10, carga: 45 }] },
      { date: '2026-09-10', sets: [{ reps: 13, carga: 35 }] },
    ];
    expect(findSetsInRange(sessions, range)).toEqual([
      { reps: 12, carga: 40 },
      { reps: 15, carga: 40 },
    ]);
  });

  test('ignora series sin carga numérica o con reps no numéricas', () => {
    const sessions = [{ sets: [{ reps: 12 }, { reps: '12-15', carga: 40 }, { reps: 13, carga: '' }, { reps: '13', carga: '42,5' }] }];
    expect(findSetsInRange(sessions, range)).toEqual([{ reps: '13', carga: '42,5' }]);
  });

  test('sin ninguna serie comparable devuelve vacío', () => {
    expect(findSetsInRange([{ sets: [{ reps: 8, carga: 50 }] }], range)).toEqual([]);
    expect(findSetsInRange([], range)).toEqual([]);
    expect(findSetsInRange([{ sets: undefined as any }], range)).toEqual([]);
  });
});

describe('performanceSessions', () => {
  test('usa recent_performance si viene y, si no, la última sesión', () => {
    const recent = [{ date: '2026-09-24', sets: [{ reps: 12, carga: 40 }] }];
    expect(performanceSessions(recent, { sets: [{ reps: 1, carga: 1 }] })).toBe(recent);
    expect(performanceSessions(null, { sets: [{ reps: 1, carga: 1 }] })).toEqual([{ sets: [{ reps: 1, carga: 1 }] }]);
    expect(performanceSessions([], { sets: [] })).toEqual([]);
    expect(performanceSessions(undefined, null)).toEqual([]);
  });
});

describe('pickReferenceSet', () => {
  const sets = [{ carga: 40 }, { carga: 45 }, { carga: 50 }];
  test('misma posición y, si hay más filas que series, la última', () => {
    expect(pickReferenceSet(sets, 0)).toEqual({ carga: 40 });
    expect(pickReferenceSet(sets, 2)).toEqual({ carga: 50 });
    expect(pickReferenceSet(sets, 5)).toEqual({ carga: 50 });
    expect(pickReferenceSet([], 0)).toBeUndefined();
  });
});
