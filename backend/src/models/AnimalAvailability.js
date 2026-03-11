import mongoose from "mongoose";

const slotSchema = new mongoose.Schema(
  {
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const animalAvailabilitySchema = new mongoose.Schema(
  {
    animalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Animal",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    slots: {
      type: [slotSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

animalAvailabilitySchema.index({ animalId: 1, date: 1 }, { unique: true });

const AnimalAvailability = mongoose.model(
  "AnimalAvailability",
  animalAvailabilitySchema,
);

export default AnimalAvailability;
