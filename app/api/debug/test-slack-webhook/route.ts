import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  return testSlackWebhook()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    return testSlackWebhook(body.message, body.webhookUrl)
  } catch (error) {
    return testSlackWebhook()
  }
}

async function testSlackWebhook(customMessage?: string, customWebhookUrl?: string) {
  try {
    const webhookUrl = customWebhookUrl || process.env.SLACK_WEBHOOK_URL

    console.log("🔍 Testing Slack webhook...")
    console.log("Environment check:", {
      hasSlackWebhookUrl: !!process.env.SLACK_WEBHOOK_URL,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    })

    if (!webhookUrl) {
      return NextResponse.json({
        success: false,
        configured: false,
        error: "SLACK_WEBHOOK_URL environment variable is not set",
        debug: {
          envVarExists: !!process.env.SLACK_WEBHOOK_URL,
          envVarValue: process.env.SLACK_WEBHOOK_URL ? "***set***" : "not set",
          allEnvKeys: Object.keys(process.env).filter((key) => key.includes("SLACK")),
        },
      })
    }

    const testMessage = {
      text: customMessage || "🧪 Test message from Slack webhook debug",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              customMessage ||
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

    console.log("📤 Sending test message to Slack...")
    console.log("Webhook URL (first 20 chars):", webhookUrl.substring(0, 20) + "...")
    console.log("Message payload:", JSON.stringify(testMessage, null, 2))

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testMessage),
    })

    const responseText = await response.text()
    console.log(`📨 Slack response (${response.status}):`, responseText || "Empty response")

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText} - ${responseText}`)
    }

    return NextResponse.json({
      success: true,
      configured: true,
      message: "Test message sent successfully to Slack",
      webhookTest: {
        success: true,
        status: response.status,
        response: responseText || "ok",
      },
      debug: {
        webhookUrlLength: webhookUrl.length,
        webhookUrlStart: webhookUrl.substring(0, 20) + "...",
        messageLength: JSON.stringify(testMessage).length,
      },
    })
  } catch (error) {
    console.error("❌ Slack webhook test failed:", error)
    return NextResponse.json(
      {
        success: false,
        configured: true,
        error: error instanceof Error ? error.message : "Unknown error",
        webhookTest: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        debug: {
          envVarExists: !!process.env.SLACK_WEBHOOK_URL,
          errorType: error instanceof Error ? error.constructor.name : "Unknown",
        },
      },
      { status: 500 },
    )
  }
}
