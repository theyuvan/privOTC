// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title EscrowVault
/// @notice Holds buyer/seller funds during the OTC trade matching window
/// @dev Funds are locked until trade is settled or refunded
contract EscrowVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Trade escrow data structure
    struct Escrow {
        address depositor;
        address token;
        uint256 amount;
        uint256 depositTime;
        uint256 expiryTime;
        bool released;
    }

    /// @notice Mapping of trade ID to escrow data
    mapping(bytes32 => Escrow) public escrows;

    /// @notice Authorized settlement contract that can release funds
    address public settlementContract;

    /// @notice Default escrow timeout (24 hours)
    uint256 public constant DEFAULT_TIMEOUT = 24 hours;

    // Events
    event Deposited(
        bytes32 indexed tradeId,
        address indexed depositor,
        address token,
        uint256 amount,
        uint256 expiryTime
    );
    event Released(bytes32 indexed tradeId, address indexed recipient, uint256 amount);
    event Refunded(bytes32 indexed tradeId, address indexed depositor, uint256 amount);
    event SettlementContractUpdated(address indexed oldContract, address indexed newContract);

    // Errors
    error InvalidAmount();
    error InvalidToken();
    error EscrowAlreadyExists();
    error EscrowNotFound();
    error EscrowAlreadyReleased();
    error EscrowNotExpired();
    error Unauthorized();
    error InsufficientBalance();

    constructor() Ownable(msg.sender) {}

    /// @notice Set the authorized settlement contract
    /// @param _settlementContract Address of the settlement contract
    function setSettlementContract(address _settlementContract) external onlyOwner {
        address oldContract = settlementContract;
        settlementContract = _settlementContract;
        emit SettlementContractUpdated(oldContract, _settlementContract);
    }

    /// @notice Deposit funds into escrow for a trade
    /// @param tradeId Unique identifier for the trade
    /// @param token Address of the token to escrow (0x0 for ETH)
    /// @param amount Amount to escrow
    /// @param expiryTime When the escrow expires (0 for default timeout)
    function deposit(
        bytes32 tradeId,
        address token,
        uint256 amount,
        uint256 expiryTime
    ) external payable nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (escrows[tradeId].amount != 0) revert EscrowAlreadyExists();

        // Set expiry time
        uint256 expiry = expiryTime == 0 
            ? block.timestamp + DEFAULT_TIMEOUT 
            : expiryTime;

        // Handle ETH deposit
        if (token == address(0)) {
            if (msg.value != amount) revert InvalidAmount();
        } else {
            // Handle ERC20 deposit
            if (token == address(0)) revert InvalidToken();
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        // Store escrow data
        escrows[tradeId] = Escrow({
            depositor: msg.sender,
            token: token,
            amount: amount,
            depositTime: block.timestamp,
            expiryTime: expiry,
            released: false
        });

        emit Deposited(tradeId, msg.sender, token, amount, expiry);
    }

    /// @notice Release escrowed funds to a recipient (only callable by settlement contract)
    /// @param tradeId The trade identifier
    /// @param recipient Address to receive the funds
    function release(bytes32 tradeId, address recipient) external nonReentrant {
        if (msg.sender != settlementContract) revert Unauthorized();
        
        Escrow storage escrow = escrows[tradeId];
        if (escrow.amount == 0) revert EscrowNotFound();
        if (escrow.released) revert EscrowAlreadyReleased();

        // Mark as released
        escrow.released = true;

        // Transfer funds
        if (escrow.token == address(0)) {
            // Transfer ETH
            (bool success, ) = recipient.call{value: escrow.amount}("");
            require(success, "ETH transfer failed");
        } else {
            // Transfer ERC20
            IERC20(escrow.token).safeTransfer(recipient, escrow.amount);
        }

        emit Released(tradeId, recipient, escrow.amount);
    }

    /// @notice Refund escrowed funds back to the depositor (after expiry)
    /// @param tradeId The trade identifier
    function refund(bytes32 tradeId) external nonReentrant {
        Escrow storage escrow = escrows[tradeId];
        if (escrow.amount == 0) revert EscrowNotFound();
        if (escrow.released) revert EscrowAlreadyReleased();
        if (block.timestamp < escrow.expiryTime) revert EscrowNotExpired();

        address depositor = escrow.depositor;
        uint256 amount = escrow.amount;
        address token = escrow.token;

        // Mark as released to prevent re-entrancy
        escrow.released = true;

        // Transfer funds back
        if (token == address(0)) {
            // Refund ETH
            (bool success, ) = depositor.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // Refund ERC20
            IERC20(token).safeTransfer(depositor, amount);
        }

        emit Refunded(tradeId, depositor, amount);
    }

    /// @notice Get the balance locked in escrow for a trade
    /// @param tradeId The trade identifier
    /// @return amount The amount locked in escrow
    function getBalance(bytes32 tradeId) external view returns (uint256) {
        Escrow memory escrow = escrows[tradeId];
        if (escrow.released) {
            return 0;
        }
        return escrow.amount;
    }

    /// @notice Get full escrow details
    /// @param tradeId The trade identifier
    /// @return Escrow data structure
    function getEscrowDetails(bytes32 tradeId) external view returns (Escrow memory) {
        return escrows[tradeId];
    }

    /// @notice Check if escrow exists and is active
    /// @param tradeId The trade identifier
    /// @return True if escrow exists and hasn't been released
    function isActive(bytes32 tradeId) external view returns (bool) {
        Escrow memory escrow = escrows[tradeId];
        return escrow.amount > 0 && !escrow.released;
    }
}
