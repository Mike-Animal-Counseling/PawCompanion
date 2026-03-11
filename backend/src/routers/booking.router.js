import mongoose from "mongoose";
import { Router } from "express";
import Animal from "../models/Animal.js";
import Booking from "../models/Booking.js";
import AnimalAvailability from "../models/AnimalAvailability.js";

const router = Router();

const AVAILABLE_SLOTS = ["09:00", "11:00", "13:00", "15:00", "17:00"];
const SLOT_DURATION = 2; // hours
const MAX_HOURS_PER_DAY = 4; // max 2 slots per day per animal
const ACTIVE_BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "merchant_accepted",
  "rescheduled",
];

const createDefaultSlots = () =>
  AVAILABLE_SLOTS.map((startTime) => {
    const endHour =
      Number.parseInt(startTime.split(":")[0], 10) + SLOT_DURATION;
    return {
      startTime,
      endTime: `${String(endHour).padStart(2, "0")}:00`,
      enabled: true,
    };
  });

const serializeAnimalRef = (animal) => {
  if (!animal) {
    return null;
  }

  return {
    id: animal._id.toString(),
    _id: animal._id.toString(),
    name: animal.name,
    imageUrl: animal.imageUrl,
    price: animal.price,
  };
};

const serializeBooking = (booking) => ({
  ...booking,
  _id: booking._id.toString(),
  animalId: booking.animalId?._id
    ? serializeAnimalRef(booking.animalId)
    : booking.animalId,
});

const getAnimalWithAccessCheck = async (animalId) => {
  if (!mongoose.Types.ObjectId.isValid(animalId)) {
    return null;
  }

  return Animal.findOne({
    _id: animalId,
    isActive: true,
    visibility: "public",
  });
};

const getSlotsForDate = async (animalId, date) => {
  const availability = await AnimalAvailability.findOne({
    animalId,
    date,
  }).lean();
  return availability?.slots?.length
    ? availability.slots
    : createDefaultSlots();
};

const getTodayLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * GET /api/booking/slots/:animalId?date=YYYY-MM-DD
 * Get available time slots for a specific animal on a given date
 */
router.get("/slots/:animalId", async (req, res) => {
  try {
    const { animalId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        error: "Missing required query parameter: date (YYYY-MM-DD)",
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const animal = await getAnimalWithAccessCheck(animalId);
    if (!animal) {
      return res.status(404).json({ error: "Animal not found" });
    }

    const baseSlots = await getSlotsForDate(animal._id, date);

    const bookings = await Booking.find({
      animalId: animal._id,
      date,
      status: { $in: ACTIVE_BOOKING_STATUSES },
    });

    // Calculate total booked hours
    const bookedHours = bookings.reduce((total, booking) => {
      return total + SLOT_DURATION;
    }, 0);

    // If already at or over 4 hours, no slots available
    if (bookedHours >= MAX_HOURS_PER_DAY) {
      return res.json([]);
    }

    // Create a set of booked times for quick lookup
    const bookedTimes = new Set(bookings.map((b) => b.startTime));

    // Generate available slots
    const availableSlots = baseSlots.map((slot) => {
      const isBooked = bookedTimes.has(slot.startTime);
      const available =
        slot.enabled && !isBooked && bookedHours < MAX_HOURS_PER_DAY;

      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        available,
      };
    });

    return res.json(availableSlots);
  } catch (error) {
    console.error("Error fetching available slots:", error.message);
    return res.status(500).json({
      error: "Failed to fetch available slots",
      message: error.message,
    });
  }
});

/**
 * POST /api/booking/create
 * Create a new booking
 */
