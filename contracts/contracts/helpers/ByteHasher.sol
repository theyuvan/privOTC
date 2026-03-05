// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ByteHasher
/// @notice Library for hashing bytes to field elements
/// @dev Used for World ID signal hashing
library ByteHasher {
    /// @notice Hash bytes to a field element
    /// @param value The bytes to hash
    /// @return The hashed value as a uint256
    function hashToField(bytes memory value) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(value))) >> 8;
    }
}
