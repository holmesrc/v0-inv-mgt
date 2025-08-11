import { NextRequest, NextResponse } from "next/server"
import { sendFullLowStockAlert } from "@/lib/slack"
import { getScheduleDescription, isCorrectAlertTime } from "@/lib/timezone"

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (Vercel cron jobs or manual with auth)
    const authHeader = request.headers.get('authorization')
    const userAgent = request.headers.get('user-agent')
    const isVercelCron = userAgent?.includes('vercel-cron') || request.headers.get('x-vercel-cron')
    
    if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('❌ Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Authorized cron request detected')
    const scheduleInfo = getScheduleDescription('America/New_York')
    console.log(`🕘 Cron triggered at ${scheduleInfo.currentTime}`)

    // For testing, skip the time check
    console.log(`✅ Running alert (time check bypassed for testing)`)

    // Construct base URL more reliably
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`
    
    console.log(`🔗 Using base URL: ${baseUrl}`)

    // Load current inventory from database
    const inventoryResponse = await fetch(`${baseUrl}/api/inventory/load-from-db`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    })

    if (!inventoryResponse.ok) {
      throw new Error(`Failed to load inventory data: ${inventoryResponse.status}`)
    }

    const inventoryResult = await inventoryResponse.json()
    
    if (!inventoryResult.success || !inventoryResult.data) {
      console.log('⚠️ No inventory data available for alert check')
      return NextResponse.json({ 
        success: true, 
        message: 'No inventory data available',
        timestamp: scheduleInfo.currentTime
      })
    }

    const inventory = inventoryResult.data

    // Load alert settings
    const settingsResponse = await fetch(`${baseUrl}/api/settings`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    })

    let alertSettings = {
      enabled: true,
      dayOfWeek: 1, // Monday
      time: "09:00",
      defaultReorderPoint: 10
    }

    if (settingsResponse.ok) {
      const settingsResult = await settingsResponse.json()
      if (settingsResult.success && settingsResult.settings) {
        alertSettings = { ...alertSettings, ...settingsResult.settings }
      }
    }

    // Check if alerts are enabled
    if (!alertSettings.enabled) {
      console.log('📴 Automatic alerts are disabled')
      return NextResponse.json({ 
        success: true, 
        message: 'Alerts disabled',
        timestamp: scheduleInfo.currentTime
      })
    }

    // Find low stock items
    const lowStockItems = inventory.filter((item: any) => {
      const reorderPoint = item.reorderPoint || alertSettings.defaultReorderPoint
      return item.QTY <= reorderPoint
    })

    console.log(`📊 Found ${lowStockItems.length} low stock items`)

    if (lowStockItems.length === 0) {
      console.log('✅ No low stock items found')
      return NextResponse.json({ 
        success: true, 
        message: 'No low stock items found',
        timestamp: scheduleInfo.currentTime,
        totalItems: inventory.length
      })
    }

    // Send Slack alert directly
    try {
      const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
      if (!slackWebhookUrl) {
        throw new Error('Slack webhook URL not configured')
      }

      const message = {
        text: `🚨 Weekly Low Stock Alert - ${lowStockItems.length} items need attention`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*🚨 Weekly Low Stock Alert*\n*Items needing attention:* ${lowStockItems.length}\n*Time:* ${scheduleInfo.currentTime}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: lowStockItems.slice(0, 5).map((item: any, index: number) => 
                `${index + 1}. *${item["Part number"]}* - ${item["Part description"]}\n   Current: ${item.QTY} | Reorder: ${item.reorderPoint || alertSettings.defaultReorderPoint}`
              ).join('\n\n')
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `📋 <https://v0-inv-k3e82hxmi-holmesrc-amazoncoms-projects.vercel.app/low-stock|View All ${lowStockItems.length} Low Stock Items>`
            }
          }
        ]
      }

      const slackResponse = await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })

      if (!slackResponse.ok) {
        throw new Error(`Slack webhook failed: ${slackResponse.status}`)
      }

      console.log(`✅ Successfully sent low stock alert for ${lowStockItems.length} items`)
      
      return NextResponse.json({ 
        success: true, 
        message: `Alert sent for ${lowStockItems.length} low stock items`,
        itemsCount: lowStockItems.length,
        timestamp: scheduleInfo.currentTime,
        timezone: 'America/New_York',
        isDST: scheduleInfo.isDST,
        items: lowStockItems.map((item: any) => ({
          partNumber: item["Part number"],
          description: item["Part description"],
          currentQty: item.QTY,
          reorderPoint: item.reorderPoint || alertSettings.defaultReorderPoint
        }))
      })
    } catch (slackError) {
      console.error('❌ Failed to send Slack alert:', slackError)
      return NextResponse.json({ 
        error: 'Failed to send Slack alert',
        details: slackError instanceof Error ? slackError.message : 'Unknown error',
        timestamp: scheduleInfo.currentTime
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json({ 
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Also support POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request)
}
