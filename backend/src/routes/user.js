import express from "express";
import db from "../db/db.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * POST /api/users/register
 * 註冊用戶（綁定錢包、載具、設定 config）
 */
router.post("/register", async (req, res) => {
  try {
    const { walletAddress, carrierNumber, poolId, donationPercent } = req.body;

    // 驗證輸入
    if (!walletAddress || !carrierNumber || !poolId || !donationPercent) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (![20, 50].includes(donationPercent)) {
      return res
        .status(400)
        .json({ error: "Donation percent must be 20 or 50" });
    }

    // 檢查是否已註冊
    const existingUser = await db.query(
      "SELECT * FROM users WHERE wallet_address = $1 OR carrier_number = $2",
      [walletAddress, carrierNumber]
    );

    if (existingUser.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "Wallet or carrier already registered" });
    }

    // 插入用戶
    await db.query(
      `INSERT INTO users (wallet_address, carrier_number, pool_id, donation_percent) 
       VALUES ($1, $2, $3, $4)`,
      [walletAddress, carrierNumber, poolId, donationPercent]
    );

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
 * 查詢用戶資訊
 */
router.get("/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const result = await db.query(
      "SELECT * FROM users WHERE wallet_address = $1",
      [walletAddress]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error("Failed to fetch user", { error: error.message });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/users/:walletAddress
 * 更新用戶設定
 */
router.put("/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { poolId, donationPercent } = req.body;

    if (donationPercent && ![20, 50].includes(donationPercent)) {
      return res
        .status(400)
        .json({ error: "Donation percent must be 20 or 50" });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (poolId !== undefined) {
      updates.push(`pool_id = $${paramCount++}`);
      values.push(poolId);
    }

    if (donationPercent !== undefined) {
      updates.push(`donation_percent = $${paramCount++}`);
      values.push(donationPercent);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updates.push(`updated_at = NOW()`);
    values.push(walletAddress);

    await db.query(
      `UPDATE users SET ${updates.join(
        ", "
      )} WHERE wallet_address = $${paramCount}`,
      values
    );

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
