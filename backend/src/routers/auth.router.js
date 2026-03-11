import { Router } from "express";
import bcrypt from "bcryptjs";
import Merchant from "../models/Merchant.js";
import { requireAuth, requireRole, signAuthToken } from "../middleware/auth.js";

const router = Router();

const serializeMerchant = (merchant) => ({
  id: merchant._id.toString(),
  name: merchant.name,
  businessType: merchant.businessType || "Pet Cafe & Shelter",
  email: merchant.email,
  role: merchant.role,
  status: merchant.status,
});

router.post("/merchant/register", async (req, res) => {
  try {
    const { name, businessType, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingMerchant = await Merchant.findOne({ email: normalizedEmail });

    if (existingMerchant) {
      return res.status(409).json({ error: "Merchant account already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const merchant = await Merchant.create({
      name: name.trim(),
      businessType:
        businessType &&
        ["Pet Cafe", "Shelter", "Rescue", "Pet Cafe & Shelter"].includes(
          businessType,
        )
          ? businessType
          : "Pet Cafe & Shelter",
      email: normalizedEmail,
      passwordHash,
    });

    const user = serializeMerchant(merchant);
    const token = signAuthToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    return res.status(201).json({ token, user });
  } catch (error) {
    console.error("Merchant register error:", error.message);
    return res.status(500).json({ error: "Failed to register merchant" });
  }
});

router.post("/merchant/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const merchant = await Merchant.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!merchant) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (merchant.status !== "active") {
      return res.status(403).json({ error: "Merchant account is not active" });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      merchant.passwordHash,
    );
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = serializeMerchant(merchant);
    const token = signAuthToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    return res.json({ token, user });
  } catch (error) {
    console.error("Merchant login error:", error.message);
    return res.status(500).json({ error: "Failed to login merchant" });
  }
});

router.get(
  "/merchant/me",
  requireAuth,
  requireRole("merchant"),
  async (req, res) => {
    try {
      const merchant = await Merchant.findById(req.auth.sub);

      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      return res.json({ user: serializeMerchant(merchant) });
    } catch (error) {
      console.error("Merchant me error:", error.message);
      return res.status(500).json({ error: "Failed to load merchant profile" });
    }
  },
);

export default router;
