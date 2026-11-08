import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { loadConfig } from './config/env.js';
import { createBudgets } from './security.js';
import { logger } from './lib/logger.js';
import { sweepPastBookings } from './services/bookingService.js';
import { scanInactiveHighRiskUsers } from './services/riskScoring.js';

const config = loadConfig();
await connectDB(config.mongoUri);

// Indexes are part of the data contract (e.g. one live booking per slot).
// Creating them at boot is safe and keeps a fresh deployment correct.
await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).createIndexes()));

const budgets = await createBudgets();

const app = createApp({ config, budgets });
const server = app.listen(config.port, config.production ? '0.0.0.0' : '127.0.0.1', () => {
  logger.info('server.started', {
    port: config.port,
    environment: config.nodeEnv,
    ai: config.ai.enabled ? 'enabled' : 'local_fallback',
    payments: 'sandbox',
  });
});

server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
server.maxRequestsPerSocket = 100;

const sweepTimer = setInterval(() => {
  sweepPastBookings().catch((error) => logger.error('booking.sweep_failed', { error: error.message }));
}, 30 * 60_000);
sweepTimer.unref?.();

const riskTimer = setInterval(() => {
  scanInactiveHighRiskUsers().catch((error) => logger.error('risk.scan_failed', { error: error.message }));
}, 24 * 60 * 60_000);
riskTimer.unref?.();

let stopping = false;
async function stop(signal) {
  if (stopping) return;
  stopping = true;
  logger.info('server.stopping', { signal });
  clearInterval(sweepTimer);
  clearInterval(riskTimer);
  await new Promise((resolve) => server.close(resolve));
  await budgets.close();
  await disconnectDB();
  logger.info('server.stopped');
  process.exit(0);
}

process.once('SIGTERM', () => stop('SIGTERM'));
process.once('SIGINT', () => stop('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('process.unhandled_rejection', { error: String(reason) });
});
process.on('uncaughtException', (error) => {
  logger.error('process.uncaught_exception', { error: error.message, stack: error.stack?.split('\n').slice(0, 5).join('\n') });
  stop('uncaughtException');
});
