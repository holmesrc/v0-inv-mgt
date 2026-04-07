import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { items, channel, labName, labSlug } = await request.json()

    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json({ error: "Slack webhook URL not configured" }, { status: 500 })
    }

    // Import the message creation function
    const { createFullLowStockMessage } = await import("@/lib/slack")
    const labLabel = labName ? ` — ${labName}` : ""
    const labPrefix = labSlug ? `/${labSlug}` : ""
    const message = createFullLowStockMessage(items)
      .replace("Complete Low Stock Report", `Complete Low Stock Report${labLabel}`)
      .replace(/\/low-stock/g, `${labPrefix}/low-stock`)

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channel || "#inventory-alerts",
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
    console.error("Error sending full alert:", error)
    return NextResponse.json(
      {
        error: "Failed to send full alert",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
