/**
 * Confidential In-Memory Orderbook
 * Runs in CRE Confidential Compute (TEE)
 * Only matched orders are revealed, unmatched orders remain private
 */

export interface TradeIntent {
  id: string;
  walletCommitment: string;  // From ZK proof
  walletAddress: string;     // Actual wallet address — needed by CRE to call settle(buyer, seller)
  proofHash: string;         // From ZK proof
  onChainTxHash?: string;    // submitBalanceProof tx hash (on-chain ZK verification receipt)
  side: 'buy' | 'sell';
  tokenPair: string;         // e.g., "ETH/USDC"
  amount: string;
  price: string;
  timestamp: number;
  worldIdNullifier: string;  // Ensures one trade per person
  encryptedDetails?: string; // Optional encrypted metadata
}

export interface MatchedPair {
  buyOrder: TradeIntent;
  sellOrder: TradeIntent;
  matchPrice: string;
  matchAmount: string;
  matchTimestamp: number;
}

export class ConfidentialOrderbook {
  private buyOrders: Map<string, TradeIntent[]> = new Map(); // tokenPair -> orders
  private sellOrders: Map<string, TradeIntent[]> = new Map();
  private usedNullifiers: Set<string> = new Set(); // Prevent double-trading

  /**
   * Add trade intent to orderbook
   * Returns error if nullifier already used
   */
  addIntent(intent: TradeIntent): { success: boolean; reason?: string } {
    // Check nullifier uniqueness (one trade per verified human)
    if (this.usedNullifiers.has(intent.worldIdNullifier)) {
      return {
        success: false,
        reason: 'World ID nullifier already used - only one trade per person allowed'
      };
    }

    // Add to appropriate side
    const book = intent.side === 'buy' ? this.buyOrders : this.sellOrders;
    if (!book.has(intent.tokenPair)) {
      book.set(intent.tokenPair, []);
    }
    
    const orders = book.get(intent.tokenPair)!;
    orders.push(intent);
    
    // Sort by price-time priority
    // Buy orders: highest price first
    // Sell orders: lowest price first
    orders.sort((a, b) => {
      const priceA = parseFloat(a.price);
      const priceB = parseFloat(b.price);
      
      if (intent.side === 'buy') {
        return priceB - priceA || a.timestamp - b.timestamp;
      } else {
        return priceA - priceB || a.timestamp - b.timestamp;
      }
    });

    // Mark nullifier as used
    this.usedNullifiers.add(intent.worldIdNullifier);

    console.log(`✅ Added ${intent.side} order: ${intent.amount} @ ${intent.price} (${intent.tokenPair})`);
    return { success: true };
  }

  /**
   * Find matches for a token pair
   * Returns matched pairs (both orders revealed together)
   */
  findMatches(tokenPair: string): MatchedPair[] {
    const buyOrders = this.buyOrders.get(tokenPair) || [];
    const sellOrders = this.sellOrders.get(tokenPair) || [];
    const matches: MatchedPair[] = [];

    let buyIdx = 0;
    let sellIdx = 0;

    // Price-time matching (FIFO at same price level)
    while (buyIdx < buyOrders.length && sellIdx < sellOrders.length) {
      const buyOrder = buyOrders[buyIdx];
      const sellOrder = sellOrders[sellIdx];

      const buyPrice = parseFloat(buyOrder.price);
      const sellPrice = parseFloat(sellOrder.price);

      // Check if prices cross (buy >= sell)
      if (buyPrice >= sellPrice) {
        // Match found
        const matchPrice = sellOrder.timestamp < buyOrder.timestamp
          ? sellOrder.price  // Seller was first (maker price)
          : buyOrder.price;  // Buyer was first (maker price)

        const buyAmount = parseFloat(buyOrder.amount);
        const sellAmount = parseFloat(sellOrder.amount);
        const matchAmount = Math.min(buyAmount, sellAmount).toString();

        matches.push({
          buyOrder,
          sellOrder,
          matchPrice,
          matchAmount,
          matchTimestamp: Date.now()
        });

        // Remove matched orders
        buyIdx++;
        sellIdx++;
      } else {
        // No more matches possible (prices don't cross)
        break;
      }
    }

    // Remove matched orders from orderbook
    if (matches.length > 0) {
      this.buyOrders.set(tokenPair, buyOrders.slice(buyIdx));
      this.sellOrders.set(tokenPair, sellOrders.slice(sellIdx));

      console.log(`🎯 Found ${matches.length} matches for ${tokenPair}`);
    }

    return matches;
  }

  /**
   * Get orderbook depth (for monitoring, no sensitive info)
   */
  getDepth(tokenPair: string): { buys: number; sells: number } {
    return {
      buys: this.buyOrders.get(tokenPair)?.length || 0,
      sells: this.sellOrders.get(tokenPair)?.length || 0
    };
  }

  /**
   * Clear old orders (e.g., after 24 hours)
   */
  clearExpiredOrders(maxAge: number = 86400000): number {
    const now = Date.now();
    let cleared = 0;

    const clearFromBook = (book: Map<string, TradeIntent[]>) => {
      book.forEach((orders, tokenPair) => {
        const filtered = orders.filter(o => now - o.timestamp < maxAge);
        cleared += orders.length - filtered.length;
        book.set(tokenPair, filtered);
      });
    };

    clearFromBook(this.buyOrders);
    clearFromBook(this.sellOrders);

    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} expired orders`);
    }

    return cleared;
  }
}

// Export singleton instance (runs in TEE memory)
export const orderbook = new ConfidentialOrderbook();
