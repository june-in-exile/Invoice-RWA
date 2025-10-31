import { ethers } from "ethers";
import { invoiceTokenV2, relayerWallet, provider } from "../config/contracts.js";
import db from "../db/db.js";
import logger from "../utils/logger.js";

class RelayerService {
  constructor() {
    this.minBalance = ethers.parseEther(
      process.env.MIN_RELAYER_BALANCE || "0.1"
    );
  }

  /**
   * Mint NFT for user
   */
  async mintInvoiceNFT(userAddress, donationPercent, poolId, lotteryDay) {
    try {
      logger.info("Minting NFT", {
        userAddress,
        donationPercent,
        poolId,
        lotteryDay,
      });

      // Check Relayer balance
      await this.checkBalance();

      // Execute mint
      const tx = await invoiceTokenV2.mint(
        userAddress,
        donationPercent,
        poolId,
        Math.floor(new Date(lotteryDay).getTime() / 1000),
        1,
        {
          gasLimit: 200000,
        }
      );

      logger.info("Mint transaction sent", { txHash: tx.hash });

      // Log transaction
      await this.logTransaction(
        tx.hash,
        "mint",
        relayerWallet.address,
        userAddress,
        "pending"
      );

      // Wait for confirmation
      const receipt = await tx.wait();

      logger.info("Mint transaction confirmed", {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
      });

      // Update transaction status
      await this.updateTransactionStatus(
        tx.hash,
        "success",
        receipt.gasUsed,
        receipt.gasPrice
      );

      // Extract tokenTypeId from event
      const tokenTypeId = this.extractTokenTypeId(receipt);

      return {
        success: true,
        txHash: tx.hash,
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
   * Check Relayer balance
   */
  async checkBalance() {
    const balance = await provider.getBalance(relayerWallet.address);

    logger.info("Relayer balance", {
      balance: ethers.formatEther(balance),
      address: relayerWallet.address,
    });

    if (balance < this.minBalance) {
      const message = `Relayer balance is low: ${ethers.formatEther(
        balance
      )} ETH`;
      logger.error(message);
      await this.sendAlert("LOW_BALANCE", message);
      throw new Error(message);
    }

    return balance;
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
