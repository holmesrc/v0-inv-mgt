import { NextResponse } from "next/server"

export async function GET() {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json({
        success: false,
        configured: false,
        message: "SLACK_WEBHOOK_URL environment variable is not set",
        webhookTest: {
          success: false,
          error: "No webhook URL configured",
        },
      })
    }

    // Test the webhook by sending a simple message
    try {
      const testMessage = {
        text: "🔧 Test message from Inventory Management System",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "✅ *Slack Integration Test*\n\nThis is a test message to verify your Slack webhook is working correctly.",
            },
          },
        ],
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testMessage),
      })

      if (response.ok) {
        return NextResponse.json({
          success: true,
          configured: true,
          message: "Slack webhook URL is configured and working",
          webhookTest: {
            success: true,
            message: "Test message sent successfully to Slack",
          },
        })
      } else {
        const errorText = await response.text()
        return NextResponse.json({
          success: false,
          configured: true,
          message: "Slack webhook URL is configured but test failed",
          webhookTest: {
            success: false,
            error: `Webhook test failed: ${response.status} ${response.statusText} - ${errorText}`,
          },
        })
      }
    } catch (webhookError) {
      return NextResponse.json({
        success: false,
        configured: true,
        message: "Slack webhook URL is configured but test failed",
        webhookTest: {
          success: false,
          error: `Webhook test error: ${webhookError instanceof Error ? webhookError.message : "Unknown error"}`,
        },
      })
    }
  } catch (error) {
    console.error("Error in Slack webhook test:", error)
    return NextResponse.json(
      {
        success: false,
        configured: false,
        error: error instanceof Error ? error.message : "Unknown error",
        webhookTest: {
          success: false,
          error: "Internal server error",
        },
      },
      { status: 500 },
    )
  }
}
