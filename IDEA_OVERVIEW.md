# PrivOTC — Human-Verified Confidential OTC Trading Protocol

> **One-Line Pitch:** PrivOTC is a human-verified decentralized dark pool that enables confidential institutional crypto trading using Chainlink CRE workflows, World ID identity proofs, and Tenderly Virtual TestNets for verifiable execution.

---

## 1. Problem Statement

Large cryptocurrency trades today cannot safely happen on public decentralized exchanges.

When institutions or high-net-worth traders execute large trades on platforms like Binance or Coinbase:

- Trade intent becomes publicly visible
- Market prices move before execution
- MEV bots front-run transactions
- Wallets and strategies become traceable

Existing OTC desks solve this partially by moving trades off-exchange, but introduce new problems:

- Centralized brokers must be trusted
- Trade details are visible to intermediaries
- Counterparty risk exists
- Settlement is manual and non-programmable

> **DeFi currently lacks a trustless, privacy-preserving institutional trading layer.**

---

## 2. Proposed Solution

PrivOTC is a decentralized confidential OTC trading protocol that enables buyers and sellers to privately negotiate and settle large crypto trades **without exposing trade intent, pricing, or identities on-chain**.

The system combines:

| Component | Role |
|---|---|
| ✅ **World ID** | Proves users are real humans |
| ✅ **Chainlink CRE** | Confidential workflow orchestration |
| ✅ **Confidential Compute** | Private trade matching |
| ✅ **Tenderly Virtual TestNets** | Realistic multichain testing |

Only the final settlement proof is written on-chain — all sensitive computation remains private.

---

## 3. Key Innovation

Instead of trusting brokers for privacy:

- Privacy is **guaranteed through cryptography and confidential execution**
- PrivOTC acts as a **decentralized crypto dark pool**, enabling institutional-grade trading in DeFi

---

## 4. System Overview

### High-Level Flow

```
User → Web App (Next.js)
        ↓
World ID Verification
        ↓
ZK Proof of Funds
        ↓
Chainlink CRE Workflow
        ↓
Confidential Matching Engine
        ↓
Escrow Locking
        ↓
Atomic Settlement
        ↓
On-chain Proof
```

---

## 5. How Chainlink CRE Is Used

Chainlink Runtime Environment (CRE) acts as the **core orchestration layer**.

CRE manages:
- ✅ Workflow automation
- ✅ Confidential computation
- ✅ External integrations (Confidential HTTP)
- ✅ Verifiable execution

### CRE Responsibilities

#### 1. Trade Intent Processing
Encrypted orders are received and routed securely.

#### 2. Confidential Matching
Matching logic executes inside confidential compute. No public exposure occurs.

```python
if buyer.price >= seller.price:
    match trade
```

#### 3. Proof Generation
CRE generates a verifiable execution proof without revealing trade data.

#### 4. Settlement Coordination
CRE triggers smart contract execution on-chain via EVM client.

---

## 6. How World ID Is Used

World ID provides **Sybil resistance** to the OTC market.

### Problem Solved
OTC markets suffer from:
- Fake liquidity
- Bot manipulation
- Spoof trading

### Integration Flow

1. User opens the **PrivOTC web app**
2. User verifies using **World ID** (IDKit)
3. Proof sent to CRE workflow
4. CRE validates proof + ZK balance proof
5. Only verified humans can trade

### Result

| Property | Status |
|---|---|
| Human | ✅ |
| Identity Hidden | ✅ |
| Bot Access | ❌ |

---

## 7. How Tenderly Virtual TestNets Are Used

Institutional workflows are difficult to test on public testnets. **Tenderly Virtual TestNets** allow:

- ✅ Mainnet state replication
- ✅ Real liquidity simulation
- ✅ Unlimited gas
- ✅ Transaction debugging

### Usage in PrivOTC

We fork Ethereum mainnet state to get realistic token balances and contract conditions.

CRE workflows execute OTC settlements using real protocol conditions.

Judges can verify **transaction history**, **workflow execution**, and **contract interaction** through Tenderly Explorer links.

---

## 8. Technical Architecture

### Components

```
┌─────────────────────────────────────────────────────┐
│                     FRONTEND                        │
│         Next.js Web App · Trade UI · Wallet         │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│                  IDENTITY LAYER                     │
│        World ID Verification · Proof via CRE        │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│             OFFCHAIN LAYER (CORE)                   │
│   Chainlink CRE · Confidential Compute · Matching   │
└─────────────────────────────────────────────────────┘
                          ↓
┌──────────────────┐              ┌───────────────────┐
│  STORAGE LAYER   │              │  SMART CONTRACTS  │
│ Encrypted intents│              │ Escrow · Settlement│
│ On-chain hashes  │              │ Proof Verifier    │
└──────────────────┘              └───────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│                  TESTING LAYER                      │
│           Tenderly Virtual TestNet Forks            │
└─────────────────────────────────────────────────────┘
```

---

## 9. Detailed Workflow

### Step 1 — Private Trade Submission
- User submits: *Buy 1000 ETH @ X price*
- Data encrypted client-side
- Only hash stored on-chain

### Step 2 — Human Verification
- World ID proof verified via CRE
- Non-human participants rejected

### Step 3 — Confidential Matching
CRE confidential runtime:
- Decrypts intents
- Runs matching algorithm
- Selects counterparties

Invisible externally.

### Step 4 — Proof of Funds
- Participants lock assets into escrow contracts
- Ensures real liquidity

### Step 5 — Settlement Execution
CRE triggers atomic swap:
- **Buyer** → WLD (locked in escrow)
- **Seller** → ETH (locked in escrow)

Executed on Tenderly Virtual TestNet (Ethereum fork).

### Step 6 — Public Confirmation
Blockchain records:
- Settlement proof
- Timestamp
- Transaction hash

Sensitive data remains hidden.

---

## 10. How It Differs From Existing Platforms

| Feature | Traditional OTC | PrivOTC |
|---|---|---|
| Broker Required | ✅ | ❌ |
| Trade Intent Visible | ✅ | ❌ |
| Trust Needed | High | Minimal |
| Matching | Human | Confidential Compute |
| Bot Resistance | ❌ | ✅ World ID |
| Settlement | Manual | Automated |
| Privacy Guarantee | Organizational | Cryptographic |

---

## 11. Real-World Impact

PrivOTC enables:

- 🏦 Institutional DeFi adoption
- 🛡️ MEV-resistant trading
- 🔒 Confidential treasury operations
- ⚖️ Fair large-volume trading

---

## 12. Demo Scenario (Hackathon)

1. User verifies via **World ID**
2. Buyer submits private order
3. Seller submits private order
4. **CRE workflow** executes matching
5. Trade settles on **Tenderly Virtual TestNet**
6. Explorer shows verified execution

---

## 13. Hackathon Track Alignment

| Track | Fit |
|---|---|
| ✅ Chainlink Privacy Track | Confidential compute + CRE + ConfidentialHTTPClient |
| ✅ World ID + CRE | Human verification (IDKit) integrated into CRE workflow |
| ✅ Tenderly Virtual TestNet | Full demo execution on Ethereum Virtual TestNet |

> One unified architecture satisfies **all** track requirements.

---

## 14. Team Notes

- **Date:** March 2, 2026
- **Status:** Hackathon Idea — In Development
- **Stack:** World ID · Chainlink CRE · Tenderly · Solidity · EVM
