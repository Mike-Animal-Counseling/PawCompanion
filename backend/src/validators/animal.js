import { z } from 'zod';
import { dateString, optionalNumber, optionalText, pagination } from './common.js';

export const SPECIES = ['cat', 'dog', 'rabbit', 'hamster', 'parrot', 'other'];
export const ANIMAL_SORTS = ['recommended', 'newest', 'price_asc', 'price_desc', 'rating'];

export const animalListQuerySchema = z.object({
  q: optionalText(80),
  species: z.preprocess((value) => (value === '' ? undefined : value), z.enum(SPECIES).optional()),
  tag: optionalText(40),
  city: optionalText(80),
  minPrice: optionalNumber(z.coerce.number().min(0).max(5000)),
  maxPrice: optionalNumber(z.coerce.number().min(0).max(5000)),
  sort: z.enum(ANIMAL_SORTS).default('recommended'),
  page: pagination.page,
  pageSize: pagination.pageSize,
  featured: z.preprocess((value) => (value === '' ? undefined : value), z.enum(['true', 'false']).optional()),
});

export const animalParamsSchema = z.object({
  animalId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid companion'),
});

export const animalReviewsQuerySchema = z.object({
  page: pagination.page,
  pageSize: pagination.pageSize,
  rating: optionalNumber(z.coerce.number().int().min(1).max(5)),
});

export const availabilityQuerySchema = z.object({
  date: dateString,
});

export const availabilityRangeQuerySchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
});

export const reviewCreateSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Choose a rating').max(5),
  title: z.string().trim().max(120).default(''),
  body: z.string().trim().max(2000).default(''),
});
