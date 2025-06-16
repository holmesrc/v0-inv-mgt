import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

    if (!SLACK_WEBHOOK_URL) {
      return NextResponse.json({
        exists: false,
        message: "SLACK_WEBHOOK_URL not found",
      })
    }

    // Show first and last few characters to verify it's different
    const urlLength = SLACK_WEBHOOK_URL.length
    const firstPart = SLACK_WEBHOOK_URL.substring(0, 35)
    const lastPart = SLACK_WEBHOOK_URL.substring(urlLength - 10)

    return NextResponse.json({
      exists: true,
      length: urlLength,
      firstPart,
      lastPart,
      format: SLACK_WEBHOOK_URL.startsWith("https://hooks.slack.com/services/"),
      // This will help us see if it's actually a different URL
      hash: SLACK_WEBHOOK_URL.split("/").pop()?.substring(0, 8) + "...",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
