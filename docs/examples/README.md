# PrivOTC Examples

## Sample Trade Structure

This folder contains example data structures used in the PrivOTC platform.

### [sample-trade.json](./sample-trade.json)

Demonstrates the complete structure of a trade submission including:

1. **World ID Proof** - Human verification
   ```json
   {
     "merkle_root": "...",      // Merkle tree root from World ID
     "nullifier_hash": "...",   // Unique hash preventing duplicate accounts
     "proof": "...",            // ZK proof of humanity
     "verification_level": "orb" // Orb = highest security level
   }
   ```

2. **ZK Balance Proof** - Privacy-preserving balance verification
   ```json
   {
     "pi_a": [...],             // Groth16 proof component A
     "pi_b": [...],             // Component B (2D array)
     "pi_c": [...],             // Component C
     "publicSignals": [
       "1000000000000000000",   // Min required (public)
       "0x123abc456def",        // Commitment hash (public)
       ...                      // Actual balance NEVER revealed
     ]
   }
   ```

3. **Trade Details** - Would be encrypted in production
   ```json
   {
     "side": "buy",
     "token": "ETH",
     "chain": "ethereum",
     "amount": "2.0",
     "price": "3150"
   }
   ```

## Privacy Flow

### What Happens in Production

1. **User creates order** (frontend)
   - Generate ZK balance proof locally
   - Encrypt trade details with CRE public key
   - Submit proof to blockchain (on-chain)
   - Store encrypted order in database (off-chain)

2. **CRE fetches orders** (confidential matching)
   - Fetch encrypted orders from API
   - Decrypt ONLY inside TEE
   - Run AI matching algorithm
   - Encrypt results before publishing

3. **Settlement** (on-chain)
   - Both parties deposit to escrow
   - Contract verifies ZK proofs
   - Atomic swap executes
   - Original order details never revealed

## Testing

Use `sample-trade.json` for:
- Frontend form validation
- API endpoint testing
- ZK proof generation testing
- Encryption flow verification

## Notes

⚠️ **Security Warning:** Sample values are for testing only. Never use real private keys or production data in example files.

✅ **Privacy Preserved:** Even in testing, actual balances and strategies remain hidden through encryption and ZK proofs.

---

For more examples, see:
- [World ID Integration Docs](../WORLD_ID_CRE_INTEGRATION.md)
- [Privacy Architecture Docs](../PRIVACY_CRE_INTEGRATION.md)
