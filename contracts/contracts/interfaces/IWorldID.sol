// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IWorldID
/// @notice Interface for World ID verification (v3.0)
/// @dev Used for verifying World ID proofs on-chain
interface IWorldID {
    /// @notice Verify a World ID proof
    /// @param root The root of the Merkle tree
    /// @param groupId The group ID (always 1 for Orb)
    /// @param signalHash The keccak256 hash of the signal
    /// @param nullifierHash The nullifier hash for this proof
    /// @param externalNullifierHash The keccak256 hash of the external nullifier
    /// @param proof The zero-knowledge proof
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view;
}
