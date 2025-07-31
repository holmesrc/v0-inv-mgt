import { type NextRequest, NextResponse } from "next/server"
import { getScheduleDescription, generateEasternTimeCronSchedule } from "@/lib/timezone"

export async function POST(request: NextRequest) {
  try {
    const { settings, lowStockItems } = await request.json()

    // Get timezone-aware schedule information
    const scheduleInfo = getScheduleDescription('America/New_York')
    const cronSchedule = generateEasternTimeCronSchedule()
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = dayNames[settings.dayOfWeek] || 'Monday'

    if (settings.enabled) {
      return NextResponse.json({
        success: true,
        message: `Automatic alerts are enabled for ${dayName} at ${settings.time} Eastern Time`,
        itemsCount: lowStockItems.length,
        cronInfo: {
          schedule: cronSchedule,
          description: scheduleInfo.schedule,
          timezone: 'America/New_York',
          currentTime: scheduleInfo.currentTime,
          isDST: scheduleInfo.isDST,
          endpoint: "/api/alerts/cron",
          nextRun: "Next Monday at 9:00 AM Eastern Time"
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Automatic alerts are disabled",
      cronInfo: {
        schedule: cronSchedule,
        description: scheduleInfo.schedule,
        timezone: 'America/New_York',
        status: "disabled"
      }
    })
  } catch (error) {
    console.error("Error checking alert schedule:", error)
    return NextResponse.json({ error: "Failed to check alert schedule" }, { status: 500 })
  }
}
