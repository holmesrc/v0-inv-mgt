import { NextResponse } from "next/server"

export async function POST() {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "SLACK_WEBHOOK_URL environment variable is not set",
          details: "The environment variable is completely missing",
        },
        { status: 400 },
      )
    }

    if (!webhookUrl.startsWith("https://hooks.slack.com/")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid webhook URL format",
          details: `URL should start with 'https://hooks.slack.com/' but starts with '${webhookUrl.substring(0, 30)}...'`,
        },
        { status: 400 },
      )
    }

    console.log("🔍 Testing Slack webhook...")
    console.log("Webhook URL length:", webhookUrl.length)
    console.log("Webhook URL prefix:", webhookUrl.substring(0, 50) + "...")

    const testMessage = {
      text: `🧪 Test message from Inventory Management System at ${new Date().toISOString()}`,
      channel: "#inventory-alerts",
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testMessage),
    })

    console.log("📡 Slack response status:", response.status)
    console.log("📡 Slack response headers:", Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log("📡 Slack response body:", responseText)

    if (!response.ok) {
      let errorDetails = `HTTP ${response.status}: ${response.statusText}`

      // Handle specific Slack errors
      if (response.status === 404) {
        errorDetails = "Webhook URL not found (404) - the webhook may have been deleted or is invalid"
      } else if (response.status === 403) {
        errorDetails = "Forbidden (403) - the webhook may not have permission to post to the channel"
      } else if (response.status === 400) {
        errorDetails = "Bad request (400) - the message format may be invalid"
      }

      if (responseText) {
        errorDetails += ` - Response: ${responseText}`
      }

      return NextResponse.json(
        {
          success: false,
          error: "Slack API error",
          details: errorDetails,
          status: response.status,
          responseBody: responseText,
        },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Test message sent successfully to Slack",
      status: response.status,
      responseBody: responseText,
    })
  } catch (error) {
    console.error("❌ Error testing Slack webhook:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Network or configuration error",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
