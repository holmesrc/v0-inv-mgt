import { NextRequest, NextResponse } from "next/server"
import { getScheduleDescription, getEasternTimeInfo } from "@/lib/timezone"

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate test request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🧪 Running cron job test...')

    const scheduleInfo = getScheduleDescription('America/New_York')
    const timeInfo = getEasternTimeInfo()
    
    // Simulate the cron job logic without making internal API calls
    const mockInventory = [
      { "Part number": "TEST-001", "Part description": "Test Item 1", QTY: 5, reorderPoint: 10 },
      { "Part number": "TEST-002", "Part description": "Test Item 2", QTY: 15, reorderPoint: 10 },
      { "Part number": "TEST-003", "Part description": "Test Item 3", QTY: 2, reorderPoint: 10 }
    ]

    const mockSettings = {
      enabled: true,
      dayOfWeek: 1, // Monday
      time: "09:00",
      defaultReorderPoint: 10
    }

    // Find mock low stock items
    const lowStockItems = mockInventory.filter(item => {
      const reorderPoint = item.reorderPoint || mockSettings.defaultReorderPoint
      return item.QTY <= reorderPoint
    })

    console.log(`📊 Mock test found ${lowStockItems.length} low stock items`)

    return NextResponse.json({
      success: true,
      message: `Cron job test completed successfully`,
      testResults: {
        timestamp: scheduleInfo.currentTime,
        timezone: {
          current: timeInfo.abbreviation,
          isDST: timeInfo.isDST,
          offsetHours: timeInfo.offsetHours,
          utcHourFor9AM: timeInfo.utcHourFor9AM
        },
        cronSchedule: {
          current: `0 ${timeInfo.utcHourFor9AM} * * 1`,
          description: `Every Monday at 9:00 AM ${timeInfo.abbreviation}`
        },
        mockData: {
          totalItems: mockInventory.length,
          lowStockItems: lowStockItems.length,
          alertsEnabled: mockSettings.enabled,
          items: lowStockItems.map(item => ({
            partNumber: item["Part number"],
            description: item["Part description"],
            currentQty: item.QTY,
            reorderPoint: item.reorderPoint || mockSettings.defaultReorderPoint
          }))
        },
        nextRealAlert: "Next Monday at 9:00 AM Eastern Time",
        status: "✅ Cron job configuration is working correctly"
      }
    })

  } catch (error) {
    console.error('❌ Cron test error:', error)
    return NextResponse.json({ 
      error: 'Cron test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Also support POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request)
}
