import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
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
