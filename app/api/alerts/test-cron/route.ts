import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // This endpoint allows you to manually test the cron job
    const cronSecret = process.env.CRON_SECRET || 'test-secret'
    
    const testUrl = `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/alerts/cron`
    
    console.log('🧪 Testing cron job manually...')
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      }
    })
    
    const result = await response.json()
    
    return NextResponse.json({
      success: true,
      message: 'Cron job test completed',
      cronResponse: result,
      status: response.status
    })
    
  } catch (error) {
    console.error('❌ Cron test error:', error)
    return NextResponse.json({ 
      error: 'Cron test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
