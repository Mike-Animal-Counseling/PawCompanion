import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    actorRole: { type: String, enum: ['customer', 'merchant', 'admin', 'system'], default: 'system' },
    actorId: { type: String, default: '' },
    note: { type: String, maxlength: 500, default: '' },
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    animalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true, index: true },
    animalSnapshot: {
      name: { type: String, required: true },
      imageUrl: { type: String, default: '' },
      species: { type: String, default: '' },
      breed: { type: String, default: '' },
    },
    service: {
      type: { type: String, enum: ['home_visit', 'walk', 'cafe_meet'], default: 'home_visit' },
      label: { type: String, default: 'Home visit' },
      mode: { type: String, enum: ['in_person', 'online'], default: 'in_person' },
      durationMinutes: { type: Number, default: 120 },
      description: { type: String, default: '' },
    },
    date: { type: String, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    durationHours: { type: Number, default: 2, min: 0.25, max: 8 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'declined'],
      default: 'pending',
      index: true,
    },
    contact: {
      name: { type: String, trim: true, maxlength: 80, default: '' },
      email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
      phone: { type: String, trim: true, maxlength: 32, default: '' },
      address: { type: String, trim: true, maxlength: 300, default: '' },
      city: { type: String, trim: true, maxlength: 80, default: '' },
      notes: { type: String, trim: true, maxlength: 1000, default: '' },
    },
    pricing: {
      hourlyRate: { type: Number, required: true },
      hours: { type: Number, required: true },
      subtotal: { type: Number, required: true },
      serviceFee: { type: Number, required: true },
      total: { type: Number, required: true },
      currency: { type: String, default: 'USD' },
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded', 'failed'], default: 'pending' },
    reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' },
    merchantNote: { type: String, maxlength: 500, default: '' },
    statusHistory: { type: [statusHistorySchema], default: [] },
    cancellation: {
      by: { type: String, enum: ['customer', 'merchant', 'admin', 'system'] },
      reason: { type: String, maxlength: 500, default: '' },
      at: { type: Date },
      refundAmount: { type: Number, default: 0 },
    },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

// A time slot can only ever have one live booking. Cancelled bookings release
// the slot because their `active` flag is set to false.
bookingSchema.index(
  { animalId: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);
bookingSchema.index({ customerId: 1, date: -1 });
bookingSchema.index({ merchantId: 1, date: 1, startTime: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
