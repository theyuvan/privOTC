import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const TENDERLY_RPC = 'https://virtual.mainnet.eu.rpc.tenderly.co/9b993a3b-a915-4d11-9283-b43800cd39a5';
const WLD_TOKEN = '0x163f8C2467924be0ae7B5347228CABF260318753';
const DEPLOYER_KEY = '0xf64b45c2063ab73b67ec0e34f24eede3a80d8e3b0a755e318d598a746c38827c';

async function overrideBalance() {
  const recipient = process.argv[2] || '0xF83955578E9e71c2d005a2c6141C2CD9F08A6Fa9';
  const amount = process.argv[3] || '10000';

  console.log('\n💰 Tenderly State Override - WLD Balance');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Recipient:', recipient);
  console.log('Amount:', amount, 'WLD');
  console.log('WLD Token:', WLD_TOKEN);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Use Tenderly's devnet RPC with state overrides
  const response = await fetch(TENDERLY_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tenderly_setBalance',
      params: [
        WLD_TOKEN,
        recipient,
        '0x' + BigInt(parseEther(amount).toString()).toString(16)
      ],
      id: 1
    })
  });

  const result = await response.json();
  
  if (result.error) {
    console.log('❌ Tenderly state override failed:', result.error.message);
    console.log('\nℹ️  Try Option 1 instead: Switch your trade to SELL ETH (not BUY ETH)');
    console.log('   Your buyer HAS ETH, so they should SELL it for WLD.');
    return;
  }

  console.log('✅ Balance overridden!');
  console.log('✅ New WLD balance:', amount, 'WLD');
  console.log('\n📝 Now retry the deposit from your frontend');
}

overrideBalance().catch(console.error);
