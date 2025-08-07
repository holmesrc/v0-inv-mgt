import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { blocks, channel } = await request.json()

    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json({ error: "Slack webhook URL not configured" }, { status: 500 })
    }

    // Extract items from blocks to create a simplified message
    let items: any[] = []
    try {
      // Try to extract items from the blocks structure
      const showAllButton = blocks.find(
        (block: any) => block.accessory && block.accessory.action_id === "show_all_low_stock",
      )
      if (showAllButton && showAllButton.accessory.value) {
        items = JSON.parse(showAllButton.accessory.value)
      }
    } catch (e) {
      console.log("Could not extract items from blocks, using fallback")
    }

    // Import the message creation function
    const { createLowStockAlertMessage } = await import("@/lib/slack")
    const message =
      items.length > 0 ? createLowStockAlertMessage(items) : "🚨 Low stock alert - please check inventory system"

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channel,
        text: message,
        username: "Inventory Bot",
        icon_emoji: ":package:",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Slack API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending simplified Slack message:", error)
    return NextResponse.json(
      {
        error: "Failed to send message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
