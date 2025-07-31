import { NextRequest, NextResponse } from "next/server"
import { 
  getEasternTimeInfo, 
  generateEasternTimeCronSchedule,
  getDSTTransitionDates,
  needsCronUpdate,
  validateCronSchedule,
  getScheduleDescription
} from "@/lib/timezone"

export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const timeInfo = getEasternTimeInfo()
    const scheduleInfo = getScheduleDescription('America/New_York')
    const transitions = getDSTTransitionDates()
    const updateCheck = needsCronUpdate()
    const currentCronSchedule = generateEasternTimeCronSchedule()
    
    // Current times in different formats
    const currentUTC = now.toLocaleString('en-US', { 
      timeZone: 'UTC',
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
    
    const currentEastern = now.toLocaleString('en-US', { 
      timeZone: 'America/New_York',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric', 
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
    
    // Calculate next Monday 9 AM Eastern
    const nextMonday = new Date(now)
    const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7
    nextMonday.setDate(now.getDate() + daysUntilMonday)
    nextMonday.setHours(9, 0, 0, 0)
    
    const nextMondayEastern = nextMonday.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
    
    const nextMondayUTC = nextMonday.toLocaleString('en-US', {
      timeZone: 'UTC',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
    
    // Validation
    const validation = validateCronSchedule(currentCronSchedule)
    
    return NextResponse.json({
      success: true,
      currentTime: {
        utc: currentUTC,
        eastern: currentEastern
      },
      timezoneInfo: {
        abbreviation: timeInfo.abbreviation,
        isDaylightSavingTime: timeInfo.isDST,
        offsetFromUTC: `-${timeInfo.offsetHours} hours`,
        utcHourFor9amEastern: timeInfo.utcHourFor9AM,
        cronSchedule: currentCronSchedule
      },
      dstTransitions: {
        springForward: {
          date: transitions.springForward.toLocaleString('en-US', {
            timeZone: 'America/New_York',
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
          }),
          description: "Spring forward to EDT (UTC-4)"
        },
        fallBack: {
          date: transitions.fallBack.toLocaleString('en-US', {
            timeZone: 'America/New_York',
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
          }),
          description: "Fall back to EST (UTC-5)"
        }
      },
      nextScheduledAlert: {
        eastern: nextMondayEastern,
        utc: nextMondayUTC,
        utcHour: timeInfo.utcHourFor9AM
      },
      dstMonitoring: {
        needsUpdate: updateCheck.needsUpdate,
        reason: updateCheck.reason,
        newSchedule: updateCheck.newSchedule,
        transitionDate: updateCheck.transitionDate?.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          timeZoneName: 'short'
        })
      },
      validation: validation,
      summary: {
        message: `9:00 AM ${timeInfo.abbreviation} = ${timeInfo.utcHourFor9AM}:00 UTC`,
        cronExpression: currentCronSchedule,
        description: 'Every Monday at 9:00 AM Eastern Time (automatically adjusts for DST)',
        automaticDSTHandling: 'Enabled - monitors for DST transitions daily at noon'
      }
    })
    
  } catch (error) {
    console.error("Timezone test error:", error)
    return NextResponse.json({ 
      error: "Timezone test failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
