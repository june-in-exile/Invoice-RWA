import express from "express";
import rewardsService from "../services/rewards.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * POST /api/rewards/claim
 * Claim rewards
 */
router.post("/claim", async (req, res) => {
  try {
    const { walletAddress, tokenTypeId, signature } = req.body;

    if (!walletAddress || !tokenTypeId || !signature) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await rewardsService.claimReward(
      walletAddress,
      tokenTypeId,
      signature
    );

    res.status(200).json({
      success: true,
      message: "Reward claimed successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to claim reward", { error: error.message });
    if (error.message.includes("Invalid signature")) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/rewards/:walletAddress/:tokenTypeId
 * Get claimable reward for a specific token type
 */
router.get("/:walletAddress/:tokenTypeId", async (req, res) => {
  try {
    const { walletAddress, tokenTypeId } = req.params;

    if (!walletAddress || !tokenTypeId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await rewardsService.getClaimableReward(
      walletAddress,
      tokenTypeId
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Failed to get claimable reward", { error: error.message });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
