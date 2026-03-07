# PrivOTC — Privacy-Preserving OTC Trading Platform

**Hackathon Project** — World ID + Chainlink CRE + ZK Proofs + Tenderly Virtual TestNets

## 🎯 Project Overview

PrivOTC enables peer-to-peer OTC trades with complete privacy:
- ✅ **Prove you have funds** without revealing your balance (ZK proofs)
- ✅ **Match orders confidentially** in a Trusted Execution Environment
- ✅ **One trade per human** via World ID (sybil resistance)
- ✅ **Execute settlement** on-chain only when matched

## 🏗️ Architecture

```
┌─────────────────────┐
│  World Mini App     │  ← Users trade here
│  (Next.js)          │
└──────────┬──────────┘
           │ ZK Proof + World ID
           ▼
┌─────────────────────┐
│  Chainlink CRE      │  ← Confidential matching (TEE)
│  Workflows          │
└──────────┬──────────┘
           │ On-chain settlement
           ▼
┌─────────────────────┐
│  Smart Contracts    │  ← OTCSettlement, ProofVerifier
│  (Solidity)         │
└─────────────────────┘
```

## 📁 Repository Structure

```
chain.link/
├── zk-circuits/         # ZK balance proof circuits (Circom)
├── cre/                 # CRE confidential workflows (TypeScript)
├── app/                 # World Mini App frontend (Next.js)
├── contracts/           # Smart contracts (Solidity) — Dev 1's work
├── docs/
│   ├── SUMMARY.md                    # 📖 Start here!
│   ├── DEV3_QUICKSTART.md            # Quick start guide
│   ├── DEV3_IMPLEMENTATION_PLAN.md   # Full implementation plan
│   └── TESTING_GUIDE.md              # Testing instructions
└── README.md            # This file
```

## 👥 Team Roles

| Role | Responsibilities | Status |
|------|------------------|--------|
| **Dev 1** | Smart contracts (OTCSettlement, EscrowVault, ProofVerifier) | ⏳ In progress |
| **Dev 2** | World Mini App frontend (Next.js, World ID integration) | ✅ Complete |
| **Dev 3** | CRE workflows + ZK proofs (TypeScript, Circom) | ✅ **Complete** |

## 🚀 Quick Start (Dev 3)

**You are Dev 3.** Your implementation is ready!

### 1. Read Documentation

Start here: [SUMMARY.md](SUMMARY.md) — Complete overview of what was built

Then: [DEV3_QUICKSTART.md](DEV3_QUICKSTART.md) — Step-by-step setup guide

### 2. Setup

```bash
# Option 1: Automated setup (WSL)
wsl bash -c "cd /mnt/c/Users/thame/chain.link && bash setup-dev3.sh"

# Option 2: Manual setup
cd zk-circuits
npm install
npm run compile
npm run setup

cd ../cre
npm install
cp .env.example .env
# Edit .env with your configuration
npm run build
```

### 3. Test

```bash
# Follow testing guide
cd zk-circuits
npm test

cd ../cre
npm test
```

### 4. Deploy

```bash
# Deploy to CRE platform (requires Early Access)
cd cre
cre workflow deploy --target production-settings
```

## 🔐 Technology Stack

### Privacy Layer (Dev 3 — You!)
- **Circom 2.0.0** — ZK circuit language
- **snarkjs** — Proof generation/verification
- **Chainlink CRE** — Confidential compute (TEE)
- **Poseidon Hash** — Privacy commitments

### Frontend (Dev 2)
- **Next.js 15.1.4** — Web framework
- **World ID** — Sybil resistance
- **RainbowKit** — Wallet connection
- **Tailwind CSS** — Styling

### Smart Contracts (Dev 1)
- **Solidity** — Contract language
- **Foundry** — Testing framework
- **Tenderly Virtual TestNets** — Testing environment

## 📊 What Dev 3 Built

### 1. ZK Balance Proof Circuit
**File:** `zk-circuits/circuits/balanceProof.circom`

Proves: "I have ≥ X tokens" without revealing actual balance

**Inputs (Private):**
- Wallet address
- Actual balance
- Token address
- Salt

**Outputs (Public):**
- Balance sufficient? (yes/no)
- Wallet commitment (hash)
- Proof hash (unique ID)

### 2. CRE Workflows

**Workflow 1: Trade Intake**
- Validates World ID proof
- Verifies ZK balance proof
- Adds to confidential orderbook

**Workflow 2: Matching Engine**
- Finds matching buy/sell orders
- Only reveals matched pairs
- Triggers settlement

**Workflow 4: Settlement**
- Records proofs on-chain
- Executes settlement
- Sends notifications

### 3. Supporting Components
- ZK proof verifier (TypeScript)
- World ID validator
- Confidential orderbook (in-memory, TEE)
- Cryptographic utilities

## 🤝 Integration Points

