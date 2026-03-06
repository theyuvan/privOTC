import { createPublicClient, http, parseAbi } from 'viem';

const WLD_ADDRESS = '0x2cfc85d8e48f8eab294be644d9e25c3030863003' as `0x${string}`;
const BUYER = '0xF83955578E9e71c2d005a2c6141C2CD9F08A6Fa9' as `0x${string}`;
const SELLER = '0xb5A885a51923d85E3e3a7f3C58e1a36083F9d0D2' as `0x${string}`;
const RPC = 'https://virtual.worldchain-mainnet.eu.rpc.tenderly.co/9351a25c-a4fe-452b-86b5-ed87acd05ce8';

const client = createPublicClient({
  transport: http(RPC),
});

const erc20Abi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]);

async function checkBalances() {
  console.log('\n🔍 Checking WLD Balances on New RPC\n');
  console.log('WLD Token:', WLD_ADDRESS);
  console.log('RPC:', RPC, '\n');

  try {
    const [buyerBalance, sellerBalance, decimals, symbol] = await Promise.all([
      client.readContract({ address: WLD_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [BUYER] }),
      client.readContract({ address: WLD_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [SELLER] }),
      client.readContract({ address: WLD_ADDRESS, abi: erc20Abi, functionName: 'decimals', args: [] }),
      client.readContract({ address: WLD_ADDRESS, abi: erc20Abi, functionName: 'symbol', args: [] }),
    ]);

    console.log('Token:', symbol);
    console.log('Decimals:', decimals);
    console.log('\nBuyer:', BUYER);
    console.log('Balance:', (Number(buyerBalance) / 10**Number(decimals)).toFixed(2), symbol);
    console.log('\nSeller:', SELLER);
    console.log('Balance:', (Number(sellerBalance) / 10**Number(decimals)).toFixed(2), symbol);
  } catch (error: any) {
    console.log('❌ Error:', error.message);
    console.log('\n⚠️  WLD token does NOT exist on new RPC!');
    console.log('    You need to deploy a new WLD token or use the old RPC.');
  }
}

checkBalances();
