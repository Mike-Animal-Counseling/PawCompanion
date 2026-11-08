import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    provider: { type: String, enum: ['sandbox'], default: 'sandbox' },
    providerRef: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    method: { type: String, default: 'sandbox_card' },
    status: { type: String, enum: ['succeeded', 'refunded', 'failed'], default: 'succeeded', index: true },
    receiptNumber: { type: String, required: true },
    refundedAt: { type: Date },
    refundRef: { type: String, default: '' },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true },
);

paymentSchema.index({ createdAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
