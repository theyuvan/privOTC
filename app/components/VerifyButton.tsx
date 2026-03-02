'use client'

import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js'
import { useState } from 'react'

interface VerifyButtonProps {
  onVerified: (walletAddress: string) => void
}

const ERROR_MESSAGES: Record<string, string> = {
  credential_unavailable:
    'No Device credential found. In World App → World ID tab → tap "Tap to verify" to set up your Device credential, then try again.',
  verification_rejected: 'You rejected the verification. Tap Verify and confirm in World App.',
  max_verifications_reached:
    'You have already verified the maximum number of times for this action.',
  malformed_request: 'Bad request — please refresh and try again.',
  invalid_network:
    'Network mismatch. Make sure you are using the production World App (not Simulator).',
  inclusion_proof_pending:
    'Your credential is not yet on-chain. Wait ~1 hour after setting up Device verification, then try again.',
  inclusion_proof_failed: 'Proof retrieval failed — please try again.',
  user_rejected: 'You rejected the wallet connection. Tap Verify and confirm in World App.',
}

export function VerifyButton({ onVerified }: VerifyButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugCode, setDebugCode] = useState<string | null>(null)

  async function handleVerify() {
    // Guard: must be inside World App
    if (!MiniKit.isInstalled()) {
      setError('Open this app inside World App — it cannot run in a regular browser.')
      return
    }

    setLoading(true)
    setError(null)
    setDebugCode(null)

    try {
      // Step 1: Connect wallet
      const walletRes = await MiniKit.commandsAsync.walletAuth({
        nonce: crypto.randomUUID(),
        statement: 'Connect to PrivOTC to trade confidentially',
      })

      if (walletRes.finalPayload.status === 'error') {
        const code = (walletRes.finalPayload as { error_code?: string }).error_code ?? 'unknown'
        setDebugCode(code)
        setError(ERROR_MESSAGES[code] ?? `Wallet connection failed (${code}). Please try again.`)
        setLoading(false)
        return
      }

      const walletAddress = walletRes.finalPayload.address

      // Step 2: World ID verify — Device level (no Orb required)
      // TODO: Switch to VerificationLevel.Orb before final hackathon submission
      const verifyRes = await MiniKit.commandsAsync.verify({
        action: process.env.NEXT_PUBLIC_WORLD_ACTION || 'verify-trade',
        signal: walletAddress,
        verification_level: VerificationLevel.Device,
      })

      if (verifyRes.finalPayload.status === 'error') {
        const code = (verifyRes.finalPayload as { error_code?: string }).error_code ?? 'unknown'
        setDebugCode(code)
        setError(
          ERROR_MESSAGES[code] ??
            `World ID verification failed (${code}). Check World App is set up with a Device credential.`,
        )
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
        setError(
          data.error === 'max_verifications_reached'
            ? ERROR_MESSAGES.max_verifications_reached
            : `Proof rejected by server: ${data.error ?? 'unknown error'}`,
        )
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
        <div className="flex flex-col items-center gap-1 max-w-xs">
          <p className="text-red-500 text-xs text-center">{error}</p>
          {debugCode && (
            <p className="text-gray-400 text-[10px] font-mono">error_code: {debugCode}</p>
          )}
        </div>
      )}
    </div>
  )
}
