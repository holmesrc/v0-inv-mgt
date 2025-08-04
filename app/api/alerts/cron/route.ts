import { NextRequest, NextResponse } from "next/server"
import { sendFullLowStockAlert } from "@/lib/slack"
import { getScheduleDescription, isCorrectAlertTime } from "@/lib/timezone"

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scheduleInfo = getScheduleDescription('America/New_York')
    console.log(`🕘 Cron triggered at ${scheduleInfo.currentTime}`)

    // Check if this is the correct time to run (9:00 AM Eastern, accounting for DST)
    const shouldRun = isCorrectAlertTime()
    
    if (!shouldRun) {
      console.log(`⏰ Not the correct time to run alert. Current: ${scheduleInfo.currentTime}`)
      return NextResponse.json({ 
        success: true, 
        message: 'Cron triggered but not correct time for alert',
        timestamp: scheduleInfo.currentTime,
        timezone: 'America/New_York',
        isDST: scheduleInfo.isDST
      })
    }

    console.log(`✅ Correct time detected for alert: ${scheduleInfo.currentTime}`)

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

    // Send Slack alert
    try {
      await sendFullLowStockAlert(lowStockItems, "#inventory-alerts")
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
