/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('./logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

function load(nativeModule: unknown, turboModule: unknown) {
  jest.resetModules();
  jest.doMock('react-native', () => ({
    Platform: { OS: 'ios' },
    NativeModules: { LiveActivityModule: nativeModule },
    TurboModuleRegistry: { get: jest.fn(() => turboModule) },
  }));
  return require('./liveActivity') as typeof import('./liveActivity');
}

const fullModule = () => ({
  startActivity: jest.fn(),
  updateActivity: jest.fn(),
  endActivity: jest.fn(),
  diagnose: jest.fn(async () => ({ enabled: true, activeCount: 0, lastStartResult: 'startActivity OK (id x)' })),
  testActivity: jest.fn(async () => ({ ok: true, id: 'abc' })),
});

describe('liveActivity', () => {
  test('sin módulo nativo el diagnóstico lo dice y arrancar no rompe', async () => {
    const la = load(undefined, null);
    expect(() => la.startWorkoutLiveActivity('Torso', { exerciseName: 'Press', exerciseIndex: 1, totalExercises: 1, setLabel: 'Serie 1/3', isResting: false })).not.toThrow();
    expect(await la.diagnoseLiveActivity()).toContain('NO disponible');
  });

  test('si no está en NativeModules lo busca en TurboModuleRegistry (nueva arquitectura)', async () => {
    const mod = fullModule();
    const la = load(undefined, mod);
    la.startWorkoutLiveActivity('Torso', { exerciseName: 'Press', exerciseIndex: 1, totalExercises: 1, setLabel: 'Serie 1/3', isResting: false });
    expect(mod.startActivity).toHaveBeenCalledWith(expect.objectContaining({ workoutTitle: 'Torso', exerciseName: 'Press' }));
    const report = await la.diagnoseLiveActivity();
    expect(report).toContain('vía TurboModuleRegistry');
    expect(report).toContain('Live Activity de prueba creada');
    expect(report).toContain('startActivity OK');
  });

  test('informa del error real de iOS al crear la de prueba', async () => {
    const mod = { ...fullModule(), testActivity: jest.fn(async () => ({ ok: false, error: 'unsupportedTarget' })) };
    const la = load(mod, null);
    const report = await la.diagnoseLiveActivity();
    expect(report).toContain('vía NativeModules');
    expect(report).toContain('unsupportedTarget');
  });

  test('diseño clásico/nuevo: lee el estado del módulo y lo cambia', async () => {
    const mod = { ...fullModule(), diagnose: jest.fn(async () => ({ enabled: true, activeCount: 0, lastStartResult: 'x', classicLayout: false })), setClassicLayout: jest.fn() };
    const la = load(mod, null);
    expect(await la.getLiveActivityClassicLayout()).toBe(false);
    expect(await la.diagnoseLiveActivity()).toContain('Diseño: nuevo');
    la.setLiveActivityClassicLayout(true);
    expect(mod.setClassicLayout).toHaveBeenCalledWith(true);
  });

  test('build sin interruptor de diseño: null y sin romper', async () => {
    const la = load(fullModule(), null);
    expect(await la.getLiveActivityClassicLayout()).toBeNull();
    expect(() => la.setLiveActivityClassicLayout(true)).not.toThrow();
  });
});
