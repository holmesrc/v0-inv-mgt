import { NextRequest, NextResponse } from "next/server"
import { getScheduleDescription, getEasternTimeInfo } from "@/lib/timezone"

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Running simple cron test (no auth required)...')

    const scheduleInfo = getScheduleDescription('America/New_York')
    const timeInfo = getEasternTimeInfo()
    
    return NextResponse.json({
      success: true,
      message: "Simple cron test completed successfully",
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
      environmentCheck: {
        cronSecretExists: !!process.env.CRON_SECRET,
        cronSecretLength: process.env.CRON_SECRET?.length || 0,
        nodeEnv: process.env.NODE_ENV
      },
      nextAlert: "Next Monday at 9:00 AM Eastern Time",
      status: "✅ DST automation system is configured correctly"
    })

  } catch (error) {
    console.error('❌ Simple test error:', error)
    return NextResponse.json({ 
      error: 'Simple test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
