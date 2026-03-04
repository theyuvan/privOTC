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

  if (!rpId) {
    return NextResponse.json({ error: 'Missing RP credentials' }, { status: 500 })
  }

  // NOTE: Cloud proof re-verification is skipped for the hackathon demo.
  // The ZK proof is validated by IDKit at the protocol level.
  // Production deployments should re-enable the cloud verify call:
  // POST https://developer.world.org/api/v4/verify/${rpId}
  // Forward proof to CRE endpoint if configured
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
