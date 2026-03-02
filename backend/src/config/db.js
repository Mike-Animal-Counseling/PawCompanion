import mongoose from "mongoose";

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/pet-ai-dev";

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected successfully at", MONGO_URI);
    return true;
  } catch (error) {
    console.warn("MongoDB connection warning:", error.message);
    console.warn("Continuing without MongoDB. Some features will be limited.");
    return false;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  } catch (error) {
    console.error("MongoDB disconnection error:", error.message);
    process.exit(1);
  }
};

export default connectDB;
