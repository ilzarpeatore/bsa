// helper/monitoring.ts lee las claves de process.env al importarse, así que
// cada caso carga el módulo de nuevo (isolateModules) con su propio entorno.
const mockSentry = {
  init: jest.fn(),
  wrap: jest.fn((c) => c),
  setUser: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  reactNavigationIntegration: jest.fn(() => ({ registerNavigationContainer: jest.fn() })),
};
const mockPosthog = {
  screen: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
  optIn: jest.fn(),
  optOut: jest.fn(),
};

jest.mock('@sentry/react-native', () => mockSentry);
jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: jest.fn(() => mockPosthog),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

type Monitoring = typeof import('./monitoring');

function load(env: Record<string, string | undefined>, dev = false): Monitoring {
  Object.assign(process.env, env);
  (global as { __DEV__?: boolean }).__DEV__ = dev;
  let mod: Monitoring | undefined;
  jest.isolateModules(() => {
    mod = require('./monitoring');
  });
  return mod!;
}

const ENV_KEYS = ['EXPO_PUBLIC_SENTRY_DSN', 'EXPO_PUBLIC_POSTHOG_KEY'];

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of ENV_KEYS) delete process.env[k];
});

describe('monitoring sin claves', () => {
  it('no inicializa nada y las llamadas son no-ops', () => {
    const m = load({});
    expect(mockSentry.init).not.toHaveBeenCalled();
    expect(m.posthog).toBeNull();
    m.trackScreen('MigratedHomeModern');
    m.identifyUser({ id: 7 });
    m.reportError([new Error('x')]);
    expect(mockSentry.setUser).not.toHaveBeenCalled();
    expect(mockSentry.captureException).not.toHaveBeenCalled();
  });

  it('en __DEV__ tampoco envía aunque haya claves', () => {
    const m = load(
      {
        EXPO_PUBLIC_SENTRY_DSN: 'https://k@o.ingest.sentry.io/1',
        EXPO_PUBLIC_POSTHOG_KEY: 'phc_x',
      },
      true,
    );
    expect(mockSentry.init).not.toHaveBeenCalled();
    expect(m.posthog).toBeNull();
  });
});

describe('monitoring con claves', () => {
  const env = {
    EXPO_PUBLIC_SENTRY_DSN: 'https://k@o.ingest.sentry.io/1',
    EXPO_PUBLIC_POSTHOG_KEY: 'phc_x',
  };

  it('inicializa Sentry sin datos personales por defecto', () => {
    load(env);
    expect(mockSentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: env.EXPO_PUBLIC_SENTRY_DSN, sendDefaultPii: false }),
    );
  });

  it('registra cada pantalla una vez aunque se repita', () => {
    const m = load(env);
    m.trackScreen('MigratedHomeModern');
    m.trackScreen('MigratedHomeModern');
    m.trackScreen('MigratedPlan');
    m.trackScreen(undefined);
    expect(mockPosthog.screen.mock.calls).toEqual([['MigratedHomeModern'], ['MigratedPlan']]);
  });

  it('identifica solo por id y desvincula al cerrar sesión', () => {
    const m = load(env);
    m.identifyUser({ id: 42, access_tier: 'premium' });
    expect(mockSentry.setUser).toHaveBeenLastCalledWith({ id: '42' });
    expect(mockPosthog.identify).toHaveBeenLastCalledWith('42', { access_tier: 'premium' });
    m.identifyUser(null);
    expect(mockSentry.setUser).toHaveBeenLastCalledWith(null);
    expect(mockPosthog.reset).toHaveBeenCalled();
  });

  it('manda el Error con su texto, o el texto como mensaje si no hay Error', () => {
    const m = load(env);
    const err = new Error('boom');
    m.reportError(['Fetch failed:', err]);
    expect(mockSentry.captureException).toHaveBeenCalledWith(err, {
      extra: { message: 'Fetch failed:' },
    });
    m.reportError(['Algo raro', { code: 500 }]);
    expect(mockSentry.captureMessage).toHaveBeenCalledWith('Algo raro {"code":500}', 'error');
  });

  it('el ajuste de privacidad hace optOut/optIn en PostHog', async () => {
    const m = load(env);
    await m.setAnalyticsEnabled(false);
    expect(mockPosthog.optOut).toHaveBeenCalled();
    await m.setAnalyticsEnabled(true);
    expect(mockPosthog.optIn).toHaveBeenCalled();
  });
});
