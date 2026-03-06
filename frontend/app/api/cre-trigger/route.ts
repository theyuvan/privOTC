import { NextRequest, NextResponse } from 'next/server'
import { creAutoTriggerService } from '@/lib/cre-auto-trigger'

/**
 * CRE Auto-Trigger Control API
 * 
 * POST /api/cre-trigger - Control service (start/stop/configure/trigger)
 * GET /api/cre-trigger - Get service status
 */

// GET - Get service status
export async function GET(req: NextRequest) {
  const status = creAutoTriggerService.getStatus()
  
  return NextResponse.json({
    success: true,
    status
  })
}

// POST - Control service
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, config } = body

    switch (action) {
      case 'start':
        creAutoTriggerService.start()
        return NextResponse.json({
          success: true,
          message: 'CRE Auto-Trigger service started',
          status: creAutoTriggerService.getStatus()
        })

      case 'stop':
        creAutoTriggerService.stop()
        return NextResponse.json({
          success: true,
          message: 'CRE Auto-Trigger service stopped',
          status: creAutoTriggerService.getStatus()
        })

      case 'configure':
        if (!config) {
          return NextResponse.json({
            success: false,
            error: 'Missing config parameter'
          }, { status: 400 })
        }
        creAutoTriggerService.updateConfig(config)
        return NextResponse.json({
          success: true,
          message: 'Configuration updated',
          status: creAutoTriggerService.getStatus()
        })

      case 'restart':
        creAutoTriggerService.stop()
        setTimeout(() => creAutoTriggerService.start(), 1000)
        return NextResponse.json({
          success: true,
          message: 'Service restarting...',
          status: creAutoTriggerService.getStatus()
        })

      case 'trigger':
        // Manual trigger for testing
        await creAutoTriggerService.manualTrigger()
        return NextResponse.json({
          success: true,
          message: 'CRE matching triggered manually',
          status: creAutoTriggerService.getStatus()
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: start, stop, configure, restart, or trigger'
        }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
