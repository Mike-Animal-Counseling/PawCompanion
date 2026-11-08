import { z } from 'zod';
import { isValidDateString } from '../lib/time.js';
import { SLOT_STARTS } from '../services/scheduling.js';

export const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Must be a valid identifier');

export const email = z.email('Enter a valid email address').max(254).transform((value) => value.trim().toLowerCase());

export const password = z
  .string()
  .min(12, 'Use at least 12 characters')
  .refine((value) => Buffer.byteLength(value) <= 72, 'Password must be at most 72 bytes');

export const loginPassword = z
  .string()
  .min(1, 'Password is required')
  .refine((value) => Buffer.byteLength(value) <= 72, 'Password must be at most 72 bytes');

export const dateString = z
  .string()
  .refine(isValidDateString, 'Use a real date in YYYY-MM-DD format');

export const slotTime = z.enum(SLOT_STARTS, 'Choose an available start time');

export const optionalText = (max, message = 'Value is too long') =>
  z.preprocess((value) => (value === '' || value === null ? undefined : value), z.string().trim().max(max, message).optional());

export const optionalNumber = (schema) =>
  z.preprocess((value) => (value === '' || value === null || value === undefined ? undefined : value), schema.optional());

export const phone = z
  .string()
  .trim()
  .regex(/^[\d+()\-.\s]{7,32}$/, 'Enter a valid phone number');

export const pagination = {
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
};

export const safeImageUrl = (value) => {
  if (!value) return true;
  if (value.startsWith('/animals/') || value.startsWith('/uploads/')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};

export const imageUrl = z
  .string()
  .trim()
  .max(500)
  .refine(safeImageUrl, 'Use an https image URL or an uploaded image path');
