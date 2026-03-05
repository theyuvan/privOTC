# Confidential HTTP Integration — PrivOTC

## Overview

This document describes how PrivOTC integrates **Chainlink CRE's Confidential HTTP capability** into the privacy-preserving OTC trading workflow, and what needs to be implemented to fully qualify for the Privacy track.

---

## Current Architecture (Plain HTTP)

```
User submits trade
      ↓
Frontend (Next.js)
      ↓  plain HTTP
ZK Verifier API (localhost:4000)   ← ⚠️ Not confidential
      ↓
/api/trade queue (localhost:3000)
      ↓  plain HTTP
CRE Workflow (cron trigger)
      ↓
Matching Engine
      ↓
Settlement (simulation)
```

**Problem:** The ZK proof generation and trade data flow through plain HTTP. API credentials, proof inputs (balance, wallet commitment), and trade parameters are visible in logs and network traffic.

---

## Target Architecture (Confidential HTTP)

```
User submits trade
      ↓
Frontend (Next.js)
      ↓  encrypted payload
CRE Workflow (HTTP trigger)
      ↓  ConfidentialHTTPClient (inside CRE enclave)
ZK Verifier API                  ← ✅ Protected inside TEE
      ↓  encrypted response
CRE Workflow
      ↓  confidential matching engine
Settlement
```

**What changes:**
- Trade data enters CRE via HTTP trigger (already implemented)
- ZK proof call moves from `localhost:4000` plain fetch → `ConfidentialHTTPClient` inside CRE
- API key for ZK verifier stored as a CRE Secret (never exposed in logs or onchain)
- Trade amounts, prices, wallet commitments never appear in plaintext outside the enclave

---

## What Confidential HTTP Protects

| Data | Without Confidential HTTP | With Confidential HTTP |
|---|---|---|
| ZK proof inputs (balance, wallet) | Visible in HTTP logs | Encrypted inside TEE |
| Trade amount & price | Visible in API requests | Protected |
| ZK verifier API key | Hardcoded / env var | CRE Secret (encrypted) |
| Proof response (pi_a, pi_b, pi_c) | Visible in response body | Protected |
| Matching logic | Runs on your machine | Runs in Chainlink enclave |

---

## Code Change Required

### Current code in `privotc-workflow.ts` (plain HTTP):

```ts
// Current — plain HTTPClient, not confidential
const zkClient = new HTTPClient();
const zkResponse = zkClient
  .post(config.zkVerifierUrl!, {
    body: JSON.stringify({ balance, walletCommitment, amount }),
    headers: { 'Content-Type': 'application/json' },
  })
  .result();
```

### Target code (Confidential HTTP):

```ts
import { ConfidentialHTTPClient } from '@chainlink/cre-sdk';

// Fetch API key from CRE Secrets (never exposed)
const zkApiKey = runtime.getSecret('ZK_VERIFIER_API_KEY');

// Use ConfidentialHTTPClient — runs inside TEE enclave
const zkClient = new ConfidentialHTTPClient();
const zkResponse = zkClient
  .post(config.zkVerifierUrl!, {
    body: JSON.stringify({ balance, walletCommitment, amount }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${zkApiKey}`,  // API key protected
    },
  })
  .result();
```

### Secret registration (CRE CLI):

```bash
cre secrets set ZK_VERIFIER_API_KEY --value "your-api-key-here"
```

### `secrets.yaml` update:

```yaml
# privotc-cre/secrets.yaml
secrets:
  - name: ZK_VERIFIER_API_KEY
    description: API key for ZK balance proof verifier service
```

---

## What This Proves to Judges

By using `ConfidentialHTTPClient`:

1. ✅ **Privacy track requirement met** — API credentials + request/response data protected
2. ✅ **Trade data never exposed onchain** — matching logic runs inside Chainlink enclave
3. ✅ **ZK proof generation is confidential** — inputs (wallet balance, commitment) stay private
4. ✅ **No secrets in logs** — `ZK_VERIFIER_API_KEY` stored in CRE Secrets vault, not env vars
5. ✅ **OTC settlement use case** — matches the example use case listed in the Privacy track

---

## Hackathon Track Requirement Checklist

| Requirement | Status |
|---|---|
| CRE Workflow as orchestration layer | ✅ Done — `privotc-workflow.ts` |
| Integrate blockchain with external API | ✅ Done — EVM + HTTP calls |
| Use Confidential HTTP capability | ⚠️ Needs `ConfidentialHTTPClient` swap |
| Successful CLI simulation | ✅ Done — `processed:2, matchesFound:1` |
| 3–5 min demo video | ❌ Not yet recorded |
| Public GitHub repo | ✅ `github.com/theyuvan/chain.link` |
| README with Chainlink file links | ❌ Not yet written |

---

## Files That Use Chainlink (for README)

| File | Chainlink Usage |
|---|---|
| `privotc-cre/my-workflow/privotc-workflow.ts` | CRE SDK — HTTPClient, EVMClient, cron trigger, HTTP trigger, runtime |
| `privotc-cre/my-workflow/workflow.yaml` | CRE workflow config — target, schedule, triggers |
| `privotc-cre/project.yaml` | CRE project config — targets, chains |
| `privotc-cre/my-workflow/privotc-config.json` | CRE workflow runtime config — chainName, settlementAddress |
| `privotc-cre/contracts/abi/OTCSettlement.ts` | ABI used by CRE EVMClient for on-chain settlement |
| `frontend/app/api/trade/route.ts` | API endpoint CRE polls via HTTPClient |
| `zk-circuits/verifier-api.ts` | ZK verifier service called by CRE (target for Confidential HTTP) |

---

## CRE Confidential HTTP — How It Works Internally

```
CRE Node (Chainlink DON)
  └── Trusted Execution Environment (TEE / Enclave)
        ├── Your workflow WASM binary runs here
        ├── ConfidentialHTTPClient makes HTTP call
        │     └── Request payload encrypted end-to-end
        ├── Response decrypted inside enclave only
        └── Result returned to workflow logic (never logged externally)
```

The enclave guarantees:
- No Chainlink node operator can read request/response data
- No logs contain sensitive values
- API keys retrieved from CRE Secrets vault, injected at runtime only inside the enclave
- Cryptographic proof of execution generated (verifiable without revealing data)

---

## Reference

- [Confidential HTTP docs](https://docs.chain.link/cre/capabilities/confidential-http)
- [Making Confidential Requests (TypeScript)](https://docs.chain.link/cre/guides/workflow/using-confidential-http-client/making-requests-ts)
- [CRE Secrets guide](https://docs.chain.link/cre/guides/workflow/secrets)
- [Privacy Track — Chainlink Hackathon](https://chain.link/hackathon)
