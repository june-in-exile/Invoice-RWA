import { ethers } from 'ethers';
import 'dotenv/config';

async function createPoolRegistrationSignature() {
  // --- 1. CONFIGURATION ---
  const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

  if (!ADMIN_PRIVATE_KEY) {
    // Do not log to console, as it will be captured by the test script
    process.exit(1);
  }

  // Get data from command-line arguments
  const poolId = process.argv[2];
  const beneficiary = process.argv[3];
  const name = process.argv[4] || 'Automated Test Pool';
  const lotteryMonth = process.argv[5] || 4;

  if (!poolId || !beneficiary) {
    // Do not log to console
    process.exit(1);
  }

  // --- 2. SIGNATURE CREATION ---
  const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY);

  // This message format MUST match the one in `backend/src/services/pool.js`
  const message = `Register pool ${poolId} with beneficiary ${beneficiary}`;

  const signature = await wallet.signMessage(message);

  // --- 3. OUTPUT SIGNATURE ---
  // Print only the signature to stdout
  process.stdout.write(signature);
}

createPoolRegistrationSignature().catch(() => process.exit(1));