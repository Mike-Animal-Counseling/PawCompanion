import mongoose from "mongoose";
import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import Animal from "../models/Animal.js";
import Booking from "../models/Booking.js";
import AnimalAvailability from "../models/AnimalAvailability.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

const AVAILABLE_SLOTS = ["09:00", "11:00", "13:00", "15:00", "17:00"];
const SLOT_DURATION = 2;
const ACTIVE_BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "merchant_accepted",
  "rescheduled",
];
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Only JPG and PNG images are supported"));
      return;
    }
    cb(null, true);
  },
});

const getUploadedFilePathFromImageUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== "string") {
    return null;
  }

  let pathname = "";
  if (imageUrl.startsWith("/uploads/")) {
    pathname = imageUrl;
  } else {
    try {
      pathname = new URL(imageUrl).pathname;
    } catch (_error) {
      return null;
    }
  }

  if (!pathname.startsWith("/uploads/")) {
    return null;
  }

  const fileName = path.basename(pathname);
  if (!fileName || fileName === "." || fileName === "..") {
    return null;
  }

  return path.join(UPLOADS_DIR, fileName);
};

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

const serializeAnimal = (animal) => ({
  id: animal._id.toString(),
  _id: animal._id.toString(),
  name: animal.name,
  price: animal.price,
  favorite: animal.favorite,
  origins: animal.origins,
  stars: animal.stars,
  imageUrl: animal.imageUrl,
  personality: animal.personality,
  tags: animal.tags,
  isActive: animal.isActive,
  visibility: animal.visibility,
  createdAt: animal.createdAt,
  updatedAt: animal.updatedAt,
});

const serializeBooking = (booking) => ({
  ...booking,
  _id: booking._id.toString(),
  animalId: booking.animalId
    ? {
        id: booking.animalId._id.toString(),
        _id: booking.animalId._id.toString(),
        name: booking.animalId.name,
        imageUrl: booking.animalId.imageUrl,
        price: booking.animalId.price,
      }
    : null,
});

const ensureMerchantAnimal = async (animalId, merchantId) => {
  if (!mongoose.Types.ObjectId.isValid(animalId)) {
    return null;
  }

  return Animal.findOne({ _id: animalId, merchantId });
};

const ensureMerchantBooking = async (bookingId, merchantId) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return null;
  }

  return Booking.findOne({ _id: bookingId, merchantId }).populate(
    "animalId",
    "name imageUrl price",
  );
};

router.use(requireAuth, requireRole("merchant"));

