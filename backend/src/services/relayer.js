import { ethers } from "ethers";
import axios from "axios";
import { invoiceTokenV2, provider } from "../config/contracts.js";
import db from "../db/db.js";
import logger from "../utils/logger.js";

const ROFL_APPD_URL = "http://localhost/rofl/v1/tx/sign-submit";
const ROFL_APPD_SOCKET = "/run/rofl-appd.sock";

class RelayerService {
  /**
   * Submit transaction to rofl-appd
   */
  async submitRoflTx(to, data) {
    const payload = {
      tx: {
        kind: "eth",
        data: {
          gas_limit: 200000,
          to,
          value: 0,
          data,
        },
      },
    };

    try {
      const response = await axios.post(ROFL_APPD_URL, payload, {
        socketPath: ROFL_APPD_SOCKET,
      });
      return response.data;
    } catch (error) {
      logger.error("Failed to submit transaction to rofl-appd", {
        error: error.response ? error.response.data : error.message,
      });
      throw new Error("Failed to submit transaction to rofl-appd");
    }
  }

  /**
   * Mint NFT for user
   */
  async mintInvoiceNFT(userAddress, donationPercent, poolId, lotteryDay) {
    try {
      logger.info("Minting NFT via rofl-appd", {
        userAddress,
        donationPercent,
        poolId,
        lotteryDay,
      });

      // ABI-encode the function call
      const data = invoiceTokenV2.interface.encodeFunctionData("mint", [
        userAddress,
        donationPercent,
        poolId,
        Math.floor(new Date(lotteryDay).getTime() / 1000),
        1,
      ]);

      // Submit the transaction to rofl-appd
      const roflResponse = await this.submitRoflTx(
        invoiceTokenV2.address,
        data
      );

      const txHash = roflResponse.tx_hash;
      logger.info("Mint transaction sent via rofl-appd", { txHash });

      // Log transaction
      await this.logTransaction(
        txHash,
        "mint",
        "rofl-appd", // The transaction is sent from rofl-appd
        userAddress,
        "pending"
      );

      // Wait for confirmation
      const receipt = await provider.waitForTransaction(txHash);

      logger.info("Mint transaction confirmed", {
        txHash,
        blockNumber: receipt.blockNumber,
      });

      // Update transaction status
      await this.updateTransactionStatus(
        txHash,
        "success",
        receipt.gasUsed,
        receipt.gasPrice
      );

      // Extract tokenTypeId from event
      const tokenTypeId = this.extractTokenTypeId(receipt);

      return {
        success: true,
        txHash,
        tokenTypeId,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      logger.error("Mint failed", { error: error.message, userAddress });

      if (error.receipt) {
        await this.updateTransactionStatus(
          error.receipt.hash,
          "failed",
          null,
          null,
          error.message
        );
      }

      throw error;
    }
  }

  /**
   * Extract tokenTypeId from transaction receipt
   */
  extractTokenTypeId(receipt) {
    const event = receipt.logs.find((log) => {
      try {
        const parsed = invoiceTokenV2.interface.parseLog(log);
        return parsed.name === "TokensMinted";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = invoiceTokenV2.interface.parseLog(event);
      return parsed.args.tokenTypeId.toString();
    }

    throw new Error("TokenTypeId not found in receipt");
  }

  /**
   * Log transaction to database
   */
  async logTransaction(
    txHash,
    txType,
    fromAddress,
    toAddress,
    status,
    metadata = {}
  ) {
    await db.insert("relayer_transactions", {
      tx_hash: txHash,
      tx_type: txType,
      from_address: fromAddress,
      to_address: toAddress,
      status,
      metadata: JSON.stringify(metadata),
    });
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    txHash,
    status,
    gasUsed,
    gasPrice,
    errorMessage = null
  ) {
    await db.update(
      "relayer_transactions",
      {
        status,
        gas_used: gasUsed?.toString(),
        gas_price: gasPrice?.toString(),
        error_message: errorMessage,
        confirmed_at: new Date().toISOString(),
      },
      { tx_hash: txHash }
    );
  }

  /**
   * Send alert
   */
  async sendAlert(type, message) {
    // Implement alert logic (Slack, Email, etc.)
    logger.warn("Alert sent", { type, message });

    // Log to database
    await db.insert("system_logs", {
      level: "alert",
      message,
      context: JSON.stringify({ type }),
    });
  }
}

export default new RelayerService();
