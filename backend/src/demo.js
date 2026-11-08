import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import mongoose from 'mongoose';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.JWT_SECRET = process.env.JWT_SECRET || randomBytes(48).toString('base64url');
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000';
process.env.APP_URL = process.env.APP_URL || 'http://localhost:3000';
process.env.PORT = process.env.PORT || '5000';
process.env.DEMO_MODE = 'true';
process.env.PAYMENTS_MODE = 'sandbox';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'info';
process.env.MONGOMS_DOWNLOAD_DIR = process.env.MONGOMS_DOWNLOAD_DIR || path.resolve('.cache/mongodb-binaries');

const skipWeb = process.argv.includes('--no-web');

const { MongoMemoryServer } = await import('mongodb-memory-server');
const { default: connectDB, disconnectDB } = await import('./config/db.js');
const { createApp } = await import('./app.js');
const { createBudgets } = await import('./security.js');
const { loadConfig } = await import('./config/env.js');
const { seedDatabase } = await import('./scripts/seed.js');

let mongo = null;
if (process.env.MONGO_URI && process.env.USE_IN_MEMORY_DB !== 'true') {
  console.log('Using MONGO_URI from the environment:', process.env.MONGO_URI);
} else {
  console.log('Starting an in-memory MongoDB (first run downloads the binary once)…');
  const demoDbPath = path.resolve('.cache/mongo-demo-data');
  await mkdir(demoDbPath, { recursive: true });
  mongo = await MongoMemoryServer.create({
    instance: {
      dbName: 'pawcompanion',
      dbPath: demoDbPath,
    },
  });
  process.env.MONGO_URI = mongo.getUri('pawcompanion');
}
await connectDB(process.env.MONGO_URI);
await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).createIndexes()));

const seed = await seedDatabase({ reset: true });
const config = loadConfig();
const budgets = await createBudgets();
const server = createApp({ config, budgets }).listen(Number(process.env.PORT), '127.0.0.1');

console.log('');
console.log('  PawCompanion demo');
console.log('  ────────────────────────────────────────────');
console.log('  API      http://127.0.0.1:' + process.env.PORT);
console.log('  Web      http://localhost:3000');
console.log('');
if (seed.credentials) {
  console.log('  Demo accounts seeded. See README.md for the demo credentials.');
  console.log('');
}

let web;
if (!skipWeb) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  web = spawn(npm, ['run', 'dev'], {
    cwd: path.resolve('../frontend'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      VITE_SHOW_DEMO_ACCOUNTS: 'true',
      VITE_API_TARGET: `http://127.0.0.1:${process.env.PORT}`,
    },
  });
  web.on('exit', (code) => {
    if (code !== null && code !== 0) console.error('Frontend exited with code ' + code);
  });
} else {
  console.log('  Frontend skipped (--no-web). Run `npm run dev` in frontend/ separately.');
}

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\nShutting down (' + signal + ')…');
  if (web && !web.killed) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(web.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      web.kill('SIGTERM');
    }
  }
  await new Promise((resolve) => server.close(resolve));
  await budgets.close();
  await disconnectDB();
  if (mongo) await mongo.stop();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (error) => console.error('Demo error:', error));
