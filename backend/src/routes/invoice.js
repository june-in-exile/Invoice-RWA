import express from "express";
import invoiceService from "../services/invoice.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * POST /api/invoices/register
 * 註冊新發票（由加值中心呼叫）
 */
router.post("/register", async (req, res) => {
  try {
    const { invoiceNumber, carrierNumber, amount, purchaseDate, lotteryDay } =
      req.body;

    // 驗證輸入
    if (
      !invoiceNumber ||
      !carrierNumber ||
      !amount ||
      !purchaseDate ||
      !lotteryDay
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 註冊發票
    const result = await invoiceService.registerInvoice({
      invoiceNumber,
      carrierNumber,
      amount,
      purchaseDate,
      lotteryDay,
    });

    res.json({
      success: true,
      message: "Invoice registered successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to register invoice", { error: error.message });

    if (error.message.includes("not registered")) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/invoices/batch-register
 * 批量註冊發票
 */
router.post("/batch-register", async (req, res) => {
  try {
    const { invoices } = req.body;

    if (!Array.isArray(invoices) || invoices.length === 0) {
      return res.status(400).json({ error: "Invalid invoices array" });
    }

    const results = await invoiceService.batchRegisterInvoices(invoices);

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.length - successCount;

    res.json({
      success: true,
      message: `Processed ${results.length} invoices`,
      summary: {
        total: results.length,
        success: successCount,
        failed: failedCount,
      },
      results,
    });
  } catch (error) {
    logger.error("Failed to batch register invoices", { error: error.message });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/invoices/user/:walletAddress
 * 查詢用戶的所有發票
 */
router.get("/user/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const invoices = await invoiceService.getUserInvoices(walletAddress);

    res.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    logger.error("Failed to fetch user invoices", { error: error.message });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/invoices/lottery/:lotteryDay
 * 查詢特定開獎日的發票
 */
router.get("/lottery/:lotteryDay", async (req, res) => {
  try {
    const { lotteryDay } = req.params;

    const invoices = await invoiceService.getInvoicesByLotteryDay(lotteryDay);

    res.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    logger.error("Failed to fetch lottery invoices", { error: error.message });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/lottery-results
 * Oracle 查詢開獎發票（內部 API）
 */
router.get("/lottery-results", async (req, res) => {
  try {
    const { lottery_date } = req.query;

    if (!lottery_date) {
      return res.status(400).json({ error: "Missing lottery_date parameter" });
    }

    // 這個 API 僅供 Oracle 使用，實際部署時應加入認證
    // 例如: API Key, IP 白名單等

    // 使用抽象化查詢
    const invoices = await db.findMany("invoices", {
      where: { lottery_day: lottery_date, drawn: false },
      select: ["token_type_id", "pool_id", "invoice_number"],
    });

    // 為相容性加入 prize_amount = 0
    const results = invoices.map((inv) => ({
      ...inv,
      prize_amount: 0,
    }));

    res.json({
      lottery_date,
      results,
    });
  } catch (error) {
    logger.error("Failed to fetch lottery results", { error: error.message });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
