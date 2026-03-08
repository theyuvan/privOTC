# PrivOTC Sequence Diagram

This document provides comprehensive sequence diagrams for the PrivOTC platform, focusing on the Chainlink CRE workflow and overall system architecture.

## Table of Contents
1. [Complete End-to-End Flow](#complete-end-to-end-flow)
2. [CRE Workflow Details](#cre-workflow-details)
3. [ZK Proof Generation](#zk-proof-generation)
4. [Settlement Flow](#settlement-flow)

---

## Complete End-to-End Flow

### Full Trading Flow: World ID → ZK Proof → CRE Matching → Settlement

```mermaid
sequenceDiagram
    actor User as 👤 User
    participant MiniApp as 🌐 World Mini App<br/>(Next.js Frontend)
    participant WorldID as 🌍 World ID<br/>(IDKit)
    participant ZKCircuit as 🔐 ZK Circuit<br/>(Circom + snarkjs)
    participant API as 📡 Frontend API<br/>(/api/trade)
    participant CRE as ⚡ Chainlink CRE<br/>(TEE Environment)
    participant Orderbook as 📊 Confidential<br/>Orderbook
    participant Matching as 🎯 Matching<br/>Engine
    participant Blockchain as ⛓️ Smart Contracts<br/>(Tenderly)
    
    %% Phase 1: User Authentication & Proof Generation
    Note over User,WorldID: Phase 1: Identity Verification
    User->>MiniApp: 1. Click "Create Trade"
    MiniApp->>WorldID: 2. Request World ID verification
    WorldID->>User: 3. Show QR code / biometric prompt
    User->>WorldID: 4. Scan QR / complete verification
    WorldID->>MiniApp: 5. Return proof {merkle_root, nullifier_hash, proof}
    
    Note over User,ZKCircuit: Phase 2: ZK Balance Proof
    MiniApp->>User: 6. Request wallet signature
    User->>MiniApp: 7. Sign message with wallet
    MiniApp->>ZKCircuit: 8. Generate ZK proof<br/>{balance, requiredAmount, salt}
    ZKCircuit->>ZKCircuit: 9. Compile witness<br/>(~200ms)
    ZKCircuit->>ZKCircuit: 10. Generate Groth16 proof<br/>(~500ms)
    ZKCircuit->>MiniApp: 11. Return ZK proof<br/>{pi_a, pi_b, pi_c, publicSignals}
    
    Note over MiniApp,API: Phase 3: Trade Submission
    MiniApp->>API: 12. POST /api/trade {<br/>  worldIdProof,<br/>  zkProof,<br/>  tradeIntent {side, token, amount, price}<br/>}
    API->>API: 13. Validate request format
    API->>API: 14. Store in trade queue
    API->>MiniApp: 15. Return {tradeId, status: "pending"}
    
    Note over CRE,Orderbook: Phase 4: CRE Auto-Trigger
    CRE->>CRE: 16. Auto-trigger service polls (every 10s)
    CRE->>API: 17. GET /api/trade?drain=true
    API->>CRE: 18. Return pending trades array
    
    Note over CRE,Orderbook: Phase 5: Trade Intake (CRE Handler 0)
    CRE->>CRE: 19. Execute Handler 0 (Trade Intake)
    CRE->>WorldID: 20. Verify World ID proof<br/>(nullifier uniqueness)
    WorldID->>CRE: 21. Verification result
    CRE->>CRE: 22. Verify ZK balance proof<br/>(Groth16 verification)
    
    alt World ID or ZK Proof Invalid
        CRE->>API: 23a. POST /api/trade-status<br/>{tradeId, status: "rejected"}
        API->>MiniApp: 24a. WebSocket: Trade rejected
        MiniApp->>User: 25a. Show error message
    else Proofs Valid
        CRE->>Orderbook: 23b. Add to confidential orderbook<br/>{walletCommitment, hash(trade)}
        Orderbook->>CRE: 24b. Order stored (encrypted in TEE)
        CRE->>API: 25b. POST /api/trade-status<br/>{tradeId, status: "active"}
        API->>MiniApp: 26b. WebSocket: Trade active
    end
    
    Note over CRE,Matching: Phase 6: Matching Engine (CRE Handler 1)
    CRE->>CRE: 27. Auto-trigger matching (every 10s)
    CRE->>Matching: 28. Execute Handler 1 (Auto Matching)
    Matching->>Orderbook: 29. Query buy orders (token=ETH)
    Orderbook->>Matching: 30. Return encrypted buy orders
    Matching->>Orderbook: 31. Query sell orders (token=ETH)
    Orderbook->>Matching: 32. Return encrypted sell orders
    
    Matching->>Matching: 33. Price-time priority matching<br/>(all in TEE - stays confidential)
    
    alt No Match Found
        Matching->>CRE: 34a. Return {matches: []}
        Note over CRE: Orders stay in orderbook
    else Match Found
        Matching->>Matching: 34b. Create MatchedPair<br/>{buyOrder, sellOrder, matchPrice, matchAmount}
        Matching->>Orderbook: 35. Remove matched orders
        Matching->>API: 36. POST /api/matches {<br/>  matchId,<br/>  buyerAddress,<br/>  sellerAddress,<br/>  amount,<br/>  price<br/>}
        API->>MiniApp: 37. WebSocket: Match found!
        MiniApp->>User: 38. Notification: "Match found!"
    end
    
    Note over User,Blockchain: Phase 7: Escrow Deposits
    User->>MiniApp: 39. View match details
    MiniApp->>User: 40. Show "Deposit Escrow" button
    User->>MiniApp: 41. Click "Deposit to Escrow"
    MiniApp->>Blockchain: 42. Call depositToEscrow()<br/>{matchId, amount}
    User->>Blockchain: 43. Confirm transaction (MetaMask)
    Blockchain->>Blockchain: 44. Transfer tokens to EscrowVault
    Blockchain->>MiniApp: 45. Event: EscrowDeposited
    MiniApp->>User: 46. "Waiting for counterparty..."
    
    Note over User,Blockchain: Phase 8: Settlement Trigger
    par Buyer deposits
        Note over User: Buyer deposits their tokens
    and Seller deposits
        Note over User: Seller deposits their tokens
    end
    
    Blockchain->>Blockchain: 47. Both parties deposited ✓
    CRE->>Blockchain: 48. Poll escrow status (every 30s)
    Blockchain->>CRE: 49. Return {buyer: deposited, seller: deposited}
    CRE->>CRE: 50. Execute Handler 3 (Settlement)
    CRE->>Blockchain: 51. Call executeSettlement(matchId)
    Blockchain->>Blockchain: 52. Atomic swap:<br/>- Release buyer's tokens to seller<br/>- Release seller's tokens to buyer
    Blockchain->>MiniApp: 53. Event: TradeSettled
    MiniApp->>User: 54. 🎉 "Trade completed successfully!"
    
    Note over User,Blockchain: Phase 9: Post-Settlement
    User->>MiniApp: 55. View transaction history
    MiniApp->>Blockchain: 56. Query past trades
    Blockchain->>MiniApp: 57. Return settlement events
    MiniApp->>User: 58. Show trade history
```

---

## CRE Workflow Details

### CRE Handlers Architecture

```mermaid
sequenceDiagram
    participant AutoTrigger as 🤖 Auto-Trigger<br/>Service
    participant Handler0 as Handler 0<br/>Trade Intake
    participant Handler1 as Handler 1<br/>Auto Matching
    participant Handler2 as Handler 2<br/>Pull & Match
    participant Handler3 as Handler 3<br/>Manual Match
    participant TEE as 🔒 TEE Memory<br/>(Confidential)
    participant Frontend as 🌐 Frontend API
    participant Chain as ⛓️ Blockchain
    
    Note over AutoTrigger,Handler3: CRE runs 4 workflows in TEE environment
    
    %% Auto-Trigger Service
    rect rgb(200, 255, 200)
        Note over AutoTrigger: Auto-Trigger Service (Always Running)
        loop Every 10 seconds
            AutoTrigger->>Frontend: GET /api/trade?drain=false
            Frontend->>AutoTrigger: {buyOrders: N, sellOrders: M}
            
            alt N > 0 AND M > 0
                AutoTrigger->>Handler2: Trigger Handler 2 (Pull & Match)
            else No matching orders
                Note over AutoTrigger: Wait for next poll cycle
            end
        end
    end
    
    %% Handler 0: Trade Intake
    rect rgb(230, 230, 255)
        Note over Handler0,TEE: Handler 0: Trade Intake (On-demand)
        Frontend->>Handler0: HTTP Trigger: New trade submission
        Handler0->>Handler0: 1. Verify World ID proof
        Handler0->>Handler0: 2. Verify ZK balance proof
        
        alt Verification Failed
            Handler0->>Frontend: Return {status: "rejected", reason}
        else Verification Passed
            Handler0->>TEE: 3. Store in orderbook (encrypted)
            TEE->>Handler0: Order ID
            Handler0->>Frontend: Return {status: "active", orderId}
        end
    end
    
    %% Handler 1: Auto Matching (Deprecated - replaced by Handler 2)
    rect rgb(255, 240, 200)
        Note over Handler1: Handler 1: Auto Matching (Deprecated)<br/>Now using Handler 2 + Auto-Trigger instead
    end
    
    %% Handler 2: Pull & Match
    rect rgb(255, 220, 220)
        Note over Handler2,Chain: Handler 2: Pull & Match (Primary Matching)
        Handler2->>Frontend: 1. GET /api/trade?drain=true
        Frontend->>Handler2: 2. Return pending trades array
        
        loop For each trade
            Handler2->>Handler2: 3. Verify World ID + ZK proof
            alt Valid
                Handler2->>TEE: 4. Add to orderbook
            else Invalid
                Handler2->>Frontend: 5. POST /api/trade-status {rejected}
            end
        end
        
        Handler2->>TEE: 6. Query buy orders
        TEE->>Handler2: 7. Encrypted buy orders
        Handler2->>TEE: 8. Query sell orders
        TEE->>Handler2: 9. Encrypted sell orders
        
        Handler2->>Handler2: 10. Price-time matching algorithm<br/>(confidential in TEE)
        
        alt Matches Found
            loop For each match
                Handler2->>TEE: 11. Remove from orderbook
                Handler2->>Frontend: 12. POST /api/matches {matchDetails}
                Frontend->>Frontend: 13. Notify users via WebSocket
            end
        else No Matches
            Note over Handler2: Orders remain in orderbook
        end
    end
    
    %% Handler 3: Manual Match Trigger
    rect rgb(240, 220, 255)
        Note over Handler3,Chain: Handler 3: Manual Match (Admin/Testing)
        Frontend->>Handler3: HTTP POST /manual-match<br/>{buyOrderId, sellOrderId, apiKey}
        Handler3->>Handler3: 1. Verify admin API key
        Handler3->>TEE: 2. Get specific orders
        TEE->>Handler3: 3. Return order details
        Handler3->>Handler3: 4. Validate compatibility<br/>(price, amount, token)
        
        alt Compatible
            Handler3->>TEE: 5. Create match
            Handler3->>TEE: 6. Remove from orderbook
            Handler3->>Frontend: 7. POST /api/matches
            Handler3->>Chain: 8. Optional: Trigger settlement
        else Incompatible
            Handler3->>Frontend: 9. Return error
        end
    end
```

---

## ZK Proof Generation

### ZK Balance Proof Circuit Flow

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Wallet as 👛 Wallet
    participant Frontend as 🌐 Frontend
    participant Circuit as ⚙️ Circom Circuit<br/>(balanceProof.circom)
    participant snarkjs as 🔧 snarkjs
    participant Storage as 💾 Storage<br/>(zkey, wasm)
    
    Note over User,Storage: ZK Proof Generation (Client-Side)
    
    User->>Frontend: 1. Enter trade details<br/>{side: "buy", token: "ETH", amount: "1.0"}
    Frontend->>User: 2. Prompt for wallet signature
    User->>Wallet: 3. Sign message
    Wallet->>Frontend: 4. Return signature + address
    
    Frontend->>Wallet: 5. Query token balance
    Wallet->>Frontend: 6. Return actual balance (e.g., "2.5 ETH")
    
    Note over Frontend,Circuit: Prepare Circuit Inputs
    Frontend->>Frontend: 7. Generate salt (random 32 bytes)
    Frontend->>Frontend: 8. Calculate walletCommitment<br/>Poseidon(walletAddress, salt)
    Frontend->>Frontend: 9. Convert to field elements<br/>- balance: 2500000000000000000 (wei)<br/>- requiredAmount: 1000000000000000000 (wei)
    
    Frontend->>Circuit: 10. Prepare witness inputs {<br/>  walletAddress: address,<br/>  actualBalance: 2500000000000000000,<br/>  requiredAmount: 1000000000000000000,<br/>  tokenAddress: 0x...,<br/>  salt: randomSalt,<br/>  timestamp: Date.now()<br/>}
    
    Circuit->>Circuit: 11. Execute circuit logic:<br/>signal sufficient = (actualBalance >= requiredAmount)<br/>signal walletCommitment = Poseidon(walletAddress, salt)<br/>signal proofHash = Poseidon(all inputs)
    
    Circuit->>Circuit: 12. Generate witness.wtns<br/>(~200ms)
    
    Circuit->>Storage: 13. Load proving key (zkey)<br/>balanceProof_final.zkey (~10MB)
    Storage->>Circuit: 14. Return zkey
    
    Circuit->>snarkjs: 15. groth16.prove(zkey, witness)
    snarkjs->>snarkjs: 16. Generate proof (~500ms)<br/>Uses BN254 elliptic curve
    snarkjs->>snarkjs: 17. Calculate public signals:<br/>- balance_sufficient (0 or 1)<br/>- walletCommitment (hash)<br/>- proofHash (unique ID)<br/>- requiredAmount<br/>- timestamp
    
    snarkjs->>Frontend: 18. Return {<br/>  proof: {pi_a, pi_b, pi_c},<br/>  publicSignals: [...5 signals]<br/>}
    
    Note over Frontend: Proof Generated ✓
    Frontend->>Frontend: 19. Package trade submission {<br/>  worldIdProof,<br/>  zkProof,<br/>  tradeIntent<br/>}
    
    Frontend->>User: 20. Show "Submitting trade..."
    
    Note over Circuit,snarkjs: Proof can be verified:<br/>1. On-chain (gas expensive ~300k gas)<br/>2. Off-chain in CRE (recommended)
```

### ZK Proof Verification in CRE

```mermaid
sequenceDiagram
    participant CRE as ⚡ CRE Handler
    participant snarkjs as 🔧 snarkjs
    participant VKey as 🔑 Verification Key
    participant Chain as ⛓️ Smart Contract<br/>(Optional)
    
    Note over CRE,VKey: ZK Proof Verification in TEE
    
    CRE->>CRE: 1. Receive ZK proof from trade submission
    CRE->>VKey: 2. Load verification key<br/>verification_key.json (~2KB)
    VKey->>CRE: 3. Return vkey
    
    CRE->>CRE: 4. Extract public signals:<br/>- balance_sufficient<br/>- walletCommitment<br/>- proofHash<br/>- requiredAmount<br/>- timestamp
    
    CRE->>CRE: 5. Verify timestamp (within 5 min)
    CRE->>CRE: 6. Verify requiredAmount matches trade
    
    CRE->>snarkjs: 7. groth16.verify(<br/>  vkey,<br/>  publicSignals,<br/>  proof<br/>)
    
    snarkjs->>snarkjs: 8. Verify elliptic curve points<br/>(pairing check on BN254)
    snarkjs->>snarkjs: 9. Verify public signals hash
    
    alt Verification Successful
        snarkjs->>CRE: 10a. Return true
        CRE->>CRE: 11a. Check balance_sufficient === 1
        
        alt Sufficient Balance
            CRE->>CRE: 12a. ✅ Accept trade
        else Insufficient Balance
            CRE->>CRE: 12b. ❌ Reject (insufficient funds)
        end
    else Verification Failed
        snarkjs->>CRE: 10b. Return false
        CRE->>CRE: 11b. ❌ Reject (invalid proof)
    end
    
    Note over Chain: Optional: On-chain verification<br/>(only for settlement, not intake)
    alt On-chain verification needed
        CRE->>Chain: 13. Call verifyProof(proof, publicSignals)
        Chain->>Chain: 14. Pairing check (expensive!)
        Chain->>CRE: 15. Return verification result
    end
```

---

## Settlement Flow

### Atomic Settlement with Escrow

```mermaid
sequenceDiagram
    participant Buyer as 👤 Buyer
    participant Seller as 👤 Seller
    participant Frontend as 🌐 Frontend
    participant Escrow as 📦 EscrowVault<br/>Contract
    participant Settlement as ⚖️ OTCSettlement<br/>Contract
    participant CRE as ⚡ CRE<br/>Settlement Handler
    participant Events as 📢 Event Log
    
    Note over Buyer,Events: Settlement Flow (After Match Found)
    
    %% Match notification
    CRE->>Frontend: 1. Match created {matchId, buyer, seller, amount}
    Frontend->>Buyer: 2. "Match found! Deposit escrow"
    Frontend->>Seller: 3. "Match found! Deposit escrow"
    
    %% Phase 1: Escrow Deposits
    Note over Buyer,Escrow: Phase 1: Dual Escrow Deposits
    
    par Buyer deposits
        Buyer->>Frontend: 4a. Click "Deposit Escrow"
        Frontend->>Buyer: 5a. Prompt wallet approve
        Buyer->>Escrow: 6a. Approve token spend
        Buyer->>Settlement: 7a. depositToEscrow(matchId, amount)
        Settlement->>Escrow: 8a. transferFrom(buyer, escrow, amount)
        Escrow->>Escrow: 9a. Store: deposits[matchId][buyer] = amount
        Escrow->>Events: 10a. Emit EscrowDeposited(matchId, buyer)
        Events->>Frontend: 11a. Event notification
        Frontend->>Buyer: 12a. ✅ "Deposited! Waiting for seller..."
    and Seller deposits
        Seller->>Frontend: 4b. Click "Deposit Escrow"
        Frontend->>Seller: 5b. Prompt wallet approve
        Seller->>Escrow: 6b. Approve token spend
        Seller->>Settlement: 7b. depositToEscrow(matchId, amount)
        Settlement->>Escrow: 8b. transferFrom(seller, escrow, amount)
        Escrow->>Escrow: 9b. Store: deposits[matchId][seller] = amount
        Escrow->>Events: 10b. Emit EscrowDeposited(matchId, seller)
        Events->>Frontend: 11b. Event notification
        Frontend->>Seller: 12b. ✅ "Deposited! Waiting for buyer..."
    end
    
    %% Phase 2: Settlement Trigger
    Note over CRE,Settlement: Phase 2: Automatic Settlement
    
    loop Poll every 30 seconds
        CRE->>Settlement: 13. checkEscrowStatus(matchId)
        Settlement->>Escrow: 14. getDeposits(matchId, buyer, seller)
        Escrow->>Settlement: 15. Return {buyerDeposit, sellerDeposit}
        Settlement->>CRE: 16. Return deposit status
        
        alt Both Deposited
            CRE->>CRE: 17. ✅ Ready for settlement!
            Note over CRE: Break loop
        else One or both not deposited
            Note over CRE: Continue polling
        end
    end
    
    %% Phase 3: Execute Settlement
    Note over CRE,Settlement: Phase 3: Atomic Settlement Execution
    
    CRE->>Settlement: 18. executeSettlement(matchId)<br/>{buyer, seller, amount}
    
    Settlement->>Settlement: 19. Validate match exists
    Settlement->>Settlement: 20. Check not already settled
    Settlement->>Settlement: 21. Verify deposits exist
    
    Settlement->>Escrow: 22. Atomic swap execution
    
    rect rgb(200, 255, 200)
        Note over Escrow: CRITICAL: All-or-nothing transaction
        Escrow->>Escrow: 23. releaseToRecipient(buyer → seller, amount)
        Escrow->>Escrow: 24. releaseToRecipient(seller → buyer, amount)
        Escrow->>Escrow: 25. Mark deposits as released
    end
    
    alt Settlement Successful
        Settlement->>Settlement: 26a. Update match status = "settled"
        Settlement->>Events: 27a. Emit TradeSettled(matchId)
        Events->>Frontend: 28a. Event notification
        Frontend->>Buyer: 29a. 🎉 "Trade completed!"
        Frontend->>Seller: 30a. 🎉 "Trade completed!"
        Settlement->>CRE: 31a. Return success
    else Settlement Failed
        Settlement->>Settlement: 26b. Revert transaction
        Settlement->>Escrow: 27b. refundDeposits(buyer, seller)
        Escrow->>Buyer: 28b. Return buyer's deposit
        Escrow->>Seller: 29b. Return seller's deposit
        Events->>Frontend: 30b. Event: SettlementFailed
        Frontend->>Buyer: 31b. ⚠️ "Settlement failed - funds returned"
        Frontend->>Seller: 32b. ⚠️ "Settlement failed - funds returned"
    end
    
    %% Phase 4: Post-Settlement
    Note over Buyer,Events: Phase 4: Confirmation & History
    
    par Buyer confirms
        Buyer->>Frontend: 33a. View trade history
        Frontend->>Settlement: 34a. Query events
        Settlement->>Frontend: 35a. Return settlement details
        Frontend->>Buyer: 36a. Show completed trade
    and Seller confirms
        Seller->>Frontend: 33b. View trade history
        Frontend->>Settlement: 34b. Query events
        Settlement->>Frontend: 35b. Return settlement details
        Frontend->>Seller: 36b. Show completed trade
    end
```

### Settlement Security Mechanisms

```mermaid
flowchart TD
    Start([Match Created]) --> CheckEscrow{Both parties<br/>deposited?}
    
    CheckEscrow -->|No| Wait[Wait 30s<br/>Poll again]
    Wait --> CheckTimeout{Timeout<br/>reached?}
    CheckTimeout -->|No| CheckEscrow
    CheckTimeout -->|Yes| Refund[Refund deposits<br/>to both parties]
    Refund --> End1([Match Expired])
    
    CheckEscrow -->|Yes| ValidateMatch{Match details<br/>valid?}
    ValidateMatch -->|No| Reject[Reject settlement]
    Reject --> End2([Settlement Failed])
    
    ValidateMatch -->|Yes| CheckStatus{Already<br/>settled?}
    CheckStatus -->|Yes| Duplicate[Prevent duplicate]
    Duplicate --> End3([Already Settled])
    
    CheckStatus -->|No| AtomicSwap[Execute Atomic Swap:<br/>1. Buyer → Seller<br/>2. Seller → Buyer]
    AtomicSwap --> SwapSuccess{Swap<br/>successful?}
    
    SwapSuccess -->|No| Revert[Revert transaction<br/>Refund deposits]
    Revert --> End4([Settlement Reverted])
    
    SwapSuccess -->|Yes| Emit[Emit TradeSettled event]
    Emit --> UpdateDB[Update match status]
    UpdateDB --> Notify[Notify both parties]
    Notify --> End5([✅ Settlement Complete])
    
    style Start fill:#e1f5fe
    style End5 fill:#c8e6c9
    style End1 fill:#fff9c4
    style End2 fill:#ffccbc
    style End3 fill:#fff9c4
    style End4 fill:#ffccbc
    style AtomicSwap fill:#b3e5fc
    style Refund fill:#ffe0b2
```

---

## System Architecture Overview

### Complete System Map

```mermaid
graph TB
    subgraph Users["👥 Users"]
        Buyer["👤 Buyer"]
        Seller["👤 Seller"]
    end
    
    subgraph Frontend["🌐 Frontend (Next.js)"]
        MiniApp["World Mini App"]
        WorldIDKit["World ID Kit"]
        ZKGen["ZK Proof Generator<br/>(Client-side)"]
        WalletConnect["Wallet Connection<br/>(RainbowKit)"]
    end
    
    subgraph APIs["📡 API Layer"]
        TradeAPI["/api/trade<br/>(Submit trades)"]
        MatchAPI["/api/matches<br/>(Match results)"]
        StatusAPI["/api/trade-status<br/>(Status updates)"]
    end
    
    subgraph CRE["⚡ Chainlink CRE (TEE Environment)"]
        AutoTrigger["Auto-Trigger Service<br/>(Polls every 10s)"]
        Handler0["Handler 0:<br/>Trade Intake"]
        Handler2["Handler 2:<br/>Pull & Match"]
        Handler3["Handler 3:<br/>Manual Match"]
        Orderbook["Confidential Orderbook<br/>(Encrypted in TEE)"]
        MatchEngine["Matching Algorithm<br/>(Price-time priority)"]
    end
    
    subgraph Blockchain["⛓️ Smart Contracts (Tenderly)"]
        Settlement["OTCSettlement<br/>(Orchestrator)"]
        Escrow["EscrowVault<br/>(Token custody)"]
        Verifier["BalanceVerifier<br/>(ZK verification)"]
    end
    
    subgraph External["🌍 External Services"]
        WorldIDService["World ID API<br/>(Proof verification)"]
    end
    
    %% User interactions
    Buyer --> MiniApp
    Seller --> MiniApp
    
    %% Frontend connections
    MiniApp --> WorldIDKit
    MiniApp --> ZKGen
    MiniApp --> WalletConnect
    MiniApp --> TradeAPI
    MiniApp --> MatchAPI
    
    %% World ID verification
    WorldIDKit --> WorldIDService
    
    %% API to CRE
    TradeAPI --> Handler0
    AutoTrigger --> TradeAPI
    AutoTrigger --> Handler2
    
    %% CRE internal flow
    Handler0 --> Orderbook
    Handler2 --> Orderbook
    Handler2 --> MatchEngine
    Handler3 --> Orderbook
    MatchEngine --> MatchAPI
    
    %% CRE to blockchain
    MatchAPI --> Settlement
    Handler0 --> WorldIDService
    
    %% Smart contract interactions
    Settlement --> Escrow
    Settlement --> Verifier
    WalletConnect --> Settlement
    WalletConnect --> Escrow
    
    %% Styling
    classDef userClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef frontendClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef creClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef blockchainClass fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef externalClass fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    class Buyer,Seller userClass
    class MiniApp,WorldIDKit,ZKGen,WalletConnect frontendClass
    class AutoTrigger,Handler0,Handler2,Handler3,Orderbook,MatchEngine creClass
    class Settlement,Escrow,Verifier blockchainClass
    class WorldIDService externalClass
```

---

## Performance & Security Notes

### Timing Benchmarks

| Operation | Time | Environment |
|-----------|------|-------------|
| World ID verification | ~2-5s | User device + API |
| ZK witness generation | ~200ms | Client-side (browser) |
| ZK proof generation | ~500ms | Client-side (browser) |
| ZK proof verification | ~50ms | CRE (TEE) |
| On-chain ZK verification | ~300k gas (~$15) | Smart contract (avoided!) |
| CRE matching execution | ~100-200ms | TEE |
| Escrow deposit tx | ~15s | Blockchain confirmation |
| Settlement execution | ~15s | Blockchain confirmation |

### Security Layers

1. **Sybil Resistance**: World ID (one trade per human)
2. **Privacy**: ZK proofs (balance hidden) + CRE TEE (matching hidden)
3. **Atomic Settlement**: All-or-nothing escrow swaps
4. **Proof Uniqueness**: nullifier_hash prevents replay attacks
5. **Time-bound Proofs**: ZK proofs expire after 5 minutes

---

## Integration Points

### Frontend → CRE
- **Endpoint**: POST `/api/trade`
- **Authentication**: World ID proof + ZK proof
- **Response**: Trade ID + status

### CRE → Smart Contracts
- **Method**: `executeSettlement(matchId, buyer, seller, amount)`
- **Gas Limit**: ~300k gas
- **Success Event**: `TradeSettled`

### CRE → Frontend
- **Endpoint**: POST `/api/matches`
- **Payload**: Match details for notification
- **WebSocket**: Real-time updates to users

---

## Error Handling

```mermaid
flowchart TD
    Start([Trade Submitted]) --> ValidateFormat{Valid<br/>format?}
    ValidateFormat -->|No| Err1[❌ 400 Bad Request]
    ValidateFormat -->|Yes| ValidateWorldID{World ID<br/>valid?}
    
    ValidateWorldID -->|No| Err2[❌ World ID failed]
    ValidateWorldID -->|Yes| ValidateZK{ZK proof<br/>valid?}
    
    ValidateZK -->|No| Err3[❌ ZK verification failed]
    ValidateZK -->|Yes| CheckDuplicate{Nullifier<br/>used before?}
    
    CheckDuplicate -->|Yes| Err4[❌ Duplicate trade<br/>Sybil detected]
    CheckDuplicate -->|No| CheckBalance{Sufficient<br/>balance?}
    
    CheckBalance -->|No| Err5[❌ Insufficient funds]
    CheckBalance -->|Yes| AddToOrderbook[✅ Add to orderbook]
    
    AddToOrderbook --> MatchAttempt{Match<br/>found?}
    MatchAttempt -->|No| Pending[⏳ Order pending]
    MatchAttempt -->|Yes| EscrowCheck{Both<br/>deposited?}
    
    EscrowCheck -->|No| WaitTimeout{Timeout?}
    WaitTimeout -->|Yes| Err6[❌ Timeout - Refund]
    WaitTimeout -->|No| EscrowCheck
    
    EscrowCheck -->|Yes| Settlement[Execute Settlement]
    Settlement --> SettlementSuccess{Success?}
    
    SettlementSuccess -->|No| Err7[❌ Settlement failed<br/>Refund both]
    SettlementSuccess -->|Yes| Complete[✅ Trade Complete]
    
    style Start fill:#e1f5fe
    style Complete fill:#c8e6c9
    style Pending fill:#fff9c4
    style Err1 fill:#ffccbc
    style Err2 fill:#ffccbc
    style Err3 fill:#ffccbc
    style Err4 fill:#ffccbc
    style Err5 fill:#ffccbc
    style Err6 fill:#ffccbc
    style Err7 fill:#ffccbc
```

---

## Deployment Workflow

```mermaid
sequenceDiagram
    participant Dev as 👨‍💻 Developer
    participant CLI as 🔧 CRE CLI
    participant Platform as ⚡ CRE Platform
    participant DON as 🌐 Decentralized<br/>Oracle Network
    participant Monitoring as 📊 Monitoring<br/>Dashboard
    
    Note over Dev,DON: CRE Workflow Deployment
    
    Dev->>CLI: 1. cre workflow init privotc
    CLI->>Dev: 2. Generate workflow template
    
    Dev->>Dev: 3. Implement handlers<br/>(Handler 0, 1, 2, 3)
    Dev->>Dev: 4. Configure privotc-config.json
    
    Dev->>CLI: 5. cre workflow simulate . --target staging
    CLI->>CLI: 6. Run local simulation
    CLI->>Dev: 7. Simulation results
    
    Dev->>CLI: 8. cre workflow deploy --target production
    CLI->>Platform: 9. Upload workflow code
    Platform->>Platform: 10. Validate code
    Platform->>DON: 11. Deploy to TEE nodes
    
    DON->>DON: 12. Provision SGX enclaves
    DON->>DON: 13. Load workflow code
    DON->>Platform: 14. Deployment confirmation
    
    Platform->>Monitoring: 15. Setup monitoring
    Platform->>CLI: 16. Deployment successful
    CLI->>Dev: 17. Show workflow URL + ID
    
    Note over Dev,Monitoring: Post-Deployment
    Dev->>Monitoring: 18. View logs & metrics
    Monitoring->>Dev: 19. Show execution stats
```

---

## References

- **CRE Documentation**: https://docs.chain.link/cre
- **World ID Docs**: https://docs.worldcoin.org/id
- **Circom Documentation**: https://docs.circom.io
- **snarkjs Guide**: https://github.com/iden3/snarkjs

---

*Last Updated: March 8, 2026*
*Project: PrivOTC - Privacy-Preserving OTC Trading*
*Tech Stack: World ID + Chainlink CRE + ZK-SNARKs + Tenderly*
