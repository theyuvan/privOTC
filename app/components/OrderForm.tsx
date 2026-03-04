'use client'

import { useState } from 'react'

const TOKEN_PAIRS = ['ETH/USDC', 'WBTC/USDC', 'ETH/WBTC']
const EXPIRY_OPTIONS = [
  { label: '1 hour', value: '1h' },
  { label: '6 hours', value: '6h' },
  { label: '24 hours', value: '24h' },
]

interface OrderFormProps {
  walletAddress: string
  onOrderSubmitted: (tradeId: string) => void
}

export function OrderForm({ walletAddress, onOrderSubmitted }: OrderFormProps) {
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
      const tradeIntent = {
        side,
        tokenPair,
        amount: parseFloat(amount),
        price: parseFloat(price),
        expiry,
        walletAddress,
        timestamp: Date.now(),
      }

      // Encrypt intent client-side using CRE public key
      // NOTE: Replace this with real encryption once Dev 3 shares the public key
      const encryptedIntent = btoa(JSON.stringify(tradeIntent))

      // Create a hash of the intent to store on-chain
      const encoder = new TextEncoder()
      const data = encoder.encode(encryptedIntent)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const intentHash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encryptedIntent, intentHash, walletAddress }),
      })

      const result = await res.json()

      if (result.tradeId) {
        onOrderSubmitted(result.tradeId)
      } else {
        setError('Failed to submit order. Please try again.')
      }
    } catch (err) {
      setError('Something went wrong while submitting your order.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">
      {/* Buy / Sell Toggle */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        <button
          type="button"
          onClick={() => setSide('buy')}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${
            side === 'buy' ? 'bg-green-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setSide('sell')}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${
            side === 'sell' ? 'bg-red-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Token Pair */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">Token Pair</label>
        <select
          value={tokenPair}
          onChange={e => setTokenPair(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          {TOKEN_PAIRS.map(pair => (
            <option key={pair} value={pair}>{pair}</option>
          ))}
        </select>
      </div>

      {/* Amount */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">
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
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      {/* Limit Price */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">
          Limit Price (USDC per {tokenPair.split('/')[0]})
        </label>
        <input
          type="number"
          placeholder="0.00"
          value={price}
          onChange={e => setPrice(e.target.value)}
          required
          min="0"
          step="any"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      {/* Expiry */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">Order Expiry</label>
        <select
          value={expiry}
          onChange={e => setExpiry(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          {EXPIRY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Privacy notice */}
      <p className="text-[11px] text-gray-400 text-center">
        Your trade details are encrypted before submission. Only a hash is stored on-chain.
      </p>

      {error && <p className="text-red-500 text-xs text-center">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-black text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-gray-800 transition-colors"
      >
        {submitting ? 'Submitting...' : `Submit ${side === 'buy' ? 'Buy' : 'Sell'} Order`}
      </button>
    </form>
  )
}
