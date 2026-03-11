import mongoose from "mongoose";

const merchantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    businessType: {
      type: String,
      enum: ["Pet Cafe", "Shelter", "Rescue", "Pet Cafe & Shelter"],
      default: "Pet Cafe & Shelter",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["merchant"],
      default: "merchant",
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

const Merchant = mongoose.model("Merchant", merchantSchema);

export default Merchant;
