import { NextResponse } from "next/server"

export async function POST() {
  // Only show this in development/preview - never in production for security
  const isProduction = process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production"

  if (isProduction) {
    return NextResponse.json(
      {
        error: "Request test not available in production for security",
      },
      { status: 403 },
    )
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    return NextResponse.json({
      success: false,
      error: "SLACK_WEBHOOK_URL not found",
      details: "Environment variable is not set",
      urlUsed: null,
    })
  }

  // Show exactly what URL we're about to use
  const requestDetails = {
    urlUsed: webhookUrl,
    urlLength: webhookUrl.length,
    urlPrefix: webhookUrl.substring(0, 50) + "...",
    urlSuffix: "..." + webhookUrl.substring(webhookUrl.length - 15),
    isValidFormat: webhookUrl.startsWith("https://hooks.slack.com/"),
    timestamp: new Date().toISOString(),
  }

  try {
    // Make the actual request with detailed logging
    console.log("🔍 Making Slack request with URL:", webhookUrl.substring(0, 50) + "...")

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: `🧪 Debug test message sent at ${new Date().toISOString()}`,
      }),
    })

    const responseText = await response.text()
    console.log("📥 Slack response:", response.status, responseText)

    return NextResponse.json({
      success: response.ok,
      requestDetails,
      response: {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        body: responseText,
        headers: Object.fromEntries(response.headers.entries()),
      },
      message: response.ok ? "Test message sent successfully!" : "Request failed",
    })
  } catch (error) {
    console.error("❌ Slack request error:", error)

    return NextResponse.json({
      success: false,
      requestDetails,
      error: "Network error",
      details: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to make request to Slack",
    })
  }
}
