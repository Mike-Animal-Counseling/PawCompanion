import mongoose from 'mongoose';

const checkinSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    date: { type: String, required: true, index: true },
    mood: { type: Number, required: true, min: 1, max: 5 },
    energy: { type: Number, min: 1, max: 5, default: 3 },
    note: { type: String, trim: true, maxlength: 2000, default: '' },
    tags: {
      type: [{ type: String, enum: ['calm', 'anxious', 'lonely', 'hopeful', 'tired', 'grateful', 'overwhelmed', 'good'] }],
      default: [],
    },
    animalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal' },
    animalName: { type: String, default: '' },
    aiReply: { type: String, maxlength: 2000, default: '' },
    safetyLevel: { type: String, enum: ['none', 'medium', 'high'], default: 'none' },
    mode: { type: String, enum: ['play', 'support'], default: 'play' },
  },
  { timestamps: true },
);

checkinSchema.index({ customerId: 1, date: 1 }, { unique: true });
checkinSchema.index({ customerId: 1, createdAt: -1 });

export const Checkin = mongoose.model('Checkin', checkinSchema);
export default Checkin;
