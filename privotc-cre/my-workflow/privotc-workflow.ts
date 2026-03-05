/**
 * PrivOTC - Privacy-Preserving OTC Trading Platform
 * Chainlink CRE Workflow
 * 
 * Combines World ID + ZK Proofs + Confidential Compute
 * for private, sybil-resistant peer-to-peer trading
 * 
 * Workflow Jobs:
 * 1. Trade Intake - Validates World ID + ZK balance proof, adds to orderbook
 * 2. Matching Engine - Finds matching buy/sell orders (confidential)
 * 3. Settlement - Executes matched trades on-chain
 */

import {
	type CronPayload,
	cre,
	encodeCallMsg,
	EVMClient,
	getNetwork,
	LATEST_BLOCK_NUMBER,
	Runner,
	type Runtime,
} from '@chainlink/cre-sdk';
import { type Address, encodeFunctionData, Hex, zeroAddress } from 'viem';
import { z } from 'zod';

// ===== Configuration Schema =====

const configSchema = z.object({
	schedule: z.string(), // Cron schedule for matching engine
	worldIdAppId: z.string(),
	worldIdAction: z.string(),
	otcSettlementAddress: z.string(),
	proofVerifierAddress: z.string(),
	tokenPairs: z.array(z.string()), // e.g., ["ETH/USDC", "WBTC/USDC"]
	chainName: z.string(), // e.g., "ethereum-testnet-sepolia"
	simulationMode: z.boolean().optional(), // Skip actual ZK verification in simulation
});

type Config = z.infer<typeof configSchema>;

// ===== Type Definitions =====

interface TradeIntent {
	id: string;
	walletCommitment: string;
	proofHash: string;
	side: 'buy' | 'sell';
	tokenPair: string;
	amount: string;
	price: string;
	timestamp: number;
	worldIdNullifier: string;
}

interface MatchedPair {
	buyOrder: TradeIntent;
	sellOrder: TradeIntent;
	matchPrice: string;
	matchAmount: string;
	matchTimestamp: number;
}

interface WorldIDProof {
	merkle_root: string;
	nullifier_hash: string;
	proof: string;
	verification_level: string;
}

interface ZKProof {
	proof: any;
	publicSignals: string[];
}

// ===== In-Memory Confidential Orderbook (TEE Storage) =====

class ConfidentialOrderbook {
	private buyOrders: Map<string, TradeIntent[]> = new Map();
	private sellOrders: Map<string, TradeIntent[]> = new Map();
	private usedNullifiers: Set<string> = new Set();

	addIntent(intent: TradeIntent): { success: boolean; reason?: string } {
		if (this.usedNullifiers.has(intent.worldIdNullifier)) {
			return { success: false, reason: 'World ID nullifier already used' };
		}

		const book = intent.side === 'buy' ? this.buyOrders : this.sellOrders;
		if (!book.has(intent.tokenPair)) {
			book.set(intent.tokenPair, []);
		}
		
		const orders = book.get(intent.tokenPair)!;
		orders.push(intent);
		
		// Sort by price-time priority
		orders.sort((a, b) => {
			const priceA = parseFloat(a.price);
			const priceB = parseFloat(b.price);
			return intent.side === 'buy' 
				? priceB - priceA || a.timestamp - b.timestamp
				: priceA - priceB || a.timestamp - b.timestamp;
		});

		this.usedNullifiers.add(intent.worldIdNullifier);
		return { success: true };
	}

	findMatches(tokenPair: string): MatchedPair[] {
		const buyOrders = this.buyOrders.get(tokenPair) || [];
		const sellOrders = this.sellOrders.get(tokenPair) || [];
		const matches: MatchedPair[] = [];

		let buyIdx = 0, sellIdx = 0;

		while (buyIdx < buyOrders.length && sellIdx < sellOrders.length) {
			const buyOrder = buyOrders[buyIdx];
			const sellOrder = sellOrders[sellIdx];
			const buyPrice = parseFloat(buyOrder.price);
			const sellPrice = parseFloat(sellOrder.price);

			if (buyPrice >= sellPrice) {
				const matchPrice = sellOrder.timestamp < buyOrder.timestamp ? sellOrder.price : buyOrder.price;
				const matchAmount = Math.min(parseFloat(buyOrder.amount), parseFloat(sellOrder.amount)).toString();
				matches.push({ buyOrder, sellOrder, matchPrice, matchAmount, matchTimestamp: Date.now() });
				buyIdx++;
				sellIdx++;
			} else {
				break;
			}
		}

		if (matches.length > 0) {
			this.buyOrders.set(tokenPair, buyOrders.slice(buyIdx));
			this.sellOrders.set(tokenPair, sellOrders.slice(sellIdx));
		}

		return matches;
	}

