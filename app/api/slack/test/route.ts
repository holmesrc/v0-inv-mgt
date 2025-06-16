import { type NextRequest, NextResponse } from "next/server"
import { testSlackConnection } from "@/lib/slack"

export async function POST(request: NextRequest) {
  try {
    const result = await testSlackConnection()

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Slack test message sent successfully!",
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to send test message",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in slack test API:", error)
    return NextResponse.json(
      {
        error: "Failed to test Slack connection",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
