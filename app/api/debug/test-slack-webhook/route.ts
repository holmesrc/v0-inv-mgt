import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const message = body.message || "Test message from webhook debug"

    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json({
        success: false,
        error: "SLACK_WEBHOOK_URL environment variable is not set",
      })
    }

    console.log("🧪 Testing Slack webhook...")

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: message,
        username: "Inventory Bot",
        icon_emoji: ":test_tube:",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Slack webhook test failed:", errorText)
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        webhookTest: {
          success: false,
          error: errorText,
        },
      })
    }

    console.log("✅ Slack webhook test successful")
    return NextResponse.json({
      success: true,
      message: "Webhook test successful",
      webhookTest: {
        success: true,
      },
    })
  } catch (error) {
    console.error("❌ Webhook test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        webhookTest: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 },
    )
  }
}
