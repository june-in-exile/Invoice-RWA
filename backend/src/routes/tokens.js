import express from "express";
import tokenService from "../services/token.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * GET /api/tokens/:tokenTypeId
 * Get token type data
 */
router.get("/:tokenTypeId", async (req, res) => {
  try {
    const { tokenTypeId } = req.params;

    const result = await tokenService.getTokenTypeData(tokenTypeId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Failed to get token type data", { error: error.message });
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/tokens/:tokenTypeId/drawn
 * Check if a token type has been drawn
 */
router.get("/:tokenTypeId/drawn", async (req, res) => {
  try {
    const { tokenTypeId } = req.params;

    const result = await tokenService.isDrawn(tokenTypeId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Failed to check if token is drawn", { error: error.message });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
