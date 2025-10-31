import { ethers } from "ethers";
import { poolV2 as poolContract, adminWallet } from "../config/contracts.js";
import logger from "../utils/logger.js";

class RewardsService {

  /**
   * Claim rewards for a specific token type
   */
  async claimReward(walletAddress, tokenTypeId, signature) {
    try {
      logger.info("Claiming reward", { walletAddress, tokenTypeId });

      // 1. Verify the signature from the wallet owner
      const message = `Claim reward for token type ${tokenTypeId}`;
      const signerAddress = ethers.verifyMessage(message, signature);

      if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error("Invalid signature. Caller is not the wallet owner.");
      }

      logger.info("Signature verified", { signerAddress });

      // 2. Connect to contract with admin's wallet and send transaction
      const contractWithAdmin = poolContract.connect(adminWallet);
      const tx = await contractWithAdmin.claimReward(walletAddress, tokenTypeId);

      logger.info("Claim reward transaction sent", { txHash: tx.hash });
      const receipt = await tx.wait();
      logger.info("Transaction confirmed", { txHash: tx.hash, blockNumber: receipt.blockNumber });

      return {
        success: true,
        txHash: tx.hash,
      };
    } catch (error) {
      logger.error("Failed to claim reward", {
        error: error.message,
        walletAddress,
        tokenTypeId,
      });
      throw error;
    }
  }

  /**
   * Get claimable reward for a specific token type
   */
  async getClaimableReward(walletAddress, tokenTypeId) {
    try {
      logger.info("Getting claimable reward", { walletAddress, tokenTypeId });
      const amount = await poolContract.getClaimableReward(walletAddress, tokenTypeId);

      return {
        walletAddress,
        tokenTypeId,
        amount: amount.toString(),
      };
    } catch (error) {
      logger.error("Failed to get claimable reward", {
        error: error.message,
        walletAddress,
        tokenTypeId,
      });
      throw error;
    }
  }
}

export default new RewardsService();
