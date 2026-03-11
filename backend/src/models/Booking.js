import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    animalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Animal",
      required: true,
      index: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "merchant_accepted",
        "merchant_rejected",
        "rescheduled",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },
    address: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    paymentId: {
      type: String,
    },
    decisionNote: {
      type: String,
    },
    rescheduledAt: {
      type: Date,
    },
    rescheduleNote: {
      type: String,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Booking", bookingSchema);
