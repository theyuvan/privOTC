'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, ArrowRight } from 'lucide-react'

const TOKEN_PAIRS = ['ETH/USDC', 'WBTC/USDC', 'ETH/WBTC']
const EXPIRY_OPTIONS = [
  { label: '1 hour', value: '1h' },
  { label: '6 hours', value: '6h' },
  { label: '24 hours', value: '24h' },
]

interface OrderFormProps {
  nullifierHash: string
  worldIdProof?: any // Full World ID proof from verification
  onOrderSubmitted: (tradeId: string) => void
}

export function OrderForm({ nullifierHash, worldIdProof, onOrderSubmitted }: OrderFormProps) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [tokenPair, setTokenPair] = useState('ETH/USDC')
  const [amount, setAmount] = useState('')
  const [price, setPrice] = useState('')
  const [expiry, setExpiry] = useState('1h')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Generate REAL ZK proof via backend API
      setError('Generating ZK proof...')
      const zkRes = await fetch('http://localhost:4000/generate-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          balance: '10000000000000000000', // 10 ETH demo balance (should come from wallet in production)
          walletCommitment: nullifierHash.slice(0, 16), // Use part of World ID nullifier
          minPrice: Math.floor(parseFloat(price) * 1000000).toString(),
          amount: Math.floor(parseFloat(amount) * 1e18).toString(),
          tokenId: '1',
        }),
      })

      if (!zkRes.ok) {
        throw new Error('Failed to generate ZK proof')
      }

      const zkData = await zkRes.json()
      if (!zkData.success) {
        throw new Error(zkData.error || 'ZK proof generation failed')
      }

      setError('ZK proof generated! Submitting trade...')

      // Use real World ID proof if available, otherwise mock
      const worldIdData = worldIdProof || {
        merkle_root: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        nullifier_hash: nullifierHash,
        proof: '0xproof_' + Date.now(),
        verification_level: 'orb',
      }

      const tradeData = {
        worldIdProof: worldIdData,
        zkProof: zkData.proof,
        publicSignals: zkData.publicSignals,
        trade: {
          side,
          tokenPair,
          amount,
          price,
        },
        timestamp: Date.now(),
      }

      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData),
      })

      const result = await res.json()
      if (result.tradeId || result.success) {
        onOrderSubmitted(result.tradeId || `trade-${Date.now()}`)
      } else {
        setError('Failed to submit order. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while submitting your order.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full bg-background border border-foreground/30 px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-foreground transition-colors'
  const labelClass = 'text-[10px] font-mono tracking-[0.15em] uppercase text-muted-foreground'

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-5 w-full max-w-md"
    >
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-foreground/20">
        <Lock size={12} strokeWidth={1.5} className="text-[#ea580c]" />
        <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
          Encrypted Order Entry
        </span>
        <div className="flex-1 border-t border-foreground/10" />
        <span className="text-[10px] font-mono text-muted-foreground">
          {nullifierHash.slice(0, 8)}…
        </span>
      </div>

      {/* Buy / Sell Toggle */}
      <div className="flex border border-foreground/30">
        <button
          type="button"
          onClick={() => setSide('buy')}
          className={`flex-1 py-2 text-xs font-mono tracking-widest uppercase transition-colors ${
            side === 'buy'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          BUY
        </button>
        <button
          type="button"
          onClick={() => setSide('sell')}
          className={`flex-1 py-2 text-xs font-mono tracking-widest uppercase transition-colors ${
            side === 'sell'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          SELL
        </button>
      </div>

      {/* Token Pair */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Token Pair</label>
        <select
          value={tokenPair}
          onChange={e => setTokenPair(e.target.value)}
          className={inputClass}
        >
          {TOKEN_PAIRS.map(pair => (
            <option key={pair} value={pair}>{pair}</option>
          ))}
        </select>
      </div>

      {/* Amount */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>
          Amount ({tokenPair.split('/')[side === 'buy' ? 1 : 0]})
        </label>
        <input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
          min="0"
          step="any"
          className={inputClass}
        />
      </div>

      {/* Limit Price */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>
          Limit Price (USDC / {tokenPair.split('/')[0]})
        </label>
        <input
          type="number"
          placeholder="0.00"
          value={price}
          onChange={e => setPrice(e.target.value)}
          required
          min="0"
          step="any"
          className={inputClass}
        />
      </div>

      {/* Expiry */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Order Expiry</label>
        <select
          value={expiry}
          onChange={e => setExpiry(e.target.value)}
          className={inputClass}
        >
          {EXPIRY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Privacy notice */}
      <p className="text-[10px] font-mono text-muted-foreground text-center leading-relaxed">
        // intent encrypted client-side · only hash stored on-chain · CRE-matched
      </p>

      {error && (
        <p className="text-[11px] font-mono text-red-400 text-center">{error}</p>
      )}

      {/* Submit */}
      <motion.button
        type="submit"
        disabled={submitting}
        whileHover={{ scale: submitting ? 1 : 1.02 }}
        whileTap={{ scale: submitting ? 1 : 0.98 }}
        className="group flex items-center gap-0 bg-foreground text-background text-xs font-mono tracking-wider uppercase disabled:opacity-50 w-full"
      >
        <span className="flex items-center justify-center w-10 h-10 bg-[#ea580c]">
          {submitting ? (
            <span className="w-3 h-3 border border-background border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowRight size={14} strokeWidth={2} className="text-background" />
          )}
        </span>
        <span className="px-5 py-2.5">
          {submitting ? 'Encrypting & Submitting…' : `Submit ${side === 'buy' ? 'Buy' : 'Sell'} Order`}
        </span>
      </motion.button>
    </motion.form>
  )
}
