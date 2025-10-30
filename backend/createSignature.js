// createSignature.js
//
// This script generates a signature needed to call the admin-only /api/pools/register endpoint.

import { ethers } from 'ethers';
import 'dotenv/config';

async function createPoolRegistrationSignature() {
  // --- 1. CONFIGURATION ---
  const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
  const BENEFICIARY_ADDRESS = process.env.BENEFICIARY_ADDRESS;

  if (!ADMIN_PRIVATE_KEY || !BENEFICIARY_ADDRESS) {
    console.error("ADMIN_PRIVATE_KEY and/or BENEFICIARY_ADDRESS not found in your .env file.");
    return;
  }

  // Pool data is now configured via .env and this script
  const poolData = {
    poolId: 2, // Changed from 1 to 2
    beneficiary: BENEFICIARY_ADDRESS,
    name: 'My Second Charity Pool',
    lotteryMonth: 4, // Must be 2 or 4
  };

  // --- 2. SIGNATURE CREATION ---
  const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY);
  const adminAddress = await wallet.getAddress();
  console.log(`Signing with Admin address: ${adminAddress}`);

  // This message format MUST match the one in `backend/src/services/pool.js`
  const message = `Register pool ${poolData.poolId} with beneficiary ${poolData.beneficiary}`;

  console.log(`\nSigning message: "${message}"`);
  const signature = await wallet.signMessage(message);
  console.log(`\nGenerated Signature: ${signature}`);

  // --- 3. PREPARE API PAYLOAD ---
  const apiPayload = {
    ...poolData,
    signature: signature,
  };

  console.log('\n✅ Ready to call the API!');
  console.log('\nComplete curl command:');
  console.log('---------------------------------');
  console.log(`curl -X POST http://localhost:3000/api/pools/register -H "Content-Type: application/json" -d '${JSON.stringify(apiPayload)}'`);
  console.log('---------------------------------');
}

createPoolRegistrationSignature().catch(console.error);