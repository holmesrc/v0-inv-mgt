import { NextResponse } from "next/server"

export async function POST() {
  try {
    const webhookUrl = "https://hooks.slack.com/services/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"

    // Simple test payload
    const payload = {
      text: "🧪 Simple Slack test message - this should work!",
    }

    console.log("Testing simple Slack message...")

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
      webhookTested: webhookUrl.substring(0, 50) + "...",
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
