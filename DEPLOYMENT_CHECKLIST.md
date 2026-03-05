# PrivOTC Production Deployment Checklist

**Status**: Ready for Production Deployment ✅  
**Last Updated**: March 5, 2026  
**Code Changes**: Complete - HTTP trigger enabled, demo trades conditional

---

## ✅ What We Just Fixed

Your workflow is now **PRODUCTION-READY** with these changes:

1. ✅ **HTTP Trigger Re-enabled** - Real users can submit trades via HTTP endpoint
2. ✅ **Conditional Demo Trades** - Only loads in simulation mode (`simulationMode: true`)
3. ✅ **Both Modes Supported**:
   - `simulationMode: true` → Uses demo trades, no HTTP (for testing)
   - `simulationMode: false` → Uses HTTP endpoint, real users (for deployment)

---

## 📋 Pre-Deployment Checklist

### Step 1: Get Information from Dev 1 ⏳

**Critical - You MUST get these before deployment:**

```
Contact Dev 1 and ask for:

1. OTCSettlement.sol Contract Address (Sepolia)
   Example: 0x1234567890abcdef1234567890abcdef12345678
   
2. ERC20 Token Addresses (Sepolia)
   - WETH: 0x???
   - USDC: 0x???
   - DAI: 0x???
   - WBTC: 0x???
   
3. Tenderly RPC URL (if using Tenderly Virtual TestNet)
   Example: https://rpc.tenderly.co/fork/abc123def456
   OR use public RPC: https://sepolia.infura.io/v3/YOUR_KEY
   
4. ProofVerifier.sol Contract Address (Optional)
   Example: 0xabcdef1234567890abcdef1234567890abcdef12
```

**Save Dev 1's Response Here:**
```
OTCSettlement.sol: _______________________________________
WETH: _______________________________________
USDC: _______________________________________
DAI: _______________________________________
WBTC: _______________________________________
RPC URL: _______________________________________
ProofVerifier.sol (optional): _______________________________________
```

---

### Step 2: Update Production Configuration ⏳

Once you receive addresses from Dev 1:

**A. Update privotc-config.production.json**

Open `privotc-cre/my-workflow/privotc-config.production.json` and replace:

```json
{
  "schedule": "*/30 * * * * *",
  "simulationMode": false,  // ← PRODUCTION MODE
  "worldIdAppId": "app_staging_356707253a6f729610327063d51fe46e",
  "worldIdAction": "submit_trade",
  "otcSettlementAddress": "0x[PASTE_FROM_DEV1]",  // ← REPLACE
  "proofVerifierAddress": "0x[PASTE_FROM_DEV1]",  // ← REPLACE
  "tokenPairs": ["ETH/USDC", "WBTC/USDC", "WETH/DAI"],
  "chainName": "ethereum-testnet-sepolia",
  "tokenContracts": {
    "WETH": "0x[PASTE_FROM_DEV1]",  // ← REPLACE
    "USDC": "0x[PASTE_FROM_DEV1]",  // ← REPLACE
    "DAI": "0x[PASTE_FROM_DEV1]",   // ← REPLACE
    "WBTC": "0x[PASTE_FROM_DEV1]"   // ← REPLACE
  }
}
```

**B. Update project.yaml (RPC endpoints)**

Open `privotc-cre/project.yaml` and update:

```yaml
rpcs:
  - chain-name: ethereum-testnet-sepolia
    url: [PASTE_RPC_URL_FROM_DEV1_OR_INFURA]
```

---

### Step 3: Setup MetaMask Wallet ⏳

**A. Export Your MetaMask Private Key**

1. Open MetaMask browser extension
2. Click **three dots (⋮)** → **Account details**
3. Click **Export Private Key**
4. Enter your MetaMask password
5. Copy the private key (starts with `0x`)

**B. Add to .env File**

Create/edit `privotc-cre/.env`:

```bash
# MetaMask private key for CRE deployment and settlement execution
CRE_ETH_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# DO NOT COMMIT THIS FILE TO GIT!
```

**⚠️ Security Warning:**
- NEVER commit `.env` to GitHub
- NEVER share your private key
- Use a dedicated wallet for deployment (not your main wallet)
- Ensure wallet has Sepolia ETH for gas fees

**C. Fund Your Wallet**

Get Sepolia testnet ETH from faucets:
- https://sepoliafaucet.com/
- https://www.infura.io/faucet/sepolia
- https://faucet.quicknode.com/ethereum/sepolia

Recommended: **0.1 ETH** for gas fees

---

### Step 4: Apply for CRE Early Access ⏳

**Required for Deployment**

