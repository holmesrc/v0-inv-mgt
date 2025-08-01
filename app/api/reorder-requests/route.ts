import { NextRequest, NextResponse } from "next/server"

// In-memory storage for demo (in production, use a database)
let reorderRequests: any[] = []

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      requests: reorderRequests.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    })
  } catch (error) {
    console.error('Error fetching reorder requests:', error)
    return NextResponse.json({
      error: 'Failed to fetch reorder requests',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      partNumber,
      description,
      currentQty,
      reorderPoint,
      supplier,
      location,
      quantity,
      timeframe,
      urgency,
      requester,
      notes
    } = await request.json()

    // Generate unique ID
    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const newRequest = {
      id: requestId,
      partNumber,
      description,
      currentQty,
      reorderPoint,
      supplier,
      location,
      quantity,
      timeframe,
      urgency,
      requester,
      notes,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Add to storage
    reorderRequests.push(newRequest)

    console.log(`✅ New reorder request created: ${requestId} for ${partNumber}`)

    return NextResponse.json({
      success: true,
      message: 'Reorder request created successfully',
      requestId,
      request: newRequest
    })

  } catch (error) {
    console.error('Error creating reorder request:', error)
    return NextResponse.json({
      error: 'Failed to create reorder request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
