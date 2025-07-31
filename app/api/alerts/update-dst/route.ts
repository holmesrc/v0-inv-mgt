import { NextRequest, NextResponse } from "next/server"
import { 
  generateEasternTimeCronSchedule, 
  getEasternTimeInfo,
  getDSTTransitionDates,
  needsCronUpdate 
} from "@/lib/timezone"

export async function POST(request: NextRequest) {
  try {
    // This endpoint helps administrators update DST settings
    // In a production environment, this could trigger automated deployments
    
    const timeInfo = getEasternTimeInfo()
    const updateCheck = needsCronUpdate()
    const newSchedule = generateEasternTimeCronSchedule()
    const transitions = getDSTTransitionDates()
    
    const now = new Date()
    const currentTime = now.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })

    // Generate the updated vercel.json content
    const vercelConfig = {
      crons: [
        {
          path: "/api/alerts/cron",
          schedule: newSchedule
        },
        {
          path: "/api/alerts/dst-monitor", 
          schedule: "0 12 * * *"
        }
      ]
    }

    const response = {
      success: true,
      timestamp: currentTime,
      timezone: {
        current: timeInfo.abbreviation,
        isDST: timeInfo.isDST,
        offsetHours: timeInfo.offsetHours,
        utcHourFor9AM: timeInfo.utcHourFor9AM
      },
      cronUpdate: {
        newSchedule: newSchedule,
        description: `Every Monday at 9:00 AM ${timeInfo.abbreviation} (${timeInfo.utcHourFor9AM}:00 UTC)`,
        vercelConfig: vercelConfig
      },
      dstInfo: {
        nextSpringForward: transitions.springForward.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        }),
        nextFallBack: transitions.fallBack.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        })
      },
      instructions: {
        manual: [
          "1. Update vercel.json with the new cron schedule",
          "2. Commit and push changes to trigger redeployment",
          "3. Verify the new schedule is active in Vercel dashboard"
        ],
        automated: "This endpoint provides the configuration needed for automated DST updates"
      }
    }

    if (updateCheck.needsUpdate) {
      console.log(`🔄 DST update requested: ${updateCheck.reason}`)
      return NextResponse.json({
        ...response,
        alert: {
          level: 'info',
          message: `DST transition: ${updateCheck.reason}`,
          action: 'Cron schedule updated for new timezone',
          transitionDate: updateCheck.transitionDate?.toLocaleString('en-US', {
            timeZone: 'America/New_York',
            timeZoneName: 'short'
          })
        }
      })
    }

    return NextResponse.json({
      ...response,
      message: 'Current cron schedule is correct for the current timezone'
    })

  } catch (error) {
    console.error('❌ DST update error:', error)
    return NextResponse.json({ 
      error: 'DST update failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // GET method returns current DST status without making changes
  try {
    const timeInfo = getEasternTimeInfo()
    const currentSchedule = generateEasternTimeCronSchedule()
    const transitions = getDSTTransitionDates()
    
    return NextResponse.json({
      success: true,
      currentTimezone: timeInfo.abbreviation,
      isDST: timeInfo.isDST,
      currentCronSchedule: currentSchedule,
      description: `Every Monday at 9:00 AM ${timeInfo.abbreviation}`,
      nextTransitions: {
        springForward: transitions.springForward.toISOString(),
        fallBack: transitions.fallBack.toISOString()
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to get DST info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
