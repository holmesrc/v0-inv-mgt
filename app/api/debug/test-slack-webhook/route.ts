import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { message, webhookUrl } = await request.json()

    // Use custom webhook URL if provided, otherwise use environment variable
    const finalWebhookUrl = webhookUrl || process.env.SLACK_WEBHOOK_URL

    console.log("🔍 Testing Slack webhook...")
    console.log("Environment SLACK_WEBHOOK_URL:", process.env.SLACK_WEBHOOK_URL ? "SET" : "NOT SET")
    console.log("Using webhook URL:", finalWebhookUrl ? "PROVIDED" : "MISSING")

    if (!finalWebhookUrl) {
      return NextResponse.json({
        success: false,
        error: "No webhook URL provided and SLACK_WEBHOOK_URL environment variable is not set",
        configured: false,
      })
    }

    const testPayload = {
      text: message || "🧪 Test message from Inventory Management System",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              message ||
              "🧪 *Test Message*\n\nThis is a test message to verify the Slack webhook is working correctly.",
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Sent from: ${process.env.NEXT_PUBLIC_APP_URL || "Unknown URL"} at ${new Date().toISOString()}`,
            },
          ],
        },
      ],
    }

    console.log("📤 Sending test payload to Slack...")
    console.log("Payload:", JSON.stringify(testPayload, null, 2))

    const response = await fetch(finalWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    })

    const responseText = await response.text()
    console.log(`📡 Slack response (${response.status}):`, responseText || "Empty response")

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText} - ${responseText}`)
    }

    return NextResponse.json({
      success: true,
      message: "Test message sent successfully to Slack",
      details: {
        status: response.status,
        response: responseText || "ok",
        webhookUsed: webhookUrl ? "custom" : "environment",
      },
    })
  } catch (error) {
    console.error("❌ Slack webhook test failed:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
    })
  }
}
