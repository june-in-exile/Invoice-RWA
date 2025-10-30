import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// ABIs (simplified, full ABI is required for actual use)
const InvoiceTokenABI = [
  "function mint(address to, uint8 donationPercent, uint256 poolId, uint256 lotteryDay, uint256 amount) external returns (uint256)",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function getImmutableData(uint256 tokenTypeId) external view returns (uint8 donationPercent, uint256 poolId, uint256 lotteryDay)",
  "event TokensMinted(uint256 indexed tokenTypeId, address indexed to, uint256 amount)",
];

const PoolABI = [
  "function notifyLotteryResult(uint256 tokenTypeId, uint256 prizeAmount) external",
  "function updateRewardPerToken(uint256 tokenTypeId, uint256 rewardPerToken) external",
  "function batchClaimReward(address[] calldata users, uint256[] calldata tokenTypeIds) external",
  "function markAsDistributed(uint256 tokenTypeId) external",
  "event LotteryResultNotified(uint256 indexed tokenTypeId, uint256 indexed poolId, uint256 totalAmount, uint256 donationAmount, uint256 rewardPerToken)",
];

// Provider
const provider = new ethers.JsonRpcProvider(
  process.env.NODE_ENV === "production"
    ? process.env.ZIRCUIT_RPC_URL
    : process.env.ZIRCUIT_TESTNET_RPC_URL
);

// Wallets
const relayerWallet = new ethers.Wallet(
  process.env.RELAYER_PRIVATE_KEY,
  provider
);
const oracleWallet = new ethers.Wallet(
  process.env.ORACLE_PRIVATE_KEY,
  provider
);

// Contracts
const invoiceToken = new ethers.Contract(
  process.env.INVOICE_TOKEN_ADDRESS,
  InvoiceTokenABI,
  relayerWallet
);

const pool = new ethers.Contract(
  process.env.POOL_ADDRESS,
  PoolABI,
  oracleWallet
);

export {
  provider,
  relayerWallet,
  oracleWallet,
  invoiceToken,
  pool,
  InvoiceTokenABI,
  PoolABI,
};
