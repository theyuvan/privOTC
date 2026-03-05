const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Configuration
const CONFIG = {
  // World ID Router addresses
  WORLD_ID_ROUTER_ETHEREUM: "0x469449f251692e0779667583026b5a1e99512157", // Ethereum mainnet
  WORLD_ID_ROUTER_WORLD_CHAIN: "0x57f928158C3EE7CDad1e4D8642503c4D0201f611", // World Chain mainnet (updated)
  
  // App configuration
  APP_ID: process.env.WORLD_APP_ID || "app_staging_123",
  ACTION_ID: process.env.WORLD_ID_ACTION || "verify-otc-trader",
};

async function main() {
  console.log("🚀 Starting PrivOTC contract deployment...\n");

  // Get network
  const network = hre.network.name;
  console.log(`📡 Deploying to network: ${network}`);

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 Deployer address: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer balance: ${hre.ethers.formatEther(balance)} ETH\n`);

  // Select World ID Router based on network
  let worldIdRouter;
  if (network === "tenderly-ethereum") {
    worldIdRouter = CONFIG.WORLD_ID_ROUTER_ETHEREUM;
    console.log(`🌍 Using Ethereum World ID Router: ${worldIdRouter}`);
  } else if (network === "tenderly-world-chain") {
    worldIdRouter = CONFIG.WORLD_ID_ROUTER_WORLD_CHAIN;
    console.log(`🌍 Using World Chain World ID Router: ${worldIdRouter}`);
  } else {
    // For local testing, deploy mock
    console.log("🧪 Deploying Mock World ID for local testing...");
    const MockWorldID = await hre.ethers.getContractFactory("contracts/test/MockWorldID.sol:MockWorldID");
    const mockWorldId = await MockWorldID.deploy();
    await mockWorldId.waitForDeployment();
    worldIdRouter = await mockWorldId.getAddress();
    console.log(`✅ MockWorldID deployed to: ${worldIdRouter}`);
  }

  console.log("\n📝 Deployment Configuration:");
  console.log(`   App ID: ${CONFIG.APP_ID}`);
  console.log(`   Action ID: ${CONFIG.ACTION_ID}`);
  console.log(`   World ID Router: ${worldIdRouter}\n`);

  // Deploy contracts
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("1️⃣  Deploying EscrowVault...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  const EscrowVault = await hre.ethers.getContractFactory("EscrowVault");
  const escrowVault = await EscrowVault.deploy();
  await escrowVault.waitForDeployment();
  const escrowVaultAddress = await escrowVault.getAddress();
  
  console.log(`✅ EscrowVault deployed to: ${escrowVaultAddress}\n`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("2️⃣  Deploying OTCSettlement...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  const OTCSettlement = await hre.ethers.getContractFactory("OTCSettlement");
  const otcSettlement = await OTCSettlement.deploy(escrowVaultAddress);
  await otcSettlement.waitForDeployment();
  const otcSettlementAddress = await otcSettlement.getAddress();
  
  console.log(`✅ OTCSettlement deployed to: ${otcSettlementAddress}\n`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("3️⃣  Deploying BalanceVerifier (Groth16 ZK verifier)...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const BalanceVerifier = await hre.ethers.getContractFactory("Groth16Verifier");
  const balanceVerifier = await BalanceVerifier.deploy();
  await balanceVerifier.waitForDeployment();
  const balanceVerifierAddress = await balanceVerifier.getAddress();

  console.log(`✅ BalanceVerifier (Groth16) deployed to: ${balanceVerifierAddress}\n`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("4️⃣  Deploying ProofVerifier (World ID)...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  const ProofVerifier = await hre.ethers.getContractFactory("ProofVerifier");
  const proofVerifier = await ProofVerifier.deploy(
    worldIdRouter,
    CONFIG.APP_ID,
    CONFIG.ACTION_ID
  );
  await proofVerifier.waitForDeployment();
  const proofVerifierAddress = await proofVerifier.getAddress();
  
  console.log(`✅ ProofVerifier deployed to: ${proofVerifierAddress}\n`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("5️⃣  Configuring contracts...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Set settlement contract in escrow vault
  console.log("🔧 Setting settlement contract in EscrowVault...");
  const tx1 = await escrowVault.setSettlementContract(otcSettlementAddress);
  await tx1.wait();
  console.log("✅ Settlement contract configured");

  // Set CRE executor (for now, use deployer - should be updated later)
  console.log("🔧 Setting CRE executor in OTCSettlement...");
  const tx2 = await otcSettlement.setCREExecutor(deployer.address);
  await tx2.wait();
  console.log("✅ CRE executor configured (temporary: deployer address)");
  console.log("⚠️  Remember to update CRE executor to actual CRE service address!\n");

  // Wire BalanceVerifier into OTCSettlement — ZK proof now enforced on-chain
  console.log("🔧 Wiring BalanceVerifier into OTCSettlement...");
  const tx3 = await otcSettlement.setBalanceVerifier(balanceVerifierAddress);
  await tx3.wait();
  console.log("✅ ZK balance verifier configured — settlement now requires on-chain Groth16 proof\n");

  // Save deployment info
  const deploymentInfo = {
    network: network,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      EscrowVault: escrowVaultAddress,
      OTCSettlement: otcSettlementAddress,
      BalanceVerifier: balanceVerifierAddress,
      ProofVerifier: proofVerifierAddress,
    },
    configuration: {
      worldIdRouter: worldIdRouter,
      appId: CONFIG.APP_ID,
      actionId: CONFIG.ACTION_ID,
      creExecutor: deployer.address,
    },
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to file
  const filename = `${network}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));

  // Also save as latest
  const latestPath = path.join(deploymentsDir, `${network}-latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✨ Deployment Complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📋 Deployment Summary:");
  console.log(`   Network: ${network}`);
  console.log(`   EscrowVault: ${escrowVaultAddress}`);
  console.log(`   OTCSettlement: ${otcSettlementAddress}`);
  console.log(`   ProofVerifier: ${proofVerifierAddress}`);
  console.log(`\n💾 Deployment info saved to: ${filename}\n`);

  console.log("🔗 Next Steps:");
  console.log("   1. Verify contracts on Tenderly Explorer");
  console.log("   2. Update CRE executor address in OTCSettlement");
  console.log("   3. Share contract addresses with team (Dev 2 & Dev 3)");
  console.log("   4. Test end-to-end flow\n");

  return deploymentInfo;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
