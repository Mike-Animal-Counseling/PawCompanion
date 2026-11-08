import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    animalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true, index: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    body: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: ['published', 'hidden'], default: 'published', index: true },
    moderationNote: { type: String, maxlength: 500, default: '' },
    moderatedBy: { type: String, default: '' },
    moderatedAt: { type: Date },
    merchantReply: {
      body: { type: String, trim: true, maxlength: 1000, default: '' },
      at: { type: Date },
    },
    helpfulCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

reviewSchema.index({ animalId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ merchantId: 1, createdAt: -1 });

export const Review = mongoose.model('Review', reviewSchema);
export default Review;
