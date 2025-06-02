import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text, blocks, channel } = await request.json()

    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json({ error: "Slack webhook URL not configured" }, { status: 500 })
    }

    // Create a payload that should work with webhooks
    const payload = {
      channel: channel || "#inventory-alerts",
      text: text || "Low stock alert",
      username: "Inventory Bot",
      icon_emoji: ":package:",
    }

    // Only add blocks if they're provided and valid
    if (blocks && Array.isArray(blocks) && blocks.length > 0) {
      payload.blocks = blocks
    }

    console.log("Sending to Slack:", JSON.stringify(payload, null, 2))

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Slack API error response:", errorText)
      throw new Error(`Slack API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const responseText = await response.text()
    console.log("Slack response:", responseText)
    return NextResponse.json({ success: true, response: responseText })
  } catch (error) {
    console.error("Error posting to Slack:", error)
    return NextResponse.json(
      {
        error: "Failed to post message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
