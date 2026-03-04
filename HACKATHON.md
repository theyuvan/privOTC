# PrivOTC - Privacy-Preserving OTC Trading Platform

**Hackathon Tracks**: Privacy Track + Best Use of World ID with CRE  
**Team**: 3-person hackathon team  
**Submission Date**: March 5, 2026

---

## 🎯 Project Overview

**PrivOTC** combines **World ID** (sybil resistance) + **ZK Proofs** (private balance verification) + **Chainlink CRE** (confidential compute) to enable privacy-preserving peer-to-peer OTC trading where:
- ✅ **One trade per human** (World ID nullifier tracking)
- ✅ **Private balances** (ZK proofs verify `balance >= required` without revealing actual amount)
- ✅ **Confidential orderbook** (unmatched orders stay private in TEE)
- ✅ **Works on any blockchain** (CRE enables World ID + ZK verification off-chain)

---

## 🏆 Hackathon Requirements

### Privacy Track ✅

- ✅ **CRE Workflow for orchestration** - 3 integrated jobs (Trade Intake, Matching, Settlement)
- ✅ **Blockchain integration** - Ethereum Sepolia (Tenderly fork)
- ✅ **External API integration** - World ID verification API
- ✅ **Confidential Compute** - TEE-protected orderbook
- ✅ **Private transactions** - ZK balance proofs verified off-chain in CRE
- ✅ **Use case**: OTC and brokered settlements
- ✅ **Simulation ready** - `cre workflow simulate` tested
- ⏳ **3-5 minute video** - In progress
- ✅ **Public source code** - This repository
- ✅ **README** - This file + comprehensive docs

### World ID with CRE Track ✅

- ✅ **World ID integration** - Proof validation in CRE workflow
- ✅ **Sybil resistance** - One trade per verified human (nullifier tracking)
- ✅ **Off-chain verification** - World ID proofs verified in CRE TEE, not on-chain
- ✅ **Universal support** - Works on any blockchain via CRE orchestration
- ⏳ **3-5 minute video** - In progress
- ✅ **Public source code** - This repository
- ✅ **README** - This file + comprehensive docs

---

## 📂 Repository Structure

```
chain.link/
├── privotc-cre/                    # 🔗 CRE Workflow (Chainlink Integration)
│   ├── my-workflow/
│   │   ├── privotc-workflow.ts     # 🔗 Main CRE workflow
│   │   ├── privotc-config.json     # 🔗 Workflow configuration
│   │   ├── workflow.yaml           # 🔗 CRE workflow settings
│   │   └── package.json            # 🔗 @chainlink/cre-sdk dependency
│   └── project.yaml                # 🔗 CRE project settings
│
├── zk-circuits/                    # ZK Balance Proof System
│   ├── circuits/balanceProof.circom
│   ├── build/verification_key.json # Used by CRE workflow
│   └── scripts/
│
├── cre/                            # Reference implementations (modular)
│   ├── workflows/
│   └── src/
│
├── app/                            # World Mini App (Next.js)
│   └── .env.local                  # World ID staging credentials
│
└── docs/
    ├── HACKATHON_REQUIREMENTS_ANALYSIS.md
    ├── DEV3_STATUS.md
    ├── DEV3_QUICKSTART.md
    └── README_PRIVOTC.md
```

---

## 🔗 Chainlink Files Reference

All files using Chainlink CRE SDK:

### 1. Main Workflow
**File**: [privotc-cre/my-workflow/privotc-workflow.ts](privotc-cre/my-workflow/privotc-workflow.ts)

**Chainlink Components Used**:
```typescript
import {
  cre,
  Runner,
  type Runtime,
  EVMClient,
  getNetwork,
  // ... other CRE SDK imports
} from '@chainlink/cre-sdk';
```

**Workflow Jobs**:
- **HTTP Handler**: `handleTradeIntake()` - Validates World ID + ZK proofs
- **Cron Handler**: `handleMatchingEngine()` - Confidential order matching
- **Settlement**: `executeSettlement()` - On-chain trade execution

**Capabilities**:
- `cre.capabilities.HTTPCapability()` - HTTP endpoint for trade intake
- `cre.capabilities.CronCapability()` - Scheduled matching engine
- `cre.capabilities.EVMClient()` - Blockchain interaction

### 2. Workflow Configuration
**File**: [privotc-cre/my-workflow/workflow.yaml](privotc-cre/my-workflow/workflow.yaml)

**CRE Settings**:
```yaml
privotc-staging:
  user-workflow:
    workflow-name: "privotc-confidential-trading"
  workflow-artifacts:
    workflow-path: "./privotc-workflow.ts"
    config-path: "./privotc-config.json"
```

### 3. Runtime Configuration
**File**: [privotc-cre/my-workflow/privotc-config.json](privotc-cre/my-workflow/privotc-config.json)

**Settings**:
- `schedule`: Matching engine cron (every 30s)
- `worldIdAppId`: World ID staging app
- `zkVerificationKeyPath`: ZK proof verification key
- `chainName`: Target blockchain (Ethereum Sepolia)

