// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IWorldID.sol";
import "./helpers/ByteHasher.sol";

/// @title ProofVerifier
/// @notice Verifies World ID proofs and settlement execution proofs
/// @dev Prevents nullifier reuse for sybil resistance
contract ProofVerifier is Ownable {
    using ByteHasher for bytes;

    /// @notice The World ID router contract
    IWorldID public immutable worldId;

    /// @notice The World ID group ID (always 1 for Orb)
    uint256 public constant GROUP_ID = 1;

    /// @notice The external nullifier hash derived from app ID and action
    uint256 public immutable externalNullifier;

    /// @notice Mapping to track used nullifiers (prevents double verification)
    mapping(uint256 => bool) public nullifierUsed;

    /// @notice Mapping to store settlement proofs
    mapping(bytes32 => bytes32) public settlementProofs;

    // Events
    event HumanVerified(address indexed user, uint256 nullifierHash);
    event DuplicateNullifierDetected(uint256 nullifierHash);
    event SettlementProofRecorded(bytes32 indexed tradeId, bytes32 proofHash);

    // Errors
    error DuplicateNullifier(uint256 nullifierHash);
    error InvalidProof();
    error InvalidAddress();
    error ProofAlreadyRecorded();

    /// @param _worldId The World ID router address
    /// @param _appId The World ID app ID
    /// @param _actionId The World ID action ID
    constructor(
        IWorldID _worldId,
        string memory _appId,
        string memory _actionId
    ) Ownable(msg.sender) {
        if (address(_worldId) == address(0)) revert InvalidAddress();
        worldId = _worldId;
        
        // Compute external nullifier from app ID and action ID
        externalNullifier = abi
            .encodePacked(abi.encodePacked(_appId).hashToField(), _actionId)
            .hashToField();
    }

    /// @notice Verify a World ID proof for human verification
    /// @param signal The signal (usually user's wallet address)
    /// @param root The Merkle tree root
    /// @param nullifierHash The nullifier hash preventing double signaling
    /// @param proof The zero-knowledge proof
    function verifyHuman(
        address signal,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        // Check if nullifier has been used
        if (nullifierUsed[nullifierHash]) {
            emit DuplicateNullifierDetected(nullifierHash);
            revert DuplicateNullifier(nullifierHash);
        }

        // Verify the World ID proof
        worldId.verifyProof(
            root,
            GROUP_ID,
            abi.encodePacked(signal).hashToField(),
            nullifierHash,
            externalNullifier,
            proof
        );

        // Record nullifier to prevent reuse
        nullifierUsed[nullifierHash] = true;

        emit HumanVerified(signal, nullifierHash);
    }

    /// @notice Verify a World ID proof and return verification status
    /// @param signal The signal (usually user's wallet address)
    /// @param root The Merkle tree root
    /// @param nullifierHash The nullifier hash
    /// @param proof The zero-knowledge proof
    /// @return verified True if verification succeeded
    function verifyHumanView(
        address signal,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external view returns (bool verified) {
        // Check if nullifier has been used
        if (nullifierUsed[nullifierHash]) {
            return false;
        }

        // Try to verify the proof (view function)
        try worldId.verifyProof(
            root,
            GROUP_ID,
            abi.encodePacked(signal).hashToField(),
            nullifierHash,
            externalNullifier,
            proof
        ) {
            return true;
        } catch {
            return false;
        }
    }

    /// @notice Record a settlement proof on-chain
    /// @param tradeId The trade identifier
    /// @param proofHash The hash of the settlement execution proof
    function verifySettlement(bytes32 tradeId, bytes32 proofHash) external {
        if (settlementProofs[tradeId] != bytes32(0)) revert ProofAlreadyRecorded();
        
        settlementProofs[tradeId] = proofHash;
        emit SettlementProofRecorded(tradeId, proofHash);
    }

    /// @notice Check if a nullifier has been used
    /// @param nullifierHash The nullifier hash to check
    /// @return True if the nullifier has been used
    function isNullifierUsed(uint256 nullifierHash) external view returns (bool) {
        return nullifierUsed[nullifierHash];
    }

    /// @notice Get settlement proof for a trade
    /// @param tradeId The trade identifier
    /// @return The proof hash
    function getSettlementProof(bytes32 tradeId) external view returns (bytes32) {
        return settlementProofs[tradeId];
    }

    /// @notice Check if a trade has a recorded settlement proof
    /// @param tradeId The trade identifier
    /// @return True if a proof exists
    function hasSettlementProof(bytes32 tradeId) external view returns (bool) {
        return settlementProofs[tradeId] != bytes32(0);
    }
}
