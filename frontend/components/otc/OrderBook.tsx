'use client'

import { useState, useEffect } from 'react'
import { usePublicClient, useChainId } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CONTRACT_ADDRESSES, ESCROW_VAULT_ABI } from '@/lib/contracts'
import { formatEther } from 'viem'

interface Order {
  tradeId: string
  depositor: string
  token: string
  amount: bigint
  depositTime: number
  expiryTime: number
  active: boolean
}

export function OrderBook() {
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const isEthereum = chainId === 9991
  const contractAddress = isEthereum
    ? CONTRACT_ADDRESSES.ethereum.escrowVault
    : CONTRACT_ADDRESSES.worldChain.escrowVault

  useEffect(() => {
    loadOrders()
  }, [contractAddress, chainId])

  const loadOrders = async () => {
    if (!publicClient || !contractAddress) {
      setLoading(false)
      return
    }

    try {
      // Listen for Deposited events to build order book
      const logs = await publicClient.getLogs({
        address: contractAddress as `0x${string}`,
        event: {
          type: 'event',
          name: 'Deposited',
          inputs: [
            { indexed: true, name: 'tradeId', type: 'bytes32' },
            { indexed: true, name: 'depositor', type: 'address' },
            { indexed: false, name: 'token', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' },
            { indexed: false, name: 'expiryTime', type: 'uint256' },
          ],
        },
        fromBlock: 'earliest',
        toBlock: 'latest',
      })

      const orderPromises = logs.map(async (log) => {
        const { tradeId, depositor, token, amount, expiryTime } = log.args as any

        // Check if order is still active
        const active = (await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: ESCROW_VAULT_ABI,
          functionName: 'isActive',
          args: [tradeId],
        })) as boolean

        return {
          tradeId,
          depositor,
          token,
          amount: amount as bigint,
          depositTime: Number(log.blockNumber),
          expiryTime: Number(expiryTime),
          active,
        }
      })

      const loadedOrders = await Promise.all(orderPromises)
      setOrders(loadedOrders.filter((o) => o.active)) // Only show active orders
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  if (!contractAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Book</CardTitle>
          <CardDescription>Active OTC orders</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            ⚠️ Contracts not deployed yet. Please deploy contracts first.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Book</CardTitle>
        <CardDescription>
          Active OTC orders on {isEthereum ? 'Ethereum' : 'World Chain'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No active orders found. Create one to get started!
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.tradeId}
                className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {formatAddress(order.depositor)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Trade ID: {formatAddress(order.tradeId)}
                    </p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium">{formatEther(order.amount)} ETH</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Token</p>
                    <p className="font-mono text-xs">
                      {order.token === '0x0000000000000000000000000000000000000000'
                        ? 'ETH'
                        : formatAddress(order.token)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expires</p>
                    <p className="text-xs">{formatDate(order.expiryTime)}</p>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full mt-2">
                  Match Order
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button variant="ghost" onClick={loadOrders} className="w-full mt-4" size="sm">
          Refresh Orders
        </Button>
      </CardContent>
    </Card>
  )
}
