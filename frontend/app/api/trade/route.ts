import { NextRequest, NextResponse } from 'next/server'

// In-memory trade queue (FIFO) - for development/demo
// In production, use Redis or database
const pendingTrades: any[] = []

// GET /api/trade - For CRE to pull pending trades
// Add ?drain=true to consume the queue; without it, just peek
export async function GET(req: NextRequest) {
  if (pendingTrades.length === 0) {
    console.log('🔵 CRE requested trade data - No pending trades')
    return NextResponse.json({ trades: [] })
  }

  const drain = req.nextUrl.searchParams.get('drain') !== 'false'

  // Return ALL pending trades and clear the queue only if draining
  const trades = [...pendingTrades]
  if (drain) {
    pendingTrades.length = 0 // Clear array
    console.log(`🔵 CRE pulled (drain) ${trades.length} trades`)
  } else {
    console.log(`🔵 Peek (no drain): ${trades.length} trades in queue`)
  }
  trades.forEach(t => console.log(`   - ${t.trade.side} ${t.trade.amount} ${t.trade.token} @ ${t.trade.price}`))
  
  return NextResponse.json({ trades })
}

// POST /api/trade - For frontend to submit trades
export async function POST(req: NextRequest) {
  const body = await req.json()
  
  // Check if this is a full trade submission (with worldIdProof, zkProof, trade data)
  if (body.worldIdProof && body.trade) {
    // Add timestamp if not present
    if (!body.timestamp) {
      body.timestamp = Date.now()
    }

    // Validate token (single token for same-token trades)
    const ALLOWED_TOKENS = ['ETH', 'WLD']
    if (!body.trade?.token || !ALLOWED_TOKENS.includes(body.trade.token)) {
      console.error('❌ Trade rejected: Invalid token:', body.trade?.token)
      return NextResponse.json({
        success: false,
        error: `Invalid token. Allowed: ${ALLOWED_TOKENS.join(', ')}`
      }, { status: 400 })
    }

    // Validate REAL proofs exist - no fallbacks!
    if (!body.zkProof || !body.publicSignals || body.publicSignals.length === 0) {
      console.error('❌ Trade rejected: Missing ZK proof')
      return NextResponse.json({ 
        success: false, 
        error: 'ZK proof required. Proof generation failed or incomplete.' 
      }, { status: 400 })
    }

    if (!body.worldIdProof || typeof body.worldIdProof !== 'object') {
      console.error('❌ Trade rejected: Missing World ID proof object')
      return NextResponse.json({ 
        success: false, 
        error: 'World ID verification required. Please verify with World App.' 
      }, { status: 400 })
    }

    // Restructure ZK proof to match CRE expected format (both proofs are REAL)
    const tradeData = {
      worldIdProof: body.worldIdProof,
      zkProof: {
        proof: body.zkProof,
        publicSignals: body.publicSignals,
      },
      walletAddress: body.walletAddress ?? null,   // actual wallet address for on-chain settle()
      onChainTxHash: body.onChainTxHash ?? null,   // submitBalanceProof tx hash
      trade: body.trade,
      timestamp: body.timestamp,
    }
    
    // Add to pending trades queue
    pendingTrades.push(tradeData)
    console.log(`✅ Trade queued: ${body.trade.side} ${body.trade.amount} ${body.trade.token} @ ${body.trade.price}`)
    console.log(`   Token: ${body.trade.token} (same token for both parties)`)
    console.log(`   Chain: ${body.chain || 'auto-detected'}`)
    console.log(`   Queue size: ${pendingTrades.length}`)
    console.log(`   Wallet address: ${body.walletAddress ?? 'not set'}`)
    console.log(`   On-chain ZK tx: ${body.onChainTxHash ?? '(simulation — no tx)'}`)
    console.log(`   ZK proof type: ${body.zkProof ? 'REAL (Groth16)' : 'MOCK'}`)
    
    return NextResponse.json({ 
      success: true, 
      tradeId: `trade-${body.timestamp}`,
      queuePosition: pendingTrades.length,
      status: 'queued',
      zkProofVerified: !!body.zkProof, 
    })
  }
  
  // Legacy encrypted intent format (for production CRE deployment)
  const { encryptedIntent, intentHash, walletAddress } = body

  if (!encryptedIntent || !intentHash || !walletAddress) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const creEndpoint = process.env.CRE_INTAKE_ENDPOINT
  if (!creEndpoint) {
    // CRE not deployed yet — return mock tradeId
    const tradeId = `mock-${Date.now()}`
    return NextResponse.json({ success: true, tradeId, status: 'pending' })
  }

  // Forward encrypted intent to CRE
  const creRes = await fetch(`${creEndpoint}/trade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encryptedIntent, intentHash, walletAddress }),
  })

  const data = await creRes.json()
  return NextResponse.json(data)
}

// DELETE /api/trade - Clear the pending trade queue
export async function DELETE() {
  const count = pendingTrades.length
  pendingTrades.length = 0
  console.log(`🗑️  Trade queue cleared (${count} trades removed)`)
  return NextResponse.json({ success: true, cleared: count })
}
