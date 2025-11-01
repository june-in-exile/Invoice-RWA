import { ethers } from "ethers";
import {
  poolV2 as poolContract,
  provider,
  invoiceTokenV2 as invoiceToken,
} from "../config/contracts.js";

import db from "../db/db.js";
import logger from "../utils/logger.js";
import relayerService from "./relayer.js";

class EventListenerService {
  constructor() {
    this.isListening = false;
  }

  /**
   * Start listening to Pool contract's LotteryResultNotified event
   */
  async startListening() {
    if (this.isListening) {
      logger.warn("Event listener is already running");
      return;
    }

    this.isListening = true;
    logger.info("Starting event listener for LotteryResultNotified");

    // Listen to LotteryResultNotified event
    poolContract.on(
      "LotteryResultNotified",
      async (
        tokenTypeId,
        poolId,
        totalAmount,
        donationAmount,
        rewardPerToken,
        event
      ) => {
        logger.info("LotteryResultNotified event received", {
          tokenTypeId: tokenTypeId.toString(),
          poolId: poolId.toString(),
          totalAmount: ethers.formatEther(totalAmount),
          donationAmount: ethers.formatEther(donationAmount),
          txHash: event.log.transactionHash,
        });

        try {
          await this.handleLotteryResultNotified(
            tokenTypeId.toString(),
            poolId.toString(),
            totalAmount,
            donationAmount
          );
        } catch (error) {
          logger.error("Failed to handle LotteryResultNotified", {
            error: error.message,
            tokenTypeId: tokenTypeId.toString(),
          });
        }
      }
    );

    logger.info("Event listener started successfully");
  }

  /**
   * Stop listening
   */
  stopListening() {
    poolContract.removeAllListeners("LotteryResultNotified");
    this.isListening = false;
    logger.info("Event listener stopped");
  }

  /**
   * Handle LotteryResultNotified event
   */
  async handleLotteryResultNotified(
    tokenTypeId,
    poolId,
    totalAmount,
    donationAmount
  ) {
    try {
      // 1. Query all users holding this tokenTypeId
      const holders = await this.getTokenHolders(tokenTypeId);

      if (holders.length === 0) {
        logger.warn("No holders found for tokenTypeId", { tokenTypeId });
        return;
      }

      logger.info("Token holders found", {
        tokenTypeId,
        holdersCount: holders.length,
      });

      // 2. Calculate total supply
      const totalSupply = holders.reduce(
        (sum, holder) => sum + BigInt(holder.balance),
        0n
      );

      // 3. Calculate reward per token
      const rewardAmount = totalAmount - donationAmount;
      const rewardPerToken = rewardAmount / totalSupply;

      logger.info("Reward calculation", {
        tokenTypeId,
        totalSupply: totalSupply.toString(),
        rewardAmount: ethers.formatEther(rewardAmount),
        rewardPerToken: ethers.formatEther(rewardPerToken),
      });

      // 4. Update rewardPerToken on-chain
      await this.updateRewardPerToken(tokenTypeId, rewardPerToken);

      // 5. Batch claim (Push mode)
      await this.batchClaimRewards(tokenTypeId, holders, rewardPerToken);

      // 6. Mark as distributed
      await this.markAsDistributed(tokenTypeId);

      logger.info("Lottery result handled successfully", { tokenTypeId });
    } catch (error) {
      logger.error("Failed to handle lottery result", {
        error: error.message,
        tokenTypeId,
      });
      throw error;
    }
  }

  /**
   * Get token holders (from chain or cache)
   */
  async getTokenHolders(tokenTypeId) {
    try {
      // Try to read from database cache first (using abstracted query)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const cachedHolders = await db.findMany("token_holders", {
        where: {
          token_type_id: tokenTypeId,
          last_updated: { operator: ">", value: oneHourAgo },
        },
        select: ["wallet_address", "balance"],
      });

      if (cachedHolders.length > 0) {
        logger.info("Using cached holders", { tokenTypeId });
        return cachedHolders;
      }

      // Otherwise query from chain (via event or indexer)
      // Simplified here to query all related users from database, then check on-chain balance
      const invoices = await db.findMany("invoices", {
        where: { token_type_id: tokenTypeId },
        select: ["wallet_address"],
      });

