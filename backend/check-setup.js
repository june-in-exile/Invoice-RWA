import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function checkSetup() {
  console.log("===== Checking Backend Setup =====\n");

  // 1. Check RPC Connection
  console.log("1. Checking RPC Connection...");
  const rpcUrl =
    process.env.NODE_ENV === "production"
      ? process.env.ZIRCUIT_RPC_URL
      : process.env.ZIRCUIT_TESTNET_RPC_URL;
  console.log(`   RPC URL: ${rpcUrl}`);

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    console.log(`   ✓ Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
  } catch (error) {
    console.log(`   ✗ RPC connection failed: ${error.message}`);
    process.exit(1);
  }

  // 2. Check Relayer Wallet
  console.log("\n2. Checking Relayer Wallet...");
  console.log(`   Address: ${process.env.RELAYER_ADDRESS}`);

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(process.env.RELAYER_ADDRESS);
    const balanceInEth = ethers.formatEther(balance);
    console.log(`   Balance: ${balanceInEth} ETH`);

    if (balance === 0n) {
      console.log(`   ⚠ WARNING: Relayer wallet has 0 balance!`);
      console.log(`   ⚠ You need testnet ETH to mint NFTs.`);
      console.log(`   ⚠ Get testnet tokens from a faucet.`);
    } else if (balance < ethers.parseEther("0.01")) {
      console.log(`   ⚠ WARNING: Low balance. Consider adding more testnet ETH.`);
    } else {
      console.log(`   ✓ Sufficient balance for testing`);
    }
  } catch (error) {
    console.log(`   ✗ Failed to check balance: ${error.message}`);
  }

  // 3. Check Oracle Wallet
  console.log("\n3. Checking Oracle Wallet...");
  console.log(`   Address: ${process.env.ORACLE_ADDRESS}`);

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(process.env.ORACLE_ADDRESS);
    const balanceInEth = ethers.formatEther(balance);
    console.log(`   Balance: ${balanceInEth} ETH`);

    if (balance === 0n) {
      console.log(`   ⚠ WARNING: Oracle wallet has 0 balance!`);
    } else {
      console.log(`   ✓ Has balance`);
    }
  } catch (error) {
    console.log(`   ✗ Failed to check balance: ${error.message}`);
  }

  // 4. Check Contract Addresses
  console.log("\n4. Checking Contract Configuration...");
  console.log(`   Invoice Token: ${process.env.INVOICE_TOKEN_ADDRESS}`);
  console.log(`   Pool Contract: ${process.env.POOL_ADDRESS}`);

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Check if contract has code
    const tokenCode = await provider.getCode(
      process.env.INVOICE_TOKEN_ADDRESS
    );
    const poolCode = await provider.getCode(process.env.POOL_ADDRESS);

    if (tokenCode === "0x") {
      console.log(`   ✗ Invoice Token contract not found at this address!`);
    } else {
      console.log(`   ✓ Invoice Token contract deployed`);
    }

    if (poolCode === "0x") {
      console.log(`   ✗ Pool contract not found at this address!`);
    } else {
      console.log(`   ✓ Pool contract deployed`);
    }
  } catch (error) {
    console.log(`   ✗ Failed to check contracts: ${error.message}`);
  }

  // 5. Database Connection
  console.log("\n5. Checking Database...");
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   Database: ${process.env.DB_NAME}`);
  console.log(`   User: ${process.env.DB_USER}`);

  try {
    const { default: db } = await import("./src/db/db.js");
    await db.query("SELECT NOW()");
    console.log(`   ✓ Database connected`);
  } catch (error) {
    console.log(`   ✗ Database connection failed: ${error.message}`);
  }

  console.log("\n===== Setup Check Complete =====\n");
  process.exit(0);
}

checkSetup();
