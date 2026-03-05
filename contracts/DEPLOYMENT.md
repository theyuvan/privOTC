# PrivOTC Contract Deployment Guide

This guide covers deploying the PrivOTC smart contracts to Tenderly Virtual TestNets.

## Prerequisites

- Node.js and npm installed
- Hardhat environment configured
- Tenderly account created
- `.env` file configured with required values

## Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
# Tenderly Virtual TestNets
TENDERLY_ACCESS_TOKEN=your_tenderly_access_token
TENDERLY_ACCOUNT_SLUG=your_account_slug
TENDERLY_PROJECT_SLUG=privotc
TENDERLY_ETHEREUM_RPC=https://virtual.mainnet.rpc.tenderly.co/...
TENDERLY_BASE_RPC=https://virtual.base.rpc.tenderly.co/...

# World ID
WORLD_APP_ID=app_staging_xxx
WORLD_ID_ACTION=verify-otc-trader

# Deployer Wallet
PRIVATE_KEY=0x...
```

## Setup Tenderly Virtual TestNets

### 1. Install Tenderly CLI

```bash
npm install -g @tenderly/cli
```

### 2. Login to Tenderly

```bash
tenderly login
```

### 3. Initialize Project

```bash
cd contracts
tenderly init
```

### 4. Create Virtual TestNets

#### Create Ethereum Fork

```bash
tenderly devnet spawn-rpc \
  --project privotc \
  --template mainnet \
  --chain-id 1 \
  --slug privotc-ethereum
```

#### Create Base Fork

```bash
tenderly devnet spawn-rpc \
  --project privotc \
  --template base-mainnet \
  --chain-id 8453 \
  --slug privotc-base
```

### 5. Get RPC URLs

After creating the virtual testnets, copy the RPC URLs and add them to your `.env` file.

You can also find them in the Tenderly Dashboard:
- Navigate to your project
- Click on "Virtual TestNets"
- Copy the RPC URLs

## Deploy Contracts

### Deploy to Ethereum Fork

```bash
cd contracts
npm run deploy:tenderly-eth
```

This will:
1. Deploy EscrowVault
2. Deploy OTCSettlement
3. Deploy ProofVerifier
4. Configure contract relationships
5. Save deployment info to `deployments/tenderly-ethereum-latest.json`

### Deploy to Base Fork

```bash
npm run deploy:tenderly-base
```

## Verify Deployment

### Check Deployment Files

Deployment information is saved in the `deployments/` directory:

```bash
ls deployments/
# tenderly-ethereum-latest.json
# tenderly-base-latest.json
```

### View on Tenderly Explorer

1. Open Tenderly Dashboard
2. Navigate to your project
3. Go to "Contracts" or "Virtual TestNets"
4. Find your deployed contracts
5. Click to view contract details and transaction history

## Contract Addresses

After deployment, note the contract addresses:

### Ethereum Fork

```json
{
  "EscrowVault": "0x...",
  "OTCSettlement": "0x...",
  "ProofVerifier": "0x..."
}
```

### Base Fork

```json
{
  "EscrowVault": "0x...",
  "OTCSettlement": "0x...",
  "ProofVerifier": "0x..."
}
```

## Post-Deployment Configuration

### 1. Update CRE Executor

The deployment script temporarily sets the deployer as the CRE executor. Update it:

```javascript
// Using Hardhat console or ethers.js script
const otcSettlement = await ethers.getContractAt(
  "OTCSettlement",
  "0x..." // your deployed address
);

await otcSettlement.setCREExecutor("0x..."); // actual CRE service address
```

### 2. Fund Test Wallets

Fund wallets with test ETH using Tenderly's unlimited faucet:

```bash
# In Tenderly Dashboard
# Navigate to Virtual TestNet > Accounts
# Click "Fund Account"
# Add your test wallet addresses
```

Fund with test ERC20 tokens (USDC, etc.):
- Deploy or use existing token contracts on the fork
- Mint tokens to test addresses

### 3. Share with Team

Share the deployment info with Dev 2 (Frontend) and Dev 3 (CRE):

- Contract addresses
- Contract ABIs (in `artifacts/contracts/`)
- Tenderly Explorer links
- RPC URLs

## Testing on Virtual TestNets

### Run Integration Tests

```bash
# Set RPC URL to Tenderly Virtual TestNet
export HARDHAT_NETWORK=tenderly-ethereum

# Run tests
npx hardhat test
```

### Manual Testing with Hardhat Console

```bash
npx hardhat console --network tenderly-ethereum
```

```javascript
// In console
const EscrowVault = await ethers.getContractFactory("EscrowVault");
const escrow = await EscrowVault.attach("0x..."); // your deployed address

// Test deposit
const tradeId = ethers.id("test-trade-1");
await escrow.deposit(tradeId, ethers.ZeroAddress, ethers.parseEther("1"), 0, {
  value: ethers.parseEther("1")
});

// Check balance
const balance = await escrow.getBalance(tradeId);
console.log("Escrow balance:", ethers.formatEther(balance));
```

## Troubleshooting

### Issue: RPC URL not working

**Solution:** Verify the Virtual TestNet is running in Tenderly Dashboard. Restart if needed.

### Issue: Insufficient funds

**Solution:** Use Tenderly faucet to add funds to your test wallet.

### Issue: Contract verification failed

**Solution:** Ensure `tenderly.yaml` is properly configured and run:

```bash
tenderly contracts verify EscrowVault \
  --network tenderly-ethereum
```

### Issue: Deployment transaction failed

**Solution:** Check:
- Private key is correct in `.env`
- Wallet has sufficient balance
- RPC URL is correct
- Network configuration in `hardhat.config.js`

## Clean Up

To reset Virtual TestNets:

```bash
# Delete and recreate
tenderly devnet delete --project privotc --slug privotc-ethereum
tenderly devnet spawn-rpc --project privotc --template mainnet --chain-id 1 --slug privotc-ethereum
```

## Useful Commands

```bash
# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to specific network
npm run deploy:tenderly-eth
npm run deploy:tenderly-base

# Hardhat console
npx hardhat console --network tenderly-ethereum

# Verify contracts
tenderly contracts verify ContractName --network tenderly-ethereum
```

## Resources

- [Tenderly Virtual TestNets Documentation](https://docs.tenderly.co/virtual-testnets)
- [Hardhat Documentation](https://hardhat.org/docs)
- [World ID Documentation](https://docs.world.org/world-id)
- [Chainlink CRE Documentation](https://docs.chain.link/chainlink-functions)

## Next Steps

After successful deployment:

1. ✅ Verify all contracts on Tenderly Explorer
2. ✅ Test deposit → release flow
3. ✅ Test escrow → refund flow
4. ✅ Test World ID proof verification
5. ✅ Document Tenderly Explorer transaction links
6. ✅ Share contract ABIs and addresses with team
7. ✅ Begin Phase 6 integration with Dev 2 and Dev 3
