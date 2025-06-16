import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { webhookUrl, message } = await request.json()

    if (!webhookUrl) {
      return NextResponse.json({ success: false, error: "Webhook URL is required" }, { status: 400 })
    }

    if (!webhookUrl.startsWith("https://hooks.slack.com/services/")) {
      return NextResponse.json({ success: false, error: "Invalid Slack webhook URL format" }, { status: 400 })
    }

    const testMessage = message || "🧪 Manual webhook test from debug page"

    console.log("🔍 Testing manual webhook...")
    console.log("🔍 URL length:", webhookUrl.length)
    console.log("🔍 URL starts with:", webhookUrl.substring(0, 35) + "...")
    console.log("🔍 Message:", testMessage)

    const payload = {
      text: testMessage,
    }

    console.log("🔍 Payload:", JSON.stringify(payload))
    console.log("🔍 Making fetch request...")

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    console.log("🔍 Response status:", response.status)
    console.log("🔍 Response ok:", response.ok)

    const responseText = await response.text()
    console.log("🔍 Response body:", responseText)

    if (response.ok) {
      console.log("✅ Manual webhook test successful!")
      return NextResponse.json({
        success: true,
        message: "Webhook test successful!",
        status: response.status,
        response: responseText,
      })
    } else {
      console.log("❌ Manual webhook test failed")
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status}: ${responseText}`,
        status: response.status,
        response: responseText,
      })
    }
  } catch (error) {
    console.error("❌ Manual webhook test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
