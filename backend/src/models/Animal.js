import mongoose from "mongoose";

const animalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true,
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
  },
  personality: {
    type: String,
  },
  tags: [
    {
      type: String,
      index: true,
    },
  ],
  personalityVector: [Number],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt before saving
animalSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const Animal = mongoose.model("Animal", animalSchema);

export default Animal;
