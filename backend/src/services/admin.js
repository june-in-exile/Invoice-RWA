import { ethers } from "ethers";
import { invoiceTokenV2 as invoiceTokenContract, poolV2 as poolContract, adminWallet, adminAddress } from "../config/contracts.js";
import logger from "../utils/logger.js";

class AdminService {

  /**
   * Set the token URI (Admin only)
   */
  async setTokenUri(uri, signature) {
    try {
      logger.info("Setting token URI", { uri });

      const message = `Set token URI to ${uri}`;
      const signerAddress = ethers.verifyMessage(message, signature);

      if (signerAddress.toLowerCase() !== adminAddress.toLowerCase()) {
        throw new Error("Invalid signature. Caller is not the admin.");
      }

      logger.info("Admin signature verified", { signerAddress });

      const contractWithAdmin = invoiceTokenContract.connect(adminWallet);
      const tx = await contractWithAdmin.setURI(uri);

      logger.info("Set token URI transaction sent", { txHash: tx.hash });
      const receipt = await tx.wait();
      logger.info("Transaction confirmed", { txHash: tx.hash, blockNumber: receipt.blockNumber });

      return {
        success: true,
        txHash: tx.hash,
      };
    } catch (error) {
      logger.error("Failed to set token URI", {
        error: error.message,
        uri,
      });
      throw error;
    }
  }

  /**
   * Set the pool contract address (Admin only)
   */
  async setPoolContract(address, signature) {
    try {
      logger.info("Setting pool contract address", { address });

      const message = `Set pool contract to ${address}`;
      const signerAddress = ethers.verifyMessage(message, signature);

      if (signerAddress.toLowerCase() !== adminAddress.toLowerCase()) {
        throw new Error("Invalid signature. Caller is not the admin.");
      }

      logger.info("Admin signature verified", { signerAddress });

      const checksumAddress = ethers.getAddress(address);

      const contractWithAdmin = invoiceTokenContract.connect(adminWallet);
      const tx = await contractWithAdmin.setPoolContract(checksumAddress);

      logger.info("Set pool contract transaction sent", { txHash: tx.hash });
      const receipt = await tx.wait();
      logger.info("Transaction confirmed", { txHash: tx.hash, blockNumber: receipt.blockNumber });

      return {
        success: true,
        txHash: tx.hash,
      };
    } catch (error) {
      logger.error("Failed to set pool contract address", {
        error: error.message,
        address,
      });
      throw error;
    }
  }
}

export default new AdminService();
