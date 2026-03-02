import { NextResponse } from 'next/server'
import { signRequest } from '@worldcoin/idkit-server'

export async function POST() {
  const signingKey = process.env.RP_SIGNING_KEY
  const rpId = process.env.WORLD_RP_ID

  if (!signingKey || !rpId) {
    return NextResponse.json({ error: 'Missing RP credentials' }, { status: 500 })
  }

  const rpSignature = signRequest(
    process.env.NEXT_PUBLIC_WORLD_ACTION || 'verify-trade',
    signingKey,
  )

  return NextResponse.json({
    rp_id: rpId,
    nonce: rpSignature.nonce,
    created_at: rpSignature.createdAt,
    expires_at: rpSignature.expiresAt,
    signature: rpSignature.sig,
  })
}
