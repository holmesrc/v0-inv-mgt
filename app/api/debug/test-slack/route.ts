import { NextResponse } from "next/server"
import { testSlackWebhook } from "@/lib/slack"

export async function GET() {
  try {
    const result = await testSlackWebhook()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error testing Slack webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, webhookUrl } = body

    const result = await testSlackWebhook(message, webhookUrl)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error testing Slack webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
