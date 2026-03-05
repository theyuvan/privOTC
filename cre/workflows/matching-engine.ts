/**
 * CRE Workflow 2: Matching Engine
 * 
 * Finds matching buy/sell orders in confidential orderbook
 * Only reveals matched pairs (unmatched orders stay private)
 * Triggers settlement workflow for matches
 * 
 * Trigger: Cron (every 30 seconds) or event-driven from Workflow 1
 * Runs in: Confidential Compute (TEE)
 */

import { orderbook, type MatchedPair } from '../src/orderbook/confidential';

export interface MatchingResult {
  success: boolean;
  matches: MatchedPair[];
  tokensProcessed: string[];
  totalMatches: number;
}

/**
 * Main matching engine
 * Runs confidentially - only matched orders are revealed
 */
export async function runMatchingEngine(
  tokenPairs?: string[]
): Promise<MatchingResult> {
  console.log('🎯 Running matching engine...');

  // Default to common pairs if none specified
  const pairsToMatch = tokenPairs || [
    'ETH/USDC',
    'WBTC/USDC',
    'WETH/DAI'
  ];

  const allMatches: MatchedPair[] = [];

  for (const tokenPair of pairsToMatch) {
    console.log(`📊 Checking ${tokenPair}...`);
    
    const depth = orderbook.getDepth(tokenPair);
    console.log(`   Orderbook: ${depth.buys} buys, ${depth.sells} sells`);

    if (depth.buys === 0 || depth.sells === 0) {
      console.log('   ⏭️  Skipping (no orders on one side)');
      continue;
    }

    // Find matches for this pair
    const matches = orderbook.findMatches(tokenPair);
    
    if (matches.length > 0) {
      console.log(`   ✅ Found ${matches.length} matches`);
      allMatches.push(...matches);

      // Log matches (only visible in TEE logs)
      matches.forEach((match, idx) => {
        console.log(`   Match ${idx + 1}:`);
        console.log(`     Buy:  ${match.buyOrder.amount} @ ${match.buyOrder.price}`);
        console.log(`     Sell: ${match.sellOrder.amount} @ ${match.sellOrder.price}`);
        console.log(`     Exec: ${match.matchAmount} @ ${match.matchPrice}`);
      });

      // Trigger settlement for each match
      for (const match of matches) {
        await triggerSettlement(match);
      }
    } else {
      console.log('   ℹ️  No matches (spread too wide)');
    }
  }

  // Clear expired orders (older than 24h)
  const cleared = orderbook.clearExpiredOrders(86400000);
  if (cleared > 0) {
    console.log(`🧹 Cleared ${cleared} expired orders`);
  }

  console.log(`\n✅ Matching complete: ${allMatches.length} total matches`);

  return {
    success: true,
    matches: allMatches,
    tokensProcessed: pairsToMatch,
    totalMatches: allMatches.length
  };
}

/**
 * Trigger settlement workflow (Workflow 4)
 * In production, this would call the settlement workflow
 */
async function triggerSettlement(match: MatchedPair): Promise<void> {
  console.log(`🔗 Triggering settlement for match ${match.buyOrder.id.substring(0, 8)}...`);
  
  // TODO: Call Workflow 4 (settlement.ts)
  // This would make a confidential HTTP request to the settlement workflow
  // For now, just log the settlement data
  
  const settlementData = {
    buyerCommitment: match.buyOrder.walletCommitment,
    sellerCommitment: match.sellOrder.walletCommitment,
    buyerAddress: match.buyOrder.walletAddress,
    sellerAddress: match.sellOrder.walletAddress,
    buyerOnChainTxHash: match.buyOrder.onChainTxHash,
    sellerOnChainTxHash: match.sellOrder.onChainTxHash,
    tokenPair: match.buyOrder.tokenPair,
    amount: match.matchAmount,
    price: match.matchPrice,
    buyProofHash: match.buyOrder.proofHash,
    sellProofHash: match.sellOrder.proofHash,
    timestamp: match.matchTimestamp
  };

  console.log('   Settlement data prepared:', settlementData);
  console.log('   Buyer on-chain ZK tx:', match.buyOrder.onChainTxHash ?? '(simulation)');
  console.log('   Seller on-chain ZK tx:', match.sellOrder.onChainTxHash ?? '(simulation)');
  
  // In production:
  // await fetch('{{.CRE_SETTLEMENT_ENDPOINT}}', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(settlementData)
  // });
}

/**
 * CRE Cron Handler
 * Called every 30 seconds by CRE scheduler
 */
export async function main(event: any): Promise<any> {
  try {
    // Parse token pairs from event if provided
    const tokenPairs = event.tokenPairs as string[] | undefined;
    
    const result = await runMatchingEngine(tokenPairs);
    
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error: any) {
    console.error('❌ Matching engine error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        reason: error.message
      })
    };
  }
}
