import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// ABIs for V2 contracts
const InvoiceTokenV2ABI = [
  "function mint(address to, uint8 donationPercent, uint256 poolId, uint256 lotteryDay, uint256 amount) external returns (uint256)",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function getImmutableData(uint256 tokenTypeId) external view returns (uint8 donationPercent, uint256 poolId, uint256 lotteryDay)",
  "function setPoolContract(address _poolContractAddress) external",
  "event TokensMinted(uint256 indexed tokenTypeId, address indexed to, uint256 amount)",
];

const PoolV2ABI = [
  "function registerPool(uint256 poolId, address beneficiary, string calldata name, uint256 lotteryMonth) external",
  "function pools(uint256 poolId) external view returns (uint256 poolId, address beneficiary, string name, uint256 lotteryMonth, bool active, uint8 minDonationPercent, uint256 totalDonationReceived, uint256 pendingDonation, uint256 lastWithdrawAt)",
  "function updateMinDonationPercent(uint256 poolId, uint8 _minDonationPercent) external",
  "function notifyLotteryResult(uint256 tokenTypeId, uint256 prizeAmount) external",
  "function updateRewardPerToken(uint256 tokenTypeId, uint256 rewardPerToken) external",
  "function batchClaimReward(address[] calldata users, uint256[] calldata tokenTypeIds) external",
  "function markAsDistributed(uint256 tokenTypeId) external",
  "event LotteryResultNotified(uint256 indexed tokenTypeId, uint256 indexed poolId, uint256 totalAmount, uint256 donationAmount, uint256 rewardPerToken)",
  "event MinDonationPercentUpdated(uint256 indexed poolId, uint8 newMinDonationPercent)",
];

// Provider
const provider = new ethers.JsonRpcProvider(
  process.env.NODE_ENV === "production"
    ? process.env.ZIRCUIT_RPC_URL
    : process.env.ZIRCUIT_TESTNET_RPC_URL
);

// Addresses
const adminAddress = process.env.ADMIN_ADDRESS;

// Wallets
const adminWallet = new ethers.Wallet(
  process.env.ADMIN_PRIVATE_KEY,
  provider
);
const relayerWallet = new ethers.Wallet(
  process.env.RELAYER_PRIVATE_KEY,
  provider
);
const oracleWallet = new ethers.Wallet(
  process.env.ORACLE_PRIVATE_KEY,
  provider
);

// V2 Contracts
const invoiceTokenV2 = new ethers.Contract(
  process.env.INVOICE_TOKEN_V2_ADDRESS,
  InvoiceTokenV2ABI,
  relayerWallet
);

const poolV2 = new ethers.Contract(
  process.env.POOL_V2_ADDRESS,
  PoolV2ABI,
  oracleWallet
);

export {
  provider,
  adminAddress,
  adminWallet, // Export adminWallet
  relayerWallet,
  oracleWallet,
  invoiceTokenV2 as invoiceToken, // Keep exporting as invoiceToken for minimal changes in other files
  poolV2 as pool, // Keep exporting as pool for minimal changes in other files
  InvoiceTokenV2ABI as InvoiceTokenABI,
  PoolV2ABI as PoolABI,
};
