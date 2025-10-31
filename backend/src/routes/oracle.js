import express from "express";
import oracleService from "../services/oracle.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * POST /api/oracle/process-lottery
 * Manually process lottery results with winning numbers
 *
 * Body:
 * {
 *   "lotteryDate": "2025-11-25",
 *   "specialPrize": "53960536",
 *   "grandPrize": "51509866",
 *   "firstPrize": "12345678"
 * }
 *
 * Prize Structure:
 * - Special Prize: 10,000,000 TWD (full 8 digits match)
 * - Grand Prize: 2,000,000 TWD (full 8 digits match)
 * - First Prize: 200,000 TWD (full 8 digits match)
 * - Second Prize: 40,000 TWD (last 7 digits match first prize)
 * - Third Prize: 10,000 TWD (last 6 digits match first prize)
 * - Fourth Prize: 4,000 TWD (last 5 digits match first prize)
 * - Fifth Prize: 1,000 TWD (last 4 digits match first prize)
 * - Sixth Prize: 200 TWD (last 3 digits match first prize)
 */
router.post("/process-lottery", async (req, res) => {
  try {
    const { lotteryDate, specialPrize, grandPrize, firstPrize } = req.body;

    // Validate input
    if (!lotteryDate || !specialPrize || !grandPrize || !firstPrize) {
      return res.status(400).json({
        error: "Missing required fields: lotteryDate, specialPrize, grandPrize, firstPrize"
      });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lotteryDate)) {
      return res.status(400).json({
        error: "Invalid date format. Use YYYY-MM-DD"
      });
    }

    // Validate 8-digit numbers
    if (!/^\d{8}$/.test(specialPrize) || !/^\d{8}$/.test(grandPrize) || !/^\d{8}$/.test(firstPrize)) {
      return res.status(400).json({
        error: "All prize numbers must be 8 digits"
      });
    }

    logger.info("Manual lottery processing requested", {
      lotteryDate,
      specialPrize,
      grandPrize,
      firstPrize
    });

    // Process lottery results
    const result = await oracleService.processLotteryResultsManual(
      lotteryDate,
      specialPrize,
      grandPrize,
      firstPrize
    );

    res.json({
      success: true,
      message: "Lottery results processed successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to process lottery manually", { error: error.message });
    res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
});

export default router;