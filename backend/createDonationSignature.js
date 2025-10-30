// createDonationSignature.js
//
// Generates a signature to call the /api/pools/:poolId/min-donation-percent endpoint.

import { ethers } from 'ethers';
import 'dotenv/config';

async function createDonationPercentSignature() {
  // --- 1. CONFIGURATION ---
  // This script uses the BENEFICIARY_PRIVATE_KEY from your .env file.
  const BENEFICIARY_PRIVATE_KEY = process.env.BENEFICIARY_PRIVATE_KEY;

  if (!BENEFICIARY_PRIVATE_KEY) {
    console.error("BENEFICIARY_PRIVATE_KEY not found in your .env file.");
    return;
  }

  const updateData = {
    poolId: 2, // The ID of the pool you want to update
    minDonationPercent: 30, // The new minimum donation percentage
  };

  // --- 2. SIGNATURE CREATION ---
  const wallet = new ethers.Wallet(BENEFICIARY_PRIVATE_KEY);
  const beneficiaryAddress = await wallet.getAddress();
  console.log(`Signing with Beneficiary address: ${beneficiaryAddress}`);

  // This message format MUST match `backend/src/services/pool.js`
  const message = `Update minDonationPercent for pool ${updateData.poolId} to ${updateData.minDonationPercent}`;

  console.log(`\nSigning message: "${message}"`);
  const signature = await wallet.signMessage(message);
  console.log(`\nGenerated Signature: ${signature}`);

  // --- 3. PREPARE API PAYLOAD ---
  const apiPayload = {
    minDonationPercent: updateData.minDonationPercent,
    signature: signature,
  };

  console.log('\n✅ Ready to call the API!');
  console.log('\nComplete curl command:');
  console.log('---------------------------------');
  console.log(`curl -X PUT http://localhost:3000/api/pools/${updateData.poolId}/min-donation-percent -H "Content-Type: application/json" -d '${JSON.stringify(apiPayload)}'`);
  console.log('---------------------------------');
}

createDonationPercentSignature().catch(console.error);
