import mongoose from "mongoose";

const animalSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    favorite: {
      type: Boolean,
      default: false,
    },
    origins: [
      {
        type: String,
      },
    ],
    stars: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    personality: {
      type: String,
      default: "",
    },
    tags: [
      {
        type: String,
        index: true,
      },
    ],
    personalityVector: [Number],
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

const Animal = mongoose.model("Animal", animalSchema);

export default Animal;
