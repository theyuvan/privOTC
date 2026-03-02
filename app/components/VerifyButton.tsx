'use client'

import { MiniKit } from '@worldcoin/minikit-js'
import { IDKit, orbLegacy } from '@worldcoin/idkit-core'
import { useState } from 'react'

interface VerifyButtonProps {
  onVerified: (walletAddress: string) => void
}

export function VerifyButton({ onVerified }: VerifyButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify() {
    setLoading(true)
    setError(null)

    try {
      // Step 1: Connect wallet via MiniKit
      const walletRes = await MiniKit.commandsAsync.walletAuth({
        nonce: crypto.randomUUID(),
        statement: 'Connect to PrivOTC to trade confidentially',
      })

      if (walletRes.finalPayload.status === 'error') {
        setError('Wallet connection failed. Please try again.')
        setLoading(false)
        return
      }

      const walletAddress = walletRes.finalPayload.address

      // Step 2: Fetch RP signature from backend (World ID 4.0 requirement)
      const rpRes = await fetch('/api/rp-signature', { method: 'POST' })
      if (!rpRes.ok) {
        setError('Failed to initialize verification. Please try again.')
        setLoading(false)
        return
      }
      const rpContext = await rpRes.json()

      // Step 3: World ID 4.0 verification via IDKit
      const action = process.env.NEXT_PUBLIC_WORLD_ACTION || 'verify-trade'
      const appId = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`

      const request = await IDKit.request({
        app_id: appId,
        action,
        rp_context: rpContext,
        allow_legacy_proofs: true,
        environment: 'production',
      }).preset(orbLegacy({ signal: walletAddress }))

      const completion = await request.pollUntilCompletion()

      if (!completion.success) {
        setError(`Verification failed: ${completion.error ?? 'Unknown error'}`)
        setLoading(false)
        return
      }

      // Step 4: Validate proof on backend
      const verifyRes = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: completion.result,
          action,
          signal: walletAddress,
        }),
      })

      const data = await verifyRes.json()

      if (data.success) {
        onVerified(walletAddress)
      } else {
        setError('Proof verification failed. You may have already verified with this identity.')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleVerify}
        disabled={loading}
        className="bg-black text-white px-8 py-3 rounded-full font-semibold text-sm disabled:opacity-50 hover:bg-gray-800 transition-colors"
      >
        {loading ? 'Verifying...' : 'Verify with World ID'}
      </button>
      {error && (
        <p className="text-red-500 text-xs text-center max-w-xs">{error}</p>
      )}
    </div>
  )
}
