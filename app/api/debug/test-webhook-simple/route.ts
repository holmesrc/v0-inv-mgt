import { NextResponse } from "next/server"

export async function POST() {
  try {
    const webhookUrl = "https://hooks.slack.com/services/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"

    // Ultra-simple payload to test webhook
    const payload = {
      text: "✅ Webhook test successful!",
    }

    console.log("Testing webhook with simple payload...")

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      response: responseText,
      webhookUrl: webhookUrl.substring(0, 50) + "...",
      payload: payload,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
