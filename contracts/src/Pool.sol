// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./InvoiceToken.sol";

/**
 * @title Pool
 * @notice 管理慈善池、中獎分潤、獎金發放
 */
contract Pool is AccessControl, ReentrancyGuard {
    
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant CLAIM_OPERATOR_ROLE = keccak256("CLAIM_OPERATOR_ROLE");

    InvoiceToken public immutable invoiceToken;

    // Pool 資訊
    struct PoolInfo {
        uint256 poolId;
        address beneficiary;        // 基金會地址
        string name;                // 基金會名稱
        uint256 lotteryMonth;       // 開獎月份 (2 or 4)
        bool active;                // 是否啟用
        uint256 totalDonationReceived;  // 累計收到的捐款
        uint256 pendingDonation;    // 待提領的捐款
        uint256 lastWithdrawAt;     // 上次提領時間
    }

    // 中獎資訊
    struct PrizeInfo {
        uint256 totalAmount;        // 總中獎金額
        uint256 donationAmount;     // 捐款金額
        uint256 rewardPerToken;     // 每個 token 的獎金
        bool distributed;           // 是否已分配
        uint256 distributedAt;      // 分配時間
    }

    // Pool ID => Pool 資訊
    mapping(uint256 poolId => PoolInfo info) public pools;
    
    // Token Type ID => 中獎資訊
    mapping(uint256 tokenTypeId => PrizeInfo prize) public prizes;
    
    // User => Token Type ID => 是否已領取
    mapping(address user => mapping(uint256 tokenTypeId => bool claimed)) public claimed;

    // 已註冊的 Pool IDs
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
     * @notice 註冊新的 Pool
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
            totalDonationReceived: 0,
            pendingDonation: 0,
            lastWithdrawAt: 0
        });

        poolIds.push(poolId);

        emit PoolRegistered(poolId, beneficiary, name, lotteryMonth);
    }

    /**
     * @notice 更新 Pool 受益地址
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
     * @notice 停用 Pool
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
     * @notice Oracle 通知中獎結果
     * @dev 計算分潤並記錄
     */
    function notifyLotteryResult(
        uint256 tokenTypeId,
        uint256 prizeAmount
    ) external onlyRole(ORACLE_ROLE) nonReentrant {
        require(invoiceToken.tokenTypeExists(tokenTypeId), "Token type does not exist");
        require(!prizes[tokenTypeId].distributed, "Already distributed");
        require(prizeAmount > 0, "Prize amount must be positive");

        // 取得 token type 屬性
        (
            uint8 donationPercent,
            uint256 poolId,
            
        ) = invoiceToken.getImmutableData(tokenTypeId);

        // 驗證 Pool 存在且啟用
        require(pools[poolId].poolId != 0, "Pool does not exist");
        require(pools[poolId].active, "Pool is not active");

        // 計算分配
        uint256 donationAmount = (prizeAmount * donationPercent) / 100;
        uint256 totalReward = prizeAmount - donationAmount;

        // 注意：rewardPerToken 需要鏈下計算 totalSupply
        // 這裡先記錄總獎金，實際分配時再計算
        prizes[tokenTypeId] = PrizeInfo({
            totalAmount: prizeAmount,
            donationAmount: donationAmount,
            rewardPerToken: 0, // 需要鏈下計算後更新
            distributed: false,
            distributedAt: 0
        });

        // 更新 Pool 的待提領捐款
        pools[poolId].pendingDonation += donationAmount;

        // 通知 InvoiceToken 標記為已開獎
        invoiceToken.markAsDrawn(tokenTypeId);

        emit LotteryResultNotified(
            tokenTypeId,
            poolId,
            prizeAmount,
            donationAmount,
            0 // rewardPerToken 待更新
        );
    }

    /**
     * @notice 更新每個 token 的獎金（由 ROFL 計算後呼叫）
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
     * @notice 用戶領取獎金（或 Relayer 代領）
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

        // 轉帳獎金給用戶
        (bool success, ) = payable(user).call{value: reward}("");
        require(success, "Transfer failed");

        emit RewardClaimed(user, tokenTypeId, reward);
    }

    /**
     * @notice 批量領取獎金（Relayer 用於 Push 模式）
     */
    function batchClaimReward(
        address[] calldata users,
        uint256[] calldata tokenTypeIds
    ) external onlyRole(CLAIM_OPERATOR_ROLE) nonReentrant {
        require(users.length == tokenTypeIds.length, "Length mismatch");

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 tokenTypeId = tokenTypeIds[i];

            // 跳過已領取或無餘額的
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
     * @notice 標記為已分配（在批量 claim 後）
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
     * @notice 基金會提領捐款
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
     * @notice 查詢用戶可領取的獎金
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
     * @notice 查詢所有 Pool IDs
     */
    function getAllPoolIds() external view returns (uint256[] memory) {
        return poolIds;
    }

    /**
     * @notice 接收 ETH/BNB
     */
    receive() external payable {}
}