### Dev 1 → Dev 3
**Need from Dev 1:**
- [ ] Tenderly Virtual TestNet RPC URLs
- [ ] Contract addresses (OTCSettlement, EscrowVault, ProofVerifier)
- [ ] Token addresses (WETH, USDC, DAI, WBTC)

### Dev 3 → Dev 2
**Provide to Dev 2:**
- [ ] CRE workflow endpoints (after deployment)
- [ ] World ID action ID: `submit-trade`
- [ ] ZK proof generation library (optional)

## 📚 Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| [SUMMARY.md](SUMMARY.md) | Complete implementation summary | Dev 3 |
| [DEV3_QUICKSTART.md](DEV3_QUICKSTART.md) | Quick start guide | Dev 3 |
| [DEV3_IMPLEMENTATION_PLAN.md](DEV3_IMPLEMENTATION_PLAN.md) | Full implementation plan | Dev 3 |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | Testing instructions | Dev 3 |
| [zk-circuits/README.md](zk-circuits/README.md) | ZK circuit documentation | Dev 3 |
| [cre/README.md](cre/README.md) | CRE workflow documentation | Dev 3 |

## 🔧 Environment Setup

### Prerequisites
- Node.js 18+ (for both zk-circuits and cre)
- WSL (for Circom compilation)
- Circom compiler
- CRE CLI (`irm https://cre.chain.link/install.ps1 | iex`)

### Configuration Files

**Create these files:**
```bash
# CRE workflows environment
cre/.env  # Copy from cre/.env.example

# Required variables:
# - CRE_WORKFLOW_OWNER_ADDRESS
# - Contract addresses (from Dev 1)
# - Tenderly RPC URLs (from Dev 1)
# - AES_ENCRYPTION_KEY (generate with: openssl rand -hex 32)
```

## 🧪 Testing

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed testing instructions.

**Quick test:**
```bash
# Test ZK circuit
cd zk-circuits
npm run compile && npm run setup

# Test CRE workflows
cd ../cre
npm run build && npm test
```

## 🚀 Deployment

### Local Development
```bash
cd cre
npm run simulate
```

### Production (CRE Platform)
```bash
# Requires CRE Early Access approval
cd cre
npm run deploy
```

## 🔒 Security Considerations

1. **Never commit `.env` files** — Contains private keys!
2. **Trusted setup** — In production, use multi-party ceremony (MPC)
3. **World ID nullifiers** — Tracked to prevent double-trading
4. **Proof expiry** — ZK proofs expire after 5 minutes
5. **Confidential compute** — All workflows run in TEE

## 📊 Privacy Guarantees

| Data | Visibility |
|------|-----------|
| Wallet address | ❌ Hidden (commitment only) |
| Actual balance | ❌ Never revealed |
| Unmatched orders | ❌ Stay in TEE |
| Trade intent | ❌ Encrypted until matched |
| Matched trades | ✅ Public (for settlement) |
| World ID proof | ✅ Verified, nullifier stored |

## 🎯 Success Metrics

**Project is successful when:**
- [ ] ZK circuits compile and generate valid proofs
- [ ] CRE workflows deploy successfully
- [ ] Frontend integrates with CRE endpoints
- [ ] Real user completes end-to-end trade
- [ ] Privacy properties verified:
  - [ ] Balance never revealed
  - [ ] Unmatched orders stay private
  - [ ] One trade per verified human

## 🐛 Troubleshooting

### Common Issues

**"Verification key not found"**
→ Run: `cd zk-circuits && npm run setup`

**"Contract addresses not configured"**
→ Wait for Dev 1, then update `cre/.env`

**"CRE deployment failed"**
→ Check Early Access status, verify `cre login`

**"World ID validation failed"**
→ Use real proof from World Mini App, check staging credentials

## 📞 Team Communication

**Status Updates:**
- Dev 3 (CRE + ZK): ✅ Implementation complete, ready to deploy
- Dev 1 (Contracts): ⏳ Awaiting contract addresses and RPC URLs
- Dev 2 (Frontend): ⏳ Awaiting CRE endpoints

**Next Steps:**
1. Dev 3: Apply for CRE Early Access
2. Dev 1: Deploy contracts to Tenderly, share addresses
3. Dev 3: Deploy CRE workflows, share endpoints
4. Dev 2: Integrate endpoints, test end-to-end
5. All: Test together with real trades

## 🎓 Learning Resources

- [Chainlink CRE Docs](https://docs.chain.link/cre)
- [Circom Tutorial](https://docs.circom.io/)
- [World ID Documentation](https://docs.worldcoin.org/)
- [Tenderly Virtual TestNets](https://docs.tenderly.co/)

## 📄 License

MIT License — Hackathon Project

---

**Ready to build the future of private trading! 🚀**

**Start here:** [SUMMARY.md](SUMMARY.md) → [DEV3_QUICKSTART.md](DEV3_QUICKSTART.md)
