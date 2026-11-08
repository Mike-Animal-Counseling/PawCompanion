import mongoose from 'mongoose';
import { logger } from '../lib/logger.js';

export async function connectDB(uri, { quiet = false } = {}) {
  mongoose.set('strictQuery', true);
  mongoose.connection.on('connected', () => {
    if (!quiet) logger.info('database.connected');
  });
  mongoose.connection.on('disconnected', () => logger.warn('database.disconnected'));
  mongoose.connection.on('error', (error) => logger.error('database.error', { error: error.message }));
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 20,
  });
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

export default connectDB;
