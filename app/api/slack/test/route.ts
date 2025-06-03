import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Slack interaction endpoint is working!",
    timestamp: new Date().toISOString(),
    domain: process.env.VERCEL_URL || "localhost",
    environment: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL ? "✅ Configured" : "❌ Missing",
      nodeEnv: process.env.NODE_ENV,
    },
    endpoints: {
      test: "/api/slack/test",
      interactions: "/api/slack/interactions",
      send: "/api/slack/send",
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    console.log("=== SLACK TEST ENDPOINT ===")
    console.log("Received POST request")
    console.log("Headers:", Object.fromEntries(request.headers.entries()))
    console.log("Body preview:", body.substring(0, 200))

    return NextResponse.json({
      success: true,
      message: "Test endpoint received your request",
      timestamp: new Date().toISOString(),
      bodyLength: body.length,
      method: request.method,
    })
  } catch (error) {
    console.error("Test endpoint error:", error)
    return NextResponse.json({ error: "Test failed" }, { status: 500 })
  }
}
