const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProofVerifier", function () {
  let proofVerifier;
  let mockWorldID;
  let owner, user1, user2;

  const APP_ID = "app_test_123";
  const ACTION_ID = "verify-human";

  // Mock proof data
  const mockProof = [1, 2, 3, 4, 5, 6, 7, 8].map(n => BigInt(n));
  const mockRoot = ethers.toBigInt("12345678901234567890");
  const mockNullifierHash = ethers.toBigInt("98765432109876543210");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy MockWorldID
    const MockWorldID = await ethers.getContractFactory("contracts/test/MockWorldID.sol:MockWorldID");
    mockWorldID = await MockWorldID.deploy();
    await mockWorldID.waitForDeployment();

    // Deploy ProofVerifier
    const ProofVerifier = await ethers.getContractFactory("ProofVerifier");
    proofVerifier = await ProofVerifier.deploy(
      await mockWorldID.getAddress(),
      APP_ID,
      ACTION_ID
    );
    await proofVerifier.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await proofVerifier.owner()).to.equal(owner.address);
    });

    it("Should set the correct World ID contract", async function () {
      expect(await proofVerifier.worldId()).to.equal(
        await mockWorldID.getAddress()
      );
    });

    it("Should set the correct group ID", async function () {
      expect(await proofVerifier.GROUP_ID()).to.equal(1);
    });

    it("Should compute external nullifier", async function () {
      const externalNullifier = await proofVerifier.externalNullifier();
      expect(externalNullifier).to.be.gt(0);
    });

    it("Should revert with zero address World ID", async function () {
      const ProofVerifier = await ethers.getContractFactory("ProofVerifier");
      await expect(
        ProofVerifier.deploy(ethers.ZeroAddress, APP_ID, ACTION_ID)
      ).to.be.revertedWithCustomError(proofVerifier, "InvalidAddress");
    });
  });

  describe("Human Verification", function () {
    it("Should successfully verify a human", async function () {
      await expect(
        proofVerifier.verifyHuman(
          user1.address,
          mockRoot,
          mockNullifierHash,
          mockProof
        )
      )
        .to.emit(proofVerifier, "HumanVerified")
        .withArgs(user1.address, mockNullifierHash);

      // Check nullifier is marked as used
      expect(await proofVerifier.isNullifierUsed(mockNullifierHash)).to.equal(true);
    });

    it("Should prevent double verification with same nullifier", async function () {
      // First verification succeeds
      await proofVerifier.verifyHuman(
        user1.address,
        mockRoot,
        mockNullifierHash,
        mockProof
      );

      // Second verification with same nullifier should fail
      await expect(
        proofVerifier.verifyHuman(
          user2.address,
          mockRoot,
          mockNullifierHash,
          mockProof
        )
      ).to.be.revertedWithCustomError(proofVerifier, "DuplicateNullifier");
    });

    it("Should allow different nullifiers", async function () {
      const nullifier1 = mockNullifierHash;
      const nullifier2 = mockNullifierHash + 1n;

      await proofVerifier.verifyHuman(user1.address, mockRoot, nullifier1, mockProof);
      
      // Different nullifier should work
      await expect(
        proofVerifier.verifyHuman(user2.address, mockRoot, nullifier2, mockProof)
      )
        .to.emit(proofVerifier, "HumanVerified")
        .withArgs(user2.address, nullifier2);
    });

    it("Should fail verification if World ID rejects proof", async function () {
      // Configure mock to fail this proof
      await mockWorldID.setShouldFail(mockNullifierHash, true);

      await expect(
        proofVerifier.verifyHuman(
          user1.address,
          mockRoot,
          mockNullifierHash,
          mockProof
        )
      ).to.be.revertedWith("MockWorldID: proof verification failed");
    });
  });

  describe("View-only Verification", function () {
    it("Should return true for valid proof", async function () {
      const result = await proofVerifier.verifyHumanView(
        user1.address,
        mockRoot,
        mockNullifierHash,
        mockProof
      );
      expect(result).to.equal(true);
    });

    it("Should return false for used nullifier", async function () {
      // Use the nullifier first
      await proofVerifier.verifyHuman(
        user1.address,
        mockRoot,
        mockNullifierHash,
        mockProof
      );

      // View function should return false
      const result = await proofVerifier.verifyHumanView(
        user1.address,
        mockRoot,
        mockNullifierHash,
        mockProof
      );
      expect(result).to.equal(false);
    });

    it("Should return false for invalid proof", async function () {
      // Configure mock to fail
      await mockWorldID.setShouldFail(mockNullifierHash, true);

      const result = await proofVerifier.verifyHumanView(
        user1.address,
        mockRoot,
        mockNullifierHash,
        mockProof
      );
      expect(result).to.equal(false);
    });
  });

  describe("Settlement Proof Recording", function () {
    const tradeId = ethers.id("trade-proof-123");
    const proofHash = ethers.id("proof-hash-xyz");

    it("Should record settlement proof", async function () {
      await expect(
        proofVerifier.verifySettlement(tradeId, proofHash)
      )
        .to.emit(proofVerifier, "SettlementProofRecorded")
        .withArgs(tradeId, proofHash);

      expect(await proofVerifier.getSettlementProof(tradeId)).to.equal(proofHash);
    });

    it("Should prevent duplicate proof recording", async function () {
      await proofVerifier.verifySettlement(tradeId, proofHash);

      await expect(
        proofVerifier.verifySettlement(tradeId, proofHash)
      ).to.be.revertedWithCustomError(proofVerifier, "ProofAlreadyRecorded");
    });

    it("Should check if settlement proof exists", async function () {
      expect(await proofVerifier.hasSettlementProof(tradeId)).to.equal(false);

      await proofVerifier.verifySettlement(tradeId, proofHash);

      expect(await proofVerifier.hasSettlementProof(tradeId)).to.equal(true);
    });

    it("Should allow different trade IDs", async function () {
      const tradeId1 = ethers.id("trade-1");
      const tradeId2 = ethers.id("trade-2");
      const proof1 = ethers.id("proof-1");
      const proof2 = ethers.id("proof-2");

      await proofVerifier.verifySettlement(tradeId1, proof1);
      await proofVerifier.verifySettlement(tradeId2, proof2);

      expect(await proofVerifier.getSettlementProof(tradeId1)).to.equal(proof1);
      expect(await proofVerifier.getSettlementProof(tradeId2)).to.equal(proof2);
    });
  });

  describe("Nullifier Management", function () {
    it("Should correctly track nullifier usage", async function () {
      const nullifier = mockNullifierHash;

      expect(await proofVerifier.isNullifierUsed(nullifier)).to.equal(false);

      await proofVerifier.verifyHuman(user1.address, mockRoot, nullifier, mockProof);

      expect(await proofVerifier.isNullifierUsed(nullifier)).to.equal(true);
    });

    it("Should handle multiple nullifiers independently", async function () {
      const nullifier1 = mockNullifierHash;
      const nullifier2 = mockNullifierHash + 1n;
      const nullifier3 = mockNullifierHash + 2n;

      await proofVerifier.verifyHuman(user1.address, mockRoot, nullifier1, mockProof);
      
      expect(await proofVerifier.isNullifierUsed(nullifier1)).to.equal(true);
      expect(await proofVerifier.isNullifierUsed(nullifier2)).to.equal(false);
      expect(await proofVerifier.isNullifierUsed(nullifier3)).to.equal(false);

      await proofVerifier.verifyHuman(user2.address, mockRoot, nullifier2, mockProof);

      expect(await proofVerifier.isNullifierUsed(nullifier2)).to.equal(true);
      expect(await proofVerifier.isNullifierUsed(nullifier3)).to.equal(false);
    });
  });
});
