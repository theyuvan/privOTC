'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { keccak256, encodePacked, parseAbi, formatEther } from 'viem'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Match } from '@/app/api/matches/route'

// ── Addresses ──────────────────────────────────────────────────────────────
const ESCROW_ADDRESS = '0x32CB383405f866a84e42345aDb10b00228f52B3f' as `0x${string}`
const WLD_ADDRESS = '0x163f8C2467924be0ae7B5347228CABF260318753' as `0x${string}`

// ── Minimal ABIs ────────────────────────────────────────────────────────────
const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
])

const ESCROW_ABI = parseAbi([
  'function deposit(bytes32 tradeId, address token, uint256 amount, uint256 expiryTime) external payable',
  'function refund(bytes32 tradeId) external',
])

function useCountdown(deadlineSeconds: number) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const tick = () => {
      const diff = deadlineSeconds - Math.floor(Date.now() / 1000)
      setRemaining(Math.max(0, diff))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadlineSeconds])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  return { remaining, label: `${mins}:${secs.toString().padStart(2, '0')}` }
}

interface EscrowDepositProps {
  match: Match
  onSettled?: () => void
}

type Step = 'idle' | 'approving' | 'depositing' | 'waiting' | 'settled' | 'expired' | 'error'

export function EscrowDeposit({ match, onSettled }: EscrowDepositProps) {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [step, setStep] = useState<Step>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [settleTxHash, setSettleTxHash] = useState('')
  const [myEscrowId, setMyEscrowId] = useState<`0x${string}` | null>(null)

  const isBuyer = address?.toLowerCase() === match.buyerAddress.toLowerCase()
  const isSeller = address?.toLowerCase() === match.sellerAddress.toLowerCase()
  const role = isBuyer ? 'buyer' : isSeller ? 'seller' : null

  const { remaining, label: countdown } = useCountdown(match.deadline)

  // Compute this user's escrow ID once address is known
  useEffect(() => {
    if (!address) return
    const id = keccak256(
      encodePacked(
        ['bytes32', 'address'],
        [match.tradeId as `0x${string}`, address]
      )
    )
    setMyEscrowId(id)
  }, [address, match.tradeId])

  // Poll /api/escrow every 5 s while waiting for counterparty
  const pollEscrow = useCallback(async () => {
    try {
      const res = await fetch('/api/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.matchId,
          tradeId: match.tradeId,
          buyerAddress: match.buyerAddress,
          sellerAddress: match.sellerAddress,
          ethAmount: match.ethAmount,
          wldAmount: match.wldAmount,
        }),
      })
      const data = await res.json()
      if (data.settled) {
        setSettleTxHash(data.txHash ?? '')
        setStep('settled')
        onSettled?.()
      }
    } catch {
      // silently retry
    }
  }, [match, onSettled])

  useEffect(() => {
    if (step !== 'waiting') return
    const id = setInterval(pollEscrow, 5000)
    return () => clearInterval(id)
  }, [step, pollEscrow])

  // ── Buyer flow: approve WLD → deposit WLD ──────────────────────────────
  const handleBuyerDeposit = async () => {
    if (!address || !publicClient || !myEscrowId) return
    setErrorMsg('')

    try {
      // 1. Approve WLD
      setStep('approving')
      const approveTx = await writeContractAsync({
        address: WLD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [ESCROW_ADDRESS, BigInt(match.wldAmount)],
      })
      await publicClient.waitForTransactionReceipt({ hash: approveTx })

      // 2. Deposit WLD into escrow using per-party escrow ID
      // (OTCSettlement.settle reads keccak256(tradeId, address) so we must deposit with that key)
      setStep('depositing')
      const depositTx = await writeContractAsync({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'deposit',
        args: [
          myEscrowId,
          WLD_ADDRESS,
          BigInt(match.wldAmount),
          BigInt(match.deadline),
        ],
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: depositTx })
      if (receipt.status === 'reverted') throw new Error('Deposit transaction reverted on-chain')

      setStep('waiting')
    } catch (err: any) {
      setErrorMsg(err.shortMessage ?? err.message)
      setStep('error')
    }
  }

  // ── Seller flow: deposit ETH ─────────────────────────────────────────────
  const handleSellerDeposit = async () => {
    if (!address || !publicClient || !myEscrowId) return
    setErrorMsg('')

    try {
      setStep('depositing')
      // Use per-party escrow ID so buyer/seller have separate escrow slots
      const depositTx = await writeContractAsync({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'deposit',
        args: [
          myEscrowId,
          '0x0000000000000000000000000000000000000000' as `0x${string}`,
          BigInt(match.ethAmount),
          BigInt(match.deadline),
        ],
        value: BigInt(match.ethAmount),
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: depositTx })
      if (receipt.status === 'reverted') throw new Error('Deposit transaction reverted on-chain')

      setStep('waiting')
    } catch (err: any) {
      setErrorMsg(err.shortMessage ?? err.message)
      setStep('error')
    }
  }

  // ── Refund (after deadline expires) ─────────────────────────────────────
  const handleRefund = async () => {
    if (!myEscrowId || !publicClient) return
    setErrorMsg('')
    try {
      const tx = await writeContractAsync({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'refund',
        args: [myEscrowId],
      })
      await publicClient.waitForTransactionReceipt({ hash: tx })
      setStep('expired')
    } catch (err: any) {
      setErrorMsg(err.shortMessage ?? err.message)
      setStep('error')
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (!role) {
    return (
      <Alert>
        <AlertDescription>
          Your wallet ({address}) is not a party in this match.
        </AlertDescription>
      </Alert>
    )
  }

  const ethDisplay = `${Number(formatEther(BigInt(match.ethAmount))).toFixed(4)} ETH`
  const wldDisplay = `${Number(formatEther(BigInt(match.wldAmount))).toFixed(2)} WLD`

  return (
    <Card className="border-orange-500/40 bg-orange-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-mono">⚡ Trade Matched — Send to Escrow</CardTitle>
          <Badge
            variant={remaining > 60 ? 'outline' : 'destructive'}
            className="font-mono text-xs"
          >
            {remaining > 0 ? `⏱ ${countdown}` : 'EXPIRED'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Match details */}
        <div className="text-xs font-mono space-y-1 text-muted-foreground">
          <div>Pair: <span className="text-foreground">{match.tokenPair}</span></div>
          <div>ETH amount: <span className="text-foreground">{ethDisplay}</span></div>
          <div>WLD amount: <span className="text-foreground">{wldDisplay}</span></div>
          <div>Your role: <span className="text-orange-400 font-semibold">{role.toUpperCase()}</span></div>
          <div>Counterparty: <span className="text-foreground font-mono text-[10px]">
            {isBuyer ? match.sellerAddress : match.buyerAddress}
          </span></div>
          <div>Match ID: <span className="text-foreground font-mono text-[10px] break-all">
            {match.matchId.slice(0, 16)}…
          </span></div>
        </div>

        {/* What you need to deposit */}
        <div className="rounded-md border border-orange-500/20 p-3 text-sm bg-background">
          {isBuyer ? (
            <p>You are the <strong>BUYER</strong>. Deposit <strong className="text-orange-400">{wldDisplay}</strong> into escrow to receive <strong className="text-green-400">{ethDisplay}</strong>.</p>
          ) : (
            <p>You are the <strong>SELLER</strong>. Deposit <strong className="text-orange-400">{ethDisplay}</strong> into escrow to receive <strong className="text-green-400">{wldDisplay}</strong>.</p>
          )}
        </div>

        {/* Action area */}
        {step === 'idle' && remaining > 0 && (
          <>
            {isBuyer && (
              <Button onClick={handleBuyerDeposit} className="w-full">
                Approve &amp; Deposit {wldDisplay} WLD
              </Button>
            )}
            {isSeller && (
              <Button onClick={handleSellerDeposit} className="w-full">
                Deposit {ethDisplay} ETH to Escrow
              </Button>
            )}
          </>
        )}

        {step === 'approving' && (
          <div className="text-xs font-mono text-yellow-400 animate-pulse">
            [1/2] Approving WLD spend…
          </div>
        )}

        {step === 'depositing' && (
          <div className="text-xs font-mono text-yellow-400 animate-pulse">
            {isBuyer ? '[2/2]' : '[1/1]'} Depositing into EscrowVault…
          </div>
        )}

        {step === 'waiting' && (
          <div className="space-y-2">
            <div className="text-xs font-mono text-green-400">
              ✅ Your deposit confirmed. Waiting for counterparty…
            </div>
            <div className="text-xs text-muted-foreground animate-pulse">
              Polling on-chain every 5 seconds…
            </div>
          </div>
        )}

        {step === 'settled' && (
          <div className="space-y-1">
            <div className="text-sm font-semibold text-green-500">
              🎉 Trade Complete! Funds auto-settled.
            </div>
            {settleTxHash && (
              <div className="text-xs font-mono text-muted-foreground break-all">
                settle() tx: {settleTxHash}
              </div>
            )}
          </div>
        )}

        {step === 'error' && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs font-mono">{errorMsg}</AlertDescription>
          </Alert>
        )}

        {/* Refund button when expired and deposit was made but not settled */}
        {remaining === 0 && step === 'waiting' && myEscrowId && (
          <Button variant="destructive" onClick={handleRefund} className="w-full">
            ⏰ Deadline Expired — Claim Refund
          </Button>
        )}

        {step === 'expired' && (
          <div className="text-sm text-muted-foreground">
            Refund processed. Funds returned to your wallet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
