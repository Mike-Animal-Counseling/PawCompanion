import { Router } from "express";
import * as bookingService from "../services/bookingService.js";

const router = Router();

/**
 * POST /api/booking/create
 * Create a new booking
 */
router.post("/create", async (req, res) => {
  try {
    const {
      userId,
      animalId,
      deliveryAddress,
      phoneNumber,
      deliveryDate,
      specialInstructions,
    } = req.body;

    if (
      !userId ||
      !animalId ||
      !deliveryAddress ||
      !phoneNumber ||
      !deliveryDate
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: userId, animalId, deliveryAddress, phoneNumber, deliveryDate",
      });
    }

    const booking = await bookingService.createBooking(userId, animalId, {
      deliveryAddress,
      phoneNumber,
      deliveryDate,
      specialInstructions,
    });

    return res.json(booking);
  } catch (error) {
    console.error("Error creating booking:", error.message);
    return res.status(500).json({
      error: "Failed to create booking",
      message: error.message,
    });
  }
});

/**
 * GET /api/booking/:bookingId
 * Get booking details
 */
router.get("/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await bookingService.getBookingDetails(bookingId);

    return res.json(booking);
  } catch (error) {
    console.error("Error fetching booking details:", error.message);
    return res.status(500).json({
      error: "Failed to fetch booking details",
      message: error.message,
    });
  }
});

/**
 * PUT /api/booking/:bookingId/status
 * Update booking status
 */
router.put("/:bookingId/status", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: "Missing required field: status",
      });
    }

    const result = await bookingService.updateBookingStatus(bookingId, status);

    return res.json(result);
  } catch (error) {
    console.error("Error updating booking status:", error.message);
    return res.status(500).json({
      error: "Failed to update booking status",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/booking/:bookingId
 * Cancel booking
 */
router.delete("/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const result = await bookingService.cancelBooking(
      bookingId,
      reason || "User requested",
    );

    return res.json(result);
  } catch (error) {
    console.error("Error cancelling booking:", error.message);
    return res.status(500).json({
      error: "Failed to cancel booking",
      message: error.message,
    });
  }
});

/**
 * POST /api/booking/delivery-cost
 * Calculate delivery cost
 */
router.post("/delivery-cost", async (req, res) => {
  try {
    const { origin, destination, weight } = req.body;

    if (!origin || !destination || !weight) {
      return res.status(400).json({
        error: "Missing required fields: origin, destination, weight",
      });
    }

    const cost = await bookingService.calculateDeliveryCost(
      origin,
      destination,
      weight,
    );

    return res.json(cost);
  } catch (error) {
    console.error("Error calculating delivery cost:", error.message);
    return res.status(500).json({
      error: "Failed to calculate delivery cost",
      message: error.message,
    });
  }
});

export default router;
