import { ethers } from 'ethers';
import 'dotenv/config';

async function createDonationPercentSignature() {
  // --- 1. CONFIGURATION ---
  const BENEFICIARY_PRIVATE_KEY = process.env.BENEFICIARY_PRIVATE_KEY;

  if (!BENEFICIARY_PRIVATE_KEY) {
    // Do not log to console
    process.exit(1);
  }

  // Get data from command-line arguments
  const poolId = process.argv[2];
  const minDonationPercent = process.argv[3];

  if (!poolId || !minDonationPercent) {
    // Do not log to console
    process.exit(1);
  }

  // --- 2. SIGNATURE CREATION ---
  const wallet = new ethers.Wallet(BENEFICIARY_PRIVATE_KEY);
  
  // This message format MUST match `backend/src/services/pool.js`
  const message = `Update minDonationPercent for pool ${poolId} to ${minDonationPercent}`;

  const signature = await wallet.signMessage(message);

  // --- 3. OUTPUT SIGNATURE ---
  process.stdout.write(signature);
}

createDonationPercentSignature().catch(() => process.exit(1));
