import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { items } = await request.json()

    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ error: "Slack webhook URL not configured" }, { status: 500 })
    }

    // Create a VERY simple version of the low stock alert (similar to test message)
    const simpleMessage = {
      text: `🚨 Low Stock Alert - ${items.length} items need attention`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `🚨 *Low Stock Alert*\n\n${items.length} items are below their reorder points.`,
          },
        },
      ],
    }

    console.log("Sending simple low stock message:", JSON.stringify(simpleMessage, null, 2))

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(simpleMessage),
    })

    const responseText = await response.text()
    console.log(`Simple alert response (${response.status}):`, responseText)

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText} - ${responseText}`)
    }

    return NextResponse.json({
      success: true,
      message: "Simple low stock alert sent successfully",
      messageSize: JSON.stringify(simpleMessage).length,
    })
  } catch (error) {
    console.error("Error sending simple alert:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
