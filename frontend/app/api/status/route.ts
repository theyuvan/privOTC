import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const tradeId = req.nextUrl.searchParams.get('tradeId')
  if (!tradeId) return NextResponse.json({ error: 'Missing tradeId' }, { status: 400 })

  const creEndpoint = process.env.CRE_INTAKE_ENDPOINT
  if (!creEndpoint || tradeId.startsWith('mock-')) {
    // Mock status for local dev — cycles through states over time
    const age = Date.now() - parseInt(tradeId.replace('mock-', ''))
    let status = 'pending'
    if (age > 5000) status = 'matched'
    if (age > 10000) status = 'settling'
    if (age > 15000) status = 'complete'
    return NextResponse.json({ tradeId, status })
  }

  const res = await fetch(`${creEndpoint}/status?tradeId=${tradeId}`)
  const data = await res.json()
  return NextResponse.json(data)
}
