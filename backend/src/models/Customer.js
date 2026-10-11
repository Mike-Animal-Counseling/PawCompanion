import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
}, { timestamps: true });
export default mongoose.model('Customer', schema);
