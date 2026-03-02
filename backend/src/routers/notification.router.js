import { Router } from "express";
import * as notificationService from "../services/notificationService.js";

const router = Router();

/**
 * POST /api/notification/sms
 * Send SMS notification
 */
router.post("/sms", async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        error: "Missing required fields: phoneNumber, message",
      });
    }

    const result = await notificationService.sendSMS(phoneNumber, message);

    return res.json(result);
  } catch (error) {
    console.error("Error sending SMS:", error.message);
    return res.status(500).json({
      error: "Failed to send SMS",
      message: error.message,
    });
  }
});

/**
 * POST /api/notification/email
 * Send email notification
 */
router.post("/email", async (req, res) => {
  try {
    const { email, subject, html } = req.body;

    if (!email || !subject || !html) {
      return res.status(400).json({
        error: "Missing required fields: email, subject, html",
      });
    }

    const result = await notificationService.sendEmail(email, subject, html);

    return res.json(result);
  } catch (error) {
    console.error("Error sending email:", error.message);
    return res.status(500).json({
      error: "Failed to send email",
      message: error.message,
    });
  }
});

/**
 * POST /api/notification/push
 * Send push notification
 */
router.post("/push", async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        error: "Missing required fields: userId, title, body",
      });
    }

    const result = await notificationService.sendPushNotification(
      userId,
      title,
      body,
      data,
    );

    return res.json(result);
  } catch (error) {
    console.error("Error sending push notification:", error.message);
    return res.status(500).json({
      error: "Failed to send push notification",
      message: error.message,
    });
  }
});

/**
 * POST /api/notification/order-confirmation
 * Send order confirmation
 */
router.post("/order-confirmation", async (req, res) => {
  try {
    const { userId, email, orderId, animalName } = req.body;

    if (!userId || !email || !orderId || !animalName) {
      return res.status(400).json({
        error: "Missing required fields: userId, email, orderId, animalName",
      });
    }

    const result = await notificationService.sendOrderConfirmation(
      userId,
      email,
      orderId,
      animalName,
    );

    return res.json(result);
  } catch (error) {
    console.error("Error sending order confirmation:", error.message);
    return res.status(500).json({
      error: "Failed to send order confirmation",
      message: error.message,
    });
  }
});

export default router;
