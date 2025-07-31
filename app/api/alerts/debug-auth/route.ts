import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET
    
    return NextResponse.json({
      success: true,
      debug: {
        receivedAuthHeader: authHeader,
        expectedSecret: expectedSecret,
        secretExists: !!expectedSecret,
        secretLength: expectedSecret?.length || 0,
        headersMatch: authHeader === `Bearer ${expectedSecret}`,
        allHeaders: Object.fromEntries(request.headers.entries())
      },
      message: "Debug information for authentication troubleshooting"
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
