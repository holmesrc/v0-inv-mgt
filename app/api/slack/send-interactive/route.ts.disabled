import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { blocks, channel } = await request.json()

    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json({ error: "Slack webhook URL not configured" }, { status: 500 })
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channel,
        blocks: blocks,
        username: "Inventory Bot",
        icon_emoji: ":package:",
      }),
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending interactive Slack message:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
