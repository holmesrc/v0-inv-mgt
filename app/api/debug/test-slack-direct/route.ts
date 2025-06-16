import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Use the CORRECT new webhook URL
    const webhookUrl =
      process.env.SLACK_WEBHOOK_URL || "https://hooks.slack.com/services/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"

    const testPayload = {
      text: "🧪 Direct webhook test - Using the CORRECT new webhook URL!",
    }

    console.log("Testing CORRECT webhook URL...")
    console.log("Webhook source:", process.env.SLACK_WEBHOOK_URL ? "environment" : "fallback")
    console.log("Webhook URL:", webhookUrl.substring(0, 50) + "...")

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    })

    const responseText = await response.text()

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      response: responseText,
      webhookUrl: webhookUrl.substring(0, 50) + "...",
      fullWebhookForDebug: webhookUrl,
      webhookSource: process.env.SLACK_WEBHOOK_URL ? "environment" : "fallback",
      environmentVariableSet: !!process.env.SLACK_WEBHOOK_URL,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      environmentVariableSet: !!process.env.SLACK_WEBHOOK_URL,
    })
  }
}
