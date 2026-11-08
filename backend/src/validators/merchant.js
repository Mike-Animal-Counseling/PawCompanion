import { z } from 'zod';
import { dateString, imageUrl, optionalText, pagination, slotTime } from './common.js';
import { SPECIES } from './animal.js';

const tags = z.array(z.string().trim().min(1).max(40)).max(8);
const gallery = z.array(imageUrl).max(4);
const digitalList = z.array(z.string().trim().min(1).max(100)).max(12);

const digitalProfile = z
  .object({
    enabled: z.boolean(),
    voice: z.enum(['cat', 'dog', 'rabbit', 'other']),
    traits: z
      .object({
        energy: z.coerce.number().int().min(1).max(5),
        sociability: z.coerce.number().int().min(1).max(5),
        curiosity: z.coerce.number().int().min(1).max(5),
        anxiety: z.coerce.number().int().min(1).max(5),
        playfulness: z.coerce.number().int().min(1).max(5),
      })
      .partial(),
    routines: digitalList,
    favorites: digitalList,
    comforts: digitalList,
    boundaries: digitalList,
    hostNotes: z.string().trim().max(1000),
    voiceStyle: z.string().trim().max(200),
    soundPack: z.string().trim().max(60),
  })
  .partial();

// Fields shared by create and update. No defaults here: defaults belong only to
// create, otherwise a PATCH would silently reset every unsubmitted field.
const animalFields = {
  name: z.string().trim().min(1, 'Name is required').max(60),
  species: z.enum(SPECIES),
  breed: z.string().trim().max(80),
  ageMonths: z.coerce.number().int().min(0).max(360),
  gender: z.enum(['female', 'male', 'unknown']),
  size: z.enum(['small', 'medium', 'large']),
  price: z.coerce.number().min(0, 'Price cannot be negative').max(5000),
  description: z.string().trim().max(3000),
  personality: z.string().trim().max(400),
  personalityProfile: z.string().trim().max(60),
  digital: digitalProfile.optional(),
  tags,
  imageUrl: imageUrl.refine((value) => value.length > 0, 'Add a photo of this companion'),
  gallery,
  city: z.string().trim().max(80),
  region: z.string().trim().max(80),
  energyLevel: z.coerce.number().int().min(1).max(5),
  goodWithKids: z.boolean(),
  goodWithPets: z.boolean(),
  vaccinated: z.boolean(),
  neutered: z.boolean(),
  visibility: z.enum(['public', 'private']),
  isActive: z.boolean(),
};

const createDefaults = {
  species: 'other',
  breed: '',
  ageMonths: 24,
  gender: 'unknown',
  size: 'medium',
  description: '',
  personality: '',
  personalityProfile: '',
  tags: [],
  gallery: [],
  city: '',
  region: '',
  energyLevel: 3,
  goodWithKids: false,
  goodWithPets: false,
  vaccinated: false,
  neutered: false,
  visibility: 'public',
  isActive: true,
};

export const merchantAnimalCreateSchema = z.object({
  ...animalFields,
  name: animalFields.name,
  species: animalFields.species.default(createDefaults.species),
  breed: animalFields.breed.default(createDefaults.breed),
  ageMonths: animalFields.ageMonths.default(createDefaults.ageMonths),
  gender: animalFields.gender.default(createDefaults.gender),
  size: animalFields.size.default(createDefaults.size),
  description: animalFields.description.default(createDefaults.description),
  personality: animalFields.personality.default(createDefaults.personality),
  personalityProfile: animalFields.personalityProfile.default(createDefaults.personalityProfile),
  tags: animalFields.tags.default(createDefaults.tags),
  gallery: animalFields.gallery.default(createDefaults.gallery),
  city: animalFields.city.default(createDefaults.city),
  region: animalFields.region.default(createDefaults.region),
  energyLevel: animalFields.energyLevel.default(createDefaults.energyLevel),
  goodWithKids: animalFields.goodWithKids.default(createDefaults.goodWithKids),
  goodWithPets: animalFields.goodWithPets.default(createDefaults.goodWithPets),
  vaccinated: animalFields.vaccinated.default(createDefaults.vaccinated),
  neutered: animalFields.neutered.default(createDefaults.neutered),
  visibility: animalFields.visibility.default(createDefaults.visibility),
  isActive: animalFields.isActive.default(createDefaults.isActive),
});

export const merchantAnimalUpdateSchema = z
  .object(animalFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

export const merchantAnimalParamsSchema = z.object({
  animalId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid companion'),
});

export const merchantAvailabilityQuerySchema = z.object({
  date: dateString,
});

export const merchantAvailabilitySchema = z.object({
  date: dateString,
  slots: z
    .array(
      z.object({
        startTime: slotTime,
        enabled: z.boolean().default(true),
      }),
    )
    .min(1, 'Configure at least one slot')
    .max(5)
    .refine((slots) => new Set(slots.map((slot) => slot.startTime)).size === slots.length, 'Slots must be unique'),
});

export const merchantBookingsQuerySchema = z.object({
  status: z.preprocess(
    (value) => (value === '' || value === 'all' ? undefined : value),
    z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'declined']).optional(),
  ),
  page: pagination.page,
  pageSize: pagination.pageSize,
});

export const merchantOverviewQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
});

export const merchantReviewsQuerySchema = z.object({
  page: pagination.page,
  pageSize: pagination.pageSize,
});

export const merchantReplySchema = z.object({
  body: z.string().trim().min(1, 'Write a reply').max(1000),
});

export const merchantNoteSchema = z.object({
  note: optionalText(500),
});

export const merchantRescheduleSchema = z.object({
  date: dateString,
  startTime: slotTime,
  note: optionalText(500),
});

export const merchantParamsSchema = z.object({
  bookingId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid booking'),
});

export const merchantReviewParamsSchema = z.object({
  reviewId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid review'),
});
