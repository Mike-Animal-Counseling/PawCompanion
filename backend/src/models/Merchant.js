import mongoose from 'mongoose';

const merchantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    businessType: {
      type: String,
      enum: ['Pet Cafe', 'Shelter', 'Rescue', 'Pet Cafe & Shelter', 'Training Studio'],
      default: 'Pet Cafe & Shelter',
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['merchant'], default: 'merchant' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    verified: { type: Boolean, default: false, index: true },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    description: { type: String, trim: true, maxlength: 1200, default: '' },
    website: { type: String, trim: true, maxlength: 200, default: '' },
    logoUrl: { type: String, trim: true, maxlength: 500, default: '' },
    ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

merchantSchema.index({ status: 1, verified: -1, createdAt: -1 });

export const Merchant = mongoose.model('Merchant', merchantSchema);
export default Merchant;
