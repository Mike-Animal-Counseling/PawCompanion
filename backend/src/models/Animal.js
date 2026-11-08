import mongoose from 'mongoose';

const digitalProfileSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    voice: { type: String, enum: ['cat', 'dog', 'rabbit', 'other'], default: 'other' },
    traits: {
      energy: { type: Number, min: 1, max: 5, default: 3 },
      sociability: { type: Number, min: 1, max: 5, default: 3 },
      curiosity: { type: Number, min: 1, max: 5, default: 3 },
      anxiety: { type: Number, min: 1, max: 5, default: 2 },
      playfulness: { type: Number, min: 1, max: 5, default: 3 },
    },
    routines: [{ type: String, trim: true, maxlength: 100 }],
    favorites: [{ type: String, trim: true, maxlength: 100 }],
    comforts: [{ type: String, trim: true, maxlength: 100 }],
    boundaries: [{ type: String, trim: true, maxlength: 100 }],
    hostNotes: { type: String, trim: true, maxlength: 1000, default: '' },
    voiceStyle: { type: String, trim: true, maxlength: 200, default: '' },
    soundPack: { type: String, trim: true, maxlength: 60, default: 'species' },
  },
  { _id: false },
);

const animalSchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60, index: true },
    species: {
      type: String,
      enum: ['cat', 'dog', 'rabbit', 'hamster', 'parrot', 'other'],
      default: 'other',
      index: true,
    },
    breed: { type: String, trim: true, maxlength: 80, default: '' },
    ageMonths: { type: Number, min: 0, max: 360, default: 24 },
    gender: { type: String, enum: ['female', 'male', 'unknown'], default: 'unknown' },
    size: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    price: { type: Number, required: true, min: 0, max: 5000 },
    description: { type: String, trim: true, maxlength: 3000, default: '' },
    personality: { type: String, trim: true, maxlength: 400, default: '' },
    personalityProfile: { type: String, trim: true, maxlength: 60, default: '' },
    tags: [{ type: String, trim: true, maxlength: 40, index: true }],
    imageUrl: { type: String, trim: true, maxlength: 500, default: '' },
    gallery: [{ type: String, trim: true, maxlength: 500 }],
    digital: { type: digitalProfileSchema, default: () => ({}) },
    city: { type: String, trim: true, maxlength: 80, default: '', index: true },
    region: { type: String, trim: true, maxlength: 80, default: '' },
    energyLevel: { type: Number, min: 1, max: 5, default: 3 },
    goodWithKids: { type: Boolean, default: false },
    goodWithPets: { type: Boolean, default: false },
    vaccinated: { type: Boolean, default: false },
    neutered: { type: Boolean, default: false },
    ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    bookingCount: { type: Number, min: 0, default: 0 },
    featured: { type: Boolean, default: false, index: true },
    visibility: { type: String, enum: ['public', 'private'], default: 'public', index: true },
    isActive: { type: Boolean, default: true, index: true },
    moderationStatus: { type: String, enum: ['visible', 'hidden'], default: 'visible', index: true },
    moderationNote: { type: String, maxlength: 500, default: '' },
    moderatedBy: { type: String, default: '' },
    moderatedAt: { type: Date },
    archivedAt: { type: Date },
  },
  { timestamps: true },
);

animalSchema.index({ isActive: 1, visibility: 1, moderationStatus: 1, createdAt: -1 });
animalSchema.index({ isActive: 1, visibility: 1, moderationStatus: 1, ratingAverage: -1 });
animalSchema.index({ isActive: 1, visibility: 1, moderationStatus: 1, price: 1 });
animalSchema.index({ name: 'text', breed: 'text', description: 'text', tags: 'text' });

export const Animal = mongoose.model('Animal', animalSchema);
export default Animal;
