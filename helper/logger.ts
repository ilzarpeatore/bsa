import AsyncStorage from '@react-native-async-storage/async-storage';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = __DEV__ ?? false;

function log(level: LogLevel, ...args: unknown[]) {
  if (isDev || level === 'error') {
    switch (level) {
      case 'error':
        console.error(...args);
        break;
      case 'warn':
        console.warn(...args);
        break;
      case 'info':
      case 'debug':
      default:

        console.log(...args);
        break;
    }
  }

  bufferForDiagnostics(level, args);
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
};

export default logger;

// --- "Habilitar diagnósticos" / "Enviar registros al desarrollador" ---
// (Ajustes, pedido explícito con captura de referencia). El proyecto no
// tiene ningún SDK de crash-reporting/analytics instalado
// (@sentry/react-native no está en package.json) -- en vez de simular un
// switch de "diagnósticos" que no controla nada real, este flag
// activa/desactiva un buffer en memoria de los propios logs de la app
// (los mismos que ya pasan por logger.debug/info/warn/error en todo el
// código, incluyendo los niveles que en producción no llegan a la
// consola). "Enviar registros al desarrollador" exporta ese buffer con
// Share.share() (API nativa de React Native, sin dependencia nueva) -- si
// el diagnóstico nunca se activó no hay nada que enviar, y el botón lo
// dice en vez de mandar un reporte vacío.
const DIAGNOSTICS_STORAGE_KEY = '@bestronger_diagnostics_enabled';
const MAX_BUFFERED_LOGS = 300;

let diagnosticsEnabled = false;
AsyncStorage.getItem(DIAGNOSTICS_STORAGE_KEY).then((v) => {
  diagnosticsEnabled = v === 'true';
});

interface BufferedLog {
  level: LogLevel;
  message: string;
  timestamp: number;
}
let buffer: BufferedLog[] = [];

function formatArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function bufferForDiagnostics(level: LogLevel, args: unknown[]) {
  if (!diagnosticsEnabled) return;
  buffer.push({ level, message: args.map(formatArg).join(' '), timestamp: Date.now() });
  if (buffer.length > MAX_BUFFERED_LOGS) buffer.shift();
}

export function isDiagnosticsEnabled(): boolean {
  return diagnosticsEnabled;
}

// Lectura fresca desde AsyncStorage (no confiar en el valor cargado al
// arrancar el módulo, que puede no haber resuelto todavía) -- para que la
// pantalla de Ajustes inicialice el switch con el valor real guardado.
export async function loadDiagnosticsEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(DIAGNOSTICS_STORAGE_KEY);
  diagnosticsEnabled = v === 'true';
  return diagnosticsEnabled;
}

export async function setDiagnosticsEnabled(enabled: boolean): Promise<void> {
  diagnosticsEnabled = enabled;
  await AsyncStorage.setItem(DIAGNOSTICS_STORAGE_KEY, enabled ? 'true' : 'false');
  if (!enabled) buffer = [];
}

export function getDiagnosticsReportText(): string | null {
  if (buffer.length === 0) return null;
  return buffer.map((b) => `[${new Date(b.timestamp).toISOString()}] ${b.level.toUpperCase()}: ${b.message}`).join('\n');
}
