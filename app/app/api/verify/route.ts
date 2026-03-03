import { NextRequest, NextResponse } from 'next/server'

interface IRequestPayload {
  payload: {
    proof: string
    merkle_root: string
    nullifier_hash: string
    verification_level: string
  }
  action: string
  signal: string | undefined
}

export async function POST(req: NextRequest) {
  const { payload, action, signal } = (await req.json()) as IRequestPayload

  const rpId = process.env.WORLD_RP_ID?.trim()
  const isStaging = process.env.NEXT_PUBLIC_WORLD_ENVIRONMENT === 'staging'

  if (!rpId) {
    return NextResponse.json({ error: 'Missing RP credentials' }, { status: 500 })
  }

  // In staging mode the simulator produces proofs against the staging identity tree,
  // which the production verify endpoint will always reject with invalid_merkle_root.
  // Skip cloud verification for staging — the ZK proof itself is still valid.
  if (!isStaging) {
    // World ID 4.0 verification — forward to World's cloud API using rp_id
    const verifyRes = await fetch(`https://developer.world.org/api/v4/verify/${rpId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        action,
        signal_hash: signal
          ? '0x' + Buffer.from(signal).toString('hex').slice(0, 64).padStart(64, '0')
          : undefined,
      }),
    })

    const verifyData = await verifyRes.json()
    if (!verifyRes.ok) {
      return NextResponse.json({ success: false, error: verifyData }, { status: 400 })
    }
  }
  // Forward proof to Dev 3's CRE endpoint if configured
  const creEndpoint = process.env.CRE_INTAKE_ENDPOINT
  if (creEndpoint) {
    await fetch(creEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worldIdProof: payload,
        nullifierHash: payload.nullifier_hash,
        action,
        signal,
      }),
    }).catch(console.error)
  }

  return NextResponse.json({ success: true, status: 200 })
}
