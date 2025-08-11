import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Simple cron test triggered at:', new Date().toISOString())
    
    // Send a simple test message to Slack
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
    if (slackWebhookUrl) {
      const message = {
        text: `🧪 Cron Test - ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`
      }
      
      await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Simple cron test completed',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Simple cron test error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
