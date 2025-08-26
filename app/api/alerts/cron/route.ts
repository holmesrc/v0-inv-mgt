import { NextRequest, NextResponse } from "next/server"

// This endpoint has been deprecated and replaced by /api/cron/weekly-alert
// Redirecting to prevent old cron jobs from running
export async function GET(request: NextRequest) {
  console.log('⚠️ Deprecated cron endpoint called - redirecting to new system')
  
  return NextResponse.json({ 
    error: 'This endpoint is deprecated. Use /api/cron/weekly-alert instead.',
    deprecated: true,
    newEndpoint: '/api/cron/weekly-alert'
  }, { status: 410 }) // 410 Gone
}
