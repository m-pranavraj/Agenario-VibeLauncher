type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel) {
  currentLevel = level;
}

export const logger = {
  debug: (msg: string) => log('debug', msg),
  info: (msg: string) => log('info', msg),
  warn: (msg: string) => log('warn', msg),
  error: (msg: string) => log('error', msg),
};

function log(level: LogLevel, message: string) {
  if (levels[level] >= levels[currentLevel]) {
    const timestamp = new Date().toISOString();
    console[level === 'error' ? 'error' : 'log'](`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }
}
