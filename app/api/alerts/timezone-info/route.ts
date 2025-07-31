import { NextRequest, NextResponse } from "next/server"
import { getScheduleDescription, generateEasternTimeCronSchedule, getEasternTimeInfo } from "@/lib/timezone"

export async function GET(request: NextRequest) {
  try {
    const scheduleInfo = getScheduleDescription('America/New_York')
    const cronSchedule = generateEasternTimeCronSchedule()
    const timeInfo = getEasternTimeInfo()
    
    // Calculate next Monday 9 AM Eastern
    const now = new Date()
    const nextMonday = new Date(now)
    const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7
    nextMonday.setDate(now.getDate() + daysUntilMonday)
    nextMonday.setHours(9, 0, 0, 0)
    
    const nextMondayEastern = nextMonday.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
    
    const nextMondayUTC = nextMonday.toLocaleString('en-US', {
      timeZone: 'UTC',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })

    return NextResponse.json({
      success: true,
      timezone: {
        name: 'America/New_York',
        current: scheduleInfo,
        cronSchedule: cronSchedule,
        timeInfo: {
          abbreviation: timeInfo.abbreviation,
          isDST: timeInfo.isDST,
          offsetHours: timeInfo.offsetHours,
          utcHourFor9AM: timeInfo.utcHourFor9AM
        },
        utcConversion: {
          localTime: '9:00 AM Eastern',
          utcHour: timeInfo.utcHourFor9AM,
          cronExpression: cronSchedule
        },
        nextExecution: {
          eastern: nextMondayEastern,
          utc: nextMondayUTC
        }
      }
    })
  } catch (error) {
    console.error("Error getting timezone info:", error)
    return NextResponse.json({ 
      error: "Failed to get timezone info",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
