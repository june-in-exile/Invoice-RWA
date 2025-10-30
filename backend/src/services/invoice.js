import db from "../db/db.js";
import relayerService from "./relayer.js";
import logger from "../utils/logger.js";

class InvoiceService {
  /**
   * 註冊新發票並 mint NFT
   */
  async registerInvoice(invoiceData) {
    const transaction = await db.beginTransaction();

    try {
      const { invoiceNumber, carrierNumber, amount, purchaseDate, lotteryDay } =
        invoiceData;

      // 1. 查詢用戶 config
      const user = await db.findOne("users", { carrier_number: carrierNumber });

      if (!user) {
        throw new Error(`Carrier ${carrierNumber} not registered`);
      }

      // 2. 儲存發票資訊（token_type_id 先為 null）
      await transaction.insert("invoices", {
        invoice_number: invoiceNumber,
        carrier_number: carrierNumber,
        wallet_address: user.wallet_address,
        pool_id: user.pool_id,
        donation_percent: user.donation_percent,
        amount,
        purchase_date: purchaseDate,
        lottery_day: lotteryDay,
        token_type_id: null,
      });

      logger.info("Invoice saved to database", { invoiceNumber });

      // 3. Mint NFT
      const mintResult = await relayerService.mintInvoiceNFT(
        user.wallet_address,
        user.donation_percent,
        user.pool_id,
        lotteryDay
      );

      // 4. 更新 token_type_id
      await transaction.update(
        "invoices",
        { token_type_id: mintResult.tokenTypeId },
        { invoice_number: invoiceNumber }
      );

      // 5. 記錄 pool_invoices 關聯
      await transaction.insert("pool_invoices", {
        pool_id: user.pool_id,
        token_type_id: mintResult.tokenTypeId,
        invoice_number: invoiceNumber,
        lottery_day: lotteryDay,
      });

      await transaction.commit();

      logger.info("Invoice registered successfully", {
        invoiceNumber,
        tokenTypeId: mintResult.tokenTypeId,
        txHash: mintResult.txHash,
      });

      return {
        success: true,
        invoiceNumber,
        tokenTypeId: mintResult.tokenTypeId,
        txHash: mintResult.txHash,
        walletAddress: user.wallet_address,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error("Failed to register invoice", {
        error: error.message,
        invoiceData,
      });
      throw error;
    } finally {
      await transaction.release();
    }
  }

  /**
   * 批量註冊發票
   */
  async batchRegisterInvoices(invoices) {
    const results = [];

    for (const invoice of invoices) {
      try {
        const result = await this.registerInvoice(invoice);
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({
          success: false,
          invoiceNumber: invoice.invoiceNumber,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * 查詢用戶的發票
   */
  async getUserInvoices(walletAddress) {
    // 使用抽象化的 findMany 方法
    return await db.findMany("invoices", {
      where: { wallet_address: walletAddress },
      orderBy: { created_at: "DESC" },
    });
  }

  /**
   * 查詢特定開獎日的發票
   */
  async getInvoicesByLotteryDay(lotteryDay) {
    // 使用抽象化的 findMany 方法
    return await db.findMany("invoices", {
      where: { lottery_day: lotteryDay, drawn: false },
      orderBy: [
        { column: "pool_id", direction: "ASC" },
        { column: "token_type_id", direction: "ASC" },
      ],
    });
  }
}

export default new InvoiceService();
