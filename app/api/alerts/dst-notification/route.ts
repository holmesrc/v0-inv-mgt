import { NextRequest, NextResponse } from "next/server"
import { sendSlackMessage } from "@/lib/slack"
import { 
  getEasternTimeInfo, 
  generateEasternTimeCronSchedule,
  getDSTTransitionDates,
  needsCronUpdate 
} from "@/lib/timezone"

export async function POST(request: NextRequest) {
  try {
    // This endpoint sends DST transition notifications
    const timeInfo = getEasternTimeInfo()
    const updateCheck = needsCronUpdate()
    const newSchedule = generateEasternTimeCronSchedule()
    const transitions = getDSTTransitionDates()
    
    if (!updateCheck.needsUpdate) {
      return NextResponse.json({
        success: true,
        message: 'No DST transition notification needed',
        currentTimezone: timeInfo.abbreviation
      })
    }

    // Create notification message
    const transitionType = updateCheck.reason?.includes('Spring') ? 'Spring Forward' : 'Fall Back'
    const newTimezone = timeInfo.isDST ? 'EDT' : 'EST'
    const oldTimezone = timeInfo.isDST ? 'EST' : 'EDT'
    
    const notificationMessage = `
🕐 **DST Transition Alert - Inventory Management System**

**Transition**: ${transitionType} (${oldTimezone} → ${newTimezone})
**Date**: ${updateCheck.transitionDate?.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZoneName: 'short'
    })}

**Action Required**: 
The inventory alert cron schedule needs to be updated to maintain Monday 9:00 AM Eastern alerts.

**Current Schedule**: \`${generateEasternTimeCronSchedule()}\`
**New Schedule Needed**: \`${newSchedule}\`

**Manual Steps**:
1. Update \`vercel.json\` cron schedule
2. Commit and deploy changes
3. Verify new schedule in Vercel dashboard

**Next Alert Time**: Next Monday at 9:00 AM ${newTimezone}

This is an automated notification from your inventory management system.
    `.trim()

    try {
      // Send Slack notification
      await sendSlackMessage(notificationMessage, "#inventory-alerts")
      
      console.log(`✅ DST transition notification sent: ${transitionType}`)
      
      return NextResponse.json({
        success: true,
        message: `DST transition notification sent: ${transitionType}`,
        transition: {
          type: transitionType,
          from: oldTimezone,
          to: newTimezone,
          date: updateCheck.transitionDate?.toISOString(),
          newCronSchedule: newSchedule
        },
        notificationSent: true
      })
      
    } catch (slackError) {
      console.error('❌ Failed to send DST notification:', slackError)
      
      return NextResponse.json({
        success: false,
        message: 'DST transition detected but notification failed',
        transition: {
          type: transitionType,
          from: oldTimezone,
          to: newTimezone,
          date: updateCheck.transitionDate?.toISOString(),
          newCronSchedule: newSchedule
        },
        notificationSent: false,
        error: slackError instanceof Error ? slackError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ DST notification error:', error)
    return NextResponse.json({ 
      error: 'DST notification failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // GET method returns information about upcoming DST transitions
  try {
    const timeInfo = getEasternTimeInfo()
    const transitions = getDSTTransitionDates()
    const now = new Date()
    
    // Determine next transition
    const nextTransition = now < transitions.springForward 
      ? { 
          date: transitions.springForward, 
          type: 'Spring Forward',
          from: 'EST',
          to: 'EDT',
          description: 'Clocks spring forward 1 hour (2:00 AM becomes 3:00 AM)'
        }
      : { 
          date: transitions.fallBack, 
          type: 'Fall Back',
          from: 'EDT', 
          to: 'EST',
          description: 'Clocks fall back 1 hour (2:00 AM becomes 1:00 AM)'
        }
    
    // Calculate days until next transition
    const daysUntilTransition = Math.ceil((nextTransition.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    return NextResponse.json({
      success: true,
      currentTimezone: {
        abbreviation: timeInfo.abbreviation,
        isDST: timeInfo.isDST,
        offsetHours: timeInfo.offsetHours
      },
      nextTransition: {
        ...nextTransition,
        date: nextTransition.date.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        }),
        daysUntil: daysUntilTransition
      },
      allTransitions: {
        springForward: transitions.springForward.toISOString(),
        fallBack: transitions.fallBack.toISOString()
      },
      cronSchedule: {
        current: generateEasternTimeCronSchedule(),
        description: `Every Monday at 9:00 AM ${timeInfo.abbreviation}`
      }
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to get DST transition info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
