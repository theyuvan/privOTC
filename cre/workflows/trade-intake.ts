/**
 * CRE Workflow 1: Trade Intent Intake
 * 
 * Receives trade intents from World Mini App
 * Validates World ID proof + ZK balance proof
 * Adds to confidential orderbook if valid
 * 
 * Trigger: HTTP POST from app/api/trade/route.ts
 * Runs in: Confidential Compute (TEE)
 */

import { zkVerifier } from '../src/zk/verifier';
import { worldIdValidator, type WorldIDProof } from '../src/world-id/validator';
import { orderbook, type TradeIntent } from '../src/orderbook/confidential';
import type { BalanceProofData } from '../src/zk/types';

export interface TradeIntakeRequest {
  // World ID proof
  worldIdProof: WorldIDProof;
  
  // ZK balance proof
  zkProof: BalanceProofData;

  // Wallet address — used by CRE to call settle(buyer, seller, ...) on-chain
  walletAddress?: string;

  // On-chain tx hash from submitBalanceProof() — proves Groth16 ran on-chain
  onChainTxHash?: string;
  
  // Trade details (can be encrypted in production)
  trade: {
    side: 'buy' | 'sell';
    tokenPair: string;
    amount: string;
    price: string;
  };
}

export interface TradeIntakeResponse {
  success: boolean;
  intentId?: string;
  walletCommitment?: string;
  reason?: string;
}

/**
 * Main workflow handler
 * Called by CRE HTTP trigger
 */
export async function handleTradeIntake(
  request: TradeIntakeRequest
): Promise<TradeIntakeResponse> {
  console.log('🔍 Processing trade intake...');

  // ===== STEP 1: Validate World ID Proof =====
  console.log('1️⃣  Validating World ID proof...');
  const worldIdResult = await worldIdValidator.validateProof(request.worldIdProof);
  
  if (!worldIdResult.valid) {
    console.log(`❌ World ID validation failed: ${worldIdResult.reason}`);
    return {
      success: false,
      reason: `World ID validation failed: ${worldIdResult.reason}`
    };
  }

  // Check nullifier uniqueness (prevent double-trading)
  const nullifierUsed = await worldIdValidator.isNullifierUsed(
    worldIdResult.nullifierHash!
  );
  
  if (nullifierUsed) {
    console.log('❌ World ID nullifier already used');
    return {
      success: false,
      reason: 'This World ID has already submitted a trade'
    };
  }

  console.log('✅ World ID verified');

  // ===== STEP 2: Validate ZK Balance Proof =====
  console.log('2️⃣  Validating ZK balance proof...');
  
  // Calculate expected required amount based on trade
  const requiredAmount = calculateRequiredBalance(
    request.trade.side,
    request.trade.amount,
    request.trade.price,
    request.trade.tokenPair
  );

  const zkResult = await zkVerifier.verifyWithChecks(
    request.zkProof,
    requiredAmount,
    300 // 5 minute proof expiry
  );

  if (!zkResult.valid) {
    console.log(`❌ ZK proof validation failed: ${zkResult.reason}`);
    return {
      success: false,
      reason: `ZK proof validation failed: ${zkResult.reason}`
    };
  }

  if (!zkResult.sufficient) {
    console.log('❌ Insufficient balance for trade');
    return {
      success: false,
      reason: 'Insufficient balance (proven via ZK proof)'
    };
  }

  console.log('✅ ZK proof verified - balance sufficient');

  // ===== STEP 3: Add to Confidential Orderbook =====
  console.log('3️⃣  Adding to confidential orderbook...');

  const intent: TradeIntent = {
    id: zkResult.proofHash, // Unique ID from ZK proof
    walletCommitment: zkResult.walletCommitment,
    walletAddress: request.walletAddress ?? '',  // actual address for on-chain settle()
    proofHash: zkResult.proofHash,
    onChainTxHash: request.onChainTxHash,        // submitBalanceProof receipt
    side: request.trade.side,
    tokenPair: request.trade.tokenPair,
    amount: request.trade.amount,
    price: request.trade.price,
    timestamp: Date.now(),
    worldIdNullifier: worldIdResult.nullifierHash!
  };

  const addResult = orderbook.addIntent(intent);

  if (!addResult.success) {
    console.log(`❌ Failed to add to orderbook: ${addResult.reason}`);
    return {
      success: false,
      reason: addResult.reason
    };
  }

  console.log('✅ Trade intent added to orderbook');
  console.log(`   Wallet: ${request.walletAddress ?? 'not provided'}`);
  console.log(`   On-chain ZK tx: ${request.onChainTxHash ?? '(simulation — no tx)'}`) ;

  // ===== STEP 4: Trigger Matching Engine =====
  // In production, this would trigger Workflow 2 (matching-engine.ts)
  // For now, we log the orderbook depth
  const depth = orderbook.getDepth(request.trade.tokenPair);
  console.log(`📊 Orderbook depth for ${request.trade.tokenPair}: ${depth.buys} buys, ${depth.sells} sells`);

  return {
    success: true,
    intentId: intent.id,
    walletCommitment: zkResult.walletCommitment
  };
}

/**
 * Calculate required balance based on trade parameters
 */
function calculateRequiredBalance(
  side: 'buy' | 'sell',
  amount: string,
  price: string,
  tokenPair: string
): string {
  const amountNum = parseFloat(amount);
  const priceNum = parseFloat(price);

  if (side === 'buy') {
    // Buying: need quote currency (e.g., USDC for ETH/USDC)
    return (amountNum * priceNum).toString();
  } else {
    // Selling: need base currency (e.g., ETH for ETH/USDC)
    return amount;
  }
}

/**
 * CRE HTTP Endpoint Handler
 * This is what gets called by the CRE platform
 */
export async function main(event: any): Promise<any> {
  try {
    const request: TradeIntakeRequest = JSON.parse(event.body);
    const response = await handleTradeIntake(request);
    
    return {
      statusCode: response.success ? 200 : 400,
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    console.error('❌ Workflow error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        reason: `Internal error: ${error.message}`
      })
    };
  }
}