router.post("/upload-image", (req, res) => {
  upload.single("image")(req, res, (error) => {
    if (error) {
      return res
        .status(400)
        .json({ error: error.message || "Image upload failed" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    return res.status(201).json({ imageUrl, fileName: req.file.filename });
  });
});

router.delete("/upload-image", (req, res) => {
  const filePath = getUploadedFilePathFromImageUrl(req.body?.imageUrl);

  if (!filePath) {
    return res
      .status(400)
      .json({ error: "Only locally uploaded images can be deleted" });
  }

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete image" });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    const merchantId = req.auth.sub;

    const [
      animalsCount,
      activeAnimalsCount,
      pendingBookings,
      confirmedBookings,
    ] = await Promise.all([
      Animal.countDocuments({ merchantId }),
      Animal.countDocuments({ merchantId, isActive: true }),
      Booking.countDocuments({ merchantId, status: "pending" }),
      Booking.countDocuments({
        merchantId,
        status: { $in: ["confirmed", "merchant_accepted", "rescheduled"] },
      }),
    ]);

    return res.json({
      animalsCount,
      activeAnimalsCount,
      pendingBookings,
      confirmedBookings,
    });
  } catch (error) {
    console.error("Merchant dashboard error:", error.message);
    return res.status(500).json({ error: "Failed to load merchant dashboard" });
  }
});

router.get("/animals", async (req, res) => {
  try {
    const animals = await Animal.find({ merchantId: req.auth.sub }).sort({
      createdAt: -1,
    });
    return res.json(animals.map(serializeAnimal));
  } catch (error) {
    console.error("Merchant animals list error:", error.message);
    return res.status(500).json({ error: "Failed to load merchant animals" });
  }
});

router.get("/animals/:animalId", async (req, res) => {
  try {
    const animal = await ensureMerchantAnimal(
      req.params.animalId,
      req.auth.sub,
    );

    if (!animal) {
      return res.status(404).json({ error: "Animal not found" });
    }

    return res.json(serializeAnimal(animal));
  } catch (error) {
    console.error("Merchant animal detail error:", error.message);
    return res.status(500).json({ error: "Failed to load animal" });
  }
});

router.post("/animals", async (req, res) => {
  try {
    const {
      name,
      price,
      favorite,
      origins,
      stars,
      imageUrl,
      personality,
      tags,
      visibility,
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    const animal = await Animal.create({
      merchantId: req.auth.sub,
      name: String(name).trim(),
      price: Number(price),
      favorite: Boolean(favorite),
      origins: Array.isArray(origins) ? origins : [],
      stars: Number(stars || 0),
      imageUrl: imageUrl?.trim() || "",
      personality: personality?.trim() || "",
      tags: Array.isArray(tags) ? tags : [],
      visibility: visibility === "private" ? "private" : "public",
      isActive: true,
    });

    return res.status(201).json(serializeAnimal(animal));
  } catch (error) {
    console.error("Merchant animal create error:", error.message);
    return res.status(500).json({ error: "Failed to create animal" });
  }
});

router.put("/animals/:animalId", async (req, res) => {
  try {
    const animal = await ensureMerchantAnimal(
      req.params.animalId,
      req.auth.sub,
    );

    if (!animal) {
      return res.status(404).json({ error: "Animal not found" });
    }

    const {
      name,
      price,
      favorite,
      origins,
      stars,
      imageUrl,
      personality,
      tags,
      visibility,
      isActive,
    } = req.body;

    animal.name = String(name ?? animal.name).trim();
    animal.price = Number(price ?? animal.price);
    animal.favorite = favorite ?? animal.favorite;
    animal.origins = Array.isArray(origins) ? origins : animal.origins;
    animal.stars = Number(stars ?? animal.stars);
    animal.imageUrl = imageUrl?.trim() ?? animal.imageUrl;
    animal.personality = personality?.trim() ?? animal.personality;
    animal.tags = Array.isArray(tags) ? tags : animal.tags;
    animal.visibility = visibility === "private" ? "private" : "public";
    animal.isActive =
      typeof isActive === "boolean" ? isActive : animal.isActive;
    await animal.save();

    return res.json(serializeAnimal(animal));
  } catch (error) {
    console.error("Merchant animal update error:", error.message);
    return res.status(500).json({ error: "Failed to update animal" });
  }
});

router.delete("/animals/:animalId", async (req, res) => {
  try {
    const animal = await ensureMerchantAnimal(
      req.params.animalId,
      req.auth.sub,
    );

    if (!animal) {
      return res.status(404).json({ error: "Animal not found" });
    }

    animal.isActive = false;
    animal.visibility = "private";
    await animal.save();

    return res.json({ message: "Animal archived successfully" });
  } catch (error) {
    console.error("Merchant animal archive error:", error.message);
    return res.status(500).json({ error: "Failed to archive animal" });
  }
});

router.get("/animals/:animalId/availability", async (req, res) => {
  try {
    const animal = await ensureMerchantAnimal(
      req.params.animalId,
      req.auth.sub,
    );

    if (!animal) {
      return res.status(404).json({ error: "Animal not found" });
    }

    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: "date query is required" });
    }

    const availability = await AnimalAvailability.findOne({
      animalId: animal._id,
      date,
    }).lean();

    return res.json({
      date,
      animalId: animal._id.toString(),
      slots: availability?.slots?.length
        ? availability.slots
        : createDefaultSlots(),
    });
  } catch (error) {
    console.error("Merchant availability read error:", error.message);
    return res.status(500).json({ error: "Failed to load availability" });
  }
});

