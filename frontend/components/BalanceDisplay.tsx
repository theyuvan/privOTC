'use client'

import { useAccount, usePublicClient, useChainId } from 'wagmi'
import { formatEther } from 'viem'
import { Card, CardContent } from '@/components/ui/card'
import { Wallet, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

// WLD Token Contract Address
const WLD_TOKEN_ADDRESS = '0x2cfc85d8e48f8eab294be644d9e25c3030863003' as `0x${string}`

// ERC-20 ABI for balanceOf
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export function BalanceDisplay() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  
  const [nativeBalance, setNativeBalance] = useState<bigint | null>(null)
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefetching, setIsRefetching] = useState(false)

  const fetchBalance = async () => {
    if (!address || !publicClient) {
      setNativeBalance(null)
      setTokenBalance(null)
      setIsLoading(false)
      return
    }

    try {
      setIsRefetching(true)
      
      // Fetch native balance (ETH/WLD)
      const nativeResult = await publicClient.getBalance({ address })
      setNativeBalance(nativeResult)
      
      // Fetch WLD token balance for World Chain
      if (chainId === 999480) {
        try {
          const tokenResult = await publicClient.readContract({
            address: WLD_TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address],
          })
          setTokenBalance(tokenResult)
        } catch (tokenError) {
          console.error('Error fetching WLD token balance:', tokenError)
          setTokenBalance(null)
        }
      } else {
        setTokenBalance(null)
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
      setNativeBalance(null)
      setTokenBalance(null)
    } finally {
      setIsLoading(false)
      setIsRefetching(false)
    }
  }

  useEffect(() => {
    fetchBalance()
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchBalance, 10000)
    return () => clearInterval(interval)
  }, [address, publicClient, chainId])

  if (!isConnected || !address) {
    return null
  }

  const isWorldChain = chainId === 999480
  const networkName = chainId === 9991 ? 'Ethereum' : isWorldChain ? 'World Chain' : 'Unknown'

  // On World Chain, prioritize WLD token balance over native balance
  const displayBalance = isWorldChain ? tokenBalance : nativeBalance
  const symbol = isWorldChain ? 'WLD' : 'ETH'

  return (
    <Card className="bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                {networkName} Balance
              </p>
              {isLoading ? (
                <p className="text-2xl font-bold animate-pulse">Loading...</p>
              ) : displayBalance !== null ? (
                <div className="space-y-1">
                  <p className="text-2xl font-bold">
                    {parseFloat(formatEther(displayBalance)).toFixed(4)} {symbol}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </p>
                </div>
              ) : (
                <p className="text-2xl font-bold">0.0000 {symbol}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchBalance}
            disabled={isRefetching}
            className="ml-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
