import { z } from 'zod';
import { optionalText, pagination } from './common.js';

const page = { page: pagination.page, pageSize: pagination.pageSize };

export const adminOverviewQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
});

export const adminRiskQuerySchema = z.object({
  status: z.preprocess((value) => (value === '' || value === 'all' ? undefined : value), z.enum(['ok', 'watch', 'flagged']).optional()),
  page: pagination.page,
  pageSize: pagination.pageSize,
});

export const adminRiskParamsSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid account'),
});

export const adminRiskActionSchema = z.object({
  action: z.enum(['acknowledge', 'resolve']),
  note: optionalText(500),
});

export const adminMerchantsQuerySchema = z.object({
  status: z.preprocess((value) => (value === '' || value === 'all' ? undefined : value), z.enum(['active', 'suspended']).optional()),
  q: optionalText(80),
  ...page,
});

export const adminMerchantParamsSchema = z.object({
  merchantId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid merchant'),
});

export const adminMerchantStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
  reason: optionalText(500),
});

export const adminAnimalsQuerySchema = z.object({
  q: optionalText(80),
  moderationStatus: z.preprocess((value) => (value === '' || value === 'all' ? undefined : value), z.enum(['visible', 'hidden']).optional()),
  ...page,
});

export const adminAnimalParamsSchema = z.object({
  animalId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid companion'),
});

export const adminModerateSchema = z.object({
  moderationStatus: z.enum(['visible', 'hidden']),
  reason: optionalText(500),
});

export const adminReviewsQuerySchema = z.object({
  status: z.preprocess((value) => (value === '' || value === 'all' ? undefined : value), z.enum(['published', 'hidden']).optional()),
  ...page,
});

export const adminReviewParamsSchema = z.object({
  reviewId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid review'),
});

export const adminReviewVisibilitySchema = z.object({
  status: z.enum(['published', 'hidden']),
  reason: optionalText(500),
});
