import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// Ensure environment variables are loaded
if (!process.env.ZIRCUIT_TESTNET_RPC_URL && process.env.NODE_ENV !== "production") {
  throw new Error("ZIRCUIT_TESTNET_RPC_URL is not set in .env file");
}
if (!process.env.ZIRCUIT_RPC_URL && process.env.NODE_ENV === "production") {
  throw new Error("ZIRCUIT_RPC_URL is not set in .env file");
}
if (!process.env.INVOICE_TOKEN_V2_ADDRESS) {
  throw new Error("INVOICE_TOKEN_V2_ADDRESS is not set in .env file");
}
if (!process.env.POOL_V2_ADDRESS) {
  throw new Error("POOL_V2_ADDRESS is not set in .env file");
}
if (!process.env.ADMIN_PRIVATE_KEY) {
  throw new Error("ADMIN_PRIVATE_KEY is not set in .env file");
}
if (!process.env.RELAYER_PRIVATE_KEY) {
  throw new Error("RELAYER_PRIVATE_KEY is not set in .env file");
}
if (!process.env.ORACLE_PRIVATE_KEY) {
  throw new Error("ORACLE_PRIVATE_KEY is not set in .env file");
}

// ABIs for V2 contracts
const InvoiceTokenV2ABI = [
  "function mint(address to, uint8 donationPercent, uint256 poolId, uint256 lotteryDay, uint256 amount) external returns (uint256)",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function getImmutableData(uint256 tokenTypeId) external view returns (uint8 donationPercent, uint256 poolId, uint256 lotteryDay)",
  "function setPoolContract(address _poolContractAddress) external",
  "function getTokenTypeData(uint256 tokenTypeId) external view returns (uint8 donationPercent, uint256 poolId, uint256 lotteryDay, bool hasBeenDrawn)",
  "function isDrawn(uint256 tokenTypeId) external view returns (bool)",
  "function setURI(string memory newuri) external",
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
  "function claimReward(address user, uint256 tokenTypeId) public",
  "function withdrawDonation(uint256 poolId) external",
  "function updateBeneficiary(uint256 poolId, address newBeneficiary) external",
  "function deactivatePool(uint256 poolId) external",
  "function getClaimableReward(address user, uint256 tokenTypeId) external view returns (uint256)",
  "function getAllPoolIds() external view returns (uint256[] memory)",
  "event PoolRegistered(uint256 indexed poolId, address beneficiary, string name, uint256 lotteryMonth)",
  "event PoolUpdated(uint256 indexed poolId, address newBeneficiary)",
  "event PoolDeactivated(uint256 indexed poolId)",
  "event MinDonationPercentUpdated(uint256 indexed poolId, uint8 newMinDonationPercent)",
  "event LotteryResultNotified(uint256 indexed tokenTypeId, uint256 indexed poolId, uint256 totalAmount, uint256 donationAmount, uint256 rewardPerToken)",
  "event RewardClaimed(address indexed user, uint256 indexed tokenTypeId, uint256 amount)",
  "event DonationWithdrawn(uint256 indexed poolId, address indexed beneficiary, uint256 amount, uint256 timestamp)",
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
  invoiceTokenV2,
  poolV2,
  InvoiceTokenV2ABI as InvoiceTokenABI,
  PoolV2ABI as PoolABI,
};
