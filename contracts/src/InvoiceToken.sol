// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title InvoiceToken (IVC)
 * @notice 統一發票 NFT，相同屬性的發票可批量交易
 */
contract InvoiceToken is ERC1155, AccessControl, ReentrancyGuard {
    
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    // Immutable 屬性（創建後不可變）
    struct ImmutableData {
        uint8 donationPercent;      // 捐贈比例 (20 or 50)
        uint256 poolId;              // Pool ID
        uint256 lotteryDay;          // 開獎日期 (timestamp)
    }

    // Token Type ID => Immutable 屬性
    mapping(uint256 tokenTypeId => ImmutableData config) private _immutableData;
    
    // Token Type ID => 是否已開獎
    mapping(uint256 tokenTypeId => bool isDrawn) public drawn;
    
    // Token Type ID => 是否存在
    mapping(uint256 tokenTypeId => bool exists) public tokenTypeExists;
    
    // 下一個 Token Type ID
    uint256 private _nextTokenTypeId = 1;

    // Events
    event TokenTypeCreated(
        uint256 indexed tokenTypeId,
        uint8 donationPercent,
        uint256 poolId,
        uint256 lotteryDay
    );

    event TokensMinted(
        uint256 indexed tokenTypeId,
        address indexed to,
        uint256 amount
    );

    event LotteryDrawn(
        uint256 indexed tokenTypeId,
        uint256 timestamp
    );

    constructor(
        address admin,
        address minter,
        address oracle,
        string memory uri
    ) ERC1155(uri) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(ORACLE_ROLE, oracle);
    }

    /**
     * @notice 創建新的 token type（如果不存在）
     * @dev Immutable 屬性創建後無法修改
     */
    function createTokenType(
        uint8 donationPercent,
        uint256 poolId,
        uint256 lotteryDay
    ) public onlyRole(MINTER_ROLE) returns (uint256) {
        require(
            donationPercent == 20 || donationPercent == 50, 
            "Invalid donation percent"
        );
        require(lotteryDay > block.timestamp, "Lottery day must be in future");

        // 檢查是否已存在相同屬性的 token type
        uint256 existingTypeId = _findTokenType(donationPercent, poolId, lotteryDay);
        if (existingTypeId != 0) {
            return existingTypeId;
        }

        uint256 tokenTypeId = _nextTokenTypeId++;

        _immutableData[tokenTypeId] = ImmutableData({
            donationPercent: donationPercent,
            poolId: poolId,
            lotteryDay: lotteryDay
        });

        drawn[tokenTypeId] = false;
        tokenTypeExists[tokenTypeId] = true;

        emit TokenTypeCreated(tokenTypeId, donationPercent, poolId, lotteryDay);

        return tokenTypeId;
    }

    /**
     * @notice Mint tokens（自動創建或復用 token type）
     */
    function mint(
        address to,
        uint8 donationPercent,
        uint256 poolId,
        uint256 lotteryDay,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) nonReentrant returns (uint256) {
        require(amount > 0, "Amount must be positive");
        require(to != address(0), "Cannot mint to zero address");

        uint256 tokenTypeId = createTokenType(donationPercent, poolId, lotteryDay);
        _mint(to, tokenTypeId, amount, "");

        emit TokensMinted(tokenTypeId, to, amount);

        return tokenTypeId;
    }

    /**
     * @notice 批量 mint 不同 token types
     */
    function mintBatch(
        address to,
        uint256[] calldata tokenTypeIds,
        uint256[] calldata amounts
    ) external onlyRole(MINTER_ROLE) nonReentrant {
        require(
            tokenTypeIds.length == amounts.length, 
            "Length mismatch"
        );
        require(to != address(0), "Cannot mint to zero address");

        for (uint256 i = 0; i < tokenTypeIds.length; i++) {
            require(tokenTypeExists[tokenTypeIds[i]], "Token type does not exist");
            require(amounts[i] > 0, "Amount must be positive");
        }

        _mintBatch(to, tokenTypeIds, amounts, "");
    }

    /**
     * @notice Oracle 標記為已開獎
     */
    function markAsDrawn(uint256 tokenTypeId) external onlyRole(ORACLE_ROLE) {
        require(tokenTypeExists[tokenTypeId], "Token type does not exist");
        require(!drawn[tokenTypeId], "Already drawn");

        drawn[tokenTypeId] = true;

        emit LotteryDrawn(tokenTypeId, block.timestamp);
    }

    /**
     * @notice 批量標記為已開獎
     */
    function batchMarkAsDrawn(uint256[] calldata tokenTypeIds) 
        external 
        onlyRole(ORACLE_ROLE) 
    {
        for (uint256 i = 0; i < tokenTypeIds.length; i++) {
            uint256 tokenTypeId = tokenTypeIds[i];
            if (tokenTypeExists[tokenTypeId] && !drawn[tokenTypeId]) {
                drawn[tokenTypeId] = true;
                emit LotteryDrawn(tokenTypeId, block.timestamp);
            }
        }
    }

    /**
     * @notice 取得 token type 的總供應量
     */
    function totalSupply(uint256 tokenTypeId) external view returns (uint256) {
        require(tokenTypeExists[tokenTypeId], "Token type does not exist");
        
        // ERC1155 沒有內建 totalSupply，需要透過 event 追蹤
        // 或者在合約中維護一個 mapping
        // 這裡簡化處理，實際使用需要在 Pool 合約透過 indexer 查詢
        revert("Use indexer to get total supply");
    }

    /**
     * @notice 取得 immutable 屬性
     */
    function getImmutableData(uint256 tokenTypeId) 
        external 
        view 
        returns (
            uint8 donationPercent,
            uint256 poolId,
            uint256 lotteryDay
        ) 
    {
        require(tokenTypeExists[tokenTypeId], "Token type does not exist");
        ImmutableData memory data = _immutableData[tokenTypeId];
        return (data.donationPercent, data.poolId, data.lotteryDay);
    }

    /**
     * @notice 取得完整資訊（immutable + mutable）
     */
    function getTokenTypeData(uint256 tokenTypeId) 
        external 
        view 
        returns (
            uint8 donationPercent,
            uint256 poolId,
            uint256 lotteryDay,
            bool hasBeenDrawn
        ) 
    {
        require(tokenTypeExists[tokenTypeId], "Token type does not exist");
        ImmutableData memory data = _immutableData[tokenTypeId];
        return (
            data.donationPercent, 
            data.poolId, 
            data.lotteryDay, 
            drawn[tokenTypeId]
        );
    }

    /**
     * @notice 檢查是否已開獎
     */
    function isDrawn(uint256 tokenTypeId) external view returns (bool) {
        require(tokenTypeExists[tokenTypeId], "Token type does not exist");
        return drawn[tokenTypeId];
    }

    /**
     * @notice 更新 metadata URI
     */
    function setURI(string memory newuri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newuri);
    }

    /**
     * @dev 查找是否存在相同屬性的 token type
     */
    function _findTokenType(
        uint8 donationPercent,
        uint256 poolId,
        uint256 lotteryDay
    ) private view returns (uint256) {
        for (uint256 i = 1; i < _nextTokenTypeId; i++) {
            if (tokenTypeExists[i]) {
                ImmutableData memory data = _immutableData[i];
                if (
                    data.donationPercent == donationPercent &&
                    data.poolId == poolId &&
                    data.lotteryDay == lotteryDay
                ) {
                    return i;
                }
            }
        }
        return 0;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}