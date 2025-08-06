import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('Test edit endpoint called')
    const body = await request.json()
    console.log('Request body:', body)
    
    return NextResponse.json({
      success: true,
      message: 'Test endpoint working',
      received: body
    })
  } catch (error) {
    console.error('Test edit error:', error)
    return NextResponse.json(
      { success: false, error: 'Test endpoint error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Test edit endpoint is accessible'
  })
}
