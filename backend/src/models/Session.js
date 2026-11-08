import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    role: { type: String, enum: ['customer', 'merchant', 'admin'], required: true },
    expiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, default: Date.now },
    userAgent: { type: String, maxlength: 300, default: '' },
    ipHash: { type: String, maxlength: 64, default: '' },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ subjectId: 1, role: 1, createdAt: -1 });

export const Session = mongoose.model('Session', sessionSchema);
export default Session;
