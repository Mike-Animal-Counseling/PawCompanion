import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { loadSecurity, createBudgets } from './security.js';
const config = loadSecurity();
if (!process.env.MONGO_URI) throw new Error('MONGO_URI required');
await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
const budgets = await createBudgets();
const server = createApp({ budgets, config }).listen(Number(process.env.PORT || 5000), config.production ? '0.0.0.0' : '127.0.0.1', () => console.log('PawCompanion API ready'));
server.requestTimeout = 30000; server.headersTimeout = 10000; server.maxRequestsPerSocket = 100;
async function stop() { server.close(); await budgets.close(); await mongoose.disconnect(); }
process.once('SIGTERM', stop); process.once('SIGINT', stop);
