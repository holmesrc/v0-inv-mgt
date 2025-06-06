import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { blocks, channel } = await request.json()

    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json({ error: "Slack webhook URL not configured" }, { status: 500 })
    }

    console.log("Sending blocks to Slack:", JSON.stringify(blocks, null, 2))

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channel || "#inventory-alerts",
        blocks: blocks,
        text: "Low stock alert", // Fallback text for notifications
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Slack API error response:", errorText)
      throw new Error(`Slack API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending interactive Slack message:", error)
    return NextResponse.json(
      {
        error: "Failed to send interactive message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
