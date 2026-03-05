// 🔐 ZK-SNARK Verification API Service
// Runs on localhost:4000 during CRE simulation
// Uses snarkjs.groth16.verify() with your existing verification_key.json

import express from 'express';
import { groth16 } from 'snarkjs';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());

// Load verification key from build/
const verificationKeyPath = path.join(__dirname, 'build', 'verification_key.json');
const verificationKey = JSON.parse(fs.readFileSync(verificationKeyPath, 'utf-8'));

console.log('📁 Loaded verification key from:', verificationKeyPath);
console.log('   Protocol:', verificationKey.protocol);
console.log('   Curve:', verificationKey.curve);

// ===== POST /verify - Main verification endpoint =====
app.post('/verify', async (req, res) => {
  try {
    const { proof, publicSignals } = req.body;

    console.log('🔍 Verifying ZK proof...');
    console.log('   Public signals:', publicSignals);

    // Real ZK-SNARK verification using Groth16
    const isValid = await groth16.verify(verificationKey, publicSignals, proof);

    if (isValid) {
      console.log('✅ ZK proof VALID');
      res.json({
        valid: true,
        walletCommitment: publicSignals[1], // Extract wallet commitment
        timestamp: Date.now(),
        protocol: 'groth16',
      });
    } else {
      console.log('❌ ZK proof INVALID');
      res.status(400).json({
        valid: false,
        reason: 'Proof verification failed',
        timestamp: Date.now(),
      });
    }
  } catch (error: any) {
    console.error('❌ Verification error:', error.message);
    res.status(500).json({
      valid: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

// ===== POST /generate-proof - Generate ZK proof =====
app.post('/generate-proof', async (req, res) => {
  try {
    const { balance, walletCommitment, minPrice, amount, tokenId } = req.body;

    console.log('🔨 Generating ZK proof...');
    console.log('   Actual balance:', balance);
    console.log('   Required amount:', amount);

    // Map to circuit input format
    // Circuit expects: wallet_address, actual_balance, token_address, salt, balance_proof_data, required_amount, timestamp
    const input = {
      wallet_address: walletCommitment || '123456',        // Private: user's wallet (from World ID nullifier)
      actual_balance: balance || '1000000000000000000',    // Private: user's actual balance (1 ETH default)
      token_address: tokenId || '1',                       // Private: token contract address
      salt: '42',                                          // Private: random salt for commitment
      balance_proof_data: '0',                             // Private: additional proof data (block number, etc)
      required_amount: amount || '1500000000000000000',    // Public: minimum required for trade
      timestamp: Math.floor(Date.now() / 1000).toString(), // Public: proof generation timestamp
    };

    console.log('   Circuit inputs prepared');

    // Generate proof using snarkjs
    const wasmPath = path.join(__dirname, 'build', 'balanceProof_js', 'balanceProof.wasm');
    const zkeyPath = path.join(__dirname, 'build', 'balanceProof_final.zkey');

    const { proof, publicSignals } = await groth16.fullProve(input, wasmPath, zkeyPath);

    console.log('✅ ZK proof generated');
    console.log('   Public signals:', publicSignals);

    res.json({
      success: true,
      proof,
      publicSignals,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('❌ Proof generation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

// ===== GET /health - Health check =====
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'zk-verifier-api',
    protocol: verificationKey.protocol,
    curve: verificationKey.curve,
  });
});

// ===== GET /info - Verifier info =====
app.get('/info', (req, res) => {
  res.json({
    service: 'ZK-SNARK Verification API',
    protocol: verificationKey.protocol,
    curve: verificationKey.curve,
    endpoints: {
      verify: 'POST /verify',
      health: 'GET /health',
      info: 'GET /info',
    },
  });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log('');
  console.log('🔐 ZK Verification API started');
  console.log(`   Running on: http://localhost:${PORT}`);
  console.log('   Endpoints:');
  console.log(`     POST http://localhost:${PORT}/verify`);
  console.log(`     POST http://localhost:${PORT}/generate-proof`);
  console.log(`     GET  http://localhost:${PORT}/health`);
  console.log(`     GET  http://localhost:${PORT}/info`);
  console.log('');
  console.log('✅ Ready to generate & verify ZK-SNARKs!');
});