router.post("/create", async (req, res) => {
  try {
    const { userId, animalId, date, startTime } = req.body;

    if (!userId || !animalId || !date || !startTime) {
      return res.status(400).json({
        error: "Missing required fields: userId, animalId, date, startTime",
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(startTime)) {
      return res.status(400).json({
        error: "Invalid time format. Use HH:MM",
      });
    }

    const animal = await getAnimalWithAccessCheck(animalId);
    if (!animal) {
      return res.status(404).json({
        error: "Animal not found",
      });
    }

    // Calculate end time
    const startHour = parseInt(startTime.split(":")[0]);
    const endHour = startHour + SLOT_DURATION;
    const endTime = `${String(endHour).padStart(2, "0")}:00`;

    // Check if slot is valid (must be in available slots)
    if (!AVAILABLE_SLOTS.includes(startTime)) {
      return res.status(400).json({
        error: `Invalid start time. Available slots: ${AVAILABLE_SLOTS.join(", ")}`,
      });
    }

    // Check if slot is already booked
    const slots = await getSlotsForDate(animal._id, date);
    const selectedSlot = slots.find(
      (slot) => slot.startTime === startTime && slot.enabled,
    );

    if (!selectedSlot) {
      return res.status(400).json({
        error: "Selected time slot is not available for booking",
      });
    }

    const existingBooking = await Booking.findOne({
      animalId: animal._id,
      date,
      startTime,
      status: { $in: ACTIVE_BOOKING_STATUSES },
    });

    if (existingBooking) {
      return res.status(400).json({
        error: "This time slot is already booked",
      });
    }

    // Check daily 4-hour limit
    const dailyBookings = await Booking.find({
      animalId: animal._id,
      date,
      status: { $in: ACTIVE_BOOKING_STATUSES },
    });

    const totalBooked = dailyBookings.length * SLOT_DURATION;
    if (totalBooked + SLOT_DURATION > MAX_HOURS_PER_DAY) {
      return res.status(400).json({
        error:
          "Adding this booking would exceed the 4-hour daily limit for this animal",
      });
    }

    // Create the booking
    const booking = new Booking({
      userId,
      animalId: animal._id,
      merchantId: animal.merchantId,
      date,
      startTime,
      endTime: selectedSlot.endTime,
      totalPrice: animal.price * 2,
      status: "pending",
    });

    await booking.save();

    await booking.populate("animalId", "name imageUrl price");
    const bookingWithAnimal = serializeBooking(booking.toObject());

    return res.status(201).json(bookingWithAnimal);
  } catch (error) {
    console.error("Error creating booking:", error.message);
    return res.status(500).json({
      error: "Failed to create booking",
      message: error.message,
    });
  }
});

/**
 * POST /api/booking/checkout
 * Process checkout for multiple bookings
 */
router.post("/checkout", async (req, res) => {
  try {
    const { userId, bookingIds, address, phoneNumber, paymentDetails } =
      req.body;

    if (!userId || !bookingIds || !Array.isArray(bookingIds)) {
      return res.status(400).json({
        error: "Missing required fields: userId, bookingIds (array)",
      });
    }

    if (!address || !phoneNumber || !paymentDetails) {
      return res.status(400).json({
        error: "Missing required fields: address, phoneNumber, paymentDetails",
      });
    }

    // Validate all bookings belong to user and are pending
    const bookings = await Booking.find({ _id: { $in: bookingIds } }).populate(
      "animalId",
      "name imageUrl price",
    );

    for (const booking of bookings) {
      if (booking.userId !== userId) {
        return res.status(403).json({
          error: "Booking does not belong to user",
        });
      }
      if (booking.status !== "pending") {
        return res.status(400).json({
          error: `Booking ${booking._id} is not in pending status`,
        });
      }
    }

    // Mock payment processing
    const paymentId = `pay_${Date.now()}`;
    const totalPrice = bookings.reduce((sum, b) => sum + b.totalPrice, 0);

    // Update all bookings to confirmed with address, phone, payment info
    const updatePromises = bookings.map((booking) =>
      Booking.findByIdAndUpdate(
        booking._id,
        {
          address,
          phoneNumber,
          paymentId,
          status: "confirmed",
        },
        { new: true },
      ),
    );

    const updatedBookings = await Promise.all(updatePromises);

    // Attach animal data to each booking
    const repopulatedBookings = await Booking.find({
      _id: { $in: updatedBookings.map((booking) => booking._id) },
    }).populate("animalId", "name imageUrl price");

    const bookingsWithAnimals = repopulatedBookings.map((booking) =>
      serializeBooking(booking.toObject()),
    );

    // Generate receipts
    const paymentReceipt = {
      paymentId,
      totalPaid: totalPrice,
      sessionsCount: bookings.length,
      date: new Date().toISOString().split("T")[0],
    };

    const bookingReceipts = bookingsWithAnimals.map((booking) => ({
      bookingId: booking._id,
      animalName: booking.animalId?.name,
      date: booking.date,
      time: `${booking.startTime} to ${booking.endTime}`,
      price: booking.totalPrice,
    }));

    return res.json({
      paymentReceipt,
      bookingReceipts,
    });
  } catch (error) {
    console.error("Error processing checkout:", error.message);
    return res.status(500).json({
      error: "Failed to process checkout",
      message: error.message,
    });
  }
});

/**
 * GET /api/booking/my/:userId
 * Get all bookings for a user
 */
router.get("/my/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const bookings = await Booking.find({ userId })
      .populate("animalId", "name imageUrl price")
      .sort({ date: -1, startTime: -1 })
      .lean();

    const bookingsWithAnimals = bookings.map(serializeBooking);

    return res.json(bookingsWithAnimals);
  } catch (error) {
    console.error("Error fetching user bookings:", error.message);
    return res.status(500).json({
      error: "Failed to fetch bookings",
      message: error.message,
    });
  }
});

