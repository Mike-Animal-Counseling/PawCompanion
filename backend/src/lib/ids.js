import mongoose from 'mongoose';

export function isObjectId(value) {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value) && /^[a-f\d]{24}$/i.test(value);
}

export function toId(value) {
  return value && typeof value === 'object' && value._id ? String(value._id) : String(value || '');
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
