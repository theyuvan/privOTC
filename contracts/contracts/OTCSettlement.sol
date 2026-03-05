// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./EscrowVault.sol";

/// @title OTCSettlement
/// @notice Executes atomic swaps between buyer and seller after CRE confirms the match
/// @dev Only callable by authorized CRE executor address
contract OTCSettlement is Ownable, ReentrancyGuard {
    /// @notice The escrow vault contract
    EscrowVault public immutable escrowVault;

    /// @notice Authorized CRE executor address
    address public creExecutor;

    /// @notice Trade settlement data
    struct Settlement {
        address buyer;
        address seller;
        address buyerToken;
        address sellerToken;
        uint256 buyerAmount;
        uint256 sellerAmount;
        uint256 timestamp;
        bool executed;
    }

    /// @notice Mapping of trade ID to settlement data
    mapping(bytes32 => Settlement) public settlements;

    // Events
    event TradeSettled(
        bytes32 indexed tradeId,
        address indexed buyer,
        address indexed seller,
        uint256 timestamp
    );
    event CREExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);
    event SettlementInitiated(bytes32 indexed tradeId);

    // Errors
    error Unauthorized();
    error InvalidAddress();
    error InvalidAmount();
    error SettlementAlreadyExecuted();
    error InsufficientEscrowBalance();
    error SettlementFailed();

    constructor(address _escrowVault) Ownable(msg.sender) {
        if (_escrowVault == address(0)) revert InvalidAddress();
        escrowVault = EscrowVault(_escrowVault);
    }

    /// @notice Set the authorized CRE executor address
    /// @param _creExecutor Address of the CRE executor
    function setCREExecutor(address _creExecutor) external onlyOwner {
        if (_creExecutor == address(0)) revert InvalidAddress();
        address oldExecutor = creExecutor;
        creExecutor = _creExecutor;
        emit CREExecutorUpdated(oldExecutor, _creExecutor);
    }

    /// @notice Settle an OTC trade by executing atomic swap
    /// @param tradeId Unique identifier for the trade
    /// @param buyer Address of the buyer
    /// @param seller Address of the seller
    /// @param buyerToken Token the buyer is providing
    /// @param sellerToken Token the seller is providing
    /// @param buyerAmount Amount the buyer is providing
    /// @param sellerAmount Amount the seller is providing
    function settle(
        bytes32 tradeId,
        address buyer,
        address seller,
        address buyerToken,
        address sellerToken,
        uint256 buyerAmount,
        uint256 sellerAmount
    ) external nonReentrant {
        // Only CRE executor can trigger settlement
        if (msg.sender != creExecutor) revert Unauthorized();

        // Validate inputs
        if (buyer == address(0) || seller == address(0)) revert InvalidAddress();
        if (buyerAmount == 0 || sellerAmount == 0) revert InvalidAmount();

        // Check if already executed
        if (settlements[tradeId].executed) revert SettlementAlreadyExecuted();

        // Generate escrow IDs (these should match what was deposited)
        bytes32 buyerEscrowId = keccak256(abi.encodePacked(tradeId, buyer));
        bytes32 sellerEscrowId = keccak256(abi.encodePacked(tradeId, seller));

        // Verify escrow balances
        uint256 buyerBalance = escrowVault.getBalance(buyerEscrowId);
        uint256 sellerBalance = escrowVault.getBalance(sellerEscrowId);

        if (buyerBalance < buyerAmount) revert InsufficientEscrowBalance();
        if (sellerBalance < sellerAmount) revert InsufficientEscrowBalance();

        // Store settlement data
        settlements[tradeId] = Settlement({
            buyer: buyer,
            seller: seller,
            buyerToken: buyerToken,
            sellerToken: sellerToken,
            buyerAmount: buyerAmount,
            sellerAmount: sellerAmount,
            timestamp: block.timestamp,
            executed: true
        });

        emit SettlementInitiated(tradeId);

        // Execute atomic swap
        // Buyer receives seller's tokens
        escrowVault.release(sellerEscrowId, buyer);
        
        // Seller receives buyer's tokens
        escrowVault.release(buyerEscrowId, seller);

        emit TradeSettled(tradeId, buyer, seller, block.timestamp);
    }

    /// @notice Get settlement details
    /// @param tradeId The trade identifier
    /// @return Settlement data structure
    function getSettlement(bytes32 tradeId) external view returns (Settlement memory) {
        return settlements[tradeId];
    }

    /// @notice Check if a trade has been settled
    /// @param tradeId The trade identifier
    /// @return True if the trade has been settled
    function isSettled(bytes32 tradeId) external view returns (bool) {
        return settlements[tradeId].executed;
    }

    /// @notice Generate escrow ID for a participant
    /// @param tradeId The trade identifier
    /// @param participant Address of the buyer or seller
    /// @return The escrow ID
    function generateEscrowId(bytes32 tradeId, address participant) 
        public 
        pure 
        returns (bytes32) 
    {
        return keccak256(abi.encodePacked(tradeId, participant));
    }
}
