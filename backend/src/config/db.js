import mongoose from "mongoose";
export const connectDB = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI required");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log("Database connected");
  return true;
};
export const disconnectDB = () => mongoose.disconnect();
export default connectDB;
