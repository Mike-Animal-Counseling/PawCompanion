import { Router } from "express";
import mongoose from "mongoose";
import Animal from "../models/Animal.js";

const router = Router();

const publicFilter = {
  isActive: true,
  visibility: "public",
};

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
  merchant: animal.merchantId
    ? {
        id: animal.merchantId._id.toString(),
        name: animal.merchantId.name,
        businessType: animal.merchantId.businessType || "Pet Cafe & Shelter",
      }
    : null,
  createdAt: animal.createdAt,
  updatedAt: animal.updatedAt,
});

router.get("/", async (req, res) => {
  try {
    const animals = await Animal.find(publicFilter)
      .populate("merchantId", "name businessType")
      .sort({ createdAt: -1 })
      .lean();
    res.json(animals.map(serializeAnimal));
  } catch (error) {
    console.error("Animals list error:", error.message);
    res.status(500).json({ error: "Failed to load animals" });
  }
});

router.get("/tags", async (req, res) => {
  try {
    const tagCounts = await Animal.aggregate([
      { $match: publicFilter },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", count: 1 } },
      { $sort: { name: 1 } },
    ]);

    const totalCount = await Animal.countDocuments(publicFilter);
    res.json([{ name: "All", count: totalCount }, ...tagCounts]);
  } catch (error) {
    console.error("Animal tags error:", error.message);
    res.status(500).json({ error: "Failed to load tags" });
  }
});

router.get("/search/:searchTerm", async (req, res) => {
  try {
    const { searchTerm } = req.params;
    const animals = await Animal.find({
      ...publicFilter,
      name: { $regex: searchTerm, $options: "i" },
    })
      .populate("merchantId", "name businessType")
      .sort({ createdAt: -1 })
      .lean();

    res.json(animals.map(serializeAnimal));
  } catch (error) {
    console.error("Animal search error:", error.message);
    res.status(500).json({ error: "Failed to search animals" });
  }
});

router.get("/tag/:tag", async (req, res) => {
  try {
    const { tag } = req.params;
    const animals = await Animal.find({
      ...publicFilter,
      tags: tag,
    })
      .populate("merchantId", "name businessType")
      .sort({ createdAt: -1 })
      .lean();

    res.json(animals.map(serializeAnimal));
  } catch (error) {
    console.error("Animal tag filter error:", error.message);
    res.status(500).json({ error: "Failed to filter animals by tag" });
  }
});

router.get("/:animalId", async (req, res) => {
  try {
    const { animalId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(animalId)) {
      return res.status(404).json({ error: "Animal not found" });
    }

    const animal = await Animal.findOne({
      _id: animalId,
      ...publicFilter,
    })
      .populate("merchantId", "name businessType")
      .lean();

    if (!animal) {
      return res.status(404).json({ error: "Animal not found" });
    }

    res.json(serializeAnimal(animal));
  } catch (error) {
    console.error("Animal detail error:", error.message);
    res.status(500).json({ error: "Failed to load animal" });
  }
});

export default router;
