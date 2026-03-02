import { Router } from "express";
import * as stripeService from "../services/stripeService.js";
import * as notificationService from "../services/notificationService.js";

const router = Router();

/**
 * POST /api/payment/intent
 * Create a payment intent
 */
router.post("/intent", async (req, res) => {
  try {
    const { animalId, userId, amount } = req.body;

    if (!userId || !animalId || !amount) {
      return res.status(400).json({
        error: "Missing required fields: userId, animalId, amount",
      });
    }

    const paymentIntent = await stripeService.createPaymentIntent(
      animalId,
      userId,
      amount,
    );

    return res.json(paymentIntent);
  } catch (error) {
    console.error("Error creating payment intent:", error.message);
    return res.status(500).json({
      error: "Failed to create payment intent",
      message: error.message,
    });
  }
});

/**
 * POST /api/payment/process
 * Process a payment
 */
router.post("/process", async (req, res) => {
  try {
    const { paymentIntentId, paymentMethod } = req.body;

    if (!paymentIntentId || !paymentMethod) {
      return res.status(400).json({
        error: "Missing required fields: paymentIntentId, paymentMethod",
      });
    }

    const result = await stripeService.processPayment(
      paymentIntentId,
      paymentMethod,
    );

    return res.json(result);
  } catch (error) {
    console.error("Error processing payment:", error.message);
    return res.status(500).json({
      error: "Failed to process payment",
      message: error.message,
    });
  }
});

/**
 * POST /api/payment/refund
 * Refund a payment
 */
router.post("/refund", async (req, res) => {
  try {
    const { paymentIntentId, amount } = req.body;

    if (!paymentIntentId || !amount) {
      return res.status(400).json({
        error: "Missing required fields: paymentIntentId, amount",
      });
    }

    const result = await stripeService.refundPayment(paymentIntentId, amount);

    return res.json(result);
  } catch (error) {
    console.error("Error refunding payment:", error.message);
    return res.status(500).json({
      error: "Failed to refund payment",
      message: error.message,
    });
  }
});

export default router;
