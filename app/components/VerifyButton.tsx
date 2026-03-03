'use client'

import { IDKit, selfieCheckLegacy } from '@worldcoin/idkit-core'
import { MiniKit } from '@worldcoin/minikit-js'
import { useState } from 'react'

const APP_ID = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`
const ACTION = process.env.NEXT_PUBLIC_WORLD_ACTION || 'verify-trade'

interface VerifyButtonProps {
  onVerified: (walletAddress: string) => void
}

export function VerifyButton({ onVerified }: VerifyButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify() {
    if (!MiniKit.isInstalled()) {
      setError('Open this app inside World App — it cannot run in a regular browser.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Step 1: walletAuth — get the user's wallet address
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
      const rpContext = await fetch('/api/rp-signature', { method: 'POST' }).then((r) => r.json())

      if (rpContext.error) {
        setError('Server configuration error. Please contact support.')
        setLoading(false)
        return
      }

      // Step 3: IDKit + selfieCheckLegacy — no Orb needed, just a selfie in World App
      const request = await IDKit.request({
        app_id: APP_ID,
        action: ACTION,
        rp_context: rpContext,
        allow_legacy_proofs: true,
        environment: 'production',
      }).preset(selfieCheckLegacy({ signal: walletAddress }))

      const completion = await request.pollUntilCompletion()

      if (!completion.success) {
        const code = String(completion.error ?? 'unknown')
        if (code.includes('rejected') || code.includes('cancel')) {
          setError('Verification cancelled. Tap Verify and confirm in World App.')
        } else if (code.includes('credential_unavailable')) {
          setError('Selfie Check credential unavailable. Make sure World App is up to date and try again.')
        } else {
          setError(`World ID verification failed (${code}). Please try again.`)
        }
        setLoading(false)
        return
      }

      // Step 4: Backend proof validation
      const result = completion.result as unknown as {
        proof: string
        merkle_root: string
        nullifier_hash: string
        verification_level: string
      }

      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: result,
          action: ACTION,
          signal: walletAddress,
        }),
      })

      const data = await res.json()

      if (data.success) {
        onVerified(walletAddress)
      } else {
        const errMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : (data.error ?? 'unknown')
        setError(`Proof rejected: ${errMsg}`)
      }
    } catch (err) {
      setError('Unexpected error — please refresh and try again.')
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
