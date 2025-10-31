import { ethers } from "ethers";
import { poolV2 as poolContract, adminWallet, adminAddress } from "../config/contracts.js";
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

  /**
   * Withdraw donations from a pool
   * @param {string} poolId - The ID of the pool
   * @param {string} signature - The signature from the beneficiary
   * @returns {Promise<object>} - The result of the operation
   */
  async withdrawDonation(poolId, signature) {
    try {
      logger.info("Withdrawing donations", { poolId });

      const poolInfo = await poolContract.pools(poolId);
      if (poolInfo.poolId === 0n) {
        throw new Error(`Pool with ID ${poolId} not found.`);
      }

      const beneficiary = poolInfo.beneficiary;
      const message = `Withdraw donation from pool ${poolId}`;
      const signerAddress = ethers.verifyMessage(message, signature);

      if (signerAddress.toLowerCase() !== beneficiary.toLowerCase()) {
        throw new Error("Invalid signature. Caller is not the pool beneficiary.");
      }

      logger.info("Signature verified", { signerAddress, beneficiary });

      const poolWithAdmin = poolContract.connect(adminWallet);
      const tx = await poolWithAdmin.withdrawDonation(poolId);

      logger.info("Withdraw donation transaction sent", { txHash: tx.hash });
      const receipt = await tx.wait();
      logger.info("Transaction confirmed", { txHash: tx.hash, blockNumber: receipt.blockNumber });

      return {
        success: true,
        txHash: tx.hash,
        poolId,
      };
    } catch (error) {
      logger.error("Failed to withdraw donation", {
        error: error.message,
        poolId,
      });
      throw error;
    }
  }

  /**
   * Update beneficiary for a pool
   * @param {string} poolId - The ID of the pool
   * @param {string} newBeneficiary - The new beneficiary address
   * @param {string} signature - The signature from the current beneficiary
   * @returns {Promise<object>} - The result of the operation
   */
  async updateBeneficiary(poolId, newBeneficiary, signature) {
    try {
      logger.info("Updating beneficiary", { poolId, newBeneficiary });

      const poolInfo = await poolContract.pools(poolId);
      if (poolInfo.poolId === 0n) {
        throw new Error(`Pool with ID ${poolId} not found.`);
      }

      const currentBeneficiary = poolInfo.beneficiary;
      const message = `Update beneficiary for pool ${poolId} to ${newBeneficiary}`;
      const signerAddress = ethers.verifyMessage(message, signature);

      if (signerAddress.toLowerCase() !== currentBeneficiary.toLowerCase()) {
        throw new Error("Invalid signature. Caller is not the current pool beneficiary.");
      }

      logger.info("Signature verified", { signerAddress, currentBeneficiary });

      const checksumBeneficiary = ethers.getAddress(newBeneficiary);

      const poolWithAdmin = poolContract.connect(adminWallet);
      const tx = await poolWithAdmin.updateBeneficiary(poolId, checksumBeneficiary);

      logger.info("Update beneficiary transaction sent", { txHash: tx.hash });
      const receipt = await tx.wait();
      logger.info("Transaction confirmed", { txHash: tx.hash, blockNumber: receipt.blockNumber });

      return {
        success: true,
        txHash: tx.hash,
        poolId,
        newBeneficiary,
      };
    } catch (error) {
      logger.error("Failed to update beneficiary", {
        error: error.message,
        poolId,
      });
      throw error;
    }
  }

  /**
   * Deactivate a pool
   * @param {string} poolId - The ID of the pool
   * @param {string} signature - The signature from the admin
   * @returns {Promise<object>} - The result of the operation
   */
  async deactivatePool(poolId, signature) {
    try {
      logger.info("Deactivating pool", { poolId });

      const message = `Deactivate pool ${poolId}`;
      const signerAddress = ethers.verifyMessage(message, signature);

      if (signerAddress.toLowerCase() !== adminAddress.toLowerCase()) {
        throw new Error("Invalid signature. Caller is not the admin.");
      }

      logger.info("Admin signature verified", { signerAddress });

      const poolWithAdmin = poolContract.connect(adminWallet);
      const tx = await poolWithAdmin.deactivatePool(poolId);

      logger.info("Deactivate pool transaction sent", { txHash: tx.hash });
      const receipt = await tx.wait();
      logger.info("Transaction confirmed", { txHash: tx.hash, blockNumber: receipt.blockNumber });

      return {
        success: true,
        txHash: tx.hash,
        poolId,
      };
    } catch (error) {
      logger.error("Failed to deactivate pool", {
        error: error.message,
        poolId,
      });
      throw error;
    }
  }

  /**
   * Get all pool IDs
   * @returns {Promise<object>} - The result of the operation
   */
  async getAllPoolIds() {
    try {
      logger.info("Getting all pool IDs");

      const poolIds = await poolContract.getAllPoolIds();

      return {
        success: true,
        poolIds: poolIds.map(id => id.toString()),
      };
    } catch (error) {
      logger.error("Failed to get all pool IDs", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get pool data
   * @param {string} poolId - The ID of the pool
   * @returns {Promise<object>} - The result of the operation
   */
  async getPool(poolId) {
    try {
      const poolInfo = await poolContract.pools(poolId);
      if (poolInfo[0] === 0n) {
        throw new Error(`Pool with ID ${poolId} not found.`);
      }

      return {
        success: true,
        poolId: poolInfo[0].toString(),
        beneficiary: poolInfo[1],
        name: poolInfo[2],
        lotteryMonth: poolInfo[3].toString(),
        isActive: poolInfo[4],
        minDonationPercent: poolInfo[5].toString(),
        totalDonation: poolInfo[6].toString(),
      };
    } catch (error) {
      logger.error("Failed to get pool data", {
        error: error.message,
        poolId,
      });
      throw error;
    }
  }
}

export default new PoolService();
