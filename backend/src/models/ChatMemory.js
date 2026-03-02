import mongoose from "mongoose";

const chatMemorySchema = new mongoose.Schema({
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
  messages: [
    {
      role: {
        type: String,
        enum: ["user", "assistant"],
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  // Mode tracking for automatic play/support routing
  chatMode: {
    type: String,
    enum: ["play", "support"],
    default: "play",
  },
  supportTurnsLeft: {
    type: Number,
    default: 0,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt before saving
chatMemorySchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const ChatMemory = mongoose.model("ChatMemory", chatMemorySchema);

export default ChatMemory;
