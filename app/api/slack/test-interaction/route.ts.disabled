import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    message: "Slack interaction endpoint is reachable",
    timestamp: new Date().toISOString(),
    environment: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL ? "configured" : "missing",
      nodeEnv: process.env.NODE_ENV,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    console.log("=== SLACK INTERACTION TEST ===")
    console.log("Raw body:", body)
    console.log("Headers:", Object.fromEntries(request.headers.entries()))
    console.log("Method:", request.method)
    console.log("URL:", request.url)

    return NextResponse.json({
      received: true,
      body: body.substring(0, 500), // First 500 chars
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Test interaction error:", error)
    return NextResponse.json({ error: "Test failed" }, { status: 500 })
  }
}
