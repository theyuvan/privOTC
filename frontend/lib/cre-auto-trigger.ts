/**
 * CRE Auto-Trigger Service
 * 
 * Automatically monitors trade submissions and triggers CRE matching workflow
 * Eliminates the need for manual command execution:
 * `cd privotc-cre && cre workflow simulate my-workflow --target privotc-staging --trigger-index 2 --non-interactive`
 * 
 * How it works:
 * 1. Polls frontend API for pending trades
 * 2. When buy + sell orders exist, triggers CRE command
 * 3. Parses CRE output and logs matches
 * 4. CRE automatically posts matches to /api/matches
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

interface CRETriggerConfig {
  pollInterval: number // milliseconds
  enabled: boolean
  apiBaseUrl: string
  creWorkflowPath: string // Path to privotc-cre folder
  workflowTarget: string  // e.g., 'privotc-staging'
  triggerIndex: number    // Handler index (2 = matching engine)
  creCommand: string      // CRE command to use (e.g., 'cre', 'bunx cre', 'npx cre')
}

interface TradeStatus {
  buyOrders: number
  sellOrders: number
  pendingMatches: boolean
}

class CREAutoTriggerService {
  private config: CRETriggerConfig
  private intervalId: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private isExecuting: boolean = false

  constructor(config: Partial<CRETriggerConfig> = {}) {
    this.config = {
      pollInterval: 10000, // Check every 10 seconds
      enabled: true,
      apiBaseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      creWorkflowPath: process.env.CRE_WORKFLOW_PATH ||  path.join(process.cwd(), '..', 'privotc-cre'),
      workflowTarget: 'privotc-staging',
      triggerIndex: 2, // Handler 3 (index 2) = Manual matching trigger
      creCommand: process.env.CRE_COMMAND || 'cre', // Default to 'cre', can override with env var
      ...config
    }
  }

  /**
   * Start automatic CRE triggering service
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  CRE Auto-Trigger service already running')
      return
    }

    console.log('\n🚀 Starting CRE Auto-Trigger Service...')
    console.log(`   Poll interval: ${this.config.pollInterval}ms`)
    console.log(`   CRE command: ${this.config.creCommand}`)
    console.log(`   CRE path: ${this.config.creWorkflowPath}`)
    console.log(`   Target: ${this.config.workflowTarget}`)
    console.log(`   Trigger index: ${this.config.triggerIndex}\n`)
    
    this.isRunning = true
    
    // Run immediate check
    this.checkAndTrigger()
    
    // Start polling
    this.intervalId = setInterval(() => {
      this.checkAndTrigger()
    }, this.config.pollInterval)

    console.log('✅ CRE Auto-Trigger service started\n')
  }

  /**
   * Stop automatic triggering service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('⏹️  CRE Auto-Trigger service stopped')
  }

  /**
   * Check trade status and trigger CRE if needed
   */
  private async checkAndTrigger() {
    if (!this.config.enabled || this.isExecuting) return

    try {
      // Check if there are pending trades
      const tradeStatus = await this.getTradeStatus()
      
      console.log(`📊 Trade Status: ${tradeStatus.buyOrders} buy orders, ${tradeStatus.sellOrders} sell orders`)

      // Need at least 1 buy and 1 sell order to match
      if (tradeStatus.buyOrders > 0 && tradeStatus.sellOrders > 0) {
        console.log('🎯 Pending trades detected - triggering CRE matching...\n')
        await this.triggerCREMatching()
      } else {
        console.log('   ⏳ Waiting for matching buy/sell orders...\n')
      }
    } catch (error: any) {
      console.error('❌ Error in checkAndTrigger:', error.message)
    }
  }

  /**
   * Get current trade status from frontend API or CRE
   */
  private async getTradeStatus(): Promise<TradeStatus> {
    try {
      // Query the actual trade queue used by CRE workflow
      const response = await fetch(`${this.config.apiBaseUrl}/api/trade?drain=false`)
      if (response.ok) {
        const data = await response.json()
        const trades = data.trades || []
        const buyOrders = trades.filter((t: any) => t.trade?.side === 'buy').length
        const sellOrders = trades.filter((t: any) => t.trade?.side === 'sell').length
        return {
          buyOrders,
          sellOrders,
          pendingMatches: buyOrders > 0 && sellOrders > 0
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not fetch trade status from frontend, assuming no pending trades')
    }

    return { buyOrders: 0, sellOrders: 0, pendingMatches: false }
  }

  /**
   * Execute CRE workflow simulate command
   */
  private async triggerCREMatching(): Promise<void> {
    if (this.isExecuting) {
      console.log('⚠️  CRE command already executing, skipping...')
      return
    }

    this.isExecuting = true

    try {
      // Change to my-workflow directory where CRE workflow is located
      const workflowDir = path.join(this.config.creWorkflowPath, 'my-workflow')
      const command = `${this.config.creCommand} workflow simulate my-workflow --target ${this.config.workflowTarget} --trigger-index ${this.config.triggerIndex} --non-interactive`
      
      console.log(`🔧 Executing from: ${workflowDir}`)
      console.log(`🔧 Command: ${command}\n`)
      console.log('─'.repeat(80))

      const { stdout, stderr } = await execAsync(command, {
        cwd: workflowDir,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
        timeout: 60000, // 60 second timeout
        shell: 'powershell.exe' // Use PowerShell on Windows
      })

      // Log CRE output
      if (stdout) {
        console.log(stdout)
      }
      if (stderr) {
        console.error('CRE stderr:', stderr)
      }

      // Parse CRE output for matches
      const matches = this.parseCREOutput(stdout)
      
      console.log('─'.repeat(80))
      if (matches.length > 0) {
        console.log(`\n✅ CRE Matching Complete: ${matches.length} match(es) created!`)
        matches.forEach((match, i) => {
          console.log(`   ${i + 1}. ${match.buyer} ↔ ${match.seller} | ${match.amount} ${match.asset} @ $${match.price}`)
        })
      } else {
        console.log('\n⚠️  CRE executed but no matches found')
      }
      console.log('─'.repeat(80))
      console.log('')

    } catch (error: any) {
      console.error('\n❌ CRE execution failed:', error.message)
      if (error.stdout) console.log('stdout:', error.stdout)
      if (error.stderr) console.log('stderr:', error.stderr)
      
      // Provide helpful error message if CRE command not found
      if (error.message.includes('not recognized') || error.message.includes('command not found')) {
        console.error('\n💡 SOLUTION: CRE command not found in PATH!')
        console.error('   Option 1: Add CRE to your system PATH')
        console.error('   Option 2: Set CRE_COMMAND env var in .env.local:')
        console.error('             CRE_COMMAND="C:\\\\path\\\\to\\\\cre.exe"')
        console.error('   Option 3: If CRE is installed globally, restart VS Code/terminal')
        console.error('   Option 4: Run CRE command manually in terminal to test:\n')
        console.error(`             cd ${this.config.creWorkflowPath}\\my-workflow`)
        console.error(`             ${this.config.creCommand} workflow simulate my-workflow --target ${this.config.workflowTarget} --trigger-index ${this.config.triggerIndex} --non-interactive\n`)
      }
      
      console.log('─'.repeat(80))
      console.log('')
    } finally {
      this.isExecuting = false
    }
  }

  /**
   * Parse CRE output to extract match information
   */
  private parseCREOutput(output: string): Array<{buyer: string, seller: string, amount: string, price: string, asset: string}> {
    const matches: Array<{buyer: string, seller: string, amount: string, price: string, asset: string}> = []
    
    try {
      // Look for lines like: "📤 Posting match to /api/matches: 0xBuyer12 ↔ 0xSeller34"
      // or "✅ Match found: Buy user-1234 ↔ Sell user-5678 | 1.0 ETH @ $2000"
      const matchLines = output.split('\n').filter(line => 
        line.includes('Match found') || line.includes('Posting match')
      )

      for (const line of matchLines) {
        // Extract match details from log line
        const buyerMatch = line.match(/(?:user-\d+|0x[a-fA-F0-9]+)/)
        const sellerMatch = line.match(/↔\s*(?:user-\d+|0x[a-fA-F0-9]+)/)
        const amountMatch = line.match(/(\d+\.?\d*)\s+(ETH|WLD|USDC)/)
        const priceMatch = line.match(/@\s*\$?(\d+\.?\d*)/)

        if (buyerMatch && sellerMatch) {
          matches.push({
            buyer: buyerMatch[0],
            seller: sellerMatch[0].replace('↔ ', '').trim(),
            amount: amountMatch ? amountMatch[1] : '?',
            asset: amountMatch ? amountMatch[2] : '?',
            price: priceMatch ? priceMatch[1] : '?'
          })
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not parse CRE output for matches')
    }

    return matches
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      running: this.isRunning,
      enabled: this.config.enabled,
      executing: this.isExecuting,
      pollInterval: this.config.pollInterval,
      workflowPath: this.config.creWorkflowPath,
      target: this.config.workflowTarget,
      triggerIndex: this.config.triggerIndex,
      creCommand: this.config.creCommand
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CRETriggerConfig>) {
    const wasRunning = this.isRunning
    
    if (wasRunning) {
      this.stop()
    }

    this.config = { ...this.config, ...newConfig }

    if (wasRunning) {
      this.start()
    }

    console.log('✅ CRE Auto-Trigger config updated')
  }

  /**
   * Manual trigger (for testing)
   */
  async manualTrigger() {
    console.log('🔧 Manual CRE trigger requested...\n')
    await this.triggerCREMatching()
  }
}

// Global singleton instance
export const creAutoTriggerService = new CREAutoTriggerService()

// Auto-start service if in server environment
if (typeof window === 'undefined') {
  // Server-side only
  console.log('🤖 CRE Auto-Trigger Service ready (call .start() to begin)')
}
