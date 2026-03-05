# PrivOTC Smart Contracts

> Human-Verified Confidential OTC Trading Protocol - Smart Contract Layer

This package contains the core smart contracts for PrivOTC, including escrow management, settlement execution, and World ID proof verification.

## 📋 Overview

PrivOTC enables institutional-grade OTC crypto trading with:
- ✅ **Human verification** via World ID
- ✅ **Confidential trade matching** via Chainlink CRE
- ✅ **Secure escrow** with timeout protection
- ✅ **Atomic settlements** with replay attack prevention
- ✅ **Multichain support** (Ethereum, Base)

## 🏗️ Architecture

```
┌──────────────────┐
│  ProofVerifier   │  ← World ID verification + settlement proof storage
└────────┬─────────┘
         │
┌────────▼─────────┐
│  EscrowVault     │  ← Holds funds during matching
└────────┬─────────┘
         │
┌────────▼─────────┐
│  OTCSettlement   │  ← Executes atomic swaps (triggered by CRE)
└──────────────────┘
```

## 📦 Contracts

### 1. EscrowVault.sol

Manages fund custody during trade matching.

**Key Functions:**
- `deposit(tradeId, token, amount, expiryTime)` — Lock funds for a trade
- `release(tradeId, recipient)` — Release funds to recipient (settlement contract only)
- `refund(tradeId)` — Return funds after expiry
- `getBalance(tradeId)` — Check locked amount

**Features:**
- Supports both ETH and ERC20 tokens
- Automatic timeout protection (default: 24 hours)
- Reentrancy protection
- Admin-controlled settlement contract authorization

### 2. OTCSettlement.sol

Executes atomic swaps between buyer and seller.

**Key Functions:**
- `settle(tradeId, buyer, seller, tokens, amounts)` — Execute atomic swap
- `setCREExecutor(address)` — Set authorized CRE service address
- `generateEscrowId(tradeId, participant)` — Generate deterministic escrow IDs

**Features:**
- Only callable by authorized CRE executor
- Validates escrow balances before execution
- Prevents double settlement
- Immutable escrow vault reference

### 3. ProofVerifier.sol

Verifies World ID proofs and records settlement proofs.

**Key Functions:**
- `verifyHuman(signal, root, nullifierHash, proof)` — Verify World ID proof
- `verifySettlement(tradeId, proofHash)` — Record settlement proof on-chain
- `isNullifierUsed(nullifierHash)` — Check if nullifier has been used

**Features:**
- Integrated with World ID Router (v3.0)
- Prevents nullifier reuse (sybil resistance)
- Supports both Ethereum and Base chains
- Immutable World ID router and external nullifier

## 🚀 Setup

### Prerequisites

```bash
node >= 18.0.0
npm >= 9.0.0
```

### Installation

```bash
cd contracts
npm install
```

### Configuration

Create `.env` file:

```env
# Tenderly Virtual TestNets
TENDERLY_ACCESS_TOKEN=your_token
TENDERLY_ETHEREUM_RPC=https://virtual.mainnet.rpc.tenderly.co/...
TENDERLY_BASE_RPC=https://virtual.base.rpc.tenderly.co/...

# World ID
WORLD_APP_ID=app_staging_xxx
WORLD_ID_ACTION=verify-otc-trader

# Deployer
PRIVATE_KEY=0x...
```

## 🧪 Testing

Run all tests:

```bash
npm test
```

Run specific test file:

```bash
npx hardhat test test/EscrowVault.test.js
npx hardhat test test/OTCSettlement.test.js
npx hardhat test test/ProofVerifier.test.js
```

Run with gas reporting:

```bash
REPORT_GAS=true npm test
```

Run with coverage:

```bash
npx hardhat coverage
```

## 📊 Test Coverage

```
  EscrowVault
    ✔ Deployment (2 tests)
    ✔ Settlement Contract Management (2 tests)
    ✔ ETH Deposits (3 tests)
    ✔ ERC20 Deposits (3 tests)
    ✔ Release (4 tests)
    ✔ Refund (3 tests)
    ✔ View Functions (3 tests)

  OTCSettlement
    ✔ Deployment (3 tests)
    ✔ CRE Executor Management (3 tests)
    ✔ Settlement (7 tests)
    ✔ View Functions (3 tests)

  ProofVerifier
    ✔ Deployment (5 tests)
    ✔ Human Verification (4 tests)
    ✔ View-only Verification (3 tests)
    ✔ Settlement Proof Recording (4 tests)
    ✔ Nullifier Management (2 tests)

  54 passing (2s)
```

