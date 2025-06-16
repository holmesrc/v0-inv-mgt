import { NextResponse } from "next/server"

export async function GET() {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    return NextResponse.json({
      configured: !!webhookUrl,
      message: webhookUrl ? "Slack webhook is configured" : "Slack webhook is not configured",
      details: {
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
        // Never expose the actual webhook URL
        webhookUrl: webhookUrl ? "***configured***" : "not set",
      },
    })
  } catch (error) {
    console.error("Error checking Slack config:", error)
    return NextResponse.json(
      {
        configured: false,
        message: "Error checking Slack configuration",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
