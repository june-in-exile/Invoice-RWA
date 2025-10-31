import { poolV2 as poolContract, oracleWallet } from "../config/contracts.js";
import db from "../db/db.js";
import logger from "../utils/logger.js";
import axios from "axios";

class OracleService {
  constructor() {
  }

  /**
   * Fetch lottery results from government API
   */
  async fetchLotteryResults(lotteryDate) {
    try {
      // Actual API call logic (according to Ministry of Finance API specification)
      const response = await axios.get(`${this.govApiUrl}/lottery`, {
        params: {
          date: lotteryDate,
          apiKey: this.govApiKey,
        },
      });

      // Assumed response format:
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
   * Query winning invoices in ROFL database
   */
  async queryWinningInvoices(lotteryDate, winningNumbers) {
    const numbersList = winningNumbers.map((w) => w.number);

    // Use abstracted query
    const allInvoices = await db.findMany("invoices", {
      where: {
        lottery_day: lotteryDate,
        drawn: false,
      },
    });

    // Filter out winning invoices
    const winningInvoices = allInvoices.filter((invoice) =>
      numbersList.includes(invoice.invoice_number)
    );

    // Merge prize amount
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
   * Match invoice number against Taiwan lottery prizes
   * @param {string} invoiceNumber - 8-digit invoice number
   * @param {string} specialPrize - Special prize number (10M TWD)
   * @param {string} grandPrize - Grand prize number (2M TWD)
   * @param {string} firstPrize - First prize number (200K TWD)
   * @returns {Object} { prize: amount in TWD, prizeName: prize tier name }
   */
  matchLotteryPrize(invoiceNumber, specialPrize, grandPrize, firstPrize) {
    // Remove any non-digit characters
    const invoice = invoiceNumber.replace(/\D/g, "");

    // Special Prize - 10,000,000 TWD (full 8 digits match)
    if (invoice === specialPrize) {
      return { prize: 10000000, prizeName: "Special Prize" };
    }

    // Grand Prize - 2,000,000 TWD (full 8 digits match)
    if (invoice === grandPrize) {
      return { prize: 2000000, prizeName: "Grand Prize" };
    }

    // First Prize - 200,000 TWD (full 8 digits match)
    if (invoice === firstPrize) {
      return { prize: 200000, prizeName: "First Prize" };
    }

    // Additional prizes based on last N digits of first prize
    const invoiceLast7 = invoice.slice(-7);
    const invoiceLast6 = invoice.slice(-6);
    const invoiceLast5 = invoice.slice(-5);
    const invoiceLast4 = invoice.slice(-4);
    const invoiceLast3 = invoice.slice(-3);

    const firstPrizeLast7 = firstPrize.slice(-7);
    const firstPrizeLast6 = firstPrize.slice(-6);
    const firstPrizeLast5 = firstPrize.slice(-5);
    const firstPrizeLast4 = firstPrize.slice(-4);
    const firstPrizeLast3 = firstPrize.slice(-3);

    // Second Prize - 40,000 TWD (last 7 digits match)
    if (invoiceLast7 === firstPrizeLast7) {
      return { prize: 40000, prizeName: "Second Prize" };
    }

    // Third Prize - 10,000 TWD (last 6 digits match)
    if (invoiceLast6 === firstPrizeLast6) {
      return { prize: 10000, prizeName: "Third Prize" };
    }

    // Fourth Prize - 4,000 TWD (last 5 digits match)
    if (invoiceLast5 === firstPrizeLast5) {
      return { prize: 4000, prizeName: "Fourth Prize" };
    }

    // Fifth Prize - 1,000 TWD (last 4 digits match)
    if (invoiceLast4 === firstPrizeLast4) {
      return { prize: 1000, prizeName: "Fifth Prize" };
    }

    // Sixth Prize - 200 TWD (last 3 digits match)
    if (invoiceLast3 === firstPrizeLast3) {
      return { prize: 200, prizeName: "Sixth Prize" };
    }

    return { prize: 0, prizeName: "No Prize" };
  }

  /**
   * Process lottery results manually with winning numbers
   * @param {string} lotteryDate - Date in YYYY-MM-DD format
   * @param {string} specialPrize - 8-digit special prize number
   * @param {string} grandPrize - 8-digit grand prize number
   * @param {string} firstPrize - 8-digit first prize number
   */
  async processLotteryResultsManual(lotteryDate, specialPrize, grandPrize, firstPrize) {
    try {
      logger.info("Processing lottery results manually", {
        lotteryDate,
        specialPrize,
        grandPrize,
        firstPrize
      });

      // Validate 8-digit numbers
      if (!/^\d{8}$/.test(specialPrize) || !/^\d{8}$/.test(grandPrize) || !/^\d{8}$/.test(firstPrize)) {
        throw new Error("All prize numbers must be 8 digits");
      }

      // Query all invoices for this lottery date
      const allInvoices = await db.findMany("invoices", {
        where: {
          lottery_day: lotteryDate,
          drawn: false,
        },
      });

      if (allInvoices.length === 0) {
        logger.info("No invoices found for lottery date", { lotteryDate });
        return { success: true, processed: 0, results: [] };
      }

      logger.info("Found invoices to check", { count: allInvoices.length });

      // Match each invoice against prizes
      const winningInvoices = [];
      for (const invoice of allInvoices) {
        const { prize, prizeName } = this.matchLotteryPrize(
          invoice.invoice_number,
          specialPrize,
          grandPrize,
          firstPrize
        );

        if (prize > 0) {
          winningInvoices.push({
            ...invoice,
            prizeAmount: prize,
            prizeName,
          });
        }
      }

      if (winningInvoices.length === 0) {
        logger.info("No winning invoices found", { lotteryDate });
        return { success: true, processed: 0, results: [] };
      }

      logger.info("Winning invoices found", { count: winningInvoices.length });

      // Notify on-chain contract and update database
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
            prizeName: invoice.prizeName,
            prizeAmount: invoice.prizeAmount,
            txHash: result.txHash,
          });

          // Update database
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
      logger.error("Failed to process lottery results manually", {
        error: error.message,
        lotteryDate,
      });
      throw error;
    }
  }

  /**
   * Process lottery results and submit to chain
   */
  async processLotteryResults(lotteryDate) {
    try {
      logger.info("Processing lottery results", { lotteryDate });

      // 1. Fetch lottery results from government API
      const winningNumbers = await this.fetchLotteryResults(lotteryDate);

      if (!winningNumbers || winningNumbers.length === 0) {
        logger.info("No winning numbers found", { lotteryDate });
        return { success: true, processed: 0 };
      }

      logger.info("Winning numbers fetched", { count: winningNumbers.length });

      // 2. Query winning invoices in database
      const winningInvoices = await this.queryWinningInvoices(
        lotteryDate,
        winningNumbers
      );

      if (winningInvoices.length === 0) {
        logger.info("No matching invoices in database", { lotteryDate });
        return { success: true, processed: 0 };
      }

      logger.info("Winning invoices found", { count: winningInvoices.length });

      // 3. Notify on-chain contract one by one
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

          // Update database (using abstracted update method)
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
   * Notify on-chain contract of lottery result
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
