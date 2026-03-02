'use client'

import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js'
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
      // Step 1: Get wallet address
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

      // Step 2: World ID verification
      const verifyRes = await MiniKit.commandsAsync.verify({
        action: process.env.NEXT_PUBLIC_WORLD_ACTION || 'verify-trade',
        signal: walletAddress,
        verification_level: VerificationLevel.Orb,
      })

      if (verifyRes.finalPayload.status === 'error') {
        setError('World ID verification failed. Only Orb-verified humans can trade.')
        setLoading(false)
        return
      }

      // Step 3: Validate proof on backend
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: verifyRes.finalPayload,
          action: process.env.NEXT_PUBLIC_WORLD_ACTION || 'verify-trade',
          signal: walletAddress,
        }),
      })

      const data = await res.json()

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
