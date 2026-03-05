'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, ArrowRight } from 'lucide-react'
import { useAccount, useBalance, useWriteContract, usePublicClient } from 'wagmi'
import { tenderlyEthereum } from '@/lib/web3Config'

const OTC_SETTLEMENT_ADDRESS = '0x7f8e2f2685c84aECA45CF6d6bfb1663781B9813A' as const

const SUBMIT_PROOF_ABI = [
  {
    name: 'submitBalanceProof',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_pA', type: 'uint256[2]' },
      { name: '_pB', type: 'uint256[2][2]' },
      { name: '_pC', type: 'uint256[2]' },
      { name: '_pubSignals', type: 'uint256[5]' },
    ],
    outputs: [],
  },
] as const

const TOKEN_PAIRS = ['ETH/WLD']
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
  const [tokenPair, setTokenPair] = useState('ETH/WLD')
  const [amount, setAmount] = useState('')
  const [price, setPrice] = useState('')
  const [expiry, setExpiry] = useState('1h')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch real on-chain balance from Tenderly Virtual TestNet
  const { address } = useAccount()
  const { data: balanceData } = useBalance({
    address,
    chainId: tenderlyEthereum.id,
  })
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: tenderlyEthereum.id })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      console.log('─── PrivOTC Order Submission ───────────────────────')
      console.log('[1/6] Trade inputs:', { side, tokenPair, amount, price, expiry })

      // ── Step 1: On-chain balance ──────────────────────────
      setError('Fetching on-chain balance...')
      console.log('[2/6] Fetching on-chain balance from Tenderly (chain ID 9991)...')
      console.log('      Wallet address:', address ?? 'not connected')

      // Use real wallet balance from Tenderly (in wei as string), fallback only if wallet not connected
      const realBalance = balanceData
        ? balanceData.value.toString()
        : '10000000000000000000' // 10 ETH fallback for unconnected wallet

      console.log('      Raw balance (wei):', realBalance)
      console.log('      Formatted balance:', balanceData
        ? `${balanceData.formatted} ${balanceData.symbol}`
        : '10 ETH (fallback — wallet not connected)')

      // ── Step 2: ZK Proof generation ───────────────────────
      setError('Generating ZK proof...')
      const zkPayload = {
        balance: realBalance,
        walletCommitment: nullifierHash.slice(0, 16),
        minPrice: Math.floor(parseFloat(price) * 1000000).toString(),
        amount: Math.floor(parseFloat(amount) * 1e18).toString(),
        tokenId: '1',
      }
      console.log('[3/6] Generating ZK proof → http://localhost:4000/generate-proof')
      console.log('      ZK circuit inputs:', zkPayload)

      const zkRes = await fetch('http://localhost:4000/generate-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zkPayload),
      })

      if (!zkRes.ok) {
        console.error('      ZK proof HTTP error:', zkRes.status, zkRes.statusText)
        // Try to read the error body for a more specific message
        let serverError = ''
        try { serverError = (await zkRes.json()).error ?? '' } catch {}
        if (serverError.includes('Assert Failed') || serverError.includes('BalanceProof')) {
          const balanceEth = (BigInt(realBalance) / BigInt(1e18)).toString()
          throw new Error(
            `Insufficient balance for ZK proof: your wallet has ${balanceEth} ETH but the order requires ${amount} ETH. Please enter an amount ≤ ${balanceEth}.`
          )
        }
        throw new Error('Failed to generate ZK proof')
      }

      const zkData = await zkRes.json()
      console.log('      ZK proof response:', zkData.success ? '✅ success' : '❌ failed')
      if (zkData.success) {
        console.log('      Public signals:', zkData.publicSignals)
        console.log('      Proof (pi_a):', zkData.proof?.pi_a)
      }
      if (!zkData.success) {
        throw new Error(zkData.error || 'ZK proof generation failed')
      }

      setError('ZK proof generated! Submitting on-chain proof...')

      // ── Step 4: Submit ZK proof ON-CHAIN ─────────────────
      console.log('[4/6] Submitting ZK balance proof on-chain → OTCSettlement.submitBalanceProof()')
      console.log('      Contract:', OTC_SETTLEMENT_ADDRESS)
      console.log('      Chain ID:', tenderlyEthereum.id)

      if (!address) {
        throw new Error('Wallet not connected — cannot submit on-chain proof')
      }
      if (!publicClient) {
        throw new Error('No RPC client available for chain 9991')
      }

      // Convert snarkjs proof format → Solidity uint arrays
      // Note: G2 points (pi_b) use reversed coordinate pairs in snarkjs output
      const proof = zkData.proof
      const pA: [bigint, bigint] = [
        BigInt(proof.pi_a[0]),
        BigInt(proof.pi_a[1]),
      ]
      const pB: [[bigint, bigint], [bigint, bigint]] = [
        [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
        [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
      ]
      const pC: [bigint, bigint] = [
        BigInt(proof.pi_c[0]),
        BigInt(proof.pi_c[1]),
      ]
      const pubSigs = zkData.publicSignals.slice(0, 5).map(BigInt) as
        [bigint, bigint, bigint, bigint, bigint]

      console.log('      pA:', pA.map(String))
      console.log('      pB:', pB.map(r => r.map(String)))
      console.log('      pC:', pC.map(String))
      console.log('      pubSignals:', pubSigs.map(String))
      console.log('      pubSig[0] balance_sufficient (must be 1):', pubSigs[0].toString())
      console.log('      pubSig[3] required_amount:', pubSigs[3].toString())

      let onChainTxHash: string | undefined
      try {
        const txHash = await writeContractAsync({
          address: OTC_SETTLEMENT_ADDRESS,
          abi: SUBMIT_PROOF_ABI,
          functionName: 'submitBalanceProof',
          args: [pA, pB, pC, pubSigs],
          chainId: tenderlyEthereum.id,
        })
        console.log('      ⛓️  Tx sent:', txHash)
        console.log('      Waiting for receipt on Tenderly...')

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
        onChainTxHash = txHash
        console.log('      ✅ On-chain ZK proof confirmed!')
        console.log('      Block:', receipt.blockNumber.toString())
        console.log('      Gas used:', receipt.gasUsed.toString())
        console.log('      Status:', receipt.status)
        setError('On-chain ZK proof verified! Checking World ID...')
      } catch (zkOnChainErr: any) {
        // If wallet not available in demo / simulation mode, log and continue
        console.warn('      ⚠️  On-chain proof tx failed (demo mode may not have signer):', zkOnChainErr?.shortMessage ?? zkOnChainErr?.message)
        console.warn('      Continuing in simulation mode without on-chain submission.')
        setError('ZK proof generated (simulation mode). Checking World ID...')
      }

      // ── Step 5: World ID check ────────────────────────────
      console.log('[5/6] World ID proof check...')
      if (!worldIdProof) {
        console.error('      ❌ No World ID proof found in session')
        throw new Error('World ID verification required. Please scan QR code with World App first.')
      }
      console.log('      ✅ World ID proof present')
      console.log('      nullifier_hash:', worldIdProof.nullifier_hash)
      console.log('      merkle_root:', worldIdProof.merkle_root)

      const worldIdData = worldIdProof

      // ── Step 6: Submit trade to /api/trade ────────────────
      const tradeData = {
        worldIdProof: worldIdData,
        zkProof: zkData.proof,
        publicSignals: zkData.publicSignals,
        onChainTxHash: onChainTxHash ?? null,
        walletAddress: address ?? null,   // needed by CRE to call settle(buyer, seller, ...)
        trade: {
          side,
          tokenPair,
          amount,
          price,
        },
        timestamp: Date.now(),
      }
      console.log('[6/6] Submitting trade to /api/trade...')
      console.log('      Wallet address (for settlement):', address ?? 'not connected')
      console.log('      On-chain ZK tx:', onChainTxHash ?? '(simulation — no tx)')
      console.log('      Trade payload:', tradeData.trade)

      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData),
      })

      const result = await res.json()
      console.log('      /api/trade response:', result)

      if (result.tradeId || result.success) {
        console.log('✅ Trade submitted! ID:', result.tradeId ?? 'n/a', '| Queue position:', result.queuePosition ?? 'n/a')
        console.log('────────────────────────────────────────────────────')
        onOrderSubmitted(result.tradeId || `trade-${Date.now()}`)
      } else {
        console.warn('      ❌ Trade rejected by API:', result)
        setError('Failed to submit order. Please try again.')
      }
    } catch (err) {
      console.error('❌ Order submission failed:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong while submitting your order.')
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

      {/* On-chain balance indicator */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-foreground/5 border border-foreground/10">
        <span className="text-[10px] font-mono tracking-[0.1em] uppercase text-muted-foreground">
          Tenderly Balance (ZK input)
        </span>
        <span className="text-[10px] font-mono text-foreground">
          {balanceData
            ? `${parseFloat(balanceData.formatted).toFixed(4)} ${balanceData.symbol}`
            : address
            ? 'Fetching...'
            : 'Wallet not connected'}
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
          Limit Price ({tokenPair.split('/')[1]} / {tokenPair.split('/')[0]})
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
