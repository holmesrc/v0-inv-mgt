import { NextResponse } from "next/server"

export async function GET() {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    const configured = !!webhookUrl

    return NextResponse.json({
      success: true,
      configured,
      message: configured ? "Slack webhook URL is configured" : "Slack webhook URL is not configured",
      details: {
        webhookUrl: configured ? "***configured***" : "not set",
        environment: process.env.NODE_ENV || "unknown",
      },
    })
  } catch (error) {
    console.error("Error checking Slack configuration:", error)
    return NextResponse.json(
      {
        success: false,
        configured: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
