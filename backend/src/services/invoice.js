import db from "../db/db.js";
import relayerService from "./relayer.js";
import logger from "../utils/logger.js";

class InvoiceService {
  /**
   * 註冊新發票並 mint NFT
   */
  async registerInvoice(invoiceData) {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const { invoiceNumber, carrierNumber, amount, purchaseDate, lotteryDay } =
        invoiceData;

      // 1. 查詢用戶 config
      const userResult = await client.query(
        "SELECT wallet_address, pool_id, donation_percent FROM users WHERE carrier_number = $1",
        [carrierNumber]
      );

      if (userResult.rows.length === 0) {
        throw new Error(`Carrier ${carrierNumber} not registered`);
      }

      const user = userResult.rows[0];

      // 2. 儲存發票資訊（token_type_id 先為 null）
      await client.query(
        `INSERT INTO invoices 
         (invoice_number, carrier_number, wallet_address, pool_id, donation_percent, 
          amount, purchase_date, lottery_day) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          invoiceNumber,
          carrierNumber,
          user.wallet_address,
          user.pool_id,
          user.donation_percent,
          amount,
          purchaseDate,
          lotteryDay,
        ]
      );

      logger.info("Invoice saved to database", { invoiceNumber });

      // 3. Mint NFT
      const mintResult = await relayerService.mintInvoiceNFT(
        user.wallet_address,
        user.donation_percent,
        user.pool_id,
        lotteryDay
      );

      // 4. 更新 token_type_id
      await client.query(
        "UPDATE invoices SET token_type_id = $1 WHERE invoice_number = $2",
        [mintResult.tokenTypeId, invoiceNumber]
      );

      // 5. 記錄 pool_invoices 關聯
      await client.query(
        `INSERT INTO pool_invoices (pool_id, token_type_id, invoice_number, lottery_day) 
         VALUES ($1, $2, $3, $4)`,
        [user.pool_id, mintResult.tokenTypeId, invoiceNumber, lotteryDay]
      );

      await client.query("COMMIT");

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
      await client.query("ROLLBACK");
      logger.error("Failed to register invoice", {
        error: error.message,
        invoiceData,
      });
      throw error;
    } finally {
      client.release();
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
    const result = await db.query(
      `SELECT * FROM invoices 
       WHERE wallet_address = $1 
       ORDER BY created_at DESC`,
      [walletAddress]
    );

    return result.rows;
  }

  /**
   * 查詢特定開獎日的發票
   */
  async getInvoicesByLotteryDay(lotteryDay) {
    const result = await db.query(
      `SELECT * FROM invoices 
       WHERE lottery_day = $1 AND drawn = false
       ORDER BY pool_id, token_type_id`,
      [lotteryDay]
    );

    return result.rows;
  }
}

export default new InvoiceService();
