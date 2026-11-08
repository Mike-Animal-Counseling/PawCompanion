import { z } from 'zod';
import { objectId, optionalText } from './common.js';

export const checkinCreateSchema = z.object({
  mood: z.number().int().min(1, 'Choose how you feel').max(5),
  energy: z.number().int().min(1).max(5).default(3),
  note: optionalText(2000).transform((value) => value || ''),
  tags: z.array(z.enum(['calm', 'anxious', 'lonely', 'hopeful', 'tired', 'grateful', 'overwhelmed', 'good'])).max(5).default([]),
  animalId: objectId.optional(),
});

export const checkinHistoryQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
});

export const checkinParamsSchema = z.object({
  checkinId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid check-in'),
});
