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

/**
 * POST /api/pools/:poolId/withdraw
 * Withdraw donations from a pool
 */
router.post("/:poolId/withdraw", async (req, res) => {
  try {
    const { poolId } = req.params;
    const { signature } = req.body;

    if (!signature) {
      return res.status(400).json({ error: "Missing required field: signature" });
    }

    const result = await poolService.withdrawDonation(poolId, signature);

    res.json({
      success: true,
      message: "Donations withdrawn successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to withdraw donations", { error: error.message });

    if (error.message.includes("Invalid signature")) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/pools/:poolId/beneficiary
 * Update a pool's beneficiary
 */
router.put("/:poolId/beneficiary", async (req, res) => {
  try {
    const { poolId } = req.params;
    const { beneficiary, signature } = req.body;

    if (!beneficiary || !signature) {
      return res.status(400).json({ error: "Missing required fields: beneficiary and signature" });
    }

    const result = await poolService.updateBeneficiary(poolId, beneficiary, signature);

    res.json({
      success: true,
      message: "Beneficiary updated successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to update beneficiary", { error: error.message });

    if (error.message.includes("Invalid signature")) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/pools/:poolId
 * Deactivate a pool
 */
router.delete("/:poolId", async (req, res) => {
  try {
    const { poolId } = req.params;
    const { signature } = req.body;

    if (!signature) {
      return res.status(400).json({ error: "Missing required field: signature" });
    }

    const result = await poolService.deactivatePool(poolId, signature);

    res.json({
      success: true,
      message: "Pool deactivated successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to deactivate pool", { error: error.message });

    if (error.message.includes("Invalid signature")) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/pools
 * Get all pool IDs
 */
router.get("/", async (req, res) => {
  try {
    const result = await poolService.getAllPoolIds();
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Failed to get all pool IDs", { error: error.message });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/pools/:poolId
 * Get pool data
 */
router.get("/:poolId", async (req, res) => {
  try {
    const { poolId } = req.params;
    const result = await poolService.getPool(poolId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Failed to get pool", { error: error.message });
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