### 4. Project Settings
**File**: [privotc-cre/project.yaml](privotc-cre/project.yaml)

**RPC Endpoints**:
- `ethereum-mainnet` (Tenderly fork)
- `ethereum-testnet-sepolia`
- `base-sepolia`

### 5. Dependencies
**File**: [privotc-cre/my-workflow/package.json](privotc-cre/my-workflow/package.json)

**Chainlink Dependency**:
```json
{
  "dependencies": {
    "@chainlink/cre-sdk": "^1.0.9",
    "snarkjs": "^0.7.4",
    "node-fetch": "^3.3.2",
    // ...
  }
}
```

---

## 🏗️ Architecture

### Privacy Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  User (World Mini App)                       │
│  • Generate World ID proof (client-side)                    │
│  • Generate ZK balance proof (client-side)                  │
│  • Submit trade intent                                       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS POST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│       CRE Workflow (Chainlink Confidential Compute TEE)      │
│                                                              │
│  📥 Job 1: Trade Intake (HTTP Trigger)                      │
│    ├─ validateWorldId() ──────→ World ID API               │
│    ├─ validateZKProof() ──────→ snarkjs.groth16.verify()   │
│    └─ orderbook.addIntent() ──→ TEE Memory (private!)       │
│                                                              │
│  🔄 Job 2: Matching Engine (Cron: 30s)                      │
│    ├─ orderbook.findMatches() → Price-time priority         │
│    ├─ Privacy: Only matched orders revealed                 │
│    └─ Trigger settlement for matches                        │
│                                                              │
│  💱 Job 3: Settlement                                        │
│    └─ executeSettlement() ────→ OTCSettlement.sol          │
└─────────────────────────┬───────────────────────────────────┘
                          │ Smart Contract Calls
                          ▼
┌─────────────────────────────────────────────────────────────┐
│          Ethereum Sepolia (Tenderly Virtual TestNet)         │
│  • OTCSettlement.sol - Execute matched trades               │
│  • ERC20 tokens - WETH, USDC, DAI, WBTC                     │
└─────────────────────────────────────────────────────────────┘
```

### Privacy Guarantees

1. **World ID Verification (Off-Chain in CRE)**
   - Proofs verified via World ID API in TEE
   - Nullifier hash tracked to prevent double-trading
   - No on-chain exposure of World ID data

2. **ZK Balance Proofs (Off-Chain in CRE)**
   - Circuit: `balanceProof.circom` (Groth16)
   - Proves: `balance >= required_amount`
   - Never reveals: Actual balance
   - Verification: snarkjs in CRE TEE (not on-chain)

3. **Confidential Orderbook (TEE Memory)**
   - Unmatched orders stay private
   - Only matched pairs revealed
   - Executed on-chain only after matching

---

## 🚀 Quick Start

### Prerequisites

- Bun or Node.js 18+
- CRE CLI v1.2.0+ (`cre --version`)
- Logged in: `cre login`

### Installation

```bash
# Clone repository
git clone https://github.com/theyuvan/chain.link.git
cd chain.link

# Install ZK circuit dependencies
cd zk-circuits
npm install

# Compile ZK circuit
npm run compile
npm run setup

# Install CRE workflow dependencies
cd ../privotc-cre/my-workflow
bun install  # or npm install
```

### Local Simulation

```bash
cd privotc-cre/my-workflow

# Simulate workflow locally
cre workflow simulate . --target privotc-staging
```

### Test Trade Intake

```bash
# Example curl request (replace with actual proofs)
curl -X POST http://localhost:8080/trade-intake \
  -H "Content-Type: application/json" \
  -d '{
    "worldIdProof": {
      "merkle_root": "0x...",
      "nullifier_hash": "0x...",
      "proof": "0x...",
      "verification_level": "orb"
    },
    "zkProof": {
      "proof": {...},
      "publicSignals": ["1", "...", "..."]
    },
    "trade": {
      "side": "buy",
      "tokenPair": "ETH/USDC",
      "amount": "1.0",
      "price": "2000"
    }
  }'
```

---

## 🔍 How It Works

### 1. Trade Submission

**User Action** (World Mini App):
```typescript
// 1. Verify with World ID
const worldIdProof = await worldcoin.verify();

// 2. Generate ZK balance proof
const zkProof = await generateBalanceProof({
  walletAddress: userAddress,
  actualBalance: userBalance,      // PRIVATE
  tokenAddress: tokenContract,
  requiredAmount: calculateRequired(amount, price, side),
  timestamp: now
});

// 3. Submit to CRE workflow
await fetch('/trade-intake', {
  body: JSON.stringify({ worldIdProof, zkProof, trade })
});
```

### 2. CRE Workflow Processing

**Job 1: Trade Intake** (HTTP):
```typescript
// Validate World ID (off-chain)
const worldIdValid = await validateWorldId(worldIdProof);
if (!worldIdValid.success) return { error: 'Invalid World ID' };

