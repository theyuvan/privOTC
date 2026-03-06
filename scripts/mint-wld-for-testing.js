// Mint WLD tokens for testing
// Usage: node scripts/mint-wld-for-testing.js <recipient-address> <amount>

import { ethers } from 'ethers';

const WLD_ADDRESS = '0x163f8C2467924be0ae7B5347228CABF260318753';
const TENDERLY_RPC = 'https://virtual.mainnet.eu.rpc.tenderly.co/9b993a3b-a915-4d11-9283-b43800cd39a5';
const DEPLOYER_KEY = '0xf64b45c2063ab73b67ec0e34f24eede3a80d8e3b0a755e318d598a746c38827c';

// Standard ERC20 ABI (includes mint if available, or we'll transfer from deployer)
const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
];

async function main() {
  const recipient = process.argv[2] || '0xF83955578E9e71c2d005a2c6141C2CD9F08A6Fa9';
  const amount = process.argv[3] || '1000'; // 1000 WLD

  console.log('🪙 WLD Token Minting Script');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Recipient:', recipient);
  console.log('Amount:', amount, 'WLD');
  console.log('WLD Address:', WLD_ADDRESS);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const provider = new ethers.JsonRpcProvider(TENDERLY_RPC);
  const deployer = new ethers.Wallet(DEPLOYER_KEY, provider);
  const wld = new ethers.Contract(WLD_ADDRESS, ERC20_ABI, deployer);

  try {
    // Get decimals
    const decimals = await wld.decimals();
    const amountWei = ethers.parseUnits(amount, decimals);

    console.log(`Decimals: ${decimals}`);
    console.log(`Amount in wei: ${amountWei.toString()}\n`);

    // Check deployer balance
    const deployerBalance = await wld.balanceOf(deployer.address);
    console.log(`Deployer balance: ${ethers.formatUnits(deployerBalance, decimals)} WLD\n`);

    // Try to mint (if contract has mint function)
    try {
      console.log('Attempting to mint...');
      const mintTx = await wld.mint(recipient, amountWei);
      console.log('Mint tx sent:', mintTx.hash);
      await mintTx.wait();
      console.log('✅ Minted', amount, 'WLD to', recipient);
    } catch (mintError) {
      // Mint failed, try transfer from deployer
      console.log('Mint not available, transferring from deployer...');
      if (deployerBalance < amountWei) {
        throw new Error(`Insufficient deployer balance. Has ${ethers.formatUnits(deployerBalance, decimals)} WLD, needs ${amount} WLD`);
      }
      const transferTx = await wld.transfer(recipient, amountWei);
      console.log('Transfer tx sent:', transferTx.hash);
      await transferTx.wait();
      console.log('✅ Transferred', amount, 'WLD to', recipient);
    }

    // Verify recipient balance
    const recipientBalance = await wld.balanceOf(recipient);
    console.log('\n📊 Final balance:', ethers.formatUnits(recipientBalance, decimals), 'WLD');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Done! You can now deposit WLD into escrow.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