	getDepth(tokenPair: string): { buys: number; sells: number } {
		return {
			buys: this.buyOrders.get(tokenPair)?.length || 0,
			sells: this.sellOrders.get(tokenPair)?.length || 0
		};
	}

	clearExpiredOrders(maxAge: number = 86400000): number {
		const now = Date.now();
		let cleared = 0;
		
		for (const [tokenPair, orders] of [...this.buyOrders.entries(), ...this.sellOrders.entries()]) {
			const filtered = orders.filter(o => now - o.timestamp < maxAge);
			cleared += orders.length - filtered.length;
			if (filtered.length === 0) {
				this.buyOrders.delete(tokenPair);
				this.sellOrders.delete(tokenPair);
			}
		}
		
		return cleared;
	}
}

// Global orderbook instance (persists in TEE memory)
const orderbook = new ConfidentialOrderbook();

// Flag to track if demo data has been loaded
let demoDataLoaded = false;

// Pre-populate orderbook with demo trades for simulation ONLY
function loadDemoTrades(runtime: Runtime<Config>): void {
	if (demoDataLoaded) return;
	if (!runtime.config.simulationMode) {
		runtime.log('⚠️  Production mode: Skipping demo trades (real trades come via HTTP)');
		return;
	}
	
	runtime.log('📦 Loading demo trades for simulation...');
	
	const baseTimestamp = Date.now();
	
	// ETH/USDC Demo Orders
	const ethUsdcOrders = [
		{ side: 'buy' as const, amount: '1.5', price: '3200.00', nullifier: 'demo_buyer_1' },
		{ side: 'buy' as const, amount: '2.0', price: '3195.00', nullifier: 'demo_buyer_2' },
		{ side: 'sell' as const, amount: '1.8', price: '3198.00', nullifier: 'demo_seller_1' },
		{ side: 'sell' as const, amount: '1.2', price: '3202.00', nullifier: 'demo_seller_2' },
	];
	
	// WBTC/USDC Demo Orders
	const wbtcUsdcOrders = [
		{ side: 'buy' as const, amount: '0.5', price: '65000.00', nullifier: 'demo_buyer_3' },
		{ side: 'sell' as const, amount: '0.3', price: '64900.00', nullifier: 'demo_seller_3' },
	];
	
	// Add ETH/USDC orders
	ethUsdcOrders.forEach((order, idx) => {
		const intent: TradeIntent = {
			id: `demo_eth_${idx}`,
			tokenPair: 'ETH/USDC',
			side: order.side,
			walletCommitment: `0x${Math.random().toString(16).slice(2, 66)}`,
			amount: order.amount,
			price: order.price,
			timestamp: baseTimestamp + idx * 1000,
			worldIdNullifier: order.nullifier,
		};
		orderbook.addIntent(intent);
	});
	
	// Add WBTC/USDC orders
	wbtcUsdcOrders.forEach((order, idx) => {
		const intent: TradeIntent = {
			id: `demo_wbtc_${idx}`,
			tokenPair: 'WBTC/USDC',
			side: order.side,
			walletCommitment: `0x${Math.random().toString(16).slice(2, 66)}`,
			amount: order.amount,
			price: order.price,
			timestamp: baseTimestamp + idx * 1000,
			worldIdNullifier: order.nullifier,
		};
		orderbook.addIntent(intent);
	});
	
	demoDataLoaded = true;
	runtime.log('✅ Demo trades loaded: 4 ETH/USDC orders, 2 WBTC/USDC orders');
}

// ===== Validation Functions =====

