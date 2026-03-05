const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OTCSettlement", function () {
  let escrowVault;
  let otcSettlement;
  let mockERC20;
  let owner, creExecutor, buyer, seller, other;

  const BUYER_AMOUNT = ethers.parseEther("100"); // 100 USDC
  const SELLER_AMOUNT = ethers.parseEther("1"); // 1 ETH

  beforeEach(async function () {
    [owner, creExecutor, buyer, seller, other] = await ethers.getSigners();

    // Deploy mock ERC20 (representing USDC)
    const MockERC20 = await ethers.getContractFactory("contracts/test/MockERC20.sol:MockERC20");
    mockERC20 = await MockERC20.deploy("USD Coin", "USDC");
    await mockERC20.waitForDeployment();

    // Mint tokens
    await mockERC20.mint(buyer.address, BUYER_AMOUNT * 10n);

    // Deploy EscrowVault
    const EscrowVault = await ethers.getContractFactory("EscrowVault");
    escrowVault = await EscrowVault.deploy();
    await escrowVault.waitForDeployment();

    // Deploy OTCSettlement
    const OTCSettlement = await ethers.getContractFactory("OTCSettlement");
    otcSettlement = await OTCSettlement.deploy(await escrowVault.getAddress());
    await otcSettlement.waitForDeployment();

    // Set settlement contract in escrow vault
    await escrowVault.setSettlementContract(await otcSettlement.getAddress());

    // Set CRE executor
    await otcSettlement.setCREExecutor(creExecutor.address);
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await otcSettlement.owner()).to.equal(owner.address);
    });

    it("Should set the correct escrow vault", async function () {
      expect(await otcSettlement.escrowVault()).to.equal(
        await escrowVault.getAddress()
      );
    });

    it("Should revert with zero address escrow vault", async function () {
      const OTCSettlement = await ethers.getContractFactory("OTCSettlement");
      await expect(
        OTCSettlement.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(otcSettlement, "InvalidAddress");
    });
  });

  describe("CRE Executor Management", function () {
    it("Should allow owner to set CRE executor", async function () {
      await expect(otcSettlement.setCREExecutor(other.address))
        .to.emit(otcSettlement, "CREExecutorUpdated")
        .withArgs(creExecutor.address, other.address);

      expect(await otcSettlement.creExecutor()).to.equal(other.address);
    });

    it("Should not allow non-owner to set CRE executor", async function () {
      await expect(
        otcSettlement.connect(buyer).setCREExecutor(other.address)
      ).to.be.revertedWithCustomError(otcSettlement, "OwnableUnauthorizedAccount");
    });

    it("Should revert when setting zero address", async function () {
      await expect(
        otcSettlement.setCREExecutor(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(otcSettlement, "InvalidAddress");
    });
  });

  describe("Settlement", function () {
    const tradeId = ethers.id("trade-123");
    let buyerEscrowId, sellerEscrowId;

    beforeEach(async function () {
      // Generate escrow IDs
      buyerEscrowId = await otcSettlement.generateEscrowId(tradeId, buyer.address);
      sellerEscrowId = await otcSettlement.generateEscrowId(tradeId, seller.address);

      // Buyer deposits USDC
      await mockERC20.connect(buyer).approve(
        await escrowVault.getAddress(),
        BUYER_AMOUNT
      );
      await escrowVault.connect(buyer).deposit(
        buyerEscrowId,
        await mockERC20.getAddress(),
        BUYER_AMOUNT,
        0
      );

      // Seller deposits ETH
      await escrowVault.connect(seller).deposit(
        sellerEscrowId,
        ethers.ZeroAddress,
        SELLER_AMOUNT,
        0,
        { value: SELLER_AMOUNT }
      );
    });

    it("Should successfully settle a trade", async function () {
      await expect(
        otcSettlement.connect(creExecutor).settle(
          tradeId,
          buyer.address,
          seller.address,
          await mockERC20.getAddress(), // buyer token (USDC)
          ethers.ZeroAddress, // seller token (ETH)
          BUYER_AMOUNT,
          SELLER_AMOUNT
        )
      )
        .to.emit(otcSettlement, "SettlementInitiated")
        .withArgs(tradeId)
        .and.to.emit(otcSettlement, "TradeSettled");

      // Verify settlement was recorded
      const settlement = await otcSettlement.getSettlement(tradeId);
      expect(settlement.executed).to.equal(true);
      expect(settlement.buyer).to.equal(buyer.address);
      expect(settlement.seller).to.equal(seller.address);
    });

    it("Should transfer funds correctly", async function () {
      const buyerEthBefore = await ethers.provider.getBalance(buyer.address);
      const sellerUsdcBefore = await mockERC20.balanceOf(seller.address);

      await otcSettlement.connect(creExecutor).settle(
        tradeId,
        buyer.address,
        seller.address,
        await mockERC20.getAddress(),
        ethers.ZeroAddress,
        BUYER_AMOUNT,
        SELLER_AMOUNT
      );

      // Buyer should receive ETH
      const buyerEthAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerEthAfter - buyerEthBefore).to.equal(SELLER_AMOUNT);

      // Seller should receive USDC
      const sellerUsdcAfter = await mockERC20.balanceOf(seller.address);
      expect(sellerUsdcAfter - sellerUsdcBefore).to.equal(BUYER_AMOUNT);
    });

    it("Should revert if not called by CRE executor", async function () {
      await expect(
        otcSettlement.connect(other).settle(
          tradeId,
          buyer.address,
          seller.address,
          await mockERC20.getAddress(),
          ethers.ZeroAddress,
          BUYER_AMOUNT,
          SELLER_AMOUNT
        )
      ).to.be.revertedWithCustomError(otcSettlement, "Unauthorized");
    });

    it("Should revert with invalid addresses", async function () {
      await expect(
        otcSettlement.connect(creExecutor).settle(
          tradeId,
          ethers.ZeroAddress,
          seller.address,
          await mockERC20.getAddress(),
          ethers.ZeroAddress,
          BUYER_AMOUNT,
          SELLER_AMOUNT
        )
      ).to.be.revertedWithCustomError(otcSettlement, "InvalidAddress");
    });

    it("Should revert with zero amounts", async function () {
      await expect(
        otcSettlement.connect(creExecutor).settle(
          tradeId,
          buyer.address,
          seller.address,
          await mockERC20.getAddress(),
          ethers.ZeroAddress,
          0,
          SELLER_AMOUNT
        )
      ).to.be.revertedWithCustomError(otcSettlement, "InvalidAmount");
    });

    it("Should prevent double settlement", async function () {
      await otcSettlement.connect(creExecutor).settle(
        tradeId,
        buyer.address,
        seller.address,
        await mockERC20.getAddress(),
        ethers.ZeroAddress,
        BUYER_AMOUNT,
        SELLER_AMOUNT
      );

      await expect(
        otcSettlement.connect(creExecutor).settle(
          tradeId,
          buyer.address,
          seller.address,
          await mockERC20.getAddress(),
          ethers.ZeroAddress,
          BUYER_AMOUNT,
          SELLER_AMOUNT
        )
      ).to.be.revertedWithCustomError(otcSettlement, "SettlementAlreadyExecuted");
    });

    it("Should revert with insufficient escrow balance", async function () {
      const newTradeId = ethers.id("trade-insufficient");
      await expect(
        otcSettlement.connect(creExecutor).settle(
          newTradeId,
          buyer.address,
          seller.address,
          await mockERC20.getAddress(),
          ethers.ZeroAddress,
          BUYER_AMOUNT,
          SELLER_AMOUNT
        )
      ).to.be.revertedWithCustomError(otcSettlement, "InsufficientEscrowBalance");
    });
  });

  describe("View Functions", function () {
    const tradeId = ethers.id("trade-view");

    it("Should return settlement details", async function () {
      const settlement = await otcSettlement.getSettlement(tradeId);
      expect(settlement.executed).to.equal(false);
    });

    it("Should check if trade is settled", async function () {
      expect(await otcSettlement.isSettled(tradeId)).to.equal(false);
    });

    it("Should generate correct escrow ID", async function () {
      const escrowId = await otcSettlement.generateEscrowId(tradeId, buyer.address);
      const expectedId = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "address"], [tradeId, buyer.address])
      );
      expect(escrowId).to.equal(expectedId);
    });
  });
});
