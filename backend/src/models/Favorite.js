import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    animalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true, index: true },
  },
  { timestamps: true },
);

favoriteSchema.index({ customerId: 1, animalId: 1 }, { unique: true });

export const Favorite = mongoose.model('Favorite', favoriteSchema);
export default Favorite;
