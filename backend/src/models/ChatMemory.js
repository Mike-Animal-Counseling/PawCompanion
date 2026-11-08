import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 4000 },
    timestamp: { type: Date, default: Date.now },
    meta: { type: Object, default: undefined },
  },
  { _id: false },
);

const chatMemorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    animalId: { type: String, required: true, index: true },
    animalName: { type: String, default: '' },
    messages: { type: [messageSchema], default: [] },
    chatMode: { type: String, enum: ['play', 'support'], default: 'play' },
    supportTurnsLeft: { type: Number, default: 0, min: 0 },
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

chatMemorySchema.index({ userId: 1, animalId: 1 }, { unique: true });
chatMemorySchema.index({ userId: 1, lastMessageAt: -1 });

export const ChatMemory = mongoose.model('ChatMemory', chatMemorySchema);
export default ChatMemory;
