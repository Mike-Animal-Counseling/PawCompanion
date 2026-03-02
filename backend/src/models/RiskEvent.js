import mongoose from "mongoose";

const riskEventSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  animalId: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  level: {
    type: String,
    enum: ["medium", "high"],
    required: true,
  },
  score: {
    type: Number,
  },
  source: {
    type: String,
  },
});

const RiskEvent = mongoose.model("RiskEvent", riskEventSchema);

export default RiskEvent;
