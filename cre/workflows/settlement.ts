/**
 * CRE Workflow 4: Settlement
 * 
 * Executes matched trades on-chain via OTCSettlement contract
 * Records proofs via ProofVerifier contract
 * Sends notifications to both parties
 * 
 * Trigger: Called by Workflow 2 (matching engine) when match found
 * Runs in: Confidential Compute (TEE) with on-chain interaction
 */

import { ethers } from 'ethers';

export interface SettlementRequest {
  buyerCommitment: string;
  sellerCommitment: string;
  buyerAddress: string;   // actual wallet address for settle(buyer, ...)
  sellerAddress: string;  // actual wallet address for settle(..., seller, ...)
  buyerOnChainTxHash?: string;  // submitBalanceProof tx from buyer
  sellerOnChainTxHash?: string; // submitBalanceProof tx from seller
  tokenPair: string;
  amount: string;
  price: string;
  buyProofHash: string;
  sellProofHash: string;
  timestamp: number;
}

export interface SettlementResponse {
  success: boolean;
  txHash?: string;
  reason?: string;
}

/**
 * Main settlement handler
 * Calls on-chain contracts to settle the trade
 */
export async function handleSettlement(
  request: SettlementRequest
): Promise<SettlementResponse> {
  console.log('💱 Processing settlement...');
  console.log(`   Pair: ${request.tokenPair}`);
  console.log(`   Amount: ${request.amount} @ ${request.price}`);

  try {
    // ===== STEP 1: Prepare Contract Calls =====
    console.log('1️⃣  Preparing contract calls...');

    const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_MAINNET_RPC);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

    // Parse token pair (e.g., "ETH/USDC" -> ETH, USDC)
    const [baseToken, quoteToken] = request.tokenPair.split('/');

    // Get contract addresses from environment
    const OTC_SETTLEMENT_ADDRESS = process.env.OTC_SETTLEMENT_ADDRESS;
    const PROOF_VERIFIER_ADDRESS = process.env.PROOF_VERIFIER_ADDRESS;

    if (!OTC_SETTLEMENT_ADDRESS || !PROOF_VERIFIER_ADDRESS) {
      throw new Error('Contract addresses not configured - check .env file');
    }

    // ===== STEP 2: Record Proofs On-Chain =====
    console.log('2️⃣  Recording ZK proofs on-chain...');

    // ProofVerifier ABI (from Dev 1's contract)
    const proofVerifierABI = [
      'function recordProof(bytes32 proofHash, bytes32 walletCommitment) external',
      'function isProofValid(bytes32 proofHash) external view returns (bool)'
    ];

    const proofVerifier = new ethers.Contract(
      PROOF_VERIFIER_ADDRESS,
      proofVerifierABI,
      wallet
    );

    // Record both buyer and seller proofs
    const buyProofTx = await proofVerifier.recordProof(
      request.buyProofHash,
      request.buyerCommitment
    );
    await buyProofTx.wait();
    console.log('   ✅ Buyer proof recorded');

    const sellProofTx = await proofVerifier.recordProof(
      request.sellProofHash,
      request.sellerCommitment
    );
    await sellProofTx.wait();
    console.log('   ✅ Seller proof recorded');

    // ===== STEP 3: Execute Settlement =====
    console.log('3️⃣  Executing settlement on-chain...');

    // OTCSettlement ABI — matches deployed OTCSettlement.sol (updated with ZK enforcement)
    // settle(bytes32 tradeId, address buyer, address seller,
    //        address buyerToken, address sellerToken,
    //        uint256 buyerAmount, uint256 sellerAmount)
    const settlementABI = [
      'function settle(bytes32 tradeId, address buyer, address seller, address buyerToken, address sellerToken, uint256 buyerAmount, uint256 sellerAmount) external'
    ];

    const otcSettlement = new ethers.Contract(
      OTC_SETTLEMENT_ADDRESS,
      settlementABI,
      wallet
    );

    const baseTokenAddress = getTokenAddress(baseToken);
    const quoteTokenAddress = getTokenAddress(quoteToken);

    // tradeId: deterministic hash from both proof hashes
    const tradeId = ethers.keccak256(
      ethers.solidityPacked(
        ['bytes32', 'bytes32', 'uint256'],
        [request.buyProofHash, request.sellProofHash, BigInt(request.timestamp)]
      )
    );

    console.log(`   tradeId: ${tradeId}`);
    console.log(`   buyer:   ${request.buyerAddress}`);
    console.log(`   seller:  ${request.sellerAddress}`);
    console.log(`   Requires both parties to have called submitBalanceProof() on-chain first`);

    const settlementTx = await otcSettlement.settle(
      tradeId,
      request.buyerAddress,
      request.sellerAddress,
      baseTokenAddress,
      quoteTokenAddress,
      ethers.parseEther(request.amount),
      ethers.parseUnits(request.price, 6)
    );

    const receipt = await settlementTx.wait();
    console.log('   ✅ Settlement executed');
    console.log(`   📝 Transaction: ${receipt.hash}`);

    // ===== STEP 4: Send Notifications =====
    console.log('4️⃣  Sending notifications...');
    
    await sendNotification(request.buyerCommitment, {
      type: 'trade_executed',
      side: 'buy',
      tokenPair: request.tokenPair,
      amount: request.amount,
      price: request.price,
      txHash: receipt.hash
    });

    await sendNotification(request.sellerCommitment, {
      type: 'trade_executed',
      side: 'sell',
      tokenPair: request.tokenPair,
      amount: request.amount,
      price: request.price,
      txHash: receipt.hash
    });

    console.log('✅ Settlement complete');

    return {
      success: true,
      txHash: receipt.hash
    };

  } catch (error: any) {
    console.error('❌ Settlement error:', error);
    return {
      success: false,
      reason: error.message
    };
  }
}

/**
 * Get token address by symbol
 * TODO: Replace with actual token registry from Dev 1
 */
function getTokenAddress(symbol: string): string {
  const tokens: Record<string, string> = {
    'ETH': '0x0000000000000000000000000000000000000000', // Native ETH
    'WETH': process.env.WETH_ADDRESS || '0x...',
    'USDC': process.env.USDC_ADDRESS || '0x...',
    'DAI': process.env.DAI_ADDRESS || '0x...',
    'WBTC': process.env.WBTC_ADDRESS || '0x...'
  };

  return tokens[symbol] || '0x0000000000000000000000000000000000000000';
}

/**
 * Send notification to user
 * In production, this would use World Mini App notifications or webhooks
 */
async function sendNotification(
  walletCommitment: string,
  notification: any
): Promise<void> {
  console.log(`   📧 Notification to ${walletCommitment.substring(0, 8)}...`);
  console.log(`      Type: ${notification.type}`);
  console.log(`      Data:`, notification);

  // TODO: Implement actual notification mechanism
  // Options:
  // 1. World Mini App push notification
  // 2. Webhook to user's registered endpoint
  // 3. On-chain event (user polls contracts)
}

/**
 * CRE HTTP Endpoint Handler
 */
export async function main(event: any): Promise<any> {
  try {
    const request: SettlementRequest = JSON.parse(event.body);
    const response = await handleSettlement(request);
    
    return {
      statusCode: response.success ? 200 : 500,
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    console.error('❌ Workflow error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        reason: error.message
      })
    };
  }
}