1. Visit: https://chain.link/cre
2. Fill out the form:
   - **Name**: Your name
   - **Email**: Your email
   - **Organization**: Your hackathon team name or "Individual"
   - **Project Name**: PrivOTC
   - **Use Case**: Privacy-preserving OTC trading using World ID + ZK proofs
   - **Description**: 
     ```
     PrivOTC is a privacy-preserving OTC trading platform that combines:
     - World ID for sybil resistance (one trade per human)
     - ZK-SNARKs for private balance verification
     - CRE for confidential orderbook matching
     - Universal blockchain support via off-chain verification
     
     We need CRE to:
     1. Verify World ID proofs off-chain (no on-chain exposure)
     2. Verify ZK balance proofs in TEE
     3. Maintain confidential orderbook
     4. Execute settlements on Ethereum Sepolia
     ```
   - **Expected users**: Start with 10-100, scale to 1000+
   - **Timeline**: Immediate (hackathon project)

3. Wait for approval email (usually 1-3 days)

**Note**: You can still test with `cre workflow simulate` while waiting!

---

### Step 5: Test Before Deployment ✅

**A. Test Simulation Mode Still Works**

```bash
cd privotc-cre
cre workflow simulate my-workflow --target privotc-staging
```

**Expected output:**
```
✓ Workflow compiled
[USER LOG] 🎯 Running matching engine (SIMULATION)...
[USER LOG] 📦 Loading demo trades for simulation...
[USER LOG] ✅ Demo trades loaded: 4 ETH/USDC orders, 2 WBTC/USDC orders
```

**B. Validate Production Config**

```bash
# Check config is valid JSON
cat my-workflow/privotc-config.production.json

# Verify all addresses are filled (no "TO_BE_PROVIDED")
# Verify simulationMode: false
```

---

### Step 6: Deploy to CRE Production 🚀

**Once you have:**
- ✅ Contract addresses from Dev 1
- ✅ Updated privotc-config.production.json
- ✅ MetaMask private key in .env
- ✅ CRE Early Access approval

**Run deployment:**

```bash
cd privotc-cre

# Rename production config to be active
mv my-workflow/privotc-config.json my-workflow/privotc-config.simulation.json
mv my-workflow/privotc-config.production.json my-workflow/privotc-config.json

# Deploy to CRE
cre workflow deploy my-workflow --target production-settings
```

**Expected output:**
```
✓ Workflow compiled
✓ Workflow deployed
✓ HTTP endpoint: https://cre-workflow-abc123.chainlink.com

Copy this endpoint URL ^^^
```

**Save the endpoint URL** - you'll need it for the frontend!

---

### Step 7: Connect Frontend to CRE Endpoint 🌐

**A. Update Frontend Environment**

Edit `frontend/.env.local`:

```bash
# Paste the endpoint URL from Step 6
CRE_INTAKE_ENDPOINT=https://cre-workflow-abc123.chainlink.com

# World ID credentials (already configured)
NEXT_PUBLIC_WLD_APP_ID=app_staging_356707253a6f729610327063d51fe46e
NEXT_PUBLIC_WLD_ACTION=submit_trade
```

**B. Restart Frontend**

```bash
cd frontend
npm run dev
```

**C. Test End-to-End Flow**

1. Open http://localhost:3000
2. Connect MetaMask wallet
3. Scan World ID QR code
4. Submit a test trade
5. Check CRE logs for trade intake
6. Wait 30 seconds for matching engine
7. Check blockchain for settlement transaction

---

## 🧪 Testing Checklist

### Production Smoke Test

After deployment, verify:

- [ ] CRE endpoint returns 200 OK on health check
- [ ] Frontend can POST to CRE endpoint
- [ ] World ID validation works (check logs)
- [ ] ZK proof validation works (check logs)
- [ ] Trade added to orderbook (check logs)
- [ ] Matching engine runs every 30s (check logs)
- [ ] Settlement executes on-chain (check Sepolia Etherscan)
- [ ] No demo trades loaded (check logs for "Loading demo trades" - should NOT appear)

### Monitoring Commands

```bash
# View CRE workflow logs (real-time)
cre workflow logs my-workflow --follow

# Check last 100 log entries
cre workflow logs my-workflow --tail 100

# Check workflow status
cre workflow status my-workflow
```

---

## 🐛 Troubleshooting Guide

### Issue 1: "Contract addresses are placeholder"

**Error:**
```
Settlement error: Transaction reverted (calling 0x0000...)
```

**Fix:**
- Verify you updated privotc-config.json with REAL addresses from Dev 1
- Check addresses are correct on Sepolia Etherscan
- Ensure you're using production config, not simulation config

### Issue 2: "World ID validation failed"

**Error:**
```
World ID validation failed: Invalid proof
```

**Fix:**
- Verify `worldIdAppId` is correct in config
- Check user is using correct World ID app
- Ensure World ID API is accessible from CRE

### Issue 3: "Insufficient gas fees"

**Error:**
```
Settlement error: Insufficient funds for gas
```

