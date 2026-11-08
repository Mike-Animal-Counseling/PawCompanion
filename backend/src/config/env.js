import 'dotenv/config';

const PLACEHOLDER_SECRET = /replace|change.?me|dev[._-]?secret|example|your[._-]?secret|placeholder/i;
const ROLES = new Set(['customer', 'merchant', 'admin']);

function fail(message) {
  const error = new Error(`Configuration error: ${message}`);
  error.name = 'ConfigurationError';
  throw error;
}

function parseOrigins(value, production) {
  const origins = String(value || (production ? '' : 'http://localhost:3000,http://127.0.0.1:3000'))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!origins.length) fail('CORS_ORIGIN must list at least one allowed origin');
  if (origins.includes('*')) fail('CORS_ORIGIN cannot use a wildcard when credentials are enabled');

  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.origin !== origin || url.username || url.password) throw new Error();
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      if (production && url.protocol !== 'https:') fail('CORS_ORIGIN must use HTTPS in production');
    } catch {
      fail(`CORS_ORIGIN contains an invalid origin: ${origin}`);
    }
  }

  return origins;
}

function parsePositiveInt(value, fallback, name, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) fail(`${name} must be an integer between ${min} and ${max}`);
  return parsed;
}

/**
 * Load and validate runtime configuration once per process.
 * Tests may pass an explicit environment object.
 */
export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const production = nodeEnv === 'production';
  const test = nodeEnv === 'test';
  const secret = env.JWT_SECRET || '';

  if (secret.length < 32) fail('JWT_SECRET must be at least 32 characters');
  if (!test && PLACEHOLDER_SECRET.test(secret)) fail('JWT_SECRET must be a newly generated secret, not a placeholder');

  const config = {
    nodeEnv,
    production,
    test,
    port: parsePositiveInt(env.PORT, 5000, 'PORT', { max: 65535 }),
    mongoUri: env.MONGO_URI || (test ? 'mongodb://127.0.0.1:27017/pawcompanion-test' : ''),
    jwtSecret: secret,
    corsOrigins: parseOrigins(env.CORS_ORIGIN, production),
    trustProxy: /^\d{1,2}$/.test(env.TRUST_PROXY || '') ? Number(env.TRUST_PROXY) : env.TRUST_PROXY || false,
    redisUrl: env.REDIS_URL || '',
    appUrl: (env.APP_URL || (production ? '' : 'http://localhost:3000')).replace(/\/$/, ''),
    uploadDir: env.UPLOAD_DIR || 'uploads',
    logLevel: env.LOG_LEVEL || (test ? 'silent' : 'info'),
    sessionDays: parsePositiveInt(env.SESSION_DAYS, 30, 'SESSION_DAYS', { max: 90 }),
    accessTokenMinutes: parsePositiveInt(env.ACCESS_TOKEN_MINUTES, 15, 'ACCESS_TOKEN_MINUTES', { max: 120 }),
    paymentsMode: env.PAYMENTS_MODE || 'sandbox',
    allowSandboxPayments: env.ALLOW_SANDBOX_PAYMENTS === 'true',
    ai: {
      enabled: env.ENABLE_AI === 'true',
      apiKey: env.HUGGINGFACE_API_KEY || '',
      chatModel: env.HF_CHAT_MODEL || 'meta-llama/Llama-3.1-8B-Instruct',
      routerModel: env.HF_ROUTER_MODEL || 'meta-llama/Llama-3.2-3B-Instruct',
      imageModel: env.HF_IMAGE_MODEL || 'stabilityai/stable-diffusion-xl-base-1.0',
      maxTokens: parsePositiveInt(env.HF_MAX_TOKENS, 220, 'HF_MAX_TOKENS', { max: 512 }),
      temperature: Number(env.HF_TEMPERATURE || 0.7),
      routerThreshold: Number(env.HF_ROUTER_THRESHOLD || 0.55),
    },
    demoMode: env.DEMO_MODE === 'true' || (!production && env.DEMO_MODE !== 'false'),
  };

  if (!['sandbox', 'stripe'].includes(config.paymentsMode)) fail('PAYMENTS_MODE must be sandbox or stripe');
  if (config.paymentsMode === 'stripe') fail('Stripe payments are not wired in this build; use PAYMENTS_MODE=sandbox');
  if (production && !config.allowSandboxPayments) {
    fail('Production uses sandbox payments. Set ALLOW_SANDBOX_PAYMENTS=true only for a demo deployment, or integrate a live provider.');
  }
  if (production && !config.appUrl) fail('APP_URL is required in production');
  if (production && config.appUrl && !config.appUrl.startsWith('https://')) fail('APP_URL must use HTTPS in production');
  if (!config.mongoUri) fail('MONGO_URI is required');

  return Object.freeze(config);
}

export function assertRole(role) {
  if (!ROLES.has(role)) throw new Error(`Unknown role: ${role}`);
  return role;
}
