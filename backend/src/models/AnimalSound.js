import mongoose from 'mongoose';

const animalSoundSchema = new mongoose.Schema(
  {
    animalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true, index: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    mood: {
      type: String,
      enum: ['calm', 'gentle', 'playful', 'affectionate', 'sleepy', 'shy', 'alert'],
      required: true,
      index: true,
    },
    behaviour: { type: String, trim: true, maxlength: 80, default: '' },
    url: { type: String, required: true, trim: true, maxlength: 500 },
    mimeType: { type: String, required: true, trim: true, maxlength: 80 },
    durationMs: { type: Number, min: 0, max: 8000, required: true },
    source: { type: String, enum: ['host', 'species'], default: 'host' },
    analysis: {
      model: { type: String, default: 'metadata-only' },
      dimensions: { type: Number, min: 0, max: 512, default: 0 },
      embedding: [{ type: Number }],
      status: { type: String, enum: ['metadata-only', 'signature', 'provider'], default: 'metadata-only' },
    },
    status: { type: String, enum: ['active', 'hidden'], default: 'active', index: true },
  },
  { timestamps: true },
);

animalSoundSchema.index({ animalId: 1, mood: 1, status: 1 });

export const AnimalSound = mongoose.model('AnimalSound', animalSoundSchema);
export default AnimalSound;
