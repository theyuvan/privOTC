/**
 * CRE Auto-Trigger Controls
 * 
 * UI component to control the CRE auto-trigger service
 * that automatically runs: cre workflow simulate --trigger-index 2
 * 
 * Replaces manual command execution workflow
 */

'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CREStatus {
  running: boolean
  enabled: boolean
  executing: boolean
  pollInterval: number
  workflowPath: string
  target: string
  triggerIndex: number
  creCommand?: string
}

export function CREAutoTriggerControls() {
  const [status, setStatus] = useState<CREStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [pollInterval, setPollInterval] = useState(10000) // 10 seconds default

  // Fetch status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/cre-trigger')
      const data = await response.json()
      if (data.success) {
        setStatus(data.status)
        setPollInterval(data.status.pollInterval)
      }
    } catch (error) {
      console.error('Failed to fetch CRE status:', error)
    }
  }

  // Auto-refresh status
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 2000) // Update every 2 seconds
    return () => clearInterval(interval)
  }, [])

  const handleAction = async (action: string, config?: any) => {
    setLoading(true)
    try {
      const response = await fetch('/api/cre-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, config })
      })
      const data = await response.json()
      if (data.success) {
        setStatus(data.status)
        console.log(`CRE Action: ${action}`, data)
      }
    } catch (error) {
      console.error(`Failed to ${action} CRE service:`, error)
    } finally {
      setLoading(false)
    }
  }

  const handlePollIntervalChange = async (value: number[]) => {
    const newInterval = value[0]
    setPollInterval(newInterval)
    await handleAction('configure', { pollInterval: newInterval })
  }

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>CRE Auto-Trigger Service</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>CRE Auto-Trigger Service</CardTitle>
            <CardDescription>
              Automatically runs CRE matching workflow when trades are pending
            </CardDescription>
          </div>
          <Badge 
            variant={status.running ? "default" : "secondary"}
            className={status.running ? "bg-green-500" : "bg-gray-500"}
          >
            {status.executing ? '⚙️ EXECUTING' : status.running ? '🟢 ACTIVE' : '🔴 STOPPED'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status Info */}
        <Alert>
          <AlertDescription>
            <div className="space-y-1 text-sm">
              <div><strong>CRE Command:</strong> <code className="text-xs bg-gray-100 px-1 rounded">{status.creCommand || 'cre'}</code></div>
              <div><strong>CRE Path:</strong> <code className="text-xs bg-gray-100 px-1 rounded">{status.workflowPath}</code></div>
              <div><strong>Target:</strong> {status.target}</div>
              <div><strong>Trigger Index:</strong> {status.triggerIndex} (Matching Engine)</div>
              <div><strong>Poll Interval:</strong> {status.pollInterval / 1000}s</div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Command Preview */}
        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm">
          <div className="mb-1 text-gray-500">$ cd {status.workflowPath}\\my-workflow</div>
          <div>$ {status.creCommand || 'cre'} workflow simulate my-workflow \</div>
          <div>    --target {status.target} \</div>
          <div>    --trigger-index {status.triggerIndex} \</div>
          <div>    --non-interactive</div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {!status.running ? (
            <Button 
              onClick={() => handleAction('start')}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              ▶️ Start Service
            </Button>
          ) : (
            <Button 
              onClick={() => handleAction('stop')}
              disabled={loading}
              variant="destructive"
            >
              ⏹️ Stop Service
            </Button>
          )}
          
          <Button 
            onClick={() => handleAction('restart')}
            disabled={loading}
            variant="outline"
          >
            🔄 Restart
          </Button>

          <Button 
            onClick={() => handleAction('trigger')}
            disabled={loading || status.executing}
            variant="secondary"
          >
            🔧 Manual Trigger
          </Button>
        </div>

        {/* Poll Interval Control */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Poll Interval</label>
            <span className="text-sm text-gray-500">{pollInterval / 1000} seconds</span>
          </div>
          <Slider
            value={[pollInterval]}
            onValueChange={handlePollIntervalChange}
            min={5000}
            max={60000}
            step={5000}
            disabled={loading}
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            How often to check for pending trades (5-60 seconds)
          </p>
        </div>

        {/* How It Works */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">🔄 How It Works:</h4>
          <ol className="text-sm space-y-1 list-decimal list-inside text-gray-600">
            <li>Service polls every {pollInterval / 1000}s for pending buy/sell orders</li>
            <li>When both exist, automatically runs CRE matching command</li>
            <li>CRE executes confidential matching in TEE environment</li>
            <li>Matches are posted to <code>/api/matches</code></li>
            <li>Users can proceed with escrow deposits & settlement</li>
          </ol>
        </div>

        {/* Benefits */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <h4 className="font-semibold text-blue-900 mb-1">✨ Benefits:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>🚫 No manual terminal commands needed</li>
            <li>⚡ Automatic matching within {pollInterval / 1000} seconds</li>
            <li>🔒 CRE TEE ensures confidential compute</li>
            <li>🎯 Production-ready workflow automation</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