/**
 * PATCH /api/booking/:bookingId/reschedule
 * Reschedule an existing booking to a new date/time
 */
router.patch("/:bookingId/reschedule", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId, date, startTime } = req.body;

    if (!userId || !date || !startTime) {
      return res.status(400).json({
        error: "Missing required fields: userId, date, startTime",
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    if (!/^\d{2}:\d{2}$/.test(startTime)) {
      return res.status(400).json({
        error: "Invalid time format. Use HH:MM",
      });
    }

    if (!AVAILABLE_SLOTS.includes(startTime)) {
      return res.status(400).json({
        error: `Invalid start time. Available slots: ${AVAILABLE_SLOTS.join(", ")}`,
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        error: "Booking not found",
      });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({
        error: "Booking does not belong to user",
      });
    }

    if (
      booking.status === "cancelled" ||
      booking.status === "merchant_rejected"
    ) {
      return res.status(400).json({
        error: "Cancelled bookings cannot be rescheduled",
      });
    }

    // Confirmed bookings can only be moved to tomorrow or later
    if (booking.status === "confirmed") {
      const today = getTodayLocalDateString();
      if (date <= today) {
        return res.status(400).json({
          error:
            "Confirmed bookings can only be rescheduled to tomorrow or later",
        });
      }
    }

    const oldDate = booking.date;
    const oldStartTime = booking.startTime;
    const oldEndTime = booking.endTime;

    const slots = await getSlotsForDate(booking.animalId, date);
    const selectedSlot = slots.find(
      (slot) => slot.startTime === startTime && slot.enabled,
    );

    if (!selectedSlot) {
      return res.status(400).json({
        error: "Selected time slot is not available for booking",
      });
    }

    // Check if requested slot is already used by another active booking
    const existingBooking = await Booking.findOne({
      _id: { $ne: booking._id },
      animalId: booking.animalId,
      date,
      startTime,
      status: { $in: ACTIVE_BOOKING_STATUSES },
    });

    if (existingBooking) {
      return res.status(400).json({
        error: "This time slot is already booked",
      });
    }

    // Enforce max daily hours, excluding the current booking itself
    const dailyBookings = await Booking.find({
      _id: { $ne: booking._id },
      animalId: booking.animalId,
      date,
      status: { $in: ACTIVE_BOOKING_STATUSES },
    });

    const totalBooked = dailyBookings.length * SLOT_DURATION;
    if (totalBooked + SLOT_DURATION > MAX_HOURS_PER_DAY) {
      return res.status(400).json({
        error: "Reschedule would exceed the 4-hour daily limit for this animal",
      });
    }

    booking.date = date;
    booking.startTime = startTime;
    booking.endTime = selectedSlot.endTime;
    booking.status = "rescheduled";
    booking.rescheduledAt = new Date();
    booking.rescheduleNote = `Rescheduled from ${oldDate} ${oldStartTime}-${oldEndTime} to ${date} ${startTime}-${selectedSlot.endTime}`;
    await booking.save();

    await booking.populate("animalId", "name imageUrl price");
    const updatedBooking = serializeBooking(booking.toObject());
    return res.json(updatedBooking);
  } catch (error) {
    console.error("Error rescheduling booking:", error.message);
    return res.status(500).json({
      error: "Failed to reschedule booking",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/booking/:bookingId
 * Cancel or delete a pending booking
 */
router.delete("/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: "Missing required query parameter: userId",
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        error: "Booking not found",
      });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({
        error: "Booking does not belong to user",
      });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({
        error: "Can only delete pending bookings",
      });
    }

    await Booking.findByIdAndDelete(bookingId);

    return res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error.message);
    return res.status(500).json({
      error: "Failed to delete booking",
      message: error.message,
    });
  }
});

export default router;
