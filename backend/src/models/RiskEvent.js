import mongoose from 'mongoose';

const riskEventSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    animalId: { type: String, default: '', index: true },
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ['medium', 'high'], required: true },
    score: { type: Number },
    source: { type: String, maxlength: 40 },
  },
  { timestamps: true },
);

riskEventSchema.index({ userId: 1, timestamp: -1 });
riskEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 120 });

export const RiskEvent = mongoose.model('RiskEvent', riskEventSchema);
export default RiskEvent;