async function validateWorldId(
	runtime: Runtime<Config>,
	proof: WorldIDProof
): Promise<{ success: boolean; nullifierHash?: string; reason?: string }> {
	try {
		const config = runtime.config;
		const endpoint = `https://developer.worldcoin.org/api/v2/verify/${config.worldIdAppId}`;

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				merkle_root: proof.merkle_root,
				nullifier_hash: proof.nullifier_hash,
				proof: proof.proof,
				verification_level: proof.verification_level,
				action: config.worldIdAction,
			})
		});

		const data = await response.json();
		if (data.success) {
			return { success: true, nullifierHash: proof.nullifier_hash };
		} else {
			return { success: false, reason: data.detail || 'World ID verification failed' };
		}
	} catch (error: any) {
		return { success: false, reason: `World ID validation error: ${error.message}` };
	}
}

async function validateZKProof(
	runtime: Runtime<Config>,
	zkProof: ZKProof
): Promise<{ success: boolean; walletCommitment?: string; proofHash?: string; reason?: string }> {
	try {
		const config = runtime.config;
		
		// Simulation mode: skip actual ZK verification
		if (config.simulationMode) {
			runtime.log('⚠️  Simulation mode: Skipping ZK verification');
			
			// Return mock successful verification using provided public signals or defaults
			return {
				success: true,
				walletCommitment: zkProof.publicSignals?.[1] || 'simulated_wallet_commitment',
				proofHash: zkProof.publicSignals?.[2] || 'simulated_proof_hash',
			};
		}

		// Production mode: ZK verification would require verification key
		// In production, the verification key must be:
		// 1. Embedded directly in the config as JSON, OR
		// 2. Fetched from a public URL via HTTP
		// File system access (fs.readFileSync) is NOT available in CRE WASM environment
		
		runtime.log('❌ Production ZK verification not yet implemented (requires embedded verification key)');
		return { 
			success: false, 
			reason: 'Production ZK verification requires verification key embedded in config or fetched via HTTP' 
		};
	} catch (error: any) {
		return { success: false, reason: `ZK verification error: ${error.message}` };
	}
}

// ===== Workflow Handlers =====

/**
 * HTTP Handler: Trade Intake
 * Receives trade intents from frontend (PRODUCTION MODE)
 */
const handleTradeIntake = async (
	runtime: Runtime<Config>,
	payload: any
): Promise<any> => {
	runtime.log('🔍 Processing trade intake (PRODUCTION)...');

	// Parse HTTP request body
	const requestBody = typeof payload === 'string' ? JSON.parse(payload) : payload;
	const { worldIdProof, zkProof, trade } = requestBody as {
		worldIdProof: WorldIDProof;
		zkProof: ZKProof;
		trade: { side: 'buy' | 'sell'; tokenPair: string; amount: string; price: string };
	};

	// Step 1: Validate World ID
	runtime.log('1️⃣  Validating World ID proof...');
	const worldIdResult = await validateWorldId(runtime, worldIdProof);
	if (!worldIdResult.success) {
		runtime.log(`❌ World ID validation failed: ${worldIdResult.reason}`);
		return { statusCode: 400, body: { success: false, reason: worldIdResult.reason } };
	}

	// Step 2: Validate ZK Proof
	runtime.log('2️⃣  Validating ZK balance proof...');
	const zkResult = await validateZKProof(runtime, zkProof);
	if (!zkResult.success) {
		runtime.log(`❌ ZK proof validation failed: ${zkResult.reason}`);
		return { statusCode: 400, body: { success: false, reason: zkResult.reason } };
	}

	runtime.log('✅ World ID and ZK proof verified');

	// Step 3: Add to orderbook
	runtime.log('3️⃣  Adding to confidential orderbook...');
	const intent: TradeIntent = {
		id: zkResult.proofHash!,
		walletCommitment: zkResult.walletCommitment!,
		proofHash: zkResult.proofHash!,
		side: trade.side,
		tokenPair: trade.tokenPair,
		amount: trade.amount,
		price: trade.price,
		timestamp: Date.now(),
		worldIdNullifier: worldIdResult.nullifierHash!,
	};

	const addResult = orderbook.addIntent(intent);
	if (!addResult.success) {
		runtime.log(`❌ Failed to add to orderbook: ${addResult.reason}`);
		return { statusCode: 400, body: { success: false, reason: addResult.reason } };
	}

	const depth = orderbook.getDepth(trade.tokenPair);
	runtime.log(`✅ Trade intent added | Orderbook depth: ${depth.buys} buys, ${depth.sells} sells`);

	return {
		statusCode: 200,
		body: {
			success: true,
			intentId: intent.id,
			walletCommitment: zkResult.walletCommitment,
			orderbookDepth: depth,
		}
	};
};

