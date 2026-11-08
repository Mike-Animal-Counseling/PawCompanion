import { z } from 'zod';
import { dateString, email, objectId, optionalText, phone, slotTime } from './common.js';
import { pagination } from './common.js';

export const bookingListQuerySchema = z.object({
  status: z.preprocess((value) => (value === '' || value === 'all' ? undefined : value), z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'declined', 'upcoming', 'past']).optional()),
  page: pagination.page,
  pageSize: pagination.pageSize,
});

export const bookingCreateSchema = z.object({
  animalId: objectId,
  serviceType: z.enum(['home_visit', 'walk', 'cafe_meet']).default('home_visit'),
  date: dateString,
  startTime: slotTime,
  contact: z.object({
    name: z.string().trim().min(1, 'Your name is required').max(80),
    email,
    phone,
    address: z.string().trim().max(300).default(''),
    city: z.string().trim().max(80).default(''),
    notes: z.string().trim().max(1000).default(''),
  }),
  paymentMethod: z.literal('sandbox_card').default('sandbox_card'),
  acceptTerms: z.boolean().refine((value) => value === true, 'Please accept the booking terms'),
});

export const bookingParamsSchema = z.object({ bookingId: objectId });

export const cancelBookingSchema = z.object({
  reason: optionalText(500),
});

export const rescheduleBookingSchema = z.object({
  date: dateString,
  startTime: slotTime,
});

export const merchantBookingDecisionSchema = z.object({
  note: optionalText(500),
});

export const merchantRescheduleSchema = z.object({
  date: dateString,
  startTime: slotTime,
  note: optionalText(500),
});

export const reviewEligibility = z.object({});

export const serviceQuoteQuerySchema = z.object({
  service: z.enum(['home_visit', 'walk', 'cafe_meet']).optional(),
});
