'use client'

import { useState } from 'react'
import { VerifyButton } from '@/components/VerifyButton'
import { OrderForm } from '@/components/OrderForm'
import { OrderStatus } from '@/components/OrderStatus'

type AppState = 'unverified' | 'verified' | 'order-placed'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('unverified')
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [tradeId, setTradeId] = useState<string>('')

  function handleVerified(address: string) {
    setWalletAddress(address)
    setAppState('verified')
  }

  function handleOrderSubmitted(id: string) {
    setTradeId(id)
    setAppState('order-placed')
  }

  function handleNewOrder() {
    setTradeId('')
    setAppState('verified')
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg tracking-tight">PrivOTC</span>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">
            Beta
          </span>
        </div>
        {walletAddress && (
          <span className="text-xs text-gray-400 font-mono">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">

        {appState === 'unverified' && (
          <div className="flex flex-col items-center gap-8 max-w-sm text-center">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Confidential OTC Trading
              </h1>
              <p className="text-sm text-gray-500">
                Trade large crypto positions privately. Powered by Chainlink CRE confidential compute and World ID human verification.
              </p>
            </div>

            {/* Features */}
            <div className="flex flex-col gap-2 w-full">
              {[
                { icon: '🔒', label: 'Trade intent encrypted end-to-end' },
                { icon: '🤖', label: 'MEV bots blocked via World ID' },
                { icon: '⛓️', label: 'Settlement recorded on-chain with proof' },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-base">{f.icon}</span>
                  <span className="text-sm text-gray-600">{f.label}</span>
                </div>
              ))}
            </div>

            <VerifyButton onVerified={handleVerified} />

            <p className="text-[11px] text-gray-400">
              Verified humans only. Take a quick selfie in World App — no Orb needed.
            </p>
          </div>
        )}

        {appState === 'verified' && (
          <div className="flex flex-col items-center gap-6 w-full max-w-md">
            <div className="flex flex-col items-center gap-1 text-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm mb-1">
                ✓
              </div>
              <h2 className="font-bold text-lg">Identity Verified</h2>
              <p className="text-sm text-gray-500">Submit your confidential trade order below.</p>
            </div>
            <OrderForm walletAddress={walletAddress} onOrderSubmitted={handleOrderSubmitted} />
          </div>
        )}

        {appState === 'order-placed' && (
          <div className="flex flex-col items-center gap-6 w-full max-w-md">
            <OrderStatus tradeId={tradeId} onNewOrder={handleNewOrder} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-[11px] text-gray-300">
        PrivOTC · Chainlink CRE · World ID · Tenderly
      </footer>
    </main>
  )
}
