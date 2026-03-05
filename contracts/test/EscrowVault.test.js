const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("EscrowVault", function () {
  let escrowVault;
  let settlementContract;
  let owner, depositor, recipient, other;
  let mockERC20;

  const DEFAULT_TIMEOUT = 24 * 60 * 60; // 24 hours in seconds

  beforeEach(async function () {
    [owner, depositor, recipient, other, settlementContract] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("contracts/test/MockERC20.sol:MockERC20");
    mockERC20 = await MockERC20.deploy("Test Token", "TEST");
    await mockERC20.waitForDeployment();

    // Mint tokens to depositor
    await mockERC20.mint(depositor.address, ethers.parseEther("1000"));

    // Deploy EscrowVault
    const EscrowVault = await ethers.getContractFactory("EscrowVault");
    escrowVault = await EscrowVault.deploy();
    await escrowVault.waitForDeployment();

    // Set settlement contract
    await escrowVault.setSettlementContract(settlementContract.address);
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await escrowVault.owner()).to.equal(owner.address);
    });

    it("Should have correct default timeout", async function () {
      expect(await escrowVault.DEFAULT_TIMEOUT()).to.equal(DEFAULT_TIMEOUT);
    });
  });

  describe("Settlement Contract Management", function () {
    it("Should allow owner to set settlement contract", async function () {
      await expect(escrowVault.setSettlementContract(other.address))
        .to.emit(escrowVault, "SettlementContractUpdated")
        .withArgs(settlementContract.address, other.address);

      expect(await escrowVault.settlementContract()).to.equal(other.address);
    });

    it("Should not allow non-owner to set settlement contract", async function () {
      await expect(
        escrowVault.connect(depositor).setSettlementContract(other.address)
      ).to.be.revertedWithCustomError(escrowVault, "OwnableUnauthorizedAccount");
    });
  });

  describe("ETH Deposits", function () {
    const tradeId = ethers.id("trade-1");
    const depositAmount = ethers.parseEther("1");

    it("Should accept ETH deposits", async function () {
      const tx = await escrowVault.connect(depositor).deposit(
        tradeId,
        ethers.ZeroAddress, // ETH
        depositAmount,
        0, // use default timeout
        { value: depositAmount }
      );

      await expect(tx).to.emit(escrowVault, "Deposited");

      // Verify escrow was created
      const escrowDetails = await escrowVault.getEscrowDetails(tradeId);
      expect(escrowDetails.depositor).to.equal(depositor.address);
      expect(escrowDetails.amount).to.equal(depositAmount);
    });

    it("Should revert if ETH amount doesn't match msg.value", async function () {
      await expect(
        escrowVault.connect(depositor).deposit(
          tradeId,
          ethers.ZeroAddress,
          depositAmount,
          0,
          { value: ethers.parseEther("0.5") }
        )
      ).to.be.revertedWithCustomError(escrowVault, "InvalidAmount");
    });

    it("Should store correct escrow data", async function () {
      const expiryTime = (await time.latest()) + DEFAULT_TIMEOUT;
      
      await escrowVault.connect(depositor).deposit(
        tradeId,
        ethers.ZeroAddress,
        depositAmount,
        0,
        { value: depositAmount }
      );

      const escrowDetails = await escrowVault.getEscrowDetails(tradeId);
      expect(escrowDetails.depositor).to.equal(depositor.address);
      expect(escrowDetails.token).to.equal(ethers.ZeroAddress);
      expect(escrowDetails.amount).to.equal(depositAmount);
      expect(escrowDetails.released).to.equal(false);
    });
  });

  describe("ERC20 Deposits", function () {
    const tradeId = ethers.id("trade-2");
    const depositAmount = ethers.parseEther("100");

    beforeEach(async function () {
      // Approve escrow vault to spend tokens
      await mockERC20.connect(depositor).approve(
        await escrowVault.getAddress(),
        depositAmount
      );
    });

    it("Should accept ERC20 deposits", async function () {
      await expect(
        escrowVault.connect(depositor).deposit(
          tradeId,
          await mockERC20.getAddress(),
          depositAmount,
          0
        )
      ).to.emit(escrowVault, "Deposited");

      expect(await mockERC20.balanceOf(await escrowVault.getAddress())).to.equal(
        depositAmount
      );
    });

    it("Should revert on duplicate deposits", async function () {
      await escrowVault.connect(depositor).deposit(
        tradeId,
        await mockERC20.getAddress(),
        depositAmount,
        0
      );

      await expect(
        escrowVault.connect(depositor).deposit(
          tradeId,
          await mockERC20.getAddress(),
          depositAmount,
          0
        )
      ).to.be.revertedWithCustomError(escrowVault, "EscrowAlreadyExists");
    });

    it("Should revert if amount is zero", async function () {
      await expect(
        escrowVault.connect(depositor).deposit(
          tradeId,
          await mockERC20.getAddress(),
          0,
          0
        )
      ).to.be.revertedWithCustomError(escrowVault, "InvalidAmount");
    });
  });

  describe("Release", function () {
    const tradeId = ethers.id("trade-3");
    const depositAmount = ethers.parseEther("1");

    beforeEach(async function () {
      // Deposit ETH
      await escrowVault.connect(depositor).deposit(
        tradeId,
        ethers.ZeroAddress,
        depositAmount,
        0,
        { value: depositAmount }
      );
    });

    it("Should allow settlement contract to release funds", async function () {
      const beforeBalance = await ethers.provider.getBalance(recipient.address);

      await expect(
        escrowVault.connect(settlementContract).release(tradeId, recipient.address)
      )
        .to.emit(escrowVault, "Released")
        .withArgs(tradeId, recipient.address, depositAmount);

      const afterBalance = await ethers.provider.getBalance(recipient.address);
      expect(afterBalance - beforeBalance).to.equal(depositAmount);
    });

    it("Should not allow non-settlement contract to release", async function () {
      await expect(
        escrowVault.connect(other).release(tradeId, recipient.address)
      ).to.be.revertedWithCustomError(escrowVault, "Unauthorized");
    });

    it("Should prevent double release", async function () {
      await escrowVault.connect(settlementContract).release(tradeId, recipient.address);

      await expect(
        escrowVault.connect(settlementContract).release(tradeId, recipient.address)
      ).to.be.revertedWithCustomError(escrowVault, "EscrowAlreadyReleased");
    });

    it("Should revert if escrow doesn't exist", async function () {
      const nonExistentTradeId = ethers.id("non-existent");
      await expect(
        escrowVault.connect(settlementContract).release(nonExistentTradeId, recipient.address)
      ).to.be.revertedWithCustomError(escrowVault, "EscrowNotFound");
    });
  });

  describe("Refund", function () {
    const tradeId = ethers.id("trade-4");
    const depositAmount = ethers.parseEther("1");

    beforeEach(async function () {
      await escrowVault.connect(depositor).deposit(
        tradeId,
        ethers.ZeroAddress,
        depositAmount,
        0,
        { value: depositAmount }
      );
    });

    it("Should allow refund after expiry", async function () {
      // Advance time past expiry
      await time.increase(DEFAULT_TIMEOUT + 1);

      const beforeBalance = await ethers.provider.getBalance(depositor.address);

      const tx = await escrowVault.connect(depositor).refund(tradeId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const afterBalance = await ethers.provider.getBalance(depositor.address);
      expect(afterBalance - beforeBalance + gasUsed).to.equal(depositAmount);
    });

    it("Should not allow refund before expiry", async function () {
      await expect(
        escrowVault.connect(depositor).refund(tradeId)
      ).to.be.revertedWithCustomError(escrowVault, "EscrowNotExpired");
    });

    it("Should emit Refunded event", async function () {
      await time.increase(DEFAULT_TIMEOUT + 1);

      await expect(escrowVault.connect(depositor).refund(tradeId))
        .to.emit(escrowVault, "Refunded")
        .withArgs(tradeId, depositor.address, depositAmount);
    });
  });

  describe("View Functions", function () {
    const tradeId = ethers.id("trade-5");
    const depositAmount = ethers.parseEther("1");

    beforeEach(async function () {
      await escrowVault.connect(depositor).deposit(
        tradeId,
        ethers.ZeroAddress,
        depositAmount,
        0,
        { value: depositAmount }
      );
    });

    it("Should return correct balance", async function () {
      expect(await escrowVault.getBalance(tradeId)).to.equal(depositAmount);
    });

    it("Should return zero balance after release", async function () {
      await escrowVault.connect(settlementContract).release(tradeId, recipient.address);
      expect(await escrowVault.getBalance(tradeId)).to.equal(0);
    });

    it("Should correctly report active status", async function () {
      expect(await escrowVault.isActive(tradeId)).to.equal(true);
      
      await escrowVault.connect(settlementContract).release(tradeId, recipient.address);
      expect(await escrowVault.isActive(tradeId)).to.equal(false);
    });
  });
});
