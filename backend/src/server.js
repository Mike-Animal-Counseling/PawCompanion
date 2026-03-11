import express from "express";
import cors from "cors";
import "dotenv/config.js";
import path from "path";
import connectDB from "./config/db.js";
import animalRouter from "./routers/animal.router.js";
import aiRouter from "./routers/ai.router.js";
import paymentRouter from "./routers/payment.router.js";
import notificationRouter from "./routers/notification.router.js";
import bookingRouter from "./routers/booking.router.js";
import authRouter from "./routers/auth.router.js";
import merchantRouter from "./routers/merchant.router.js";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000"],
  }),
);

// Serve locally uploaded merchant images.
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// API routes
app.use("/api/animals", animalRouter);
app.use("/api/ai", aiRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/notification", notificationRouter);
app.use("/api/booking", bookingRouter);
app.use("/api/auth", authRouter);
app.use("/api/merchant", merchantRouter);

const PORT = 5000;

// Initialize MongoDB connection and start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}`);
      console.log(`Animals API: http://localhost:${PORT}/api/animals`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
