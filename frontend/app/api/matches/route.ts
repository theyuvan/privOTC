import { NextRequest, NextResponse } from 'next/server'

export interface Match {
  matchId: string
  tradeId: string       // bytes32 hex (used to compute escrow IDs on-chain)
  buyerAddress: string
  sellerAddress: string
  tokenPair: string
  ethAmount: string     // ETH in wei (what seller deposits)
  wldAmount: string     // WLD in wei (what buyer deposits)
  matchPrice: string
  deadline: number      // unix timestamp seconds (5 min from match)
  settled: boolean
  createdAt: number
  chain?: 'ethereum' | 'worldChain'  // Which chain to use for this trade
  token?: 'ETH' | 'WLD'              // Primary trading token
}

// In-memory match store; keyed by matchId
const matchStore = new Map<string, Match>()

// DELETE /api/matches — clears all matches (used to reset stale state)
export async function DELETE() {
  matchStore.clear()
  return NextResponse.json({ ok: true, cleared: true })
}

// GET /api/matches?wallet=0x... — returns active matches for a wallet
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet')?.toLowerCase()
  if (!wallet) {
    return NextResponse.json({ matches: [] })
  }

  const result = Array.from(matchStore.values()).filter(
    m =>
      !m.settled &&
      (m.buyerAddress.toLowerCase() === wallet ||
        m.sellerAddress.toLowerCase() === wallet)
  )

  return NextResponse.json({ matches: result })
}

// POST /api/matches — CRE workflow posts a new match here
export async function POST(req: NextRequest) {
  const body = await req.json()

  const match: Match = {
    matchId: body.matchId,
    tradeId: body.tradeId,
    buyerAddress: body.buyerAddress,
    sellerAddress: body.sellerAddress,
    tokenPair: body.tokenPair || body.token || 'ETH', // Support both old and new format
    ethAmount: body.ethAmount,   // wei
    wldAmount: body.wldAmount,   // wei
    matchPrice: body.matchPrice,
    deadline: body.deadline,
    settled: false,
    createdAt: Date.now(),
    chain: body.chain || (body.token === 'WLD' ? 'worldChain' : 'ethereum'), // Add chain
    token: body.token || body.tokenPair?.split('/')[0] || 'ETH', // Add token
  }

  matchStore.set(match.matchId, match)

  console.log(`✅ Match stored: ${match.matchId}`)
  console.log(`   Buyer: ${match.buyerAddress}`)
  console.log(`   Seller: ${match.sellerAddress}`)
  console.log(`   ETH: ${match.ethAmount} wei, WLD: ${match.wldAmount} wei`)
  console.log(`   Deadline: ${new Date(match.deadline * 1000).toISOString()}`)

  return NextResponse.json({ success: true, matchId: match.matchId })
}

// PATCH /api/matches — Mark a match as settled
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { matchId } = body

  const match = matchStore.get(matchId)
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  match.settled = true
  console.log(`✅ Match ${matchId} marked as settled`)

  return NextResponse.json({ success: true })
}