## 🚢 Deployment

### Local Testing

```bash
npx hardhat run scripts/deploy.js --network hardhat
```

### Tenderly Virtual TestNets

Deploy to Ethereum fork:

```bash
npm run deploy:tenderly-eth
```

Deploy to Base fork:

```bash
npm run deploy:tenderly-base
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🔗 Contract Addresses

### Tenderly Ethereum Fork

```
EscrowVault:    0x...
OTCSettlement:  0x...
ProofVerifier:  0x...
```

### Tenderly Base Fork

```
EscrowVault:    0x...
OTCSettlement:  0x...
ProofVerifier:  0x...
```

*(Will be populated after deployment)*

## 🌐 World ID Integration

PrivOTC integrates World ID for human verification:

### Supported Networks

| Network | World ID Router |
|---|---|
| Ethereum | `0x469449f251692e0779667583026b5a1e99512157` |
| Base | `0xBCC7e5914a109e6001C6B3c18a13A8D849D9F8F4163` |
| World Chain | `0x17B354dD...A278` |

### Usage

1. User generates World ID proof in World Mini App
2. Proof submitted to `ProofVerifier.verifyHuman()`
3. Nullifier stored to prevent reuse
4. User can now participate in OTC trades

## 🔐 Security Features

- ✅ **Reentrancy Protection** — All state-changing functions protected
- ✅ **Access Control** — Role-based permissions (Ownable)
- ✅ **Nullifier Tracking** — Prevents double-spending of World ID proofs
- ✅ **Timeout Protection** — Automatic refunds after expiry
- ✅ **Input Validation** — Zero address and zero amount checks
- ✅ **Replay Protection** — Settlement can only occur once per trade

## 📝 Contract ABIs

ABIs are available in `artifacts/contracts/` after compilation:

```
artifacts/contracts/EscrowVault.sol/EscrowVault.json
artifacts/contracts/OTCSettlement.sol/OTCSettlement.json
artifacts/contracts/ProofVerifier.sol/ProofVerifier.json
```

## 🔧 Hardhat Tasks

Compile contracts:

```bash
npx hardhat compile
```

Clean artifacts:

```bash
npx hardhat clean
```

Run Hardhat console:

```bash
npx hardhat console --network tenderly-ethereum
```

## 👥 For Other Developers

### Dev 2 (Frontend)

**What you need:**
- Contract addresses (see deployment files in `deployments/`)
- Contract ABIs (in `artifacts/contracts/`)
- RPC URLs (in `.env`)

**Key integrations:**
- Call `ProofVerifier.verifyHuman()` after World ID verification
- Generate escrow IDs using: `keccak256(abi.encodePacked(tradeId, userAddress))`
- Call `EscrowVault.deposit()` to lock funds
- Poll `OTCSettlement.isSettled()` for settlement status

### Dev 3 (CRE)

**What you need:**
- Contract addresses and ABIs
- Set your CRE service address using `OTCSettlement.setCREExecutor()`

**Key integrations:**
- Call `EscrowVault.getBalance()` to verify funds before matching
- Call `OTCSettlement.settle()` to execute trades
- Call `ProofVerifier.verifySettlement()` to record proof on-chain

## 🛠️ Development

### Project Structure

```
contracts/
├── contracts/
│   ├── EscrowVault.sol
│   ├── OTCSettlement.sol
│   ├── ProofVerifier.sol
│   ├── interfaces/
│   │   └── IWorldID.sol
│   ├── helpers/
│   │   └── ByteHasher.sol
│   └── test/
│       ├── MockERC20.sol
│       └── MockWorldID.sol
├── test/
│   ├── EscrowVault.test.js
│   ├── OTCSettlement.test.js
│   └── ProofVerifier.test.js
├── scripts/
│   └── deploy.js
├── deployments/
├── hardhat.config.js
├── tenderly.yaml
└── package.json
```

### Adding New Features

1. Write contract code in `contracts/`
2. Add tests in `test/`
3. Run tests: `npm test`
4. Update deployment script if needed
5. Document in this README

## 📚 Resources

- [Tenderly Virtual TestNets](https://docs.tenderly.co/virtual-testnets)
- [World ID Documentation](https://docs.world.org/world-id)
- [Chainlink CRE](https://docs.chain.link/chainlink-functions)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

## 🐛 Known Issues

None currently. All 54 tests passing.

## 📄 License

MIT

---

**Built for Chainlink Hackathon 2026** 🏆
