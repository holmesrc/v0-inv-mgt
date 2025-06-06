import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text, blocks, channel } = await request.json()

    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json({ error: "Slack webhook URL not configured" }, { status: 500 })
    }

    // Create a simple payload
    const payload = {
      channel: channel || "#inventory-alerts",
      text: text || "Low stock alert",
      username: "Inventory Bot",
      icon_emoji: ":package:",
    }

    // Only add blocks if they're provided
    if (blocks && Array.isArray(blocks) && blocks.length > 0) {
      payload.blocks = blocks
    }

    console.log("Sending payload to Slack:", JSON.stringify(payload, null, 2))

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

      // If blocks are causing the issue, try without them
      if (payload.blocks && errorText.includes("invalid_blocks")) {
        console.log("Retrying without blocks...")
        delete payload.blocks

        const retryResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        if (retryResponse.ok) {
          return NextResponse.json({ success: true, fallback: true })
        }
      }

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
