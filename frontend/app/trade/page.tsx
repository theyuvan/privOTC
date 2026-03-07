'use client'

import { ConnectKitButton } from 'connectkit'
import { BalanceDisplay } from '@/components/BalanceDisplay'
import { OrderForm } from '@/components/privotc/OrderForm'
import { EscrowDeposit } from '@/components/privotc/EscrowDeposit'
import CREMatchingTrigger from '@/components/privotc/CREMatchingTrigger'
import { useAccount, useChainId } from 'wagmi'
import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Match } from '@/app/api/matches/route'

export default function TradePage() {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const router = useRouter()
  const [isVerified, setIsVerified] = useState<boolean | null>(null)
  const [nullifierHash, setNullifierHash] = useState<string>('')
  const [worldIdProof, setWorldIdProof] = useState<any>(null)
  const [tradeSubmitted, setTradeSubmitted] = useState<string | null>(null)
  const [activeMatch, setActiveMatch] = useState<Match | null>(null)

  useEffect(() => {
    // Check if user has completed World ID verification in current session
    const verified = sessionStorage.getItem('worldid_verified')
    if (verified !== 'true') {
      router.push('/verify')
    } else {
      setIsVerified(true)
      const hash = sessionStorage.getItem('worldid_nullifier') || 'demo-nullifier-0000000000000000'
      setNullifierHash(hash)
      // worldIdProof from sessionStorage if stored, else null (OrderForm handles missing proof)
      const storedProof = sessionStorage.getItem('worldid_proof')
      if (storedProof) {
        try { setWorldIdProof(JSON.parse(storedProof)) } catch {}
      }
      console.log('[TradePage] Session restored — nullifier:', hash)
    }
  }, [router])

  // Poll /api/matches every 5 s after a trade is submitted
  const pollMatches = useCallback(async () => {
    if (!address) return
    try {
      const res = await fetch(`/api/matches?wallet=${address}`)
      const data = await res.json()
      if (data.matches?.length > 0) {
        setActiveMatch(data.matches[0])
      }
    } catch {
      // silently retry
    }
  }, [address])

  useEffect(() => {
    if (!tradeSubmitted || !address) return
    // Start polling immediately then every 5 s
    pollMatches()
    const id = setInterval(pollMatches, 5000)
    return () => clearInterval(id)
  }, [tradeSubmitted, address, pollMatches])

  // Show loading while checking verification
  if (isVerified === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Checking verification...</div>
      </div>
    )
  }

  const getNetworkName = () => {
    if (chainId === 9991) return 'Tenderly Ethereum TestNet'
    if (chainId === 999480) return 'Tenderly World Chain TestNet'
    return 'Unknown Network'
  }

  const isValidNetwork = chainId === 9991 || chainId === 999480

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">PrivOTC</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {getNetworkName()}
            </Badge>
          </div>
          <ConnectKitButton />
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!isConnected ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to start trading.
            </AlertDescription>
          </Alert>
        ) : !isValidNetwork ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please switch to Tenderly Ethereum (Chain ID: 9991) or Tenderly World Chain (Chain ID: 999480).
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">
                Human-Verified Confidential OTC Trading
              </h2>
              <p className="text-muted-foreground">
                Privacy-preserving institutional-grade cryptocurrency trading using Chainlink CRE and World ID verification.
              </p>
            </div>

            {/* Balance Display */}
            <div className="mb-6">
              <BalanceDisplay />
            </div>

            {/* CRE Privacy Trading — ZK proof + Chainlink matching */}
            {nullifierHash && (
              <div className="mb-8 p-6 border border-orange-500/30 rounded-lg bg-orange-500/5">
                <h3 className="font-semibold mb-1 text-sm font-mono tracking-widest uppercase">
                  // Privacy OTC — ZK-verified Trade
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Submits to Chainlink CRE with a real Groth16 ZK proof. Balance is read live from Tenderly.
                </p>
                <OrderForm
                  nullifierHash={nullifierHash}
                  worldIdProof={worldIdProof}
                  onOrderSubmitted={(id) => {
                    setTradeSubmitted(id)
                    console.log('[TradePage] CRE trade submitted, ID:', id)
                  }}
                />
                {tradeSubmitted && !activeMatch && (
                  <p className="mt-4 text-xs font-mono text-green-500">
                    ✅ Trade queued for CRE matching — ID: {tradeSubmitted}
                    <span className="ml-2 text-muted-foreground animate-pulse">(polling for match…)</span>
                  </p>
                )}
              </div>
            )}

            {/* Manual CRE Matching Trigger */}
            {isConnected && (
              <div className="mb-8">
                <CREMatchingTrigger />
              </div>
            )}

            {/* Escrow flow — shown when CRE finds a match */}
            {activeMatch && (
              <div className="mb-8">
                <EscrowDeposit
                  match={activeMatch}
                  onSettled={() => {
                    console.log('[TradePage] Trade settled!')
                    setActiveMatch(null)
                    setTradeSubmitted(null)
                  }}
                />
              </div>
            )}

            <div className="mt-8 p-6 border rounded-lg bg-muted/50">
              <h3 className="font-semibold mb-2">How It Works</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Connect your wallet to Tenderly Virtual TestNet</li>
                <li>Create an OTC order by depositing funds into escrow</li>
                <li>Your order appears in the order book for matching</li>
                <li>When matched, Chainlink CRE orchestrates private settlement</li>
                <li>World ID verification ensures human participants only</li>
                <li>Settlement proof is recorded on-chain, trade details remain private</li>
              </ol>
            </div>

            {address && (
              <div className="mt-4 text-sm text-muted-foreground text-center">
                Connected as: {address}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
