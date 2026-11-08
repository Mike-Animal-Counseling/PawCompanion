import { z } from 'zod';
import { email, imageUrl, loginPassword, objectId, optionalText, password, phone } from './common.js';

const name = z.string().trim().min(1, 'Name is required').max(80, 'Name is too long');

export const customerRegisterSchema = z.object({
  name,
  email,
  password,
});

export const customerLoginSchema = z.object({
  email,
  password: loginPassword,
});

export const merchantRegisterSchema = z.object({
  name,
  email,
  password,
  businessType: z.enum(['Pet Cafe', 'Shelter', 'Rescue', 'Pet Cafe & Shelter', 'Training Studio']).default('Pet Cafe & Shelter'),
  city: z.string().trim().max(80).default(''),
  description: z.string().trim().max(1200).default(''),
  website: z.string().trim().max(200).default('').refine((value) => !value || /^https:\/\//.test(value), 'Website must use https://'),
});

export const merchantLoginSchema = z.object({
  email,
  password: loginPassword,
});

export const adminLoginSchema = z.object({
  email,
  password: loginPassword,
});

export const updateProfileSchema = z
  .object({
    name: name.optional(),
    phone: z.union([phone, z.literal('')]).optional(),
    city: z.string().trim().max(80).optional(),
    marketingOptIn: z.boolean().optional(),
    goals: z.array(z.enum(['company', 'calm', 'active', 'support', 'routine'])).max(4).optional(),
    preferredSpecies: z.enum(['', 'cat', 'dog', 'rabbit', 'hamster', 'parrot', 'other']).optional(),
    timezone: z.string().trim().max(64).optional(),
    onboardingComplete: z.boolean().optional(),
    businessType: z.enum(['Pet Cafe', 'Shelter', 'Rescue', 'Pet Cafe & Shelter', 'Training Studio']).optional(),
    description: z.string().trim().max(1200).optional(),
    website: z.string().trim().max(200).optional().refine((value) => !value || /^https:\/\//.test(value), 'Website must use https://'),
    logoUrl: z.union([imageUrl, z.literal('')]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

export const sessionIdSchema = z.object({ sessionId: objectId });

export const changePasswordSchema = z.object({
  currentPassword: loginPassword,
  newPassword: password,
});

export const deleteAccountSchema = z.object({
  confirmation: z.string().refine((value) => value === 'DELETE', 'Type DELETE to confirm'),
  password: loginPassword,
});

export const merchantOnboardingSchema = z.object({
  businessType: z.enum(['Pet Cafe', 'Shelter', 'Rescue', 'Pet Cafe & Shelter', 'Training Studio']),
  city: z.string().trim().min(1, 'City is required').max(80),
  description: z.string().trim().min(20, 'Tell guests a little about your organisation').max(1200),
  website: z.string().trim().max(200).default('').refine((value) => !value || /^https:\/\//.test(value), 'Website must use https://'),
});
