'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Play, Pause, RefreshCw, Settings, Zap } from 'lucide-react'

interface AutoMatchStatus {
  running: boolean
  enabled: boolean
  pollInterval: number
  orderPoolSize: number
  message?: string
}

export function AutoMatchingControls() {
  const [status, setStatus] = useState<AutoMatchStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [pollInterval, setPollInterval] = useState(5000)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/auto-match')
      const data = await res.json()
      setStatus(data)
      setPollInterval(data.pollInterval || 5000)
    } catch (err) {
      console.error('Failed to fetch status:', err)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleAction = async (action: string, config?: any) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auto-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, config })
      })
      const data = await res.json()
      setStatus(data.status)
    } catch (err) {
      console.error('Action failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const updatePollInterval = () => {
    handleAction('configure', { pollInterval })
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className={`h-5 w-5 ${status.running ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
            <div>
              <CardTitle>Auto-Matching Service</CardTitle>
              <CardDescription>
                Automatic trade matching - No manual CRE command needed!
              </CardDescription>
            </div>
          </div>
          <Badge variant={status.running ? 'default' : 'secondary'} className="text-lg px-4 py-2">
            {status.running ? '🟢 ACTIVE' : '🔴 STOPPED'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Info */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="font-medium">{status.running ? 'Running' : 'Stopped'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Poll Interval</div>
            <div className="font-medium">{status.pollInterval}ms</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Orders in Pool</div>
            <div className="font-medium">{status.orderPoolSize}</div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          {!status.running ? (
            <Button
              onClick={() => handleAction('start')}
              disabled={loading}
              className="flex-1"
              size="lg"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Auto-Matching
            </Button>
          ) : (
            <Button
              onClick={() => handleAction('stop')}
              disabled={loading}
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              <Pause className="h-4 w-4 mr-2" />
              Stop Auto-Matching
            </Button>
          )}
          
          <Button
            onClick={() => handleAction('restart')}
            disabled={loading}
            variant="outline"
            size="lg"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Restart
          </Button>
        </div>

        {/* Configuration */}
        <div className="space-y-2">
          <Label htmlFor="pollInterval" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Poll Interval (milliseconds)
          </Label>
          <div className="flex gap-2">
            <Input
              id="pollInterval"
              type="number"
              value={pollInterval}
              onChange={(e) => setPollInterval(parseInt(e.target.value))}
              min="1000"
              step="1000"
              className="flex-1"
            />
            <Button onClick={updatePollInterval} variant="outline">
              Update
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            How often to check for new trades (default: 5000ms = 5 seconds)
          </p>
        </div>

        {/* How It Works */}
        <div className="border-t pt-4 space-y-2">
          <div className="font-medium text-sm">🤖 How Auto-Matching Works:</div>
          <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
            <li>Service polls order pool every {status.pollInterval}ms</li>
            <li>When 2+ orders exist, checks compatibility automatically</li>
            <li>If match found, creates match and posts to /api/matches</li>
            <li>No manual <code className="bg-muted px-1 py-0.5 rounded">cre workflow simulate</code> needed!</li>
          </ol>
        </div>

        {status.message && (
          <div className="text-sm p-3 bg-primary/10 text-primary rounded-lg">
            {status.message}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
