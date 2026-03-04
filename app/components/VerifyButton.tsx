'use client'

import { IDKit, orbLegacy } from '@worldcoin/idkit-core'
import { QRCodeSVG } from 'qrcode.react'
import { useState, useEffect, useRef } from 'react'

const APP_ID = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`
const ACTION = process.env.NEXT_PUBLIC_WORLD_ACTION || 'verify-trade'
const ENVIRONMENT = (process.env.NEXT_PUBLIC_WORLD_ENVIRONMENT || 'staging') as 'staging' | 'production'

interface VerifyButtonProps {
  onVerified: (nullifierHash: string) => void
}

export function VerifyButton({ onVerified }: VerifyButtonProps) {
  const [step, setStep] = useState<'idle' | 'loading' | 'qr' | 'waiting' | 'error'>('idle')
  const [qrUri, setQrUri] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signal] = useState(() => crypto.randomUUID())
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  async function handleVerify() {
    setStep('loading')
    setError(null)
    abortRef.current = new AbortController()

    try {
      const rpRes = await fetch('/api/rp-signature', { method: 'POST' })
      const rp = await rpRes.json().catch(() => ({ error: `HTTP ${rpRes.status}` }))
      if (rp.error) throw new Error(`RP signature error: ${rp.error}`)

      const request = await IDKit.request({
        app_id: APP_ID,
        action: ACTION,
        rp_context: rp,
        allow_legacy_proofs: true,
        environment: ENVIRONMENT,
      }).preset(orbLegacy({ signal }))

      setQrUri(request.connectorURI)
      setStep('qr')

      const completion = await request.pollUntilCompletion({
        pollInterval: 1000,
        timeout: 300000,
        signal: abortRef.current.signal,
      })

      if (!completion.success) {
        throw new Error(String(completion.error ?? 'Verification failed'))
      }

      setStep('waiting')

      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: completion.result, action: ACTION, signal }),
      })
      const data = await res.json()

      if (!data.success) {
        const msg = typeof data.error === 'object' ? JSON.stringify(data.error) : (data.error ?? 'unknown')
        throw new Error(`Proof rejected: ${msg}`)
      }

      const nullifier = (completion.result as { nullifier_hash?: string }).nullifier_hash ?? signal
      onVerified(nullifier)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Unexpected error — please try again.')
      setStep('error')
    }
  }

  function handleClose() {
    abortRef.current?.abort()
    setStep('idle')
    setQrUri(null)
    setError(null)
  }

  if (step === 'qr' && qrUri) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-4 shadow-lg">
          <p className="text-sm font-semibold text-gray-800">Connect your World ID</p>
          <p className="text-xs text-gray-500 text-center">
            Scan with the{' '}
            <a href="https://simulator.worldcoin.org" target="_blank" rel="noopener noreferrer" className="underline text-blue-500">
              World Simulator
            </a>{' '}
            or World App
          </p>
          <div className="p-3 bg-white rounded-xl border border-gray-100">
            <QRCodeSVG value={qrUri} size={200} fgColor="#000000" bgColor="#ffffff" />
          </div>
          <p className="text-[11px] text-gray-400 animate-pulse">Waiting for scan…</p>
        </div>
        <button onClick={handleClose} className="text-xs text-gray-400 underline">Cancel</button>
      </div>
    )
  }

  if (step === 'waiting') {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="bg-black text-white px-8 py-3 rounded-full font-semibold text-sm opacity-50">
          Verifying proof…
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleVerify}
        disabled={step === 'loading'}
        className="bg-black text-white px-8 py-3 rounded-full font-semibold text-sm disabled:opacity-50 hover:bg-gray-800 transition-colors"
      >
        {step === 'loading' ? 'Loading…' : 'Verify with World ID'}
      </button>
      {(step === 'error' && error) && (
        <p className="text-red-500 text-xs text-center max-w-xs">{error}</p>
      )}
    </div>
  )
}
