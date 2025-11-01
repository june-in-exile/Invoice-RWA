import express from "express";
import db from "../db/db.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * POST /api/users/register
 * Register user (bind wallet, carrier, set config)
 */
router.post("/register", async (req, res) => {
  try {
    const { walletAddress, carrierNumber, poolId, donationPercent } = req.body;

    // Validate input
    if (!walletAddress || !carrierNumber || !poolId || !donationPercent) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (donationPercent < 25 || donationPercent > 100) {
      return res
        .status(400)
        .json({ error: "Donation percent must be at least 25%" });
    }

    // Check if already registered (using abstracted query)
    const existingByWallet = await db.findOne("users", {
      wallet_address: walletAddress,
    });
    const existingByCarrier = await db.findOne("users", {
      carrier_number: carrierNumber,
    });

    if (existingByWallet || existingByCarrier) {
      return res
        .status(409)
        .json({ error: "Wallet or carrier already registered" });
    }

    // Insert user (using abstracted insert)
    await db.insert("users", {
      wallet_address: walletAddress,
      carrier_number: carrierNumber,
      pool_id: poolId,
      donation_percent: donationPercent,
    });

    logger.info("User registered", { walletAddress, carrierNumber });

    res.json({
      success: true,
      message: "User registered successfully",
      data: {
        walletAddress,
        carrierNumber,
        poolId,
        donationPercent,
      },
    });
  } catch (error) {
    logger.error("Failed to register user", { error: error.message });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/users/:walletAddress
 * Query user information
 */
router.get("/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const user = await db.findOne("users", {
      wallet_address: walletAddress,
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error("Failed to fetch user", { error: error.message });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/users/:walletAddress
 * Update user settings
 */
router.put("/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { poolId, donationPercent } = req.body;

    if (donationPercent && (donationPercent < 25 || donationPercent > 100)) {
      return res
        .status(400)
        .json({ error: "Donation percent must be at least 25%" });
    }

    const updateData = {};

    if (poolId !== undefined) {
      updateData.pool_id = poolId;
    }

    if (donationPercent !== undefined) {
      updateData.donation_percent = donationPercent;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // Use abstracted update method
    const rowsAffected = await db.update("users", updateData, {
      wallet_address: walletAddress,
    });

    if (rowsAffected === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    logger.info("User updated", { walletAddress, poolId, donationPercent });

    res.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    logger.error("Failed to update user", { error: error.message });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
