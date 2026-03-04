'use client'

import { useEffect, useState } from 'react'

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
  { key: 'complete', label: 'Complete', description: 'Trade settled and proof recorded on-chain' },
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
    <div className="w-full max-w-md flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-base">Order Status</h2>
        <p className="text-[11px] text-gray-400 font-mono break-all">ID: {tradeId}</p>
      </div>

      {/* Step tracker */}
      <div className="flex flex-col gap-3">
        {STEPS.map((step, index) => {
          const isDone = index < currentIndex
          const isActive = index === currentIndex
          const isPending = index > currentIndex

          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors ${
                isDone ? 'bg-green-500 text-white' :
                isActive ? 'bg-black text-white animate-pulse' :
                'bg-gray-100 text-gray-400'
              }`}>
                {isDone ? '✓' : index + 1}
              </div>
              <div className="flex flex-col">
                <p className={`text-sm font-medium ${isPending ? 'text-gray-400' : 'text-gray-900'}`}>
                  {step.label}
                </p>
                <p className={`text-xs ${isPending ? 'text-gray-300' : 'text-gray-500'}`}>
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Settlement details */}
      {statusData.status === 'complete' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col gap-2">
          <p className="text-green-700 font-semibold text-sm">Trade Settled Successfully</p>
          {statusData.txHash && (
            <p className="text-xs text-gray-500 font-mono break-all">Tx: {statusData.txHash}</p>
          )}
          {statusData.proofHash && (
            <p className="text-xs text-gray-500 font-mono break-all">Proof: {statusData.proofHash}</p>
          )}
          {statusData.explorerLink && (
            <a
              href={statusData.explorerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 underline"
            >
              View on Tenderly Explorer →
            </a>
          )}
        </div>
      )}

      {statusData.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 font-semibold text-sm">Order Failed</p>
          <p className="text-xs text-gray-500 mt-1">No match found or insufficient funds. Your escrow will be refunded.</p>
        </div>
      )}

      <button
        onClick={onNewOrder}
        className="text-sm text-gray-500 underline text-center"
      >
        Submit another order
      </button>
    </div>
  )
}
