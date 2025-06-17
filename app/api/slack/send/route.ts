import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message, channel } = await request.json()

    // Check if webhook URL is configured
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json(
        {
          error: "Slack webhook URL not configured",
          details: "SLACK_WEBHOOK_URL environment variable is missing",
          configured: false,
        },
        { status: 400 },
      )
    }

    // Validate webhook URL format
    if (!webhookUrl.startsWith("https://hooks.slack.com/")) {
      return NextResponse.json(
        {
          error: "Invalid Slack webhook URL format",
          details: "Webhook URL must start with https://hooks.slack.com/",
          configured: false,
        },
        { status: 400 },
      )
    }

    console.log("🚀 Sending Slack message:", { message: message.substring(0, 100), channel })

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: message,
        channel: channel,
      }),
    })

    console.log("📡 Slack response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Slack API error:", errorText)

      // Handle specific Slack errors
      if (response.status === 404 || errorText.includes("no_service")) {
        return NextResponse.json(
          {
            error: "Slack webhook URL is invalid or expired",
            details: errorText,
            configured: false,
          },
          { status: 404 },
        )
      }

      return NextResponse.json(
        {
          error: `Slack API error: ${response.status}`,
          details: errorText,
          configured: false,
        },
        { status: response.status },
      )
    }

    const result = await response.text()
    console.log("✅ Slack message sent successfully:", result)

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
      configured: true,
    })
  } catch (error) {
    console.error("❌ Error in Slack send route:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        configured: false,
      },
      { status: 500 },
    )
  }
}
