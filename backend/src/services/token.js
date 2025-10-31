import { invoiceTokenV2 as invoiceTokenContract } from "../config/contracts.js";
import logger from "../utils/logger.js";

class TokenService {

  /**
   * Get token type data
   * @param {string} tokenTypeId - The ID of the token type
   * @returns {Promise<object>} - The result of the operation
   */
  async getTokenTypeData(tokenTypeId) {
    try {
      logger.info("Getting token type data", { tokenTypeId });

      const tokenTypeData = await invoiceTokenContract.getTokenTypeData(tokenTypeId);
      if (tokenTypeData[0] === 0) {
          throw new Error(`Token type with ID ${tokenTypeId} not found.`);
      }

      return {
        success: true,
        tokenTypeId: tokenTypeId,
        donationPercent: tokenTypeData[0].toString(),
        poolId: tokenTypeData[1].toString(),
        lotteryDay: tokenTypeData[2].toString(),
        isDrawn: tokenTypeData[3],
      };
    } catch (error) {
      logger.error("Failed to get token type data", {
        error: error.message,
        tokenTypeId,
      });
      throw error;
    }
  }

  /**
   * Check if a token type has been drawn
   * @param {string} tokenTypeId - The ID of the token type
   * @returns {Promise<object>} - The result of the operation
   */
  async isDrawn(tokenTypeId) {
    try {
      logger.info("Checking if token is drawn", { tokenTypeId });

      const isDrawn = await invoiceTokenContract.isDrawn(tokenTypeId);

      return {
        success: true,
        tokenTypeId: tokenTypeId,
        isDrawn: isDrawn,
      };
    } catch (error) {
      logger.error("Failed to check if token is drawn", {
        error: error.message,
        tokenTypeId,
      });
      throw error;
    }
  }
}

export default new TokenService();