/**
 * Cron Handler: Matching Engine
 * Runs every N seconds, finds matching buy/sell orders
 */
const handleMatchingEngine = (runtime: Runtime<Config>, payload: CronPayload): string => {
	const mode = runtime.config.simulationMode ? 'SIMULATION' : 'PRODUCTION';
	runtime.log(`🎯 Running matching engine (${mode})...`);

	// Load demo trades ONLY in simulation mode (runs once)
	if (runtime.config.simulationMode) {
		loadDemoTrades(runtime);
	}

	const config = runtime.config;
	const tokenPairs = config.tokenPairs;
	const allMatches: MatchedPair[] = [];

	for (const tokenPair of tokenPairs) {
		runtime.log(`📊 Checking ${tokenPair}...`);
		const depth = orderbook.getDepth(tokenPair);
		runtime.log(`   Orderbook: ${depth.buys} buys, ${depth.sells} sells`);

		if (depth.buys === 0 || depth.sells === 0) {
			runtime.log(`   ⏭️  Skipping (no orders on one side)`);
			continue;
		}

		const matches = orderbook.findMatches(tokenPair);
		if (matches.length > 0) {
			runtime.log(`   ✅ Found ${matches.length} matches`);
			allMatches.push(...matches);

			// Execute settlement for each match
			for (const match of matches) {
				executeSettlement(runtime, match);
			}
		} else {
			runtime.log(`   ℹ️  No matches (spread too wide)`);
		}
	}

	// Clear expired orders
	const cleared = orderbook.clearExpiredOrders(86400000);
	if (cleared > 0) {
		runtime.log(`🧹 Cleared ${cleared} expired orders`);
	}

	runtime.log(`✅ Matching complete: ${allMatches.length} total matches`);
	return `Matched ${allMatches.length} trades`;
};

/**
 * Settlement Execution
 * Calls on-chain contracts to settle matched trades
 */
const executeSettlement = (runtime: Runtime<Config>, match: MatchedPair): void => {
	runtime.log(`💱 Executing settlement for match ${match.buyOrder.id.substring(0, 8)}...`);
	runtime.log(`   Pair: ${match.buyOrder.tokenPair}`);
	runtime.log(`   Amount: ${match.matchAmount} @ ${match.matchPrice}`);

	const config = runtime.config;

	try {
		const network = getNetwork({
			chainFamily: 'evm',
			chainSelectorName: config.chainName,
			isTestnet: true,
		});

		if (!network) {
			throw new Error(`Network not found for chain: ${config.chainName}`);
		}

		const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

		// TODO: Call actual OTCSettlement contract when deployed
		// For now, log settlement data
		runtime.log(`   Buyer commitment: ${match.buyOrder.walletCommitment}`);
		runtime.log(`   Seller commitment: ${match.sellOrder.walletCommitment}`);
		runtime.log(`   Settlement contract: ${config.otcSettlementAddress}`);
		runtime.log(`   ✅ Settlement prepared (awaiting contract deployment)`);

	} catch (error: any) {
		runtime.log(`   ❌ Settlement error: ${error.message}`);
	}
};

// ===== Workflow Setup =====

const initWorkflow = (config: Config) => {
	const http = new cre.capabilities.HTTPCapability();
	const cron = new cre.capabilities.CronCapability();

	const handlers = [];

	// HTTP endpoint for trade intake (PRODUCTION)
	// Note: HTTP triggers work in deployment, may have issues in local simulation
	if (!config.simulationMode) {
		handlers.push(
			cre.handler(
				http.trigger(),
				handleTradeIntake,
			)
		);
	}

	// Cron job for matching engine (BOTH simulation and production)
	handlers.push(
		cre.handler(
			cron.trigger({
				schedule: config.schedule,
			}),
			handleMatchingEngine,
		)
	);

	return handlers;
};

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema });
	await runner.run(initWorkflow);
}

main();
