'use client'

import { useState } from 'react'

interface MatchingResult {
  success: boolean
  tradesReceived: number
  matchesFound: number
  matchPosted: boolean
  timestamp: string
  logs?: string[]
  error?: string
}

export default function CREMatchingTrigger() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MatchingResult | null>(null)

  const triggerMatching = async () => {
    setLoading(true)
    setResult(null)

    try {
      // Call local webhook server
      const response = await fetch('http://localhost:4001/trigger-matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({
        success: false,
        tradesReceived: 0,
        matchesFound: 0,
        matchPosted: false,
        timestamp: new Date().toISOString(),
        error: error.message || 'Failed to connect to CRE webhook server. Make sure it\'s running on localhost:4001',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">🤖 Manual CRE Matching</h3>
          <p className="text-purple-100 text-sm mt-1">
            Trigger matching engine for pending trades
          </p>
        </div>
        
        <button
          onClick={triggerMatching}
          disabled={loading}
          className="px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Matching...
            </span>
          ) : (
            '🚀 Run Matching'
          )}
        </button>
      </div>

      {result && (
        <div className={`mt-4 p-4 rounded-lg ${result.success ? 'bg-green-100 border border-green-400' : 'bg-red-100 border border-red-400'}`}>
          {result.success ? (
            <div className="text-green-800">
              <div className="font-bold mb-2">✅ Matching Complete</div>
              <div className="space-y-1 text-sm">
                <div>📥 Trades Received: <span className="font-bold">{result.tradesReceived}</span></div>
                <div>💱 Matches Found: <span className="font-bold">{result.matchesFound}</span></div>
                <div>📬 Match Posted: <span className="font-bold">{result.matchPosted ? 'Yes ✅' : 'No ❌'}</span></div>
                <div className="text-xs text-green-600 mt-2">
                  {new Date(result.timestamp).toLocaleString()}
                </div>
              </div>
              
              {result.logs && result.logs.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer font-semibold text-green-700 hover:text-green-900">
                    View Logs ({result.logs.length})
                  </summary>
                  <div className="mt-2 text-xs bg-green-50 p-2 rounded max-h-40 overflow-y-auto font-mono">
                    {result.logs.map((log, i) => (
                      <div key={i} className="py-0.5">{log}</div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="text-red-800">
              <div className="font-bold mb-2">❌ Matching Failed</div>
              <div className="text-sm">{result.error}</div>
              {result.error?.includes('localhost:4001') && (
                <div className="mt-3 p-2 bg-red-50 rounded text-xs">
                  <div className="font-bold mb-1">💡 Quick Fix:</div>
                  <code className="block bg-red-100 p-2 rounded">
                    cd c:\Users\thame\chain.link\privotc-cre\my-workflow
                    <br />
                    node cre-webhook-server.js
                  </code>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-purple-100">
        <div className="font-semibold mb-1">ℹ️ How it works:</div>
        <ul className="list-disc list-inside space-y-1">
          <li>Fetches pending trades from Vercel API</li>
          <li>Validates World ID + ZK proofs</li>
          <li>Matches buy/sell orders by price</li>
          <li>Posts matches to /api/matches</li>
        </ul>
      </div>
    </div>
  )
}
