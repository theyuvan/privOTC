const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("\n🪙 Deploying MockWLD Token...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy MockWLD
  const MockWLD = await ethers.getContractFactory("MockWLD");
  const wld = await MockWLD.deploy();
  await wld.waitForDeployment();

  const wldAddress = await wld.getAddress();
  console.log("✅ MockWLD deployed:", wldAddress);
  console.log("✅ Deployer balance:", ethers.formatEther(await wld.balanceOf(deployer.address)), "WLD\n");

  // Mint to buyer address from .env if needed
  const buyerAddress = process.argv[2] || "0xF83955578E9e71c2d005a2c6141C2CD9F08A6Fa9";
  const mintAmount = ethers.parseEther("10000"); // 10k WLD

  console.log("🎁 Minting", ethers.formatEther(mintAmount), "WLD to", buyerAddress);
  const tx = await wld.mint(buyerAddress, mintAmount);
  await tx.wait();
  
  console.log("✅ Minted! Balance:", ethers.formatEther(await wld.balanceOf(buyerAddress)), "WLD");
  console.log("\n📝 Update your .env files with:");
  console.log("NEXT_PUBLIC_WLD_TOKEN_ADDRESS=" + wldAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
