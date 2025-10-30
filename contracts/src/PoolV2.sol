// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./InvoiceToken.sol";

/**
 * @title Pool
 * @notice Manage charity pools, lottery prize distribution, and reward payouts
 */
contract PoolV2 is AccessControl, ReentrancyGuard {

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant CLAIM_OPERATOR_ROLE = keccak256("CLAIM_OPERATOR_ROLE");

    InvoiceToken public immutable invoiceToken;

    // Pool information
    struct PoolInfo {
        uint256 poolId;
        address beneficiary;        // Foundation address
        string name;                // Foundation name
        uint256 lotteryMonth;       // Lottery month (2 or 4)
        bool active;                // Whether active
        uint8 minDonationPercent;   // Minimum donation percentage for IVCtoken
        uint256 totalDonationReceived;  // Total donations received
        uint256 pendingDonation;    // Pending donations to withdraw
        uint256 lastWithdrawAt;     // Last withdrawal time
    }

    // Prize information
    struct PrizeInfo {
        uint256 totalAmount;        // Total prize amount
        uint256 donationAmount;     // Donation amount
        uint256 rewardPerToken;     // Reward per token
        bool distributed;           // Whether distributed
        uint256 distributedAt;      // Distribution time
    }

    // Pool ID => Pool information
    mapping(uint256 poolId => PoolInfo info) public pools;

    // Token Type ID => Prize information
    mapping(uint256 tokenTypeId => PrizeInfo prize) public prizes;

    // User => Token Type ID => Whether claimed
    mapping(address user => mapping(uint256 tokenTypeId => bool claimed)) public claimed;

    // Registered Pool IDs
    uint256[] public poolIds;

    // Events
    event PoolRegistered(
        uint256 indexed poolId,
        address beneficiary,
        string name,
        uint256 lotteryMonth
    );

    event PoolUpdated(
        uint256 indexed poolId,
        address newBeneficiary
    );

    event PoolDeactivated(uint256 indexed poolId);

    event MinDonationPercentUpdated(
        uint256 indexed poolId,
        uint8 newMinDonationPercent
    );

    event LotteryResultNotified(
        uint256 indexed tokenTypeId,
        uint256 indexed poolId,
        uint256 totalAmount,
        uint256 donationAmount,
        uint256 rewardPerToken
    );

    event RewardClaimed(
        address indexed user,
        uint256 indexed tokenTypeId,
        uint256 amount
    );

    event DonationWithdrawn(
        uint256 indexed poolId,
        address indexed beneficiary,
        uint256 amount,
        uint256 timestamp
    );

    constructor(
        address admin,
        address oracle,
        address claimOperator,
        address _invoiceToken
    ) {
        require(_invoiceToken != address(0), "Invalid token address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ORACLE_ROLE, oracle);
        _grantRole(CLAIM_OPERATOR_ROLE, claimOperator);
        
        invoiceToken = InvoiceToken(_invoiceToken);
    }

    /**
     * @notice Register new Pool
     */
    function registerPool(
        uint256 poolId,
        address beneficiary,
        string calldata name,
        uint256 lotteryMonth
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(
            lotteryMonth == 2 || lotteryMonth == 4, 
            "Lottery month must be 2 or 4"
        );
        require(pools[poolId].poolId == 0, "Pool already exists");

        pools[poolId] = PoolInfo({
            poolId: poolId,
            beneficiary: beneficiary,
            name: name,
            lotteryMonth: lotteryMonth,
            active: true,
            minDonationPercent: 0,
            totalDonationReceived: 0,
            pendingDonation: 0,
            lastWithdrawAt: 0
        });

        poolIds.push(poolId);

        emit PoolRegistered(poolId, beneficiary, name, lotteryMonth);
    }

    /**
     * @notice Update Pool beneficiary address
     */
    function updateBeneficiary(uint256 poolId, address newBeneficiary) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(pools[poolId].poolId != 0, "Pool does not exist");
        require(newBeneficiary != address(0), "Invalid beneficiary");

        pools[poolId].beneficiary = newBeneficiary;

        emit PoolUpdated(poolId, newBeneficiary);
    }

    /**
     * @notice Deactivate Pool
     */
    function deactivatePool(uint256 poolId) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(pools[poolId].poolId != 0, "Pool does not exist");
        require(pools[poolId].active, "Pool already inactive");

        pools[poolId].active = false;

        emit PoolDeactivated(poolId);
    }

    /**
     * @notice Update minimum donation percentage for a pool
     * @dev Only beneficiary can call this
     */
    function updateMinDonationPercent(uint256 poolId, uint8 _minDonationPercent) 
        external 
    {
        require(pools[poolId].poolId != 0, "Pool does not exist");
        require(
            msg.sender == pools[poolId].beneficiary,
            "Only beneficiary can update"
        );
        require(
            _minDonationPercent >= 0 && _minDonationPercent <= 100,
            "Invalid donation percent"
        );

        pools[poolId].minDonationPercent = _minDonationPercent;

        emit MinDonationPercentUpdated(poolId, _minDonationPercent);
    }

    /**
     * @notice Oracle notify lottery result
     * @dev Calculate distribution and record
     */
    function notifyLotteryResult(
        uint256 tokenTypeId,
        uint256 prizeAmount
    ) external onlyRole(ORACLE_ROLE) nonReentrant {
        require(invoiceToken.tokenTypeExists(tokenTypeId), "Token type does not exist");
        require(!prizes[tokenTypeId].distributed, "Already distributed");
        require(prizeAmount > 0, "Prize amount must be positive");

        // Get token type attributes
        (
            uint8 donationPercent,
            uint256 poolId,

        ) = invoiceToken.getImmutableData(tokenTypeId);

        // Verify Pool exists and is active
        require(pools[poolId].poolId != 0, "Pool does not exist");
        require(pools[poolId].active, "Pool is not active");

        // Calculate distribution
        uint256 donationAmount = (prizeAmount * donationPercent) / 100;

        // Note: rewardPerToken needs to be calculated off-chain with totalSupply
        // Record total prize here first, calculate actual distribution later
        prizes[tokenTypeId] = PrizeInfo({
            totalAmount: prizeAmount,
            donationAmount: donationAmount,
            rewardPerToken: 0, // Needs to be updated after off-chain calculation
            distributed: false,
            distributedAt: 0
        });

        // Update Pool's pending donations
        pools[poolId].pendingDonation += donationAmount;

        // Notify InvoiceToken to mark as drawn
        invoiceToken.markAsDrawn(tokenTypeId);

        emit LotteryResultNotified(
            tokenTypeId,
            poolId,
            prizeAmount,
            donationAmount,
            0 // rewardPerToken to be updated
        );
    }

    /**
     * @notice Update reward per token (called after ROFL calculation)
     */
    function updateRewardPerToken(
        uint256 tokenTypeId,
        uint256 rewardPerToken
    ) external onlyRole(CLAIM_OPERATOR_ROLE) {
        require(prizes[tokenTypeId].totalAmount > 0, "Prize not initialized");
        require(!prizes[tokenTypeId].distributed, "Already distributed");
        require(rewardPerToken > 0, "Invalid reward per token");

        prizes[tokenTypeId].rewardPerToken = rewardPerToken;
    }

    /**
     * @notice User claim reward (or claimed by Relayer)
     */
    function claimReward(address user, uint256 tokenTypeId) 
        public 
        nonReentrant 
    {
        require(
            msg.sender == user || hasRole(CLAIM_OPERATOR_ROLE, msg.sender),
            "Not authorized"
        );
        require(!claimed[user][tokenTypeId], "Already claimed");
        require(prizes[tokenTypeId].rewardPerToken > 0, "Reward not set");

        uint256 balance = invoiceToken.balanceOf(user, tokenTypeId);
        require(balance > 0, "No tokens to claim");

        uint256 reward = balance * prizes[tokenTypeId].rewardPerToken;
        require(reward > 0, "No reward to claim");

        claimed[user][tokenTypeId] = true;

        // Transfer reward to user
        (bool success, ) = payable(user).call{value: reward}("");
        require(success, "Transfer failed");

        emit RewardClaimed(user, tokenTypeId, reward);
    }

    /**
     * @notice Batch claim rewards (Relayer for Push mode)
     */
    function batchClaimReward(
        address[] calldata users,
        uint256[] calldata tokenTypeIds
    ) external onlyRole(CLAIM_OPERATOR_ROLE) nonReentrant {
        require(users.length == tokenTypeIds.length, "Length mismatch");

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 tokenTypeId = tokenTypeIds[i];

            // Skip if already claimed or no balance
            if (claimed[user][tokenTypeId]) continue;
            if (invoiceToken.balanceOf(user, tokenTypeId) == 0) continue;
            if (prizes[tokenTypeId].rewardPerToken == 0) continue;

            uint256 balance = invoiceToken.balanceOf(user, tokenTypeId);
            uint256 reward = balance * prizes[tokenTypeId].rewardPerToken;

            if (reward == 0) continue;

            claimed[user][tokenTypeId] = true;

            (bool success, ) = payable(user).call{value: reward}("");
            if (success) {
                emit RewardClaimed(user, tokenTypeId, reward);
            }
        }
    }

    /**
     * @notice Mark as distributed (after batch claim)
     */
    function markAsDistributed(uint256 tokenTypeId) 
        external 
        onlyRole(CLAIM_OPERATOR_ROLE) 
    {
        require(prizes[tokenTypeId].totalAmount > 0, "Prize not initialized");
        require(!prizes[tokenTypeId].distributed, "Already distributed");

        prizes[tokenTypeId].distributed = true;
        prizes[tokenTypeId].distributedAt = block.timestamp;
    }

    /**
     * @notice Foundation withdraw donations
     */
    function withdrawDonation(uint256 poolId) 
        external 
        nonReentrant 
    {
        require(pools[poolId].poolId != 0, "Pool does not exist");
        require(
            msg.sender == pools[poolId].beneficiary,
            "Only beneficiary can withdraw"
        );

        uint256 amount = pools[poolId].pendingDonation;
        require(amount > 0, "No pending donation");

        pools[poolId].pendingDonation = 0;
        pools[poolId].totalDonationReceived += amount;
        pools[poolId].lastWithdrawAt = block.timestamp;

        (bool success, ) = payable(pools[poolId].beneficiary).call{value: amount}("");
        require(success, "Transfer failed");

        emit DonationWithdrawn(poolId, pools[poolId].beneficiary, amount, block.timestamp);
    }

    /**
     * @notice Query user's claimable reward
     */
    function getClaimableReward(address user, uint256 tokenTypeId) 
        external 
        view 
        returns (uint256) 
    {
        if (claimed[user][tokenTypeId]) return 0;
        if (prizes[tokenTypeId].rewardPerToken == 0) return 0;

        uint256 balance = invoiceToken.balanceOf(user, tokenTypeId);
        return balance * prizes[tokenTypeId].rewardPerToken;
    }

    /**
     * @notice Query all Pool IDs
     */
    function getAllPoolIds() external view returns (uint256[] memory) {
        return poolIds;
    }

    /**
     * @notice Receive ETH/BNB
     */
    receive() external payable {}
}