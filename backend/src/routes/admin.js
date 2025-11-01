import express from "express";
import adminService from "../services/admin.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * PUT /api/admin/token-uri
 * Set the token URI
 */
router.put("/token-uri", async (req, res) => {
  try {
    const { uri, signature } = req.body;

    if (!uri || !signature) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await adminService.setTokenUri(uri, signature);

    res.status(200).json({
      success: true,
      message: "Token URI set successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to set token URI", { error: error.message });
    if (error.message.includes("Invalid signature")) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/admin/pool-contract
 * Set the pool contract address
 */
router.put("/pool-contract", async (req, res) => {
  try {
    const { address, signature } = req.body;

    if (!address || !signature) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await adminService.setPoolContract(address, signature);

    res.status(200).json({
      success: true,
      message: "Pool contract address set successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to set pool contract address", { error: error.message });
    if (error.message.includes("Invalid signature")) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