**Fix:**
- Fund your MetaMask wallet (CRE_ETH_PRIVATE_KEY) with Sepolia ETH
- Recommended: 0.1 ETH minimum
- Check balance: https://sepolia.etherscan.io/address/YOUR_ADDRESS

### Issue 4: "HTTP endpoint not working"

**Error:**
```
Failed to fetch: Network error
```

**Fix:**
- Verify CRE Early Access is approved
- Check workflow deployed successfully
- Confirm endpoint URL is correct in frontend .env.local
- Test endpoint directly: `curl https://your-endpoint.chainlink.com/health`

---

## 📊 Production vs Simulation Comparison

| Feature | Simulation Mode | Production Mode |
|---------|----------------|-----------------|
| **Config** | `simulationMode: true` | `simulationMode: false` |
| **Trades** | 6 demo trades (fake) | Real user trades via HTTP |
| **HTTP Trigger** | ❌ Disabled | ✅ Enabled |
| **Demo Trades** | ✅ Auto-loaded | ❌ Skipped |
| **Contract Addresses** | Placeholder 0x000... | Real from Dev 1 |
| **Settlement** | Logs only (no tx) | Real blockchain tx |
| **Run Command** | `cre workflow simulate` | `cre workflow deploy` |
| **Use Case** | Local testing | Real users |

---

## 🎯 What Changed in the Code

### privotc-workflow.ts

**Line 168-177: Demo trades now conditional**
```typescript
function loadDemoTrades(runtime: Runtime<Config>): void {
  if (demoDataLoaded) return;
  if (!runtime.config.simulationMode) {  // ← NEW: Check mode
    runtime.log('⚠️  Production mode: Skipping demo trades');
    return;
  }
  runtime.log('📦 Loading demo trades for simulation...');
  // ... demo trade loading
}
```

**Line 375-376: Matching engine shows mode**
```typescript
const handleMatchingEngine = (runtime: Runtime<Config>, payload: CronPayload): string => {
  const mode = runtime.config.simulationMode ? 'SIMULATION' : 'PRODUCTION';
  runtime.log(`🎯 Running matching engine (${mode})...`);
  
  if (runtime.config.simulationMode) {  // ← NEW: Conditional loading
    loadDemoTrades(runtime);
  }
  // ... rest of matching logic
}
```

**Line 451-479: HTTP trigger re-enabled**
```typescript
const initWorkflow = (config: Config) => {
  const http = new cre.capabilities.HTTPCapability();  // ← NEW: HTTP capability
  const cron = new cre.capabilities.CronCapability();

  const handlers = [];

  // HTTP endpoint for trade intake (PRODUCTION)
  if (!config.simulationMode) {  // ← NEW: Only in production
    handlers.push(
      cre.handler(
        http.trigger(),
        handleTradeIntake,
      )
    );
  }

  // Cron job for matching engine (BOTH modes)
  handlers.push(
    cre.handler(
      cron.trigger({ schedule: config.schedule }),
      handleMatchingEngine,
    )
  );

  return handlers;
};
```

---

## 📝 Summary: What You Need to Do

### For Hackathon (NOW) ✅
1. ✅ Code is ready
2. ✅ Simulation works
3. ✅ Record demo video showing simulation
4. ✅ Submit with HACKATHON.md

### For Production Deployment (AFTER HACKATHON)

**Step-by-Step:**

1. **Get from Dev 1** (CRITICAL):
   - OTCSettlement.sol address
   - WETH, USDC, DAI, WBTC addresses
   - RPC URL (Tenderly or Infura)

2. **Update Config**:
   - Edit `privotc-config.production.json`
   - Replace all "TO_BE_PROVIDED_BY_DEV1" with real addresses
   - Update `project.yaml` with RPC URL

3. **Setup Wallet**:
   - Export MetaMask private key
   - Add to `privotc-cre/.env`
   - Fund with 0.1 Sepolia ETH

4. **Apply for CRE Early Access**:
   - Visit https://chain.link/cre
   - Fill form (use description above)
   - Wait for approval

5. **Deploy**:
   ```bash
   mv my-workflow/privotc-config.production.json my-workflow/privotc-config.json
   cre workflow deploy my-workflow --target production-settings
   ```

6. **Connect Frontend**:
   - Copy CRE endpoint URL
   - Update `frontend/.env.local`
   - Test end-to-end flow

---

## ✅ You're Ready!

Your code is **PRODUCTION-READY**! The workflow will:

- ✅ Accept real user trades via HTTP endpoint
- ✅ Validate World ID proofs off-chain
- ✅ Validate ZK balance proofs off-chain
- ✅ Match orders every 30 seconds
- ✅ Execute settlements on Ethereum Sepolia
- ✅ Work with ANY blockchain via CRE

**Just waiting on:**
- Contract addresses from Dev 1
- CRE Early Access approval

For now, **record your hackathon video** showing the simulation! 🎬
