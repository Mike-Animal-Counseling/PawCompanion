import mongoose from 'mongoose';

const digitalPetStateSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    animalId: { type: String, required: true, index: true },
    mood: {
      type: String,
      enum: ['calm', 'gentle', 'playful', 'affectionate', 'sleepy', 'shy', 'alert'],
      default: 'calm',
    },
    energy: { type: Number, min: 0, max: 100, default: 70 },
    attention: { type: Number, min: 0, max: 100, default: 60 },
    trust: { type: Number, min: 0, max: 100, default: 40 },
    interactions: { type: Number, min: 0, default: 0 },
    lastSoundKey: { type: String, default: '' },
    lastInteractionAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

digitalPetStateSchema.index({ userId: 1, animalId: 1 }, { unique: true });

export const DigitalPetState = mongoose.model('DigitalPetState', digitalPetStateSchema);
export default DigitalPetState;
