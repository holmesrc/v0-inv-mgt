import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Updated webhook URL
    const webhookUrl = "https://hooks.slack.com/services/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"

    const testPayload = {
      text: "🧪 Direct webhook test from debug API - New persistent webhook!",
    }

    console.log("Testing direct webhook:", webhookUrl.substring(0, 50) + "...")

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
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      webhookUrl: "https://hooks.slack.com/services/T053GDZ6J/B091G2FJ64B/...",
    })
  }
}
