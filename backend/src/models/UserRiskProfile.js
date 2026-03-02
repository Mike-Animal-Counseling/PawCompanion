import mongoose from "mongoose";

const userRiskProfileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  score7d: {
    type: Number,
    default: 0,
  },
  score30d: {
    type: Number,
    default: 0,
  },
  events7d: {
    type: Number,
    default: 0,
  },
  events30d: {
    type: Number,
    default: 0,
  },
  maxLevel30d: {
    type: String,
    enum: ["none", "medium", "high"],
    default: "none",
  },
  lastRiskAt: {
    type: Date,
  },
  lastActiveAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["ok", "watch", "flagged"],
    default: "ok",
  },
  flagReason: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

userRiskProfileSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const UserRiskProfile = mongoose.model("UserRiskProfile", userRiskProfileSchema);

export default UserRiskProfile;
