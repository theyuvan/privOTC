// Mint WLD tokens for testing - using viem
// Usage: bun run scripts/mint-wld.ts <recipient> <amount>

import { createPublicClient, createWalletClient, http, parseAbi, formatUnits, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const WLD_ADDRESS = '0x163f8C2467924be0ae7B5347228CABF260318753' as `0x${string}`;
const TENDERLY_RPC = 'https://virtual.mainnet.eu.rpc.tenderly.co/9b993a3b-a915-4d11-9283-b43800cd39a5';
const DEPLOYER_KEY = '0xf64b45c2063ab73b67ec0e34f24eede3a80d8e3b0a755e318d598a746c38827c' as `0x${string}`;

const tenderlyChain = {
  id: 9991,
  name: 'Tenderly Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [TENDERLY_RPC] } },
} as const;

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
]);

async function main() {
  const recipient = (process.argv[2] || '0xF83955578E9e71c2d005a2c6141C2CD9F08A6Fa9') as `0x${string}`;
  const amount = process.argv[3] || '1000';

  console.log('🪙 WLD Token Minting Script');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Recipient:', recipient);
  console.log('Amount:', amount, 'WLD');
  console.log('WLD Address:', WLD_ADDRESS);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const publicClient = createPublicClient({
    chain: tenderlyChain,
    transport: http(TENDERLY_RPC),
  });

  const account = privateKeyToAccount(DEPLOYER_KEY);
  const walletClient = createWalletClient({
    account,
    chain: tenderlyChain,
    transport: http(TENDERLY_RPC),
  });

  try {
    // Get decimals
    const decimals = await publicClient.readContract({
      address: WLD_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });

    const amountWei = parseUnits(amount, decimals);
    console.log(`Decimals: ${decimals}`);
    console.log(`Amount in wei: ${amountWei.toString()}\n`);

    // Check deployer balance
    const deployerBalance = await publicClient.readContract({
      address: WLD_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });
    console.log(`Deployer balance: ${formatUnits(deployerBalance as bigint, decimals)} WLD\n`);

    // Try to mint (if contract has mint function)
    try {
      console.log('Attempting to mint...');
      const mintTx = await walletClient.writeContract({
        address: WLD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'mint',
        args: [recipient, amountWei],
      });
      console.log('Mint tx sent:', mintTx);
      await publicClient.waitForTransactionReceipt({ hash: mintTx });
      console.log('✅ Minted', amount, 'WLD to', recipient);
    } catch (mintError: any) {
      // Mint failed, try transfer from deployer
      console.log('Mint not available, transferring from deployer...');
      const deployerBal = deployerBalance as bigint;
      if (deployerBal < amountWei) {
        throw new Error(`Insufficient deployer balance. Has ${formatUnits(deployerBal, decimals)} WLD, needs ${amount} WLD`);
      }
      const transferTx = await walletClient.writeContract({
        address: WLD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [recipient, amountWei],
      });
      console.log('Transfer tx sent:', transferTx);
      await publicClient.waitForTransactionReceipt({ hash: transferTx });
      console.log('✅ Transferred', amount, 'WLD to', recipient);
    }

    // Verify recipient balance
    const recipientBalance = await publicClient.readContract({
      address: WLD_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [recipient],
    });
    console.log('\n📊 Final balance:', formatUnits(recipientBalance as bigint, decimals), 'WLD');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Done! You can now deposit WLD into escrow.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
