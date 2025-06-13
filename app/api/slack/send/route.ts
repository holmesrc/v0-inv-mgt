import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { message, blocks, channel } = await request.json()

    // Validate that we have a message
    if (!message) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 })
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ error: "Slack webhook URL not configured" }, { status: 500 })
    }

    // Prepare the payload
    const payload = {
      text: message, // This is required for all Slack messages
      blocks: blocks, // Optional blocks for rich formatting
      channel: channel || "#inventory-alerts", // Default channel
    }

    // Send to Slack
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Slack API error:", response.status, errorText)
      return NextResponse.json(
        { error: `Slack API error: ${response.status} - ${errorText}` },
        { status: response.status },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending Slack message:", error)
    return NextResponse.json(
      { error: `Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
