import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Test cron job executed at:', new Date().toISOString())
    
    // Simple test - no database calls, no Slack
    const testData = {
      success: true,
      message: 'Test cron job executed successfully',
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || 'unknown'
    }
    
    console.log('Test cron data:', testData)
    
    return NextResponse.json(testData)
    
  } catch (error) {
    console.error('Test cron error:', error)
    return NextResponse.json({ 
      error: 'Test cron failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
