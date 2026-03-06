/**
 * AI-Powered Trade Matching Agent
 * Uses LangChain ChatGroq to intelligently match OTC trades (FREE!)
 * 
 * Matching Rules:
 * 1. Asset Compatibility: buy.asset === sell.asset
 * 2. Price Compatibility: buy.price >= sell.price
 * 3. Amount Compatibility: sell.amount >= buy.amount
 */

import { ChatGroq } from '@langchain/groq'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

interface TradeIntent {
  user: string
  walletAddress?: string
  type: 'buy' | 'sell'
  asset: string
  amount: number
  price: number
  timestamp: number
  tradeId: string
  worldIdProof?: any
  zkProof?: any
}

interface MatchResult {
  buyer: string
  seller: string
  buyerAddress?: string
  sellerAddress?: string
  asset: string
  amount: number
  price: number // Midpoint price
  matchTimestamp: number
  matchId: string
  tradeId: string
  confidence: number // AI confidence score (0-1)
}

export class AIMatchingAgent {
  private model: ChatGroq | null = null
  private orderPool: TradeIntent[] = []
  private useAI: boolean = false

  constructor() {
    // Initialize ChatGroq if API key is available (FREE!)
    const apiKey = process.env.GROQ_API_KEY
    
    if (apiKey) {
      try {
        this.model = new ChatGroq({
          model: 'llama-3.1-70b-versatile', // Fast, FREE, and powerful!
          temperature: 0.3, // Low temperature for consistent matching
          apiKey: apiKey,
        })
        this.useAI = true
        console.log('🤖 AI Matching Agent initialized with Groq (llama-3.1-70b-versatile) - FREE!')
      } catch (error) {
        console.warn('⚠️ Failed to initialize Groq, falling back to rule-based matching:', error)
        this.useAI = false
      }
    } else {
      console.log('🤖 AI Matching Agent initialized with rule-based matching (set GROQ_API_KEY to enable FREE AI)')
    }
  }

  /**
   * Add trade intent to the order pool
   */
  async addTradeIntent(trade: TradeIntent): Promise<MatchResult[]> {
    this.orderPool.push(trade)
    console.log(`📊 Order pool size: ${this.orderPool.length}`)
    
    // Trigger matching after adding
    return await this.findMatches()
  }

  /**
   * Find compatible trade matches using AI logic
   */
  async findMatches(): Promise<MatchResult[]> {
    const matches: MatchResult[] = []
    
    const buyOrders = this.orderPool.filter(t => t.type === 'buy')
    const sellOrders = this.orderPool.filter(t => t.type === 'sell')

    console.log(`🔍 AI Agent analyzing: ${buyOrders.length} buy orders, ${sellOrders.length} sell orders`)

    for (const buy of buyOrders) {
      for (const sell of sellOrders) {
        // AI Matching Logic (async when using ChatOpenAI)
        const isCompatible = await this.evaluateCompatibility(buy, sell)
        
        if (isCompatible) {
          const match = this.createMatch(buy, sell)
          matches.push(match)
          
          // Remove matched orders from pool
          this.removeOrder(buy.tradeId)
          this.removeOrder(sell.tradeId)
          
          console.log(`✅ Match found: ${buy.user} ↔ ${sell.user} | ${match.amount} ${match.asset} @ $${match.price}`)
        }
      }
    }

    return matches
  }

  /**
   * AI-powered compatibility evaluation
   * Uses ChatOpenAI for intelligent matching decisions
   */
  private async evaluateCompatibility(buy: TradeIntent, sell: TradeIntent): Promise<boolean> {
    // Basic rule-based checks first (fast pre-filter)
    if (buy.asset !== sell.asset) return false
    if (buy.price < sell.price) return false
    if (sell.amount < buy.amount) return false

    // If AI is enabled, use ChatOpenAI for enhanced decision-making
    if (this.useAI && this.model) {
      try {
        const systemPrompt = `You are an expert OTC trade matcher for decentralized finance. 
Your role is to evaluate if two trades should be matched based on:
- Asset compatibility
- Price fairness (considering market conditions)
- Amount feasibility
- User risk profiles
- Timing considerations

Respond with ONLY a JSON object: {"match": true/false, "confidence": 0-1, "reason": "brief explanation"}`

        const userPrompt = `Evaluate this trade match:

BUY ORDER:
- User: ${buy.user}
- Asset: ${buy.asset}
- Amount: ${buy.amount}
- Max Price: $${buy.price}
- Timestamp: ${new Date(buy.timestamp).toISOString()}

SELL ORDER:
- User: ${sell.user}
- Asset: ${sell.asset}
- Amount: ${sell.amount}
- Min Price: $${sell.price}
- Timestamp: ${new Date(sell.timestamp).toISOString()}

Should these trades be matched?`

        const response = await this.model.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage(userPrompt)
        ])

        const result = JSON.parse(response.content as string)
        console.log(`🧠 Groq AI Decision: ${result.match ? '✅ MATCH' : '❌ NO MATCH'} (${result.confidence * 100}% confidence) - ${result.reason}`)
        
        return result.match && result.confidence >= 0.7 // Require 70% AI confidence
      } catch (error) {
        console.warn('⚠️ AI evaluation failed, using rule-based fallback:', error)
        return true // Fallback: basic rules already passed
      }
    }

    // Rule-based matching (all conditions already met above)
    return true
  }

  /**
   * Create match result with AI-calculated fair price
   */
  private createMatch(buy: TradeIntent, sell: TradeIntent): MatchResult {
    // AI Price Discovery: Calculate midpoint for fair settlement
    const fairPrice = (buy.price + sell.price) / 2
    
    // Calculate AI confidence score
    const priceSpread = buy.price - sell.price
    const confidence = Math.min(1, 1 - (priceSpread / buy.price))

    return {
      buyer: buy.user,
      seller: sell.user,
      buyerAddress: buy.walletAddress,
      sellerAddress: sell.walletAddress,
      asset: buy.asset,
      amount: buy.amount,
      price: fairPrice,
      matchTimestamp: Date.now(),
      matchId: `match-${Date.now()}`,
      tradeId: `0x${Buffer.from(`${buy.tradeId}-${sell.tradeId}`).toString('hex').slice(0, 64)}`,
      confidence
    }
  }

  /**
   * Remove order from pool after matching
   */
  private removeOrder(tradeId: string) {
    const index = this.orderPool.findIndex(t => t.tradeId === tradeId)
    if (index !== -1) {
      this.orderPool.splice(index, 1)
    }
  }

  /**
   * Get current order pool state
   */
  getOrderPool(): TradeIntent[] {
    return [...this.orderPool]
  }

  /**
   * Clear all orders
   */
  clearOrderPool() {
    this.orderPool = []
    console.log('🗑️ Order pool cleared')
  }
}

// Global singleton instance
export const aiMatchingAgent = new AIMatchingAgent()
