import { pool as poolContract, oracleWallet } from "../config/contracts.js";
import db from "../db/db.js";
import logger from "../utils/logger.js";
import axios from "axios";

class OracleService {
  constructor() {
    this.govApiUrl = process.env.GOV_INVOICE_API_URL;
    this.govApiKey = process.env.GOV_API_KEY;
  }

  /**
   * 從政府 API 取得開獎結果
   */
  async fetchLotteryResults(lotteryDate) {
    try {
      // 實際 API 呼叫邏輯（依照財政部 API 規格）
      const response = await axios.get(`${this.govApiUrl}/lottery`, {
        params: {
          date: lotteryDate,
          apiKey: this.govApiKey,
        },
      });

      // 假設回應格式：
      // {
      //   "lotteryDate": "2025-03-25",
      //   "winningNumbers": [
      //     { "number": "AB-12345678", "prize": 200 },
      //     { "number": "CD-11111111", "prize": 1000 }
      //   ]
      // }

      return response.data.winningNumbers;
    } catch (error) {
      logger.error("Failed to fetch lottery results", {
        error: error.message,
        lotteryDate,
      });
      throw error;
    }
  }

  /**
   * 查詢 ROFL 資料庫中的中獎發票
   */
  async queryWinningInvoices(lotteryDate, winningNumbers) {
    const numbersList = winningNumbers.map((w) => w.number);

    // 使用抽象化查詢
    const allInvoices = await db.findMany("invoices", {
      where: {
        lottery_day: lotteryDate,
        drawn: false,
      },
    });

    // 過濾出中獎的發票
    const winningInvoices = allInvoices.filter((invoice) =>
      numbersList.includes(invoice.invoice_number)
    );

    // 合併中獎金額
    const invoicesWithPrize = winningInvoices.map((invoice) => {
      const winning = winningNumbers.find(
        (w) => w.number === invoice.invoice_number
      );
      return {
        ...invoice,
        prizeAmount: winning?.prize || 0,
      };
    });

    return invoicesWithPrize;
  }

  /**
   * 處理開獎結果並上鏈
   */
  async processLotteryResults(lotteryDate) {
    try {
      logger.info("Processing lottery results", { lotteryDate });

      // 1. 從政府 API 取得開獎結果
      const winningNumbers = await this.fetchLotteryResults(lotteryDate);

      if (!winningNumbers || winningNumbers.length === 0) {
        logger.info("No winning numbers found", { lotteryDate });
        return { success: true, processed: 0 };
      }

      logger.info("Winning numbers fetched", { count: winningNumbers.length });

      // 2. 查詢資料庫中的中獎發票
      const winningInvoices = await this.queryWinningInvoices(
        lotteryDate,
        winningNumbers
      );

      if (winningInvoices.length === 0) {
        logger.info("No matching invoices in database", { lotteryDate });
        return { success: true, processed: 0 };
      }

      logger.info("Winning invoices found", { count: winningInvoices.length });

      // 3. 逐一通知鏈上合約
      const results = [];

      for (const invoice of winningInvoices) {
        try {
          const result = await this.notifyLotteryResult(
            invoice.token_type_id,
            invoice.prizeAmount
          );

          results.push({
            success: true,
            invoiceNumber: invoice.invoice_number,
            tokenTypeId: invoice.token_type_id,
            txHash: result.txHash,
          });

          // 更新資料庫（使用抽象化的 update 方法）
          await db.update(
            "invoices",
            {
              drawn: true,
              prize_amount: invoice.prizeAmount,
            },
            { invoice_number: invoice.invoice_number }
          );
        } catch (error) {
          logger.error("Failed to notify lottery result", {
            error: error.message,
            invoice: invoice.invoice_number,
          });

          results.push({
            success: false,
            invoiceNumber: invoice.invoice_number,
            error: error.message,
          });
        }
      }

      logger.info("Lottery results processed", {
        total: winningInvoices.length,
        success: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      });

      return {
        success: true,
        processed: results.length,
        results,
      };
    } catch (error) {
      logger.error("Failed to process lottery results", {
        error: error.message,
        lotteryDate,
      });
      throw error;
    }
  }

  /**
   * 通知鏈上合約中獎結果
   */
  async notifyLotteryResult(tokenTypeId, prizeAmount) {
    try {
      logger.info("Notifying lottery result on-chain", {
        tokenTypeId,
        prizeAmount,
      });

      const tx = await poolContract.notifyLotteryResult(
        tokenTypeId,
        ethers.parseEther(prizeAmount.toString()),
        {
          gasLimit: 300000,
        }
      );

      logger.info("Notify transaction sent", { txHash: tx.hash });

      const receipt = await tx.wait();

      logger.info("Notify transaction confirmed", {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
      });

      return {
        success: true,
        txHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      logger.error("Failed to notify on-chain", {
        error: error.message,
        tokenTypeId,
      });
      throw error;
    }
  }
}

export default new OracleService();
