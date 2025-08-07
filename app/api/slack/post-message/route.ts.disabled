import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { text, blocks, channel = "#inventory-alerts" } = await request.json()

    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    // Debug logging
    console.log("🔍 POST-MESSAGE SLACK_WEBHOOK_URL Debug:")
    console.log("  - Exists:", !!webhookUrl)
    console.log("  - Length:", webhookUrl?.length || 0)
    console.log("  - Prefix:", webhookUrl ? webhookUrl.substring(0, 50) + "..." : "Not set")
    console.log("  - Suffix:", webhookUrl ? "..." + webhookUrl.substring(webhookUrl.length - 20) : "Not set")

    if (!webhookUrl) {
      return NextResponse.json(
        {
          error: "Slack webhook URL not configured",
          details: "SLACK_WEBHOOK_URL environment variable is not set",
        },
        { status: 500 },
      )
    }

    console.log("🚀 Posting to Slack with URL:", webhookUrl.substring(0, 50) + "...")

    const payload: any = {
      text,
      channel,
    }

    if (blocks) {
      payload.blocks = blocks
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()

    console.log("📥 Post-message Slack response:")
    console.log("  - Status:", response.status)
    console.log("  - OK:", response.ok)
    console.log("  - Body:", responseText)

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Slack API error",
          details: `HTTP ${response.status}: ${responseText}`,
        },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Message posted successfully",
      slackResponse: responseText,
    })
  } catch (error) {
    console.error("❌ Error in /api/slack/post-message:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
