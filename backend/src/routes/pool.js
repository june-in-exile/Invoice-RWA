import express from "express";
import poolService from "../services/pool.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * POST /api/pools/register
 * Register a new pool (Admin only)
 */
router.post("/register", async (req, res) => {
  try {
    const { poolId, beneficiary, name, lotteryMonth, signature } = req.body;

    if (!poolId || !beneficiary || !name || lotteryMonth === undefined || !signature) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await poolService.registerPool(
      poolId,
      beneficiary,
      name,
      lotteryMonth,
      signature
    );

    res.status(201).json({
      success: true,
      message: "Pool registered successfully",
      data: result,
    });

  } catch (error) {
    logger.error("Failed to register pool", { error: error.message });
    if (error.message.includes("Invalid signature")) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/pools/:poolId/min-donation-percent
 * Update a pool's minimum donation percentage
 */
router.put("/:poolId/min-donation-percent", async (req, res) => {
  try {
    const { poolId } = req.params;
    const { minDonationPercent, signature } = req.body;

    if (minDonationPercent === undefined || !signature) {
      return res.status(400).json({ error: "Missing required fields: minDonationPercent and signature" });
    }

    if (typeof minDonationPercent !== 'number' || minDonationPercent < 0 || minDonationPercent > 100) {
        return res.status(400).json({ error: "Invalid minDonationPercent. Must be a number between 0 and 100." });
    }

    const result = await poolService.updateMinDonationPercent(
      poolId,
      minDonationPercent,
      signature
    );

    res.json({
      success: true,
      message: "Minimum donation percentage updated successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to update min donation percent", { error: error.message });

    if (error.message.includes("Invalid signature")) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
