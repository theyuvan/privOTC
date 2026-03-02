import { NextRequest, NextResponse } from 'next/server'
import { verifyCloudProof, IVerifyResponse, ISuccessResult } from '@worldcoin/minikit-js'

interface IRequestPayload {
  payload: ISuccessResult
  action: string
  signal: string | undefined
}

export async function POST(req: NextRequest) {
  const { payload, action, signal } = (await req.json()) as IRequestPayload

  const app_id = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`
  const verifyRes = (await verifyCloudProof(payload, app_id, action, signal)) as IVerifyResponse

  if (verifyRes.success) {
    // Proof is valid — forward to Dev 3's CRE endpoint if configured
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
  } else {
    return NextResponse.json({ success: false, error: verifyRes, status: 400 }, { status: 400 })
  }
}
