'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Bot, TrendingUp, TrendingDown, Zap } from 'lucide-react'
import { AutoMatchingControls } from './AutoMatchingControls'

interface OrderPoolOrder {
  tradeId: string
  user: string
  type: 'buy' | 'sell'
  asset: string
  amount: number
  price: number
  timestamp: number
}

interface OrderPoolStatus {
  orderPool: OrderPoolOrder[]
  orderPoolSize: number
  matchedTradesCount: number
  recentMatches: any[]
}

export function AIMatchingAgentStatus() {
  const [status, setStatus] = useState<OrderPoolStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/ai-match')
      const data = await res.json()
      setStatus(data)
    } catch (err) {
      console.error('Failed to fetch AI agent status:', err)
    }
  }

  useEffect(() => {
    fetchStatus()
    
    if (autoRefresh) {
      const interval = setInterval(fetchStatus, 3000) // Refresh every 3 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const clearOrderPool = async () => {
    if (!confirm('Clear all pending orders from the AI agent?')) return
    
    setLoading(true)
    try {
      await fetch('/api/ai-match', {
        method: 'DELETE',
        headers: { 'x-api-key': 'hackathon-demo-2026' }
      })
      await fetchStatus()
    } catch (err) {
      console.error('Failed to clear order pool:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading AI agent status...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Auto-Matching Service Controls */}
      <AutoMatchingControls />

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>AI Matching Agent</CardTitle>
                <CardDescription>LangChain-powered intelligent trade matching</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <Zap className="h-3 w-3 mr-1" />
                {autoRefresh ? 'Live' : 'Paused'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? 'Pause' : 'Resume'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{status.orderPoolSize}</div>
              <div className="text-sm text-muted-foreground">Pending Orders</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500">{status.matchedTradesCount}</div>
              <div className="text-sm text-muted-foreground">Total Matches</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500">{status.recentMatches.length}</div>
              <div className="text-sm text-muted-foreground">Recent Matches</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Pool */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Order Pool</CardTitle>
            <Button
              variant="destructive"
              size="sm"
              onClick={clearOrderPool}
              disabled={loading || status.orderPoolSize === 0}
            >
              Clear Pool
            </Button>
          </div>
          <CardDescription>
            Orders awaiting AI matching based on price, asset, and liquidity compatibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status.orderPool.length === 0 ? (
            <Alert>
              <AlertDescription>
                No pending orders. Submit trades to see the AI agent in action!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {status.orderPool.map((order) => (
                <div
                  key={order.tradeId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {order.type === 'buy' ? (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">
                        {order.type.toUpperCase()} {order.amount} {order.asset}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        @ ${order.price.toFixed(2)} • {order.user.slice(0, 10)}...
                      </div>
                    </div>
                  </div>
                  <Badge variant={order.type === 'buy' ? 'default' : 'secondary'}>
                    {order.type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Matches */}
      {status.recentMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent AI Matches</CardTitle>
            <CardDescription>Successfully matched trades by the AI agent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {status.recentMatches.map((match, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-950"
                >
                  <div>
                    <div className="font-medium">
                      {match.amount} {match.asset} @ ${match.price.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {match.buyer} ↔ {match.seller}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {(match.confidence * 100).toFixed(0)}% confidence
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Algorithm Info */}
      <Card>
        <CardHeader>
          <CardTitle>AI Matching Algorithm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div>
                <div className="font-medium">Asset Compatibility</div>
                <div className="text-muted-foreground">buy.asset === sell.asset</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div>
                <div className="font-medium">Price Compatibility</div>
                <div className="text-muted-foreground">buy.price ≥ sell.price</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div>
                <div className="font-medium">Amount Compatibility</div>
                <div className="text-muted-foreground">sell.amount ≥ buy.amount</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">✓</Badge>
              <div>
                <div className="font-medium">Fair Price Discovery</div>
                <div className="text-muted-foreground">match.price = (buy.price + sell.price) / 2</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
