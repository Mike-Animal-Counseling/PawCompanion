import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    recipientRole: { type: String, enum: ['customer', 'merchant', 'admin'], required: true },
    type: {
      type: String,
      enum: ['booking_received', 'booking_confirmed', 'booking_declined', 'booking_cancelled', 'booking_rescheduled', 'booking_completed', 'review_received', 'review_reply', 'safety_check', 'system'],
      required: true,
    },
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, maxlength: 500, default: '' },
    link: { type: String, maxlength: 300, default: '' },
    data: { type: Object, default: {} },
    readAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientId: 1, recipientRole: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
