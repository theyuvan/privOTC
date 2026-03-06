import { createPublicClient, http } from 'viem';

const WORLD_CHAIN_RPC = 'https://virtual.worldchain-mainnet.eu.rpc.tenderly.co/9351a25c-a4fe-452b-86b5-ed87acd05ce8';
const WLD_TOKEN = '0x2cfc85d8e48f8eab294be644d9e25c3030863003' as `0x${string}`;

const contracts = {
  'Escrow': '0x8fC5337902A1EF5e699B2C19f1EBe892E5DBf294' as `0x${string}`,
  'Settlement': '0x615807920BEA0751AbE4682f18b55C0e1BaA0112' as `0x${string}`,
  'ProofVerifier': '0x73416Bc510C031708558F4f8796214A29e2FFdb7' as `0x${string}`,
  'WLD Token': WLD_TOKEN,
};

const client = createPublicClient({
  transport: http(WORLD_CHAIN_RPC),
});

async function checkContracts() {
  console.log('\n🔍 Checking World Chain Contracts\n');
  console.log('RPC:', WORLD_CHAIN_RPC, '\n');

  for (const [name, address] of Object.entries(contracts)) {
    try {
      const code = await client.getBytecode({ address });
      if (code && code !== '0x') {
        console.log(`✅ ${name}: ${address} - EXISTS`);
      } else {
        console.log(`❌ ${name}: ${address} - NOT DEPLOYED`);
      }
    } catch (error) {
      console.log(`❌ ${name}: ${address} - ERROR`);
    }
  }
}

checkContracts();