router.put("/animals/:animalId/availability", async (req, res) => {
  try {
    const animal = await ensureMerchantAnimal(
      req.params.animalId,
      req.auth.sub,
    );

    if (!animal) {
      return res.status(404).json({ error: "Animal not found" });
    }

    const { date, slots } = req.body;
    if (!date || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ error: "date and slots are required" });
    }

    const sanitizedSlots = slots.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      enabled: Boolean(slot.enabled),
    }));

    const availability = await AnimalAvailability.findOneAndUpdate(
      { animalId: animal._id, date },
      { animalId: animal._id, date, slots: sanitizedSlots },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.json({
      date: availability.date,
      animalId: animal._id.toString(),
      slots: availability.slots,
    });
  } catch (error) {
    console.error("Merchant availability save error:", error.message);
    return res.status(500).json({ error: "Failed to save availability" });
  }
});

router.get("/bookings", async (req, res) => {
  try {
    const query = { merchantId: req.auth.sub };
    if (req.query.status) {
      query.status = req.query.status;
    }

    const bookings = await Booking.find(query)
      .populate("animalId", "name imageUrl price")
      .sort({ date: 1, startTime: 1 })
      .lean();

    return res.json(bookings.map(serializeBooking));
  } catch (error) {
    console.error("Merchant bookings list error:", error.message);
    return res.status(500).json({ error: "Failed to load merchant bookings" });
  }
});

router.patch("/bookings/:bookingId/accept", async (req, res) => {
  try {
    const booking = await ensureMerchantBooking(
      req.params.bookingId,
      req.auth.sub,
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    booking.status = "merchant_accepted";
    booking.decisionNote = req.body.note?.trim() || "Accepted by merchant";
    await booking.save();

    return res.json(serializeBooking(booking.toObject()));
  } catch (error) {
    console.error("Merchant accept booking error:", error.message);
    return res.status(500).json({ error: "Failed to accept booking" });
  }
});

router.patch("/bookings/:bookingId/reject", async (req, res) => {
  try {
    const booking = await ensureMerchantBooking(
      req.params.bookingId,
      req.auth.sub,
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    booking.status = "merchant_rejected";
    booking.decisionNote = req.body.note?.trim() || "Rejected by merchant";
    await booking.save();

    return res.json(serializeBooking(booking.toObject()));
  } catch (error) {
    console.error("Merchant reject booking error:", error.message);
    return res.status(500).json({ error: "Failed to reject booking" });
  }
});

router.patch("/bookings/:bookingId/reschedule", async (req, res) => {
  try {
    const booking = await ensureMerchantBooking(
      req.params.bookingId,
      req.auth.sub,
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const { date, startTime, note } = req.body;
    if (!date || !startTime) {
      return res.status(400).json({ error: "date and startTime are required" });
    }

    const availability = await AnimalAvailability.findOne({
      animalId: booking.animalId._id,
      date,
    }).lean();
    const baseSlots = availability?.slots?.length
      ? availability.slots
      : createDefaultSlots();
    const targetSlot = baseSlots.find(
      (slot) => slot.startTime === startTime && slot.enabled,
    );

    if (!targetSlot) {
      return res
        .status(400)
        .json({ error: "Selected slot is not available for this animal" });
    }

    const collision = await Booking.findOne({
      _id: { $ne: booking._id },
      animalId: booking.animalId._id,
      date,
      startTime,
      status: { $in: ACTIVE_BOOKING_STATUSES },
    });

    if (collision) {
      return res.status(400).json({ error: "This slot is already booked" });
    }

    const previousDate = booking.date;
    const previousTime = `${booking.startTime}-${booking.endTime}`;

    booking.date = date;
    booking.startTime = startTime;
    booking.endTime = targetSlot.endTime;
    booking.status = "rescheduled";
    booking.rescheduledAt = new Date();
    booking.rescheduleNote =
      note?.trim() ||
      `Merchant rescheduled from ${previousDate} ${previousTime} to ${date} ${startTime}-${targetSlot.endTime}`;
    await booking.save();

    return res.json(serializeBooking(booking.toObject()));
  } catch (error) {
    console.error("Merchant reschedule booking error:", error.message);
    return res.status(500).json({ error: "Failed to reschedule booking" });
  }
});

export default router;
