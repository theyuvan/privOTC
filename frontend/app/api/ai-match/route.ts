import { NextRequest, NextResponse } from 'next/server'
import { aiMatchingAgent } from '@/lib/ai-matching-agent'

/**
 * AI-Powered Trade Matching Endpoint
 * 
 * POST /api/ai-match - Submit trade and trigger AI matching
 * GET /api/ai-match - Get current order pool status
 */

// In-memory storage for matched trades
const matchedTrades: any[] = []

// GET /api/ai-match - View current order pool and matches
export async function GET(req: NextRequest) {
  const orderPool = aiMatchingAgent.getOrderPool()
  
  return NextResponse.json({
    orderPool: orderPool.map(o => ({
      tradeId: o.tradeId,
      user: o.user,
      type: o.type,
      asset: o.asset,
      amount: o.amount,
      price: o.price,
      timestamp: o.timestamp
    })),
    orderPoolSize: orderPool.length,
    matchedTradesCount: matchedTrades.length,
    recentMatches: matchedTrades.slice(-5)
  })
}

// POST /api/ai-match - Submit trade intent to AI agent
export async function POST(req: NextRequest) {
  const body = await req.json()
  
  // Extract trade data
  const { worldIdProof, zkProof, trade, walletAddress, timestamp } = body
  
  // Validate required fields
  if (!trade || !trade.side || !trade.tokenPair || !trade.amount || !trade.price) {
    return NextResponse.json({
      success: false,
      error: 'Missing required trade fields: side, tokenPair, amount, price'
    }, { status: 400 })
  }

  // Parse token pair (e.g., "ETH/WLD" → buy ETH, sell WLD for buyer)
  const [baseAsset, quoteAsset] = trade.tokenPair.split('/')
  
  // Create trade intent for AI agent
  const tradeIntent = {
    user: walletAddress || `trader-${Date.now()}`,
    walletAddress: walletAddress || undefined,
    type: trade.side, // 'buy' or 'sell'
    asset: baseAsset, // e.g., 'ETH'
    amount: parseFloat(trade.amount),
    price: parseFloat(trade.price),
    timestamp: timestamp || Date.now(),
    tradeId: `trade-${timestamp || Date.now()}`,
    worldIdProof,
    zkProof
  }

  console.log(`🤖 AI Agent: New trade intent - ${tradeIntent.type} ${tradeIntent.amount} ${tradeIntent.asset} @ $${tradeIntent.price}`)

  // Add to AI matching agent (async with ChatOpenAI)
  const matches = await aiMatchingAgent.addTradeIntent(tradeIntent)

  if (matches.length > 0) {
    // Store matches
    matchedTrades.push(...matches)
    
    console.log(`✅ AI Agent found ${matches.length} new match(es)!`)
    
    // Post matches to frontend /api/matches endpoint
    for (const match of matches) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/matches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: match.matchId,
            tradeId: match.tradeId,
            buyerAddress: match.buyerAddress,
            sellerAddress: match.sellerAddress,
            ethAmount: match.asset === 'ETH' ? match.amount : 0, // ETH amount
            wldAmount: match.asset === 'WLD' ? match.amount : 0,  // WLD amount
            matchPrice: match.price,
            confidence: match.confidence,
            deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour
          })
        })
        console.log(`📤 Match ${match.matchId} posted to /api/matches`)
      } catch (err) {
        console.error('Failed to post match:', err)
      }
    }

    return NextResponse.json({
      success: true,
      tradeId: tradeIntent.tradeId,
      status: 'matched',
      matches: matches.map(m => ({
        matchId: m.matchId,
        counterparty: tradeIntent.type === 'buy' ? m.seller : m.buyer,
        amount: m.amount,
        price: m.price,
        confidence: m.confidence
      })),
      message: `Trade matched! ${matches.length} compatible counterpart${matches.length > 1 ? 'ies' : 'y'} found.`
    })
  }

  // No match found yet - trade added to order pool
  return NextResponse.json({
    success: true,
    tradeId: tradeIntent.tradeId,
    status: 'pending',
    queuePosition: aiMatchingAgent.getOrderPool().length,
    message: 'Trade added to order pool. AI agent will match when compatible counterparty appears.'
  })
}

// DELETE /api/ai-match - Clear order pool (admin only)
export async function DELETE(req: NextRequest) {
  // Check admin API key
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== process.env.ADMIN_API_KEY && apiKey !== 'hackathon-demo-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  aiMatchingAgent.clearOrderPool()
  matchedTrades.length = 0

  return NextResponse.json({
    success: true,
    message: 'Order pool and matches cleared'
  })
}
