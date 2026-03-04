'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Circle, Loader, XCircle, ArrowRight } from 'lucide-react'

type TradeStatus = 'pending' | 'matched' | 'settling' | 'complete' | 'failed'

interface StatusStep {
  key: TradeStatus
  label: string
  description: string
}

const STEPS: StatusStep[] = [
  { key: 'pending', label: 'Order Submitted', description: 'Encrypted order received by CRE' },
  { key: 'matched', label: 'Match Found', description: 'Confidential matching engine found counterparty' },
  { key: 'settling', label: 'Settling', description: 'CRE triggering atomic swap on-chain' },
  { key: 'complete', label: 'Complete', description: 'Trade settled · proof recorded on-chain' },
]

const STATUS_ORDER: TradeStatus[] = ['pending', 'matched', 'settling', 'complete']

interface OrderStatusProps {
  tradeId: string
  onNewOrder: () => void
}

interface StatusData {
  tradeId: string
  status: TradeStatus
  txHash?: string
  explorerLink?: string
  proofHash?: string
}

export function OrderStatus({ tradeId, onNewOrder }: OrderStatusProps) {
  const [statusData, setStatusData] = useState<StatusData>({ tradeId, status: 'pending' })

  useEffect(() => {
    if (statusData.status === 'complete' || statusData.status === 'failed') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status?tradeId=${tradeId}`)
        const data = await res.json()
        setStatusData(data)
      } catch (err) {
        console.error('Status poll failed:', err)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [tradeId, statusData.status])

  const currentIndex = STATUS_ORDER.indexOf(statusData.status)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4 pb-2 border-b border-foreground/20">
        <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
          Order Status
        </span>
        <div className="flex-1 border-t border-foreground/10" />
        <span className="text-[10px] font-mono text-muted-foreground break-all">
          {tradeId.slice(0, 16)}…
        </span>
      </div>

      {/* Step tracker */}
      <div className="flex flex-col gap-4">
        {STEPS.map((step, index) => {
          const isDone = index < currentIndex
          const isActive = index === currentIndex
          const isPending = index > currentIndex

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className="flex items-start gap-3"
            >
              <div className="mt-0.5 flex-shrink-0">
                {isDone ? (
                  <CheckCircle size={16} strokeWidth={1.5} className="text-foreground" />
                ) : isActive ? (
                  <Loader size={16} strokeWidth={1.5} className="text-[#ea580c] animate-spin" />
                ) : (
                  <Circle size={16} strokeWidth={1} className="text-muted-foreground/30" />
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <p className={`text-xs font-mono tracking-wide ${isPending ? 'text-muted-foreground/40' : 'text-foreground'}`}>
                  {step.label}
                </p>
                <p className={`text-[10px] font-mono ${isPending ? 'text-muted-foreground/20' : 'text-muted-foreground'}`}>
                  {step.description}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Settlement details */}
      {statusData.status === 'complete' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-foreground/30 p-4 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-foreground" />
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-foreground">
              Trade Settled
            </span>
          </div>
          {statusData.txHash && (
            <p className="text-[10px] font-mono text-muted-foreground break-all">
              tx: {statusData.txHash}
            </p>
          )}
          {statusData.proofHash && (
            <p className="text-[10px] font-mono text-muted-foreground break-all">
              proof: {statusData.proofHash}
            </p>
          )}
          {statusData.explorerLink && (
            <a
              href={statusData.explorerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-[#ea580c] hover:underline"
            >
              View on Explorer ↗
            </a>
          )}
        </motion.div>
      )}

      {statusData.status === 'failed' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-red-500/40 p-4 flex flex-col gap-1"
        >
          <div className="flex items-center gap-2">
            <XCircle size={12} className="text-red-400" />
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-red-400">Order Failed</span>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground">
            No match found or insufficient funds. Escrow will be refunded.
          </p>
        </motion.div>
      )}

      <motion.button
        onClick={onNewOrder}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="group flex items-center gap-0 bg-foreground text-background text-xs font-mono tracking-wider uppercase w-full"
      >
        <span className="flex items-center justify-center w-10 h-10 bg-[#ea580c]">
          <ArrowRight size={14} strokeWidth={2} className="text-background" />
        </span>
        <span className="px-5 py-2.5">Submit Another Order</span>
      </motion.button>
    </motion.div>
  )
}
