import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const logs: string[] = []

  try {
    const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

    logs.push(`🔍 Webhook URL exists: ${!!SLACK_WEBHOOK_URL}`)

    if (!SLACK_WEBHOOK_URL) {
      logs.push("❌ SLACK_WEBHOOK_URL not found in environment")
      return NextResponse.json({
        success: false,
        error: "Slack not configured",
        logs,
      })
    }

    logs.push(`🔍 Webhook URL length: ${SLACK_WEBHOOK_URL.length}`)
    logs.push(`🔍 Webhook URL starts with: ${SLACK_WEBHOOK_URL.substring(0, 30)}...`)

    const message = "✅ Detailed Slack test from debug endpoint"
    logs.push(`🔍 Message: ${message}`)

    const payload = { text: message }
    logs.push(`🔍 Payload: ${JSON.stringify(payload)}`)

    logs.push("🔍 Making fetch request...")

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    logs.push(`🔍 Response status: ${response.status}`)
    logs.push(`🔍 Response ok: ${response.ok}`)

    const responseText = await response.text()
    logs.push(`🔍 Response body: "${responseText}"`)

    if (!response.ok) {
      logs.push(`❌ Request failed with status ${response.status}`)
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status}: ${responseText}`,
        logs,
        responseStatus: response.status,
        responseBody: responseText,
      })
    }

    logs.push("✅ Request successful!")

    return NextResponse.json({
      success: true,
      message: "Test message sent successfully",
      logs,
      responseStatus: response.status,
      responseBody: responseText,
    })
  } catch (error) {
    logs.push(`❌ Exception caught: ${error}`)
    console.error("Detailed Slack test error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        logs,
      },
      { status: 500 },
    )
  }
}
