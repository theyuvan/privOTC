# Contract Integration Reference

Quick reference for Dev 2 (Frontend) and Dev 3 (CRE) to integrate with the smart contracts.

## 📋 Contract Addresses

### Tenderly Ethereum Fork
```
EscrowVault:    TBD (after deployment)
OTCSettlement:  TBD (after deployment)
ProofVerifier:  TBD (after deployment)
```

### Tenderly Base Fork
```
EscrowVault:    TBD (after deployment)
OTCSettlement:  TBD (after deployment)
ProofVerifier:  TBD (after deployment)
```

## 🔧 For Dev 2 (Frontend - World Mini App)

### Required Files
- Contract ABIs: `artifacts/contracts/**/*.json`
- Deployment info: `deployments/tenderly-ethereum-latest.json`

### Integration Steps

#### 1. World ID Verification
```typescript
// After user completes World ID verification in Mini App
const proof = {
  signal: userWalletAddress,
  root: merkleRoot,
  nullifierHash: nullifierHash,
  proof: zkProof // uint256[8]
};

// Call ProofVerifier contract
await proofVerifier.verifyHuman(
  proof.signal,
  proof.root,
  proof.nullifierHash,
  proof.proof
);
```

#### 2. Deposit Funds to Escrow
```typescript
// Generate escrow ID
const tradeId = ethers.id("unique-trade-id");
const escrowId = ethers.keccak256(
  ethers.solidityPacked(["bytes32", "address"], [tradeId, userAddress])
);

// For ETH deposit
await escrowVault.deposit(
  escrowId,
  ethers.ZeroAddress, // ETH
  amount,
  0, // use default timeout
  { value: amount }
);

// For ERC20 deposit
await token.approve(escrowVaultAddress, amount);
await escrowVault.deposit(
  escrowId,
  tokenAddress,
  amount,
  0
);
```

#### 3. Check Settlement Status
```typescript
// Poll for settlement
const isSettled = await otcSettlement.isSettled(tradeId);

if (isSettled) {
  const settlement = await otcSettlement.getSettlement(tradeId);
  console.log("Trade settled:", settlement);
}
```

#### 4. Check Escrow Balance
```typescript
const balance = await escrowVault.getBalance(escrowId);
console.log("Locked amount:", ethers.formatEther(balance));
```

### Event Listeners

```typescript
// Listen for human verification
proofVerifier.on("HumanVerified", (user, nullifierHash) => {
  console.log("User verified:", user);
});

// Listen for deposits
escrowVault.on("Deposited", (tradeId, depositor, token, amount) => {
  console.log("Funds deposited:", amount);
});

// Listen for settlements
otcSettlement.on("TradeSettled", (tradeId, buyer, seller, timestamp) => {
  console.log("Trade settled:", tradeId);
  // Update UI, show Tenderly Explorer link
});
```

## 🤖 For Dev 3 (CRE Workflow)

### Required Files
- Contract ABIs: `artifacts/contracts/**/*.json`
- Deployment addresses: `deployments/tenderly-ethereum-latest.json`

### Integration Steps

#### 1. Set CRE Executor Address
```javascript
// One-time setup (done by contract owner)
await otcSettlement.setCREExecutor(creServiceAddress);
```

#### 2. Verify Funds Before Matching
```javascript
// In your matching workflow
const buyerEscrowId = ethers.keccak256(
  ethers.solidityPacked(["bytes32", "address"], [tradeId, buyerAddress])
);

const sellerEscrowId = ethers.keccak256(
  ethers.solidityPacked(["bytes32", "address"], [tradeId, sellerAddress])
);

const buyerBalance = await escrowVault.getBalance(buyerEscrowId);
const sellerBalance = await escrowVault.getBalance(sellerEscrowId);

if (buyerBalance >= buyerAmount && sellerBalance >= sellerAmount) {
  // Proceed with settlement
}
```

#### 3. Execute Settlement
```javascript
// After confidential matching completes
await otcSettlement.settle(
  tradeId,
  buyerAddress,
  sellerAddress,
  buyerToken,     // e.g., USDC address
  sellerToken,    // e.g., ZeroAddress for ETH
  buyerAmount,
  sellerAmount
);
```

#### 4. Record Settlement Proof
```javascript
// Generate proof hash from settlement data
const proofHash = ethers.keccak256(
  ethers.solidityPacked(
    ["bytes32", "address", "address", "uint256"],
    [tradeId, buyerAddress, sellerAddress, block.timestamp]
  )
);

// Record on-chain
await proofVerifier.verifySettlement(tradeId, proofHash);
```

### Error Handling

```javascript
try {
  await otcSettlement.settle(...);
} catch (error) {
  if (error.message.includes("Unauthorized")) {
    // CRE executor not authorized
  } else if (error.message.includes("InsufficientEscrowBalance")) {
    // User didn't deposit enough
    // Cancel match, notify users
  } else if (error.message.includes("SettlementAlreadyExecuted")) {
    // Already settled (should not happen)
  }
}
```

## 🔑 Common Patterns

### Generate Trade ID
```javascript
// Client-side or CRE
const tradeId = ethers.id(`${userId}-${timestamp}-${side}`);
// or
const tradeId = ethers.randomBytes(32);
```

### Generate Escrow ID
```javascript
const escrowId = ethers.keccak256(
  ethers.solidityPacked(["bytes32", "address"], [tradeId, participantAddress])
);
```

### Check if User is Verified Human
```javascript
// Before allowing trade submission
const isUsed = await proofVerifier.isNullifierUsed(nullifierHash);
if (!isUsed) {
  // User needs to verify with World ID first
}
```

## 📊 Gas Estimates

| Operation | Estimated Gas |
|---|---|
| `deposit()` (ETH) | ~50,000 |
| `deposit()` (ERC20) | ~70,000 |
| `release()` | ~45,000 |
| `refund()` | ~45,000 |
| `settle()` | ~120,000 |
| `verifyHuman()` | ~80,000 |
| `verifySettlement()` | ~45,000 |

*Note: Actual gas costs may vary based on network conditions*

## 🌐 RPC Endpoints

```typescript
// Tenderly Virtual TestNets
const providerEthereum = new ethers.JsonRpcProvider(
  process.env.TENDERLY_ETHEREUM_RPC
);

const providerBase = new ethers.JsonRpcProvider(
  process.env.TENDERLY_BASE_RPC
);
```

## 🔍 Tenderly Explorer Links

After deployment, contracts can be viewed at:
```
https://dashboard.tenderly.co/{account}/{project}/contract/{network}/{address}
```

## 🐛 Debugging

### Check Contract State
```javascript
// Check settlement contract configuration
const creExecutor = await otcSettlement.creExecutor();
console.log("CRE Executor:", creExecutor);

// Check escrow vault configuration
const settlementContract = await escrowVault.settlementContract();
console.log("Settlement Contract:", settlementContract);
```

### Tenderly Debugger
Use Tenderly's transaction simulator to debug failed transactions:
1. Go to Tenderly Dashboard
2. Navigate to "Simulator"
3. Paste transaction data
4. Run simulation
5. Inspect traces and state changes

## 📞 Contact

For questions about contract integration:
- **Dev 1 (You)**: Smart contracts, deployment, Tenderly
- Share via team channel or documentation

---

**Last Updated**: After initial deployment
