import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🧪 Testing Slack webhook directly...")

    const webhookUrl = "https://hooks.slack.com/services/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"

    // Simple test message
    const payload = {
      text: "🧪 Direct webhook test from debug endpoint",
      channel: "#inventory-alerts",
      username: "Debug Test",
      icon_emoji: ":test_tube:",
    }

    console.log("📤 Sending test payload:", payload)

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    console.log("📡 Response status:", response.status)
    console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log("📡 Response body:", responseText)

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Slack webhook failed: ${response.status}`,
        details: responseText,
        webhookUrl: webhookUrl.substring(0, 50) + "...",
      })
    }

    return NextResponse.json({
      success: true,
      message: "Slack webhook test successful!",
      responseText,
      status: response.status,
    })
  } catch (error) {
    console.error("❌ Direct Slack test error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })
  }
}