// Verify ZK proof (off-chain)
const zkValid = await validateZKProof(zkProof);
if (!zkValid.success) return { error: 'Invalid ZK proof' };
if (zkProof.publicSignals[0] !== '1') return { error: 'Insufficient balance' };

// Add to confidential orderbook (TEE)
orderbook.addIntent({
  id: zkProof.proofHash,
  walletCommitment: zkProof.publicSignals[1],
  side: trade.side,
  tokenPair: trade.tokenPair,
  amount: trade.amount,
  price: trade.price,
  worldIdNullifier: worldIdProof.nullifier_hash
});
```

**Job 2: Matching Engine** (Cron every 30s):
```typescript
// Find matching buy/sell orders
const matches = orderbook.findMatches('ETH/USDC');

// Only matched orders revealed
matches.forEach(match => {
  console.log('Match found:', match.buyOrder.id, match.sellOrder.id);
  executeSettlement(match);
});

// Unmatched orders stay private in TEE
```

**Job 3: Settlement**:
```typescript
// Call on-chain contract
const otcSettlement = new cre.capabilities.EVMClient(...);
const tx = await otcSettlement.settle(
  buyerCommitment,
  sellerCommitment,
  tokenPair,
  amount,
  price
);
```

---

## 📊 Key Features

### Privacy Features

- ✅ **ZK Balance Proofs**
  - Circuit: Circom 2.2.3 (1610 constraints)
  - Proof system: Groth16 (snarkjs 0.7.4)
  - Privacy: Actual balance never revealed
  - Verification: Off-chain in CRE TEE

- ✅ **Confidential Orderbook**
  - Storage: TEE in-memory (not on-chain)
  - Privacy: Unmatched orders private
  - Revelation: Only matched pairs exposed

- ✅ **World ID Off-Chain**
  - Verification: CRE TEE (not on-chain)
  - Sybil resistance: One trade per human
  - Nullifier tracking: In orderbook

### Chainlink CRE Integration

- ✅ **HTTP Capability**: `/trade-intake` endpoint
- ✅ **Cron Capability**: Matching engine (30s)
- ✅ **EVM Client**: Blockchain interaction
- ✅ **Confidential Compute**: TEE execution
- ✅ **Multi-chain**: Works on any EVM chain

### World ID Integration

- ✅ **Staging App**: `app_356707253a6f729610327063d51fe46e`
- ✅ **Action**: `submit_trade`
- ✅ **Verification**: Off-chain in CRE
- ✅ **Universal**: Enables World ID on any chain

---

## 🎬 Demo Video

**Coming Soon**: 3-5 minute video showcasing:
1. Project overview
2. World ID integration
3. ZK proof system
4. CRE workflow simulation
5. End-to-end demo

**Video Link**: [YouTube URL] (to be added)

---

## 📚 Documentation

- **[HACKATHON_REQUIREMENTS_ANALYSIS.md](HACKATHON_REQUIREMENTS_ANALYSIS.md)** - Requirements verification
- **[DEV3_STATUS.md](DEV3_STATUS.md)** - Complete implementation status
- **[DEV3_QUICKSTART.md](DEV3_QUICKSTART.md)** - Developer quick start
- **[privotc-cre/my-workflow/README_PRIVOTC.md](privotc-cre/my-workflow/README_PRIVOTC.md)** - Workflow documentation

---

## 🛠️ Technology Stack

**Chainlink**:
- CRE SDK v1.0.9
- Confidential Compute (TEE)
- HTTP + Cron capabilities
- EVM Client

**Privacy**:
- Circom 2.2.3 (ZK circuits)
- snarkjs 0.7.4 (Groth16 proofs)
- World ID (sybil resistance)

**Blockchain**:
- Ethereum Sepolia (Tenderly fork)
- Base Sepolia (configured)
- Solidity contracts

**Frontend**:
- Next.js 14
- World Mini App SDK
- TypeScript

---

## 🤝 Team

- **Dev 1**: Smart contracts (OTCSettlement, tokens)
- **Dev 2**: World Mini App (Next.js frontend)
- **Dev 3**: Chainlink CRE workflows + ZK circuits

---

## 📝 License

MIT License

---

## 🏆 Hackathon Submission Summary

**Tracks**:
1. Privacy Track ✅
2. Best Use of World ID with CRE ✅

**Key Innovations**:
- Off-chain ZK proof verification in CRE (faster, cheaper, more private)
- World ID verification in TEE (works on any blockchain)
- Confidential orderbook (unmatched orders stay private)
- Complete privacy-preserving OTC workflow

**Status**:
- ✅ CRE workflow built and simulated
- ✅ World ID integration complete
- ✅ ZK proofs verified (off-chain in CRE)
- ✅ Source code public
- ✅ Comprehensive documentation
- ⏳ Video recording in progress

**GitHub**: https://github.com/theyuvan/chain.link/tree/dev3

Built with ❤️ using Chainlink CRE, World ID, and Zero-Knowledge Proofs
