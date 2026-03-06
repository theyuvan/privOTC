// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockWLD
 * @notice Mock World Token for testing - anyone can mint
 */
contract MockWLD is ERC20, Ownable {
    constructor() ERC20("Mock World Token", "WLD") Ownable(msg.sender) {
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000 * 10**18); // 1 million WLD
    }

    /**
     * @notice Public mint function for testing (no restrictions)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Faucet - anyone can request 1000 WLD
     */
    function faucet() external {
        _mint(msg.sender, 1000 * 10**18);
    }
}
