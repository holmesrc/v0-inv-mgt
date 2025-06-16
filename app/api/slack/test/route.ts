import { type NextRequest, NextResponse } from "next/server"
import { testSlackConnection } from "@/lib/slack"

export async function POST(request: NextRequest) {
  try {
    const result = await testSlackConnection()

    return NextResponse.json({
      success: result.success,
      message: result.success ? "Test message sent successfully" : "Test failed",
      // NO SENSITIVE DATA in response
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Test failed",
        // NO ERROR DETAILS
      },
      { status: 500 },
    )
  }
}
