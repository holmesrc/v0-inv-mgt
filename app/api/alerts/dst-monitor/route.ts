import { NextRequest, NextResponse } from "next/server"
import { 
  needsCronUpdate, 
  generateEasternTimeCronSchedule, 
  getEasternTimeInfo,
  getDSTTransitionDates,
  validateCronSchedule 
} from "@/lib/timezone"
import { sendSlackMessage } from "@/lib/slack"

export async function GET(request: NextRequest) {
  try {
    // Check if this is a legitimate monitoring request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Running DST monitoring check...')

    const timeInfo = getEasternTimeInfo()
    const updateCheck = needsCronUpdate()
    const currentSchedule = generateEasternTimeCronSchedule()
    const transitions = getDSTTransitionDates()
    
    // Get current time info
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

    const response = {
      success: true,
      timestamp: currentTime,
      timezone: {
        current: timeInfo.abbreviation,
        isDST: timeInfo.isDST,
        offsetHours: timeInfo.offsetHours,
        utcHourFor9AM: timeInfo.utcHourFor9AM
      },
      cronSchedule: {
        current: currentSchedule,
        description: `Every Monday at 9:00 AM ${timeInfo.abbreviation} (${timeInfo.utcHourFor9AM}:00 UTC)`
      },
      dstTransitions: {
        springForward: transitions.springForward.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        }),
        fallBack: transitions.fallBack.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        })
      },
      updateStatus: updateCheck
    }

    if (updateCheck.needsUpdate) {
      console.log(`⚠️ DST transition detected: ${updateCheck.reason}`)
      console.log(`📅 Transition date: ${updateCheck.transitionDate?.toLocaleString()}`)
      console.log(`🔄 New cron schedule needed: ${updateCheck.newSchedule}`)
      
      // Send automatic notification
      try {
        const transitionType = updateCheck.reason?.includes('Spring') ? 'Spring Forward' : 'Fall Back'
        const newTimezone = timeInfo.isDST ? 'EDT' : 'EST'
        const oldTimezone = timeInfo.isDST ? 'EST' : 'EDT'
        
        const notificationMessage = `
🕐 **DST Transition Detected - Inventory System**

**Transition**: ${transitionType} (${oldTimezone} → ${newTimezone})
**Date**: ${updateCheck.transitionDate?.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          timeZoneName: 'short'
        })}

**Action Required**: Update cron schedule to maintain Monday 9:00 AM Eastern alerts.

**New Schedule**: \`${updateCheck.newSchedule}\`
**Description**: Every Monday at 9:00 AM ${newTimezone}

Please update \`vercel.json\` and redeploy to maintain correct alert timing.
        `.trim()

        await sendSlackMessage(notificationMessage, "#inventory-alerts")
        console.log('✅ DST transition notification sent')
        
      } catch (notificationError) {
        console.error('❌ Failed to send DST notification:', notificationError)
      }
      
      return NextResponse.json({
        ...response,
        alert: {
          level: 'warning',
          message: 'DST transition detected - cron schedule needs update',
          action: 'Update vercel.json cron schedule and redeploy',
          newSchedule: updateCheck.newSchedule,
          notificationSent: true
        }
      })
    }

    console.log(`✅ DST check complete - no updates needed (${timeInfo.abbreviation})`)
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ DST monitoring error:', error)
    return NextResponse.json({ 
      error: 'DST monitoring failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Also support POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request)
}
