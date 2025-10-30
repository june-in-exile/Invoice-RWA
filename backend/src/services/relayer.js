import { ethers } from "ethers";
import { invoiceToken, relayerWallet, provider } from "../config/contracts.js";
import db from "../db/db.js";
import logger from "../utils/logger.js";

class RelayerService {
  constructor() {
    this.minBalance = ethers.parseEther(
      process.env.MIN_RELAYER_BALANCE || "0.1"
    );
  }

  /**
   * Mint NFT 給用戶
   */
  async mintInvoiceNFT(userAddress, donationPercent, poolId, lotteryDay) {
    try {
      logger.info("Minting NFT", {
        userAddress,
        donationPercent,
        poolId,
        lotteryDay,
      });

      // 檢查 Relayer 餘額
      await this.checkBalance();

      // 執行 mint
      const tx = await invoiceToken.mint(
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

      // 記錄交易
      await this.logTransaction(
        tx.hash,
        "mint",
        relayerWallet.address,
        userAddress,
        "pending"
      );

      // 等待確認
      const receipt = await tx.wait();

      logger.info("Mint transaction confirmed", {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
      });

      // 更新交易狀態
      await this.updateTransactionStatus(
        tx.hash,
        "success",
        receipt.gasUsed,
        receipt.gasPrice
      );

      // 從 event 中提取 tokenTypeId
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
   * 從交易 receipt 提取 tokenTypeId
   */
  extractTokenTypeId(receipt) {
    const event = receipt.logs.find((log) => {
      try {
        const parsed = invoiceToken.interface.parseLog(log);
        return parsed.name === "TokensMinted";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = invoiceToken.interface.parseLog(event);
      return parsed.args.tokenTypeId.toString();
    }

    throw new Error("TokenTypeId not found in receipt");
  }

  /**
   * 檢查 Relayer 餘額
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
   * 記錄交易到資料庫
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
   * 更新交易狀態
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
   * 發送告警
   */
  async sendAlert(type, message) {
    // 實作告警邏輯（Slack, Email, etc.）
    logger.warn("Alert sent", { type, message });

    // 記錄到資料庫
    await db.insert("system_logs", {
      level: "alert",
      message,
      context: JSON.stringify({ type }),
    });
  }
}

export default new RelayerService();
