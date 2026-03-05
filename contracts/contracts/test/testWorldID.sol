// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockWorldID
/// @notice Mock World ID router for testing
contract MockWorldID {
    /// @notice Mapping to control which proofs should fail
    mapping(uint256 => bool) public shouldFail;

    /// @notice Set whether a proof should fail
    function setShouldFail(uint256 nullifierHash, bool _shouldFail) external {
        shouldFail[nullifierHash] = _shouldFail;
    }

    /// @notice Mock verify proof function
    function verifyProof(
        uint256 /* root */,
        uint256 /* groupId */,
        uint256 /* signalHash */,
        uint256 nullifierHash,
        uint256 /* externalNullifierHash */,
        uint256[8] calldata /* proof */
    ) external view {
        require(!shouldFail[nullifierHash], "MockWorldID: proof verification failed");
    }
}
