import { NextResponse } from 'next/server'
import { signRequest } from '@worldcoin/idkit-server'

export async function POST() {
  const signingKey = process.env.RP_SIGNING_KEY?.trim()
  const rpId = process.env.WORLD_RP_ID?.trim()

  if (!signingKey || !rpId) {
    return NextResponse.json({ error: `Missing RP credentials: rpId=${!!rpId} signingKey=${!!signingKey}` }, { status: 500 })
  }

  try {
    // signRequest expects raw hex without 0x prefix or whitespace
    const cleanKey = signingKey.replace(/^0x/i, '').trim()
    const rpSignature = signRequest(
      process.env.NEXT_PUBLIC_WORLD_ACTION || 'verify-trade',
      cleanKey,
    )

    return NextResponse.json({
      rp_id: rpId,
      nonce: rpSignature.nonce,
      created_at: rpSignature.createdAt,
      expires_at: rpSignature.expiresAt,
      signature: rpSignature.sig,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `signRequest failed: ${message}` }, { status: 500 })
  }
}
