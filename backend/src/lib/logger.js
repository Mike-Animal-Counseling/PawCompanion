const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
const SENSITIVE = /password|token|secret|authorization|cookie|email|message|content/i;

function redact(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, SENSITIVE.test(key) ? '[redacted]' : redact(item, depth + 1)]),
    );
  }
  return value;
}

function write(level, event, fields = {}) {
  const threshold = LEVELS[process.env.LOG_LEVEL || 'info'] ?? LEVELS.info;
  if (LEVELS[level] < threshold) return;
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    event,
    ...redact(fields),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event, fields) => write('debug', event, fields),
  info: (event, fields) => write('info', event, fields),
  warn: (event, fields) => write('warn', event, fields),
  error: (event, fields) => write('error', event, fields),
};
