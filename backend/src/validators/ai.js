import { z } from 'zod';
import { objectId, pagination } from './common.js';

export const chatSchema = z.object({
  animalId: objectId,
  message: z.string().trim().min(1, 'Write a message').max(4000, 'Messages must be under 4,000 characters'),
});

export const conversationParamsSchema = z.object({
  animalId: objectId,
});

export const conversationListQuerySchema = z.object({
  page: pagination.page,
  pageSize: pagination.pageSize,
});
