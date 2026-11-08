import mongoose from 'mongoose';

const accountFields = {
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
  lastLoginAt: { type: Date },
};

const customerSchema = new mongoose.Schema(
  {
    ...accountFields,
    role: { type: String, enum: ['customer'], default: 'customer' },
    phone: { type: String, trim: true, maxlength: 32, default: '' },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    avatarColor: { type: String, default: '#2f6b52' },
    safetyConsentAt: { type: Date, default: Date.now },
    marketingOptIn: { type: Boolean, default: false },
    goals: {
      type: [{ type: String, enum: ['company', 'calm', 'active', 'support', 'routine'] }],
      default: [],
    },
    preferredSpecies: { type: String, enum: ['', 'cat', 'dog', 'rabbit', 'hamster', 'parrot', 'other'], default: '' },
    timezone: { type: String, trim: true, maxlength: 64, default: 'America/Los_Angeles' },
    onboardingComplete: { type: Boolean, default: false },
    plusMember: { type: Boolean, default: false },
  },
  { timestamps: true },
);

customerSchema.index({ createdAt: -1 });

export const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
