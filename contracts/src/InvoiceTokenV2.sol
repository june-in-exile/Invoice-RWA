// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "sapphire/Subcall.sol";
import "./PoolV2.sol";

/**
 * @title InvoiceToken (IVC)
 * @notice Uniform Invoice NFT, invoices with same attributes can be traded in batches
 */
contract InvoiceTokenV2 is ERC1155, AccessControl, ReentrancyGuard {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes21 public roflAppId;

    PoolV2 public poolContract;

    // Immutable attributes (cannot be changed after creation)
    struct ImmutableData {
        uint8 donationPercent;      // Donation percentage (20 or 50)
        uint256 poolId;              // Pool ID
        uint256 lotteryDay;          // Lottery day (timestamp)
    }

    // Token Type ID => Immutable attributes
    mapping(uint256 tokenTypeId => ImmutableData config) private _immutableData;

    // Token Type ID => Whether lottery has been drawn
    mapping(uint256 tokenTypeId => bool isDrawn) public drawn;

    // Token Type ID => Whether exists
    mapping(uint256 tokenTypeId => bool exists) public tokenTypeExists;

    // Next Token Type ID
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

    function setPoolContract(address payable _poolContractAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_poolContractAddress != address(0), "Invalid pool contract address");
        poolContract = PoolV2(_poolContractAddress);
    }

    function setRoflAppId(bytes21 _newId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newId.length == 21, "Invalid ROFL App ID");
        roflAppId = _newId;
    }

    /**
     * @notice Create new token type (if it doesn't exist)
     * @dev Immutable attributes cannot be modified after creation
     */
    function createTokenType(
        uint8 donationPercent,
        uint256 poolId,
        uint256 lotteryDay
    ) public returns (uint256) {
        Subcall.roflEnsureAuthorizedOrigin(roflAppId);
        require(
            donationPercent == 20 || donationPercent == 50, 
            "Invalid donation percent"
        );
        require(lotteryDay > block.timestamp, "Lottery day must be in future");

        // Check if token type with same attributes already exists
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
     * @notice Mint tokens (automatically create or reuse token type)
     */
    function mint(
        address to,
        uint8 donationPercent,
        uint256 poolId,
        uint256 lotteryDay,
        uint256 amount
    ) external nonReentrant returns (uint256) {
        Subcall.roflEnsureAuthorizedOrigin(roflAppId);
        require(amount > 0, "Amount must be positive");
        require(to != address(0), "Cannot mint to zero address");

        if (poolId != 0) {
            (uint256 pId, , , , , uint8 minDonationPercent, , ,) = poolContract.pools(poolId);
            require(pId != 0, "Pool does not exist");
            require(donationPercent >= minDonationPercent, "Donation percent too low for this pool");
        }

        uint256 tokenTypeId = createTokenType(donationPercent, poolId, lotteryDay);
        _mint(to, tokenTypeId, amount, "");

        emit TokensMinted(tokenTypeId, to, amount);

        return tokenTypeId;
    }

    /**
     * @notice Batch mint different token types
     */
    function mintBatch(
        address to,
        uint256[] calldata tokenTypeIds,
        uint256[] calldata amounts
    ) external nonReentrant {
        Subcall.roflEnsureAuthorizedOrigin(roflAppId);
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
     * @notice Oracle marks as lottery drawn
     */
    function markAsDrawn(uint256 tokenTypeId) external onlyRole(ORACLE_ROLE) {
        require(tokenTypeExists[tokenTypeId], "Token type does not exist");
        require(!drawn[tokenTypeId], "Already drawn");

        drawn[tokenTypeId] = true;

        emit LotteryDrawn(tokenTypeId, block.timestamp);
    }

    /**
     * @notice Batch mark as lottery drawn
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
     * @notice Get token type's total supply
     */
    function totalSupply(uint256 tokenTypeId) external view returns (uint256) {
        require(tokenTypeExists[tokenTypeId], "Token type does not exist");

        // ERC1155 doesn't have built-in totalSupply, needs to be tracked via events
        // or maintained in a mapping in the contract
        // Simplified here, actual use requires querying via indexer in Pool contract
        revert("Use indexer to get total supply");
    }

    /**
     * @notice Get immutable attributes
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
     * @notice Get complete information (immutable + mutable)
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
     * @notice Check if lottery has been drawn
     */
    function isDrawn(uint256 tokenTypeId) external view returns (bool) {
        require(tokenTypeExists[tokenTypeId], "Token type does not exist");
        return drawn[tokenTypeId];
    }

    /**
     * @notice Update metadata URI
     */
    function setURI(string memory newuri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newuri);
    }

    /**
     * @dev Find if token type with same attributes exists
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