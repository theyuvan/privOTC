'use client'

import { IDKitRequestWidget, orbLegacy, type RpContext, type IDKitResult } from '@worldcoin/idkit'
import { useState } from 'react'

const APP_ID = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`
const ACTION = process.env.NEXT_PUBLIC_WORLD_ACTION || 'verify-trade'
const ENVIRONMENT = (process.env.NEXT_PUBLIC_WORLD_ENVIRONMENT || 'staging') as 'staging' | 'production'

interface VerifyButtonProps {
  onVerified: (nullifierHash: string) => void
}

export function VerifyButton({ onVerified }: VerifyButtonProps) {
  const [open, setOpen] = useState(false)
  const [rpContext, setRpContext] = useState<RpContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Stable signal per session — binds proof to this browser session
  const [signal] = useState(() => crypto.randomUUID())

  async function handleOpen() {
    setLoading(true)
    setError(null)
    try {
      // Fetch RP signature from backend (World ID 4.0 requirement)
      const rp = await fetch('/api/rp-signature', { method: 'POST' }).then((r) => r.json())
      if (rp.error) {
        setError('Server configuration error. Please contact support.')
        return
      }
      setRpContext(rp)
      setOpen(true)
    } catch {
      setError('Could not reach server. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(result: IDKitResult) {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload: result,
        action: ACTION,
        signal,
      }),
    })
    const data = await res.json()
    if (!data.success) {
      const errMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : (data.error ?? 'unknown')
      throw new Error(`Proof rejected: ${errMsg}`)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleOpen}
        disabled={loading}
        className="bg-black text-white px-8 py-3 rounded-full font-semibold text-sm disabled:opacity-50 hover:bg-gray-800 transition-colors"
      >
        {loading ? 'Loading...' : 'Verify with World ID'}
      </button>

      {error && (
        <p className="text-red-500 text-xs text-center max-w-xs">{error}</p>
      )}

      {rpContext && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          app_id={APP_ID}
          action={ACTION}
          rp_context={rpContext}
          allow_legacy_proofs={true}
          preset={orbLegacy({ signal })}
          environment={ENVIRONMENT}
          handleVerify={handleVerify}
          onSuccess={(result) => {
            const nullifier = (result as { nullifier_hash?: string }).nullifier_hash ?? signal
            onVerified(nullifier)
          }}
          onError={(code) => {
            setError(`Verification failed (${code}). Please try again.`)
          }}
        />
      )}
    </div>
  )
}