      // Get unique wallet addresses
      const uniqueWallets = [
        ...new Set(invoices.map((inv) => inv.wallet_address)),
      ];

      const holders = [];

      for (const walletAddress of uniqueWallets) {
        const balance = await invoiceToken.balanceOf(
          walletAddress,
          tokenTypeId
        );

        if (balance > 0n) {
          holders.push({
            wallet_address: walletAddress,
            balance: balance.toString(),
          });

          // Update cache (using abstracted insert/update)
          const existing = await db.findOne("token_holders", {
            token_type_id: tokenTypeId,
            wallet_address: walletAddress,
          });

          if (existing) {
            await db.update(
              "token_holders",
              {
                balance: balance.toString(),
                last_updated: new Date().toISOString(),
              },
              {
                token_type_id: tokenTypeId,
                wallet_address: walletAddress,
              }
            );
          } else {
            await db.insert("token_holders", {
              token_type_id: tokenTypeId,
              wallet_address: walletAddress,
              balance: balance.toString(),
              last_updated: new Date().toISOString(),
            });
          }
        }
      }

      logger.info("Fetched holders from chain", {
        tokenTypeId,
        count: holders.length,
      });

      return holders;
    } catch (error) {
      logger.error("Failed to get token holders", {
        error: error.message,
        tokenTypeId,
      });
      throw error;
    }
  }

  /**
   * Update rewardPerToken on-chain
   */
  async updateRewardPerToken(tokenTypeId, rewardPerToken) {
    try {
      const poolWithRelayer = poolContract.connect(
        relayerService.relayerWallet
      );

      const tx = await poolWithRelayer.updateRewardPerToken(
        tokenTypeId,
        rewardPerToken,
        {
          gasLimit: 100000,
        }
      );

      await tx.wait();

      logger.info("RewardPerToken updated on-chain", {
        tokenTypeId,
        rewardPerToken: ethers.formatEther(rewardPerToken),
        txHash: tx.hash,
      });
    } catch (error) {
      logger.error("Failed to update rewardPerToken", {
        error: error.message,
        tokenTypeId,
      });
      throw error;
    }
  }

  /**
   * Batch claim rewards (Push mode)
   */
  async batchClaimRewards(tokenTypeId, holders, rewardPerToken) {
    try {
      const BATCH_SIZE = 50;
      const poolWithRelayer = poolContract.connect(
        relayerService.relayerWallet
      );

      for (let i = 0; i < holders.length; i += BATCH_SIZE) {
        const batch = holders.slice(i, i + BATCH_SIZE);

        const users = batch.map((h) => h.wallet_address);
        const tokenTypeIds = batch.map(() => tokenTypeId);

        logger.info("Claiming rewards for batch", {
          batchNumber: Math.floor(i / BATCH_SIZE) + 1,
          batchSize: batch.length,
        });

        const tx = await poolWithRelayer.batchClaimReward(users, tokenTypeIds, {
          gasLimit: 500000 * batch.length,
        });

        const receipt = await tx.wait();

        logger.info("Batch claim successful", {
          txHash: tx.hash,
          gasUsed: receipt.gasUsed.toString(),
        });

        // Update database (using abstracted update)
        for (const holder of batch) {
          await db.update(
            "invoices",
            {
              claimed: true,
              claimed_at: new Date().toISOString(),
            },
            {
              token_type_id: tokenTypeId,
              wallet_address: holder.wallet_address,
            }
          );
        }

        // Avoid RPC rate limit
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      logger.info("All rewards claimed successfully", { tokenTypeId });
    } catch (error) {
      logger.error("Failed to batch claim rewards", {
        error: error.message,
        tokenTypeId,
      });
      throw error;
    }
  }

  /**
   * Mark as distributed
   */
  async markAsDistributed(tokenTypeId) {
    try {
      const poolWithRelayer = poolContract.connect(
        relayerService.relayerWallet
      );

      const tx = await poolWithRelayer.markAsDistributed(tokenTypeId, {
        gasLimit: 100000,
      });

      await tx.wait();

      logger.info("Marked as distributed", { tokenTypeId, txHash: tx.hash });
    } catch (error) {
      logger.error("Failed to mark as distributed", {
        error: error.message,
        tokenTypeId,
      });
      throw error;
    }
  }
}

export default new EventListenerService();
