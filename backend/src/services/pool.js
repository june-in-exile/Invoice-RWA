import { ethers } from "ethers";
import { pool as poolContract, adminWallet, adminAddress } from "../config/contracts.js";
import logger from "../utils/logger.js";

class PoolService {

  /**
   * Register a new pool (Admin only)
   */
  async registerPool(poolId, beneficiary, name, lotteryMonth, signature) {
    try {
      logger.info("Registering new pool", { poolId, beneficiary, name });

      // 1. Verify the signature from the admin
      const message = `Register pool ${poolId} with beneficiary ${beneficiary}`;
      const signerAddress = ethers.verifyMessage(message, signature);

      if (signerAddress.toLowerCase() !== adminAddress.toLowerCase()) {
        throw new Error("Invalid signature. Caller is not the admin.");
      }

      logger.info("Admin signature verified", { signerAddress });

      // 2. Normalize address to correct checksum format
      const checksumBeneficiary = ethers.getAddress(beneficiary);

      // 3. Connect to contract with admin's wallet and send transaction
      const poolWithAdmin = poolContract.connect(adminWallet);
      const tx = await poolWithAdmin.registerPool(poolId, checksumBeneficiary, name, lotteryMonth, {
        gasLimit: 250000,
      });

      logger.info("Register pool transaction sent", { txHash: tx.hash });
      const receipt = await tx.wait();
      logger.info("Transaction confirmed", { txHash: tx.hash, blockNumber: receipt.blockNumber });

      return {
        success: true,
        txHash: tx.hash,
        poolId,
      };
    } catch (error) {
      logger.error("Failed to register pool", {
        error: error.message,
        poolId,
      });
      throw error;
    }
  }

  /**
   * Update minDonationPercent for a pool
   * @param {string} poolId - The ID of the pool
   * @param {number} minDonationPercent - The new minimum donation percentage
   * @param {string} signature - The signature from the beneficiary
   * @returns {Promise<object>} - The result of the operation
   */
  async updateMinDonationPercent(poolId, minDonationPercent, signature) {
    try {
      logger.info("Updating minDonationPercent", { poolId, minDonationPercent });

      // 1. Get pool info from contract to find the beneficiary
      const poolInfo = await poolContract.pools(poolId);

      // Check if pool exists
      if (poolInfo.poolId === 0n) {
        throw new Error(`Pool with ID ${poolId} not found.`);
      }

      const beneficiary = poolInfo.beneficiary;

      // 2. Verify the signature
      const message = `Update minDonationPercent for pool ${poolId} to ${minDonationPercent}`;
      const signerAddress = ethers.verifyMessage(message, signature);

      if (signerAddress.toLowerCase() !== beneficiary.toLowerCase()) {
        throw new Error("Invalid signature. Caller is not the pool beneficiary.");
      }

      logger.info("Signature verified", { signerAddress, beneficiary });

      // 3. Connect to contract with admin's wallet and send transaction
      const poolWithAdmin = poolContract.connect(adminWallet);
      const tx = await poolWithAdmin.updateMinDonationPercent(poolId, minDonationPercent, {
        gasLimit: 150000,
      });

      logger.info("Update minDonationPercent transaction sent", { txHash: tx.hash });
      const receipt = await tx.wait();
      logger.info("Transaction confirmed", { txHash: tx.hash, blockNumber: receipt.blockNumber });

      return {
        success: true,
        txHash: tx.hash,
        poolId,
        minDonationPercent,
      };
    } catch (error) {
      logger.error("Failed to update minDonationPercent", {
        error: error.message,
        poolId,
      });
      throw error;
    }
  }
}

export default new PoolService();
