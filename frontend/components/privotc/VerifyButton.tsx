'use client'

import { IDKit, orbLegacy } from '@worldcoin/idkit-core'
import { QRCodeSVG } from 'qrcode.react'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, Shield } from 'lucide-react'

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

  return (
    <>
      {/* Trigger button */}
      <motion.button
        onClick={handleVerify}
        disabled={step === 'loading' || step === 'waiting'}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        whileHover={{ scale: step === 'idle' || step === 'error' ? 1.03 : 1 }}
        whileTap={{ scale: step === 'idle' || step === 'error' ? 0.97 : 1 }}
        className="group flex items-center gap-0 bg-foreground text-background text-sm font-mono tracking-wider uppercase disabled:opacity-50 transition-opacity"
      >
        <span className="flex items-center justify-center w-10 h-10 bg-[#ea580c]">
          {step === 'loading' || step === 'waiting' ? (
            <span className="w-3 h-3 border border-background border-t-transparent rounded-full animate-spin" />
          ) : (
            <motion.span
              className="inline-flex"
              whileHover={{ x: 3 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <ArrowRight size={16} strokeWidth={2} className="text-background" />
            </motion.span>
          )}
        </span>
        <span className="px-5 py-2.5">
          {step === 'loading' ? 'Loading…' : step === 'waiting' ? 'Verifying…' : 'Launch Trade App'}
        </span>
      </motion.button>

      {step === 'error' && error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[11px] font-mono text-red-400 mt-2 max-w-xs text-center"
        >
          {error}
        </motion.p>
      )}

      {/* QR Modal Overlay */}
      <AnimatePresence>
        {step === 'qr' && qrUri && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative border-2 border-foreground bg-background p-0 w-full max-w-sm mx-4"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-[#ea580c]" />
                  <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
                    WORLD.ID — ORB VERIFY
                  </span>
                </div>
                <button
                  onClick={handleClose}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Modal body */}
              <div className="flex flex-col items-center gap-5 p-6">
                <div className="flex items-center gap-2 text-foreground">
                  <Shield size={14} strokeWidth={1.5} />
                  <span className="text-xs font-mono tracking-widest uppercase">Prove Humanity</span>
                </div>

                {/* QR Code — white background required for scanner */}
                <div className="p-4 bg-white border border-foreground/20">
                  <QRCodeSVG value={qrUri} size={200} fgColor="#000000" bgColor="#ffffff" />
                </div>

                <div className="text-center flex flex-col gap-1">
                  <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                    Scan with World App
                  </p>
                  {ENVIRONMENT === 'staging' && (
                    <a
                      href="https://simulator.worldcoin.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-[#ea580c] hover:underline"
                    >
                      or use the World Simulator ↗
                    </a>
                  )}
                </div>

                <p className="text-[10px] font-mono text-muted-foreground animate-pulse tracking-widest">
                  AWAITING_SCAN…
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
